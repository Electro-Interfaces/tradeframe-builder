import type { CreateRoleInput, Permission, Role, RoleScope, UpdateRoleInput } from '@/types/auth';

import { adminApiRequest } from './adminApiClient';

class AdminRolesService {
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
    const response = await adminApiRequest('/roles');
    return (response || []).map((role: any) => this.transformRoleFromDB(role));
  }

  async getRoleById(id: string): Promise<Role | null> {
    try {
      return this.transformRoleFromDB(await adminApiRequest(`/roles/${encodeURIComponent(id)}`));
    } catch (error) {
      if (this.isNotFound(error)) {
        return null;
      }

      throw error;
    }
  }

  async getRoleByCode(code: string): Promise<Role | null> {
    try {
      return this.transformRoleFromDB(
        await adminApiRequest(`/roles/by-code/${encodeURIComponent(code)}`),
      );
    } catch (error) {
      if (this.isNotFound(error)) {
        return null;
      }

      throw error;
    }
  }

  async createRole(input: CreateRoleInput): Promise<Role> {
    return this.transformRoleFromDB(await adminApiRequest('/roles', {
      method: 'POST',
      body: JSON.stringify(input),
    }));
  }

  async updateRole(id: string, input: UpdateRoleInput): Promise<Role> {
    return this.transformRoleFromDB(await adminApiRequest(`/roles/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }));
  }

  async deleteRole(id: string): Promise<void> {
    await adminApiRequest(`/roles/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async getRolePermissionsPublic(roleId: string): Promise<Permission[]> {
    const role = await this.getRoleById(roleId);
    return role ? role.permissions : [];
  }

  async assignRoleToUser(userId: string, roleId: string, scopeValues?: string[], expiresAt?: Date): Promise<void> {
    await adminApiRequest('/roles/assignments', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        roleId,
        scopeValues: scopeValues || [],
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
      }),
    });
  }

  async removeRoleFromUser(userId: string, roleId: string, scopeValue?: string): Promise<void> {
    await adminApiRequest(
      `/roles/assignments?userId=${encodeURIComponent(userId)}&roleId=${encodeURIComponent(roleId)}`,
      { method: 'DELETE' },
    );
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    const response = await adminApiRequest(`/roles/users/${encodeURIComponent(userId)}`);
    return (response || []).map((role: any) => this.transformRoleFromDB(role));
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await adminApiRequest('/roles');
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
