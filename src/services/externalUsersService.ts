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
    
    console.log(`🌐 ExternalUsersService: Запрос к ${fullUrl}`, {
      method: options.method || 'GET',
      hasBody: !!options.body
    });

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
    return {
      id: dbUser.id,
      tenant_id: dbUser.tenant_id || '00000000-0000-0000-0000-000000000001',
      email: dbUser.email,
      name: dbUser.name,
      phone: dbUser.phone,
      status: dbUser.status as UserStatus,
      roles: [], // Роли загружаются отдельно
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

  async createUser(input: CreateUserInput): Promise<User> {
    try {
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
      console.log('externalUsersService: Загружаем пользователей...');
      
      // Сначала пробуем получить представление user_roles_view
      try {
        const response = await this.makeRequest(
          'user_roles_view?order=user_created_at.desc',
          { method: 'GET' }
        );

        console.log('externalUsersService: Получен ответ от user_roles_view:', response);

        // Группируем пользователей и их роли
        const usersMap = new Map();
        
        response.forEach((row: any) => {
          const userId = row.user_id;
          
          if (!usersMap.has(userId)) {
            usersMap.set(userId, {
              id: userId,
              tenant_id: row.tenant_id,
              email: row.email,
              name: row.name,
              status: row.status,
              last_login: row.last_login ? new Date(row.last_login) : undefined,
              created_at: new Date(row.user_created_at),
              roles: [],
              direct_permissions: [],
              preferences: {},
              pwd_salt: '',
              pwd_hash: '',
              updated_at: new Date(row.user_created_at)
            });
          }

          if (row.role_id && row.is_role_valid) {
            const user = usersMap.get(userId);
            user.roles.push({
              role_id: row.role_id,
              role_code: row.role_code,
              role_name: row.role_name,
              scope: row.role_scope,
              scope_value: row.scope_value,
              permissions: [], // Будет загружено отдельно при необходимости
              assigned_at: new Date(row.assigned_at),
              expires_at: row.expires_at ? new Date(row.expires_at) : undefined
            });
          }
        });

        const users = Array.from(usersMap.values());
        console.log('externalUsersService: Обработанные пользователи из view:', users);
        return users;
        
      } catch (viewError) {
        console.log('externalUsersService: user_roles_view недоступно, используем простой запрос к users');
        // Фоллбек - получаем просто пользователей
        return this.getAllUsers();
      }
    } catch (error) {
      console.error('Error fetching users with roles:', error);
      // Последний фоллбек - возвращаем пустой массив
      return [];
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
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async hashPassword(password: string, salt: string): Promise<string> {
    // В реальном приложении используйте bcrypt или аналогичную библиотеку
    // Здесь простая имитация для демо
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
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