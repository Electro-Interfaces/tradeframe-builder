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
const crypto = require('crypto');
const postgres = require('../db/pool');
const { getUserScope } = require('../middleware/scopeFilter');

// Запись базы знаний — строго поставщик (super_admin/system_admin), НЕ network_admin клиента (§13.3).
const SUPER_ROLES = ['super_admin', 'system_admin'];
const isSuperAdmin = (user) => !!user && SUPER_ROLES.includes(user.role);
const sha256 = (s) => crypto.createHash('sha256').update(String(s || ''), 'utf8').digest('hex');
const IMMUTABLE_KINDS = ['law', 'regulation', 'lnd']; // правка опубликованной → новая редакция

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

// ── Запись (только super_admin/system_admin) ───────────────────────────
async function createCategory(user, d) {
  if (!isSuperAdmin(user)) return { forbidden: true };
  const net = await resolveNetworkUuid(d.networkId);
  if (!net) return { error: 'Сеть не найдена' };
  const row = await postgres.queryOne(
    `INSERT INTO kb_categories (network_id, parent_id, title, icon, sort_order)
       VALUES ($1,$2,$3,$4,$5) RETURNING id::text AS id`,
    [net, d.parentId || null, d.title, d.icon || null, d.sortOrder || 0],
  );
  return { id: row.id };
}

async function createArticle(user, d) {
  if (!isSuperAdmin(user)) return { forbidden: true };
  const net = await resolveNetworkUuid(d.networkId);
  if (!net) return { error: 'Сеть не найдена' };
  const status = d.status === 'published' ? 'published' : 'draft';
  const row = await postgres.queryOne(
    `INSERT INTO kb_articles
       (network_id, category_id, title, body_md, body_plain, status, doc_kind, doc_number,
        effective_date, effective_until, tags, changelog, checksum, sort_order, published_at, created_by, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
        CASE WHEN $6='published' THEN now() ELSE NULL END, $15, $15)
     RETURNING id::text AS id`,
    [net, d.categoryId || null, d.title, d.bodyMd || '', markdownToPlain(d.bodyMd), status,
      d.docKind || 'guide', d.docNumber || null, d.effectiveDate || null, d.effectiveUntil || null,
      Array.isArray(d.tags) ? d.tags : [], d.changelog || '', sha256(d.bodyMd), d.sortOrder || 0, user.id || null],
  );
  return { id: row.id };
}

async function updateArticle(user, id, d) {
  if (!isSuperAdmin(user)) return { forbidden: true };
  const existing = await postgres.queryOne(
    `SELECT id::text AS id, network_id::text AS network_id, category_id::text AS category_id,
            title, doc_kind, doc_number, version, status, sort_order
       FROM kb_articles WHERE id = $1`,
    [id],
  );
  if (!existing) return { notFound: true };
  const bodyMd = d.bodyMd != null ? d.bodyMd : null;

  // Иммутабельная редакция: правка опубликованной нормативки → новая версия.
  if (IMMUTABLE_KINDS.includes(existing.doc_kind) && existing.status === 'published') {
    return postgres.withTransaction(async (client) => {
      await client.query(
        `UPDATE kb_articles SET is_current=false, status='archived', archived_at=now(),
           effective_until = COALESCE($2::date, CURRENT_DATE) WHERE id=$1`,
        [id, d.effectiveDate || null],
      );
      const ins = await client.query(
        `INSERT INTO kb_articles
           (network_id, category_id, title, body_md, body_plain, status, doc_kind, doc_number,
            version, is_current, supersedes_id, effective_date, tags, changelog, checksum, sort_order,
            published_at, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,'published',$6,$7,$8,true,$9,$10,$11,$12,$13,$14, now(), $15,$15)
         RETURNING id::text AS id`,
        [existing.network_id, d.categoryId ?? existing.category_id, d.title ?? existing.title,
          bodyMd ?? '', markdownToPlain(bodyMd ?? ''), existing.doc_kind, d.docNumber ?? existing.doc_number,
          existing.version + 1, existing.id, d.effectiveDate || null, Array.isArray(d.tags) ? d.tags : [],
          d.changelog || '', sha256(bodyMd ?? ''), d.sortOrder ?? existing.sort_order, user.id || null],
      );
      return { id: ins.rows[0].id, newRevision: true };
    });
  }

  // In-place (guide/other или черновик).
  const sets = [];
  const params = [];
  let i = 1;
  const set = (col, val) => { sets.push(`${col} = $${i++}`); params.push(val); };
  if (d.title != null) set('title', d.title);
  if (d.categoryId !== undefined) set('category_id', d.categoryId || null);
  if (bodyMd != null) { set('body_md', bodyMd); set('body_plain', markdownToPlain(bodyMd)); set('checksum', sha256(bodyMd)); }
  if (d.docNumber !== undefined) set('doc_number', d.docNumber || null);
  if (d.status != null) { set('status', d.status); if (d.status === 'published') set('published_at', new Date()); }
  if (d.effectiveDate !== undefined) set('effective_date', d.effectiveDate || null);
  if (Array.isArray(d.tags)) set('tags', d.tags);
  if (d.sortOrder != null) set('sort_order', d.sortOrder);
  set('updated_by', user.id || null);
  params.push(id);
  await postgres.query(`UPDATE kb_articles SET ${sets.join(', ')} WHERE id = $${i}`, params);
  return { id };
}

async function deleteArticle(user, id) {
  if (!isSuperAdmin(user)) return { forbidden: true };
  // Мягкое удаление: архивируем (нормативку физически не сносим — операции над сетями часты).
  const res = await postgres.query(
    `UPDATE kb_articles SET status='archived', is_current=false, archived_at=now() WHERE id=$1`,
    [id],
  );
  return { ok: res.rowCount > 0 };
}

async function createContact(user, d) {
  if (!isSuperAdmin(user)) return { forbidden: true };
  const net = await resolveNetworkUuid(d.networkId);
  if (!net) return { error: 'Сеть не найдена' };
  const row = await postgres.queryOne(
    `INSERT INTO kb_contacts (network_id, category_id, full_name, position, responsibility, phone, email, note, role, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id::text AS id`,
    [net, d.categoryId || null, d.fullName, d.position || null, d.responsibility || null,
      d.phone || null, d.email || null, d.note || null, d.role || null, d.sortOrder || 0],
  );
  return { id: row.id };
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
  isSuperAdmin,
  createCategory,
  createArticle,
  updateArticle,
  deleteArticle,
  createContact,
};
