/**
 * Сервис для работы с профилем пользователя во внешней базе данных Supabase
 */

import { User, UserPreferences } from '@/types/auth';

interface ExternalDatabaseConfig {
  url: string;
  apiKey: string;
}

class ExternalProfileService {
  private config: ExternalDatabaseConfig | null = null;

  private getConfig(): ExternalDatabaseConfig {
    if (this.config) return this.config;

    const savedSettings = localStorage.getItem('externalDatabase');
    if (!savedSettings) {
      throw new Error('Настройки подключения к внешней базе данных не найдены');
    }

    try {
      const parsed = JSON.parse(savedSettings);
      if (!parsed.url || !parsed.apiKey) {
        throw new Error('Неполные настройки подключения к базе данных');
      }
      
      this.config = {
        url: parsed.url,
        apiKey: parsed.apiKey
      };
      
      return this.config;
    } catch (error) {
      throw new Error('Ошибка чтения настроек подключения к базе данных');
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const config = this.getConfig();
    
    const response = await fetch(`${config.url}/rest/v1/${endpoint}`, {
      ...options,
      headers: {
        'apikey': config.apiKey,
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Database error: ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  }

  // Получение профиля текущего пользователя (демо версия)
  async getCurrentUserProfile(): Promise<User | null> {
    try {
      // В демо версии используем localStorage для получения текущего пользователя
      const currentUser = localStorage.getItem('currentUser');
      if (!currentUser) {
        // Возвращаем системного администратора по умолчанию
        const response = await this.makeRequest(
          'users?email=eq.admin@system.local&deleted_at=is.null&limit=1',
          { method: 'GET' }
        );

        if (response.length === 0) return null;

        const user = response[0];
        return {
          id: user.id,
          tenant_id: user.tenant_id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          status: user.status,
          roles: [], // Роли загружаются отдельно
          direct_permissions: [],
          preferences: user.preferences || {},
          pwd_salt: user.pwd_salt,
          pwd_hash: user.pwd_hash,
          last_login: user.last_login ? new Date(user.last_login) : undefined,
          created_at: new Date(user.created_at),
          updated_at: new Date(user.updated_at),
          deleted_at: user.deleted_at ? new Date(user.deleted_at) : undefined
        };
      }

      return JSON.parse(currentUser);
    } catch (error) {
      console.error('Error fetching current user profile:', error);
      return null;
    }
  }

  // Обновление основной информации профиля
  async updateProfile(profileData: {
    name?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    position?: string;
    department?: string;
  }): Promise<User> {
    try {
      const currentUser = await this.getCurrentUserProfile();
      if (!currentUser) {
        throw new Error('Пользователь не найден');
      }

      const updateData: any = {};
      
      if (profileData.name !== undefined) updateData.name = profileData.name;
      if (profileData.phone !== undefined) updateData.phone = profileData.phone;
      if (profileData.first_name !== undefined) updateData.first_name = profileData.first_name;
      if (profileData.last_name !== undefined) updateData.last_name = profileData.last_name;
      if (profileData.middle_name !== undefined) updateData.middle_name = profileData.middle_name;
      if (profileData.position !== undefined) updateData.position = profileData.position;
      if (profileData.department !== undefined) updateData.department = profileData.department;
      
      updateData.updated_at = new Date().toISOString();

      const response = await this.makeRequest(`users?id=eq.${currentUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });

      const updatedUser = {
        ...currentUser,
        ...updateData,
        updated_at: new Date(updateData.updated_at)
      };

      // Обновляем localStorage для демо версии
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));

      return updatedUser;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  // Смена email
  async changeEmail(newEmail: string): Promise<void> {
    try {
      const currentUser = await this.getCurrentUserProfile();
      if (!currentUser) {
        throw new Error('Пользователь не найден');
      }

      // Проверяем, что email не занят
      const existingUser = await this.makeRequest(
        `users?email=eq.${encodeURIComponent(newEmail)}&id=neq.${currentUser.id}&deleted_at=is.null&limit=1`,
        { method: 'GET' }
      );

      if (existingUser.length > 0) {
        throw new Error('Этот email уже используется другим пользователем');
      }

      await this.makeRequest(`users?id=eq.${currentUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          email: newEmail,
          updated_at: new Date().toISOString()
        })
      });

      // Обновляем localStorage для демо версии
      const updatedUser = { ...currentUser, email: newEmail };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error changing email:', error);
      throw error;
    }
  }

  // Смена пароля
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const currentUser = await this.getCurrentUserProfile();
      if (!currentUser) {
        throw new Error('Пользователь не найден');
      }

      // В реальном приложении здесь должна быть проверка текущего пароля
      // Для демо версии просто обновляем пароль

      const salt = this.generateSalt();
      const passwordHash = await this.hashPassword(newPassword, salt);

      await this.makeRequest(`users?id=eq.${currentUser.id}`, {
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

  // Обновление настроек пользователя
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<void> {
    try {
      const currentUser = await this.getCurrentUserProfile();
      if (!currentUser) {
        throw new Error('Пользователь не найден');
      }

      const currentPreferences = currentUser.preferences || {};
      const newPreferences = { ...currentPreferences, ...preferences };

      await this.makeRequest(`users?id=eq.${currentUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          preferences: newPreferences,
          updated_at: new Date().toISOString()
        })
      });

      // Обновляем localStorage для демо версии
      const updatedUser = { ...currentUser, preferences: newPreferences };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  // Получение ролей текущего пользователя
  async getCurrentUserRoles(): Promise<any[]> {
    try {
      const currentUser = await this.getCurrentUserProfile();
      if (!currentUser) return [];

      const response = await this.makeRequest(
        `user_roles_view?user_id=eq.${currentUser.id}&is_role_valid=eq.true`,
        { method: 'GET' }
      );

      return response;
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }
  }

  // Утилиты для работы с паролями (аналогично usersService)
  private generateSalt(): string {
    // Простая генерация соли как в authService
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private async hashPassword(password: string, salt: string): Promise<string> {
    // Простое хеширование SHA-256 как в authService
    const passwordWithSalt = password + salt;

    // Используем SHA-256 если доступен, иначе base64
    if (crypto && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(passwordWithSalt);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return btoa(String.fromCharCode(...hashArray));
    } else {
      return btoa(passwordWithSalt);
    }
  }

  // Обновление времени последнего входа
  async updateLastLogin(): Promise<void> {
    try {
      const currentUser = await this.getCurrentUserProfile();
      if (!currentUser) return;

      await this.makeRequest(`users?id=eq.${currentUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.makeRequest('users?limit=1', { method: 'GET' });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export const externalProfileService = new ExternalProfileService();