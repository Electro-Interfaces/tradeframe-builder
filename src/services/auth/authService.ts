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
  preferences: {
    role?: string;
    role_id?: number;
    permissions?: string[];
    [key: string]: any;
  };
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
   * Ищет пользователя по email в базе данных (регистронезависимый поиск)
   */
  async getUserByEmail(email: string): Promise<DatabaseUser | null> {
    try {
      console.log('🔍 AuthService: Searching for user:', email);

      // Используем ilike для регистронезависимого поиска
      const users = await this.makeRequest(
        `users?email=ilike.${encodeURIComponent(email)}&deleted_at=is.null&limit=1`
      );

      if (users.length === 0) {
        console.log('❌ AuthService: User not found');
        return null;
      }

      console.log('✅ AuthService: User found');
      return users[0];
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
   * Трансформирует пользователя из БД в формат приложения
   */
  private transformUser(dbUser: DatabaseUser): AppUser {
    const preferences = dbUser.preferences || {};

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      phone: dbUser.phone,
      status: dbUser.status,
      role: preferences.role || 'user',
      roleId: preferences.role_id || 0,
      permissions: preferences.permissions || []
    };
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
}

export const authService = new AuthService();
export type { AppUser };