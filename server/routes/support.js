/**
 * TSupport SDK Proxy Router
 *
 * Прокси для TSupport SDK API v2
 * TradeControl backend подписывает HMAC → TSupport upsert-ит пользователя → выдаёт JWT
 *
 * Эндпоинты:
 *   GET    /api/support/categories          → категории заявок
 *   GET    /api/support/tickets             → список заявок
 *   GET    /api/support/tickets/:id         → детали заявки
 *   POST   /api/support/tickets             → создание заявки
 *   PATCH  /api/support/tickets/:id         → обновление заявки
 *   GET    /api/support/tickets/:id/messages → сообщения заявки
 *   POST   /api/support/tickets/:id/messages → отправить сообщение
 *   GET    /api/support/tickets/:id/activity → таймлайн
 *   GET    /api/support/chat/rooms          → список чат-комнат
 *   GET    /api/support/chat/rooms/:id/messages → сообщения комнаты
 *   POST   /api/support/chat/rooms/:id/messages → отправить в чат
 *   POST   /api/support/chat/rooms/:id/read     → отметить прочитанным
 *   GET    /api/support/unread              → счётчик непрочитанных
 */

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const router = express.Router();

// JWT-токен TSupport (кэшируется per userId, LRU-лимит 500 записей)
const TOKEN_CACHE_MAX = 500;
const tokenCache = new Map(); // userId → { accessToken, refreshToken, expiresAt }

// Очистка просроченных записей и LRU-лимит
function cleanTokenCache() {
  const now = Date.now();
  for (const [key, val] of tokenCache) {
    if (val.expiresAt < now) tokenCache.delete(key);
  }
  // LRU: если превышен лимит — удаляем самые старые (первые в Map)
  while (tokenCache.size > TOKEN_CACHE_MAX) {
    const firstKey = tokenCache.keys().next().value;
    tokenCache.delete(firstKey);
  }
}

const TSUPPORT_API_URL = process.env.TSUPPORT_API_URL || 'http://81.200.148.35:3003';
const TSUPPORT_SDK_API_KEY = process.env.TSUPPORT_SDK_API_KEY;
const TSUPPORT_SDK_SECRET = process.env.TSUPPORT_SDK_SECRET;

// Единый шлюз intake (ai-orchestrator → Plane SUP). Зеркалируем заявки/сообщения
// в систему контроля заданий Plane. Это ДОПОЛНЕНИЕ к проксированию в TSupport:
// TSupport остаётся источником истины для UI, эмиссия — fire-and-forget и НИКОГДА
// не влияет на ответ клиенту (все ошибки проглатываются и логируются).
const SUPPORT_INTAKE_URL = process.env.SUPPORT_INTAKE_URL || '';
const SUPPORT_INTAKE_SECRET = process.env.SUPPORT_INTAKE_SECRET || '';

function emitIntake(payload, dedupKey) {
  if (!SUPPORT_INTAKE_URL || !SUPPORT_INTAKE_SECRET) return; // шлюз не настроен — тихо пропускаем
  axios.post(
    SUPPORT_INTAKE_URL,
    { type: 'tradeframe.event', payload, dedup_key: dedupKey || null },
    {
      headers: { 'Content-Type': 'application/json', 'X-Intake-Secret': SUPPORT_INTAKE_SECRET },
      timeout: 8000,
    },
  ).catch((err) => {
    console.error('[Support Intake] emit failed:', payload?.action, err.response?.status || err.code || err.message);
  });
}

/**
 * Создать HMAC-подпись для SDK auth
 */
function createHmacSignature(userId, companyId, timestamp) {
  const message = `${userId}:${companyId}:${timestamp}`;
  return crypto.createHmac('sha256', TSUPPORT_SDK_SECRET).update(message).digest('hex');
}

/**
 * Получить или обновить JWT-токен TSupport для пользователя
 */
async function getToken(userInfo) {
  cleanTokenCache();
  const cacheKey = userInfo.userId;
  const cached = tokenCache.get(cacheKey);

  // Возвращаем кэшированный токен если до истечения больше 5 минут
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cached.accessToken;
  }

  // Если есть refresh token — пробуем обновить
  if (cached?.refreshToken) {
    try {
      const refreshResp = await axios.post(`${TSUPPORT_API_URL}/api/v2/sdk/auth/refresh`, {
        refreshToken: cached.refreshToken,
      }, { timeout: 10000 });

      const newTokens = refreshResp.data;
      tokenCache.set(cacheKey, {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        companyId: cached.companyId, // сохраняем company_id из первоначальной auth
        expiresAt: Date.now() + 110 * 60 * 1000, // ~2ч (access token TTL)
      });

      return newTokens.accessToken;
    } catch {
      // Refresh failed — полная re-auth
      tokenCache.delete(cacheKey);
    }
  }

  // Полная аутентификация через HMAC
  const timestamp = Date.now().toString();
  // companyId НЕ передаём из TradeControl — TSupport сам резолвит по email
  // (UUID компаний в Supabase ≠ UUID в TSupport PostgreSQL)
  const companyId = '';
  const signature = createHmacSignature(userInfo.userId, companyId, timestamp);

  const authResp = await axios.post(`${TSUPPORT_API_URL}/api/v2/sdk/auth/token`, {
    apiKey: TSUPPORT_SDK_API_KEY,
    userId: userInfo.userId,
    companyId,
    userName: userInfo.userName || '',
    userEmail: userInfo.userEmail || '',
    userRole: userInfo.userRole || 'operator',
    timestamp,
    signature,
  }, { timeout: 10000 });

  const tokens = authResp.data;
  tokenCache.set(cacheKey, {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    companyId: tokens.user?.company_id || '',
    tsupportUserId: tokens.user?.id || '',
    expiresAt: Date.now() + 110 * 60 * 1000,
  });

  return tokens.accessToken;
}

/**
 * Получить company_id пользователя в TSupport (из кэша токенов)
 */
function getTSupportCompanyId(userId) {
  const cached = tokenCache.get(userId);
  return cached?.companyId || '';
}

/**
 * Извлечь информацию о пользователе из заголовков X-TF-User-*
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_ROLES = new Set(['super_admin', 'admin', 'manager', 'operator', 'user', 'customer']);

function getUserInfoFromHeaders(req) {
  const rawName = req.headers['x-tf-user-name'] || '';
  let userName;
  try { userName = decodeURIComponent(rawName); } catch { userName = rawName; }

  const userId = req.headers['x-tf-user-id'] || '';
  const userRole = req.headers['x-tf-user-role'] || 'operator';

  return {
    userId: UUID_RE.test(userId) ? userId : '',
    companyId: req.headers['x-tf-company-id'] || '',
    userName,
    userEmail: req.headers['x-tf-user-email'] || '',
    userRole: ALLOWED_ROLES.has(userRole) ? userRole : 'operator',
  };
}

/**
 * Middleware: проверка конфигурации SDK
 */
function checkSdkConfig(req, res, next) {
  if (!TSUPPORT_SDK_API_KEY || !TSUPPORT_SDK_SECRET) {
    return res.status(503).json({
      error: 'TSupport SDK не настроен',
      message: 'Отсутствуют TSUPPORT_SDK_API_KEY или TSUPPORT_SDK_SECRET',
    });
  }

  const userInfo = getUserInfoFromHeaders(req);
  if (!userInfo.userId) {
    return res.status(400).json({
      error: 'Заголовок X-TF-User-Id обязателен',
    });
  }

  req.tfUserInfo = userInfo;
  next();
}

/**
 * Прокси-запрос к TSupport SDK API
 */
/**
 * Выполнить запрос к TSupport SDK API (с retry при 401)
 */
async function makeRequest(token, method, sdkPath, query, data) {
  const config = {
    method,
    url: `${TSUPPORT_API_URL}${sdkPath}`,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  };
  if (method === 'GET') config.params = query;
  else if (data) config.data = data;
  return axios(config);
}

async function proxyToTSupport(req, res, method, sdkPath, data, afterSuccess) {
  // Отдаём ответ TSupport клиенту и, при 2xx, запускаем fire-and-forget
  // зеркалирование в Plane (ошибка зеркала не влияет на ответ).
  const handleOk = (response) => {
    res.status(response.status).json(response.data);
    if (afterSuccess && response.status >= 200 && response.status < 300) {
      try { afterSuccess(response.data); }
      catch (e) { console.error('[Support Intake] afterSuccess error:', e.message); }
    }
  };
  try {
    const token = await getToken(req.tfUserInfo);
    const response = await makeRequest(token, method, sdkPath, req.query, data);
    return handleOk(response);
  } catch (error) {
    // Если 401 — сбросить кэш и повторить один раз
    if (error.response?.status === 401) {
      tokenCache.delete(req.tfUserInfo.userId);
      try {
        const token = await getToken(req.tfUserInfo);
        const response = await makeRequest(token, method, sdkPath, req.query, data);
        return handleOk(response);
      } catch (retryError) {
        console.error('[Support Proxy] Retry failed:', retryError.message);
        const retryStatus = retryError.response?.status || 500;
        const retryData = retryError.response?.data || { error: retryError.message };
        return res.status(retryStatus).json(retryData);
      }
    }

    const status = error.response?.status || 500;
    const errorData = error.response?.data || { error: error.message };
    console.error(`[Support Proxy] ${method} ${sdkPath}:`, status, errorData);
    console.error(`[Support Proxy] Full error:`, error.code, error.cause || error.stack?.split('\n').slice(0, 3).join('\n'));
    res.status(status).json(errorData);
  }
}

// === Proxy файлов (uploads) — до auth middleware, файлы защищены UUID-именем ===
router.get('/files/:folder/:filename', async (req, res) => {
  try {
    const { folder, filename } = req.params;
    // Валидация: запрет path traversal
    if (/[\/\\]|\.\./.test(folder) || /[\/\\]|\.\./.test(filename)) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    const response = await axios.get(`${TSUPPORT_API_URL}/uploads/${folder}/${filename}`, {
      responseType: 'stream',
      timeout: 30000,
    });
    res.set('Content-Type', response.headers['content-type']);
    if (response.headers['content-length']) res.set('Content-Length', response.headers['content-length']);
    const originalName = req.query.name || filename;
    res.set('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"; filename*=UTF-8''${encodeURIComponent(originalName)}`);
    res.set('Cache-Control', 'private, max-age=604800');
    response.data.pipe(res);
  } catch (error) {
    const status = error.response?.status || 500;
    console.error('[Support Proxy] File proxy error:', status);
    res.status(status).json({ error: 'File not found' });
  }
});

// /unread — fast path когда SDK не настроен (чтобы не спамить 503 и не забивать rate limiter)
router.get('/unread', (req, res, next) => {
  if (!TSUPPORT_SDK_API_KEY || !TSUPPORT_SDK_SECRET) {
    return res.json({ tickets: 0, chat: 0, total: 0 });
  }
  next();
});

// Все эндпоинты ниже требуют SDK-конфиг + user headers
router.use(checkSdkConfig);

// Запрет HTTP-кэширования для API-ответов (файлы — выше, с max-age)
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// === Текущий пользователь (TSupport user_id) ===
router.get('/me', async (req, res) => {
  try {
    await getToken(req.tfUserInfo);
    const cached = tokenCache.get(req.tfUserInfo.userId);
    res.json({ tsupportUserId: cached?.tsupportUserId || '' });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// === Категории (проксируется с JWT-токеном) ===
router.get('/categories', (req, res) => proxyToTSupport(req, res, 'GET', '/api/v2/sdk/tickets/categories'));

// === Тикеты ===
router.get('/tickets', (req, res) => proxyToTSupport(req, res, 'GET', '/api/v2/sdk/tickets'));
router.get('/tickets/:id', (req, res) => proxyToTSupport(req, res, 'GET', `/api/v2/sdk/tickets/${req.params.id}`));
router.post('/tickets', async (req, res) => {
  // Стабильный идентификатор заявки на стороне TradeFrame — чтобы зеркало в Plane SUP
  // работало даже когда TSupport недоступен (заявки не теряются ни при каком исходе).
  const tfReqId = (typeof req.body?.external_id === 'string' && req.body.external_id) || crypto.randomUUID();

  // Пробуем получить TSupport-токен/company_id; при недоступности TSupport не падаем —
  // заявку всё равно зеркалим в SUP (Plane — независимая система контроля заданий).
  let companyId = '';
  try {
    await getToken(req.tfUserInfo);
    companyId = getTSupportCompanyId(req.tfUserInfo.userId) || '';
  } catch (_) { /* TSupport недоступен — зеркалим только в SUP */ }

  const body = { ...req.body, ...(companyId ? { company_id: companyId } : {}) };

  // Зеркало в SUP — при ЛЮБОМ исходе TSupport. dedup по стабильному id (нет дублей при ретраях).
  const mirror = (created) => {
    const id = (created && created.id) || tfReqId;
    emitIntake(
      { action: 'ticket.created', ticket: { ...body, ...(created || {}), id } },
      `tradeframe:created:${id}`,
    );
  };

  try {
    const token = await getToken(req.tfUserInfo);
    const response = await makeRequest(token, 'POST', '/api/v2/sdk/tickets', req.query, body);
    res.status(response.status).json(response.data);
    mirror(response.status >= 200 && response.status < 300 ? response.data : null);
  } catch (error) {
    // TSupport недоступен/ошибка — заявка всё равно фиксируется в Plane SUP
    mirror(null);
    const status = error.response?.status || 500;
    const errorData = error.response?.data || { error: error.message };
    console.error('[Support Proxy] POST /tickets:', status, errorData);
    res.status(status).json(errorData);
  }
});
router.patch('/tickets/:id', (req, res) => proxyToTSupport(req, res, 'PATCH', `/api/v2/sdk/tickets/${req.params.id}`, req.body, () => {
  if (req.body && (req.body.status || req.body.priority)) {
    emitIntake({
      action: 'ticket.updated',
      ticket: { id: req.params.id },
      changes: { status: req.body.status, priority: req.body.priority },
    });
  }
}));
router.get('/tickets/:id/messages', (req, res) => proxyToTSupport(req, res, 'GET', `/api/v2/sdk/tickets/${req.params.id}/messages`));
router.post('/tickets/:id/messages', (req, res) => proxyToTSupport(req, res, 'POST', `/api/v2/sdk/tickets/${req.params.id}/messages`, req.body, (msg) => {
  emitIntake(
    { action: 'message.created', ticket: { id: req.params.id }, message: { ...req.body, ...msg } },
    `tradeframe:msg:${req.params.id}:${msg?.id || ''}`,
  );
}));
router.get('/tickets/:id/activity', (req, res) => proxyToTSupport(req, res, 'GET', `/api/v2/sdk/tickets/${req.params.id}/activity`));
router.post('/tickets/:id/read', (req, res) => proxyToTSupport(req, res, 'POST', `/api/v2/sdk/tickets/${req.params.id}/read`));

// === Archive / Delete / Restore ===
router.post('/tickets/:id/archive', (req, res) => proxyToTSupport(req, res, 'POST', `/api/v2/sdk/tickets/${req.params.id}/archive`));
router.post('/tickets/:id/unarchive', (req, res) => proxyToTSupport(req, res, 'POST', `/api/v2/sdk/tickets/${req.params.id}/unarchive`));
router.delete('/tickets/:id', (req, res) => proxyToTSupport(req, res, 'DELETE', `/api/v2/sdk/tickets/${req.params.id}`));
router.post('/tickets/:id/restore', (req, res) => proxyToTSupport(req, res, 'POST', `/api/v2/sdk/tickets/${req.params.id}/restore`));

// === Upload файлов к заявке ===
const MAX_UPLOAD_SIZE = 60 * 1024 * 1024; // 60 МБ

router.post('/upload/:ticketId', async (req, res) => {
  try {
    const token = await getToken(req.tfUserInfo);
    const contentType = req.headers['content-type'];

    // Собираем raw body (multipart form-data) с лимитом
    const chunks = [];
    let totalSize = 0;
    for await (const chunk of req) {
      totalSize += chunk.length;
      if (totalSize > MAX_UPLOAD_SIZE) {
        return res.status(413).json({ error: `Размер загрузки превышает ${MAX_UPLOAD_SIZE / 1024 / 1024} МБ` });
      }
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    const response = await axios.post(
      `${TSUPPORT_API_URL}/api/v2/sdk/upload/${req.params.ticketId}`,
      body,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': contentType,
          'Content-Length': body.length,
        },
        timeout: 60000,
        maxContentLength: 60 * 1024 * 1024,
        maxBodyLength: 60 * 1024 * 1024,
      }
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const errorData = error.response?.data || { error: error.message };
    console.error('[Support Proxy] Upload error:', status, errorData);
    res.status(status).json(errorData);
  }
});

// === Чат ===
// Примечание: upload чат-файлов обрабатывается через /upload/:ticketId (ticketId = "chat-{roomId}")
router.get('/chat/rooms', (req, res) => proxyToTSupport(req, res, 'GET', '/api/v2/sdk/chat/rooms'));
router.post('/chat/rooms', async (req, res) => {
  try {
    await getToken(req.tfUserInfo);
  } catch (err) {
    return res.status(401).json({ error: `Ошибка авторизации: ${err.message}` });
  }
  const companyId = getTSupportCompanyId(req.tfUserInfo.userId);
  if (!companyId) {
    return res.status(400).json({ error: 'company_id не найден в TSupport' });
  }
  proxyToTSupport(req, res, 'POST', '/api/v2/sdk/chat/rooms', { ...req.body, company_id: companyId });
});
router.get('/chat/rooms/:id', (req, res) => proxyToTSupport(req, res, 'GET', `/api/v2/sdk/chat/rooms/${req.params.id}`));
router.get('/chat/rooms/:id/messages', (req, res) => proxyToTSupport(req, res, 'GET', `/api/v2/sdk/chat/rooms/${req.params.id}/messages`));
router.post('/chat/rooms/:id/messages', (req, res) => proxyToTSupport(req, res, 'POST', `/api/v2/sdk/chat/rooms/${req.params.id}/messages`, req.body));
router.post('/chat/rooms/:id/read', (req, res) => proxyToTSupport(req, res, 'POST', `/api/v2/sdk/chat/rooms/${req.params.id}/read`));

// === Edit/Delete сообщений чата ===
router.patch('/chat/rooms/:id/messages/:msgId', (req, res) => proxyToTSupport(req, res, 'PATCH', `/api/v2/sdk/chat/rooms/${req.params.id}/messages/${req.params.msgId}`, req.body));
router.delete('/chat/rooms/:id/messages/:msgId', (req, res) => proxyToTSupport(req, res, 'DELETE', `/api/v2/sdk/chat/rooms/${req.params.id}/messages/${req.params.msgId}`));

// === Edit/Delete сообщений заявок ===
router.patch('/tickets/:id/messages/:msgId', (req, res) => proxyToTSupport(req, res, 'PATCH', `/api/v2/sdk/tickets/${req.params.id}/messages/${req.params.msgId}`, req.body));
router.delete('/tickets/:id/messages/:msgId', (req, res) => proxyToTSupport(req, res, 'DELETE', `/api/v2/sdk/tickets/${req.params.id}/messages/${req.params.msgId}`));

// === Поиск пользователей (для переназначения) ===
router.get('/users/search', (req, res) => proxyToTSupport(req, res, 'GET', '/api/v2/sdk/chat/users/search'));

// (proxy файлов перенесён до checkSdkConfig middleware выше)

// === Непрочитанные ===
router.get('/unread', async (req, res) => {
  try {
    const token = await getToken(req.tfUserInfo);
    const headers = { Authorization: `Bearer ${token}` };

    // Считаем: тикеты с unread_count > 0 (активные статусы) + непрочитанные чаты
    const [ticketsResp, chatResp] = await Promise.allSettled([
      axios.get(`${TSUPPORT_API_URL}/api/v2/sdk/tickets`, {
        params: { limit: 200 },
        headers,
        timeout: 10000,
      }),
      axios.get(`${TSUPPORT_API_URL}/api/v2/sdk/chat/rooms`, {
        headers,
        timeout: 10000,
      }),
    ]);

    // Считаем тикеты с реальным unread_count > 0
    const ticketCount = ticketsResp.status === 'fulfilled'
      ? (ticketsResp.value.data.data || []).filter(t => (t.unread_count || 0) > 0).length
      : 0;
    const chatUnread = chatResp.status === 'fulfilled'
      ? (chatResp.value.data || []).reduce((sum, room) => sum + (room.unread_count || 0), 0)
      : 0;

    res.json({ tickets: ticketCount, chat: chatUnread, total: ticketCount + chatUnread });
  } catch (error) {
    console.error('[Support Proxy] Unread count error:', error.message);
    res.json({ tickets: 0, chat: 0, total: 0 });
  }
});

module.exports = router;
