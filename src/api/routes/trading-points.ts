/**
 * Trading Points API Routes
 * Управление торговыми точками
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/auth';
import { TradingPointsRepository } from '../database/repositories';

const router = Router();
const tradingPointsRepo = new TradingPointsRepository();

// ===============================================
// VALIDATION SCHEMAS
// ===============================================

const CreateTradingPointSchema = z.object({
  network_id: z.string().min(1, "Network ID is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  schedule: z.object({
    monday: z.string().optional(),
    tuesday: z.string().optional(),
    wednesday: z.string().optional(),
    thursday: z.string().optional(),
    friday: z.string().optional(),
    saturday: z.string().optional(),
    sunday: z.string().optional(),
    is_always_open: z.boolean().default(false)
  }).optional(),
  services: z.record(z.boolean()).optional(),
  external_codes: z.array(z.object({
    system: z.string(),
    code: z.string()
  })).optional(),
  is_blocked: z.boolean().default(false)
});

const UpdateTradingPointSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  schedule: z.object({
    monday: z.string().optional(),
    tuesday: z.string().optional(),
    wednesday: z.string().optional(),
    thursday: z.string().optional(),
    friday: z.string().optional(),
    saturday: z.string().optional(),
    sunday: z.string().optional(),
    is_always_open: z.boolean().optional()
  }).optional(),
  services: z.record(z.boolean()).optional(),
  external_codes: z.array(z.object({
    system: z.string(),
    code: z.string()
  })).optional(),
  is_blocked: z.boolean().optional()
});

const ListTradingPointsSchema = z.object({
  network_id: z.string().optional(),
  search: z.string().optional(),
  is_blocked: z.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50)
});

// ===============================================
// ROUTES
// ===============================================

/**
 * @swagger
 * /trading-points:
 *   get:
 *     summary: Получить список торговых точек
 *     tags: [Trading Points]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: network_id
 *         schema:
 *           type: string
 *         description: Фильтр по сети
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Поиск по названию или адресу
 *       - in: query
 *         name: is_blocked
 *         schema:
 *           type: boolean
 *         description: Фильтр по статусу блокировки
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
 *         description: Список торговых точек
 *       403:
 *         description: Недостаточно прав доступа
 */
router.get('/', requireRole(['operator', 'manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const params = ListTradingPointsSchema.parse(req.query);
    
    // Если пользователь не system_admin, ограничиваем доступ по network_id
    if (req.user?.role !== 'system_admin' && req.user?.network_id) {
      params.network_id = req.user.network_id;
    }
    
    const result = await tradingPointsRepo.list(params);
    
    res.json(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.errors
      });
    }
    
    console.error('Trading points list error:', error);
    res.status(500).json({
      error: 'Failed to fetch trading points',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /trading-points:
 *   post:
 *     summary: Создать новую торговую точку
 *     tags: [Trading Points]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - network_id
 *               - name
 *               - address
 *               - latitude
 *               - longitude
 *             properties:
 *               network_id:
 *                 type: string
 *                 description: ID сети
 *               name:
 *                 type: string
 *                 description: Название торговой точки
 *               description:
 *                 type: string
 *                 description: Описание
 *               address:
 *                 type: string
 *                 description: Адрес
 *               latitude:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *                 description: Широта
 *               longitude:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *                 description: Долгота
 *               phone:
 *                 type: string
 *                 description: Телефон
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email
 *               schedule:
 *                 type: object
 *                 description: Расписание работы
 *               services:
 *                 type: object
 *                 description: Доступные услуги
 *               external_codes:
 *                 type: array
 *                 description: Внешние коды
 *               is_blocked:
 *                 type: boolean
 *                 description: Статус блокировки
 *     responses:
 *       201:
 *         description: Торговая точка создана
 *       400:
 *         description: Некорректные данные
 *       403:
 *         description: Недостаточно прав доступа
 */
router.post('/', requireRole(['manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const data = CreateTradingPointSchema.parse(req.body);
    
    // Проверяем права доступа к сети
    if (req.user?.role !== 'system_admin' && req.user?.network_id !== data.network_id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Cannot create trading point in different network'
      });
    }
    
    const tradingPoint = await tradingPointsRepo.create(data, req.user?.id);
    
    res.status(201).json(tradingPoint);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.errors
      });
    }
    
    console.error('Trading point creation error:', error);
    res.status(500).json({
      error: 'Failed to create trading point',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /trading-points/{id}:
 *   get:
 *     summary: Получить торговую точку по ID
 *     tags: [Trading Points]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID торговой точки
 *     responses:
 *       200:
 *         description: Данные торговой точки
 *       404:
 *         description: Торговая точка не найдена
 *       403:
 *         description: Недостаточно прав доступа
 */
router.get('/:id', requireRole(['operator', 'manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tradingPoint = await tradingPointsRepo.getById(id, req.user?.network_id);
    
    if (!tradingPoint) {
      return res.status(404).json({
        error: 'Trading point not found'
      });
    }
    
    res.json(tradingPoint);
  } catch (error: any) {
    console.error('Trading point get error:', error);
    res.status(500).json({
      error: 'Failed to fetch trading point',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /trading-points/{id}:
 *   patch:
 *     summary: Обновить торговую точку
 *     tags: [Trading Points]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID торговой точки
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               address:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               schedule:
 *                 type: object
 *               services:
 *                 type: object
 *               external_codes:
 *                 type: array
 *               is_blocked:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Торговая точка обновлена
 *       400:
 *         description: Некорректные данные
 *       404:
 *         description: Торговая точка не найдена
 *       403:
 *         description: Недостаточно прав доступа
 */
router.patch('/:id', requireRole(['manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = UpdateTradingPointSchema.parse(req.body);
    
    const tradingPoint = await tradingPointsRepo.update(id, data, req.user?.network_id, req.user?.id);
    
    if (!tradingPoint) {
      return res.status(404).json({
        error: 'Trading point not found'
      });
    }
    
    res.json(tradingPoint);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.errors
      });
    }
    
    console.error('Trading point update error:', error);
    res.status(500).json({
      error: 'Failed to update trading point',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /trading-points/{id}:
 *   delete:
 *     summary: Удалить торговую точку
 *     tags: [Trading Points]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID торговой точки
 *     responses:
 *       200:
 *         description: Торговая точка удалена
 *       404:
 *         description: Торговая точка не найдена
 *       403:
 *         description: Недостаточно прав доступа
 *       409:
 *         description: Нельзя удалить торговую точку с оборудованием
 */
router.delete('/:id', requireRole(['network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const success = await tradingPointsRepo.delete(id, req.user?.network_id, req.user?.id);
    
    if (!success) {
      return res.status(404).json({
        error: 'Trading point not found'
      });
    }
    
    res.json({ message: 'Trading point deleted successfully' });
  } catch (error: any) {
    if (error.message.includes('equipment exists')) {
      return res.status(409).json({
        error: 'Cannot delete trading point with existing equipment',
        message: 'Remove all equipment first'
      });
    }
    
    console.error('Trading point delete error:', error);
    res.status(500).json({
      error: 'Failed to delete trading point',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /trading-points/{id}/toggle-block:
 *   post:
 *     summary: Заблокировать/разблокировать торговую точку
 *     tags: [Trading Points]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID торговой точки
 *     responses:
 *       200:
 *         description: Статус блокировки изменен
 *       404:
 *         description: Торговая точка не найдена
 *       403:
 *         description: Недостаточно прав доступа
 */
router.post('/:id/toggle-block', requireRole(['manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const tradingPoint = await tradingPointsRepo.toggleBlock(id, req.user?.network_id, req.user?.id);
    
    if (!tradingPoint) {
      return res.status(404).json({
        error: 'Trading point not found'
      });
    }
    
    res.json({
      message: tradingPoint.is_blocked ? 'Trading point blocked' : 'Trading point unblocked',
      is_blocked: tradingPoint.is_blocked
    });
  } catch (error: any) {
    console.error('Trading point toggle block error:', error);
    res.status(500).json({
      error: 'Failed to toggle trading point block status',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /trading-points/{id}/equipment:
 *   get:
 *     summary: Получить оборудование торговой точки
 *     tags: [Trading Points]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID торговой точки
 *     responses:
 *       200:
 *         description: Список оборудования
 *       404:
 *         description: Торговая точка не найдена
 *       403:
 *         description: Недостаточно прав доступа
 */
router.get('/:id/equipment', requireRole(['operator', 'manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const equipment = await tradingPointsRepo.getEquipment(id, req.user?.network_id);
    
    res.json(equipment);
  } catch (error: any) {
    console.error('Trading point equipment error:', error);
    res.status(500).json({
      error: 'Failed to fetch trading point equipment',
      message: error.message
    });
  }
});

export { router as tradingPointsRouter };