/**
 * Networks API Routes
 * Для АГЕНТА 3: API Endpoints
 */

import { Router, Request, Response } from 'express';
import { networksRepository } from '../database/repositories';
import { requireRole } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Network:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 255
 *         code:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *         description:
 *           type: string
 *           maxLength: 1000
 *         status:
 *           type: string
 *           enum: [active, inactive, maintenance]
 *         settings:
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
 * /networks:
 *   get:
 *     summary: Получить список всех сетей
 *     tags: [Networks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, maintenance]
 *         description: Фильтр по статусу
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *           enum: [name, code, created_at]
 *           default: created_at
 *         description: Поле для сортировки
 *       - in: query
 *         name: ascending
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Порядок сортировки
 *     responses:
 *       200:
 *         description: Список сетей
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Network'
 *                 total:
 *                   type: integer
 *       500:
 *         description: Ошибка сервера
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, orderBy, ascending } = req.query;
    
    const options: any = {};
    if (status && ['active', 'inactive', 'maintenance'].includes(status as string)) {
      options.status = status as string;
    }
    if (orderBy && ['name', 'code', 'created_at'].includes(orderBy as string)) {
      options.orderBy = orderBy as string;
    }
    if (ascending !== undefined) {
      options.ascending = ascending === 'true';
    }
    
    const networks = await networksRepository.findAll(options);
    
    res.json({
      success: true,
      data: networks,
      total: networks.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('GET /networks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch networks',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /networks/{id}:
 *   get:
 *     summary: Получить сеть по ID
 *     tags: [Networks]
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
 *         description: Данные сети
 *       404:
 *         description: Сеть не найдена
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const network = await networksRepository.findById(id);
    
    if (!network) {
      return res.status(404).json({
        success: false,
        error: 'Network not found',
        networkId: id
      });
    }
    
    res.json({
      success: true,
      data: network
    });
  } catch (error: any) {
    console.error(`GET /networks/${req.params.id} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch network',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /networks:
 *   post:
 *     summary: Создать новую сеть
 *     tags: [Networks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance]
 *               settings:
 *                 type: object
 *     responses:
 *       201:
 *         description: Сеть создана
 *       400:
 *         description: Ошибка валидации
 *       409:
 *         description: Сеть с таким кодом уже существует
 */
router.post('/', requireRole(['system_admin', 'network_admin']), async (req: Request, res: Response) => {
  try {
    const { name, code, description, status, settings } = req.body;
    
    // Базовая валидация
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Name is required and must be at least 2 characters',
        field: 'name'
      });
    }
    
    if (!code || code.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Code is required and must be at least 2 characters',
        field: 'code'
      });
    }
    
    // Проверяем уникальность кода
    const existingNetwork = await networksRepository.findByCode(code);
    if (existingNetwork) {
      return res.status(409).json({
        success: false,
        error: 'Network with this code already exists',
        field: 'code',
        existingId: existingNetwork.id
      });
    }
    
    const networkData = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description?.trim() || '',
      status: status || 'active',
      settings: settings || {}
    };
    
    const network = await networksRepository.create(networkData);
    
    res.status(201).json({
      success: true,
      data: network,
      message: 'Network created successfully'
    });
  } catch (error: any) {
    console.error('POST /networks error:', error);
    
    // Handle database constraint violations
    if (error.message.includes('DUPLICATE_RECORD')) {
      return res.status(409).json({
        success: false,
        error: 'Network with this code already exists',
        field: 'code'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create network',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /networks/{id}:
 *   put:
 *     summary: Обновить сеть
 *     tags: [Networks]
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
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance]
 *               settings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Сеть обновлена
 *       400:
 *         description: Ошибка валидации
 *       404:
 *         description: Сеть не найдена
 */
router.put('/:id', requireRole(['system_admin', 'network_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, status, settings } = req.body;
    
    // Проверяем существование сети
    const existingNetwork = await networksRepository.findById(id);
    if (!existingNetwork) {
      return res.status(404).json({
        success: false,
        error: 'Network not found',
        networkId: id
      });
    }
    
    const updates: any = {};
    
    if (name !== undefined) {
      if (!name || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Name must be at least 2 characters',
          field: 'name'
        });
      }
      updates.name = name.trim();
    }
    
    if (description !== undefined) {
      updates.description = description?.trim() || '';
    }
    
    if (status !== undefined) {
      if (!['active', 'inactive', 'maintenance'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status value',
          field: 'status',
          validValues: ['active', 'inactive', 'maintenance']
        });
      }
      updates.status = status;
    }
    
    if (settings !== undefined) {
      updates.settings = settings;
    }
    
    const updatedNetwork = await networksRepository.update(id, updates);
    
    res.json({
      success: true,
      data: updatedNetwork,
      message: 'Network updated successfully'
    });
  } catch (error: any) {
    console.error(`PUT /networks/${req.params.id} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update network',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /networks/{id}:
 *   delete:
 *     summary: Удалить сеть
 *     tags: [Networks]
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
 *         description: Сеть удалена
 *       404:
 *         description: Сеть не найдена
 *       409:
 *         description: Нельзя удалить сеть с привязанными торговыми точками
 */
router.delete('/:id', requireRole(['system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Проверяем существование сети
    const existingNetwork = await networksRepository.findById(id);
    if (!existingNetwork) {
      return res.status(404).json({
        success: false,
        error: 'Network not found',
        networkId: id
      });
    }
    
    // TODO: Проверить наличие связанных торговых точек
    // const linkedTradingPoints = await tradingPointsRepository.findByNetworkId(id);
    // if (linkedTradingPoints.length > 0) {
    //   return res.status(409).json({
    //     success: false,
    //     error: 'Cannot delete network with existing trading points',
    //     linkedRecords: linkedTradingPoints.length
    //   });
    // }
    
    await networksRepository.delete(id);
    
    res.json({
      success: true,
      message: 'Network deleted successfully',
      deletedId: id
    });
  } catch (error: any) {
    console.error(`DELETE /networks/${req.params.id} error:`, error);
    
    if (error.message.includes('FOREIGN_KEY_VIOLATION')) {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete network with existing references',
        details: 'Remove all related trading points first'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete network',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /networks/stats:
 *   get:
 *     summary: Получить статистику по сетям
 *     tags: [Networks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Статистика по сетям
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     active:
 *                       type: integer
 *                     inactive:
 *                       type: integer
 *                     maintenance:
 *                       type: integer
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await networksRepository.getStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('GET /networks/stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch network statistics',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /networks/code/{code}:
 *   get:
 *     summary: Найти сеть по коду
 *     tags: [Networks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Данные сети
 *       404:
 *         description: Сеть не найдена
 */
router.get('/code/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    
    const network = await networksRepository.findByCode(code.toUpperCase());
    
    if (!network) {
      return res.status(404).json({
        success: false,
        error: 'Network not found',
        code: code
      });
    }
    
    res.json({
      success: true,
      data: network
    });
  } catch (error: any) {
    console.error(`GET /networks/code/${req.params.code} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch network by code',
      details: error.message
    });
  }
});

export { router as networksRouter };