/**
 * Command Templates API Routes
 * Для работы с шаблонами команд
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/auth';

const router = Router();

// ===============================================
// VALIDATION SCHEMAS
// ===============================================

const CreateCommandTemplateSchema = z.object({
  name: z.string().min(2).max(255),
  display_name: z.string().min(2).max(255),
  description: z.string().max(1000).optional(),
  category: z.enum(['shift_operations', 'pricing', 'reporting', 'maintenance', 'backup', 'system', 'fuel_operations', 'equipment_control', 'pos_operations', 'security', 'custom']),
  status: z.enum(['active', 'inactive', 'deprecated']).default('active'),
  is_system: z.boolean().default(false),
  version: z.string().max(20).default('1.0.0'),
  param_schema: z.object({}).passthrough(),
  default_params: z.object({}).passthrough().optional(),
  required_params: z.array(z.string()).optional(),
  allowed_targets: z.array(z.enum(['all_networks', 'specific_network', 'all_trading_points', 'specific_trading_point', 'equipment_type', 'specific_equipment', 'component_type', 'specific_component'])),
  timeout_ms: z.number().min(1000).max(300000).default(30000),
  retry_policy: z.object({
    max_attempts: z.number().min(1).max(10),
    backoff: z.enum(['linear', 'exponential']),
    initial_delay_ms: z.number().min(100).max(10000),
    max_delay_ms: z.number().min(1000).max(60000)
  }).optional()
});

const UpdateCommandTemplateSchema = CreateCommandTemplateSchema.partial();

const ListCommandTemplatesSchema = z.object({
  category: z.enum(['shift_operations', 'pricing', 'reporting', 'maintenance', 'backup', 'system', 'fuel_operations', 'equipment_control', 'pos_operations', 'security', 'custom']).optional(),
  status: z.enum(['active', 'inactive', 'deprecated']).optional(),
  search: z.string().optional(),
  is_system: z.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50)
});

// ===============================================
// ROUTES
// ===============================================

/**
 * @swagger
 * /command-templates:
 *   get:
 *     summary: Получить список шаблонов команд
 *     tags: [Command Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [shift_operations, pricing, reporting, maintenance, backup, system, fuel_operations, equipment_control, pos_operations, security, custom]
 *         description: Фильтр по категории
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, deprecated]
 *         description: Фильтр по статусу
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Поиск по названию и описанию
 *       - in: query
 *         name: is_system
 *         schema:
 *           type: boolean
 *         description: Фильтр системных/пользовательских шаблонов
 *     responses:
 *       200:
 *         description: Список шаблонов команд
 */
router.get('/', async (req: Request, res: Response) => { // Temporarily disabled auth for testing
  try {
    const params = ListCommandTemplatesSchema.parse(req.query);
    
    // TODO: Заменить на реальный репозиторий
    // ❌ MOCK ШАБЛОНЫ КОМАНД ЗАБЛОКИРОВАНЫ ИЗ СООБРАЖЕНИЙ БЕЗОПАСНОСТИ
    const mockTemplates: any[] = [];
    
    res.json({
      success: true,
      data: mockTemplates,
      total: mockTemplates.length,
      page: params.page,
      limit: params.limit,
      has_more: false
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.errors
      });
    }
    
    console.error('GET /command-templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch command templates',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /command-templates/{id}:
 *   get:
 *     summary: Получить шаблон команды по ID
 *     tags: [Command Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:id', async (req: Request, res: Response) => { // Temporarily disabled auth for testing
  try {
    const { id } = req.params;
    
    // TODO: Заменить на реальный репозиторий
    const mockTemplate = {
      id,
      name: 'shift_open',
      display_name: 'Открыть смену',
      description: 'Открывает новую смену на указанных торговых точках или оборудовании',
      category: 'shift_operations',
      status: 'active',
      is_system: true,
      version: '1.0.0',
      param_schema: {
        type: 'object',
        properties: {
          shift_type: {
            type: 'string',
            title: 'Тип смены',
            enum: ['day', 'night', 'extended'],
            default: 'day'
          }
        },
        required: ['shift_type']
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: mockTemplate
    });
  } catch (error: any) {
    console.error(`GET /command-templates/${req.params.id} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch command template',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /command-templates:
 *   post:
 *     summary: Создать новый шаблон команды
 *     tags: [Command Templates]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', async (req: Request, res: Response) => { // Temporarily disabled auth for testing
  try {
    const templateData = CreateCommandTemplateSchema.parse(req.body);
    
    // TODO: Заменить на реальный репозиторий
    const newTemplate = {
      id: `cmd_${Date.now()}`,
      ...templateData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    res.status(201).json({
      success: true,
      data: newTemplate,
      message: 'Command template created successfully'
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.errors
      });
    }
    
    console.error('POST /command-templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create command template',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /command-templates/{id}:
 *   put:
 *     summary: Обновить шаблон команды
 *     tags: [Command Templates]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', async (req: Request, res: Response) => { // Temporarily disabled auth for testing
  try {
    const { id } = req.params;
    const updates = UpdateCommandTemplateSchema.parse(req.body);
    
    // TODO: Заменить на реальный репозиторий
    const updatedTemplate = {
      id,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: updatedTemplate,
      message: 'Command template updated successfully'
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.errors
      });
    }
    
    console.error(`PUT /command-templates/${req.params.id} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update command template',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /command-templates/{id}:
 *   delete:
 *     summary: Удалить шаблон команды
 *     tags: [Command Templates]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', async (req: Request, res: Response) => { // Temporarily disabled auth for testing
  try {
    const { id } = req.params;
    
    // TODO: Заменить на реальный репозиторий
    
    res.json({
      success: true,
      message: 'Command template deleted successfully',
      deletedId: id
    });
  } catch (error: any) {
    console.error(`DELETE /command-templates/${req.params.id} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete command template',
      details: error.message
    });
  }
});

export { router as commandTemplatesRouter };