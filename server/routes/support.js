/**
 * Support Proxy Router — окно «Заявки» TradeFrame поверх Plane SUP.
 *
 * Проксирует все /api/support/* на ai-orchestrator support-API
 * (events.dataworker.ru/api/support/*), который работает напрямую с проектом
 * Plane SUP. TSupport здесь больше не используется — окно «Заявки» не зависит
 * от его доступности. Личность/роль берутся из JWT (req.user), а не из
 * клиентских заголовков; наружу — X-TF-User-*, X-TF-Company-Id; внутрь —
 * общий shared-secret (SUPPORT_INTAKE_SECRET).
 */
const express = require('express');
const axios = require('axios');

const { requireAuth } = require('../middleware/auth');
const { getAllowedNetworkIds } = require('../middleware/scopeFilter');

const router = express.Router();

const SUPPORT_API_BASE = (process.env.SUPPORT_API_BASE || 'https://events.dataworker.ru').replace(/\/+$/, '');
const SUPPORT_API_KEY = process.env.SUPPORT_INTAKE_SECRET || '';

const ALLOWED_ROLES = new Set(['super_admin', 'admin', 'manager', 'operator', 'user', 'customer']);
// TF-коды ролей → роли support-API (не входящие в ALLOWED_ROLES деградируют до operator)
const ROLE_MAP = {
  system_admin: 'super_admin',
  network_admin: 'admin',
};

// Лимиты на буферизуемые тела (upload/transcribe идут в память целиком)
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const MAX_TRANSCRIBE_BYTES = 25 * 1024 * 1024;

router.use(requireAuth);

function userHeaders(req) {
  const user = req.user || {};
  const mappedRole = ROLE_MAP[user.role] || user.role || 'operator';
  return {
    'X-TF-User-Id': user.id || '',
    'X-TF-User-Email': user.email || '',
    'X-TF-User-Name': encodeURIComponent(user.name || ''),
    'X-TF-User-Role': ALLOWED_ROLES.has(mappedRole) ? mappedRole : 'operator',
    'X-TF-Company-Id': req.supportCompanyId || '',
    'X-Support-Key': SUPPORT_API_KEY,
  };
}

// /unread — быстрый путь, когда backend не настроен (не спамим 503)
router.get('/unread', (req, res, next) => {
  if (!SUPPORT_API_KEY) return res.json({ tickets: 0, chat: 0, total: 0 });
  next();
});

// Проверка конфигурации + валидация выбранной компании по scope пользователя
router.use(async (req, res, next) => {
  if (!SUPPORT_API_KEY) {
    return res.status(503).json({ error: 'Support API не настроен (SUPPORT_INTAKE_SECRET пуст)' });
  }
  try {
    const companyId = String(req.headers['x-tf-company-id'] || '');
    if (companyId) {
      const allowed = await getAllowedNetworkIds(req.user);
      if (allowed && !allowed.has(companyId)) {
        return res.status(403).json({ error: 'Нет доступа к данным этой сети' });
      }
    }
    req.supportCompanyId = companyId;
  } catch {
    return res.status(500).json({ error: 'Ошибка проверки доступа' });
  }
  res.set('Cache-Control', 'no-store');
  next();
});

// Читает тело запроса в память с жёстким потолком размера
async function readBody(req, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      const err = new Error('Тело запроса слишком большое');
      err.statusCode = 413;
      throw err;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Upload файлов — multipart: проксируем СЫРОЙ поток с оригинальным Content-Type
// (generic-прокси ниже ставит application/json и потерял бы boundary).
router.post('/upload/:ticketId', async (req, res) => {
  try {
    const body = await readBody(req, MAX_UPLOAD_BYTES);
    const r = await axios({
      method: 'POST',
      url: `${SUPPORT_API_BASE}/api/support/upload/${encodeURIComponent(req.params.ticketId)}`,
      headers: { ...userHeaders(req), 'Content-Type': req.headers['content-type'] || 'application/octet-stream' },
      data: body,
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
    if (error.statusCode === 413) {
      return res.status(413).json({ error: 'Файл слишком большой' });
    }
    console.error('[Support Proxy] upload:', error.message);
    res.status(502).json({ error: 'Загрузка недоступна' });
  }
});

// STT: аудио (multipart) → текст. Сырой поток с оригинальным Content-Type
// (как /upload). Ответ оркестратора { text } отдаём как есть.
router.post('/transcribe', async (req, res) => {
  try {
    const body = await readBody(req, MAX_TRANSCRIBE_BYTES);
    const r = await axios({
      method: 'POST',
      url: `${SUPPORT_API_BASE}/api/support/transcribe`,
      headers: { ...userHeaders(req), 'Content-Type': req.headers['content-type'] || 'application/octet-stream' },
      data: body,
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
    if (error.statusCode === 413) {
      return res.status(413).json({ error: 'Аудио слишком большое' });
    }
    console.error('[Support Proxy] transcribe:', error.message);
    res.status(502).json({ error: 'Распознавание речи недоступно' });
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
