/**
 * API эндпоинты для управления настройками автокалибровки резервуаров
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const tankCalibrationDataSource = require('../services/tankCalibration/tankCalibrationDataSource');

const router = express.Router();

router.use(requireAuth);

function hasCalibrationAdminAccess(user) {
  const roleCodes = new Set([
    user?.role,
    ...(Array.isArray(user?.roles) ? user.roles.map((role) => role.roleCode) : []),
  ].filter(Boolean));

  if (['super_admin', 'system_admin', 'network_admin'].some((code) => roleCodes.has(code))) {
    return true;
  }

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return permissions.some((permission) => {
    const actions = Array.isArray(permission?.actions) ? permission.actions : [];
    const canManage = actions.includes('manage') || actions.includes('write');

    return canManage && permission.section === 'equipment' && (
      permission.resource === 'calibration' || permission.resource === 'tanks'
    );
  });
}

function requireCalibrationAdmin(req, res, next) {
  if (!hasCalibrationAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Недостаточно прав для управления калибровочными таблицами' });
  }

  return next();
}

router.get('/:tankId/tables', async (req, res) => {
  try {
    const items = await tankCalibrationDataSource.getCalibrationTables(req.params.tankId);
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки калибровочных таблиц' });
  }
});

router.post('/:tankId/tables', async (req, res) => {
  try {
    const payload = {
      ...req.body,
      tank_id: req.body?.tank_id || req.params.tankId,
    };

    if (payload.tank_id !== req.params.tankId) {
      return res.status(400).json({ error: 'tank_id в теле запроса не совпадает с tankId в URL' });
    }

    const item = await tankCalibrationDataSource.createCalibrationTable(payload, req.user?.id);
    return res.status(201).json(item);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка сохранения калибровочной таблицы' });
  }
});

router.get('/tables/:tableId', async (req, res) => {
  try {
    const item = await tankCalibrationDataSource.getCalibrationTable(req.params.tableId);
    if (!item) {
      return res.status(404).json({ error: 'Калибровочная таблица не найдена' });
    }

    return res.json(item);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки калибровочной таблицы' });
  }
});

router.get('/tables/:tableId/download', async (req, res) => {
  try {
    const format = typeof req.query.format === 'string' ? req.query.format : 'csv';
    const file = await tankCalibrationDataSource.downloadCalibrationTable(req.params.tableId, format);

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    return res.send(file.content);
  } catch (error) {
    const status = error.message === 'Калибровочная таблица не найдена' ? 404 : 400;
    return res.status(status).json({ error: error.message || 'Ошибка выгрузки калибровочной таблицы' });
  }
});

router.post('/tables/:tableId/approve', requireCalibrationAdmin, async (req, res) => {
  try {
    const item = await tankCalibrationDataSource.approveCalibrationTable(
      req.params.tableId,
      req.user?.id,
      req.body?.notes
    );
    return res.json(item);
  } catch (error) {
    const status = error.message === 'Калибровочная таблица не найдена' ? 404 : 400;
    return res.status(status).json({ error: error.message || 'Ошибка утверждения калибровочной таблицы' });
  }
});

router.post('/tables/:tableId/reject', requireCalibrationAdmin, async (req, res) => {
  try {
    const item = await tankCalibrationDataSource.rejectCalibrationTable(
      req.params.tableId,
      req.user?.id,
      req.body?.reason
    );
    return res.json(item);
  } catch (error) {
    const status = error.message === 'Калибровочная таблица не найдена' ? 404 : 400;
    return res.status(status).json({ error: error.message || 'Ошибка отклонения калибровочной таблицы' });
  }
});

router.post('/tables/:tableId/apply', requireCalibrationAdmin, async (req, res) => {
  try {
    const item = await tankCalibrationDataSource.applyCalibrationTable(req.params.tableId, req.user?.id);
    return res.json(item);
  } catch (error) {
    const status = error.message === 'Калибровочная таблица не найдена' ? 404 : 400;
    return res.status(status).json({ error: error.message || 'Ошибка применения калибровочной таблицы' });
  }
});

router.delete('/tables/:tableId', requireCalibrationAdmin, async (req, res) => {
  try {
    await tankCalibrationDataSource.deleteCalibrationTable(req.params.tableId);
    return res.status(204).send();
  } catch (error) {
    const status = error.message === 'Калибровочная таблица не найдена' ? 404 : 400;
    return res.status(status).json({ error: error.message || 'Ошибка удаления калибровочной таблицы' });
  }
});

router.get('/:tankId', async (req, res) => {
  try {
    const { tankId } = req.params;
    const data = await tankCalibrationDataSource.getCalibrationSettings(tankId);
    res.json(data || null);
  } catch (error) {
    console.error('Error in GET /api/tank-calibration/:tankId:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const settings = req.body;

    if (!settings.tank_id) {
      return res.status(400).json({ error: 'tank_id is required' });
    }
    const result = await tankCalibrationDataSource.saveCalibrationSettings(settings);
    res.json(result);
  } catch (error) {
    console.error('Error in POST /api/tank-calibration:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:tankId', async (req, res) => {
  try {
    const { tankId } = req.params;
    await tankCalibrationDataSource.deleteCalibrationSettings(tankId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/tank-calibration/:tankId:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:tankId/run', async (req, res) => {
  try {
    const { tankId } = req.params;

    const settings = await tankCalibrationDataSource.getCalibrationSettings(tankId);
    if (!settings) {
      return res.status(404).json({ error: 'Calibration settings not found' });
    }

    res.status(501).json({
      error: 'Not Implemented',
      message: 'Серверный алгоритм калибровки ещё не реализован. Используйте клиентский расчёт в диалоге анализа.',
      tankId,
    });
  } catch (error) {
    console.error('Error in POST /api/tank-calibration/:tankId/run:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
