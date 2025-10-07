/**
 * Улучшенный сервис для работы с пользователями
 * Использует новый Supabase клиент с retry логикой
 */

import { User, UserStatus, CreateUserInput, UpdateUserInput } from '@/types/auth';
import { supabaseClient, SupabaseErrorHandler } from '@/lib/supabase/client';

class EnhancedUsersService {
  
  /**
   * Инициализация сервиса
   */
  async initialize(): Promise<boolean> {
    return supabaseClient.initialize();
  }

  /**
   * Проверка подключения
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    return supabaseClient.testConnection();
  }

  /**
   * Получение всех пользователей с retry логикой
   */
  async getAllUsers(): Promise<User[]> {
    try {
      if (!supabaseClient.isInitialized()) {
        throw new Error('Сервис не инициализирован');
      }

      
      const { data: users, error } = await supabaseClient.select<any>(
        'users',
        '*',
        {
          filters: { deleted_at: null },
          orderBy: { column: 'created_at', ascending: false },
          retryOptions: {
            maxRetries: 3,
            delay: 1000,
            backoff: true
          }
        }
      );

      if (error) {
        console.error('❌ Ошибка получения пользователей:', error);
        throw new Error(SupabaseErrorHandler.getHumanReadableError(error));
      }

      if (!users) {
        return [];
      }

      const transformedUsers = users.map(user => this.transformUserFromDB(user));
      
      return transformedUsers;
    } catch (error: any) {
      console.error('❌ Ошибка в getAllUsers:', error);
      throw error;
    }
  }

  /**
   * Получение пользователя по ID
   */
  async getUserById(id: string): Promise<User | null> {
    try {
      if (!supabaseClient.isInitialized()) {
        throw new Error('Сервис не инициализирован');
      }

      const { data: users, error } = await supabaseClient.select<any>(
        'users',
        '*',
        {
          filters: { id, deleted_at: null },
          limit: 1,
          retryOptions: { maxRetries: 2 }
        }
      );

      if (error) {
        throw new Error(SupabaseErrorHandler.getHumanReadableError(error));
      }

      if (!users || users.length === 0) {
        return null;
      }

      return this.transformUserFromDB(users[0]);
    } catch (error: any) {
      console.error('❌ Ошибка в getUserById:', error);
      throw error;
    }
  }

  /**
   * Получение пользователя по email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      if (!supabaseClient.isInitialized()) {
        throw new Error('Сервис не инициализирован');
      }

      const { data: users, error } = await supabaseClient.select<any>(
        'users',
        '*',
        {
          filters: { email: email.toLowerCase(), deleted_at: null },
          limit: 1,
          retryOptions: { maxRetries: 2 }
        }
      );

      if (error) {
        throw new Error(SupabaseErrorHandler.getHumanReadableError(error));
      }

      if (!users || users.length === 0) {
        return null;
      }

      return this.transformUserFromDB(users[0]);
    } catch (error: any) {
      console.error('❌ Ошибка в getUserByEmail:', error);
      throw error;
    }
  }

  /**
   * Создание нового пользователя
   */
  async createUser(input: CreateUserInput): Promise<User> {
    try {
      if (!supabaseClient.isInitialized()) {
        throw new Error('Сервис не инициализирован');
      }

      // Проверяем уникальность email
      const existingUser = await this.getUserByEmail(input.email);
      if (existingUser) {
        throw new Error('Пользователь с таким email уже существует');
      }

      // Генерируем соль и хешируем пароль
      const salt = this.generateSalt();
      const passwordHash = await this.hashPassword(input.password, salt);

      const userData = {
        tenant_id: '00000000-0000-0000-0000-000000000001',
        email: input.email.toLowerCase(),
        name: input.name,
        phone: input.phone || null,
        status: input.status || 'active',
        pwd_salt: salt,
        pwd_hash: passwordHash,
        preferences: {},
        created_at: new Date().toISOString()
      };

      const { data: users, error } = await supabaseClient.insert<any>(
        'users',
        userData,
        { retryOptions: { maxRetries: 2 } }
      );

      if (error) {
        throw new Error(SupabaseErrorHandler.getHumanReadableError(error));
      }

      if (!users || users.length === 0) {
        throw new Error('Не удалось создать пользователя');
      }

      const createdUser = this.transformUserFromDB(users[0]);

      // Назначаем роли если указаны
      if (input.roles && input.roles.length > 0) {
        await this.assignRolesToUser(createdUser.id, input.roles);
      }

      return createdUser;
    } catch (error: any) {
      console.error('❌ Ошибка в createUser:', error);
      throw error;
    }
  }

  /**
   * Обновление пользователя
   */
  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    try {
      if (!supabaseClient.isInitialized()) {
        throw new Error('Сервис не инициализирован');
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (input.email !== undefined) updateData.email = input.email.toLowerCase();
      if (input.name !== undefined) updateData.name = input.name;
      if (input.phone !== undefined) updateData.phone = input.phone;
      if (input.status !== undefined) updateData.status = input.status;

      const { data: users, error } = await supabaseClient.update<any>(
        'users',
        updateData,
        { id },
        { retryOptions: { maxRetries: 2 } }
      );

      if (error) {
        throw new Error(SupabaseErrorHandler.getHumanReadableError(error));
      }

      if (!users || users.length === 0) {
        throw new Error('Пользователь не найден');
      }

      return this.transformUserFromDB(users[0]);
    } catch (error: any) {
      console.error('❌ Ошибка в updateUser:', error);
      throw error;
    }
  }

  /**
   * Soft delete пользователя
   */
  async deleteUser(id: string): Promise<void> {
    try {
      if (!supabaseClient.isInitialized()) {
        throw new Error('Сервис не инициализирован');
      }

      const { error } = await supabaseClient.update(
        'users',
        {
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        { id },
        { retryOptions: { maxRetries: 2 } }
      );

      if (error) {
        throw new Error(SupabaseErrorHandler.getHumanReadableError(error));
      }

    } catch (error: any) {
      console.error('❌ Ошибка в deleteUser:', error);
      throw error;
    }
  }

  /**
   * Batch операции для массовой обработки
   */
  async batchUpdateUsers(updates: Array<{id: string, data: UpdateUserInput}>): Promise<User[]> {
    try {
      if (!supabaseClient.isInitialized()) {
        throw new Error('Сервис не инициализирован');
      }

      const operations = updates.map(update => ({
        type: 'update' as const,
        table: 'users',
        data: {
          ...update.data,
          updated_at: new Date().toISOString()
        },
        filters: { id: update.id }
      }));

      const { data, error } = await supabaseClient.batch<User>(operations);

      if (error) {
        throw new Error(SupabaseErrorHandler.getHumanReadableError(error));
      }

      return (data as any[]).map(users => users[0]).map(user => this.transformUserFromDB(user));
    } catch (error: any) {
      console.error('❌ Ошибка в batchUpdateUsers:', error);
      throw error;
    }
  }

  /**
   * Real-time подписка на изменения пользователей
   */
  subscribeToUsers(callback: (payload: any) => void) {
    if (!supabaseClient.isInitialized()) {
      console.warn('⚠️ Невозможно подписаться - сервис не инициализирован');
      return null;
    }

    return supabaseClient.subscribe('users', callback, {
      event: '*',
      filter: 'deleted_at=is.null'
    });
  }

  /**
   * Статистика пользователей
   */
  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    blocked: number;
  }> {
    try {
      const users = await this.getAllUsers();
      
      return {
        total: users.length,
        active: users.filter(u => u.status === 'active').length,
        inactive: users.filter(u => u.status === 'inactive').length,
        blocked: users.filter(u => u.status === 'blocked').length
      };
    } catch (error) {
      console.error('❌ Ошибка в getUserStats:', error);
      return { total: 0, active: 0, inactive: 0, blocked: 0 };
    }
  }

  /**
   * Приватные методы
   */
  private transformUserFromDB(dbUser: any): User {
    return {
      id: dbUser.id,
      tenant_id: dbUser.tenant_id || '00000000-0000-0000-0000-000000000001',
      email: dbUser.email,
      name: dbUser.name,
      phone: dbUser.phone,
      status: dbUser.status as UserStatus,
      roles: [],
      direct_permissions: [],
      preferences: dbUser.preferences || {},
      pwd_salt: dbUser.pwd_salt,
      pwd_hash: dbUser.pwd_hash,
      last_login: dbUser.last_login ? new Date(dbUser.last_login) : undefined,
      created_at: new Date(dbUser.created_at),
      updated_at: new Date(dbUser.updated_at),
      deleted_at: dbUser.deleted_at ? new Date(dbUser.deleted_at) : undefined
    };
  }

  private generateSalt(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async hashPassword(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async assignRolesToUser(userId: string, roleIds: string[]): Promise<void> {
    try {
      const assignments = roleIds.map(roleId => ({
        user_id: userId,
        role_id: roleId,
        assigned_by: '00000000-0000-0000-0000-000000000001',
        assigned_at: new Date().toISOString()
      }));

      const { error } = await supabaseClient.insert('user_roles', assignments);

      if (error) {
        throw new Error(SupabaseErrorHandler.getHumanReadableError(error));
      }

    } catch (error: any) {
      console.error('❌ Ошибка в assignRolesToUser:', error);
      throw error;
    }
  }
}

export const enhancedUsersService = new EnhancedUsersService();