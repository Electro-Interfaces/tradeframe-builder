/**
 * Сервис для работы с пользователями во внешней базе данных Supabase
 */

import { User, UserStatus, CreateUserInput, UpdateUserInput } from '@/types/auth';

interface ExternalDatabaseConfig {
  url: string;
  apiKey: string;
}

class ExternalUsersService {
  private config: ExternalDatabaseConfig | null = null;
  private lastConfigUpdate: number = 0;

  private getConfig(): ExternalDatabaseConfig {
    // Используем фиксированные настройки подключения к Supabase
    const fixedConfig: ExternalDatabaseConfig = {
      url: 'https://ssvazdgnmatbdynkhkqo.supabase.co',
      apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0'
    };

    // Обновляем кэш каждую секунду
    const now = Date.now();
    if (this.config && (now - this.lastConfigUpdate) < 1000) {
      return this.config;
    }

    console.log('🔧 ExternalUsersService: Используем фиксированную конфигурацию Supabase');
    
    this.config = fixedConfig;
    this.lastConfigUpdate = now;
    
    console.log('✅ ExternalUsersService: Конфигурация установлена:', {
      url: fixedConfig.url,
      hasApiKey: !!fixedConfig.apiKey
    });
    
    return this.config;
  }

  // Публичный метод для принудительного сброса кэша
  public clearConfigCache(): void {
    console.log('🔄 ExternalUsersService: Принудительный сброс кэша конфигурации');
    this.config = null;
    this.lastConfigUpdate = 0;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const config = this.getConfig();
    const fullUrl = `${config.url}/rest/v1/${endpoint}`;
    
    // Making request to external database

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          'apikey': config.apiKey,
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
          ...options.headers
        }
      });

      console.log(`📊 ExternalUsersService: Ответ ${response.status} для ${endpoint}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ ExternalUsersService: Ошибка ${response.status}:`, errorText);
        
        // Если 401/403 - проблема с авторизацией, сбрасываем кэш
        if (response.status === 401 || response.status === 403) {
          console.log('🔄 ExternalUsersService: Сброс кэша из-за ошибки авторизации');
          this.clearConfigCache();
        }
        
        throw new Error(`Database error: ${response.status} - ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log(`✅ ExternalUsersService: Успешно получены данные для ${endpoint}:`, Array.isArray(data) ? `массив из ${data.length} элементов` : typeof data);
        return data;
      }
      
      const textData = await response.text();
      console.log(`✅ ExternalUsersService: Получен текст для ${endpoint}:`, textData.length, 'символов');
      return textData;
      
    } catch (error) {
      console.error(`💥 ExternalUsersService: Критическая ошибка запроса к ${endpoint}:`, error);
      
      // При сетевых ошибках сбрасываем кэш - возможно изменился URL
      if (error instanceof TypeError || error.message.includes('fetch')) {
        console.log('🔄 ExternalUsersService: Сброс кэша из-за сетевой ошибки');
        this.clearConfigCache();
      }
      
      throw error;
    }
  }

  private transformUserFromDB(dbUser: any): User {
    // Извлекаем роли из preferences если они там есть
    const preferences = dbUser.preferences || {};
    const roles = [];

    // Если в preferences есть данные о роли, создаем объект роли
    if (preferences.role && preferences.role_id) {
      roles.push({
        role_id: preferences.role_id,
        role_name: preferences.role,
        role_code: preferences.role,
        permissions: preferences.permissions || []
      });
    }

    return {
      id: dbUser.id,
      tenant_id: dbUser.tenant_id || '00000000-0000-0000-0000-000000000001',
      email: dbUser.email,
      name: dbUser.name,
      phone: dbUser.phone,
      status: dbUser.status as UserStatus,
      roles: roles,
      direct_permissions: preferences.permissions || [],
      preferences: preferences,
      pwd_salt: dbUser.pwd_salt,
      pwd_hash: dbUser.pwd_hash,
      last_login: dbUser.last_login ? new Date(dbUser.last_login) : undefined,
      created_at: new Date(dbUser.created_at),
      updated_at: new Date(dbUser.updated_at),
      deleted_at: dbUser.deleted_at ? new Date(dbUser.deleted_at) : undefined
    };
  }

  async getAllUsers(): Promise<User[]> {
    try {
      console.log('externalUsersService: Загружаем всех пользователей из таблицы users...');
      const response = await this.makeRequest(
        'users?deleted_at=is.null&order=created_at.desc',
        { method: 'GET' }
      );

      console.log('externalUsersService: Получен ответ от таблицы users:', response);
      const users = response.map((user: any) => this.transformUserFromDB(user));
      console.log('externalUsersService: Обработанные пользователи:', users);
      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const response = await this.makeRequest(
        `users?id=eq.${id}&deleted_at=is.null&limit=1`,
        { method: 'GET' }
      );

      if (response.length === 0) return null;
      
      return this.transformUserFromDB(response[0]);
    } catch (error) {
      console.error('Error fetching user by id:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const response = await this.makeRequest(
        `users?email=eq.${encodeURIComponent(email)}&deleted_at=is.null&limit=1`,
        { method: 'GET' }
      );

      if (response.length === 0) return null;

      return this.transformUserFromDB(response[0]);
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw error;
    }
  }

  async getUserByEmailWithRoles(email: string): Promise<User | null> {
    try {
      console.log('🔍 ExternalUsersService: Ищем пользователя с ролями по email:', email);

      // Получаем базовые данные пользователя
      const response = await this.makeRequest(
        `users?email=eq.${encodeURIComponent(email)}&deleted_at=is.null&limit=1`,
        { method: 'GET' }
      );

      if (response.length === 0) {
        console.log('❌ ExternalUsersService: Пользователь не найден:', email);
        return null;
      }

      const user = this.transformUserFromDB(response[0]);
      console.log('✅ ExternalUsersService: Найден пользователь:', user.email);

      // Получаем назначения ролей для этого пользователя
      const userRolesData = await this.makeRequest(
        `user_roles?user_id=eq.${user.id}&is_active=eq.true&deleted_at=is.null`,
        { method: 'GET' }
      );
      console.log('📋 ExternalUsersService: Найдено назначений ролей:', userRolesData.length);

      if (userRolesData.length === 0) {
        console.log('⚠️ ExternalUsersService: У пользователя нет активных ролей');
        return { ...user, roles: [] };
      }

      // Получаем данные о ролях
      const roleIds = userRolesData.map((ur: any) => ur.role_id);
      const rolesResponse = await this.makeRequest(
        `roles?id=in.(${roleIds.join(',')})&deleted_at=is.null&is_active=eq.true`,
        { method: 'GET' }
      );
      console.log('🎭 ExternalUsersService: Найдено активных ролей:', rolesResponse.length);

      // Создаем карту ролей
      const rolesMap = new Map();
      rolesResponse.forEach((role: any) => {
        rolesMap.set(role.id, role);
      });

      // Формируем роли пользователя
      const userRoles = userRolesData
        .map((ur: any) => {
          const roleData = rolesMap.get(ur.role_id);
          if (!roleData) return null;

          return {
            role_id: ur.role_id,
            role_code: roleData.code,
            role_name: roleData.name,
            scope: roleData.scope,
            scope_value: ur.scope_value,
            permissions: roleData.permissions || [],
            assigned_at: new Date(ur.assigned_at),
            expires_at: ur.expires_at ? new Date(ur.expires_at) : undefined
          };
        })
        .filter(role => role !== null);

      const userWithRoles = { ...user, roles: userRoles };
      console.log('✅ ExternalUsersService: Пользователь с ролями готов:', userWithRoles.email, 'ролей:', userRoles.length);

      return userWithRoles;
    } catch (error) {
      console.error('❌ ExternalUsersService: Ошибка получения пользователя с ролями:', error);
      throw error;
    }
  }

  async getDeletedUserByEmail(email: string): Promise<User | null> {
    try {
      const response = await this.makeRequest(
        `users?email=eq.${encodeURIComponent(email)}&deleted_at=not.is.null&limit=1`,
        { method: 'GET' }
      );

      if (response.length === 0) return null;
      
      return this.transformUserFromDB(response[0]);
    } catch (error) {
      console.error('Error fetching deleted user by email:', error);
      throw error;
    }
  }

  async createUser(input: CreateUserInput): Promise<User> {
    try {
      // Проверяем, есть ли удаленный пользователь с таким email
      const deletedUser = await this.getDeletedUserByEmail(input.email);
      if (deletedUser) {
        throw new Error(`Пользователь с email ${input.email} был удален ранее. Для повторного использования этого email обратитесь к администратору системы для восстановления учетной записи.`);
      }

      // Генерируем соль и хешируем пароль
      const salt = this.generateSalt();
      const passwordHash = await this.hashPassword(input.password, salt);

      const userData = {
        tenant_id: '00000000-0000-0000-0000-000000000001', // Дефолтный тенант
        email: input.email,
        name: input.name,
        phone: input.phone || null,
        status: input.status || 'active',
        pwd_salt: salt,
        pwd_hash: passwordHash,
        preferences: {}
      };

      const response = await this.makeRequest('users', {
        method: 'POST',
        body: JSON.stringify(userData)
      });

      const createdUser = this.transformUserFromDB(response[0]);

      // Если указаны роли, назначаем их
      if (input.roles && input.roles.length > 0) {
        await this.assignRolesToUser(createdUser.id, input.roles);
      }

      return createdUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    try {
      const updateData: any = {};
      
      if (input.email !== undefined) updateData.email = input.email;
      if (input.name !== undefined) updateData.name = input.name;
      if (input.phone !== undefined) updateData.phone = input.phone;
      if (input.status !== undefined) updateData.status = input.status;
      
      updateData.updated_at = new Date().toISOString();

      const response = await this.makeRequest(`users?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });

      return this.transformUserFromDB(response[0]);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      // Soft delete
      await this.makeRequest(`users?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async restoreUser(id: string): Promise<User> {
    try {
      // Восстанавливаем пользователя (убираем deleted_at)
      const response = await this.makeRequest(`users?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          deleted_at: null,
          updated_at: new Date().toISOString()
        })
      });

      return this.transformUserFromDB(response[0]);
    } catch (error) {
      console.error('Error restoring user:', error);
      throw error;
    }
  }

  async permanentlyDeleteAllSoftDeletedUsers(): Promise<{ deletedCount: number }> {
    try {
      console.log('🗑️ Начинаем физическое удаление всех помеченных как удаленные пользователей...');
      
      // Сначала получаем список всех удаленных пользователей
      const deletedUsers = await this.makeRequest(
        'users?deleted_at=not.is.null',
        { method: 'GET' }
      );

      console.log(`📊 Найдено удаленных пользователей: ${deletedUsers.length}`);

      if (deletedUsers.length === 0) {
        return { deletedCount: 0 };
      }

      // Показываем список пользователей, которые будут удалены
      deletedUsers.forEach((user: any, index: number) => {
        console.log(`${index + 1}. ${user.email} (${user.name}) - удален ${user.deleted_at}`);
      });

      // Получаем IDs удаленных пользователей для очистки связанных данных
      const deletedUserIds = deletedUsers.map((user: any) => user.id);
      console.log(`🔗 IDs удаленных пользователей:`, deletedUserIds);

      // Сначала удаляем все назначения ролей для удаленных пользователей
      for (const userId of deletedUserIds) {
        console.log(`🧹 Удаляем назначения ролей для пользователя ${userId}...`);
        try {
          await this.makeRequest(`user_roles?user_id=eq.${userId}`, {
            method: 'DELETE'
          });
          console.log(`✅ Назначения ролей удалены для пользователя ${userId}`);
        } catch (roleError) {
          console.warn(`⚠️ Ошибка при удалении ролей для пользователя ${userId}:`, roleError);
        }
      }

      // Теперь можем безопасно удалить пользователей
      console.log('🗑️ Удаляем пользователей после очистки связанных данных...');
      await this.makeRequest('users?deleted_at=not.is.null', {
        method: 'DELETE'
      });

      console.log(`✅ Успешно физически удалено пользователей: ${deletedUsers.length}`);
      
      return { deletedCount: deletedUsers.length };
    } catch (error) {
      console.error('Error permanently deleting soft-deleted users:', error);
      throw error;
    }
  }

  async changePassword(userId: string, newPassword: string): Promise<void> {
    try {
      const salt = this.generateSalt();
      const passwordHash = await this.hashPassword(newPassword, salt);

      await this.makeRequest(`users?id=eq.${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          pwd_salt: salt,
          pwd_hash: passwordHash,
          updated_at: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  async getUsersWithRoles(): Promise<User[]> {
    try {
      console.log('externalUsersService: Загружаем пользователей с ролями...');
      
      // Получаем всех пользователей
      const users = await this.getAllUsers();
      console.log('externalUsersService: Получено пользователей:', users.length);

      // Получаем все назначения ролей
      const userRolesData = await this.makeRequest(
        'user_roles?is_active=eq.true&deleted_at=is.null',
        { method: 'GET' }
      );
      console.log('externalUsersService: Получено назначений ролей:', userRolesData.length);

      // Получаем все роли
      const rolesData = await this.makeRequest(
        'roles?deleted_at=is.null&is_active=eq.true',
        { method: 'GET' }
      );
      console.log('externalUsersService: Получено ролей:', rolesData.length);

      // Создаем карту ролей для быстрого поиска
      const rolesMap = new Map();
      rolesData.forEach((role: any) => {
        rolesMap.set(role.id, role);
      });

      // Добавляем роли к пользователям
      const usersWithRoles = users.map(user => {
        const userRoles = userRolesData
          .filter((ur: any) => ur.user_id === user.id)
          .map((ur: any) => {
            const roleData = rolesMap.get(ur.role_id);
            if (!roleData) return null;
            
            return {
              role_id: ur.role_id,
              role_code: roleData.code,
              role_name: roleData.name,
              scope: roleData.scope,
              scope_value: ur.scope_value,
              permissions: roleData.permissions || [],
              assigned_at: new Date(ur.assigned_at),
              expires_at: ur.expires_at ? new Date(ur.expires_at) : undefined
            };
          })
          .filter(role => role !== null);

        return {
          ...user,
          roles: userRoles
        };
      });

      console.log('externalUsersService: Пользователи с назначенными ролями:', usersWithRoles);
      return usersWithRoles;
    } catch (error) {
      console.error('Error fetching users with roles:', error);
      // Фоллбек - получаем просто пользователей без ролей
      try {
        const users = await this.getAllUsers();
        return users.map(user => ({ ...user, roles: [] }));
      } catch (fallbackError) {
        console.error('Error in fallback getAllUsers:', fallbackError);
        return [];
      }
    }
  }

  private async assignRolesToUser(userId: string, roleIds: string[]): Promise<void> {
    try {
      const assignments = roleIds.map(roleId => ({
        user_id: userId,
        role_id: roleId,
        assigned_by: '00000000-0000-0000-0000-000000000001' // Системный пользователь
      }));

      await this.makeRequest('user_roles', {
        method: 'POST',
        body: JSON.stringify(assignments)
      });
    } catch (error) {
      console.error('Error assigning roles to user:', error);
      throw error;
    }
  }

  private generateSalt(): string {
    // Генерируем криптографически стойкую соль как Base64 (совместимо с CryptoUtils)
    const salt = new Uint8Array(16); // 16 байт как в CryptoUtils
    crypto.getRandomValues(salt);
    return this.arrayBufferToBase64(salt);
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private async hashPassword(password: string, salt: string): Promise<string> {
    // Используем PBKDF2 для совместимости с authService
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);
    const saltBytes = this.base64ToArrayBuffer(salt);

    // Импортируем пароль как ключ для PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBytes,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    // Выполняем PBKDF2 хеширование (совместимо с CryptoUtils)
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: 100000, // Такие же итерации как в CryptoUtils
        hash: 'SHA-256'
      },
      keyMaterial,
      32 * 8  // 32 байта в битах
    );

    return this.arrayBufferToBase64(hashBuffer);
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Простая проверка доступности API без запроса к конкретной таблице
      const config = this.getConfig();
      const response = await fetch(`${config.url}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': config.apiKey,
          'Authorization': `Bearer ${config.apiKey}`
        }
      });

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Метод для получения статистики пользователей
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
      console.error('Error fetching user stats:', error);
      return { total: 0, active: 0, inactive: 0, blocked: 0 };
    }
  }
}

export const externalUsersService = new ExternalUsersService();