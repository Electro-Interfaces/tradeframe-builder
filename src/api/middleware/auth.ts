/**
 * Authentication Middleware
 * Для АГЕНТА 1: Инфраструктура
 */

import { Request, Response, NextFunction } from 'express';
import { jwtService as JWTService, JWTPayload } from '../auth/jwt';

// Расширяем интерфейс Request
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Middleware для проверки JWT токена
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'Access token required',
        code: 'NO_TOKEN'
      });
    }
    
    const decoded = JWTService.verifyAccessToken(token);
    req.user = decoded;
    
    next();
  } catch (error: any) {
    console.error('Token verification failed:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Middleware для проверки ролей пользователя
 */
export const requireRole = (requiredRoles: ('operator' | 'manager' | 'network_admin' | 'system_admin')[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }
    
    const userRole = req.user.role;
    const hasRequiredRole = requiredRoles.includes(userRole) || userRole === 'system_admin';
    
    if (!hasRequiredRole) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: requiredRoles,
        current: userRole
      });
    }
    
    next();
  };
};

/**
 * Middleware для проверки доступа к сети
 */
export const requireNetworkAccess = (req: Request, res: Response, next: NextFunction) => {
  const networkId = req.params.networkId || req.body.networkId || req.query.networkId;
  
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
  }
  
  // Системные администраторы имеют доступ ко всем сетям
  if (req.user.role === 'system_admin') {
    return next();
  }
  
  // Проверяем доступ к конкретной сети
  if (!req.user.network_id || req.user.network_id !== networkId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied to this network',
      code: 'NETWORK_ACCESS_DENIED',
      networkId,
      userNetworkId: req.user.network_id
    });
  }
  
  next();
};

/**
 * Middleware для проверки доступа к торговой точке
 */
export const requireTradingPointAccess = (req: Request, res: Response, next: NextFunction) => {
  const tradingPointId = req.params.tradingPointId || req.body.tradingPointId || req.query.tradingPointId;
  
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
  }
  
  // Системные администраторы имеют доступ ко всем точкам
  if (req.user.role === 'system_admin') {
    return next();
  }
  
  // Network admin имеют доступ ко всем точкам своей сети
  // (проверка сети происходит в RLS политиках)
  if (req.user.role === 'network_admin') {
    return next();
  }
  
  // Проверяем доступ к конкретной торговой точке
  const userTradingPoints = req.user.trading_point_ids || [];
  if (!userTradingPoints.includes(tradingPointId)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied to this trading point',
      code: 'TRADING_POINT_ACCESS_DENIED',
      tradingPointId,
      userTradingPoints
    });
  }
  
  next();
};

/**
 * Опциональная аутентификация (не блокирует запрос)
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (token) {
      const decoded = JWTService.verifyAccessToken(token);
      req.user = decoded;
    }
  } catch (error) {
    // Игнорируем ошибки токена при опциональной аутентификации
    console.warn('Optional auth failed:', error);
  }
  
  next();
};