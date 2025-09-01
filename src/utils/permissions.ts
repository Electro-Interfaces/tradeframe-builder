/**
 * Утилиты для проверки разрешений и валидации доступа
 * Поддержка гранулярных разрешений, условий и scope-based контроля
 */

import type { Permission, PermissionAction, PermissionCondition, User, UserRole } from '@/types/auth'
import { SPECIAL_PERMISSIONS } from '@/config/permissions'

export class PermissionChecker {
  /**
   * Проверить разрешение пользователя
   */
  static hasPermission(
    user: User | null,
    section: string,
    resource: string,
    action: PermissionAction,
    context?: Record<string, any>
  ): boolean {
    if (!user || user.status !== 'active') {
      return false
    }

    // Получаем все разрешения пользователя (роли + прямые)
    const allPermissions = this.getUserPermissions(user)

    // Проверяем специальное разрешение "все"
    const hasAllPermissions = allPermissions.some(p => 
      p.section === SPECIAL_PERMISSIONS.ALL || 
      (p.section === section && p.resource === SPECIAL_PERMISSIONS.ALL)
    )
    
    if (hasAllPermissions) {
      return true
    }

    // Ищем конкретное разрешение
    const permission = allPermissions.find(p => 
      p.section === section && 
      p.resource === resource &&
      p.actions.includes(action)
    )

    if (!permission) {
      return false
    }

    // Проверяем условия если они есть
    if (permission.conditions && permission.conditions.length > 0) {
      return this.checkConditions(permission.conditions, context || {})
    }

    return true
  }

  /**
   * Проверить любое из разрешений (OR логика)
   */
  static hasAnyPermission(
    user: User | null,
    permissions: Array<{
      section: string
      resource: string
      action: PermissionAction
      context?: Record<string, any>
    }>
  ): boolean {
    return permissions.some(p => 
      this.hasPermission(user, p.section, p.resource, p.action, p.context)
    )
  }

  /**
   * Проверить все разрешения (AND логика)
   */
  static hasAllPermissions(
    user: User | null,
    permissions: Array<{
      section: string
      resource: string  
      action: PermissionAction
      context?: Record<string, any>
    }>
  ): boolean {
    return permissions.every(p => 
      this.hasPermission(user, p.section, p.resource, p.action, p.context)
    )
  }

  /**
   * Получить все разрешения пользователя
   */
  static getUserPermissions(user: User): Permission[] {
    const permissions: Permission[] = []

    // Добавляем разрешения из ролей
    user.roles.forEach(role => {
      permissions.push(...role.permissions)
    })

    // Добавляем прямые разрешения (они имеют приоритет)
    if (user.direct_permissions) {
      permissions.push(...user.direct_permissions)
    }

    // Удаляем дубликаты
    return this.deduplicatePermissions(permissions)
  }

  /**
   * Проверить условия доступа
   */
  static checkConditions(
    conditions: PermissionCondition[],
    context: Record<string, any>
  ): boolean {
    return conditions.every(condition => {
      const contextValue = this.getContextValue(context, condition.field)
      
      switch (condition.operator) {
        case '=':
          return contextValue === condition.value
        
        case '!=':
          return contextValue !== condition.value
        
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(contextValue)
        
        case 'not_in':
          return Array.isArray(condition.value) && !condition.value.includes(contextValue)
        
        case 'contains':
          return typeof contextValue === 'string' && 
                 typeof condition.value === 'string' && 
                 contextValue.includes(condition.value)
        
        case 'starts_with':
          return typeof contextValue === 'string' && 
                 typeof condition.value === 'string' && 
                 contextValue.startsWith(condition.value)
        
        default:
          console.warn(`Unknown condition operator: ${condition.operator}`)
          return false
      }
    })
  }

  /**
   * Получить значение из контекста по пути (поддержка вложенных объектов)
   */
  private static getContextValue(context: Record<string, any>, field: string): any {
    const parts = field.split('.')
    let value = context
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part]
      } else {
        return undefined
      }
    }
    
    return value
  }

  /**
   * Удалить дубликаты разрешений
   */
  private static deduplicatePermissions(permissions: Permission[]): Permission[] {
    const seen = new Set<string>()
    const result: Permission[] = []

    permissions.forEach(permission => {
      permission.actions.forEach(action => {
        const key = `${permission.section}.${permission.resource}.${action}`
        if (!seen.has(key)) {
          seen.add(key)
          
          // Ищем существующее разрешение или создаем новое
          let existingPermission = result.find(p => 
            p.section === permission.section && p.resource === permission.resource
          )
          
          if (!existingPermission) {
            existingPermission = {
              section: permission.section,
              resource: permission.resource,
              actions: [],
              conditions: permission.conditions
            }
            result.push(existingPermission)
          }
          
          if (!existingPermission.actions.includes(action)) {
            existingPermission.actions.push(action)
          }
        }
      })
    })

    return result
  }

  /**
   * Проверить scope доступ для роли
   */
  static checkScopeAccess(
    userRole: UserRole,
    requestedScope: string,
    requestedValue?: string
  ): boolean {
    switch (userRole.scope) {
      case 'global':
        return true // глобальный доступ ко всему
      
      case 'network':
        if (requestedScope === 'network') {
          return !userRole.scope_value || userRole.scope_value === requestedValue
        }
        // Доступ к торговым точкам своей сети
        if (requestedScope === 'trading_point') {
          // Нужна дополнительная логика для проверки принадлежности точки к сети
          return true // TODO: реализовать проверку через networksService
        }
        return false
      
      case 'trading_point':
        return requestedScope === 'trading_point' && 
               (!userRole.scope_value || userRole.scope_value === requestedValue)
      
      case 'assigned':
        // Кастомная логика для assigned scope
        return userRole.scope_value === requestedValue
      
      default:
        return false
    }
  }

  /**
   * Получить доступные scope values для роли
   */
  static getAvailableScopeValues(
    userRole: UserRole,
    context: Record<string, any>
  ): string[] {
    switch (userRole.scope) {
      case 'global':
        return [] // глобальный доступ не требует конкретных значений
      
      case 'network':
        return context.availableNetworks || []
      
      case 'trading_point':
        return context.availableTradingPoints || []
      
      case 'assigned':
        return context.assignedResources || []
      
      default:
        return []
    }
  }
}

/**
 * Хук для использования в React компонентах
 */
export const usePermissions = () => {
  // Будет реализован в AuthContext
  return {
    hasPermission: (section: string, resource: string, action: PermissionAction, context?: any) => {
      // Реализация будет в AuthContext
      return false
    },
    hasAnyPermission: (permissions: any[]) => false,
    hasAllPermissions: (permissions: any[]) => false
  }
}

/**
 * Валидатор для разрешений
 */
export class PermissionValidator {
  /**
   * Валидировать структуру разрешения
   */
  static validatePermission(permission: Permission): string[] {
    const errors: string[] = []

    if (!permission.section) {
      errors.push('Не указан раздел разрешения')
    }

    if (!permission.resource) {
      errors.push('Не указан ресурс разрешения')
    }

    if (!permission.actions || permission.actions.length === 0) {
      errors.push('Не указаны действия для разрешения')
    }

    if (permission.actions) {
      const validActions: PermissionAction[] = ['read', 'write', 'delete', 'manage']
      const invalidActions = permission.actions.filter(action => !validActions.includes(action))
      if (invalidActions.length > 0) {
        errors.push(`Недопустимые действия: ${invalidActions.join(', ')}`)
      }
    }

    if (permission.conditions) {
      permission.conditions.forEach((condition, index) => {
        const conditionErrors = this.validateCondition(condition)
        conditionErrors.forEach(error => {
          errors.push(`Условие ${index + 1}: ${error}`)
        })
      })
    }

    return errors
  }

  /**
   * Валидировать условие доступа
   */
  static validateCondition(condition: PermissionCondition): string[] {
    const errors: string[] = []

    if (!condition.field) {
      errors.push('Не указано поле условия')
    }

    if (!condition.operator) {
      errors.push('Не указан оператор условия')
    }

    const validOperators = ['=', '!=', 'in', 'not_in', 'contains', 'starts_with']
    if (!validOperators.includes(condition.operator)) {
      errors.push(`Недопустимый оператор: ${condition.operator}`)
    }

    if (condition.value === undefined || condition.value === null) {
      errors.push('Не указано значение условия')
    }

    if (['in', 'not_in'].includes(condition.operator) && !Array.isArray(condition.value)) {
      errors.push('Для операторов in/not_in значение должно быть массивом')
    }

    return errors
  }
}

/**
 * Утилиты для работы с permission строками
 */
export const PermissionStrings = {
  /**
   * Создать permission строку
   */
  create(section: string, resource: string, action: PermissionAction): string {
    return `${section}.${resource}.${action}`
  },

  /**
   * Распарсить permission строку
   */
  parse(permissionString: string): { section: string, resource: string, action: PermissionAction } | null {
    const parts = permissionString.split('.')
    if (parts.length !== 3) return null

    const [section, resource, action] = parts
    if (!['read', 'write', 'delete', 'manage'].includes(action)) return null

    return { section, resource, action: action as PermissionAction }
  },

  /**
   * Конвертировать Permission в строки
   */
  fromPermission(permission: Permission): string[] {
    return permission.actions.map(action => 
      this.create(permission.section, permission.resource, action)
    )
  },

  /**
   * Конвертировать строки в Permission
   */
  toPermissions(permissionStrings: string[]): Permission[] {
    const permissionMap = new Map<string, Permission>()

    permissionStrings.forEach(str => {
      const parsed = this.parse(str)
      if (!parsed) return

      const key = `${parsed.section}.${parsed.resource}`
      const existing = permissionMap.get(key)

      if (existing) {
        if (!existing.actions.includes(parsed.action)) {
          existing.actions.push(parsed.action)
        }
      } else {
        permissionMap.set(key, {
          section: parsed.section,
          resource: parsed.resource,
          actions: [parsed.action]
        })
      }
    })

    return Array.from(permissionMap.values())
  }
}