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
    if (company) await mx.ensureCompanyRooms(mxid, networkId); // фаза 3: направления компании
    const accessToken = await mx.getUserLoginToken(mxid);

    // audit: фиксируем выдачу (без токена в логе)
    console.log(`[matrix] session issued tf_user=${tfUser.id} mxid=${mxid} room=${supportRoomId}`);

    res.json({
      homeserver: process.env.MATRIX_HOMESERVER,
      userId: mxid,
      accessToken, // scoped к аккаунту клиента; только владельцу сессии
      supportRoomId,
    });
  } catch (e) {
    console.error('[matrix] session error:', e.response?.status, e.response?.data?.errcode || e.message);
    res.status(503).json({ error: 'Чат временно недоступен' });
  }
});

module.exports = router;
