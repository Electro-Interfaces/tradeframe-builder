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

module.exports = router;
