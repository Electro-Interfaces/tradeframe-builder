import { adminRolesService } from './adminRolesService'
import type {
  AssignRoleInput,
  CreateRoleInput,
  Role,
  RoleScope,
  UpdateRoleInput,
  UserRole
} from '@/types/auth'

const DEFAULT_SYSTEM_ROLES: CreateRoleInput[] = [
  {
    tenant_id: 'default',
    code: 'super_admin',
    name: 'Супер Администратор',
    description: 'Полный доступ ко всем функциям системы',
    permissions: [{ section: '*', resource: '*', actions: ['read', 'write', 'delete', 'manage'] }],
    scope: 'global',
    is_system: true,
    is_active: true
  },
  {
    tenant_id: 'default',
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
    tenant_id: 'default',
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
    tenant_id: 'default',
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
    tenant_id: 'default',
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

export class RoleService {
  static async getAllRoles(includeDeleted = false): Promise<Role[]> {
    const roles = await adminRolesService.getAllRoles()
    if (includeDeleted) {
      return roles
    }
    return roles.filter(role => !role.deleted_at)
  }

  static async getRoleById(id: string): Promise<Role | null> {
    return adminRolesService.getRoleById(id)
  }

  static async getRoleByCode(code: string): Promise<Role | null> {
    return adminRolesService.getRoleByCode(code)
  }

  static async createRole(input: CreateRoleInput): Promise<Role> {
    return adminRolesService.createRole(input)
  }

  static async updateRole(id: string, input: UpdateRoleInput): Promise<Role> {
    return adminRolesService.updateRole(id, input)
  }

  static async deleteRole(id: string): Promise<void> {
    await adminRolesService.deleteRole(id)
  }

  static async toggleRoleStatus(id: string, is_active: boolean): Promise<Role> {
    return adminRolesService.updateRole(id, { is_active })
  }

  static async getRolesByScope(scope: RoleScope | 'point'): Promise<Role[]> {
    const normalizedScope = scope === 'point' ? 'trading_point' : scope
    const roles = await this.getAllRoles()
    return roles.filter(role => role.scope === normalizedScope && role.is_active)
  }

  static async roleCodeExists(code: string, excludeId?: string): Promise<boolean> {
    const role = await this.getRoleByCode(code)
    if (!role) {
      return false
    }
    return role.id !== excludeId
  }

  static async getSystemRoles(): Promise<Role[]> {
    const roles = await this.getAllRoles()
    return roles.filter(role => role.is_system && role.is_active)
  }

  static async getRoleStatistics(): Promise<{
    total: number
    active: number
    inactive: number
    system: number
    custom: number
  }> {
    const roles = await this.getAllRoles()
    return {
      total: roles.length,
      active: roles.filter(role => role.is_active).length,
      inactive: roles.filter(role => !role.is_active).length,
      system: roles.filter(role => role.is_system).length,
      custom: roles.filter(role => !role.is_system).length
    }
  }

  static async createDefaultSystemRoles(tenantId: string): Promise<Role[]> {
    const existingRoles = await this.getAllRoles()
    const createdRoles: Role[] = []

    for (const roleConfig of DEFAULT_SYSTEM_ROLES) {
      if (existingRoles.some(role => role.code === roleConfig.code)) {
        continue
      }

      createdRoles.push(await this.createRole({
        ...roleConfig,
        tenant_id: tenantId
      }))
    }

    return createdRoles
  }

  static async assignRoleToUser(input: AssignRoleInput): Promise<UserRole> {
    const scopeValues = input.scope_value ? [input.scope_value] : []
    await adminRolesService.assignRoleToUser(input.user_id, input.role_id, scopeValues, input.expires_at)

    const role = await this.getRoleById(input.role_id)
    if (!role) {
      throw new Error('Роль не найдена после назначения')
    }

    return {
      role_id: role.id,
      role_code: role.code,
      role_name: role.name,
      scope: role.scope,
      scope_value: input.scope_value,
      scopeValues: scopeValues,
      permissions: role.permissions,
      assigned_at: new Date(),
      expires_at: input.expires_at
    }
  }

  static async revokeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await adminRolesService.removeRoleFromUser(userId, roleId)
  }

  static async getUserRoles(userId: string): Promise<UserRole[]> {
    const roles = await adminRolesService.getUserRoles(userId)
    return roles.map(role => ({
      role_id: role.id,
      role_code: role.code,
      role_name: role.name,
      scope: role.scope,
      scopeValues: role.scope_values || [],
      permissions: role.permissions,
      assigned_at: role.updated_at
    }))
  }
}
