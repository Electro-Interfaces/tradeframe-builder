/**
 * Бизнес-логика управления ролями и правами доступа
 * Для АГЕНТА 2: Бизнес-логика
 */

export interface Permission {
  code: string;
  name: string;
  description: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'execute' | '*';
}

export interface Role {
  id: string;
  name: string;
  code: string;
  scope: 'global' | 'network' | 'trading_point';
  permissions: string[];
  parentRoleId?: string;
  isSystem: boolean;
}

export interface UserRole {
  userId: string;
  roleId: string;
  networkId?: string;
  tradingPointId?: string;
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
}

export interface AccessScope {
  type: 'global' | 'network' | 'trading_point';
  networkId?: string;
  tradingPointId?: string;
}

export class RolesBusinessLogic {
  
  /**
   * Предопределенные разрешения системы
   */
  static readonly SYSTEM_PERMISSIONS: Record<string, Permission> = {
    // Управление пользователями
    'users.create': { 
      code: 'users.create', 
      name: 'Создание пользователей',
      description: 'Создание новых пользователей в системе',
      resource: 'users',
      action: 'create'
    },
    'users.read': { 
      code: 'users.read', 
      name: 'Просмотр пользователей',
      description: 'Просмотр списка пользователей и их профилей',
      resource: 'users',
      action: 'read'
    },
    'users.update': { 
      code: 'users.update', 
      name: 'Редактирование пользователей',
      description: 'Редактирование данных пользователей',
      resource: 'users',
      action: 'update'
    },
    'users.delete': { 
      code: 'users.delete', 
      name: 'Удаление пользователей',
      description: 'Удаление пользователей из системы',
      resource: 'users',
      action: 'delete'
    },
    
    // Управление ролями
    'roles.create': { 
      code: 'roles.create', 
      name: 'Создание ролей',
      description: 'Создание новых ролей',
      resource: 'roles',
      action: 'create'
    },
    'roles.read': { 
      code: 'roles.read', 
      name: 'Просмотр ролей',
      description: 'Просмотр списка ролей и разрешений',
      resource: 'roles',
      action: 'read'
    },
    'roles.update': { 
      code: 'roles.update', 
      name: 'Редактирование ролей',
      description: 'Изменение ролей и их разрешений',
      resource: 'roles',
      action: 'update'
    },
    'roles.delete': { 
      code: 'roles.delete', 
      name: 'Удаление ролей',
      description: 'Удаление ролей (кроме системных)',
      resource: 'roles',
      action: 'delete'
    },
    
    // Управление сетями
    'networks.create': { 
      code: 'networks.create', 
      name: 'Создание сетей',
      description: 'Создание торговых сетей',
      resource: 'networks',
      action: 'create'
    },
    'networks.read': { 
      code: 'networks.read', 
      name: 'Просмотр сетей',
      description: 'Просмотр торговых сетей',
      resource: 'networks',
      action: 'read'
    },
    'networks.update': { 
      code: 'networks.update', 
      name: 'Редактирование сетей',
      description: 'Редактирование параметров торговых сетей',
      resource: 'networks',
      action: 'update'
    },
    'networks.delete': { 
      code: 'networks.delete', 
      name: 'Удаление сетей',
      description: 'Удаление торговых сетей',
      resource: 'networks',
      action: 'delete'
    },
    
    // Управление торговыми точками
    'trading_points.*': { 
      code: 'trading_points.*', 
      name: 'Полный доступ к торговым точкам',
      description: 'Все операции с торговыми точками',
      resource: 'trading_points',
      action: '*'
    },
    
    // Операции с топливом
    'operations.create': { 
      code: 'operations.create', 
      name: 'Создание операций',
      description: 'Создание операций продажи топлива',
      resource: 'operations',
      action: 'create'
    },
    'operations.read': { 
      code: 'operations.read', 
      name: 'Просмотр операций',
      description: 'Просмотр операций и транзакций',
      resource: 'operations',
      action: 'read'
    },
    'operations.update': { 
      code: 'operations.update', 
      name: 'Редактирование операций',
      description: 'Изменение статуса операций',
      resource: 'operations',
      action: 'update'
    },
    
    // Управление резервуарами
    'tanks.read': { 
      code: 'tanks.read', 
      name: 'Мониторинг резервуаров',
      description: 'Просмотр состояния резервуаров',
      resource: 'tanks',
      action: 'read'
    },
    'tanks.update': { 
      code: 'tanks.update', 
      name: 'Управление резервуарами',
      description: 'Изменение параметров резервуаров',
      resource: 'tanks',
      action: 'update'
    },
    
    // Управление ценами
    'prices.read': { 
      code: 'prices.read', 
      name: 'Просмотр цен',
      description: 'Просмотр текущих цен на топливо',
      resource: 'prices',
      action: 'read'
    },
    'prices.update': { 
      code: 'prices.update', 
      name: 'Изменение цен',
      description: 'Установка и изменение цен на топливо',
      resource: 'prices',
      action: 'update'
    },
    
    // Отчеты
    'reports.read': { 
      code: 'reports.read', 
      name: 'Просмотр отчетов',
      description: 'Доступ к отчетам и аналитике',
      resource: 'reports',
      action: 'read'
    },
    'reports.export': { 
      code: 'reports.export', 
      name: 'Экспорт отчетов',
      description: 'Экспорт отчетов в различных форматах',
      resource: 'reports',
      action: 'execute'
    },
    
    // Системные разрешения
    'system.admin': { 
      code: 'system.admin', 
      name: 'Системное администрирование',
      description: 'Полный доступ ко всем функциям системы',
      resource: 'system',
      action: '*'
    },
    'audit.read': { 
      code: 'audit.read', 
      name: 'Просмотр аудита',
      description: 'Доступ к логам аудита системы',
      resource: 'audit',
      action: 'read'
    }
  };
  
  /**
   * Предопределенные системные роли
   */
  static readonly SYSTEM_ROLES: Record<string, Omit<Role, 'id'>> = {
    'system_admin': {
      name: 'Системный администратор',
      code: 'system_admin',
      scope: 'global',
      permissions: ['system.admin'],
      isSystem: true
    },
    'network_admin': {
      name: 'Администратор сети',
      code: 'network_admin',
      scope: 'network',
      permissions: [
        'networks.*', 'trading_points.*', 'users.read', 'users.update',
        'operations.read', 'tanks.read', 'prices.read', 'reports.read'
      ],
      isSystem: true
    },
    'point_manager': {
      name: 'Менеджер торговой точки',
      code: 'point_manager',
      scope: 'trading_point',
      permissions: [
        'trading_points.read', 'trading_points.update',
        'operations.*', 'tanks.read', 'prices.read',
        'users.read', 'reports.read'
      ],
      isSystem: true
    },
    'operator': {
      name: 'Оператор',
      code: 'operator',
      scope: 'trading_point',
      permissions: [
        'operations.create', 'operations.read',
        'tanks.read', 'prices.read'
      ],
      isSystem: true
    },
    'viewer': {
      name: 'Наблюдатель',
      code: 'viewer',
      scope: 'global',
      permissions: [
        'networks.read', 'trading_points.read',
        'operations.read', 'tanks.read', 'prices.read', 'reports.read'
      ],
      isSystem: true
    }
  };
  
  /**
   * Проверяет доступ пользователя к ресурсу
   */
  static checkAccess(
    userRoles: UserRole[],
    roles: Role[],
    requiredPermission: string,
    scope: AccessScope
  ): {
    hasAccess: boolean;
    matchedRole?: Role;
    reason: string;
  } {
    
    // Находим роли пользователя
    const userRoleIds = userRoles.map(ur => ur.roleId);
    const userRoleObjects = roles.filter(r => userRoleIds.includes(r.id));
    
    for (const userRoleAssignment of userRoles) {
      const role = roles.find(r => r.id === userRoleAssignment.roleId);
      if (!role) continue;
      
      // Проверяем срок действия роли
      if (userRoleAssignment.expiresAt && userRoleAssignment.expiresAt < new Date()) {
        continue;
      }
      
      // Получаем все разрешения роли (включая унаследованные)
      const effectivePermissions = this.getEffectivePermissions(role, roles);
      
      // Проверяем наличие нужного разрешения
      if (!this.hasPermission(effectivePermissions, requiredPermission)) {
        continue;
      }
      
      // Проверяем соответствие области доступа
      const scopeMatch = this.checkScopeAccess(role, userRoleAssignment, scope);
      if (scopeMatch.hasAccess) {
        return {
          hasAccess: true,
          matchedRole: role,
          reason: `Access granted by role: ${role.name} (${scopeMatch.reason})`
        };
      }
    }
    
    return {
      hasAccess: false,
      reason: `Access denied: required permission '${requiredPermission}' not found in user roles for scope ${scope.type}`
    };
  }
  
  /**
   * Проверяет соответствие области доступа
   */
  private static checkScopeAccess(
    role: Role,
    userRoleAssignment: UserRole,
    requestedScope: AccessScope
  ): { hasAccess: boolean; reason: string } {
    
    // Глобальные роли имеют доступ ко всему
    if (role.scope === 'global') {
      return { hasAccess: true, reason: 'Global scope access' };
    }
    
    // Проверка доступа на уровне сети
    if (role.scope === 'network') {
      if (requestedScope.type === 'global') {
        return { hasAccess: false, reason: 'Network role cannot access global scope' };
      }
      
      if (requestedScope.type === 'network') {
        if (userRoleAssignment.networkId === requestedScope.networkId) {
          return { hasAccess: true, reason: 'Network scope match' };
        }
        return { hasAccess: false, reason: 'Different network' };
      }
      
      if (requestedScope.type === 'trading_point') {
        // Нужно проверить, принадлежит ли торговая точка к сети пользователя
        // Это требует дополнительного запроса к БД, пока упрощаем
        return { hasAccess: true, reason: 'Network admin can access trading points in network' };
      }
    }
    
    // Проверка доступа на уровне торговой точки
    if (role.scope === 'trading_point') {
      if (requestedScope.type === 'global' || requestedScope.type === 'network') {
        return { hasAccess: false, reason: 'Trading point role cannot access higher scopes' };
      }
      
      if (requestedScope.type === 'trading_point') {
        if (userRoleAssignment.tradingPointId === requestedScope.tradingPointId) {
          return { hasAccess: true, reason: 'Trading point scope match' };
        }
        return { hasAccess: false, reason: 'Different trading point' };
      }
    }
    
    return { hasAccess: false, reason: 'Scope mismatch' };
  }
  
  /**
   * Проверяет наличие разрешения в списке
   */
  private static hasPermission(permissions: string[], required: string): boolean {
    // Прямое совпадение
    if (permissions.includes(required)) {
      return true;
    }
    
    // Универсальное разрешение
    if (permissions.includes('*') || permissions.includes('system.admin')) {
      return true;
    }
    
    // Проверка wildcard разрешений (например, "users.*" для "users.create")
    return permissions.some(permission => {
      if (permission.endsWith('.*')) {
        const resource = permission.slice(0, -2);
        return required.startsWith(resource + '.');
      }
      
      if (permission.endsWith('*')) {
        const prefix = permission.slice(0, -1);
        return required.startsWith(prefix);
      }
      
      return false;
    });
  }
  
  /**
   * Получает эффективные разрешения роли с учетом наследования
   */
  static getEffectivePermissions(role: Role, allRoles: Role[]): string[] {
    const permissions = new Set<string>();
    const visited = new Set<string>(); // Защита от циклических ссылок
    
    const collectPermissions = (currentRole: Role) => {
      if (visited.has(currentRole.id)) {
        return; // Избегаем бесконечной рекурсии
      }
      visited.add(currentRole.id);
      
      // Добавляем собственные разрешения
      currentRole.permissions.forEach(p => permissions.add(p));
      
      // Добавляем унаследованные разрешения
      if (currentRole.parentRoleId) {
        const parentRole = allRoles.find(r => r.id === currentRole.parentRoleId);
        if (parentRole) {
          collectPermissions(parentRole);
        }
      }
    };
    
    collectPermissions(role);
    return Array.from(permissions);
  }
  
  /**
   * Валидирует роль перед созданием/обновлением
   */
  static validateRole(
    role: Omit<Role, 'id'>,
    existingRoles: Role[]
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Проверка обязательных полей
    if (!role.name || role.name.trim().length === 0) {
      errors.push('Название роли обязательно');
    }
    
    if (!role.code || role.code.trim().length === 0) {
      errors.push('Код роли обязателен');
    }
    
    // Проверка уникальности кода
    if (existingRoles.some(r => r.code === role.code)) {
      errors.push('Роль с таким кодом уже существует');
    }
    
    // Проверка валидности области действия
    if (!['global', 'network', 'trading_point'].includes(role.scope)) {
      errors.push('Некорректная область действия роли');
    }
    
    // Проверка разрешений
    if (!role.permissions || role.permissions.length === 0) {
      errors.push('У роли должно быть хотя бы одно разрешение');
    }
    
    // Проверка существования разрешений
    const validPermissions = Object.keys(this.SYSTEM_PERMISSIONS);
    const invalidPermissions = role.permissions.filter(p => 
      !validPermissions.includes(p) && 
      !p.includes('*') && 
      p !== 'system.admin'
    );
    
    if (invalidPermissions.length > 0) {
      errors.push(`Недействительные разрешения: ${invalidPermissions.join(', ')}`);
    }
    
    // Проверка родительской роли
    if (role.parentRoleId) {
      const parentRole = existingRoles.find(r => r.id === role.parentRoleId);
      if (!parentRole) {
        errors.push('Родительская роль не найдена');
      } else if (parentRole.scope !== role.scope) {
        errors.push('Область действия должна совпадать с родительской ролью');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Проверяет возможность назначения роли пользователю
   */
  static canAssignRole(
    assignerRoles: UserRole[],
    roles: Role[],
    roleToAssign: Role,
    targetScope: AccessScope
  ): { canAssign: boolean; reason: string } {
    
    // Системные администраторы могут назначать любые роли
    const assignerRoleObjects = roles.filter(r => 
      assignerRoles.map(ar => ar.roleId).includes(r.id)
    );
    
    const hasSystemAdmin = assignerRoleObjects.some(r => 
      r.permissions.includes('system.admin') || r.permissions.includes('*')
    );
    
    if (hasSystemAdmin) {
      return { canAssign: true, reason: 'System administrator privileges' };
    }
    
    // Проверяем право на управление пользователями
    const canManageUsers = this.checkAccess(
      assignerRoles,
      roles,
      'users.update',
      targetScope
    );
    
    if (!canManageUsers.hasAccess) {
      return { 
        canAssign: false, 
        reason: 'Insufficient permissions to manage users' 
      };
    }
    
    // Нельзя назначать роли с более высокими привилегиями
    const assignerPermissions = assignerRoleObjects.flatMap(r => 
      this.getEffectivePermissions(r, roles)
    );
    
    const roleToAssignPermissions = this.getEffectivePermissions(roleToAssign, roles);
    
    const hasAllPermissions = roleToAssignPermissions.every(permission => 
      this.hasPermission(assignerPermissions, permission)
    );
    
    if (!hasAllPermissions) {
      return { 
        canAssign: false, 
        reason: 'Cannot assign role with higher privileges than own' 
      };
    }
    
    return { canAssign: true, reason: 'Sufficient permissions to assign role' };
  }
  
  /**
   * Создает иерархию ролей для отображения
   */
  static buildRoleHierarchy(roles: Role[]): Array<{
    role: Role;
    children: Array<any>;
    level: number;
  }> {
    const roleMap = new Map(roles.map(r => [r.id, r]));
    const hierarchy: Array<any> = [];
    const visited = new Set<string>();
    
    const buildNode = (role: Role, level: number = 0): any => {
      if (visited.has(role.id)) {
        return null; // Избегаем циклических ссылок
      }
      visited.add(role.id);
      
      const children = roles
        .filter(r => r.parentRoleId === role.id)
        .map(childRole => buildNode(childRole, level + 1))
        .filter(Boolean);
      
      return {
        role,
        children,
        level
      };
    };
    
    // Найдем корневые роли (без родителя)
    const rootRoles = roles.filter(r => !r.parentRoleId);
    
    rootRoles.forEach(rootRole => {
      const node = buildNode(rootRole);
      if (node) {
        hierarchy.push(node);
      }
    });
    
    return hierarchy;
  }
}