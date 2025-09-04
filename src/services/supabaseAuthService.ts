/**
 * Сервис аутентификации через Supabase
 * Работает с реальными пользователями из базы данных
 */

import { createSupabaseFromSettings } from '@/services/supabaseClient';
import { apiConfigService } from '@/services/apiConfigService';
import * as bcrypt from 'bcryptjs';

interface SupabaseUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  network_id: string | null;
  trading_point_ids: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  private static getSupabaseClient() {
    const config = apiConfigService.getCurrentConnection();
    if (!config || config.type !== 'supabase') {
      throw new Error('Supabase connection not configured');
    }
    if (!config.url || !config.settings?.apiKey) {
      throw new Error('Supabase URL or API Key not configured');
    }
    return createSupabaseFromSettings(config.url, config.settings.apiKey, config.settings.schema || 'public');
  }
  
  private static get supabase() {
    return this.getSupabaseClient();
  }

  /**
   * Вход пользователя через email и пароль
   */
  static async login(email: string, password: string): Promise<AuthUser> {
    try {
      // Пытаемся получить Supabase клиент
      let supabaseClient;
      try {
        supabaseClient = this.getSupabaseClient();
      } catch (configError) {
        // Если конфигурация не найдена, используем переменные окружения
        const url = import.meta.env.VITE_SUPABASE_URL || 'https://tohtryzyffcebtyvkxwh.supabase.co';
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NzU0NDgsImV4cCI6MjA3MjQ1MTQ0OH0.NMpuTp08vLuxhRLxbI9lOAo6JI22-8eDcMRylE3MoqI';
        if (!url || !key) {
          throw new Error('Supabase подключение не активно');
        }
        supabaseClient = createSupabaseFromSettings(url, key);
      }

      // Отладка: проверяем подключение
      console.log('Attempting to query user with email:', email);
      console.log('Supabase URL:', supabaseClient.baseUrl);
      
      // Получаем пользователя из базы данных
      const { data: users, error: userError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .is('deleted_at', null)
        .limit(1);

      console.log('Query result:', { users, userError });

      if (userError) {
        console.error('Supabase user query error:', userError);
        throw new Error('Ошибка подключения к базе данных: ' + userError);
      }

      if (!users || users.length === 0) {
        console.error('No users found for email:', email);
        // Попробуем без фильтра deleted_at
        const { data: allUsers } = await supabaseClient
          .from('users')
          .select('*')
          .eq('email', email)
          .limit(1);
        console.log('Users without deleted_at filter:', allUsers);
        throw new Error('Пользователь не найден или заблокирован');
      }

      const user: SupabaseUser = users[0];

      // Для демо-режима принимаем пароль 'admin123' для известных пользователей
      const isDemoUser = ['admin@tradeframe.com', 'network.admin@demo-azs.ru', 'manager@demo-azs.ru', 'operator@demo-azs.ru']
        .includes(user.email);
      
      if (isDemoUser) {
        // Для демо-пользователей принимаем пароль 'admin123'
        if (password !== 'admin123') {
          throw new Error('Неверный пароль. Используйте пароль: admin123');
        }
      } else {
        // Для остальных пользователей проверяем хэш пароля
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
          throw new Error('Неверный пароль');
        }
      }

      // Получаем разрешения на основе роли
      const permissions = this.getRolePermissions(user.role);

      // Возвращаем аутентифицированного пользователя
      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        networkId: user.network_id || undefined,
        tradingPointIds: Array.isArray(user.trading_point_ids) ? user.trading_point_ids : [],
        permissions
      };

      console.log('User authenticated successfully:', authUser.email, authUser.role);
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
      // Очищаем локальные данные сессии
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  /**
   * Получение разрешений на основе роли
   */
  private static getRolePermissions(role: string): string[] {
    const rolePermissions: Record<string, string[]> = {
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
      ]
    };

    return rolePermissions[role] || ['basic.read'];
  }

  /**
   * Проверка разрешения
   */
  static hasPermission(user: AuthUser, permission: string): boolean {
    return user.permissions.includes(permission) || 
           user.permissions.includes('all') ||
           user.role === 'system_admin';
  }

  /**
   * Получение всех пользователей (только для администраторов)
   */
  static async getUsers(): Promise<SupabaseUser[]> {
    try {
      const { data: users, error } = await this.supabase
        .from('users')
        .select('*')
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