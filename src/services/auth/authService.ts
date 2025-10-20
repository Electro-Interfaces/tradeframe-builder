/**
 * Чистый сервис авторизации
 * Работает напрямую с Supabase без лишних абстракций
 */

import { auditLogService } from '../auditLogService';

interface DatabaseUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  status: string;
  pwd_salt: string;
  pwd_hash: string;
  user_roles: Array<{
    role: {
      id: number;
      name: string;
      code: string;
      permissions: string[];
    }
  }>;
  created_at: string;
  updated_at: string;
}

interface AppUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  status: string;
  role: string;
  roleId: number;
  permissions: string[];
}

class AuthService {
  // Определяем URL в зависимости от окружения
  private readonly SUPABASE_URL = this.getSupabaseUrl();
  private readonly SUPABASE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

  /**
   * Определяет URL для Supabase в зависимости от окружения
   * - localhost → прямой доступ к Supabase
   * - testtf.dataworker.ru → через backend proxy
   * - prod.dataworker.ru → через backend proxy
   */
  private getSupabaseUrl(): string {
    const hostname = window.location.hostname;

    // На production используем backend proxy
    if (hostname === 'prod.dataworker.ru') {
      return 'https://prod.dataworker.ru/api/supabase';
    }

    // На test используем backend proxy
    if (hostname === 'testtf.dataworker.ru' || hostname.includes('github.io')) {
      return 'https://testtf.dataworker.ru/api/supabase';
    }

    // Локально - прямой доступ к Supabase
    return import.meta.env.VITE_SUPABASE_URL || 'https://ssvazdgnmatbdynkhkqo.supabase.co';
  }

  /**
   * Выполняет HTTP запрос к Supabase
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    // Если используем proxy, /rest/v1/ уже добавлен в proxy route
    // Если прямой доступ к Supabase, добавляем /rest/v1/
    const isProxy = this.SUPABASE_URL.includes('/api/supabase');
    const url = isProxy
      ? `${this.SUPABASE_URL}/${endpoint}`
      : `${this.SUPABASE_URL}/rest/v1/${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'apikey': this.SUPABASE_KEY,
          'Authorization': `Bearer ${this.SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
          ...options.headers,
        },
      });

      // Сначала получаем текст ответа, чтобы избежать двойного чтения stream
      const responseText = await response.text();

      if (!response.ok) {
        let error = {};
        try {
          error = JSON.parse(responseText);
        } catch {
          error = { message: responseText };
        }
        throw new Error(`Ошибка запроса к базе данных: ${response.status} ${JSON.stringify(error)}`);
      }

      // Парсим успешный ответ
      try {
        return JSON.parse(responseText);
      } catch {
        return responseText;
      }
    } catch (error) {
      // Обработка сетевых ошибок (NetworkError, CORS, timeout)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Не удалось подключиться к серверу. Проверьте подключение к интернету или попробуйте позже.');
      }
      throw error;
    }
  }

  /**
   * Ищет пользователя по email в базе данных с ролями (новая схема БД)
   */
  async getUserByEmail(email: string): Promise<DatabaseUser | null> {
    try {

      // НОВАЯ СХЕМА: получаем пользователя с ролями через джойн
      const users = await this.makeRequest(
        `users?select=*,user_roles(role:roles(*))&email=ilike.${encodeURIComponent(email)}&deleted_at=is.null&limit=1`
      );

      if (users.length === 0) {
        return null;
      }

      const user = users[0];

      // Логируем роли из новой схемы БД
      const userRoles = user.user_roles || [];

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Проверяет пароль пользователя (простой SHA-256)
   */
  async verifyPassword(user: DatabaseUser, password: string): Promise<boolean> {
    if (!password || password.length < 1) {
      return false;
    }

    if (!user.pwd_salt || !user.pwd_hash) {
      return false;
    }


    try {
      // Простое хеширование: пароль + соль
      const passwordWithSalt = password + user.pwd_salt;

      // Используем SHA-256 если доступен, иначе base64
      let computedHash: string;

      if (crypto && crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(passwordWithSalt);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        computedHash = btoa(String.fromCharCode(...hashArray));
      } else {
        // Простой base64 fallback
        computedHash = btoa(passwordWithSalt);
      }

      const isValid = computedHash === user.pwd_hash;

      // ВРЕМЕННАЯ ОТЛАДКА
      console.log('🔐 Password Verification Debug:');
      console.log('  Password:', password);
      console.log('  Salt:', user.pwd_salt);
      console.log('  Password+Salt:', passwordWithSalt);
      console.log('  Computed Hash:', computedHash);
      console.log('  Expected Hash:', user.pwd_hash);
      console.log('  Match:', isValid);

      return isValid;
    } catch (error) {
      return false;
    }
  }

  /**
   * Аутентифицирует пользователя
   */
  async authenticate(email: string, password: string): Promise<AppUser | null> {
    try {

      const dbUser = await this.getUserByEmail(email);
      if (!dbUser) {
        return null;
      }

      const isValidPassword = await this.verifyPassword(dbUser, password);
      if (!isValidPassword) {
        // Логируем неудачную попытку входа
        await auditLogService.logAuthentication('failed_login', email, {
          reason: 'Неверный пароль',
          success: false
        });
        return null;
      }

      // Трансформируем пользователя из БД в формат приложения
      const appUser = this.transformUser(dbUser);

      // Логируем успешный вход
      await auditLogService.logAuthentication('login', email, {
        user_id: appUser.id,
        user_name: appUser.name,
        role: appUser.role,
        success: true
      });

      return appUser;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Трансформирует пользователя из БД в формат приложения (НОВАЯ СХЕМА)
   */
  private transformUser(dbUser: DatabaseUser): AppUser {

    // Получаем первую (основную) роль пользователя из новой схемы БД
    const userRoles = dbUser.user_roles || [];
    const primaryRole = userRoles[0]?.role;

    let userRole = 'user';
    let roleId = 0;
    let permissions: string[] = [];

    if (primaryRole) {

      // Используем код роли напрямую из БД или имя роли для маппинга
      userRole = primaryRole.code || primaryRole.name;
      roleId = primaryRole.id;
      permissions = primaryRole.permissions || [];

      // Маппинг имен ролей на коды для совместимости (если код не задан)
      if (!primaryRole.code) {
        const roleNameToCode: Record<string, string> = {
          'Суперадминистратор': 'super_admin',
          'Администратор сети': 'network_admin',
          'Менеджер': 'manager',
          'Оператор': 'operator',
          'Менеджер БТО': 'bto_manager'
        };

        if (roleNameToCode[primaryRole.name]) {
          userRole = roleNameToCode[primaryRole.name];
        }
      }
    } else {
    }

    const appUser = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      phone: dbUser.phone,
      status: dbUser.status,
      role: userRole,
      roleId: roleId,
      permissions: permissions
    };

    return appUser;
  }

  /**
   * Создает простой хеш для пароля (SHA-256 или base64)
   */
  async createPasswordHash(password: string, salt: string): Promise<string> {
    const passwordWithSalt = password + salt;

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

  /**
   * Генерирует простую соль
   */
  generateSalt(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Обновляет имя пользователя в базе данных
   */
  async updateUserName(userId: string, newName: string): Promise<void> {
    try {

      await this.makeRequest(`users?id=eq.${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: newName.trim(),
          updated_at: new Date().toISOString()
        })
      });

    } catch (error) {
      throw error;
    }
  }

  /**
   * Изменяет пароль пользователя
   */
  async changePassword(userId: string, email: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // 1. Сначала проверяем текущий пароль
      const dbUser = await this.getUserByEmail(email);
      if (!dbUser) {
        throw new Error('Пользователь не найден');
      }

      const isValidPassword = await this.verifyPassword(dbUser, currentPassword);
      if (!isValidPassword) {
        throw new Error('Неверный текущий пароль');
      }

      // 2. Генерируем новую соль и хеш для нового пароля
      const newSalt = this.generateSalt();
      const newHash = await this.createPasswordHash(newPassword, newSalt);

      // 3. Обновляем пароль в базе данных
      await this.makeRequest(`users?id=eq.${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          pwd_salt: newSalt,
          pwd_hash: newHash,
          updated_at: new Date().toISOString()
        })
      });

    } catch (error) {
      throw error;
    }
  }
}

export const authService = new AuthService();
export type { AppUser };