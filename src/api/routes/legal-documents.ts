/**
 * Legal Documents API Routes
 * Управление правовыми документами и согласиями пользователей
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, requireRole } from '../middleware/auth';
import { LegalDocumentsRepository } from '../database/repositories';

const router = Router();
const legalDocsRepo = new LegalDocumentsRepository();

// ===============================================
// VALIDATION SCHEMAS
// ===============================================

const DocumentTypeSchema = z.enum(['tos', 'privacy', 'pdn']);

const CreateDocumentVersionSchema = z.object({
  doc_type_code: DocumentTypeSchema,
  version: z.string().min(1).max(20),
  changelog: z.string().min(1),
  content_md: z.string().min(1),
  locale: z.string().default('ru')
});

const UpdateDocumentVersionSchema = z.object({
  version: z.string().min(1).max(20).optional(),
  changelog: z.string().optional(),
  content_md: z.string().optional(),
  locale: z.string().optional()
});

const AcceptDocumentSchema = z.object({
  version_id: z.string().uuid(),
  source: z.enum(['web', 'mobile', 'api']).default('web')
});

const AcceptanceJournalFiltersSchema = z.object({
  doc_type: DocumentTypeSchema.optional(),
  version_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  user_email: z.string().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  source: z.enum(['web', 'mobile', 'api']).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

// ===============================================
// DOCUMENT TYPES ROUTES
// ===============================================

/**
 * @swagger
 * /api/v1/legal-documents/types:
 *   get:
 *     summary: Получить типы документов
 *     tags: [Legal Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список типов документов
 */
router.get('/types', authenticateToken, async (req: Request, res: Response) => {
  try {
    const documentTypes = await legalDocsRepo.getDocumentTypes();
    
    res.json({
      success: true,
      data: documentTypes
    });
    
  } catch (error) {
    console.error('Get document types error:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// ===============================================
// DOCUMENT VERSIONS ROUTES
// ===============================================

/**
 * @swagger
 * /api/v1/legal-documents/versions:
 *   get:
 *     summary: Получить версии документов
 *     tags: [Legal Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: docTypeCode
 *         schema:
 *           type: string
 *           enum: [tos, privacy, pdn]
 *         description: Тип документа
 *     responses:
 *       200:
 *         description: Список версий документов
 */
router.get('/versions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const docTypeCode = req.query.docTypeCode as string;
    const parsedDocType = docTypeCode ? DocumentTypeSchema.parse(docTypeCode) : undefined;
    
    const versions = await legalDocsRepo.getDocumentVersions(parsedDocType);
    
    res.json({
      success: true,
      data: versions
    });
    
  } catch (error) {
    console.error('Get document versions error:', error);
    
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
 * /api/v1/legal-documents/versions/{id}:
 *   get:
 *     summary: Получить версию документа по ID
 *     tags: [Legal Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID версии документа
 *     responses:
 *       200:
 *         description: Версия документа
 *       404:
 *         description: Версия не найдена
 */
router.get('/versions/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const version = await legalDocsRepo.getDocumentVersion(req.params.id);
    
    if (!version) {
      return res.status(404).json({
        success: false,
        error: 'Версия документа не найдена'
      });
    }
    
    res.json({
      success: true,
      data: version
    });
    
  } catch (error) {
    console.error(`Get document version ${req.params.id} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * @swagger
 * /api/v1/legal-documents/versions/current/{docTypeCode}:
 *   get:
 *     summary: Получить текущую версию документа
 *     tags: [Legal Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: docTypeCode
 *         required: true
 *         schema:
 *           type: string
 *           enum: [tos, privacy, pdn]
 *         description: Тип документа
 *     responses:
 *       200:
 *         description: Текущая версия документа
 *       404:
 *         description: Текущая версия не найдена
 */
router.get('/versions/current/:docTypeCode', authenticateToken, async (req: Request, res: Response) => {
  try {
    const docTypeCode = DocumentTypeSchema.parse(req.params.docTypeCode);
    const version = await legalDocsRepo.getCurrentDocumentVersion(docTypeCode);
    
    if (!version) {
      return res.status(404).json({
        success: false,
        error: 'Текущая версия документа не найдена'
      });
    }
    
    res.json({
      success: true,
      data: version
    });
    
  } catch (error) {
    console.error(`Get current document version ${req.params.docTypeCode} error:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Неверный тип документа',
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
 * /api/v1/legal-documents/versions:
 *   post:
 *     summary: Создать черновик версии документа
 *     tags: [Legal Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - doc_type_code
 *               - version
 *               - changelog
 *               - content_md
 *             properties:
 *               doc_type_code:
 *                 type: string
 *                 enum: [tos, privacy, pdn]
 *               version:
 *                 type: string
 *                 maxLength: 20
 *               changelog:
 *                 type: string
 *               content_md:
 *                 type: string
 *               locale:
 *                 type: string
 *                 default: ru
 *     responses:
 *       201:
 *         description: Черновик создан
 */
router.post('/versions', authenticateToken, requireRole(['system_admin']), async (req: Request, res: Response) => {
  try {
    const data = CreateDocumentVersionSchema.parse(req.body);
    
    const version = await legalDocsRepo.createDocumentDraft(data);
    
    res.status(201).json({
      success: true,
      data: version
    });
    
  } catch (error) {
    console.error('Create document version error:', error);
    
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
 * /api/v1/legal-documents/versions/{id}:
 *   put:
 *     summary: Обновить черновик версии документа
 *     tags: [Legal Documents]
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
 *         description: Черновик обновлен
 *       404:
 *         description: Версия не найдена
 */
router.put('/versions/:id', authenticateToken, requireRole(['system_admin']), async (req: Request, res: Response) => {
  try {
    const data = UpdateDocumentVersionSchema.parse(req.body);
    
    const version = await legalDocsRepo.updateDocumentVersion(req.params.id, data);
    
    if (!version) {
      return res.status(404).json({
        success: false,
        error: 'Версия документа не найдена'
      });
    }
    
    res.json({
      success: true,
      data: version
    });
    
  } catch (error) {
    console.error(`Update document version ${req.params.id} error:`, error);
    
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
 * /api/v1/legal-documents/versions/{id}/publish:
 *   post:
 *     summary: Опубликовать версию документа
 *     tags: [Legal Documents]
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
 *         description: Версия опубликована
 */
router.post('/versions/:id/publish', authenticateToken, requireRole(['system_admin']), async (req: Request, res: Response) => {
  try {
    const version = await legalDocsRepo.publishDocumentVersion(req.params.id);
    
    res.json({
      success: true,
      data: version
    });
    
  } catch (error) {
    console.error(`Publish document version ${req.params.id} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// ===============================================
// USER ACCEPTANCES ROUTES
// ===============================================

/**
 * @swagger
 * /api/v1/legal-documents/accept:
 *   post:
 *     summary: Принять документ
 *     tags: [Legal Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - version_id
 *             properties:
 *               version_id:
 *                 type: string
 *                 format: uuid
 *               source:
 *                 type: string
 *                 enum: [web, mobile, api]
 *                 default: web
 *     responses:
 *       200:
 *         description: Документ принят
 */
router.post('/accept', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { version_id, source } = AcceptDocumentSchema.parse(req.body);
    const userId = req.user.userId;
    
    const acceptance = await legalDocsRepo.acceptDocument(version_id, userId, source);
    
    res.json({
      success: true,
      data: acceptance
    });
    
  } catch (error) {
    console.error('Accept document error:', error);
    
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
 * /api/v1/legal-documents/user/consent-requirement:
 *   get:
 *     summary: Получить требования согласий для пользователя
 *     tags: [Legal Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Требования согласий
 */
router.get('/user/consent-requirement', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.userId;
    const requirement = await legalDocsRepo.getUserConsentRequirement(userId);
    
    res.json({
      success: true,
      data: requirement
    });
    
  } catch (error) {
    console.error('Get user consent requirement error:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * @swagger
 * /api/v1/legal-documents/user/acceptances:
 *   get:
 *     summary: Получить согласия пользователя
 *     tags: [Legal Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Согласия пользователя
 */
router.get('/user/acceptances', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.userId;
    const acceptances = await legalDocsRepo.getUserAcceptances(userId);
    
    res.json({
      success: true,
      data: acceptances
    });
    
  } catch (error) {
    console.error('Get user acceptances error:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// ===============================================
// ADMIN ROUTES
// ===============================================

/**
 * @swagger
 * /api/v1/legal-documents/acceptance-journal:
 *   get:
 *     summary: Получить журнал принятия документов
 *     tags: [Legal Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: doc_type
 *         schema:
 *           type: string
 *           enum: [tos, privacy, pdn]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 50
 *     responses:
 *       200:
 *         description: Журнал принятия документов
 */
router.get('/acceptance-journal', authenticateToken, requireRole(['network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const filters = AcceptanceJournalFiltersSchema.parse(req.query);
    
    const acceptances = await legalDocsRepo.getAcceptanceJournal(filters);
    
    res.json({
      success: true,
      data: acceptances,
      meta: {
        limit: filters.limit,
        offset: filters.offset
      }
    });
    
  } catch (error) {
    console.error('Get acceptance journal error:', error);
    
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
 * /api/v1/legal-documents/statistics:
 *   get:
 *     summary: Получить статистику по документам
 *     tags: [Legal Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Статистика по документам
 */
router.get('/statistics', authenticateToken, requireRole(['network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const statistics = await legalDocsRepo.getDocumentStatistics();
    
    res.json({
      success: true,
      data: statistics
    });
    
  } catch (error) {
    console.error('Get document statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

export { router as legalDocumentsRouter };