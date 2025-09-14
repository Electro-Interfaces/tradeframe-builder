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
   * Ищет пользователя по email в базе данных
   */
  async getUserByEmail(email: string): Promise<DatabaseUser | null> {
    try {
      console.log('🔍 AuthService: Searching for user:', email);

      const users = await this.makeRequest(
        `users?email=eq.${encodeURIComponent(email)}&deleted_at=is.null&limit=1`
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
   * Проверяет пароль пользователя
   */
  async verifyPassword(user: DatabaseUser, password: string): Promise<boolean> {
    if (!password || password.length < 3) {
      return false;
    }

    if (!user.pwd_salt || !user.pwd_hash) {
      console.log('❌ AuthService: User has no password data');
      return false;
    }

    try {
      console.log('🔐 AuthService: Verifying password...');

      // Детекция мобильного устройства
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      if (isMobile) {
        console.log('📱 AuthService: Using mobile-optimized verification');
        return await this.verifyPasswordMobile(user, password);
      } else {
        console.log('🖥️ AuthService: Using desktop verification');
        return await this.verifyPasswordDesktop(user, password);
      }
    } catch (error) {
      console.error('❌ AuthService: Password verification failed:', error);
      return false;
    }
  }

  /**
   * Десктопная версия проверки пароля
   */
  private async verifyPasswordDesktop(user: DatabaseUser, password: string): Promise<boolean> {
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);
    const saltBytes = this.base64ToArrayBuffer(user.pwd_salt);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBytes,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      32 * 8
    );

    const computedHash = this.arrayBufferToBase64(hashBuffer);
    const isValid = computedHash === user.pwd_hash;

    console.log(isValid ? '✅ Password valid' : '❌ Password invalid');
    return isValid;
  }

  /**
   * Мобильная версия проверки пароля (меньше итераций)
   */
  private async verifyPasswordMobile(user: DatabaseUser, password: string): Promise<boolean> {
    if (!crypto.subtle) {
      console.error('❌ AuthService: Crypto API not available');
      return false;
    }

    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);
    const saltBytes = this.base64ToArrayBuffer(user.pwd_salt);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBytes,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    // Меньше итераций для мобильных устройств
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: 100000, // Вместо 10000
        hash: 'SHA-256'
      },
      keyMaterial,
      32 * 8
    );

    const computedHash = this.arrayBufferToBase64(hashBuffer);
    const isValid = computedHash === user.pwd_hash;

    console.log(isValid ? '✅ Password valid' : '❌ Password invalid');
    return isValid;
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

  // Вспомогательные методы для работы с Base64
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
}

export const authService = new AuthService();
export type { AppUser };