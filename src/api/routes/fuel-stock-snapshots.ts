/**
 * Fuel Stock Snapshots API Routes
 * Исторические снимки остатков топлива
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, requireRole, requireNetworkAccess } from '../middleware/auth';
import { FuelStockSnapshotsRepository } from '../database/repositories';

const router = Router();
const fuelStockSnapshotsRepo = new FuelStockSnapshotsRepository();

// ===============================================
// VALIDATION SCHEMAS
// ===============================================

const GetSnapshotsQuerySchema = z.object({
  tankId: z.string().uuid().optional(),
  tradingPointId: z.string().uuid().optional(),
  fuelTypeId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0)
});

const CreateSnapshotSchema = z.object({
  tank_id: z.string().uuid(),
  fuel_stock_id: z.string().uuid().optional(),
  trading_point_id: z.string().uuid(),
  fuel_type_id: z.string().uuid(),
  snapshot_time: z.string().datetime(),
  current_level_liters: z.number().min(0),
  capacity_liters: z.number().min(0),
  temperature: z.number().optional(),
  water_level_mm: z.number().min(0).optional(),
  density: z.number().min(0).optional(),
  tank_status: z.enum(['active', 'maintenance', 'offline']).default('active'),
  operation_mode: z.enum(['normal', 'filling', 'draining', 'maintenance']).default('normal'),
  consumption_rate: z.number().min(0).default(0),
  fill_rate: z.number().min(0).default(0),
  data_source: z.enum(['sensor', 'manual', 'generated']).default('generated'),
  metadata: z.record(z.any()).default({})
});

const BatchCreateSnapshotsSchema = z.object({
  snapshots: z.array(CreateSnapshotSchema).min(1).max(1000)
});

// ===============================================
// ROUTES
// ===============================================

/**
 * @swagger
 * /api/v1/fuel-stock-snapshots:
 *   get:
 *     summary: Получить исторические снимки остатков топлива
 *     tags: [Fuel Stock Snapshots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tankId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID резервуара
 *       - in: query
 *         name: tradingPointId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID торговой точки
 *       - in: query
 *         name: fuelTypeId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID типа топлива
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Начальная дата
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Конечная дата
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *         description: Количество записей
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Смещение
 *     responses:
 *       200:
 *         description: Список снимков остатков топлива
 *       400:
 *         description: Неверные параметры запроса
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Недостаточно прав
 */
router.get('/', authenticateToken, requireRole(['operator', 'manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const query = GetSnapshotsQuerySchema.parse(req.query);
    
    // Проверяем доступ к торговой точке если она указана
    if (query.tradingPointId) {
      await requireNetworkAccess(req, res, () => {});
    }
    
    const snapshots = await fuelStockSnapshotsRepo.findMany({
      where: {
        ...(query.tankId && { tank_id: query.tankId }),
        ...(query.tradingPointId && { trading_point_id: query.tradingPointId }),
        ...(query.fuelTypeId && { fuel_type_id: query.fuelTypeId }),
        ...(query.startDate && { snapshot_time: { gte: query.startDate } }),
        ...(query.endDate && { snapshot_time: { lte: query.endDate } })
      },
      orderBy: { snapshot_time: 'desc' },
      take: query.limit,
      skip: query.offset,
      include: {
        tank: true,
        fuel_type: true,
        trading_point: true
      }
    });
    
    res.json({
      success: true,
      data: snapshots,
      meta: {
        limit: query.limit,
        offset: query.offset,
        hasMore: snapshots.length === query.limit
      }
    });
    
  } catch (error) {
    console.error('Get fuel stock snapshots error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Неверные параметры запроса',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * @swagger
 * /api/v1/fuel-stock-snapshots/{id}:
 *   get:
 *     summary: Получить снимок по ID
 *     tags: [Fuel Stock Snapshots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID снимка
 *     responses:
 *       200:
 *         description: Снимок остатков топлива
 *       404:
 *         description: Снимок не найден
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Недостаточно прав
 */
router.get('/:id', authenticateToken, requireRole(['operator', 'manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const snapshot = await fuelStockSnapshotsRepo.findById(req.params.id, {
      include: {
        tank: true,
        fuel_type: true,
        trading_point: true
      }
    });
    
    if (!snapshot) {
      return res.status(404).json({
        success: false,
        error: 'Снимок не найден'
      });
    }
    
    res.json({
      success: true,
      data: snapshot
    });
    
  } catch (error) {
    console.error(`Get fuel stock snapshot ${req.params.id} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * @swagger
 * /api/v1/fuel-stock-snapshots:
 *   post:
 *     summary: Создать снимок остатков топлива
 *     tags: [Fuel Stock Snapshots]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tank_id
 *               - trading_point_id
 *               - fuel_type_id
 *               - snapshot_time
 *               - current_level_liters
 *               - capacity_liters
 *             properties:
 *               tank_id:
 *                 type: string
 *                 format: uuid
 *               fuel_stock_id:
 *                 type: string
 *                 format: uuid
 *               trading_point_id:
 *                 type: string
 *                 format: uuid
 *               fuel_type_id:
 *                 type: string
 *                 format: uuid
 *               snapshot_time:
 *                 type: string
 *                 format: date-time
 *               current_level_liters:
 *                 type: number
 *                 minimum: 0
 *               capacity_liters:
 *                 type: number
 *                 minimum: 0
 *               temperature:
 *                 type: number
 *               water_level_mm:
 *                 type: number
 *                 minimum: 0
 *               density:
 *                 type: number
 *                 minimum: 0
 *               tank_status:
 *                 type: string
 *                 enum: [active, maintenance, offline]
 *               operation_mode:
 *                 type: string
 *                 enum: [normal, filling, draining, maintenance]
 *               consumption_rate:
 *                 type: number
 *                 minimum: 0
 *               fill_rate:
 *                 type: number
 *                 minimum: 0
 *               data_source:
 *                 type: string
 *                 enum: [sensor, manual, generated]
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Снимок создан
 *       400:
 *         description: Неверные данные
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Недостаточно прав
 */
router.post('/', authenticateToken, requireRole(['manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const data = CreateSnapshotSchema.parse(req.body);
    
    // Проверяем доступ к торговой точке
    await requireNetworkAccess(req, res, () => {});
    
    // Генерируем checksum для данных
    const checksumData = JSON.stringify({
      tank_id: data.tank_id,
      snapshot_time: data.snapshot_time,
      current_level_liters: data.current_level_liters,
      temperature: data.temperature,
      water_level_mm: data.water_level_mm
    });
    
    const checksum = require('crypto')
      .createHash('sha256')
      .update(checksumData)
      .digest('hex');
    
    const snapshot = await fuelStockSnapshotsRepo.create({
      ...data,
      checksum
    });
    
    res.status(201).json({
      success: true,
      data: snapshot
    });
    
  } catch (error) {
    console.error('Create fuel stock snapshot error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Неверные данные',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * @swagger
 * /api/v1/fuel-stock-snapshots/batch:
 *   post:
 *     summary: Создать множество снимков остатков топлива
 *     tags: [Fuel Stock Snapshots]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - snapshots
 *             properties:
 *               snapshots:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/CreateFuelStockSnapshot'
 *                 minItems: 1
 *                 maxItems: 1000
 *     responses:
 *       201:
 *         description: Снимки созданы
 *       400:
 *         description: Неверные данные
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Недостаточно прав
 */
router.post('/batch', authenticateToken, requireRole(['system_admin']), async (req: Request, res: Response) => {
  try {
    const { snapshots } = BatchCreateSnapshotsSchema.parse(req.body);
    
    // Создаем снимки с checksum
    const snapshotsWithChecksum = snapshots.map(data => {
      const checksumData = JSON.stringify({
        tank_id: data.tank_id,
        snapshot_time: data.snapshot_time,
        current_level_liters: data.current_level_liters,
        temperature: data.temperature,
        water_level_mm: data.water_level_mm
      });
      
      const checksum = require('crypto')
        .createHash('sha256')
        .update(checksumData)
        .digest('hex');
        
      return {
        ...data,
        checksum
      };
    });
    
    const createdSnapshots = await fuelStockSnapshotsRepo.createMany(snapshotsWithChecksum);
    
    res.status(201).json({
      success: true,
      data: createdSnapshots,
      meta: {
        created_count: createdSnapshots.length
      }
    });
    
  } catch (error) {
    console.error('Batch create fuel stock snapshots error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Неверные данные',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * @swagger
 * /api/v1/fuel-stock-snapshots/tank/{tankId}/latest:
 *   get:
 *     summary: Получить последний снимок для резервуара
 *     tags: [Fuel Stock Snapshots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tankId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID резервуара
 *     responses:
 *       200:
 *         description: Последний снимок резервуара
 *       404:
 *         description: Снимки не найдены
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Недостаточно прав
 */
router.get('/tank/:tankId/latest', authenticateToken, requireRole(['operator', 'manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const snapshot = await fuelStockSnapshotsRepo.findFirst({
      where: { tank_id: req.params.tankId },
      orderBy: { snapshot_time: 'desc' },
      include: {
        tank: true,
        fuel_type: true,
        trading_point: true
      }
    });
    
    if (!snapshot) {
      return res.status(404).json({
        success: false,
        error: 'Снимки для резервуара не найдены'
      });
    }
    
    res.json({
      success: true,
      data: snapshot
    });
    
  } catch (error) {
    console.error(`Get latest snapshot for tank ${req.params.tankId} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * @swagger
 * /api/v1/fuel-stock-snapshots/analytics/summary:
 *   get:
 *     summary: Получить аналитическую сводку по снимкам
 *     tags: [Fuel Stock Snapshots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tradingPointId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID торговой точки
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Начальная дата
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Конечная дата
 *     responses:
 *       200:
 *         description: Аналитическая сводка
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Недостаточно прав
 */
router.get('/analytics/summary', authenticateToken, requireRole(['manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const query = z.object({
      tradingPointId: z.string().uuid().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional()
    }).parse(req.query);
    
    const summary = await fuelStockSnapshotsRepo.getAnalyticsSummary(query);
    
    res.json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    console.error('Get fuel stock snapshots analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

export { router as fuelStockSnapshotsRouter };