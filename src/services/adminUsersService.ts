import type { CreateUserInput, UpdateUserInput, User, UserStatus } from '@/types/auth';

import { adminApiRequest } from './adminApiClient';

class AdminUsersService {
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
    const response = await adminApiRequest('/users');
    return (response || []).map((user: any) => this.transformUserFromDB(user));
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      return this.transformUserFromDB(await adminApiRequest(`/users/${encodeURIComponent(id)}`));
    } catch (error) {
      if (this.isNotFound(error)) {
        return null;
      }

      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      return this.transformUserFromDB(
        await adminApiRequest(`/users/by-email/${encodeURIComponent(email)}`),
      );
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
      return this.transformUserFromDB(
        await adminApiRequest(`/users/by-email/${encodeURIComponent(email)}?deletedOnly=true`),
      );
    } catch (error) {
      if (this.isNotFound(error)) {
        return null;
      }

      throw error;
    }
  }

  async createUser(input: CreateUserInput): Promise<User> {
    return this.transformUserFromDB(await adminApiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(input),
    }));
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    return this.transformUserFromDB(await adminApiRequest(`/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }));
  }

  async deleteUser(id: string): Promise<void> {
    await adminApiRequest(`/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async restoreUser(id: string): Promise<User> {
    return this.transformUserFromDB(await adminApiRequest(`/users/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
    }));
  }

  async permanentlyDeleteAllSoftDeletedUsers(): Promise<{ deletedCount: number }> {
    return adminApiRequest('/users/deleted/purge', { method: 'DELETE' });
  }

  async changePassword(userId: string, newPassword: string): Promise<void> {
    await adminApiRequest(`/users/${encodeURIComponent(userId)}/password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  }

  async getUsersWithRoles(): Promise<User[]> {
    const response = await adminApiRequest('/users');
    return (response || []).map((user: any) => this.transformUserFromDB(user));
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await adminApiRequest('/users');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export const adminUsersService = new AdminUsersService();
