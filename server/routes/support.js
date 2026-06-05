/**
 * Support Proxy Router — окно «Заявки» TradeFrame поверх Plane SUP.
 *
 * Проксирует все /api/support/* на ai-orchestrator support-API
 * (events.dataworker.ru/api/support/*), который работает напрямую с проектом
 * Plane SUP. TSupport здесь больше не используется — окно «Заявки» не зависит
 * от его доступности. Аутентификация наружу — заголовки X-TF-User-*,
 * X-TF-Company-Id; внутрь — общий shared-secret (SUPPORT_INTAKE_SECRET).
 */
const express = require('express');
const axios = require('axios');

const router = express.Router();

const SUPPORT_API_BASE = (process.env.SUPPORT_API_BASE || 'https://events.dataworker.ru').replace(/\/+$/, '');
const SUPPORT_API_KEY = process.env.SUPPORT_INTAKE_SECRET || '';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_ROLES = new Set(['super_admin', 'admin', 'manager', 'operator', 'user', 'customer']);

function userHeaders(req) {
  const userId = req.headers['x-tf-user-id'] || '';
  const userRole = req.headers['x-tf-user-role'] || 'operator';
  return {
    'X-TF-User-Id': UUID_RE.test(userId) ? userId : '',
    'X-TF-User-Email': req.headers['x-tf-user-email'] || '',
    'X-TF-User-Name': req.headers['x-tf-user-name'] || '',
    'X-TF-User-Role': ALLOWED_ROLES.has(userRole) ? userRole : 'operator',
    'X-TF-Company-Id': req.headers['x-tf-company-id'] || '',
    'X-Support-Key': SUPPORT_API_KEY,
  };
}

// /unread — быстрый путь, когда backend не настроен (не спамим 503)
router.get('/unread', (req, res, next) => {
  if (!SUPPORT_API_KEY) return res.json({ tickets: 0, chat: 0, total: 0 });
  next();
});

// Проверка конфигурации + наличия пользователя
router.use((req, res, next) => {
  if (!SUPPORT_API_KEY) {
    return res.status(503).json({ error: 'Support API не настроен (SUPPORT_INTAKE_SECRET пуст)' });
  }
  if (!UUID_RE.test(req.headers['x-tf-user-id'] || '')) {
    return res.status(400).json({ error: 'Заголовок X-TF-User-Id обязателен' });
  }
  res.set('Cache-Control', 'no-store');
  next();
});

// Upload файлов — multipart: проксируем СЫРОЙ поток с оригинальным Content-Type
// (generic-прокси ниже ставит application/json и потерял бы boundary).
router.post('/upload/:ticketId', async (req, res) => {
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const r = await axios({
      method: 'POST',
      url: `${SUPPORT_API_BASE}/api/support/upload/${encodeURIComponent(req.params.ticketId)}`,
      headers: { ...userHeaders(req), 'Content-Type': req.headers['content-type'] || 'application/octet-stream' },
      data: Buffer.concat(chunks),
      timeout: 60000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      responseType: 'arraybuffer',
      validateStatus: () => true,
    });
    res.status(r.status);
    res.set('Content-Type', r.headers['content-type'] || 'application/json; charset=utf-8');
    res.send(Buffer.from(r.data));
  } catch (error) {
    console.error('[Support Proxy] upload:', error.message);
    res.status(502).json({ error: 'Загрузка недоступна' });
  }
});

// Generic-прокси: /api/support/* → ai-orchestrator /api/support/*
router.all('*', async (req, res) => {
  try {
    const r = await axios({
      method: req.method,
      url: `${SUPPORT_API_BASE}/api/support${req.path}`,
      headers: { ...userHeaders(req), 'Content-Type': 'application/json' },
      params: req.method === 'GET' ? req.query : undefined,
      data: req.method !== 'GET' ? req.body : undefined,
      timeout: 30000,
      // Пересылаем сырые байты ответа без повторного декодирования/парсинга axios —
      // иначе UTF-8 (кириллица) ломается в mojibake. Тело отдаём как есть.
      responseType: 'arraybuffer',
      validateStatus: () => true,
    });
    const ct = r.headers['content-type'] || 'application/json; charset=utf-8';
    res.status(r.status);
    // Для бинарных ответов (вложения) не навязываем charset; для текста/JSON — utf-8
    const isText = /^(text\/|application\/(json|xml|javascript))/i.test(ct);
    res.set('Content-Type', (isText && !/charset/i.test(ct)) ? `${ct}; charset=utf-8` : ct);
    if (r.headers['content-disposition']) res.set('Content-Disposition', r.headers['content-disposition']);
    res.send(Buffer.from(r.data));
  } catch (error) {
    const status = error.response?.status || 502;
    console.error(`[Support Proxy] ${req.method} ${req.path}:`, status, error.message);
    res.status(status).json({ error: 'Support API недоступен' });
  }
});

module.exports = router;
