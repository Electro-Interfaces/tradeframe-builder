/**
 * Roles API Routes
 * Управление ролями и разрешениями
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/auth';
import { RolesRepository } from '../database/repositories';

const router = Router();
const rolesRepo = new RolesRepository();

// ===============================================
// VALIDATION SCHEMAS
// ===============================================

const PermissionSchema = z.object({
  resource: z.string(),
  action: z.string(),
  scope: z.enum(['global', 'network', 'trading_point']).optional(),
  conditions: z.record(z.any()).optional()
});

const CreateRoleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").regex(/^[A-Z_]+$/, "Code must be uppercase with underscores"),
  description: z.string().optional(),
  permissions: z.array(PermissionSchema),
  scope: z.enum(['global', 'network', 'trading_point']).default('network'),
  scope_values: z.array(z.string()).optional(),
  is_active: z.boolean().default(true)
});

const UpdateRoleSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  permissions: z.array(PermissionSchema).optional(),
  scope: z.enum(['global', 'network', 'trading_point']).optional(),
  scope_values: z.array(z.string()).optional(),
  is_active: z.boolean().optional()
});

const ListRolesSchema = z.object({
  search: z.string().optional(),
  scope: z.string().optional(),
  is_active: z.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50)
});

const AssignRoleSchema = z.object({
  user_id: z.string().min(1, "User ID is required"),
  role_id: z.string().min(1, "Role ID is required")
});

// ===============================================
// ROUTES
// ===============================================

/**
 * @swagger
 * /roles:
 *   get:
 *     summary: Получить список ролей
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Поиск по названию или коду
 *       - in: query
 *         name: scope
 *         schema:
 *           type: string
 *           enum: [global, network, trading_point]
 *         description: Фильтр по области действия
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Фильтр по активности
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
 *         description: Список ролей
 *       403:
 *         description: Недостаточно прав доступа
 */
router.get('/', requireRole(['manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const params = ListRolesSchema.parse(req.query);
    const result = await rolesRepo.list(params, req.user?.network_id);
    
    res.json(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.errors
      });
    }
    
    console.error('Roles list error:', error);
    res.status(500).json({
      error: 'Failed to fetch roles',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /roles:
 *   post:
 *     summary: Создать новую роль
 *     tags: [Roles]
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
 *               - permissions
 *             properties:
 *               name:
 *                 type: string
 *                 description: Название роли
 *               code:
 *                 type: string
 *                 description: Уникальный код роли (UPPER_CASE)
 *               description:
 *                 type: string
 *                 description: Описание роли
 *               permissions:
 *                 type: array
 *                 description: Массив разрешений
 *                 items:
 *                   type: object
 *                   properties:
 *                     resource:
 *                       type: string
 *                     action:
 *                       type: string
 *                     scope:
 *                       type: string
 *                       enum: [global, network, trading_point]
 *               scope:
 *                 type: string
 *                 enum: [global, network, trading_point]
 *                 default: network
 *               scope_values:
 *                 type: array
 *                 items:
 *                   type: string
 *               is_active:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Роль создана
 *       400:
 *         description: Некорректные данные
 *       403:
 *         description: Недостаточно прав доступа
 *       409:
 *         description: Роль с таким кодом уже существует
 */
router.post('/', requireRole(['network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const data = CreateRoleSchema.parse(req.body);
    
    const roleData = {
      ...data,
      network_id: req.user?.network_id,
      tenant_id: req.user?.network_id || 'default'
    };
    
    const role = await rolesRepo.create(roleData, req.user?.userId);
    
    res.status(201).json(role);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.errors
      });
    }
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: 'Role with this code already exists'
      });
    }
    
    console.error('Role creation error:', error);
    res.status(500).json({
      error: 'Failed to create role',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /roles/{id}:
 *   get:
 *     summary: Получить роль по ID
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID роли
 *     responses:
 *       200:
 *         description: Данные роли
 *       404:
 *         description: Роль не найдена
 *       403:
 *         description: Недостаточно прав доступа
 */
router.get('/:id', requireRole(['manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const role = await rolesRepo.getById(id, req.user?.network_id);
    
    if (!role) {
      return res.status(404).json({
        error: 'Role not found'
      });
    }
    
    res.json(role);
  } catch (error: any) {
    console.error('Role get error:', error);
    res.status(500).json({
      error: 'Failed to fetch role',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /roles/{id}:
 *   patch:
 *     summary: Обновить роль
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID роли
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
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: object
 *               scope:
 *                 type: string
 *                 enum: [global, network, trading_point]
 *               scope_values:
 *                 type: array
 *                 items:
 *                   type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Роль обновлена
 *       400:
 *         description: Некорректные данные
 *       404:
 *         description: Роль не найдена
 *       403:
 *         description: Недостаточно прав доступа
 */
router.patch('/:id', requireRole(['network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = UpdateRoleSchema.parse(req.body);
    
    const role = await rolesRepo.update(id, data, req.user?.network_id, req.user?.userId);
    
    if (!role) {
      return res.status(404).json({
        error: 'Role not found'
      });
    }
    
    res.json(role);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.errors
      });
    }
    
    console.error('Role update error:', error);
    res.status(500).json({
      error: 'Failed to update role',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /roles/{id}:
 *   delete:
 *     summary: Удалить роль
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID роли
 *     responses:
 *       200:
 *         description: Роль удалена
 *       404:
 *         description: Роль не найдена
 *       403:
 *         description: Недостаточно прав доступа
 *       409:
 *         description: Роль используется пользователями
 */
router.delete('/:id', requireRole(['system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const success = await rolesRepo.delete(id, req.user?.userId);
    
    if (!success) {
      return res.status(404).json({
        error: 'Role not found'
      });
    }
    
    res.json({ message: 'Role deleted successfully' });
  } catch (error: any) {
    if (error.message.includes('role is in use')) {
      return res.status(409).json({
        error: 'Cannot delete role that is assigned to users',
        message: 'Remove role from all users first'
      });
    }
    
    console.error('Role delete error:', error);
    res.status(500).json({
      error: 'Failed to delete role',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /roles/{id}/assign:
 *   post:
 *     summary: Назначить роль пользователю
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID роли
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *             properties:
 *               user_id:
 *                 type: string
 *                 description: ID пользователя
 *     responses:
 *       200:
 *         description: Роль назначена пользователю
 *       400:
 *         description: Некорректные данные
 *       404:
 *         description: Роль или пользователь не найдены
 *       403:
 *         description: Недостаточно прав доступа
 *       409:
 *         description: Роль уже назначена пользователю
 */
router.post('/:id/assign', requireRole(['network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const roleId = req.params.id;
    const { user_id } = z.object({ user_id: z.string() }).parse(req.body);
    
    const success = await rolesRepo.assignToUser(roleId, user_id, req.user?.network_id, req.user?.userId);
    
    if (!success) {
      return res.status(404).json({
        error: 'Role or user not found'
      });
    }
    
    res.json({ message: 'Role assigned successfully' });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.errors
      });
    }
    
    if (error.message.includes('already assigned')) {
      return res.status(409).json({
        error: 'Role already assigned to user'
      });
    }
    
    console.error('Role assign error:', error);
    res.status(500).json({
      error: 'Failed to assign role',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /roles/{id}/unassign:
 *   post:
 *     summary: Отозвать роль у пользователя
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID роли
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *             properties:
 *               user_id:
 *                 type: string
 *                 description: ID пользователя
 *     responses:
 *       200:
 *         description: Роль отозвана у пользователя
 *       400:
 *         description: Некорректные данные
 *       404:
 *         description: Роль или пользователь не найдены
 *       403:
 *         description: Недостаточно прав доступа
 */
router.post('/:id/unassign', requireRole(['network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const roleId = req.params.id;
    const { user_id } = z.object({ user_id: z.string() }).parse(req.body);
    
    const success = await rolesRepo.unassignFromUser(roleId, user_id, req.user?.network_id, req.user?.userId);
    
    if (!success) {
      return res.status(404).json({
        error: 'Role assignment not found'
      });
    }
    
    res.json({ message: 'Role unassigned successfully' });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.errors
      });
    }
    
    console.error('Role unassign error:', error);
    res.status(500).json({
      error: 'Failed to unassign role',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /roles/permissions:
 *   get:
 *     summary: Получить список доступных разрешений
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список разрешений, сгруппированный по ресурсам
 *       403:
 *         description: Недостаточно прав доступа
 */
router.get('/permissions', requireRole(['network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const permissions = await rolesRepo.getAvailablePermissions();
    
    res.json(permissions);
  } catch (error: any) {
    console.error('Permissions list error:', error);
    res.status(500).json({
      error: 'Failed to fetch permissions',
      message: error.message
    });
  }
});

export { router as rolesRouter };