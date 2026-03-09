import type { CreateRoleInput, Permission, Role, RoleScope, UpdateRoleInput } from '@/types/auth';

import { adminApiRequest, isAdminBackendMode } from './adminApiClient';

interface ExternalDatabaseConfig {
  url: string;
  apiKey: string;
}

class AdminRolesService {
  private config: ExternalDatabaseConfig | null = null;
  private lastConfigUpdate = 0;

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

  private transformRoleFromDB(dbRole: any): Role {
    let permissions: Permission[] = [];
    try {
      permissions = Array.isArray(dbRole.permissions)
        ? dbRole.permissions
        : (dbRole.permissions ? JSON.parse(dbRole.permissions) : []);
    } catch {
      permissions = [];
    }

    return {
      id: String(dbRole.id),
      tenant_id: dbRole.tenant_id || 'default',
      code: dbRole.code,
      name: dbRole.name,
      description: dbRole.description || '',
      permissions,
      scope: (dbRole.scope || 'global') as RoleScope,
      scope_values: Array.isArray(dbRole.scope_values) ? dbRole.scope_values : [],
      is_system: Boolean(dbRole.is_system),
      is_active: dbRole.is_active !== false,
      created_at: new Date(dbRole.created_at),
      updated_at: new Date(dbRole.updated_at || dbRole.created_at),
      deleted_at: dbRole.deleted_at ? new Date(dbRole.deleted_at) : undefined,
    };
  }

  private isNotFound(error: unknown): boolean {
    return error instanceof Error
      && (error.message.includes('404') || error.message.includes('не найдена') || error.message.includes('not found'));
  }

  async getAllRoles(): Promise<Role[]> {
    if (isAdminBackendMode()) {
      const response = await adminApiRequest('/roles');
      return (response || []).map((role: any) => this.transformRoleFromDB(role));
    }

    const response = await this.makeLegacyRequest(
      'roles?deleted_at=is.null&order=created_at.desc',
      { method: 'GET' },
    );

    return (response || []).map((role: any) => this.transformRoleFromDB(role));
  }

  async getRoleById(id: string): Promise<Role | null> {
    try {
      if (isAdminBackendMode()) {
        return this.transformRoleFromDB(await adminApiRequest(`/roles/${encodeURIComponent(id)}`));
      }

      const response = await this.makeLegacyRequest(
        `roles?id=eq.${id}&deleted_at=is.null&limit=1`,
        { method: 'GET' },
      );

      return response.length ? this.transformRoleFromDB(response[0]) : null;
    } catch (error) {
      if (this.isNotFound(error)) {
        return null;
      }

      throw error;
    }
  }

  async getRoleByCode(code: string): Promise<Role | null> {
    try {
      if (isAdminBackendMode()) {
        return this.transformRoleFromDB(
          await adminApiRequest(`/roles/by-code/${encodeURIComponent(code)}`),
        );
      }

      const response = await this.makeLegacyRequest(
        `roles?code=eq.${encodeURIComponent(code)}&deleted_at=is.null&limit=1`,
        { method: 'GET' },
      );

      return response.length ? this.transformRoleFromDB(response[0]) : null;
    } catch (error) {
      if (this.isNotFound(error)) {
        return null;
      }

      throw error;
    }
  }

  async createRole(input: CreateRoleInput): Promise<Role> {
    if (isAdminBackendMode()) {
      return this.transformRoleFromDB(await adminApiRequest('/roles', {
        method: 'POST',
        body: JSON.stringify(input),
      }));
    }

    const response = await this.makeLegacyRequest('roles', {
      method: 'POST',
      body: JSON.stringify({
        code: input.code,
        name: input.name,
        description: input.description,
        permissions: input.permissions || [],
        scope: input.scope,
        scope_values: input.scope_values || [],
        is_system: input.is_system || false,
        is_active: input.is_active !== false,
      }),
    });

    return this.transformRoleFromDB(response[0]);
  }

  async updateRole(id: string, input: UpdateRoleInput): Promise<Role> {
    if (isAdminBackendMode()) {
      return this.transformRoleFromDB(await adminApiRequest(`/roles/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }));
    }

    const response = await this.makeLegacyRequest(`roles?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...input,
        updated_at: new Date().toISOString(),
      }),
    });

    return this.transformRoleFromDB(response[0]);
  }

  async deleteRole(id: string): Promise<void> {
    if (isAdminBackendMode()) {
      await adminApiRequest(`/roles/${encodeURIComponent(id)}`, { method: 'DELETE' });
      return;
    }

    const role = await this.getRoleById(id);
    if (role?.is_system) {
      throw new Error('Нельзя удалить системную роль');
    }

    const usageCheck = await this.makeLegacyRequest(
      `user_roles?role_id=eq.${id}&is_active=eq.true&limit=1`,
      { method: 'GET' },
    );

    if (usageCheck.length > 0) {
      throw new Error('Роль используется пользователями и не может быть удалена');
    }

    await this.makeLegacyRequest(`roles?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: false,
      }),
    });
  }

  async getRolePermissionsPublic(roleId: string): Promise<Permission[]> {
    const role = await this.getRoleById(roleId);
    return role ? role.permissions : [];
  }

  async assignRoleToUser(userId: string, roleId: string, scopeValues?: string[], expiresAt?: Date): Promise<void> {
    if (isAdminBackendMode()) {
      await adminApiRequest('/roles/assignments', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          roleId,
          scopeValues: scopeValues || [],
          expiresAt: expiresAt ? expiresAt.toISOString() : null,
        }),
      });
      return;
    }

    await this.makeLegacyRequest('user_roles', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        role_id: roleId,
        scope_value: scopeValues && scopeValues.length > 0 ? JSON.stringify(scopeValues) : null,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
        assigned_by: '00000000-0000-0000-0000-000000000001',
      }),
    });
  }

  async removeRoleFromUser(userId: string, roleId: string, scopeValue?: string): Promise<void> {
    if (isAdminBackendMode()) {
      await adminApiRequest(
        `/roles/assignments?userId=${encodeURIComponent(userId)}&roleId=${encodeURIComponent(roleId)}`,
        { method: 'DELETE' },
      );
      return;
    }

    await this.makeLegacyRequest(`user_roles?user_id=eq.${userId}&role_id=eq.${roleId}`, {
      method: 'DELETE',
    });
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    if (isAdminBackendMode()) {
      const response = await adminApiRequest(`/roles/users/${encodeURIComponent(userId)}`);
      return (response || []).map((role: any) => this.transformRoleFromDB(role));
    }

    const response = await this.makeLegacyRequest(
      `user_roles_view?user_id=eq.${userId}&is_role_valid=eq.true`,
      { method: 'GET' },
    );

    const roleIds = [...new Set((response || []).map((row: any) => String(row.role_id)))];
    const roles = await Promise.all(roleIds.map((roleId) => this.getRoleById(roleId)));
    return roles.filter((role): role is Role => Boolean(role));
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (isAdminBackendMode()) {
        await adminApiRequest('/roles');
      } else {
        await this.makeLegacyRequest('roles?limit=1', { method: 'GET' });
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getRoleStats(): Promise<{
    total: number;
    active: number;
    system: number;
    custom: number;
  }> {
    const roles = await this.getAllRoles();

    return {
      total: roles.length,
      active: roles.filter((role) => role.is_active).length,
      system: roles.filter((role) => role.is_system).length,
      custom: roles.filter((role) => !role.is_system).length,
    };
  }

  async duplicateRole(roleId: string, newCode: string, newName: string): Promise<Role> {
    const originalRole = await this.getRoleById(roleId);
    if (!originalRole) {
      throw new Error('Роль не найдена');
    }

    return this.createRole({
      code: newCode,
      name: newName,
      description: `Копия роли: ${originalRole.description}`,
      permissions: originalRole.permissions,
      scope: originalRole.scope,
      scope_values: originalRole.scope_values,
      is_system: false,
      is_active: true,
    });
  }
}

export const adminRolesService = new AdminRolesService();
