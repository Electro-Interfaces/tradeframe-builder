import type { CreateUserInput, UpdateUserInput, User, UserStatus } from '@/types/auth';

import { adminApiRequest, isAdminBackendMode } from './adminApiClient';

interface ExternalDatabaseConfig {
  url: string;
  apiKey: string;
}

class AdminUsersService {
  private config: ExternalDatabaseConfig | null = null;
  private lastConfigUpdate = 0;

  /** @deprecated Legacy режим отключён. Все запросы через backend API. */
  private getConfig(): ExternalDatabaseConfig {
    const fixedConfig: ExternalDatabaseConfig = {
      url: import.meta.env.VITE_SUPABASE_URL || '',
      apiKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    };

    const now = Date.now();
    if (this.config && (now - this.lastConfigUpdate) < 1000) {
      return this.config;
    }

    this.config = fixedConfig;
    this.lastConfigUpdate = now;
    return this.config;
  }

  clearConfigCache(): void {
    this.config = null;
    this.lastConfigUpdate = 0;
  }

  private async makeLegacyRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const config = this.getConfig();
    const response = await fetch(`${config.url}/rest/v1/${endpoint}`, {
      ...options,
      headers: {
        apikey: config.apiKey,
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();

      if (response.status === 401 || response.status === 403) {
        this.clearConfigCache();
      }

      throw new Error(`Database error: ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }

    return response.text();
  }

  private transformRole(role: any) {
    return {
      role_id: String(role.role_id || role.id || ''),
      role_code: role.role_code || role.code || '',
      role_name: role.role_name || role.name || '',
      scope: role.scope,
      scope_value: role.scope_value || undefined,
      scopeValues: Array.isArray(role.scopeValues) ? role.scopeValues : [],
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
      assigned_at: role.assigned_at ? new Date(role.assigned_at) : new Date(),
      assigned_by: role.assigned_by || undefined,
      expires_at: role.expires_at ? new Date(role.expires_at) : undefined,
    };
  }

  private transformUserFromDB(dbUser: any): User {
    const preferences = dbUser.preferences || {};
    const roles = Array.isArray(dbUser.roles)
      ? dbUser.roles.map((role) => this.transformRole(role))
      : [];

    if (roles.length === 0 && preferences.role && preferences.role_id) {
      roles.push({
        role_id: String(preferences.role_id),
        role_name: preferences.role,
        role_code: preferences.role,
        permissions: Array.isArray(preferences.permissions) ? preferences.permissions : [],
        scope: 'global',
        assigned_at: new Date(dbUser.created_at || Date.now()),
      });
    }

    return {
      id: dbUser.id,
      tenant_id: dbUser.tenant_id || 'default',
      email: dbUser.email,
      name: dbUser.name || 'Пользователь',
      phone: dbUser.phone || undefined,
      status: (dbUser.status || 'active') as UserStatus,
      roles,
      direct_permissions: Array.isArray(dbUser.direct_permissions)
        ? dbUser.direct_permissions
        : (Array.isArray(preferences.permissions) ? preferences.permissions : []),
      preferences,
      pwd_salt: dbUser.pwd_salt || '',
      pwd_hash: dbUser.pwd_hash || '',
      last_login: dbUser.last_login ? new Date(dbUser.last_login) : undefined,
      created_at: new Date(dbUser.created_at),
      updated_at: new Date(dbUser.updated_at || dbUser.created_at),
      deleted_at: dbUser.deleted_at ? new Date(dbUser.deleted_at) : undefined,
    };
  }

  private isNotFound(error: unknown): boolean {
    return error instanceof Error
      && (error.message.includes('404') || error.message.includes('не найден') || error.message.includes('not found'));
  }

  async getAllUsers(): Promise<User[]> {
    if (isAdminBackendMode()) {
      const response = await adminApiRequest('/users');
      return (response || []).map((user: any) => this.transformUserFromDB(user));
    }

    const response = await this.makeLegacyRequest(
      'users?deleted_at=is.null&order=created_at.desc',
      { method: 'GET' },
    );

    return (response || []).map((user: any) => this.transformUserFromDB(user));
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      if (isAdminBackendMode()) {
        return this.transformUserFromDB(await adminApiRequest(`/users/${encodeURIComponent(id)}`));
      }

      const response = await this.makeLegacyRequest(
        `users?id=eq.${id}&deleted_at=is.null&limit=1`,
        { method: 'GET' },
      );

      return response.length ? this.transformUserFromDB(response[0]) : null;
    } catch (error) {
      if (this.isNotFound(error)) {
        return null;
      }

      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      if (isAdminBackendMode()) {
        return this.transformUserFromDB(
          await adminApiRequest(`/users/by-email/${encodeURIComponent(email)}`),
        );
      }

      const response = await this.makeLegacyRequest(
        `users?email=eq.${encodeURIComponent(email)}&deleted_at=is.null&limit=1`,
        { method: 'GET' },
      );

      return response.length ? this.transformUserFromDB(response[0]) : null;
    } catch (error) {
      if (this.isNotFound(error)) {
        return null;
      }

      throw error;
    }
  }

  async getUserByEmailWithRoles(email: string): Promise<User | null> {
    return this.getUserByEmail(email);
  }

  async getDeletedUserByEmail(email: string): Promise<User | null> {
    try {
      if (isAdminBackendMode()) {
        return this.transformUserFromDB(
          await adminApiRequest(`/users/by-email/${encodeURIComponent(email)}?deletedOnly=true`),
        );
      }

      const response = await this.makeLegacyRequest(
        `users?email=eq.${encodeURIComponent(email)}&deleted_at=not.is.null&limit=1`,
        { method: 'GET' },
      );

      return response.length ? this.transformUserFromDB(response[0]) : null;
    } catch (error) {
      if (this.isNotFound(error)) {
        return null;
      }

      throw error;
    }
  }

  async createUser(input: CreateUserInput): Promise<User> {
    if (isAdminBackendMode()) {
      return this.transformUserFromDB(await adminApiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(input),
      }));
    }

    const deletedUser = await this.getDeletedUserByEmail(input.email);
    if (deletedUser) {
      throw new Error(`Пользователь с email ${input.email} был удален ранее. Для повторного использования этого email восстановите учетную запись.`);
    }

    const salt = this.generateSalt();
    const passwordHash = await this.hashPassword(input.password, salt);

    const response = await this.makeLegacyRequest('users', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: 'default',
        email: input.email,
        name: input.name,
        phone: (input as any).phone || null,
        status: input.status || 'active',
        pwd_salt: salt,
        pwd_hash: passwordHash,
        preferences: {},
      }),
    });

    const createdUser = this.transformUserFromDB(response[0]);

    if (input.roles && input.roles.length > 0) {
      await this.assignRolesToUser(createdUser.id, input.roles);
    }

    return createdUser;
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    if (isAdminBackendMode()) {
      return this.transformUserFromDB(await adminApiRequest(`/users/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }));
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.email !== undefined) updateData.email = input.email;
    if (input.name !== undefined) updateData.name = input.name;
    if ((input as any).phone !== undefined) updateData.phone = (input as any).phone;
    if (input.status !== undefined) updateData.status = input.status;

    const response = await this.makeLegacyRequest(`users?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });

    return this.transformUserFromDB(response[0]);
  }

  async deleteUser(id: string): Promise<void> {
    if (isAdminBackendMode()) {
      await adminApiRequest(`/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
      return;
    }

    await this.makeLegacyRequest(`users?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
  }

  async restoreUser(id: string): Promise<User> {
    if (isAdminBackendMode()) {
      return this.transformUserFromDB(await adminApiRequest(`/users/${encodeURIComponent(id)}/restore`, {
        method: 'POST',
      }));
    }

    const response = await this.makeLegacyRequest(`users?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        deleted_at: null,
        updated_at: new Date().toISOString(),
      }),
    });

    return this.transformUserFromDB(response[0]);
  }

  async permanentlyDeleteAllSoftDeletedUsers(): Promise<{ deletedCount: number }> {
    if (isAdminBackendMode()) {
      return adminApiRequest('/users/deleted/purge', { method: 'DELETE' });
    }

    const deletedUsers = await this.makeLegacyRequest(
      'users?deleted_at=not.is.null',
      { method: 'GET' },
    );

    if (!deletedUsers.length) {
      return { deletedCount: 0 };
    }

    const deletedUserIds = deletedUsers.map((user: any) => user.id);
    for (const userId of deletedUserIds) {
      await this.makeLegacyRequest(`user_roles?user_id=eq.${userId}`, { method: 'DELETE' });
    }

    await this.makeLegacyRequest('users?deleted_at=not.is.null', { method: 'DELETE' });
    return { deletedCount: deletedUsers.length };
  }

  async changePassword(userId: string, newPassword: string): Promise<void> {
    if (isAdminBackendMode()) {
      await adminApiRequest(`/users/${encodeURIComponent(userId)}/password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      });
      return;
    }

    const salt = this.generateSalt();
    const passwordHash = await this.hashPassword(newPassword, salt);

    await this.makeLegacyRequest(`users?id=eq.${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        pwd_salt: salt,
        pwd_hash: passwordHash,
        updated_at: new Date().toISOString(),
      }),
    });
  }

  async getUsersWithRoles(): Promise<User[]> {
    if (isAdminBackendMode()) {
      const response = await adminApiRequest('/users');
      return (response || []).map((user: any) => this.transformUserFromDB(user));
    }

    const users = await this.getAllUsers();
    const userRolesData = await this.makeLegacyRequest(
      'user_roles?is_active=eq.true&deleted_at=is.null',
      { method: 'GET' },
    );
    const rolesData = await this.makeLegacyRequest(
      'roles?deleted_at=is.null&is_active=eq.true',
      { method: 'GET' },
    );

    const rolesMap = new Map((rolesData || []).map((role: any) => [String(role.id), role]));

    return users.map((user) => ({
      ...user,
      roles: (userRolesData || [])
        .filter((userRole: any) => userRole.user_id === user.id)
        .map((userRole: any) => {
          const roleData = rolesMap.get(String(userRole.role_id));
          if (!roleData) {
            return null;
          }

          let scopeValues: string[] = [];
          if (userRole.scope_value) {
            try {
              const parsed = JSON.parse(userRole.scope_value);
              scopeValues = Array.isArray(parsed) ? parsed : [userRole.scope_value];
            } catch {
              scopeValues = [userRole.scope_value];
            }
          }

          return this.transformRole({
            role_id: userRole.role_id,
            role_code: roleData.code,
            role_name: roleData.name,
            scope: roleData.scope,
            scope_value: userRole.scope_value,
            scopeValues,
            permissions: roleData.permissions || [],
            assigned_at: userRole.assigned_at,
            assigned_by: userRole.assigned_by,
            expires_at: userRole.expires_at,
          });
        })
        .filter(Boolean),
    }));
  }

  private async assignRolesToUser(userId: string, roleIds: string[]): Promise<void> {
    const assignments = roleIds.map((roleId) => ({
      user_id: userId,
      role_id: roleId,
      assigned_by: '00000000-0000-0000-0000-000000000001',
    }));

    await this.makeLegacyRequest('user_roles', {
      method: 'POST',
      body: JSON.stringify(assignments),
    });
  }

  private generateSalt(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private async hashPassword(password: string, salt: string): Promise<string> {
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

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (isAdminBackendMode()) {
        await adminApiRequest('/users');
        return { success: true };
      }

      const config = this.getConfig();
      const response = await fetch(`${config.url}/rest/v1/`, {
        method: 'GET',
        headers: {
          apikey: config.apiKey,
          Authorization: `Bearer ${config.apiKey}`,
        },
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export const adminUsersService = new AdminUsersService();
