/**
 * Price History API Routes
 * Для раздела ОПЕРАЦИИ - История цен
 */

import { Router, Request, Response } from 'express';
import { priceHistoryRepository } from '../database/repositories';
import { requireRole } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     PriceHistory:
 *       type: object
 *       properties:
 *         id:
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
 *         price:
 *           type: number
 *           format: decimal
 *         price_type:
 *           type: string
 *           enum: [retail, wholesale, special]
 *         effective_from:
 *           type: string
 *           format: date-time
 *         effective_to:
 *           type: string
 *           format: date-time
 *         is_active:
 *           type: boolean
 *         created_by:
 *           type: string
 *         reason:
 *           type: string
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
 * /price-history:
 *   get:
 *     summary: Получить историю цен с фильтрацией
 *     tags: [Price History]
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
 *         name: priceType
 *         schema:
 *           type: string
 *           enum: [retail, wholesale, special]
 *         description: Тип цены
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Дата начала периода
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Дата окончания периода
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Только активные цены
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
 *         description: История цен
 */
router.get('/', requireRole(['manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const {
      fuelTypeId,
      tradingPointId,
      networkId,
      priceType,
      startDate,
      endDate,
      activeOnly = false,
      page = 1,
      limit = 50
    } = req.query;

    const filters: any = {};
    
    if (fuelTypeId) filters.fuelTypeId = fuelTypeId;
    if (tradingPointId) filters.tradingPointId = tradingPointId;
    if (networkId) filters.networkId = networkId;
    if (priceType) filters.priceType = priceType;
    if (activeOnly === 'true') filters.isActive = true;
    
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

    const result = await priceHistoryRepository.findAllWithFilters(filters, {
      page: Number(page),
      limit: Number(limit)
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      filters: {
        fuelTypeId,
        tradingPointId,
        networkId,
        priceType,
        startDate,
        endDate,
        activeOnly
      }
    });
  } catch (error: any) {
    console.error('GET /price-history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch price history',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /price-history/{id}:
 *   get:
 *     summary: Получить запись истории цен по ID
 *     tags: [Price History]
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
 *         description: Запись истории цен
 *       404:
 *         description: Запись не найдена
 */
router.get('/:id', requireRole(['manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const priceRecord = await priceHistoryRepository.findById(id);
    
    if (!priceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Price history record not found',
        recordId: id
      });
    }

    // Проверка доступа
    if (!req.user?.roles.includes('system_admin')) {
      const hasAccess = req.user?.tradingPoints?.includes(priceRecord.trading_point_id || '') ||
                       priceRecord.network_id === req.user?.networkId;
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this price record'
        });
      }
    }
    
    res.json({
      success: true,
      data: priceRecord
    });
  } catch (error: any) {
    console.error(`GET /price-history/${req.params.id} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch price history record',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /price-history:
 *   post:
 *     summary: Создать новую запись в истории цен
 *     tags: [Price History]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fuel_type_id
 *               - trading_point_id
 *               - price
 *               - effective_from
 *             properties:
 *               fuel_type_id:
 *                 type: string
 *                 format: uuid
 *               trading_point_id:
 *                 type: string
 *                 format: uuid
 *               price:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *               price_type:
 *                 type: string
 *                 enum: [retail, wholesale, special]
 *                 default: retail
 *               effective_from:
 *                 type: string
 *                 format: date-time
 *               effective_to:
 *                 type: string
 *                 format: date-time
 *               reason:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Запись создана
 *       400:
 *         description: Ошибка валидации
 */
router.post('/', requireRole(['manager', 'network_admin']), async (req: Request, res: Response) => {
  try {
    const {
      fuel_type_id,
      trading_point_id,
      price,
      price_type = 'retail',
      effective_from,
      effective_to,
      reason,
      metadata
    } = req.body;

    // Валидация
    if (!fuel_type_id || !trading_point_id || price === undefined || !effective_from) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: fuel_type_id, trading_point_id, price, effective_from'
      });
    }

    if (price < 0) {
      return res.status(400).json({
        success: false,
        error: 'Price cannot be negative'
      });
    }

    if (effective_to && new Date(effective_to) <= new Date(effective_from)) {
      return res.status(400).json({
        success: false,
        error: 'effective_to must be after effective_from'
      });
    }

    // Деактивация предыдущих цен для того же топлива в той же точке
    await priceHistoryRepository.deactivatePreviousPrices(
      fuel_type_id,
      trading_point_id,
      effective_from
    );

    const priceData = {
      fuel_type_id,
      trading_point_id,
      network_id: req.user?.networkId,
      price: Number(price),
      price_type,
      effective_from,
      effective_to,
      is_active: true,
      created_by: req.user?.userId,
      reason: reason || 'Price update',
      metadata: metadata || {}
    };

    const priceRecord = await priceHistoryRepository.create(priceData);
    
    res.status(201).json({
      success: true,
      data: priceRecord,
      message: 'Price history record created successfully'
    });
  } catch (error: any) {
    console.error('POST /price-history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create price history record',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /price-history/{id}/deactivate:
 *   patch:
 *     summary: Деактивировать запись истории цен
 *     tags: [Price History]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Запись деактивирована
 *       404:
 *         description: Запись не найдена
 */
router.patch('/:id/deactivate', requireRole(['manager', 'network_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const existingRecord = await priceHistoryRepository.findById(id);
    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        error: 'Price history record not found',
        recordId: id
      });
    }

    const updates = {
      is_active: false,
      effective_to: new Date().toISOString(),
      reason: reason || 'Deactivated manually',
      updated_by: req.user?.userId
    };

    const updatedRecord = await priceHistoryRepository.update(id, updates);
    
    res.json({
      success: true,
      data: updatedRecord,
      message: 'Price history record deactivated successfully'
    });
  } catch (error: any) {
    console.error(`PATCH /price-history/${req.params.id}/deactivate error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate price history record',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /price-history/current:
 *   get:
 *     summary: Получить текущие цены
 *     tags: [Price History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tradingPointId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: networkId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: fuelTypeId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Текущие цены
 */
router.get('/current', requireRole(['operator', 'manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { tradingPointId, networkId, fuelTypeId } = req.query;

    const filters: any = { isActive: true };
    
    if (fuelTypeId) filters.fuelTypeId = fuelTypeId;
    if (tradingPointId) filters.tradingPointId = tradingPointId;
    if (networkId) filters.networkId = networkId;

    // Ограничение доступа
    if (!req.user?.roles.includes('system_admin')) {
      if (req.user?.tradingPoints?.length) {
        filters.tradingPointIds = req.user.tradingPoints;
      } else if (req.user?.networkId) {
        filters.networkId = req.user.networkId;
      }
    }

    const currentPrices = await priceHistoryRepository.getCurrentPrices(filters);
    
    res.json({
      success: true,
      data: currentPrices,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('GET /price-history/current error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch current prices',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /price-history/changes:
 *   get:
 *     summary: Получить изменения цен за период
 *     tags: [Price History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Количество дней для анализа изменений
 *       - in: query
 *         name: tradingPointId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: networkId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Изменения цен
 */
router.get('/changes', requireRole(['manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { days = 7, tradingPointId, networkId } = req.query;

    const filters: any = {};
    
    if (tradingPointId) filters.tradingPointId = tradingPointId;
    if (networkId) filters.networkId = networkId;

    // Ограничение доступа
    if (!req.user?.roles.includes('system_admin')) {
      if (req.user?.tradingPoints?.length) {
        filters.tradingPointIds = req.user.tradingPoints;
      } else if (req.user?.networkId) {
        filters.networkId = req.user.networkId;
      }
    }

    const changes = await priceHistoryRepository.getPriceChanges(Number(days), filters);
    
    res.json({
      success: true,
      data: changes,
      period: `${days} days`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('GET /price-history/changes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch price changes',
      details: error.message
    });
  }
});

export { router as priceHistoryRouter };