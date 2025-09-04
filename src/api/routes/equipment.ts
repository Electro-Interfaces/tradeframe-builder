/**
 * Equipment API Routes
 * Управление оборудованием торговых точек
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/auth';
import { EquipmentRepository } from '../database/repositories';

const router = Router();
const equipmentRepo = new EquipmentRepository();

// ===============================================
// VALIDATION SCHEMAS
// ===============================================

const CreateEquipmentSchema = z.object({
  trading_point_id: z.string().min(1, "Trading point ID is required"),
  template_id: z.string().min(1, "Template ID is required"),
  display_name: z.string().min(1, "Display name is required"),
  serial_number: z.string().optional(),
  external_id: z.string().optional(),
  installation_date: z.string().datetime(),
  custom_params: z.record(z.any()).optional(),
  bindings: z.record(z.any()).optional()
});

const UpdateEquipmentSchema = z.object({
  display_name: z.string().optional(),
  serial_number: z.string().optional(),
  external_id: z.string().optional(),
  installation_date: z.string().datetime().optional(),
  params: z.record(z.any()).optional(),
  bindings: z.record(z.any()).optional()
});

const ListEquipmentSchema = z.object({
  trading_point_id: z.string().min(1),
  search: z.string().optional(),
  template_id: z.string().optional(),
  system_type: z.string().optional(),
  status: z.enum(['online', 'offline', 'error', 'disabled', 'archived', 'maintenance']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50)
});

const StatusActionSchema = z.enum(['enable', 'disable', 'archive']);

// ===============================================
// ROUTES
// ===============================================

/**
 * @swagger
 * /equipment:
 *   get:
 *     summary: Получить список оборудования
 *     tags: [Equipment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: trading_point_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID торговой точки
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Поиск по названию или серийному номеру
 *       - in: query
 *         name: template_id
 *         schema:
 *           type: string
 *         description: Фильтр по шаблону оборудования
 *       - in: query
 *         name: system_type
 *         schema:
 *           type: string
 *         description: Фильтр по системному типу
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [online, offline, error, disabled, archived, maintenance]
 *         description: Фильтр по статусу
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
 *         description: Список оборудования
 *       400:
 *         description: Некорректные параметры запроса
 *       403:
 *         description: Недостаточно прав доступа
 */
router.get('/', requireRole(['operator', 'manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const params = ListEquipmentSchema.parse(req.query);
    const result = await equipmentRepo.list(params, req.user?.network_id);
    
    res.json(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.errors
      });
    }
    
    console.error('Equipment list error:', error);
    res.status(500).json({
      error: 'Failed to fetch equipment',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /equipment:
 *   post:
 *     summary: Создать новое оборудование
 *     tags: [Equipment]
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
 *               - template_id
 *               - display_name
 *               - installation_date
 *             properties:
 *               trading_point_id:
 *                 type: string
 *                 description: ID торговой точки
 *               template_id:
 *                 type: string
 *                 description: ID шаблона оборудования
 *               display_name:
 *                 type: string
 *                 description: Отображаемое название
 *               serial_number:
 *                 type: string
 *                 description: Серийный номер
 *               external_id:
 *                 type: string
 *                 description: Внешний идентификатор
 *               installation_date:
 *                 type: string
 *                 format: date-time
 *                 description: Дата установки
 *               custom_params:
 *                 type: object
 *                 description: Пользовательские параметры
 *               bindings:
 *                 type: object
 *                 description: Привязки к другим системам
 *     responses:
 *       201:
 *         description: Оборудование создано
 *       400:
 *         description: Некорректные данные
 *       403:
 *         description: Недостаточно прав доступа
 */
router.post('/', requireRole(['manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const data = CreateEquipmentSchema.parse(req.body);
    
    // Проверяем права доступа к торговой точке
    const hasAccess = await equipmentRepo.checkTradingPointAccess(data.trading_point_id, req.user?.network_id);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'No access to this trading point'
      });
    }
    
    const equipment = await equipmentRepo.create(data, req.user?.id);
    
    res.status(201).json(equipment);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.errors
      });
    }
    
    console.error('Equipment creation error:', error);
    res.status(500).json({
      error: 'Failed to create equipment',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /equipment/{id}:
 *   get:
 *     summary: Получить оборудование по ID
 *     tags: [Equipment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID оборудования
 *     responses:
 *       200:
 *         description: Данные оборудования
 *       404:
 *         description: Оборудование не найдено
 *       403:
 *         description: Недостаточно прав доступа
 */
router.get('/:id', requireRole(['operator', 'manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const equipment = await equipmentRepo.getById(id, req.user?.network_id);
    
    if (!equipment) {
      return res.status(404).json({
        error: 'Equipment not found'
      });
    }
    
    res.json(equipment);
  } catch (error: any) {
    console.error('Equipment get error:', error);
    res.status(500).json({
      error: 'Failed to fetch equipment',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /equipment/{id}:
 *   patch:
 *     summary: Обновить оборудование
 *     tags: [Equipment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID оборудования
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               display_name:
 *                 type: string
 *               serial_number:
 *                 type: string
 *               external_id:
 *                 type: string
 *               installation_date:
 *                 type: string
 *                 format: date-time
 *               params:
 *                 type: object
 *               bindings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Оборудование обновлено
 *       400:
 *         description: Некорректные данные
 *       404:
 *         description: Оборудование не найдено
 *       403:
 *         description: Недостаточно прав доступа
 */
router.patch('/:id', requireRole(['manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = UpdateEquipmentSchema.parse(req.body);
    
    const equipment = await equipmentRepo.update(id, data, req.user?.network_id, req.user?.id);
    
    if (!equipment) {
      return res.status(404).json({
        error: 'Equipment not found'
      });
    }
    
    res.json(equipment);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.errors
      });
    }
    
    console.error('Equipment update error:', error);
    res.status(500).json({
      error: 'Failed to update equipment',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /equipment/{id}:enable:
 *   post:
 *     summary: Включить оборудование
 *     tags: [Equipment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID оборудования
 *     responses:
 *       200:
 *         description: Оборудование включено
 *       404:
 *         description: Оборудование не найдено
 *       403:
 *         description: Недостаточно прав доступа
 */
router.post('/:id/enable', requireRole(['operator', 'manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await equipmentRepo.setStatus(id, 'enable', req.user?.network_id, req.user?.id);
    
    if (!success) {
      return res.status(404).json({
        error: 'Equipment not found'
      });
    }
    
    res.json({ message: 'Equipment enabled successfully' });
  } catch (error: any) {
    console.error('Equipment enable error:', error);
    res.status(500).json({
      error: 'Failed to enable equipment',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /equipment/{id}:disable:
 *   post:
 *     summary: Отключить оборудование
 *     tags: [Equipment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID оборудования
 *     responses:
 *       200:
 *         description: Оборудование отключено
 *       404:
 *         description: Оборудование не найдено
 *       403:
 *         description: Недостаточно прав доступа
 */
router.post('/:id/disable', requireRole(['operator', 'manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await equipmentRepo.setStatus(id, 'disable', req.user?.network_id, req.user?.id);
    
    if (!success) {
      return res.status(404).json({
        error: 'Equipment not found'
      });
    }
    
    res.json({ message: 'Equipment disabled successfully' });
  } catch (error: any) {
    console.error('Equipment disable error:', error);
    res.status(500).json({
      error: 'Failed to disable equipment',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /equipment/{id}:archive:
 *   post:
 *     summary: Архивировать оборудование
 *     tags: [Equipment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID оборудования
 *     responses:
 *       200:
 *         description: Оборудование архивировано
 *       404:
 *         description: Оборудование не найдено
 *       403:
 *         description: Недостаточно прав доступа
 */
router.post('/:id/archive', requireRole(['manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await equipmentRepo.setStatus(id, 'archive', req.user?.network_id, req.user?.id);
    
    if (!success) {
      return res.status(404).json({
        error: 'Equipment not found'
      });
    }
    
    res.json({ message: 'Equipment archived successfully' });
  } catch (error: any) {
    console.error('Equipment archive error:', error);
    res.status(500).json({
      error: 'Failed to archive equipment',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /equipment/{id}:
 *   delete:
 *     summary: Удалить оборудование
 *     tags: [Equipment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID оборудования
 *     responses:
 *       200:
 *         description: Оборудование удалено
 *       404:
 *         description: Оборудование не найдено
 *       403:
 *         description: Недостаточно прав доступа
 */
router.delete('/:id', requireRole(['system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await equipmentRepo.delete(id, req.user?.network_id, req.user?.id);
    
    if (!success) {
      return res.status(404).json({
        error: 'Equipment not found'
      });
    }
    
    res.json({ message: 'Equipment deleted successfully' });
  } catch (error: any) {
    console.error('Equipment delete error:', error);
    res.status(500).json({
      error: 'Failed to delete equipment',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /equipment/{id}/events:
 *   get:
 *     summary: Получить события оборудования
 *     tags: [Equipment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID оборудования
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
 *         description: События оборудования
 *       404:
 *         description: Оборудование не найдено
 *       403:
 *         description: Недостаточно прав доступа
 */
router.get('/:id/events', requireRole(['operator', 'manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    
    const events = await equipmentRepo.getEvents(id, req.user?.network_id, { page, limit });
    
    res.json(events);
  } catch (error: any) {
    console.error('Equipment events error:', error);
    res.status(500).json({
      error: 'Failed to fetch equipment events',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /equipment/{id}/components:
 *   get:
 *     summary: Получить компоненты оборудования
 *     tags: [Equipment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID оборудования
 *     responses:
 *       200:
 *         description: Компоненты оборудования
 *       404:
 *         description: Оборудование не найдено
 *       403:
 *         description: Недостаточно прав доступа
 */
router.get('/:id/components', requireRole(['operator', 'manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const components = await equipmentRepo.getComponents(id, req.user?.network_id);
    
    res.json(components);
  } catch (error: any) {
    console.error('Equipment components error:', error);
    res.status(500).json({
      error: 'Failed to fetch equipment components',
      message: error.message
    });
  }
});

export { router as equipmentRouter };