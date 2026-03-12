/**
 * Сервис авторизации с безопасным переходным режимом.
 * `legacy` — устаревшая схема прямой работы с БД.
 * `backend` — работа только через backend `/api/auth`.
 */

import { auditLogService } from '../auditLogService';
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

type AuthMode = 'legacy' | 'backend';

class AuthService {
  private readonly authMode: AuthMode =
    import.meta.env.VITE_AUTH_API_MODE === 'legacy' ? 'legacy' : 'backend';

  private readonly BACKEND_AUTH_URL = `${getBackendOrigin()}/api/auth`;
  private readonly SUPABASE_URL = this.getSupabaseUrl();
  private readonly SUPABASE_KEY = this.getSupabaseKey();

  isBackendMode(): boolean {
    return this.authMode === 'backend';
  }

  private getStoredAuthToken(): string {
    return localStorage.getItem('auth_token')
      || sessionStorage.getItem('auth_token')
      || localStorage.getItem('tradeframe_token_v2')
      || localStorage.getItem('authToken')
      || '';
  }

  /** @deprecated Legacy режим отключён. Все запросы через backend API. */
  private getSupabaseKey(): string {
    return '';
  }

  /** @deprecated Legacy режим отключён. Все запросы через backend API. */
  private getSupabaseUrl(): string {
    return '';
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

  private async makeLegacyRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const isProxy = this.SUPABASE_URL.includes('/api/supabase');
    const url = isProxy
      ? `${this.SUPABASE_URL}/${endpoint}`
      : `${this.SUPABASE_URL}/rest/v1/${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        apikey: this.SUPABASE_KEY,
        Authorization: `Bearer ${this.SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...options.headers,
      },
    });

    const body = await this.parseResponse(response);

    if (!response.ok) {
      throw new Error(`Ошибка запроса к базе данных: ${response.status} ${JSON.stringify(body)}`);
    }

    return body;
  }

  async getCurrentUser(): Promise<AppUser | null> {
    if (!this.isBackendMode()) {
      return null;
    }

    const token = this.getStoredAuthToken();
    if (!token || token.split('.').length !== 3) {
      return null;
    }

    try {
      return await this.makeBackendRequest('/me', { method: 'GET' }, true);
    } catch (err: any) {
      // 401/403 — токен невалиден, реальный logout
      if (err.status === 401 || err.status === 403) {
        return null;
      }
      // Транзитные ошибки (429, 500, сеть) — не разлогинивать
      throw err;
    }
  }

  private async getLegacyUserByEmail(email: string): Promise<DatabaseUser | null> {
    const users = await this.makeLegacyRequest(
      `users?select=*,user_roles(scope_value,role:roles(*))&email=ilike.${encodeURIComponent(email)}&deleted_at=is.null&limit=1`
    );

    if (!Array.isArray(users) || users.length === 0) {
      return null;
    }

    return users[0];
  }

  async getUserByEmail(email: string): Promise<DatabaseUser | null> {
    if (this.isBackendMode()) {
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

    return this.getLegacyUserByEmail(email);
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
    if (this.isBackendMode()) {
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

    const dbUser = await this.getLegacyUserByEmail(email);
    if (!dbUser) {
      return null;
    }

    const isValidPassword = await this.verifyPassword(dbUser, password);
    if (!isValidPassword) {
      await auditLogService.logAuthentication('failed_login', email, {
        reason: 'Неверный пароль',
        success: false,
      });
      return null;
    }

    const appUser = this.transformUser(dbUser);

    try {
      await this.makeLegacyRequest(`users?id=eq.${appUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          last_login: new Date().toISOString(),
        }),
      });
    } catch {
      // last_login не должен ломать вход
    }

    await auditLogService.logAuthentication('login', email, {
      user_id: appUser.id,
      user_name: appUser.name,
      role: appUser.role,
      success: true,
    });

    return { user: appUser };
  }

  private transformUser(dbUser: DatabaseUser): AppUser {
    const userRoles = dbUser.user_roles || [];
    const primaryRole = userRoles[0]?.role;
    const roleNameToCode: Record<string, string> = {
      'Суперадминистратор': 'super_admin',
      'Администратор сети': 'network_admin',
      'Менеджер': 'manager',
      'Оператор': 'operator',
      'Менеджер БТО': 'bto_manager',
    };

    let userRole = 'user';
    let roleId = 0;

    if (primaryRole) {
      userRole = primaryRole.code || roleNameToCode[primaryRole.name] || primaryRole.name;
      roleId = primaryRole.id;
    }

    const allPermissions: (Permission | string)[] = [];
    const permissionSet = new Set<string>();

    userRoles.forEach((userRoleItem: any) => {
      const role = userRoleItem.role;
      if (!role || !role.permissions) {
        return;
      }

      role.permissions.forEach((permission: any) => {
        const key = typeof permission === 'object'
          ? `${permission.section}.${permission.resource}`
          : String(permission);

        if (!permissionSet.has(key)) {
          permissionSet.add(key);
          allPermissions.push(permission);
        }
      });
    });

    const roles: UserRole[] = userRoles
      .filter((userRoleItem: any) => userRoleItem.role)
      .map((userRoleItem: any) => {
        const role = userRoleItem.role;
        let userScopeValues: string[] = [];

        if (userRoleItem.scope_value) {
          try {
            const parsed = typeof userRoleItem.scope_value === 'string'
              ? JSON.parse(userRoleItem.scope_value)
              : userRoleItem.scope_value;
            if (Array.isArray(parsed)) {
              userScopeValues = parsed;
            } else if (parsed) {
              userScopeValues = [String(parsed)];
            }
          } catch {
            userScopeValues = [String(userRoleItem.scope_value)];
          }
        }

        const effectiveScopeValues = userScopeValues.length > 0
          ? userScopeValues
          : (role.scope_values || []);

        return {
          roleId: String(role.id),
          roleName: role.name,
          roleCode: role.code || roleNameToCode[role.name] || role.name,
          scope: role.scope,
          scopeValues: effectiveScopeValues,
          permissions: role.permissions || [],
        };
      });

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      phone: dbUser.phone,
      status: dbUser.status,
      role: userRole,
      roleId,
      permissions: allPermissions,
      roles,
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
    if (this.isBackendMode()) {
      await this.makeBackendRequest('/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: newName.trim() }),
      }, true);
      return;
    }

    await this.makeLegacyRequest(`users?id=eq.${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: newName.trim(),
        updated_at: new Date().toISOString(),
      }),
    });
  }

  async changePassword(
    userId: string,
    email: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    if (this.isBackendMode()) {
      await this.makeBackendRequest('/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }, true);
      return;
    }

    const dbUser = await this.getLegacyUserByEmail(email);
    if (!dbUser) {
      throw new Error('Пользователь не найден');
    }

    const isValidPassword = await this.verifyPassword(dbUser, currentPassword);
    if (!isValidPassword) {
      throw new Error('Неверный текущий пароль');
    }

    const newSalt = this.generateSalt();
    const newHash = await this.createPasswordHash(newPassword, newSalt);

    await this.makeLegacyRequest(`users?id=eq.${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        pwd_salt: newSalt,
        pwd_hash: newHash,
        updated_at: new Date().toISOString(),
      }),
    });
  }

  async logout(): Promise<void> {
    if (!this.isBackendMode()) {
      return;
    }

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
