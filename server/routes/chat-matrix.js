/**
 * Раздел «Чат» на Matrix — выдача фронту всего для подключения matrix-js-sdk.
 *
 * POST /api/chat/matrix/session — по ТЕКУЩЕМУ TradeFrame-пользователю (Bearer):
 *   1) находит/создаёт его Matrix-аккаунт (идемпотентно),
 *   2) находит/создаёт личный чат поддержки,
 *   3) выдаёт per-user access_token (Synapse admin-login).
 * Возвращает { homeserver, userId, accessToken, supportRoomId }.
 *
 * Безопасность: MATRIX_ADMIN_TOKEN на фронт НЕ уходит; токен выдаётся строго для аккаунта,
 * привязанного к req.user (без id из тела/query — защита от IDOR). Токен НЕ логируется.
 * networkId из запроса проверяется по scope ролей (hasNetworkAccess) — cross-tenant закрыт.
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const mx = require('../services/matrixAdmin');
const { signJitsiJwt } = require('../services/jitsiJwt');
const { effectiveNetworkIds } = require('../services/kbService');

const router = express.Router();

// networkId приходит с фронта (SelectionContext) и НЕ доверяется: проверяем по scope ролей
// пользователя (тот же механизм, что в kbService) — иначе cross-tenant доступ к чужим комнатам.
async function hasNetworkAccess(user, networkId) {
  if (!networkId) return true; // без компании — только личные сущности
  const { denied } = await effectiveNetworkIds(user, networkId);
  return !denied;
}

// Максимум участников при создании клиентского чата (каждый — отдельный join в Synapse).
const MAX_ROOM_MEMBERS = 50;

const sessionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много запросов к чату. Подождите.' },
});

router.post('/session', requireAuth, sessionLimiter, async (req, res) => {
  const tfUser = req.user;
  const networkId = req.body?.networkId || null; // из SelectionContext (tc:selectedNetwork)
  try {
    if (!(await hasNetworkAccess(tfUser, networkId))) {
      return res.status(403).json({ error: 'Нет доступа к этой компании' });
    }
    const company = await mx.getCompany(networkId);
    const slug = mx.companySlug(company);
    const mxid = await mx.ensureMatrixAccount(tfUser, slug);
    const supportRoomId = await mx.ensureSupportRoom(mxid, tfUser, company);
    let newsRoomId = null;
    let generalRoomId = null;
    if (company) {
      await mx.ensureCompanyRooms(mxid, networkId); // «Поддержка — Общий» + «Новости» (read-only)
      const fresh = await mx.getCompany(networkId); // news_room_id уже проставлен ensureNewsRoom
      newsRoomId = fresh?.news_room_id || null;
      generalRoomId = fresh?.direction_rooms?.['Общий'] || fresh?.direction_rooms?.general || null;
    }
    const accessToken = await mx.getUserLoginToken(mxid);
    const ownedRoomIds = await mx.listOwnedRoomIds(tfUser.id);

    // audit: фиксируем выдачу (без токена в логе)
    console.log(`[matrix] session issued tf_user=${tfUser.id} mxid=${mxid} room=${supportRoomId}`);

    res.json({
      homeserver: process.env.MATRIX_HOMESERVER,
      userId: mxid,
      accessToken, // scoped к аккаунту клиента; только владельцу сессии
      supportRoomId,
      newsRoomId,    // обязательный канал «Новости» (read-only для клиента)
      generalRoomId, // «Поддержка — Общий»
      ownedRoomIds,  // клиентские чаты этого юзера (можно управлять составом и удалять)
    });
  } catch (e) {
    console.error('[matrix] session error:', e.response?.status, e.response?.data?.errcode || e.message);
    res.status(503).json({ error: 'Чат временно недоступен' });
  }
});

const roomLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много запросов. Подождите.' },
});

// ── Звонки (Фаза 6, §6a ТЗ) ────────────────────────────
// Анти-спам уведомлений: не чаще 1 сообщения-вызова в 2 минуты на комнату (in-memory,
// сброс при рестарте сервера — приемлемо).
const CALL_NOTIFY_COOLDOWN_MS = 2 * 60 * 1000;
const lastCallNotify = new Map();

const callLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много запросов звонка. Подождите.' },
});

// Начать звонок в комнате: гарантировать Jitsi-виджет + уведомить участников.
// Авторизация: юзер должен быть joined-участником комнаты, а комната — управляемой нами
// (@tf-chat-svc состоит в ней; для чужих roomId joined_members отдаёт 403).
router.post('/call', requireAuth, callLimiter, async (req, res) => {
  try {
    const roomId = typeof req.body?.roomId === 'string' ? req.body.roomId : null;
    if (!roomId || !roomId.startsWith('!')) {
      return res.status(400).json({ error: 'roomId обязателен' });
    }
    const mxid = await mx.getMyMxid(req.user.id);
    if (!mxid) return res.status(403).json({ error: 'Чат не инициализирован' });

    let members;
    try {
      members = await mx.getJoinedMembers(roomId);
    } catch {
      return res.status(403).json({ error: 'Звонок в этой комнате недоступен' });
    }
    if (!members[mxid]) {
      return res.status(403).json({ error: 'Вы не участник этой комнаты' });
    }

    const { domain, conferenceId } = await mx.ensureCallWidget(roomId);

    const now = Date.now();
    if ((lastCallNotify.get(roomId) || 0) < now - CALL_NOTIFY_COOLDOWN_MS) {
      lastCallNotify.set(roomId, now);
      const who = req.user.name || req.user.email || 'Клиент';
      // best-effort: недоставленное уведомление не должно ломать сам звонок
      mx.sendCallNotice(roomId, `📞 ${who} начал звонок — присоединяйтесь`).catch((e) =>
        console.warn('[matrix] call notice failed:', e.message)
      );
    }

    const displayName = req.user.name || req.user.email || 'Клиент';
    // Jitsi на meet.dataworker.ru закрыт JWT-авторизацией: токен делает инициатора
    // «организатором» (комната стартует сразу, без «ожидания организатора»).
    const jwt = signJitsiJwt({ room: conferenceId, displayName });

    console.log(`[matrix] call started tf_user=${req.user.id} room=${roomId} conf=${conferenceId} jwt=${jwt ? 'yes' : 'no'}`);
    res.json({ domain, conferenceId, displayName, ...(jwt ? { jwt } : {}) });
  } catch (e) {
    console.error('[matrix] call error:', e.response?.status, e.response?.data?.errcode || e.message);
    res.status(503).json({ error: 'Звонок временно недоступен' });
  }
});

// Справочник сотрудников компании текущего юзера (для добавления в клиентский чат).
router.get('/company-members', requireAuth, async (req, res) => {
  try {
    const networkId = req.query.networkId || null;
    if (!(await hasNetworkAccess(req.user, networkId))) {
      return res.status(403).json({ error: 'Нет доступа к этой компании' });
    }
    const members = await mx.listCompanyMembers(networkId, req.user.id);
    res.json(members);
  } catch (e) {
    console.error('[matrix] company-members error:', e.message);
    res.status(503).json({ error: 'Не удалось получить список сотрудников' });
  }
});

// Создать клиентский чат (свои сотрудники, без поддержки).
router.post('/rooms', requireAuth, roomLimiter, async (req, res) => {
  try {
    const { name, members, networkId } = req.body || {};
    if (!(await hasNetworkAccess(req.user, networkId || null))) {
      return res.status(403).json({ error: 'Нет доступа к этой компании' });
    }
    // В чат можно добавить только сотрудников СВОЕЙ компании — фильтруем на сервере,
    // UI-пикер не доверяется (иначе force-join произвольных пользователей по UUID).
    const requested = (Array.isArray(members) ? members : []).map(String).slice(0, MAX_ROOM_MEMBERS);
    let allowedMembers = [];
    if (requested.length) {
      const colleagues = await mx.listCompanyMembers(networkId || null, req.user.id);
      const ids = new Set(colleagues.map((m) => m.id));
      allowedMembers = requested.filter((id) => ids.has(id));
    }
    const company = await mx.getCompany(networkId || null);
    const mxid = await mx.ensureMatrixAccount(req.user, mx.companySlug(company));
    const roomId = await mx.createClientRoom(req.user, networkId || null, name, allowedMembers, mxid);
    res.json({ roomId });
  } catch (e) {
    console.error('[matrix] create room error:', e.response?.status, e.message);
    res.status(503).json({ error: 'Не удалось создать чат' });
  }
});

// Добавить/удалить участника клиентского чата — только владелец.
router.post('/rooms/:roomId/members', requireAuth, roomLimiter, async (req, res) => {
  try {
    const { action, mxid, tfUserId } = req.body || {};
    if (!(await mx.isClientRoomOwner(req.params.roomId, req.user.id))) {
      return res.status(403).json({ error: 'Это не ваш чат' });
    }
    if (action === 'add') {
      // Добавлять можно только сотрудников компании этого чата (не произвольный UUID).
      const roomNetworkId = await mx.getClientRoomNetworkId(req.params.roomId);
      const colleagues = await mx.listCompanyMembers(roomNetworkId, req.user.id);
      if (!colleagues.some((m) => m.id === String(tfUserId))) {
        return res.status(403).json({ error: 'Можно добавлять только сотрудников своей компании' });
      }
      await mx.addClientRoomMember(req.params.roomId, tfUserId);
    } else if (action === 'remove') await mx.removeClientRoomMember(req.params.roomId, mxid);
    else return res.status(400).json({ error: 'Неизвестное действие' });
    res.json({ ok: true });
  } catch (e) {
    console.error('[matrix] room members error:', e.message);
    res.status(503).json({ error: 'Не удалось изменить состав' });
  }
});

// Удалить клиентский чат — только владелец. Наши каналы поддержки здесь не значатся → 403.
router.delete('/rooms/:roomId', requireAuth, roomLimiter, async (req, res) => {
  try {
    if (!(await mx.isClientRoomOwner(req.params.roomId, req.user.id))) {
      return res.status(403).json({ error: 'Это не ваш чат — удаление недоступно' });
    }
    await mx.deleteClientRoom(req.params.roomId);
    res.json({ ok: true });
  } catch (e) {
    console.error('[matrix] delete room error:', e.message);
    res.status(503).json({ error: 'Не удалось удалить чат' });
  }
});

module.exports = router;
