/**
 * API эндпоинты для управления настройками автокалибровки резервуаров
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const tankCalibrationDataSource = require('../services/tankCalibration/tankCalibrationDataSource');

const router = express.Router();

// Все эндпоинты калибровки требуют авторизации
router.use(requireAuth);

/**
 * GET /api/tank-calibration/:tankId
 * Получить настройки калибровки для резервуара
 */
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

/**
 * POST /api/tank-calibration
 * Сохранить/обновить настройки калибровки резервуара
 */
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

/**
 * DELETE /api/tank-calibration/:tankId
 * Удалить настройки калибровки резервуара
 */
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

/**
 * POST /api/tank-calibration/:tankId/run
 * Запустить процесс калибровки для резервуара
 */
router.post('/:tankId/run', async (req, res) => {
  try {
    const { tankId } = req.params;

    const settings = await tankCalibrationDataSource.getCalibrationSettings(tankId);
    if (!settings) {
      return res.status(404).json({ error: 'Calibration settings not found' });
    }

    // Алгоритм калибровки ещё не реализован
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
