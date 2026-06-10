/**
 * Сервис базы знаний компании (часть B раздела «Инфо»).
 *
 * ГЛАВНОЕ — мультитенантная изоляция: backend НЕ доверяет networkId с фронта. Доступные сети
 * резолвятся из ролей пользователя (getUserScope) и расширяются составом компании
 * (chat_matrix_companies.member_network_ids: ГИГ+БТО — одни лица). КАЖДЫЙ запрос фильтруется
 * `network_id = ANY($allowed::uuid[])`. Запись — только super_admin/system_admin (см. routes).
 *
 * Поиск: to_tsvector('russian') (морфология) + ILIKE-фолбэк (подстрока/нет морфологии). pg_trgm —
 * отдельная фаза; здесь его нет, поэтому деградация на ILIKE, а не падение.
 */
const postgres = require('../db/pool');
const { getUserScope } = require('../middleware/scopeFilter');

// ── markdown → plain (для индекса/сниппетов) ───────────────────────────
function markdownToPlain(md) {
  if (!md) return '';
  return String(md)
    .replace(/```[\s\S]*?```/g, ' ')            // блоки кода
    .replace(/`([^`]+)`/g, '$1')                 // инлайн-код
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')        // картинки
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')      // ссылки → текст
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')           // заголовки
    .replace(/^\s{0,3}>\s?/gm, '')                // цитаты
    .replace(/[*_~]{1,3}/g, '')                   // *_~ выделение
    .replace(/^\s*[-*+]\s+/gm, '')                // маркеры списка
    .replace(/^\s*\d+\.\s+/gm, '')                // нумерация
    .replace(/\|/g, ' ')                          // таблицы
    .replace(/^[-:\s|]+$/gm, ' ')                 // разделители таблиц
    .replace(/\s+/g, ' ')
    .trim();
}

// ── резолвинг сетей компании по любому идентификатору ──────────────────
async function resolveNetworkUuid(networkId) {
  if (!networkId) return null;
  const row = await postgres.queryOne(
    `SELECT id::text AS id FROM networks WHERE id::text = $1 OR external_id = $1 OR code = $1 LIMIT 1`,
    [String(networkId)],
  );
  return row ? row.id : null;
}

// Состав компании (сети-члены) для заданной сети. ГИГ+БТО → одна компания.
async function companyMemberNetworkIds(networkUuid) {
  if (!networkUuid) return [];
  // member_network_ids — JSONB-массив строк-UUID (jsonb_agg(id)).
  const row = await postgres.queryOne(
    `SELECT c.network_id::text AS network_id,
            COALESCE(array(SELECT jsonb_array_elements_text(c.member_network_ids)), '{}') AS members
       FROM chat_matrix_companies c
      WHERE c.network_id::text = $1 OR c.member_network_ids @> to_jsonb($1::text)
      LIMIT 1`,
    [networkUuid],
  );
  if (!row) return [networkUuid];
  const set = new Set([row.network_id, ...(row.members || [])]);
  set.add(networkUuid);
  return Array.from(set).filter(Boolean);
}

/**
 * Сети, доступные пользователю по ролям (UUID-ы). null → без ограничений (super/global).
 */
async function resolveAllowedNetworkIds(user) {
  const scope = getUserScope(user);
  if (!scope.hasRestrictions) return null; // super_admin / global — все сети

  const allowed = new Set(Array.from(scope.networkIds).map(String));

  // trading_point-роли несут коды сетей → резолвим в UUID.
  const codes = Array.from(scope.networkCodes).map(String).filter(Boolean);
  if (codes.length) {
    const { rows } = await postgres.query(
      `SELECT id::text AS id FROM networks WHERE code = ANY($1) OR external_id = ANY($1)`,
      [codes],
    );
    rows.forEach((r) => allowed.add(r.id));
  }

  // Расширяем составом компаний (member_network_ids): доступ к сети = доступ ко всей компании.
  if (allowed.size) {
    const base = Array.from(allowed);
    const { rows } = await postgres.query(
      `SELECT c.network_id::text AS network_id,
              COALESCE(array(SELECT jsonb_array_elements_text(c.member_network_ids)), '{}') AS members
         FROM chat_matrix_companies c
        WHERE c.network_id::text = ANY($1::text[]) OR c.member_network_ids ?| $1::text[]`,
      [base],
    );
    rows.forEach((r) => {
      allowed.add(r.network_id);
      (r.members || []).forEach((m) => allowed.add(m));
    });
  }

  return Array.from(allowed).filter(Boolean);
}

/**
 * Эффективный набор сетей для выдачи по запрошенной компании (networkId).
 * Возвращает { networkIds: string[]|null, denied: boolean }.
 *  - null networkIds → super без указанной компании (все сети).
 *  - denied=true → пользователь не имеет доступа к запрошенной сети (403).
 */
async function effectiveNetworkIds(user, requestedNetworkId) {
  const allowed = await resolveAllowedNetworkIds(user); // null = все
  const reqUuid = await resolveNetworkUuid(requestedNetworkId);

  if (allowed === null) {
    // super/global: если указана компания — ограничим ею, иначе все.
    if (!reqUuid) return { networkIds: null, denied: false };
    return { networkIds: await companyMemberNetworkIds(reqUuid), denied: false };
  }

  if (!reqUuid) {
    // компания не указана — отдаём всё доступное пользователю
    return { networkIds: allowed, denied: false };
  }
  if (!allowed.includes(reqUuid)) {
    return { networkIds: [], denied: true };
  }
  // доступ к сети есть — показываем всю её компанию (пересечение с доступным)
  const company = await companyMemberNetworkIds(reqUuid);
  const inter = company.filter((id) => allowed.includes(id));
  return { networkIds: inter.length ? inter : [reqUuid], denied: false };
}

// SQL-фрагмент фильтра по сети + параметр. idx — номер $-параметра.
function scopeWhere(networkIds, idx) {
  if (networkIds === null) return { sql: 'TRUE', param: null };
  return { sql: `a.network_id::text = ANY($${idx})`, param: networkIds };
}

// ── Дерево: категории + опубликованные действующие статьи ──────────────
async function getTree(user, requestedNetworkId) {
  const { networkIds, denied } = await effectiveNetworkIds(user, requestedNetworkId);
  if (denied) return { denied: true, categories: [], articles: [] };

  const netFilterCat = networkIds === null ? 'TRUE' : 'c.network_id::text = ANY($1)';
  const netFilterArt = networkIds === null ? 'TRUE' : 'a.network_id::text = ANY($1)';
  const params = networkIds === null ? [] : [networkIds];

  const { rows: categories } = await postgres.query(
    `SELECT id::text AS id, parent_id::text AS parent_id, title, icon, sort_order
       FROM kb_categories c WHERE ${netFilterCat} ORDER BY sort_order, title`,
    params,
  );
  const { rows: articles } = await postgres.query(
    `SELECT a.id::text AS id, a.category_id::text AS category_id, a.title, a.doc_kind, a.doc_number,
            a.effective_date, a.version, a.sort_order, a.updated_at
       FROM kb_articles a
      WHERE ${netFilterArt} AND a.status = 'published' AND a.is_current = true
        AND (a.effective_date IS NULL OR a.effective_date <= CURRENT_DATE)
        AND (a.effective_until IS NULL OR a.effective_until >= CURRENT_DATE)
      ORDER BY a.sort_order, a.title`,
    params,
  );
  return { denied: false, categories, articles };
}

// ── Одна статья (с проверкой доступа) ──────────────────────────────────
async function getArticle(user, id) {
  const row = await postgres.queryOne(
    `SELECT a.id::text AS id, a.network_id::text AS network_id, a.category_id::text AS category_id,
            a.title, a.body_md, a.doc_kind, a.doc_number, a.version, a.effective_date, a.effective_until,
            a.status, a.changelog, a.updated_at
       FROM kb_articles a WHERE a.id = $1`,
    [id],
  );
  if (!row) return { notFound: true };
  if (row.status !== 'published') {
    // черновики/архив — только админам (проверка роли в routes); здесь скрываем от чтения
  }
  const allowed = await resolveAllowedNetworkIds(user);
  if (allowed !== null && !allowed.includes(row.network_id)) {
    return { notFound: true }; // 404, чтобы не подтверждать существование
  }
  const { rows: attachments } = await postgres.query(
    `SELECT id::text AS id, filename, mime, size_bytes FROM kb_attachments WHERE article_id = $1 ORDER BY filename`,
    [id],
  );
  return { article: { ...row, attachments } };
}

// ── Поиск: статьи + контакты, изоляция в КАЖДОМ под-запросе ────────────
async function search(user, q, requestedNetworkId) {
  const query = String(q || '').trim();
  if (query.length < 2) return { articles: [], contacts: [] };

  const { networkIds, denied } = await effectiveNetworkIds(user, requestedNetworkId);
  if (denied) return { articles: [], contacts: [] };
  // Безопасный инвариант: ограниченный пользователь без доступных сетей → пустая выдача.
  if (networkIds !== null && networkIds.length === 0) return { articles: [], contacts: [] };

  const net = networkIds; // null = все (super)
  const useScope = net !== null;

  // ── статьи ──
  const artParams = [query];
  let artNet = 'TRUE';
  if (useScope) { artParams.push(net); artNet = `a.network_id::text = ANY($2)`; }
  let articles = [];
  try {
    const { rows } = await postgres.query(
      `SELECT a.id::text AS id, a.title, a.doc_kind, a.doc_number, a.effective_date,
              ts_rank(a.search_tsv, websearch_to_tsquery('russian', $1)) AS rank,
              ts_headline('russian', a.body_plain, websearch_to_tsquery('russian', $1),
                'StartSel=<<,StopSel=>>,MaxFragments=1,MaxWords=20,MinWords=5') AS snippet
         FROM kb_articles a
        WHERE ${artNet} AND a.status='published' AND a.is_current=true
          AND a.search_tsv @@ websearch_to_tsquery('russian', $1)
        ORDER BY rank DESC LIMIT 10`,
      artParams,
    );
    articles = rows;
  } catch {
    articles = [];
  }
  // ILIKE-фолбэк, если морфология ничего не дала (или недоступна)
  if (articles.length === 0) {
    const likeParams = [`%${query}%`];
    let likeNet = 'TRUE';
    if (useScope) { likeParams.push(net); likeNet = `a.network_id::text = ANY($2)`; }
    const { rows } = await postgres.query(
      `SELECT a.id::text AS id, a.title, a.doc_kind, a.doc_number, a.effective_date,
              0::float AS rank, left(a.body_plain, 160) AS snippet
         FROM kb_articles a
        WHERE ${likeNet} AND a.status='published' AND a.is_current=true
          AND (a.title ILIKE $1 OR a.body_plain ILIKE $1)
        ORDER BY a.title LIMIT 10`,
      likeParams,
    );
    articles = rows;
  }

  // ── контакты (tsvector по описанию + ILIKE по ФИО/телефону) ──
  const cParams = [query, `%${query}%`];
  let cNet = 'TRUE';
  if (useScope) { cParams.push(net); cNet = `c.network_id::text = ANY($3)`; }
  let contacts = [];
  try {
    const { rows } = await postgres.query(
      `SELECT c.id::text AS id, c.full_name, c.position, c.responsibility, c.phone, c.email, c.role
         FROM kb_contacts c
        WHERE ${cNet} AND (
                c.search_tsv @@ websearch_to_tsquery('russian', $1)
                OR c.full_name ILIKE $2 OR c.phone ILIKE $2)
        ORDER BY c.full_name LIMIT 10`,
      cParams,
    );
    contacts = rows;
  } catch {
    contacts = [];
  }

  return { articles, contacts };
}

// ── Контакты компании ──────────────────────────────────────────────────
async function listContacts(user, requestedNetworkId) {
  const { networkIds, denied } = await effectiveNetworkIds(user, requestedNetworkId);
  if (denied) return { denied: true, contacts: [] };
  const params = networkIds === null ? [] : [networkIds];
  const net = networkIds === null ? 'TRUE' : 'c.network_id::text = ANY($1)';
  const { rows } = await postgres.query(
    `SELECT c.id::text AS id, c.full_name, c.position, c.responsibility, c.phone, c.email, c.role, c.sort_order
       FROM kb_contacts c WHERE ${net} ORDER BY c.sort_order, c.full_name`,
    params,
  );
  return { denied: false, contacts: rows };
}

// Доступ к вложению по network статьи (для отдачи файла). null|path.
async function resolveAttachmentForUser(user, attachmentId) {
  const row = await postgres.queryOne(
    `SELECT att.id::text AS id, att.filename, att.file_path, att.mime, a.network_id::text AS network_id
       FROM kb_attachments att JOIN kb_articles a ON a.id = att.article_id
      WHERE att.id = $1`,
    [attachmentId],
  );
  if (!row) return null;
  const allowed = await resolveAllowedNetworkIds(user);
  if (allowed !== null && !allowed.includes(row.network_id)) return null;
  return row;
}

module.exports = {
  markdownToPlain,
  resolveAllowedNetworkIds,
  effectiveNetworkIds,
  companyMemberNetworkIds,
  resolveNetworkUuid,
  getTree,
  getArticle,
  search,
  listContacts,
  resolveAttachmentForUser,
};
