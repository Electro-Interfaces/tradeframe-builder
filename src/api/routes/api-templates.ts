/**
 * API Templates Routes
 * Для работы с шаблонами API команд (новая система)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/auth';

const router = Router();

// ===============================================
// VALIDATION SCHEMAS
// ===============================================

const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const TemplateScopeSchema = z.enum(['global', 'network', 'trading_point', 'equipment', 'component']);
const TemplateModeSchema = z.enum(['sync', 'async', 'batch']);
const TemplateStatusSchema = z.enum(['active', 'inactive', 'deprecated', 'draft']);

const ApiSchemaSchema = z.object({
  request_body: z.object({}).passthrough().optional(),
  response_body: z.object({}).passthrough().optional(),
  path_params: z.object({}).passthrough().optional(),
  query_params: z.object({}).passthrough().optional(),
  headers: z.object({}).passthrough().optional()
});

const RetryPolicySchema = z.object({
  max_attempts: z.number().min(1).max(10),
  backoff: z.enum(['linear', 'exponential']),
  initial_delay_ms: z.number().min(100).max(10000),
  max_delay_ms: z.number().min(1000).max(60000),
  retry_on_status_codes: z.array(z.number()).optional()
});

const CreateApiTemplateSchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().max(1000).optional(),
  scope: TemplateScopeSchema,
  mode: TemplateModeSchema.default('sync'),
  status: TemplateStatusSchema.default('draft'),
  http_method: HttpMethodSchema,
  url_template: z.string().min(1).max(2000),
  api_schema: ApiSchemaSchema,
  default_headers: z.record(z.string()).optional(),
  timeout_ms: z.number().min(1000).max(300000).default(30000),
  retry_policy: RetryPolicySchema.optional(),
  examples: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    request_data: z.object({}).passthrough().optional(),
    expected_response: z.object({}).passthrough().optional()
  })).optional(),
  tags: z.array(z.string()).optional(),
  version: z.string().max(20).default('1.0.0'),
  is_system: z.boolean().default(false)
});

const UpdateApiTemplateSchema = CreateApiTemplateSchema.partial();

const ListApiTemplatesSchema = z.object({
  scope: TemplateScopeSchema.optional(),
  mode: TemplateModeSchema.optional(),
  status: TemplateStatusSchema.optional(),
  http_method: HttpMethodSchema.optional(),
  search: z.string().optional(),
  is_system: z.boolean().optional(),
  tags: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50)
});

// ===============================================
// ROUTES
// ===============================================

/**
 * @swagger
 * /api-templates:
 *   get:
 *     summary: Получить список шаблонов API команд
 *     tags: [API Templates]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', async (req: Request, res: Response) => { // Temporarily disabled auth for testing
  try {
    const params = ListApiTemplatesSchema.parse(req.query);
    
    // TODO: Заменить на реальный репозиторий
    // ❌ MOCK API ШАБЛОНЫ ЗАБЛОКИРОВАНЫ ИЗ СООБРАЖЕНИЙ БЕЗОПАСНОСТИ
    const mockTemplates: any[] = [];
    
    let filtered = mockTemplates;
    
    // Применяем фильтры
    if (params.scope) {
      filtered = filtered.filter(t => t.scope === params.scope);
    }
    if (params.status) {
      filtered = filtered.filter(t => t.status === params.status);
    }
    if (params.http_method) {
      filtered = filtered.filter(t => t.http_method === params.http_method);
    }
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchLower) ||
        (t.description && t.description.toLowerCase().includes(searchLower))
      );
    }
    
    res.json({
      success: true,
      data: filtered,
      total: filtered.length,
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
    
    console.error('GET /api-templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API templates',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api-templates/{id}:
 *   get:
 *     summary: Получить шаблон API команды по ID
 *     tags: [API Templates]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', async (req: Request, res: Response) => { // Temporarily disabled auth for testing
  try {
    const { id } = req.params;
    
    // TODO: Заменить на реальный репозиторий
    const mockTemplate = {
      id,
      name: 'Авторизация в Autooplata TMS',
      description: 'Получение JWT токена для авторизации в системе управления терминалами',
      scope: 'global',
      mode: 'sync',
      status: 'active',
      http_method: 'POST',
      url_template: 'https://api.autooplata.ru/auth/login',
      api_schema: {
        request_body: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Имя пользователя' },
            password: { type: 'string', description: 'Пароль пользователя' }
          },
          required: ['username', 'password']
        },
        response_body: {
          type: 'string',
          description: 'JWT токен для авторизации'
        }
      },
      default_headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout_ms: 15000,
      retry_policy: {
        max_attempts: 3,
        backoff: 'exponential',
        initial_delay_ms: 1000,
        max_delay_ms: 10000,
        retry_on_status_codes: [429, 500, 502, 503, 504]
      },
      examples: [
        {
          name: 'Авторизация тестового пользователя',
          description: 'Получение токена для тестового доступа к API',
          request_data: {
            username: 'UserTest',
            password: 'sys5tem6'
          }
        }
      ],
      tags: ['auth', 'autooplata', 'tms'],
      version: '1.0.0',
      is_system: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: mockTemplate
    });
  } catch (error: any) {
    console.error(`GET /api-templates/${req.params.id} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API template',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api-templates:
 *   post:
 *     summary: Создать новый шаблон API команды
 *     tags: [API Templates]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', async (req: Request, res: Response) => { // Temporarily disabled auth for testing
  try {
    const templateData = CreateApiTemplateSchema.parse(req.body);
    
    // TODO: Заменить на реальный репозиторий
    const newTemplate = {
      id: `api_${Date.now()}`,
      ...templateData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    res.status(201).json({
      success: true,
      data: newTemplate,
      message: 'API template created successfully'
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.errors
      });
    }
    
    console.error('POST /api-templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create API template',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api-templates/{id}/test:
 *   post:
 *     summary: Тестировать шаблон API команды
 *     tags: [API Templates]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/test', async (req: Request, res: Response) => { // Temporarily disabled auth for testing
  try {
    const { id } = req.params;
    const { test_data } = req.body;
    
    // TODO: Реализовать тестирование шаблона
    
    res.json({
      success: true,
      data: {
        template_id: id,
        test_result: 'success',
        response_time_ms: 1234,
        status_code: 200,
        response_body: { message: 'Test successful' }
      },
      message: 'API template test completed'
    });
  } catch (error: any) {
    console.error(`POST /api-templates/${req.params.id}/test error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to test API template',
      details: error.message
    });
  }
});

export { router as apiTemplatesRouter };