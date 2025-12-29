/**
 * Сервис аутентификации через Supabase
 * Работает с реальными пользователями из базы данных
 */

import { supabaseService } from '@/services/supabaseServiceClient';
import { createClient } from '@supabase/supabase-js';
import { authService } from './auth/authService';

interface SupabaseUser {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  phone: string;
  status: string;
  pwd_salt: string;
  pwd_hash: string;
  preferences: any;
  last_login: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  networkId?: string;
  tradingPointIds: string[];
  permissions: string[];
}

export class SupabaseAuthService {

  /**
   * Вход пользователя через email и пароль
   */
  static async login(email: string, password: string): Promise<AuthUser> {
    try {
      // Используем service клиент для авторизации
      
      // Получаем пользователя из базы данных (новая схема)
      const { data: users, error: userError } = await supabaseService
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('status', 'active')
        .is('deleted_at', null)
        .limit(1);


      if (userError) {
        console.error('❌ Supabase user query error:', userError);
        throw new Error('Ошибка подключения к базе данных: ' + userError);
      }

      if (!users || users.length === 0) {
        console.error('No users found for email:', email);
        // Попробуем без фильтра deleted_at
        const { data: allUsers } = await supabaseService
          .from('users')
          .select('*')
          .eq('email', email)
          .limit(1);
        console.log('Users without deleted_at filter:', allUsers);
        throw new Error('Пользователь не найден или заблокирован');
      }

      const user: SupabaseUser = users[0];

      // Проверяем хэш пароля для всех пользователей используя простой SHA-256
      const isPasswordValid = await authService.verifyPassword({ pwd_hash: user.pwd_hash, pwd_salt: user.pwd_salt } as any, password);
      if (!isPasswordValid) {
        throw new Error('Неверный пароль');
      }

      // Извлекаем роль из preferences (новая схема)
      // Используем код роли, а не имя роли для проверки разрешений
      let userRole = user.preferences?.role || 'operator';
      const userRoleId = user.preferences?.role_id;


      // Маппинг имен ролей на коды для совместимости
      const roleNameToCode: Record<string, string> = {
        'Суперадминистратор': 'super_admin',
        'Администратор сети': 'network_admin',
        'Менеджер': 'manager',
        'Оператор': 'operator',
        'Менеджер БТО': 'bto_manager'
      };

      // Если роль - это имя, конвертируем в код
      if (roleNameToCode[userRole]) {
        userRole = roleNameToCode[userRole];
      }

      
      // Получаем разрешения на основе роли
      const permissions = this.getRolePermissions(userRole);

      // Возвращаем аутентифицированного пользователя
      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: userRole,
        networkId: user.tenant_id || undefined, // tenant_id теперь вместо network_id
        tradingPointIds: user.preferences?.trading_point_ids || [],
        permissions
      };

      // Сохраняем учетные данные для автоматического обновления токена
      const rememberMe = sessionStorage.getItem('remember_me') === 'true';
      const storage = rememberMe ? localStorage : sessionStorage;
      
      // Генерируем токен для пользователя
      const token = this.generateAuthToken(authUser);
      const expiryTime = new Date(Date.now() + 60 * 60 * 1000); // 1 час
      
      // Сохраняем данные сессии
      storage.setItem('auth_user', JSON.stringify(authUser));
      storage.setItem('auth_token', token);
      storage.setItem('auth_token_expiry', expiryTime.toISOString());
      storage.setItem('auth_login', email);
      storage.setItem('auth_password', password); // В production следует использовать refresh token
      
      console.log('User authenticated successfully:', authUser.email, authUser.role, 'tenant:', user.tenant_id);
      return authUser;

    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Ошибка входа в систему');
    }
  }

  /**
   * Проверка текущей сессии
   */
  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      // В реальной системе здесь должна быть проверка JWT токена
      // Для демо возвращаем null, чтобы пользователь всегда входил через форму
      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Выход пользователя
   */
  static async logout(): Promise<void> {
    try {
      // Очищаем все данные сессии
      ['auth_user', 'auth_token', 'auth_token_expiry', 'auth_login', 'auth_password'].forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  /**
   * Генерация токена для пользователя (временная реализация)
   */
  private static generateAuthToken(user: AuthUser): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      networkId: user.networkId,
      permissions: user.permissions,
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 час
    };
    
    // В реальной системе здесь должно быть JWT подписывание
    return `token_${btoa(JSON.stringify(payload))}_${Date.now()}`;
  }

  /**
   * Получение разрешений на основе роли
   */
  private static getRolePermissions(role: string): string[] {
    const rolePermissions: Record<string, string[]> = {
      'super_admin': [
        'users.read', 'users.create', 'users.update', 'users.delete',
        'networks.read', 'networks.create', 'networks.update', 'networks.delete',
        'trading_points.read', 'trading_points.create', 'trading_points.update', 'trading_points.delete',
        'equipment.read', 'equipment.create', 'equipment.update', 'equipment.delete',
        'operations.read', 'operations.create', 'operations.update', 'operations.delete',
        'reports.read', 'reports.create', 'reports.export',
        'settings.read', 'settings.update',
        'all' // Специальное разрешение "все"
      ],
      'system_admin': [
        'users.read', 'users.create', 'users.update', 'users.delete',
        'networks.read', 'networks.create', 'networks.update', 'networks.delete',
        'trading_points.read', 'trading_points.create', 'trading_points.update', 'trading_points.delete',
        'equipment.read', 'equipment.create', 'equipment.update', 'equipment.delete',
        'operations.read', 'operations.create', 'operations.update', 'operations.delete',
        'reports.read', 'reports.create', 'reports.export',
        'settings.read', 'settings.update'
      ],
      'network_admin': [
        'users.read', 'users.create', 'users.update',
        'trading_points.read', 'trading_points.update',
        'equipment.read', 'equipment.update',
        'operations.read', 'operations.create', 'operations.update',
        'reports.read', 'reports.create', 'reports.export'
      ],
      'manager': [
        'operations.read', 'operations.create', 'operations.update',
        'equipment.read', 'equipment.update',
        'fuel_stocks.read', 'fuel_stocks.update',
        'reports.read', 'reports.create'
      ],
      'operator': [
        'operations.read', 'operations.create',
        'equipment.read',
        'fuel_stocks.read',
        'reports.read'
      ],
      'bto_manager': [
        'networks.read', 'trading_points.read', 'networks.view_bto', 'points.view_bto'
      ]
    };

    return rolePermissions[role] || ['basic.read'];
  }

  /**
   * Проверка разрешения
   * Поддерживает динамические роли из базы данных
   */
  static hasPermission(user: AuthUser, permission: string): boolean {
    // Проверяем наличие разрешения напрямую
    if (user.permissions.includes(permission) || user.permissions.includes('all') || user.permissions.includes('*')) {
      return true;
    }

    // Проверяем суперадминские роли (динамический список)
    const superAdminRoles = ['super_admin', 'system_admin', 'Суперадминистратор'];
    if (superAdminRoles.includes(user.role)) {
      return true;
    }

    return false;
  }

  /**
   * Получение всех пользователей (только для администраторов)
   */
  static async getUsers(): Promise<SupabaseUser[]> {
    try {
      const { data: users, error } = await supabaseService
        .from('users')
        .select('*')
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get users error:', error);
        return [];
      }

      return users || [];
    } catch (error) {
      console.error('Get users error:', error);
      return [];
    }
  }
}