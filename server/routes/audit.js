const express = require('express');

const { requireAuth, tryAuth } = require('../middleware/auth');
const auditDataSource = require('../services/audit/auditDataSource');

const router = express.Router();

function isMissingTableError(error) {
  return error?.status === 404 || error?.code === '42P01';
}

router.post('/', tryAuth, async (req, res) => {
  try {
    const input = req.body || {};
    const actionType = String(input.action_type || '').trim();

    if (!input.action || !actionType) {
      return res.status(400).json({ error: 'action и action_type обязательны' });
    }

    if (!req.user && actionType !== 'authentication') {
      return res.status(401).json({ error: 'Требуется авторизация для создания записи аудита' });
    }

    const payload = {
      ...input,
      user_id: req.user?.id || input.user_id,
      user_email: req.user?.email || input.user_email || '',
      user_name: req.user?.name || input.user_name || '',
      ip_address: input.ip_address || req.ip || null,
      user_agent: input.user_agent || req.get('user-agent') || null,
    };

    const entry = await auditDataSource.createAuditLog(payload);
    return res.status(201).json({ success: true, data: entry });
  } catch (error) {
    if (isMissingTableError(error)) {
      return res.status(404).json({ error: 'Таблица audit_log не создана' });
    }

    return res.status(500).json({ error: error.message || 'Ошибка создания записи аудита' });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const logs = await auditDataSource.getAuditLogs({
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      user_id: req.query.user_id,
      user_email: req.query.user_email,
      action_type: req.query.action_type,
      object_type: req.query.object_type,
      object_id: req.query.object_id,
      search_query: req.query.search_query,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    });

    return res.json({ success: true, data: logs });
  } catch (error) {
    if (isMissingTableError(error)) {
      return res.status(404).json({ error: 'Таблица audit_log не создана' });
    }

    return res.status(500).json({ error: error.message || 'Ошибка загрузки журнала аудита' });
  }
});

router.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await auditDataSource.getAuditLogStatistics();
    return res.json({ success: true, data: stats });
  } catch (error) {
    if (isMissingTableError(error)) {
      return res.status(404).json({ error: 'Таблица audit_log не создана' });
    }

    return res.status(500).json({ error: error.message || 'Ошибка загрузки статистики аудита' });
  }
});

router.get('/recent', requireAuth, async (req, res) => {
  try {
    const logs = await auditDataSource.getRecentAuditLogs(
      req.query.limit ? Number(req.query.limit) : 10
    );
    return res.json({ success: true, data: logs });
  } catch (error) {
    if (isMissingTableError(error)) {
      return res.status(404).json({ error: 'Таблица audit_log не создана' });
    }

    return res.status(500).json({ error: error.message || 'Ошибка загрузки последних событий аудита' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const log = await auditDataSource.getAuditLogById(req.params.id);
    if (!log) {
      return res.status(404).json({ error: 'Запись аудита не найдена' });
    }

    return res.json({ success: true, data: log });
  } catch (error) {
    if (isMissingTableError(error)) {
      return res.status(404).json({ error: 'Таблица audit_log не создана' });
    }

    return res.status(500).json({ error: error.message || 'Ошибка загрузки записи аудита' });
  }
});

router.post('/cleanup', requireAuth, async (req, res) => {
  try {
    const removed = await auditDataSource.cleanOldAuditLogs(
      req.body?.daysToKeep ? Number(req.body.daysToKeep) : 180
    );

    return res.json({ success: true, removed });
  } catch (error) {
    if (isMissingTableError(error)) {
      return res.status(404).json({ error: 'Таблица audit_log не создана' });
    }

    return res.status(500).json({ error: error.message || 'Ошибка очистки журнала аудита' });
  }
});

module.exports = router;
