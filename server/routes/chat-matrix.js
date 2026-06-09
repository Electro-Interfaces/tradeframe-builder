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
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const mx = require('../services/matrixAdmin');

const router = express.Router();

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

// Справочник сотрудников компании текущего юзера (для добавления в клиентский чат).
router.get('/company-members', requireAuth, async (req, res) => {
  try {
    const networkId = req.query.networkId || null;
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
    const company = await mx.getCompany(networkId || null);
    const mxid = await mx.ensureMatrixAccount(req.user, mx.companySlug(company));
    const roomId = await mx.createClientRoom(
      req.user, networkId || null, name, Array.isArray(members) ? members : [], mxid
    );
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
    if (action === 'add') await mx.addClientRoomMember(req.params.roomId, tfUserId);
    else if (action === 'remove') await mx.removeClientRoomMember(req.params.roomId, mxid);
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
