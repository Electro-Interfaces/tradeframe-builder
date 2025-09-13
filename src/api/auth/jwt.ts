/**
 * JWT Authentication Service
 * Для АГЕНТА 1: Инфраструктура
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase } from '../database/supabase';

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: 'operator' | 'manager' | 'network_admin' | 'system_admin';
  network_id?: string;
  trading_point_ids?: string[];
  permissions: Array<{
    resource: string;
    action: string;
    scope?: 'global' | 'network' | 'trading_point';
    conditions?: Record<string, any>;
  }>;
  iat?: number;
  exp?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  user: JWTPayload;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class JWTService {
  private static SECRET = process.env.JWT_SECRET || import.meta.env.VITE_JWT_SECRET || 'tradeframe-dev-secret-change-in-production';
  private static REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || import.meta.env.VITE_JWT_REFRESH_SECRET || 'tradeframe-refresh-secret';
  
  /**
   * Хеширование пароля с bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }
  
  /**
   * Проверка пароля
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }
  
  /**
   * Генерация access токена
   */
  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.SECRET, { 
      expiresIn: '1h',
      issuer: 'tradeframe-api',
      audience: 'tradeframe-client'
    });
  }
  
  /**
   * Генерация refresh токена
   */
  static generateRefreshToken(userId: string): string {
    return jwt.sign({ userId }, this.REFRESH_SECRET, { 
      expiresIn: '7d',
      issuer: 'tradeframe-api'
    });
  }
  
  /**
   * Верификация access токена
   */
  static verifyAccessToken(token: string): JWTPayload {
    return jwt.verify(token, this.SECRET) as JWTPayload;
  }
  
  /**
   * Верификация refresh токена
   */
  static verifyRefreshToken(token: string): { userId: string } {
    return jwt.verify(token, this.REFRESH_SECRET) as { userId: string };
  }
  
  /**
   * Извлечение токена из заголовка Authorization
   */
  static extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
  
  /**
   * Генерация пары токенов
   */
  static generateTokenPair(payload: JWTPayload): {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  } {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload.userId),
      expiresIn: 3600 // 1 hour in seconds
    };
  }
  
  /**
   * Проверка истечения токена
   */
  static isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return true;
      
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch {
      return true;
    }
  }

  /**
   * Аутентификация пользователя по email и паролю
   */
  static async authenticate(credentials: LoginCredentials): Promise<AuthResult> {
    const { email, password } = credentials;

    // Получаем пользователя с ролями из базы данных
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        password_hash,
        role,
        network_id,
        trading_point_ids,
        is_active,
        networks(name),
        user_roles(
          roles(id, name, code, permissions)
        )
      `)
      .eq('email', email)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (error || !user) {
      throw new Error('Invalid email or password');
    }

    // Проверяем пароль
    const isPasswordValid = await this.verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Обновляем время последнего входа
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Собираем разрешения из назначенных ролей
    const permissions: JWTPayload['permissions'] = [];
    
    // Добавляем разрешения из пользовательских ролей
    if (user.user_roles) {
      user.user_roles.forEach((userRole: any) => {
        if (userRole.roles && userRole.roles.permissions) {
          permissions.push(...userRole.roles.permissions);
        }
      });
    }

    // Создаем payload для JWT
    const jwtPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      network_id: user.network_id,
      trading_point_ids: user.trading_point_ids || [],
      permissions
    };

    // Генерируем токены
    const tokens = this.generateTokenPair(jwtPayload);

    return {
      user: jwtPayload,
      ...tokens
    };
  }

  /**
   * Обновление токена через refresh token
   */
  static async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      const { userId } = this.verifyRefreshToken(refreshToken);

      // Получаем актуальные данные пользователя
      const { data: user, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          name,
          role,
          network_id,
          trading_point_ids,
          is_active,
          networks(name),
          user_roles(
            roles(id, name, code, permissions)
          )
        `)
        .eq('id', userId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .single();

      if (error || !user) {
        throw new Error('User not found or inactive');
      }

      // Собираем актуальные разрешения
      const permissions: JWTPayload['permissions'] = [];
      if (user.user_roles) {
        user.user_roles.forEach((userRole: any) => {
          if (userRole.roles && userRole.roles.permissions) {
            permissions.push(...userRole.roles.permissions);
          }
        });
      }

      const jwtPayload: JWTPayload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        network_id: user.network_id,
        trading_point_ids: user.trading_point_ids || [],
        permissions
      };

      const tokens = this.generateTokenPair(jwtPayload);

      return {
        user: jwtPayload,
        ...tokens
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Получение пользователя по ID с актуальными разрешениями
   */
  static async getUserById(userId: string): Promise<JWTPayload | null> {
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        role,
        network_id,
        trading_point_ids,
        is_active,
        user_roles(
          roles(id, name, code, permissions)
        )
      `)
      .eq('id', userId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (error || !user) {
      return null;
    }

    // Собираем разрешения
    const permissions: JWTPayload['permissions'] = [];
    if (user.user_roles) {
      user.user_roles.forEach((userRole: any) => {
        if (userRole.roles && userRole.roles.permissions) {
          permissions.push(...userRole.roles.permissions);
        }
      });
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      network_id: user.network_id,
      trading_point_ids: user.trading_point_ids || [],
      permissions
    };
  }

  /**
   * Проверка разрешения пользователя
   */
  static hasPermission(
    userPayload: JWTPayload, 
    resource: string, 
    action: string, 
    scope?: 'global' | 'network' | 'trading_point'
  ): boolean {
    // System admin имеет все разрешения
    if (userPayload.role === 'system_admin') {
      return true;
    }

    // Проверяем разрешения в токене
    return userPayload.permissions.some(permission => {
      const resourceMatch = permission.resource === '*' || permission.resource === resource;
      const actionMatch = permission.action === '*' || permission.action === action;
      const scopeMatch = !scope || !permission.scope || permission.scope === scope;
      
      return resourceMatch && actionMatch && scopeMatch;
    });
  }
}

// Экспортируем для использования в middleware
export const jwtService = JWTService;