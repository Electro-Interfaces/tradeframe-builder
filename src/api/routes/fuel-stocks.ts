/**
 * Fuel Stocks API Routes
 * Для раздела ОПЕРАЦИИ - Остатки топлива
 */

import { Router, Request, Response } from 'express';
import { fuelStocksRepository } from '../database/repositories';
import { requireRole } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     FuelStock:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         tank_id:
 *           type: string
 *           format: uuid
 *         fuel_type_id:
 *           type: string
 *           format: uuid
 *         trading_point_id:
 *           type: string
 *           format: uuid
 *         network_id:
 *           type: string
 *           format: uuid
 *         current_volume:
 *           type: number
 *           format: decimal
 *         capacity:
 *           type: number
 *           format: decimal
 *         minimum_level:
 *           type: number
 *           format: decimal
 *         maximum_level:
 *           type: number
 *           format: decimal
 *         density:
 *           type: number
 *           format: decimal
 *         temperature:
 *           type: number
 *           format: decimal
 *         water_level:
 *           type: number
 *           format: decimal
 *         last_measurement:
 *           type: string
 *           format: date-time
 *         calibration_factor:
 *           type: number
 *           format: decimal
 *         status:
 *           type: string
 *           enum: [normal, low_level, high_level, critical, maintenance]
 *         alerts:
 *           type: array
 *           items:
 *             type: string
 *         metadata:
 *           type: object
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /fuel-stocks:
 *   get:
 *     summary: Получить остатки топлива с фильтрацией
 *     tags: [Fuel Stocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fuelTypeId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Фильтр по типу топлива
 *       - in: query
 *         name: tradingPointId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Фильтр по торговой точке
 *       - in: query
 *         name: networkId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Фильтр по сети
 *       - in: query
 *         name: tankId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Фильтр по резервуару
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [normal, low_level, high_level, critical, maintenance]
 *         description: Статус резервуара
 *       - in: query
 *         name: alertsOnly
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Только резервуары с предупреждениями
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *     responses:
 *       200:
 *         description: Остатки топлива
 */
router.get('/', requireRole(['operator', 'manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const {
      fuelTypeId,
      tradingPointId,
      networkId,
      tankId,
      status,
      alertsOnly = false,
      page = 1,
      limit = 50
    } = req.query;

    const filters: any = {};
    
    if (fuelTypeId) filters.fuelTypeId = fuelTypeId;
    if (tradingPointId) filters.tradingPointId = tradingPointId;
    if (networkId) filters.networkId = networkId;
    if (tankId) filters.tankId = tankId;
    if (status) filters.status = status;
    if (alertsOnly === 'true') filters.hasAlerts = true;

    // Ограничение доступа по ролям
    if (!req.user?.roles.includes('system_admin')) {
      if (req.user?.tradingPoints?.length) {
        filters.tradingPointIds = req.user.tradingPoints;
      } else if (req.user?.networkId) {
        filters.networkId = req.user.networkId;
      }
    }

    const result = await fuelStocksRepository.findAllWithFilters(filters, {
      page: Number(page),
      limit: Number(limit)
    });

    // Добавляем сводную статистику
    const summary = {
      totalTanks: result.data.length,
      normalTanks: result.data.filter(stock => stock.status === 'normal').length,
      lowLevelTanks: result.data.filter(stock => stock.status === 'low_level').length,
      criticalTanks: result.data.filter(stock => stock.status === 'critical').length,
      totalVolume: result.data.reduce((sum, stock) => sum + (stock.current_volume || 0), 0),
      totalCapacity: result.data.reduce((sum, stock) => sum + (stock.capacity || 0), 0),
      averageFillLevel: result.data.length > 0 
        ? result.data.reduce((sum, stock) => sum + ((stock.current_volume || 0) / (stock.capacity || 1) * 100), 0) / result.data.length
        : 0
    };

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      summary,
      filters: {
        fuelTypeId,
        tradingPointId,
        networkId,
        tankId,
        status,
        alertsOnly
      }
    });
  } catch (error: any) {
    console.error('GET /fuel-stocks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fuel stocks',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /fuel-stocks/{id}:
 *   get:
 *     summary: Получить остаток топлива по ID
 *     tags: [Fuel Stocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Остаток топлива
 *       404:
 *         description: Остаток не найден
 */
router.get('/:id', requireRole(['operator', 'manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const fuelStock = await fuelStocksRepository.findById(id);
    
    if (!fuelStock) {
      return res.status(404).json({
        success: false,
        error: 'Fuel stock not found',
        stockId: id
      });
    }

    // Проверка доступа
    if (!req.user?.roles.includes('system_admin')) {
      const hasAccess = req.user?.tradingPoints?.includes(fuelStock.trading_point_id || '') ||
                       fuelStock.network_id === req.user?.networkId;
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this fuel stock'
        });
      }
    }
    
    res.json({
      success: true,
      data: fuelStock
    });
  } catch (error: any) {
    console.error(`GET /fuel-stocks/${req.params.id} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fuel stock',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /fuel-stocks/{id}/measurement:
 *   post:
 *     summary: Добавить новое измерение уровня топлива
 *     tags: [Fuel Stocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - volume
 *             properties:
 *               volume:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *               temperature:
 *                 type: number
 *                 format: decimal
 *               density:
 *                 type: number
 *                 format: decimal
 *               water_level:
 *                 type: number
 *                 format: decimal
 *               measurement_method:
 *                 type: string
 *                 enum: [manual, automatic, calibrated_stick]
 *                 default: manual
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Измерение добавлено
 *       400:
 *         description: Ошибка валидации
 */
router.post('/:id/measurement', requireRole(['operator', 'manager']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { volume, temperature, density, water_level, measurement_method = 'manual', notes } = req.body;

    // Валидация
    if (volume === undefined || volume < 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid volume is required (must be >= 0)'
      });
    }

    const existingStock = await fuelStocksRepository.findById(id);
    if (!existingStock) {
      return res.status(404).json({
        success: false,
        error: 'Fuel stock not found',
        stockId: id
      });
    }

    // Проверка доступа
    if (!req.user?.roles.includes('system_admin')) {
      const hasAccess = req.user?.tradingPoints?.includes(existingStock.trading_point_id || '') ||
                       existingStock.network_id === req.user?.networkId;
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this fuel stock'
        });
      }
    }

    // Проверка на превышение емкости
    if (volume > existingStock.capacity) {
      return res.status(400).json({
        success: false,
        error: 'Volume exceeds tank capacity',
        capacity: existingStock.capacity,
        volume
      });
    }

    const measurementData = {
      current_volume: Number(volume),
      temperature: temperature ? Number(temperature) : undefined,
      density: density ? Number(density) : undefined,
      water_level: water_level ? Number(water_level) : undefined,
      last_measurement: new Date().toISOString(),
      metadata: {
        ...existingStock.metadata,
        last_measurement_method: measurement_method,
        measurement_notes: notes,
        measured_by: req.user?.userId
      }
    };

    const updatedStock = await fuelStocksRepository.updateMeasurement(id, measurementData);
    
    // Создаем запись в истории измерений
    await fuelStocksRepository.createMeasurementHistory({
      tank_id: existingStock.tank_id,
      fuel_type_id: existingStock.fuel_type_id,
      volume: Number(volume),
      temperature,
      density,
      water_level,
      measurement_method,
      measured_by: req.user?.userId,
      notes
    });

    res.json({
      success: true,
      data: updatedStock,
      message: 'Fuel measurement recorded successfully'
    });
  } catch (error: any) {
    console.error(`POST /fuel-stocks/${req.params.id}/measurement error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to record fuel measurement',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /fuel-stocks/alerts:
 *   get:
 *     summary: Получить все предупреждения по остаткам топлива
 *     tags: [Fuel Stocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Уровень серьезности
 *       - in: query
 *         name: tradingPointId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: resolved
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Включать решенные предупреждения
 *     responses:
 *       200:
 *         description: Список предупреждений
 */
router.get('/alerts', requireRole(['operator', 'manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { severity, tradingPointId, resolved = false } = req.query;

    const filters: any = {};
    if (severity) filters.severity = severity;
    if (tradingPointId) filters.tradingPointId = tradingPointId;
    if (resolved === 'false') filters.resolved = false;

    // Ограничение доступа
    if (!req.user?.roles.includes('system_admin')) {
      if (req.user?.tradingPoints?.length) {
        filters.tradingPointIds = req.user.tradingPoints;
      } else if (req.user?.networkId) {
        filters.networkId = req.user.networkId;
      }
    }

    const alerts = await fuelStocksRepository.getStockAlerts(filters);
    
    res.json({
      success: true,
      data: alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter(alert => alert.severity === 'critical').length,
        high: alerts.filter(alert => alert.severity === 'high').length,
        medium: alerts.filter(alert => alert.severity === 'medium').length,
        low: alerts.filter(alert => alert.severity === 'low').length
      }
    });
  } catch (error: any) {
    console.error('GET /fuel-stocks/alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fuel stock alerts',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /fuel-stocks/history:
 *   get:
 *     summary: Получить историю измерений топлива
 *     tags: [Fuel Stocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tankId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Фильтр по резервуару
 *       - in: query
 *         name: fuelTypeId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Фильтр по типу топлива
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           default: 100
 *     responses:
 *       200:
 *         description: История измерений
 */
router.get('/history', requireRole(['operator', 'manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const {
      tankId,
      fuelTypeId,
      startDate,
      endDate,
      page = 1,
      limit = 100
    } = req.query;

    const filters: any = {};
    if (tankId) filters.tankId = tankId;
    if (fuelTypeId) filters.fuelTypeId = fuelTypeId;
    
    if (startDate || endDate) {
      filters.dateRange = {
        start: startDate ? new Date(startDate as string) : undefined,
        end: endDate ? new Date(endDate as string) : undefined
      };
    }

    // Ограничение доступа по ролям
    if (!req.user?.roles.includes('system_admin')) {
      if (req.user?.tradingPoints?.length) {
        filters.tradingPointIds = req.user.tradingPoints;
      } else if (req.user?.networkId) {
        filters.networkId = req.user.networkId;
      }
    }

    const result = await fuelStocksRepository.getMeasurementHistory(filters, {
      page: Number(page),
      limit: Number(limit)
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      filters: {
        tankId,
        fuelTypeId,
        startDate,
        endDate
      }
    });
  } catch (error: any) {
    console.error('GET /fuel-stocks/history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch measurement history',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /fuel-stocks/export:
 *   get:
 *     summary: Экспорт остатков топлива
 *     tags: [Fuel Stocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, xlsx, json]
 *           default: csv
 *       - in: query
 *         name: fuelTypeId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: tradingPointId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: includeHistory
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Включать историю измерений
 *     responses:
 *       200:
 *         description: Экспортированные данные
 */
router.get('/export', requireRole(['manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { format = 'csv', fuelTypeId, tradingPointId, includeHistory = false } = req.query;

    const filters: any = {};
    if (fuelTypeId) filters.fuelTypeId = fuelTypeId;
    if (tradingPointId) filters.tradingPointId = tradingPointId;

    // Ограничение доступа
    if (!req.user?.roles.includes('system_admin')) {
      if (req.user?.tradingPoints?.length) {
        filters.tradingPointIds = req.user.tradingPoints;
      } else if (req.user?.networkId) {
        filters.networkId = req.user.networkId;
      }
    }

    const result = await fuelStocksRepository.exportStocks(filters, {
      format: format as 'csv' | 'xlsx' | 'json',
      includeHistory: includeHistory === 'true'
    });

    // Установка правильных заголовков для скачивания файла
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `fuel-stocks-${timestamp}.${format}`;
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(result);
    } else {
      res.setHeader('Content-Type', format === 'xlsx' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        : 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(result);
    }
    
  } catch (error: any) {
    console.error('GET /fuel-stocks/export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export fuel stocks',
      details: error.message
    });
  }
});

export { router as fuelStocksRouter };