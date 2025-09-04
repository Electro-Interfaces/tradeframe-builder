/**
 * Tanks API Routes
 * Для раздела РЕЗЕРВУАРЫ - Управление резервуарами
 */

import { Router, Request, Response } from 'express';
import { tanksRepository } from '../database/repositories';
import { requireRole } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Tank:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         trading_point_id:
 *           type: string
 *           format: uuid
 *         equipment_id:
 *           type: string
 *           format: uuid
 *         fuel_type_id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         code:
 *           type: string
 *         capacity:
 *           type: number
 *           format: decimal
 *         current_volume:
 *           type: number
 *           format: decimal
 *         min_volume:
 *           type: number
 *           format: decimal
 *         max_volume:
 *           type: number
 *           format: decimal
 *         status:
 *           type: string
 *           enum: [active, inactive, maintenance, empty, filling]
 *         last_calibration:
 *           type: string
 *           format: date
 *         temperature:
 *           type: number
 *           format: decimal
 *         water_level:
 *           type: number
 *           format: decimal
 *         density:
 *           type: number
 *           format: decimal
 *         fill_percentage:
 *           type: number
 *           format: decimal
 *         sensors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ok, error, warning]
 *               value:
 *                 type: string
 *         alerts:
 *           type: array
 *           items:
 *             type: string
 *         settings:
 *           type: object
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
 * /tanks:
 *   get:
 *     summary: Получить список резервуаров
 *     tags: [Tanks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tradingPointId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Фильтр по торговой точке
 *       - in: query
 *         name: fuelTypeId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Фильтр по типу топлива
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, maintenance, empty, filling]
 *         description: Статус резервуара
 *       - in: query
 *         name: hasAlerts
 *         schema:
 *           type: boolean
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
 *         description: Список резервуаров
 */
router.get('/', requireRole(['operator', 'manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const {
      tradingPointId,
      fuelTypeId,
      status,
      hasAlerts,
      page = 1,
      limit = 50
    } = req.query;

    const filters: any = {};
    
    if (tradingPointId) filters.tradingPointId = tradingPointId;
    if (fuelTypeId) filters.fuelTypeId = fuelTypeId;
    if (status) filters.status = status;
    if (hasAlerts === 'true') filters.hasAlerts = true;

    // Ограничение доступа по ролям
    if (!req.user?.roles.includes('system_admin')) {
      if (req.user?.tradingPoints?.length) {
        filters.tradingPointIds = req.user.tradingPoints;
      } else if (req.user?.networkId) {
        filters.networkId = req.user.networkId;
      }
    }

    const result = await tanksRepository.findAllWithFilters(filters, {
      page: Number(page),
      limit: Number(limit)
    });

    // Добавляем сводную статистику
    const summary = {
      totalTanks: result.data.length,
      activeTanks: result.data.filter(tank => tank.status === 'active').length,
      maintenanceTanks: result.data.filter(tank => tank.status === 'maintenance').length,
      emptyTanks: result.data.filter(tank => tank.status === 'empty').length,
      totalCapacity: result.data.reduce((sum, tank) => sum + (tank.capacity || 0), 0),
      totalVolume: result.data.reduce((sum, tank) => sum + (tank.current_volume || 0), 0),
      averageFillLevel: result.data.length > 0 
        ? result.data.reduce((sum, tank) => sum + ((tank.current_volume || 0) / (tank.capacity || 1) * 100), 0) / result.data.length
        : 0
    };

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      summary,
      filters: {
        tradingPointId,
        fuelTypeId,
        status,
        hasAlerts
      }
    });
  } catch (error: any) {
    console.error('GET /tanks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tanks',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /tanks/{id}:
 *   get:
 *     summary: Получить резервуар по ID
 *     tags: [Tanks]
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
 *         description: Резервуар
 *       404:
 *         description: Резервуар не найден
 */
router.get('/:id', requireRole(['operator', 'manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const tank = await tanksRepository.findById(id);
    
    if (!tank) {
      return res.status(404).json({
        success: false,
        error: 'Tank not found',
        tankId: id
      });
    }

    // Проверка доступа
    if (!req.user?.roles.includes('system_admin')) {
      const hasAccess = req.user?.tradingPoints?.includes(tank.trading_point_id || '') ||
                       tank.network_id === req.user?.networkId;
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this tank'
        });
      }
    }
    
    res.json({
      success: true,
      data: tank
    });
  } catch (error: any) {
    console.error(`GET /tanks/${req.params.id} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tank',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /tanks:
 *   post:
 *     summary: Создать новый резервуар
 *     tags: [Tanks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - trading_point_id
 *               - name
 *               - code
 *               - capacity
 *             properties:
 *               trading_point_id:
 *                 type: string
 *                 format: uuid
 *               equipment_id:
 *                 type: string
 *                 format: uuid
 *               fuel_type_id:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               capacity:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *               min_volume:
 *                 type: number
 *                 format: decimal
 *               max_volume:
 *                 type: number
 *                 format: decimal
 *               settings:
 *                 type: object
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Резервуар создан
 *       400:
 *         description: Ошибка валидации
 */
router.post('/', requireRole(['manager', 'network_admin']), async (req: Request, res: Response) => {
  try {
    const {
      trading_point_id,
      equipment_id,
      fuel_type_id,
      name,
      code,
      capacity,
      min_volume,
      max_volume,
      settings,
      metadata
    } = req.body;

    // Валидация обязательных полей
    if (!trading_point_id || !name || !code || !capacity) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: trading_point_id, name, code, capacity'
      });
    }

    if (capacity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Capacity must be greater than 0'
      });
    }

    const tankData = {
      trading_point_id,
      equipment_id,
      fuel_type_id,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      capacity: Number(capacity),
      current_volume: 0,
      min_volume: min_volume ? Number(min_volume) : 0,
      max_volume: max_volume ? Number(max_volume) : capacity,
      status: 'active',
      settings: settings || {},
      metadata: metadata || {}
    };

    const tank = await tanksRepository.create(tankData);
    
    res.status(201).json({
      success: true,
      data: tank,
      message: 'Tank created successfully'
    });
  } catch (error: any) {
    console.error('POST /tanks error:', error);
    
    // Обработка ошибки уникальности кода
    if (error.message?.includes('duplicate key value') || error.message?.includes('unique constraint')) {
      return res.status(400).json({
        success: false,
        error: 'Tank code already exists for this trading point'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create tank',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /tanks/{id}:
 *   patch:
 *     summary: Обновить резервуар
 *     tags: [Tanks]
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
 *             properties:
 *               name:
 *                 type: string
 *               fuel_type_id:
 *                 type: string
 *                 format: uuid
 *               capacity:
 *                 type: number
 *               current_volume:
 *                 type: number
 *               min_volume:
 *                 type: number
 *               max_volume:
 *                 type: number
 *               status:
 *                 type: string
 *               settings:
 *                 type: object
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Резервуар обновлен
 *       404:
 *         description: Резервуар не найден
 */
router.patch('/:id', requireRole(['manager', 'network_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existingTank = await tanksRepository.findById(id);
    if (!existingTank) {
      return res.status(404).json({
        success: false,
        error: 'Tank not found',
        tankId: id
      });
    }

    // Валидация изменений
    if (updates.capacity !== undefined && updates.capacity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Capacity must be greater than 0'
      });
    }

    if (updates.current_volume !== undefined && updates.current_volume < 0) {
      return res.status(400).json({
        success: false,
        error: 'Current volume cannot be negative'
      });
    }

    const updatedTank = await tanksRepository.update(id, {
      ...updates,
      updated_by: req.user?.userId
    });
    
    res.json({
      success: true,
      data: updatedTank,
      message: 'Tank updated successfully'
    });
  } catch (error: any) {
    console.error(`PATCH /tanks/${req.params.id} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update tank',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /tanks/{id}/calibration:
 *   post:
 *     summary: Выполнить калибровку резервуара
 *     tags: [Tanks]
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
 *               - actual_volume
 *             properties:
 *               actual_volume:
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
 *               calibration_method:
 *                 type: string
 *                 enum: [manual, automatic, certified]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Калибровка выполнена
 *       404:
 *         description: Резервуар не найден
 */
router.post('/:id/calibration', requireRole(['operator', 'manager']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actual_volume, temperature, density, water_level, calibration_method = 'manual', notes } = req.body;

    // Валидация
    if (actual_volume === undefined || actual_volume < 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid actual_volume is required (must be >= 0)'
      });
    }

    const existingTank = await tanksRepository.findById(id);
    if (!existingTank) {
      return res.status(404).json({
        success: false,
        error: 'Tank not found',
        tankId: id
      });
    }

    // Проверка доступа
    if (!req.user?.roles.includes('system_admin')) {
      const hasAccess = req.user?.tradingPoints?.includes(existingTank.trading_point_id || '') ||
                       existingTank.network_id === req.user?.networkId;
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this tank'
        });
      }
    }

    const calibrationData = {
      current_volume: Number(actual_volume),
      last_calibration: new Date().toISOString().split('T')[0],
      metadata: {
        ...existingTank.metadata,
        last_calibration_method: calibration_method,
        calibration_notes: notes,
        calibrated_by: req.user?.userId,
        temperature: temperature ? Number(temperature) : undefined,
        density: density ? Number(density) : undefined,
        water_level: water_level ? Number(water_level) : undefined
      }
    };

    const updatedTank = await tanksRepository.updateCalibration(id, calibrationData);
    
    // Создаем запись в журнале событий резервуара
    await tanksRepository.createTankEvent({
      tank_id: id,
      event_type: 'calibration',
      title: 'Калибровка резервуара',
      description: `Калибровка выполнена методом ${calibration_method}. Объем: ${actual_volume}L`,
      performed_by: req.user?.userId,
      severity: 'info',
      metadata: { calibration_method, actual_volume, temperature, density, water_level, notes }
    });

    res.json({
      success: true,
      data: updatedTank,
      message: 'Tank calibration completed successfully'
    });
  } catch (error: any) {
    console.error(`POST /tanks/${req.params.id}/calibration error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform tank calibration',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /tanks/{id}/events:
 *   get:
 *     summary: Получить события резервуара
 *     tags: [Tanks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *           enum: [drain, fill, calibration, maintenance, alarm]
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
 *           maximum: 100
 *           default: 50
 *     responses:
 *       200:
 *         description: События резервуара
 */
router.get('/:id/events', requireRole(['operator', 'manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { eventType, startDate, endDate, page = 1, limit = 50 } = req.query;

    const filters: any = { tankId: id };
    
    if (eventType) filters.eventType = eventType;
    if (startDate || endDate) {
      filters.dateRange = {
        start: startDate ? new Date(startDate as string) : undefined,
        end: endDate ? new Date(endDate as string) : undefined
      };
    }

    const result = await tanksRepository.getTankEvents(filters, {
      page: Number(page),
      limit: Number(limit)
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      filters: { tankId: id, eventType, startDate, endDate }
    });
  } catch (error: any) {
    console.error(`GET /tanks/${req.params.id}/events error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tank events',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /tanks/export:
 *   get:
 *     summary: Экспорт резервуаров
 *     tags: [Tanks]
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
 *         name: tradingPointId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: includeEvents
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Включать историю событий
 *     responses:
 *       200:
 *         description: Экспортированные данные
 */
router.get('/export', requireRole(['manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { format = 'csv', tradingPointId, includeEvents = false } = req.query;

    const filters: any = {};
    if (tradingPointId) filters.tradingPointId = tradingPointId;

    // Ограничение доступа
    if (!req.user?.roles.includes('system_admin')) {
      if (req.user?.tradingPoints?.length) {
        filters.tradingPointIds = req.user.tradingPoints;
      } else if (req.user?.networkId) {
        filters.networkId = req.user.networkId;
      }
    }

    const result = await tanksRepository.exportTanks(filters, {
      format: format as 'csv' | 'xlsx' | 'json',
      includeEvents: includeEvents === 'true'
    });

    // Установка правильных заголовков для скачивания файла
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `tanks-${timestamp}.${format}`;
    
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
    console.error('GET /tanks/export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export tanks',
      details: error.message
    });
  }
});

export { router as tanksRouter };