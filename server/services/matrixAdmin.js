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
    `SELECT c.network_id, c.space_id, c.direction_rooms, n.name, n.code
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
  if (!company?.direction_rooms) return [];
  // Один общий канал поддержки на компанию («Поддержка Общий» — для всех проектов).
  // Направления (Учёт/АЗС/Процессинг) убраны: наши сотрудники только в личном + общем.
  const general = company.direction_rooms['Общий'] || company.direction_rooms.general;
  if (!general) return [];
  const target = [general];

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
      await forceJoin(roomId, mxid);
    } catch (e) {
      console.warn('[matrix] direction join skipped', roomId, e.message);
    }
  }
  return target;
}

module.exports = {
  getCompany,
  companySlug,
  resolveCompanySlug,
  ensureMatrixAccount,
  getUserLoginToken,
  ensureSupportRoom,
  ensureCompanyRooms,
  forceJoin,
  createRoom,
  linkToSpace,
};
