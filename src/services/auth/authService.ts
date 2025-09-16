/**
 * Чистый сервис авторизации
 * Работает напрямую с Supabase без лишних абстракций
 */

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
  private readonly SUPABASE_URL = 'https://ssvazdgnmatbdynkhkqo.supabase.co';
  private readonly SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

  /**
   * Выполняет HTTP запрос к Supabase
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.SUPABASE_URL}/rest/v1/${endpoint}`;

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

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Database request failed: ${response.status} ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  /**
   * Ищет пользователя по email в базе данных с ролями (новая схема БД)
   */
  async getUserByEmail(email: string): Promise<DatabaseUser | null> {
    try {
      console.log('🔍 AuthService: Searching for user with roles:', email);

      // НОВАЯ СХЕМА: получаем пользователя с ролями через джойн
      const users = await this.makeRequest(
        `users?select=*,user_roles(role:roles(*))&email=ilike.${encodeURIComponent(email)}&deleted_at=is.null&limit=1`
      );

      if (users.length === 0) {
        console.log('❌ AuthService: User not found');
        return null;
      }

      const user = users[0];
      console.log('✅ AuthService: User found');
      console.log('🔍 DEBUG: User roles from new schema:', user.user_roles);

      // Логируем роли из новой схемы БД
      const userRoles = user.user_roles || [];
      console.log('🎭 AuthService: User roles from database:', userRoles);

      return user;
    } catch (error) {
      console.error('❌ AuthService: Error finding user:', error);
      throw error;
    }
  }

  /**
   * Проверяет пароль пользователя (простой SHA-256)
   */
  async verifyPassword(user: DatabaseUser, password: string): Promise<boolean> {
    if (!password || password.length < 1) {
      console.log('❌ AuthService: Empty password');
      return false;
    }

    if (!user.pwd_salt || !user.pwd_hash) {
      console.log('❌ AuthService: User has no password data');
      return false;
    }

    console.log('🔐 AuthService: Verifying password with SHA-256...');

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

      console.log(`🔍 Password check result: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
      console.log(`📝 Input: "${password}" + "${user.pwd_salt}"`);
      console.log(`🔑 Computed: ${computedHash.substring(0, 20)}...`);
      console.log(`🗃️ Stored:   ${user.pwd_hash.substring(0, 20)}...`);

      return isValid;
    } catch (error) {
      console.error('❌ AuthService: Password verification error:', error);
      return false;
    }
  }

  /**
   * Аутентифицирует пользователя
   */
  async authenticate(email: string, password: string): Promise<AppUser | null> {
    try {
      console.log('🔐 AuthService: Authenticating user:', email);

      const dbUser = await this.getUserByEmail(email);
      if (!dbUser) {
        return null;
      }

      const isValidPassword = await this.verifyPassword(dbUser, password);
      if (!isValidPassword) {
        return null;
      }

      // Трансформируем пользователя из БД в формат приложения
      const appUser = this.transformUser(dbUser);
      console.log('✅ AuthService: Authentication successful for:', appUser.email);

      return appUser;
    } catch (error) {
      console.error('❌ AuthService: Authentication error:', error);
      throw error;
    }
  }

  /**
   * Трансформирует пользователя из БД в формат приложения (НОВАЯ СХЕМА)
   */
  private transformUser(dbUser: DatabaseUser): AppUser {
    console.log('🔄 AuthService: Transforming user with new DB schema');
    console.log('🔍 DEBUG: dbUser.user_roles =', dbUser.user_roles);

    // Получаем первую (основную) роль пользователя из новой схемы БД
    const userRoles = dbUser.user_roles || [];
    const primaryRole = userRoles[0]?.role;

    let userRole = 'user';
    let roleId = 0;
    let permissions: string[] = [];

    if (primaryRole) {
      console.log('🎭 AuthService: Found primary role:', primaryRole);

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
          console.log('🎭 РОЛЬ МАППИНГ:', primaryRole.name, '->', roleNameToCode[primaryRole.name]);
          userRole = roleNameToCode[primaryRole.name];
        }
      }
    } else {
      console.log('⚠️ AuthService: No roles found, using default role "user"');
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

    console.log('✅ AuthService: Transformed user role:', userRole);
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
      console.log('🔄 AuthService: Updating user name for:', userId);

      await this.makeRequest(`users?id=eq.${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: newName.trim(),
          updated_at: new Date().toISOString()
        })
      });

      console.log('✅ AuthService: User name updated successfully');
    } catch (error) {
      console.error('❌ AuthService: Error updating user name:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
export type { AppUser };