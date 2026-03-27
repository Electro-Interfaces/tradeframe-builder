/**
 * Сервис авторизации — все запросы через backend `/api/auth`.
 */

import { getBackendOrigin } from '@/utils/backendUrl';

export interface DatabaseUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  status: string;
  pwd_salt: string;
  pwd_hash: string;
  user_roles: Array<{
    scope_value?: string | string[];
    role: {
      id: number;
      name: string;
      code: string;
      scope?: string;
      scope_values?: string[];
      permissions: string[];
    };
  }>;
  created_at: string;
  updated_at: string;
  role?: string;
}

interface UserRole {
  roleId: string;
  roleName: string;
  roleCode: string;
  scope?: string;
  scopeValues?: string[];
  permissions: string[];
}

interface Permission {
  section: string;
  resource: string;
  actions: string[];
}

interface AppUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  status: string;
  role: string;
  roleId: number;
  permissions: (Permission | string)[];
  roles: UserRole[];
}

interface AuthSessionResult {
  user: AppUser;
  token?: string;
  expiresAt?: string;
}

class AuthService {
  private readonly BACKEND_AUTH_URL = `${getBackendOrigin()}/api/auth`;

  private getStoredAuthToken(): string {
    return localStorage.getItem('auth_token')
      || sessionStorage.getItem('auth_token')
      || localStorage.getItem('tradeframe_token_v2')
      || localStorage.getItem('authToken')
      || '';
  }

  private async parseResponse(response: Response): Promise<any> {
    const responseText = await response.text();

    if (!responseText) {
      return null;
    }

    try {
      return JSON.parse(responseText);
    } catch {
      return responseText;
    }
  }

  private async makeBackendRequest(
    endpoint: string,
    options: RequestInit = {},
    requiresAuth: boolean = false
  ): Promise<any> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (requiresAuth) {
      const token = this.getStoredAuthToken();
      if (!token) {
        const err = new Error('Токен авторизации отсутствует');
        (err as any).status = 401;
        throw err;
      }
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${this.BACKEND_AUTH_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    const body = await this.parseResponse(response);

    if (!response.ok) {
      const message = body?.error || body?.message || `Ошибка авторизации: ${response.status}`;
      const err = new Error(message);
      (err as any).status = response.status;
      throw err;
    }

    return body;
  }

  async getCurrentUser(): Promise<AppUser | null> {
    const token = this.getStoredAuthToken();
    if (!token || token.split('.').length !== 3) {
      return null;
    }

    try {
      return await this.makeBackendRequest('/me', { method: 'GET' }, true);
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        return null;
      }
      throw err;
    }
  }

  async getUserByEmail(email: string): Promise<DatabaseUser | null> {
    try {
      return await this.makeBackendRequest(
        `/users/by-email?email=${encodeURIComponent(email)}`,
        { method: 'GET' },
        true
      );
    } catch {
      return null;
    }
  }

  async verifyPassword(user: DatabaseUser, password: string): Promise<boolean> {
    if (!password || !user.pwd_salt || !user.pwd_hash) {
      return false;
    }

    try {
      const passwordWithSalt = password + user.pwd_salt;
      let computedHash: string;

      if (crypto && crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(passwordWithSalt);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        computedHash = btoa(String.fromCharCode(...hashArray));
      } else {
        computedHash = btoa(passwordWithSalt);
      }

      return computedHash === user.pwd_hash;
    } catch {
      return false;
    }
  }

  async authenticate(email: string, password: string): Promise<AuthSessionResult | null> {
    const result = await this.makeBackendRequest('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    return {
      user: result.user,
      token: result.token,
      expiresAt: result.expires_at,
    };
  }

  async createPasswordHash(password: string, salt: string): Promise<string> {
    const passwordWithSalt = password + salt;

    if (crypto && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(passwordWithSalt);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return btoa(String.fromCharCode(...hashArray));
    }

    return btoa(passwordWithSalt);
  }

  generateSalt(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (value) => value.toString(36).padStart(2, '0')).join('').substring(0, 24);
  }

  async updateUserName(userId: string, newName: string): Promise<void> {
    await this.makeBackendRequest('/me', {
      method: 'PATCH',
      body: JSON.stringify({ name: newName.trim() }),
    }, true);
  }

  async changePassword(
    userId: string,
    email: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    await this.makeBackendRequest('/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }, true);
  }

  async logout(): Promise<void> {
    const token = this.getStoredAuthToken();
    if (!token || token.split('.').length !== 3) {
      return;
    }

    try {
      await this.makeBackendRequest('/logout', { method: 'POST' }, true);
    } catch {
      // logout на сервере не должен блокировать локальную очистку
    }
  }
}

export const authService = new AuthService();
export type { AppUser, UserRole, Permission, AuthSessionResult };
