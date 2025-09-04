/**
 * Fuel Types API Routes
 * Для АГЕНТА 3: API Endpoints
 */

import { Router, Request, Response } from 'express';
import { fuelTypesRepository } from '../database/repositories';
import { requireRole } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     FuelType:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         code:
 *           type: string
 *         category:
 *           type: string
 *           enum: [gasoline, diesel, gas, other]
 *         octane_number:
 *           type: integer
 *         density:
 *           type: number
 *         unit:
 *           type: string
 *         is_active:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /fuel-types:
 *   get:
 *     summary: Получить список типов топлива
 *     tags: [Fuel Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Показывать только активные типы
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [gasoline, diesel, gas, other]
 *         description: Фильтр по категории
 *     responses:
 *       200:
 *         description: Список типов топлива
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
 *                     $ref: '#/components/schemas/FuelType'
 *                 total:
 *                   type: integer
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { activeOnly = 'true', category } = req.query;
    
    let fuelTypes = await fuelTypesRepository.findAll(activeOnly === 'true');
    
    // Фильтрация по категории
    if (category && ['gasoline', 'diesel', 'gas', 'other'].includes(category as string)) {
      fuelTypes = fuelTypes.filter(ft => ft.category === category);
    }
    
    res.json({
      success: true,
      data: fuelTypes,
      total: fuelTypes.length,
      filters: { activeOnly: activeOnly === 'true', category }
    });
  } catch (error: any) {
    console.error('GET /fuel-types error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fuel types',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /fuel-types/{id}:
 *   get:
 *     summary: Получить тип топлива по ID
 *     tags: [Fuel Types]
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
 *         description: Данные типа топлива
 *       404:
 *         description: Тип топлива не найден
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const fuelType = await fuelTypesRepository.findById(id);
    
    if (!fuelType) {
      return res.status(404).json({
        success: false,
        error: 'Fuel type not found',
        fuelTypeId: id
      });
    }
    
    res.json({
      success: true,
      data: fuelType
    });
  } catch (error: any) {
    console.error(`GET /fuel-types/${req.params.id} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fuel type',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /fuel-types/code/{code}:
 *   get:
 *     summary: Найти тип топлива по коду
 *     tags: [Fuel Types]
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
 *         description: Данные типа топлива
 *       404:
 *         description: Тип топлива не найден
 */
router.get('/code/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    
    const fuelType = await fuelTypesRepository.findByCode(code.toUpperCase());
    
    if (!fuelType) {
      return res.status(404).json({
        success: false,
        error: 'Fuel type not found',
        code: code
      });
    }
    
    res.json({
      success: true,
      data: fuelType
    });
  } catch (error: any) {
    console.error(`GET /fuel-types/code/${req.params.code} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fuel type by code',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /fuel-types:
 *   post:
 *     summary: Создать новый тип топлива
 *     tags: [Fuel Types]
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
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [gasoline, diesel, gas, other]
 *               octane_number:
 *                 type: integer
 *               density:
 *                 type: number
 *               unit:
 *                 type: string
 *                 default: L
 *     responses:
 *       201:
 *         description: Тип топлива создан
 *       400:
 *         description: Ошибка валидации
 *       409:
 *         description: Тип топлива с таким кодом уже существует
 */
router.post('/', requireRole(['system_admin']), async (req: Request, res: Response) => {
  try {
    const { name, code, category, octane_number, density, unit } = req.body;
    
    // Валидация
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
    
    if (!category || !['gasoline', 'diesel', 'gas', 'other'].includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Valid category is required',
        field: 'category',
        validValues: ['gasoline', 'diesel', 'gas', 'other']
      });
    }
    
    // Проверяем уникальность кода
    const existingFuelType = await fuelTypesRepository.findByCode(code.toUpperCase());
    if (existingFuelType) {
      return res.status(409).json({
        success: false,
        error: 'Fuel type with this code already exists',
        field: 'code',
        existingId: existingFuelType.id
      });
    }
    
    const fuelTypeData = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      category,
      octane_number: octane_number || null,
      density: density || null,
      unit: unit || 'L',
      is_active: true
    };
    
    const fuelType = await fuelTypesRepository.create(fuelTypeData);
    
    res.status(201).json({
      success: true,
      data: fuelType,
      message: 'Fuel type created successfully'
    });
  } catch (error: any) {
    console.error('POST /fuel-types error:', error);
    
    if (error.message.includes('DUPLICATE_RECORD')) {
      return res.status(409).json({
        success: false,
        error: 'Fuel type with this code already exists',
        field: 'code'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create fuel type',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /fuel-types/{id}:
 *   put:
 *     summary: Обновить тип топлива
 *     tags: [Fuel Types]
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
 *               category:
 *                 type: string
 *                 enum: [gasoline, diesel, gas, other]
 *               octane_number:
 *                 type: integer
 *               density:
 *                 type: number
 *               unit:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Тип топлива обновлен
 *       400:
 *         description: Ошибка валидации
 *       404:
 *         description: Тип топлива не найден
 */
router.put('/:id', requireRole(['system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, octane_number, density, unit, is_active } = req.body;
    
    // Проверяем существование типа топлива
    const existingFuelType = await fuelTypesRepository.findById(id);
    if (!existingFuelType) {
      return res.status(404).json({
        success: false,
        error: 'Fuel type not found',
        fuelTypeId: id
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
    
    if (category !== undefined) {
      if (!['gasoline', 'diesel', 'gas', 'other'].includes(category)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid category value',
          field: 'category',
          validValues: ['gasoline', 'diesel', 'gas', 'other']
        });
      }
      updates.category = category;
    }
    
    if (octane_number !== undefined) {
      updates.octane_number = octane_number;
    }
    
    if (density !== undefined) {
      updates.density = density;
    }
    
    if (unit !== undefined) {
      updates.unit = unit;
    }
    
    if (is_active !== undefined) {
      updates.is_active = Boolean(is_active);
    }
    
    const updatedFuelType = await fuelTypesRepository.update(id, updates);
    
    res.json({
      success: true,
      data: updatedFuelType,
      message: 'Fuel type updated successfully'
    });
  } catch (error: any) {
    console.error(`PUT /fuel-types/${req.params.id} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update fuel type',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /fuel-types/{id}:
 *   delete:
 *     summary: Удалить тип топлива
 *     tags: [Fuel Types]
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
 *         description: Тип топлива удален
 *       404:
 *         description: Тип топлива не найден
 *       409:
 *         description: Нельзя удалить тип топлива с привязанными записями
 */
router.delete('/:id', requireRole(['system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Проверяем существование типа топлива
    const existingFuelType = await fuelTypesRepository.findById(id);
    if (!existingFuelType) {
      return res.status(404).json({
        success: false,
        error: 'Fuel type not found',
        fuelTypeId: id
      });
    }
    
    // TODO: Проверить наличие связанных записей (цены, операции и т.д.)
    
    await fuelTypesRepository.delete(id);
    
    res.json({
      success: true,
      message: 'Fuel type deleted successfully',
      deletedId: id
    });
  } catch (error: any) {
    console.error(`DELETE /fuel-types/${req.params.id} error:`, error);
    
    if (error.message.includes('FOREIGN_KEY_VIOLATION')) {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete fuel type with existing references',
        details: 'Remove all related records first'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete fuel type',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /fuel-types/{id}/deactivate:
 *   patch:
 *     summary: Деактивировать тип топлива (безопасное удаление)
 *     tags: [Fuel Types]
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
 *         description: Тип топлива деактивирован
 *       404:
 *         description: Тип топлива не найден
 */
router.patch('/:id/deactivate', requireRole(['system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const existingFuelType = await fuelTypesRepository.findById(id);
    if (!existingFuelType) {
      return res.status(404).json({
        success: false,
        error: 'Fuel type not found',
        fuelTypeId: id
      });
    }
    
    const updatedFuelType = await fuelTypesRepository.update(id, { is_active: false });
    
    res.json({
      success: true,
      data: updatedFuelType,
      message: 'Fuel type deactivated successfully'
    });
  } catch (error: any) {
    console.error(`PATCH /fuel-types/${req.params.id}/deactivate error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate fuel type',
      details: error.message
    });
  }
});

export { router as fuelTypesRouter };