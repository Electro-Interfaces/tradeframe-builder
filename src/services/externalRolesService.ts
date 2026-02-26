/**
 * Сервис для работы с ролями во внешней базе данных Supabase
 */

import { Role, RoleScope, Permission, CreateRoleInput, UpdateRoleInput } from '@/types/auth';

interface ExternalDatabaseConfig {
  url: string;
  apiKey: string;
}

class ExternalRolesService {
  private config: ExternalDatabaseConfig | null = null;
  private lastConfigUpdate: number = 0;

  private getConfig(): ExternalDatabaseConfig {
    const fixedConfig: ExternalDatabaseConfig = {
      url: import.meta.env.VITE_SUPABASE_URL || '',
      apiKey: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
    };

    // Обновляем кэш каждую секунду
    const now = Date.now();
    if (this.config && (now - this.lastConfigUpdate) < 1000) {
      return this.config;
    }


    this.config = fixedConfig;
    this.lastConfigUpdate = now;

    return this.config;
  }

  // Публичный метод для принудительного сброса кэша
  public clearConfigCache(): void {
    this.config = null;
    this.lastConfigUpdate = 0;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const config = this.getConfig();
    const fullUrl = `${config.url}/rest/v1/${endpoint}`;

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          'apikey': config.apiKey,
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
          ...options.headers
        }
      });


      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ ExternalRolesService: Ошибка ${response.status}:`, errorText);
        
        // Если 401/403 - проблема с авторизацией, сбрасываем кэш
        if (response.status === 401 || response.status === 403) {
          this.clearConfigCache();
        }
        
        throw new Error(`Database error: ${response.status} - ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data;
      }
      
      const textData = await response.text();
      return textData;
      
    } catch (error) {
      console.error(`💥 ExternalRolesService: Критическая ошибка запроса к ${endpoint}:`, error);
      
      // При сетевых ошибках сбрасываем кэш - возможно изменился URL
      if (error instanceof TypeError || error.message.includes('fetch')) {
        this.clearConfigCache();
      }
      
      throw error;
    }
  }

  private async getRolePermissions(roleId: string): Promise<Permission[]> {
    try {
      // Получаем разрешения из поля permissions роли
      const role = await this.getRoleById(roleId);
      return role?.permissions || [];
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      return [];
    }
  }

  private transformRoleFromDB(dbRole: any): Role {
    // Парсим permissions из JSON поля
    let permissions: Permission[] = [];
    try {
      if (dbRole.permissions) {
        permissions = typeof dbRole.permissions === 'string'
          ? JSON.parse(dbRole.permissions)
          : dbRole.permissions;
      }
    } catch (error) {
      console.error('Error parsing role permissions:', error);
      permissions = [];
    }

    return {
      id: dbRole.id,
      code: dbRole.code,
      name: dbRole.name,
      description: dbRole.description || '',
      permissions,
      scope: dbRole.scope as RoleScope,
      scope_values: dbRole.scope_values || [],
      is_system: dbRole.is_system || false,
      is_active: dbRole.is_active !== false,
      created_at: new Date(dbRole.created_at),
      updated_at: new Date(dbRole.updated_at),
      deleted_at: dbRole.deleted_at ? new Date(dbRole.deleted_at) : undefined
    };
  }

  async getAllRoles(): Promise<Role[]> {
    try {
      const response = await this.makeRequest(
        'roles?deleted_at=is.null&order=created_at.desc',
        { method: 'GET' }
      );

      const roles = response.map((role: any) => this.transformRoleFromDB(role));

      return roles;
    } catch (error) {
      console.error('Error fetching roles:', error);
      throw error;
    }
  }

  async getRoleById(id: string): Promise<Role | null> {
    try {
      const response = await this.makeRequest(
        `roles?id=eq.${id}&deleted_at=is.null&limit=1`,
        { method: 'GET' }
      );

      if (response.length === 0) return null;
      
      return this.transformRoleFromDB(response[0]);
    } catch (error) {
      console.error('Error fetching role by id:', error);
      throw error;
    }
  }

  async getRoleByCode(code: string): Promise<Role | null> {
    try {
      const response = await this.makeRequest(
        `roles?code=eq.${encodeURIComponent(code)}&deleted_at=is.null&limit=1`,
        { method: 'GET' }
      );

      if (response.length === 0) return null;
      
      return this.transformRoleFromDB(response[0]);
    } catch (error) {
      console.error('Error fetching role by code:', error);
      throw error;
    }
  }

  async createRole(input: CreateRoleInput): Promise<Role> {
    try {
      const roleData = {
        code: input.code,
        name: input.name,
        description: input.description,
        scope: input.scope,
        scope_values: input.scope_values || [],
        is_system: input.is_system || false,
        is_active: input.is_active !== false
      };

      const response = await this.makeRequest('roles', {
        method: 'POST',
        body: JSON.stringify(roleData)
      });

      const createdRole = response[0];

      // Создаем разрешения для роли
      if (input.permissions && input.permissions.length > 0) {
        await this.setRolePermissions(createdRole.id, input.permissions);
      }

      return this.transformRoleFromDB(createdRole);
    } catch (error) {
      console.error('Error creating role:', error);
      throw error;
    }
  }

  async updateRole(id: string, input: UpdateRoleInput): Promise<Role> {
    try {
      const updateData: any = {};
      
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.scope !== undefined) updateData.scope = input.scope;
      if (input.scope_values !== undefined) updateData.scope_values = input.scope_values;
      if (input.is_active !== undefined) updateData.is_active = input.is_active;
      
      updateData.updated_at = new Date().toISOString();

      const response = await this.makeRequest(`roles?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });

      // Обновляем разрешения если они переданы
      if (input.permissions !== undefined) {
        await this.setRolePermissions(id, input.permissions);
      }

      return this.transformRoleFromDB(response[0]);
    } catch (error) {
      console.error('Error updating role:', error);
      throw error;
    }
  }

  async deleteRole(id: string): Promise<void> {
    try {
      // Проверяем, что роль не системная
      const role = await this.getRoleById(id);
      if (role && role.is_system) {
        throw new Error('Нельзя удалить системную роль');
      }

      // Проверяем, что роль не используется
      const usageCheck = await this.makeRequest(
        `user_roles?role_id=eq.${id}&is_active=eq.true&limit=1`,
        { method: 'GET' }
      );

      if (usageCheck.length > 0) {
        throw new Error('Роль используется пользователями и не может быть удалена');
      }

      // Soft delete
      await this.makeRequest(`roles?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: false
        })
      });

      // Удаляем разрешения роли
      await this.makeRequest(`role_permissions?role_id=eq.${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  }

  private async setRolePermissions(roleId: string, permissions: Permission[]): Promise<void> {
    try {
      // Обновляем поле permissions в таблице roles
      await this.makeRequest(`roles?id=eq.${roleId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          permissions: permissions,
          updated_at: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error setting role permissions:', error);
      throw error;
    }
  }

  async getRolePermissionsPublic(roleId: string): Promise<Permission[]> {
    try {
      const role = await this.getRoleById(roleId);
      return role ? role.permissions : [];
    } catch (error) {
      console.error('Error getting role permissions:', error);
      return [];
    }
  }

  async assignRoleToUser(userId: string, roleId: string, scopeValues?: string[], expiresAt?: Date): Promise<void> {
    try {
      // Поле scope_value в БД хранит JSON-массив как строку
      const assignment = {
        user_id: userId,
        role_id: roleId,
        scope_value: scopeValues && scopeValues.length > 0 ? JSON.stringify(scopeValues) : null,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
        assigned_by: '00000000-0000-0000-0000-000000000001' // Системный пользователь
      };

      await this.makeRequest('user_roles', {
        method: 'POST',
        body: JSON.stringify(assignment)
      });
    } catch (error) {
      console.error('Error assigning role to user:', error);
      throw error;
    }
  }

  async removeRoleFromUser(userId: string, roleId: string, scopeValue?: string): Promise<void> {
    try {
      // Удаляем ВСЕ назначения этой роли пользователю (независимо от scope_value)
      // Это предотвращает создание дубликатов при редактировании
      const query = `user_roles?user_id=eq.${userId}&role_id=eq.${roleId}`;

      await this.makeRequest(query, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error removing role from user:', error);
      throw error;
    }
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    try {
      const response = await this.makeRequest(
        `user_roles_view?user_id=eq.${userId}&is_role_valid=eq.true`,
        { method: 'GET' }
      );

      const roleIds = [...new Set(response.map((row: any) => row.role_id))];
      const roles = await Promise.all(
        roleIds.map(id => this.getRoleById(id))
      );

      return roles.filter(role => role !== null) as Role[];
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }
  }

  // Получение доступных разделов и ресурсов для настройки разрешений
  getAvailablePermissions(): { section: string; resources: string[] }[] {
    return [
      {
        section: 'admin',
        resources: ['users', 'roles', 'networks', 'audit', 'legal-documents']
      },
      {
        section: 'network',
        resources: ['overview', 'operations-transactions', 'price-history', 'fuel-stocks', 'equipment-log', 'notifications', 'messages']
      },
      {
        section: 'point',
        resources: ['prices', 'tanks', 'equipment', 'shift-reports']
      },
      {
        section: 'settings',
        resources: ['connections', 'database', 'nomenclature', 'equipment-types', 'component-types', 'command-templates', 'workflows']
      },
      {
        section: 'misc',
        resources: ['*']
      }
    ];
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.makeRequest('roles?limit=1', { method: 'GET' });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Метод для получения статистики ролей
  async getRoleStats(): Promise<{
    total: number;
    active: number;
    system: number;
    custom: number;
  }> {
    try {
      const roles = await this.getAllRoles();
      
      return {
        total: roles.length,
        active: roles.filter(r => r.is_active).length,
        system: roles.filter(r => r.is_system).length,
        custom: roles.filter(r => !r.is_system).length
      };
    } catch (error) {
      console.error('Error fetching role stats:', error);
      return { total: 0, active: 0, system: 0, custom: 0 };
    }
  }

  // Метод для дублирования роли
  async duplicateRole(roleId: string, newCode: string, newName: string): Promise<Role> {
    try {
      const originalRole = await this.getRoleById(roleId);
      if (!originalRole) {
        throw new Error('Роль не найдена');
      }

      const duplicateInput: CreateRoleInput = {
        code: newCode,
        name: newName,
        description: `Копия роли: ${originalRole.description}`,
        permissions: originalRole.permissions,
        scope: originalRole.scope,
        scope_values: originalRole.scope_values,
        is_system: false, // Дублированная роль не может быть системной
        is_active: true
      };

      return await this.createRole(duplicateInput);
    } catch (error) {
      console.error('Error duplicating role:', error);
      throw error;
    }
  }
}

export const externalRolesService = new ExternalRolesService();