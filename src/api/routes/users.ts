/**
 * Users API Routes
 * Управление пользователями системы
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/auth';
import { UsersRepository } from '../database/repositories';
import { JWTService } from '../auth/jwt';

const router = Router();
const usersRepo = new UsersRepository();

// ===============================================
// VALIDATION SCHEMAS
// ===============================================

const CreateUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(['operator', 'manager', 'network_admin', 'system_admin']),
  network_id: z.string().optional(),
  trading_point_ids: z.array(z.string()).optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  is_active: z.boolean().default(true)
});

const UpdateUserSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  role: z.enum(['operator', 'manager', 'network_admin', 'system_admin']).optional(),
  network_id: z.string().optional(),
  trading_point_ids: z.array(z.string()).optional(),
  is_active: z.boolean().optional()
});

const ChangePasswordSchema = z.object({
  current_password: z.string().min(1, "Current password is required"),
  new_password: z.string().min(8, "New password must be at least 8 characters")
});

const ListUsersSchema = z.object({
  search: z.string().optional(),
  role: z.string().optional(),
  network_id: z.string().optional(),
  is_active: z.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50)
});

// ===============================================
// ROUTES
// ===============================================

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Получить список пользователей
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Поиск по имени или email
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [operator, manager, network_admin, system_admin]
 *         description: Фильтр по роли
 *       - in: query
 *         name: network_id
 *         schema:
 *           type: string
 *         description: Фильтр по сети
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
 *         description: Список пользователей
 *       403:
 *         description: Недостаточно прав доступа
 */
router.get('/', requireRole(['manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const params = ListUsersSchema.parse(req.query);
    
    // Если пользователь не system_admin, ограничиваем доступ по network_id
    if (req.user?.role !== 'system_admin' && req.user?.network_id) {
      params.network_id = req.user.network_id;
    }
    
    const result = await usersRepo.list(params);
    
    res.json(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.errors
      });
    }
    
    console.error('Users list error:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Создать нового пользователя
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [operator, manager, network_admin, system_admin]
 *               network_id:
 *                 type: string
 *               trading_point_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               phone:
 *                 type: string
 *               position:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Пользователь создан
 *       400:
 *         description: Некорректные данные
 *       403:
 *         description: Недостаточно прав доступа
 *       409:
 *         description: Пользователь с таким email уже существует
 */
router.post('/', requireRole(['network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const data = CreateUserSchema.parse(req.body);
    
    // Проверяем права на создание пользователя в сети
    if (req.user?.role !== 'system_admin' && data.network_id !== req.user?.network_id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Cannot create user in different network'
      });
    }
    
    // Хешируем пароль
    const hashedPassword = await JWTService.hashPassword(data.password);
    
    const userData = {
      ...data,
      password_hash: hashedPassword,
      network_id: data.network_id || req.user?.network_id
    };
    
    const user = await usersRepo.create(userData, req.user?.userId);
    
    // Убираем пароль из ответа
    const { password_hash, ...userResponse } = user;
    
    res.status(201).json(userResponse);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.errors
      });
    }
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: 'User with this email already exists'
      });
    }
    
    console.error('User creation error:', error);
    res.status(500).json({
      error: 'Failed to create user',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Получить пользователя по ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID пользователя
 *     responses:
 *       200:
 *         description: Данные пользователя
 *       404:
 *         description: Пользователь не найден
 *       403:
 *         description: Недостаточно прав доступа
 */
router.get('/:id', requireRole(['manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Пользователь может смотреть свою информацию или админы могут смотреть всех
    const canAccess = id === req.user?.userId || 
                     ['network_admin', 'system_admin'].includes(req.user?.role || '');
    
    if (!canAccess) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }
    
    const user = await usersRepo.getById(id, req.user?.network_id);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    // Убираем пароль из ответа
    const { password_hash, ...userResponse } = user;
    
    res.json(userResponse);
  } catch (error: any) {
    console.error('User get error:', error);
    res.status(500).json({
      error: 'Failed to fetch user',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     summary: Обновить пользователя
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID пользователя
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               position:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [operator, manager, network_admin, system_admin]
 *               network_id:
 *                 type: string
 *               trading_point_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Пользователь обновлен
 *       400:
 *         description: Некорректные данные
 *       404:
 *         description: Пользователь не найден
 *       403:
 *         description: Недостаточно прав доступа
 */
router.patch('/:id', requireRole(['network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = UpdateUserSchema.parse(req.body);
    
    const user = await usersRepo.update(id, data, req.user?.network_id, req.user?.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    // Убираем пароль из ответа
    const { password_hash, ...userResponse } = user;
    
    res.json(userResponse);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.errors
      });
    }
    
    console.error('User update error:', error);
    res.status(500).json({
      error: 'Failed to update user',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /users/{id}/change-password:
 *   post:
 *     summary: Изменить пароль пользователя
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID пользователя
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - current_password
 *               - new_password
 *             properties:
 *               current_password:
 *                 type: string
 *               new_password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Пароль изменен
 *       400:
 *         description: Некорректные данные
 *       401:
 *         description: Неверный текущий пароль
 *       404:
 *         description: Пользователь не найден
 *       403:
 *         description: Недостаточно прав доступа
 */
router.post('/:id/change-password', requireRole(['operator', 'manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = ChangePasswordSchema.parse(req.body);
    
    // Пользователь может менять только свой пароль или админы могут менять любой
    const canChange = id === req.user?.userId || 
                     ['network_admin', 'system_admin'].includes(req.user?.role || '');
    
    if (!canChange) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }
    
    const success = await usersRepo.changePassword(id, data.current_password, data.new_password, req.user?.network_id);
    
    if (!success) {
      return res.status(401).json({
        error: 'Invalid current password'
      });
    }
    
    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.errors
      });
    }
    
    console.error('Password change error:', error);
    res.status(500).json({
      error: 'Failed to change password',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Удалить пользователя
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID пользователя
 *     responses:
 *       200:
 *         description: Пользователь удален
 *       404:
 *         description: Пользователь не найден
 *       403:
 *         description: Недостаточно прав доступа
 */
router.delete('/:id', requireRole(['system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (id === req.user?.userId) {
      return res.status(400).json({
        error: 'Cannot delete yourself'
      });
    }
    
    const success = await usersRepo.delete(id, req.user?.userId);
    
    if (!success) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('User delete error:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /users/{id}/toggle-active:
 *   post:
 *     summary: Активировать/деактивировать пользователя
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID пользователя
 *     responses:
 *       200:
 *         description: Статус пользователя изменен
 *       404:
 *         description: Пользователь не найден
 *       403:
 *         description: Недостаточно прав доступа
 */
router.post('/:id/toggle-active', requireRole(['network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (id === req.user?.userId) {
      return res.status(400).json({
        error: 'Cannot deactivate yourself'
      });
    }
    
    const user = await usersRepo.toggleActive(id, req.user?.network_id, req.user?.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    res.json({
      message: user.is_active ? 'User activated' : 'User deactivated',
      is_active: user.is_active
    });
  } catch (error: any) {
    console.error('User toggle active error:', error);
    res.status(500).json({
      error: 'Failed to toggle user active status',
      message: error.message
    });
  }
});

export { router as usersRouter };