/**
 * Раздел «Инфо» — база знаний компании (часть B). Только чтение; запись (админ-редактор) — фаза 4.
 *
 * Изоляция: вся логика доступа — в kbService (резолв доступных сетей из ролей, расширение по
 * компании). networkId с фронта НЕ доверяется. requireAuth на всех эндпоинтах.
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const kb = require('../services/kbService');

const router = express.Router();

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много запросов. Подождите.' },
});

const KB_UPLOAD_DIR = path.resolve(process.env.KB_UPLOAD_DIR || path.join(__dirname, '..', 'uploads', 'kb'));

// Дерево категорий + опубликованные действующие статьи компании.
router.get('/tree', requireAuth, async (req, res) => {
  try {
    const result = await kb.getTree(req.user, req.query.networkId || null);
    if (result.denied) return res.status(403).json({ error: 'Нет доступа к этой компании' });
    res.json({ categories: result.categories, articles: result.articles });
  } catch (e) {
    console.error('[kb] tree error:', e.message);
    res.status(503).json({ error: 'База знаний временно недоступна' });
  }
});

// Одна статья (404 если нет доступа — не подтверждаем существование).
router.get('/articles/:id', requireAuth, async (req, res) => {
  try {
    const result = await kb.getArticle(req.user, req.params.id);
    if (result.notFound) return res.status(404).json({ error: 'Статья не найдена' });
    res.json(result.article);
  } catch (e) {
    console.error('[kb] article error:', e.message);
    res.status(503).json({ error: 'База знаний временно недоступна' });
  }
});

// Федеративный поиск: статьи + контакты, изоляция в каждом под-запросе.
router.get('/search', requireAuth, searchLimiter, async (req, res) => {
  try {
    const result = await kb.search(req.user, req.query.q || '', req.query.networkId || null);
    res.json(result);
  } catch (e) {
    console.error('[kb] search error:', e.message);
    res.status(503).json({ error: 'Поиск временно недоступен' });
  }
});

// Справочник контактов компании.
router.get('/contacts', requireAuth, async (req, res) => {
  try {
    const result = await kb.listContacts(req.user, req.query.networkId || null);
    if (result.denied) return res.status(403).json({ error: 'Нет доступа к этой компании' });
    res.json({ contacts: result.contacts });
  } catch (e) {
    console.error('[kb] contacts error:', e.message);
    res.status(503).json({ error: 'Контакты временно недоступны' });
  }
});

// Отдача вложения (оригинал документа) — строго через проверку доступа к сети статьи.
router.get('/attachments/:id', requireAuth, async (req, res) => {
  try {
    const att = await kb.resolveAttachmentForUser(req.user, req.params.id);
    if (!att) return res.status(404).json({ error: 'Файл не найден' });

    const full = path.resolve(KB_UPLOAD_DIR, att.file_path);
    if (full !== KB_UPLOAD_DIR && !full.startsWith(KB_UPLOAD_DIR + path.sep)) {
      return res.status(404).json({ error: 'Файл не найден' }); // защита от path traversal
    }
    if (!fs.existsSync(full)) return res.status(404).json({ error: 'Файл не найден' });

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', att.mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(att.filename)}`);
    fs.createReadStream(full).on('error', () => { if (!res.headersSent) res.status(404).end(); }).pipe(res);
  } catch (e) {
    console.error('[kb] attachment error:', e.message);
    res.status(503).json({ error: 'Вложение временно недоступно' });
  }
});

// ── Запись (требует super_admin/system_admin — проверка в kbService) ───
const writeLimiter = rateLimit({
  windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Слишком много запросов. Подождите.' },
});

function mapWrite(res, r, okStatus = 200) {
  if (r.forbidden) return res.status(403).json({ error: 'Недостаточно прав' });
  if (r.notFound) return res.status(404).json({ error: 'Не найдено' });
  if (r.error) return res.status(400).json({ error: r.error });
  return res.status(okStatus).json(r);
}

router.post('/categories', requireAuth, writeLimiter, async (req, res) => {
  try { mapWrite(res, await kb.createCategory(req.user, req.body || {}), 201); }
  catch (e) { console.error('[kb] createCategory:', e.message); res.status(503).json({ error: 'Недоступно' }); }
});

router.post('/articles', requireAuth, writeLimiter, async (req, res) => {
  try { mapWrite(res, await kb.createArticle(req.user, req.body || {}), 201); }
  catch (e) { console.error('[kb] createArticle:', e.message); res.status(503).json({ error: 'Недоступно' }); }
});
router.put('/articles/:id', requireAuth, writeLimiter, async (req, res) => {
  try { mapWrite(res, await kb.updateArticle(req.user, req.params.id, req.body || {})); }
  catch (e) { console.error('[kb] updateArticle:', e.message); res.status(503).json({ error: 'Недоступно' }); }
});
router.delete('/articles/:id', requireAuth, writeLimiter, async (req, res) => {
  try { mapWrite(res, await kb.deleteArticle(req.user, req.params.id)); }
  catch (e) { console.error('[kb] deleteArticle:', e.message); res.status(503).json({ error: 'Недоступно' }); }
});

router.post('/contacts', requireAuth, writeLimiter, async (req, res) => {
  try { mapWrite(res, await kb.createContact(req.user, req.body || {}), 201); }
  catch (e) { console.error('[kb] createContact:', e.message); res.status(503).json({ error: 'Недоступно' }); }
});

// Админ-листинг (все статусы, super-only).
router.get('/admin/articles', requireAuth, async (req, res) => {
  try {
    const r = await kb.adminListArticles(req.user, req.query.networkId || null);
    if (r.forbidden) return res.status(403).json({ error: 'Недостаточно прав' });
    res.json({ articles: r.articles });
  } catch (e) { console.error('[kb] adminListArticles:', e.message); res.status(503).json({ error: 'Недоступно' }); }
});
router.get('/admin/categories', requireAuth, async (req, res) => {
  try {
    const r = await kb.adminListCategories(req.user, req.query.networkId || null);
    if (r.forbidden) return res.status(403).json({ error: 'Недостаточно прав' });
    res.json({ categories: r.categories });
  } catch (e) { console.error('[kb] adminListCategories:', e.message); res.status(503).json({ error: 'Недоступно' }); }
});

module.exports = router;
