/**
 * Authentication Routes
 * Для АГЕНТА 1: Инфраструктура
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { JWTService, LoginCredentials } from '../auth/jwt';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// ===============================================
// VALIDATION SCHEMAS
// ===============================================

const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

// ===============================================
// AUTH ENDPOINTS
// ===============================================

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/JWTPayload'
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 expiresIn:
 *                   type: number
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = LoginSchema.parse(req.body);
    
    // Authenticate user
    const authResult = await JWTService.authenticate(validatedData as LoginCredentials);
    
    res.json({
      success: true,
      message: 'Login successful',
      ...authResult
    });
    
  } catch (error: any) {
    console.error('Login error:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: error.errors
      });
    }
    
    if (error.message === 'Invalid email or password') {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refresh successful
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = RefreshTokenSchema.parse(req.body);
    
    // Refresh token
    const authResult = await JWTService.refreshToken(validatedData.refreshToken);
    
    res.json({
      success: true,
      message: 'Token refresh successful',
      ...authResult
    });
    
  } catch (error: any) {
    console.error('Token refresh error:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: error.errors
      });
    }
    
    if (error.message === 'Invalid refresh token') {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user info
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User info retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/JWTPayload'
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Get fresh user data from database
    const user = await JWTService.getUserById(req.user!.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive',
        code: 'USER_NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      user
    });
    
  } catch (error: any) {
    console.error('Get user info error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user (client-side token invalidation)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  // For JWT tokens, logout is primarily handled client-side by removing the token
  // In a more sophisticated implementation, you might maintain a blacklist of invalidated tokens
  
  res.json({
    success: true,
    message: 'Logout successful. Please remove the token from client storage.'
  });
});

/**
 * @swagger
 * /api/v1/auth/verify:
 *   get:
 *     summary: Verify token validity
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *       401:
 *         description: Token is invalid or expired
 */
router.get('/verify', authenticateToken, async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Token is valid',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// ===============================================
// SWAGGER COMPONENTS
// ===============================================

/**
 * @swagger
 * components:
 *   schemas:
 *     JWTPayload:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *           format: email
 *         name:
 *           type: string
 *         role:
 *           type: string
 *           enum: [operator, manager, network_admin, system_admin]
 *         network_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         trading_point_ids:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *         permissions:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               resource:
 *                 type: string
 *               action:
 *                 type: string
 *               scope:
 *                 type: string
 *                 enum: [global, network, trading_point]
 *                 nullable: true
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

export { router as authRouter };