/**
 * Сервис управления ролями с поддержкой CRUD операций и гранулярных разрешений
 * Интегрируется с AuthService для логирования и валидации
 */

import { persistentStorage } from '@/utils/persistentStorage'
import { PermissionValidator } from '@/utils/permissions'
import { CryptoUtils } from '@/utils/crypto'
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
import { PERMISSION_SECTIONS, PermissionHelpers } from '@/config/permissions'

export class RoleService {
  private static readonly ROLES_KEY = 'tradeframe_roles'
  private static readonly USERS_KEY = 'tradeframe_users'
  private static readonly AUDIT_KEY = 'tradeframe_audit'

  /**
   * Получить все роли
   */
  static async getAllRoles(includeDeleted = false): Promise<Role[]> {
    const roles = await persistentStorage.getItem<Role[]>(this.ROLES_KEY) || []
    return includeDeleted ? roles : roles.filter(r => !r.deleted_at)
  }

  /**
   * Получить роль по ID
   */
  static async getRoleById(id: string): Promise<Role | null> {
    const roles = await this.getAllRoles()
    return roles.find(r => r.id === id) || null
  }

  /**
   * Получить роль по коду
   */
  static async getRoleByCode(code: string): Promise<Role | null> {
    const roles = await this.getAllRoles()
    return roles.find(r => r.code === code) || null
  }

  /**
   * Создать новую роль
   */
  static async createRole(input: CreateRoleInput, tenantId: string): Promise<Role> {
    const roles = await persistentStorage.getItem<Role[]>(this.ROLES_KEY) || []

    // Проверяем уникальность кода
    const existingRole = roles.find(r => r.code === input.code && !r.deleted_at)
    if (existingRole) {
      throw new Error('Роль с таким кодом уже существует')
    }

    // Валидируем разрешения
    const validationErrors = this.validatePermissions(input.permissions)
    if (validationErrors.length > 0) {
      throw new Error(`Ошибки в разрешениях: ${validationErrors.join(', ')}`)
    }

    const now = new Date()
    const role: Role = {
      id: CryptoUtils.generateSecureId(),
      tenant_id: tenantId,
      code: input.code,
      name: input.name,
      description: input.description,
      permissions: input.permissions,
      scope: input.scope,
      scope_values: input.scope_values,
      is_system: false, // пользовательские роли никогда не системные
      is_active: true,
      created_at: now,
      updated_at: now,
      version: 1
    }

    roles.push(role)
    await persistentStorage.setItem(this.ROLES_KEY, roles)

    await this.logAudit('Role.Created', 'Role', role.id, {
      code: role.code,
      name: role.name,
      permissions_count: role.permissions.length
    })

    return role
  }

  /**
   * Обновить роль
   */
  static async updateRole(id: string, updates: UpdateRoleInput): Promise<Role> {
    const roles = await persistentStorage.getItem<Role[]>(this.ROLES_KEY) || []
    const roleIndex = roles.findIndex(r => r.id === id && !r.deleted_at)

    if (roleIndex === -1) {
      throw new Error('Роль не найдена')
    }

    const role = roles[roleIndex]

    // Проверяем, что это не системная роль
    if (role.is_system) {
      throw new Error('Нельзя изменять системную роль')
    }

    // Валидируем разрешения если они обновляются
    if (updates.permissions) {
      const validationErrors = this.validatePermissions(updates.permissions)
      if (validationErrors.length > 0) {
        throw new Error(`Ошибки в разрешениях: ${validationErrors.join(', ')}`)
      }
    }

    const oldValues = { ...role }

    // Применяем обновления
    if (updates.name !== undefined) role.name = updates.name
    if (updates.description !== undefined) role.description = updates.description
    if (updates.permissions !== undefined) role.permissions = updates.permissions
    if (updates.scope !== undefined) role.scope = updates.scope
    if (updates.scope_values !== undefined) role.scope_values = updates.scope_values
    if (updates.is_active !== undefined) role.is_active = updates.is_active

    role.updated_at = new Date()
    role.version += 1

    roles[roleIndex] = role
    await persistentStorage.setItem(this.ROLES_KEY, roles)

    // Обновляем кэшированные разрешения у всех пользователей с этой ролью
    await this.updateUserRoleCache(role)

    await this.logAudit('Role.Updated', 'Role', role.id, {
      old_values: oldValues,
      new_values: role
    })

    return role
  }

  /**
   * Удалить роль (soft delete)
   */
  static async deleteRole(id: string): Promise<void> {
    const roles = await persistentStorage.getItem<Role[]>(this.ROLES_KEY) || []
    const role = roles.find(r => r.id === id && !r.deleted_at)

    if (!role) {
      throw new Error('Роль не найдена')
    }

    // Проверяем, что это не системная роль
    if (role.is_system) {
      throw new Error('Нельзя удалить системную роль')
    }

    // Проверяем, что роль не используется пользователями
    const users = await persistentStorage.getItem<User[]>(this.USERS_KEY) || []
    const usersWithRole = users.filter(u => 
      !u.deleted_at && u.roles.some(ur => ur.role_id === id)
    )

    if (usersWithRole.length > 0) {
      throw new Error(`Нельзя удалить роль, которая назначена ${usersWithRole.length} пользователям`)
    }

    // Soft delete
    role.deleted_at = new Date()
    role.updated_at = new Date()
    role.version += 1

    await persistentStorage.setItem(this.ROLES_KEY, roles)

    await this.logAudit('Role.Deleted', 'Role', role.id, {
      code: role.code,
      name: role.name
    })
  }

  /**
   * Назначить роль пользователю
   */
  static async assignRoleToUser(input: AssignRoleInput): Promise<void> {
    const users = await persistentStorage.getItem<User[]>(this.USERS_KEY) || []
    const user = users.find(u => u.id === input.user_id && !u.deleted_at)

    if (!user) {
      throw new Error('Пользователь не найден')
    }

    const role = await this.getRoleById(input.role_id)
    if (!role || !role.is_active) {
      throw new Error('Роль не найдена или неактивна')
    }

    // Проверяем, что роль уже не назначена
    const existingRole = user.roles.find(ur => ur.role_id === input.role_id)
    if (existingRole) {
      throw new Error('Роль уже назначена пользователю')
    }

    // Создаем UserRole
    const userRole: UserRole = {
      role_id: role.id,
      role_code: role.code,
      role_name: role.name,
      scope: role.scope,
      scope_value: input.scope_value,
      permissions: role.permissions,
      assigned_at: new Date(),
      expires_at: input.expires_at
    }

    user.roles.push(userRole)
    user.updated_at = new Date()
    user.version += 1

    await persistentStorage.setItem(this.USERS_KEY, users)

    await this.logAudit('Role.Assigned', 'User', user.id, {
      role_id: role.id,
      role_code: role.code,
      scope_value: input.scope_value
    })
  }

  /**
   * Отозвать роль у пользователя
   */
  static async unassignRoleFromUser(userId: string, roleId: string): Promise<void> {
    const users = await persistentStorage.getItem<User[]>(this.USERS_KEY) || []
    const user = users.find(u => u.id === userId && !u.deleted_at)

    if (!user) {
      throw new Error('Пользователь не найден')
    }

    const roleIndex = user.roles.findIndex(ur => ur.role_id === roleId)
    if (roleIndex === -1) {
      throw new Error('Роль не назначена пользователю')
    }

    const removedRole = user.roles[roleIndex]
    user.roles.splice(roleIndex, 1)
    user.updated_at = new Date()
    user.version += 1

    await persistentStorage.setItem(this.USERS_KEY, users)

    await this.logAudit('Role.Unassigned', 'User', user.id, {
      role_id: removedRole.role_id,
      role_code: removedRole.role_code
    })
  }

  /**
   * Получить статистику ролей
   */
  static async getRoleStatistics(): Promise<{
    totalRoles: number
    activeRoles: number
    systemRoles: number
    customRoles: number
    rolesByScope: Record<string, number>
    mostUsedRoles: Array<{ role: Role, userCount: number }>
  }> {
    const roles = await this.getAllRoles()
    const users = await persistentStorage.getItem<User[]>(this.USERS_KEY) || []

    const activeRoles = roles.filter(r => r.is_active)
    const systemRoles = roles.filter(r => r.is_system)
    const customRoles = roles.filter(r => !r.is_system)

    // Подсчет по scope
    const rolesByScope = roles.reduce((acc, role) => {
      acc[role.scope] = (acc[role.scope] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Самые используемые роли
    const roleUsage = new Map<string, number>()
    users.filter(u => !u.deleted_at).forEach(user => {
      user.roles.forEach(userRole => {
        const current = roleUsage.get(userRole.role_id) || 0
        roleUsage.set(userRole.role_id, current + 1)
      })
    })

    const mostUsedRoles = Array.from(roleUsage.entries())
      .map(([roleId, count]) => ({
        role: roles.find(r => r.id === roleId)!,
        userCount: count
      }))
      .filter(item => item.role)
      .sort((a, b) => b.userCount - a.userCount)
      .slice(0, 10)

    return {
      totalRoles: roles.length,
      activeRoles: activeRoles.length,
      systemRoles: systemRoles.length,
      customRoles: customRoles.length,
      rolesByScope,
      mostUsedRoles
    }
  }

  /**
   * Получить пользователей с определенной ролью
   */
  static async getUsersByRole(roleId: string): Promise<User[]> {
    const users = await persistentStorage.getItem<User[]>(this.USERS_KEY) || []
    return users.filter(u => 
      !u.deleted_at && u.roles.some(ur => ur.role_id === roleId)
    )
  }

  /**
   * Валидировать массив разрешений
   */
  private static validatePermissions(permissions: Permission[]): string[] {
    const errors: string[] = []

    permissions.forEach((permission, index) => {
      const permissionErrors = PermissionValidator.validatePermission(permission)
      permissionErrors.forEach(error => {
        errors.push(`Разрешение ${index + 1}: ${error}`)
      })

      // Проверяем, что section и resource существуют в конфигурации
      const section = PermissionHelpers.getSection(permission.section)
      if (!section && permission.section !== '*') {
        errors.push(`Разрешение ${index + 1}: Неизвестный раздел '${permission.section}'`)
      } else if (section) {
        const resource = PermissionHelpers.getResource(permission.section, permission.resource)
        if (!resource && permission.resource !== '*') {
          errors.push(`Разрешение ${index + 1}: Неизвестный ресурс '${permission.resource}' в разделе '${permission.section}'`)
        }
      }
    })

    return errors
  }

  /**
   * Обновить кэшированные разрешения роли у всех пользователей
   */
  private static async updateUserRoleCache(role: Role): Promise<void> {
    const users = await persistentStorage.getItem<User[]>(this.USERS_KEY) || []
    let hasUpdates = false

    users.forEach(user => {
      if (user.deleted_at) return

      user.roles.forEach(userRole => {
        if (userRole.role_id === role.id) {
          userRole.role_name = role.name
          userRole.permissions = role.permissions
          userRole.scope = role.scope
          hasUpdates = true
        }
      })

      if (hasUpdates) {
        user.updated_at = new Date()
        user.version += 1
      }
    })

    if (hasUpdates) {
      await persistentStorage.setItem(this.USERS_KEY, users)
    }
  }

  /**
   * Записать событие в аудит
   */
  private static async logAudit(
    action: string,
    entityType: string,
    entityId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const auditLogs = await persistentStorage.getItem<AuditLog[]>(this.AUDIT_KEY) || []
    
    const log: AuditLog = {
      id: CryptoUtils.generateSecureId(),
      tenant_id: 'system', // TODO: получать из контекста
      action,
      entity_type: entityType,
      entity_id: entityId,
      new_values: details,
      created_at: new Date()
    }

    auditLogs.push(log)
    
    // Сохраняем только последние 1000 записей
    if (auditLogs.length > 1000) {
      auditLogs.splice(0, auditLogs.length - 1000)
    }

    await persistentStorage.setItem(this.AUDIT_KEY, auditLogs)
  }

  /**
   * Создать системные роли по умолчанию
   */
  static async createDefaultSystemRoles(tenantId: string): Promise<Role[]> {
    const existingRoles = await this.getAllRoles()
    const systemRoles: Omit<Role, 'id' | 'created_at' | 'updated_at'>[] = [
      {
        tenant_id: tenantId,
        code: 'super_admin',
        name: 'Супер Администратор',
        description: 'Полный доступ ко всем функциям системы',
        permissions: [{ section: '*', resource: '*', actions: ['read', 'write', 'delete', 'manage'] }],
        scope: 'global',
        is_system: true,
        is_active: true,
        version: 1
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
        is_active: true,
        version: 1
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
        is_active: true,
        version: 1
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
        is_active: true,
        version: 1
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
        scope: 'assigned',
        is_system: true,
        is_active: true,
        version: 1
      }
    ]

    const rolesToCreate = systemRoles.filter(roleData => 
      !existingRoles.some(existing => existing.code === roleData.code)
    )

    const createdRoles: Role[] = []
    const now = new Date()

    for (const roleData of rolesToCreate) {
      const role: Role = {
        id: CryptoUtils.generateSecureId(),
        created_at: now,
        updated_at: now,
        ...roleData
      }
      createdRoles.push(role)
    }

    if (createdRoles.length > 0) {
      const allRoles = [...existingRoles, ...createdRoles]
      await persistentStorage.setItem(this.ROLES_KEY, allRoles)

      await this.logAudit('System.Roles.Created', 'System', undefined, {
        roles_created: createdRoles.map(r => r.code)
      })
    }

    return createdRoles
  }
}