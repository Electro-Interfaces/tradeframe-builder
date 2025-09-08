/**
 * Сервис управления ролями с поддержкой CRUD операций и гранулярных разрешений
 * Интегрируется с Supabase для хранения данных
 */

import { supabaseService as supabase } from './supabaseServiceClient'
import type {
  Role,
  User,
  UserRole,
  Permission,
  CreateRoleInput,
  UpdateRoleInput,
  AssignRoleInput,
  AuditLog
} from '@/types/auth'

export class RoleService {
  /**
   * Получить все роли
   */
  static async getAllRoles(includeDeleted = false): Promise<Role[]> {
    try {
      let query = supabase
        .from('roles')
        .select('*')
        .order('name')

      if (!includeDeleted) {
        query = query.is('deleted_at', null)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching roles:', error)
        throw error
      }

      return (data || []).map(this.mapDatabaseToRole)
    } catch (error) {
      console.error('Failed to get all roles:', error)
      return []
    }
  }

  /**
   * Получить роль по ID
   */
  static async getRoleById(id: string): Promise<Role | null> {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single()

      if (error) {
        console.error('Error fetching role by ID:', error)
        return null
      }

      return data ? this.mapDatabaseToRole(data) : null
    } catch (error) {
      console.error(`Failed to get role by ID ${id}:`, error)
      return null
    }
  }

  /**
   * Получить роль по коду
   */
  static async getRoleByCode(code: string): Promise<Role | null> {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('code', code)
        .is('deleted_at', null)
        .single()

      if (error) {
        console.error('Error fetching role by code:', error)
        return null
      }

      return data ? this.mapDatabaseToRole(data) : null
    } catch (error) {
      console.error(`Failed to get role by code ${code}:`, error)
      return null
    }
  }

  /**
   * Создать новую роль
   */
  static async createRole(input: CreateRoleInput): Promise<Role> {
    try {
      const roleData = {
        tenant_id: input.tenant_id || 'default',
        code: input.code,
        name: input.name,
        description: input.description,
        permissions: input.permissions || [],
        scope: input.scope || 'global',
        scope_values: input.scope_values || null,
        is_system: input.is_system || false,
        is_active: input.is_active !== false
      }

      const { data, error } = await supabase
        .from('roles')
        .insert(roleData)
        .select()
        .single()

      if (error) {
        console.error('Error creating role:', error)
        throw error
      }

      // Логирование создания роли
      await this.logAuditEvent({
        action: 'role.created',
        resource_type: 'role',
        resource_id: data.id,
        details: { role_code: input.code, role_name: input.name }
      })

      return this.mapDatabaseToRole(data)
    } catch (error) {
      console.error('Failed to create role:', error)
      throw error
    }
  }

  /**
   * Обновить роль
   */
  static async updateRole(id: string, input: UpdateRoleInput): Promise<Role> {
    try {
      // Получаем текущую роль для проверки версии
      const currentRole = await this.getRoleById(id)
      if (!currentRole) {
        throw new Error('Role not found')
      }

      const updateData = {
        ...input,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('roles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating role:', error)
        throw error
      }

      // Логирование обновления роли
      await this.logAuditEvent({
        action: 'role.updated',
        resource_type: 'role',
        resource_id: id,
        details: { changes: input }
      })

      return this.mapDatabaseToRole(data)
    } catch (error) {
      console.error('Failed to update role:', error)
      throw error
    }
  }

  /**
   * Мягкое удаление роли
   */
  static async deleteRole(id: string): Promise<void> {
    try {
      const role = await this.getRoleById(id)
      if (!role) {
        throw new Error('Role not found')
      }

      if (role.is_system) {
        throw new Error('Cannot delete system role')
      }

      const { error } = await supabase
        .from('roles')
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        console.error('Error deleting role:', error)
        throw error
      }

      // Логирование удаления роли
      await this.logAuditEvent({
        action: 'role.deleted',
        resource_type: 'role',
        resource_id: id,
        details: { role_code: role.code, role_name: role.name }
      })
    } catch (error) {
      console.error('Failed to delete role:', error)
      throw error
    }
  }

  /**
   * Активировать/деактивировать роль
   */
  static async toggleRoleStatus(id: string, is_active: boolean): Promise<Role> {
    try {
      const currentRole = await this.getRoleById(id)
      if (!currentRole) {
        throw new Error('Role not found')
      }

      const { data, error } = await supabase
        .from('roles')
        .update({ 
          is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error toggling role status:', error)
        throw error
      }

      // Логирование изменения статуса
      await this.logAuditEvent({
        action: is_active ? 'role.activated' : 'role.deactivated',
        resource_type: 'role',
        resource_id: id,
        details: { role_code: currentRole.code, new_status: is_active }
      })

      return this.mapDatabaseToRole(data)
    } catch (error) {
      console.error('Failed to toggle role status:', error)
      throw error
    }
  }

  /**
   * Получить роли по области действия
   */
  static async getRolesByScope(scope: 'global' | 'network' | 'point'): Promise<Role[]> {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('scope', scope)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name')

      if (error) {
        console.error('Error fetching roles by scope:', error)
        throw error
      }

      return (data || []).map(this.mapDatabaseToRole)
    } catch (error) {
      console.error(`Failed to get roles by scope ${scope}:`, error)
      return []
    }
  }

  /**
   * Проверить, существует ли роль с указанным кодом
   */
  static async roleCodeExists(code: string, excludeId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('roles')
        .select('id')
        .eq('code', code)
        .is('deleted_at', null)

      if (excludeId) {
        query = query.neq('id', excludeId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error checking role code existence:', error)
        return false
      }

      return (data?.length || 0) > 0
    } catch (error) {
      console.error(`Failed to check role code existence ${code}:`, error)
      return false
    }
  }

  /**
   * Получить системные роли
   */
  static async getSystemRoles(): Promise<Role[]> {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('is_system', true)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name')

      if (error) {
        console.error('Error fetching system roles:', error)
        throw error
      }

      return (data || []).map(this.mapDatabaseToRole)
    } catch (error) {
      console.error('Failed to get system roles:', error)
      return []
    }
  }

  /**
   * Получить статистику по ролям
   */
  static async getRoleStatistics(): Promise<{
    totalRoles: number
    activeRoles: number
    inactiveRoles: number
    systemRoles: number
    customRoles: number
    // Legacy aliases for backward compatibility
    total: number
    active: number
    inactive: number
    system: number
    custom: number
  }> {
    try {
      const roles = await this.getAllRoles()
      const total = roles.length
      const active = roles.filter(r => r.is_active).length
      const inactive = roles.filter(r => !r.is_active).length
      const system = roles.filter(r => r.is_system).length
      const custom = roles.filter(r => !r.is_system).length
      
      return {
        // New naming convention
        totalRoles: total,
        activeRoles: active,
        inactiveRoles: inactive,
        systemRoles: system,
        customRoles: custom,
        // Legacy aliases for backward compatibility
        total,
        active,
        inactive,
        system,
        custom
      }
    } catch (error) {
      console.error('Failed to get role statistics:', error)
      const zeroStats = { total: 0, active: 0, inactive: 0, system: 0, custom: 0 }
      return {
        totalRoles: 0,
        activeRoles: 0,
        inactiveRoles: 0,
        systemRoles: 0,
        customRoles: 0,
        ...zeroStats
      }
    }
  }

  /**
   * Создать системные роли по умолчанию
   */
  static async createDefaultSystemRoles(tenantId: string): Promise<Role[]> {
    try {
      const existingRoles = await this.getAllRoles()
      const systemRolesData: CreateRoleInput[] = [
        {
          tenant_id: tenantId,
          code: 'super_admin',
          name: 'Супер Администратор',
          description: 'Полный доступ ко всем функциям системы',
          permissions: [{ section: '*', resource: '*', actions: ['read', 'write', 'delete', 'manage'] }],
          scope: 'global',
          is_system: true,
          is_active: true
        },
        {
          tenant_id: tenantId,
          code: 'network_admin',
          name: 'Администратор Сети',
          description: 'Администрирование конкретной торговой сети',
          permissions: [
            { section: 'networks', resource: 'networks', actions: ['read', 'write', 'manage'] },
            { section: 'networks', resource: 'trading_points', actions: ['read', 'write', 'manage'] },
            { section: 'networks', resource: 'users', actions: ['read', 'write', 'manage'] },
            { section: 'operations', resource: 'reports', actions: ['read'] },
            { section: 'equipment', resource: 'tanks', actions: ['read', 'write'] },
            { section: 'finance', resource: 'prices', actions: ['read', 'write'] },
            { section: 'admin', resource: 'audit', actions: ['read'] }
          ],
          scope: 'network',
          is_system: true,
          is_active: true
        },
        {
          tenant_id: tenantId,
          code: 'point_manager',
          name: 'Менеджер Точки',
          description: 'Управление конкретной торговой точкой',
          permissions: [
            { section: 'operations', resource: 'transactions', actions: ['read'] },
            { section: 'operations', resource: 'shifts', actions: ['read', 'write'] },
            { section: 'operations', resource: 'reports', actions: ['read'] },
            { section: 'equipment', resource: 'tanks', actions: ['read', 'write'] },
            { section: 'equipment', resource: 'dispensers', actions: ['read', 'write'] },
            { section: 'finance', resource: 'prices', actions: ['read', 'write'] }
          ],
          scope: 'trading_point',
          is_system: true,
          is_active: true
        },
        {
          tenant_id: tenantId,
          code: 'operator',
          name: 'Оператор',
          description: 'Операционная деятельность на торговой точке',
          permissions: [
            { section: 'operations', resource: 'transactions', actions: ['read', 'write'] },
            { section: 'operations', resource: 'shifts', actions: ['read', 'write'] },
            { section: 'operations', resource: 'reports', actions: ['read'] },
            { section: 'equipment', resource: 'tanks', actions: ['read'] },
            { section: 'finance', resource: 'prices', actions: ['read'] }
          ],
          scope: 'trading_point',
          is_system: true,
          is_active: true
        },
        {
          tenant_id: tenantId,
          code: 'driver',
          name: 'Водитель-Экспедитор',
          description: 'Регистрация сливов и транспортные операции',
          permissions: [
            { section: 'operations', resource: 'deliveries', actions: ['read', 'write'] },
            { section: 'operations', resource: 'transactions', actions: ['read'] },
            { section: 'equipment', resource: 'tanks', actions: ['read'] }
          ],
          scope: 'global',
          is_system: true,
          is_active: true
        }
      ]

      const rolesToCreate = systemRolesData.filter(roleData => 
        !existingRoles.some(existing => existing.code === roleData.code)
      )

      const createdRoles: Role[] = []
      
      for (const roleData of rolesToCreate) {
        try {
          const createdRole = await this.createRole(roleData)
          createdRoles.push(createdRole)
        } catch (error) {
          console.error(`Failed to create system role ${roleData.code}:`, error)
        }
      }

      if (createdRoles.length > 0) {
        await this.logAuditEvent({
          action: 'system.roles.created',
          resource_type: 'roles',
          resource_id: 'system',
          details: { roles_created: createdRoles.map(r => r.code) }
        })
      }

      return createdRoles
    } catch (error) {
      console.error('Failed to create default system roles:', error)
      throw error
    }
  }

  /**
   * Маппинг данных из базы в объект Role
   */
  private static mapDatabaseToRole(data: any): Role {
    return {
      id: data.id,
      tenant_id: data.tenant_id,
      code: data.code,
      name: data.name,
      description: data.description,
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
      scope: data.scope,
      scope_values: data.scope_values || [],
      is_system: data.is_system,
      is_active: data.is_active,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      deleted_at: data.deleted_at ? new Date(data.deleted_at) : undefined
    }
  }

  /**
   * Логирование аудита (заглушка, можно расширить)
   */
  private static async logAuditEvent(event: {
    action: string
    resource_type: string
    resource_id: string
    details?: any
  }): Promise<void> {
    try {
      console.log('Audit event:', event)
      // Здесь можно добавить запись в таблицу аудита, если она есть
    } catch (error) {
      console.error('Failed to log audit event:', error)
    }
  }

  // Методы для работы с пользователями и назначением ролей
  // Эти методы могут быть реализованы после миграции users

  /**
   * Назначить роль пользователю (заглушка)
   */
  static async assignRoleToUser(input: AssignRoleInput): Promise<UserRole> {
    throw new Error('User role assignment not implemented yet. Migrate users table first.')
  }

  /**
   * Отозвать роль у пользователя (заглушка)
   */
  static async revokeRoleFromUser(userId: string, roleId: string): Promise<void> {
    throw new Error('User role revocation not implemented yet. Migrate users table first.')
  }

  /**
   * Получить роли пользователя (заглушка)
   */
  static async getUserRoles(userId: string): Promise<UserRole[]> {
    throw new Error('User roles fetching not implemented yet. Migrate users table first.')
  }
}