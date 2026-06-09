/**
 * Synapse Admin API клиент для раздела «Чат» (Matrix, родной UI).
 *
 * Backend-only. Admin-токен сервисного @tf-chat-svc (MATRIX_ADMIN_TOKEN) НИКОГДА не уходит
 * на фронт — фронт получает лишь per-user access_token своего Matrix-аккаунта.
 *
 * Все ensure*-функции идемпотентны: повторный вызов не плодит аккаунты/комнаты
 * (состояние — в chat_matrix_accounts / chat_matrix_companies). Synapse rate-limit (429)
 * ловим с backoff; между admin-join — паузы.
 */

const axios = require('axios');
const crypto = require('crypto');
const postgres = require('../db/pool');

const HS = () => process.env.MATRIX_HOMESERVER;
const SERVER_NAME = () => process.env.MATRIX_SERVER_NAME;
const ADMIN_TOKEN = () => process.env.MATRIX_ADMIN_TOKEN;
const SUPPORT_MXIDS = () =>
  (process.env.MATRIX_SUPPORT_MXIDS || '').split(',').map((s) => s.trim()).filter(Boolean);
// Модератор канала «Новости» (по умолчанию Дмитрий Королёв @d.korolev).
const NEWS_MODERATOR_MXID = () =>
  (process.env.MATRIX_NEWS_MODERATOR_MXID || `@d.korolev:${SERVER_NAME()}`).trim();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let _client = null;
function api() {
  if (!_client) {
    if (!HS() || !ADMIN_TOKEN()) {
      throw new Error('Matrix не сконфигурирован (MATRIX_HOMESERVER / MATRIX_ADMIN_TOKEN)');
    }
    _client = axios.create({
      baseURL: HS(),
      timeout: 20000,
      headers: { Authorization: `Bearer ${ADMIN_TOKEN()}`, 'Content-Type': 'application/json' },
    });
  }
  return _client;
}

// HTTP к Matrix с ретраем на 429 (M_LIMIT_EXCEEDED).
async function mreq(method, url, data, { retries = 4 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await api().request({ method, url, data });
      return res.data;
    } catch (e) {
      if (e.response?.status === 429 && attempt < retries) {
        const wait = Number(e.response?.data?.retry_after_ms) || 600 * (attempt + 1);
        await sleep(wait + 100);
        continue;
      }
      throw e;
    }
  }
}

// ── транслитерация → slug ──────────────────────────────
const RU = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .split('')
    .map((ch) => (ch in RU ? RU[ch] : ch))
    .join('')
    .replace(/[^a-z0-9._-]+/g, '')
    .replace(/^[._-]+|[._-]+$/g, '') || 'x';
}
const emailLocalpart = (email) => slugify(String(email || '').split('@')[0]);
const randomPassword = () => crypto.randomBytes(18).toString('base64url');

// ── company resolve ────────────────────────────────────
// networkId с фронта = selectedNetwork (UUID id ИЛИ external_id) — резолвим по обоим.
async function getCompany(networkId) {
  if (!networkId) return null;
  return postgres.queryOne(
    `SELECT c.network_id, c.space_id, c.direction_rooms, c.member_network_ids, c.news_room_id, n.name, n.code
       FROM chat_matrix_companies c
       JOIN networks n ON n.id = c.network_id
      WHERE c.network_id::text = $1 OR n.external_id = $1`,
    [String(networkId)]
  );
}
// slug из ИМЕНИ компании (читаемо: «ГИГ» → gig), а не из числового кода сети.
const companySlug = (company) => (company ? slugify(company.name || company.code) : 'client');
async function resolveCompanySlug(networkId) {
  return companySlug(await getCompany(networkId));
}

// ── низкоуровневые admin-операции ──────────────────────
async function adminUpsertUser(mxid, { displayname }) {
  // PUT v2/users идемпотентно: создаёт, если нет; обновляет displayname.
  await mreq('put', `/_synapse/admin/v2/users/${encodeURIComponent(mxid)}`, {
    password: randomPassword(),
    admin: false,
    deactivated: false,
    ...(displayname ? { displayname } : {}),
  });
}

async function getUserLoginToken(mxid) {
  const data = await mreq('post', `/_synapse/admin/v1/users/${encodeURIComponent(mxid)}/login`, {});
  if (!data?.access_token) throw new Error('Synapse admin-login не вернул access_token');
  return data.access_token;
}

async function forceJoin(roomId, mxid) {
  await mreq('post', `/_synapse/admin/v1/join/${encodeURIComponent(roomId)}`, { user_id: mxid });
  await sleep(600); // щадим Synapse rate-limit при пакетном join
}

async function createRoom({ name, topic }) {
  const data = await mreq('post', '/_matrix/client/v3/createRoom', {
    name,
    ...(topic ? { topic } : {}),
    preset: 'private_chat',
    visibility: 'private',
  });
  return data.room_id;
}

async function linkToSpace(spaceId, roomId) {
  // best-effort: @tf-chat-svc может не иметь power level в Space клиента — не критично для MVP.
  try {
    await mreq(
      'put',
      `/_matrix/client/v3/rooms/${encodeURIComponent(spaceId)}/state/m.space.child/${encodeURIComponent(roomId)}`,
      { via: [SERVER_NAME()] }
    );
  } catch (e) {
    console.warn('[matrix] linkToSpace skipped:', e.response?.status, e.response?.data?.error || e.message);
  }
}

// ── ensure аккаунт клиента ─────────────────────────────
async function ensureMatrixAccount(tfUser, slug) {
  const existing = await postgres.queryOne(
    'SELECT matrix_user_id FROM chat_matrix_accounts WHERE tradeframe_user_id = $1',
    [tfUser.id]
  );
  if (existing) return existing.matrix_user_id;

  const base = `${slug}.${emailLocalpart(tfUser.email)}`;
  let mxid = `@${base}:${SERVER_NAME()}`;
  const clash = await postgres.queryOne(
    'SELECT 1 FROM chat_matrix_accounts WHERE matrix_user_id = $1',
    [mxid]
  );
  if (clash) mxid = `@${base}-${String(tfUser.id).slice(0, 8)}:${SERVER_NAME()}`;

  await adminUpsertUser(mxid, { displayname: tfUser.name || tfUser.email });
  await postgres.query(
    `INSERT INTO chat_matrix_accounts (tradeframe_user_id, matrix_user_id)
       VALUES ($1, $2) ON CONFLICT (tradeframe_user_id) DO NOTHING`,
    [tfUser.id, mxid]
  );
  return mxid;
}

// ── ensure личный чат поддержки ────────────────────────
// R2: advisory-lock по tf_user_id — параллельные /session не создадут дубль комнаты.
async function ensureSupportRoom(mxid, tfUser, company) {
  return postgres.withTransaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1)::bigint)', [String(tfUser.id)]);

    const row = (
      await client.query(
        'SELECT support_room_id FROM chat_matrix_accounts WHERE tradeframe_user_id = $1',
        [tfUser.id]
      )
    ).rows[0];
    if (row?.support_room_id) return row.support_room_id;

    const roomId = await createRoom({
      name: `💬 Поддержка — ${tfUser.name || tfUser.email}`,
      topic: 'Личный чат поддержки ElsyPlus',
    });

    await forceJoin(roomId, mxid);
    for (const s of SUPPORT_MXIDS()) await forceJoin(roomId, s);
    try {
      await forceJoin(roomId, `@aiops:${SERVER_NAME()}`);
    } catch (e) {
      console.warn('[matrix] aiops join skipped:', e.message);
    }
    if (company?.space_id) await linkToSpace(company.space_id, roomId);

    await client.query(
      'UPDATE chat_matrix_accounts SET support_room_id = $2 WHERE tradeframe_user_id = $1',
      [tfUser.id, roomId]
    );
    return roomId;
  });
}

// ── направления компании (фаза 3) ─────────────────────
// Force-join клиента в комнаты направлений его компании. Идемпотентно и дёшево:
// сначала спрашиваем у Synapse, в каких комнатах клиент уже состоит, и джойним только недостающие
// (на повторных /session — 0 join, без лишних задержек/429).
async function ensureCompanyRooms(mxid, networkId) {
  const company = await getCompany(networkId);
  if (!company) return [];
  // Один общий канал поддержки на компанию («Поддержка Общий» — для всех проектов).
  // Направления (Учёт/АЗС/Процессинг) убраны: наши сотрудники только в личном + общем.
  const general = company.direction_rooms?.['Общий'] || company.direction_rooms?.general;
  // Обязательный канал «Новости» (read-only): провижится лениво, клиент джойнится с PL 0.
  let newsRoomId = null;
  try {
    newsRoomId = await ensureNewsRoom(company);
  } catch (e) {
    console.warn('[matrix] ensureNewsRoom skipped:', e.response?.status, e.message);
  }
  const target = [general, newsRoomId].filter(Boolean);
  if (!target.length) return [];

  let joined = new Set();
  try {
    const data = await mreq('get', `/_synapse/admin/v1/users/${encodeURIComponent(mxid)}/joined_rooms`);
    joined = new Set(data?.joined_rooms || []);
  } catch (e) {
    console.warn('[matrix] joined_rooms check failed:', e.message);
  }

  for (const roomId of target) {
    if (joined.has(roomId)) continue;
    try {
      await forceJoin(roomId, mxid); // клиент входит с PL 0 → в «Новостях» только чтение
    } catch (e) {
      console.warn('[matrix] company room join skipped', roomId, e.message);
    }
  }
  return target;
}

// ── обязательный канал «Новости» (read-only) ───────────
// Один на компанию, провижится лениво при первой /session. Пишут только наши сотрудники
// (SUPPORT_MXIDS, PL 50), модератор @d.korolev (PL 100); клиенты (PL 0 < events_default 50) — читают.
async function setNewsPowerLevels(roomId) {
  const enc = encodeURIComponent(roomId);
  const pl = await mreq('get', `/_matrix/client/v3/rooms/${enc}/state/m.room.power_levels`);
  pl.users = pl.users || {};
  // создатель (@tf-chat-svc) уже 100 в pl.users — сохраняем; добавляем сотрудников и модератора
  for (const s of SUPPORT_MXIDS()) pl.users[s] = 50;
  pl.users[NEWS_MODERATOR_MXID()] = 100;
  pl.users_default = 0;
  pl.events_default = 50; // ключевое: отправка m.room.message требует PL ≥ 50 → клиенты не пишут
  pl.invite = Math.max(Number(pl.invite) || 0, 50);
  pl.events = pl.events || {};
  pl.events['m.room.name'] = 100;
  pl.events['m.room.power_levels'] = 100;
  pl.events['m.room.history_visibility'] = 100;
  await mreq('put', `/_matrix/client/v3/rooms/${enc}/state/m.room.power_levels`, pl);
}

async function ensureNewsRoom(company) {
  if (!company) return null;
  if (company.news_room_id) return company.news_room_id;
  return postgres.withTransaction(async (client) => {
    // advisory-lock по network_id — параллельные /session не создадут дубль комнаты
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1)::bigint)', [`news:${company.network_id}`]);
    const row = (
      await client.query('SELECT news_room_id FROM chat_matrix_companies WHERE network_id = $1', [company.network_id])
    ).rows[0];
    if (row?.news_room_id) return row.news_room_id;

    const roomId = await createRoom({
      name: '📰 Новости',
      topic: 'Новости и анонсы. Публикуют только сотрудники поддержки.',
    });
    // Писатели (наши сотрудники) + модератор
    for (const s of SUPPORT_MXIDS()) {
      try { await forceJoin(roomId, s); } catch (e) { console.warn('[matrix] news staff join skipped', s, e.message); }
    }
    try { await forceJoin(roomId, NEWS_MODERATOR_MXID()); } catch (e) { console.warn('[matrix] news moderator join skipped', e.message); }
    try { await setNewsPowerLevels(roomId); } catch (e) { console.warn('[matrix] news power_levels failed:', e.response?.status, e.message); }
    if (company.space_id) await linkToSpace(company.space_id, roomId);

    await client.query(
      'UPDATE chat_matrix_companies SET news_room_id = $2 WHERE network_id = $1',
      [company.network_id, roomId]
    );
    return roomId;
  });
}

// ── клиентские чаты (без поддержки): клиент создаёт и управляет сам ─────────

async function getMyMxid(tfUserId) {
  const row = await postgres.queryOne(
    'SELECT matrix_user_id FROM chat_matrix_accounts WHERE tradeframe_user_id = $1',
    [tfUserId]
  );
  return row ? row.matrix_user_id : null;
}

async function setUserPower(roomId, mxid, power) {
  const enc = encodeURIComponent(roomId);
  const pl = await mreq('get', `/_matrix/client/v3/rooms/${enc}/state/m.room.power_levels`);
  pl.users = pl.users || {};
  pl.users[mxid] = power;
  await mreq('put', `/_matrix/client/v3/rooms/${enc}/state/m.room.power_levels`, pl);
}

async function getTfUser(tfUserId) {
  return postgres.queryOne('SELECT id::text AS id, email, name FROM users WHERE id = $1', [tfUserId]);
}

// Сотрудники компании клиента: берём из TradeFrame по доступу к сетям компании
// (ГИГ+БТО — одни лица), а не по тем, кто уже зашёл в чат. mxid — если уже есть (иначе создаётся
// при добавлении в чат). Исключаем самого юзера.
async function listCompanyMembers(networkId, excludeTfUserId) {
  const company = await getCompany(networkId);
  if (!company) return [];
  const netIds = Array.isArray(company.member_network_ids) && company.member_network_ids.length
    ? company.member_network_ids
    : [company.network_id];
  const { rows: codeRows } = await postgres.query('SELECT code FROM networks WHERE id = ANY($1)', [netIds]);
  const codes = codeRows.map((r) => r.code).filter(Boolean);
  // network-scope роли хранят UUID сети; trading_point-scope — id точек вида "<code>-azs-...".
  const patterns = [...netIds.map((id) => `%${id}%`), ...codes.map((code) => `%${code}-azs%`)];
  const { rows } = await postgres.query(
    `SELECT DISTINCT u.id::text AS id, u.name, u.email,
            (SELECT a.matrix_user_id FROM chat_matrix_accounts a WHERE a.tradeframe_user_id = u.id) AS mxid
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
      WHERE u.status = 'active'
        AND (ur.scope_value::text LIKE ANY($1) OR r.scope_values::text LIKE ANY($1))
      ORDER BY u.name`,
    [patterns]
  );
  return rows
    .filter((r) => r.id !== excludeTfUserId)
    .map((r) => ({ id: r.id, name: r.name || r.email, email: r.email || '', mxid: r.mxid || null }));
}

// Создать клиентский чат: создатель (power 100) + выбранные сотрудники. БЕЗ нашей поддержки.
async function createClientRoom(tfUser, networkId, name, memberTfUserIds, ownerMxid) {
  const company = await getCompany(networkId);
  const slug = companySlug(company);
  const roomId = await createRoom({ name: name || 'Чат' });
  await forceJoin(roomId, ownerMxid);
  await setUserPower(roomId, ownerMxid, 100);
  for (const tid of memberTfUserIds || []) {
    if (!tid || tid === tfUser.id) continue;
    try {
      const u = await getTfUser(tid);
      if (!u) continue;
      const mxid = await ensureMatrixAccount(u, slug);
      await forceJoin(roomId, mxid);
    } catch (e) {
      console.warn('[matrix] client room add skipped', tid, e.message);
    }
  }
  await postgres.query(
    `INSERT INTO chat_matrix_client_rooms (room_id, owner_tf_user_id, network_id)
       VALUES ($1, $2, $3) ON CONFLICT (room_id) DO NOTHING`,
    [roomId, tfUser.id, networkId || null]
  );
  return roomId;
}

async function isClientRoomOwner(roomId, tfUserId) {
  const row = await postgres.queryOne(
    'SELECT 1 FROM chat_matrix_client_rooms WHERE room_id = $1 AND owner_tf_user_id = $2',
    [roomId, tfUserId]
  );
  return !!row;
}

async function listOwnedRoomIds(tfUserId) {
  const { rows } = await postgres.query(
    'SELECT room_id FROM chat_matrix_client_rooms WHERE owner_tf_user_id = $1',
    [tfUserId]
  );
  return rows.map((r) => r.room_id);
}

async function addClientRoomMember(roomId, tfUserId) {
  const row = await postgres.queryOne('SELECT network_id FROM chat_matrix_client_rooms WHERE room_id = $1', [roomId]);
  const company = await getCompany(row && row.network_id ? row.network_id : null);
  const u = await getTfUser(tfUserId);
  if (!u) throw new Error('Сотрудник не найден');
  const mxid = await ensureMatrixAccount(u, companySlug(company));
  await forceJoin(roomId, mxid);
}

async function removeClientRoomMember(roomId, mxid) {
  await mreq('post', `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/kick`, { user_id: mxid });
}

async function deleteClientRoom(roomId) {
  await mreq('delete', `/_synapse/admin/v1/rooms/${encodeURIComponent(roomId)}`, { block: false, purge: true });
  await postgres.query('DELETE FROM chat_matrix_client_rooms WHERE room_id = $1', [roomId]);
}

module.exports = {
  getCompany,
  companySlug,
  resolveCompanySlug,
  ensureMatrixAccount,
  getUserLoginToken,
  ensureSupportRoom,
  ensureCompanyRooms,
  ensureNewsRoom,
  forceJoin,
  createRoom,
  linkToSpace,
  getMyMxid,
  getTfUser,
  listCompanyMembers,
  createClientRoom,
  isClientRoomOwner,
  listOwnedRoomIds,
  addClientRoomMember,
  removeClientRoomMember,
  deleteClientRoom,
};
