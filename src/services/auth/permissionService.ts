/**
 * Сервис для работы с ролями и разрешениями
 * Определяет права доступа на основе роли пользователя
 */

import type { AppUser } from './authService';

// Определение ролей в системе
export const ROLES = {
  SUPER_ADMIN: 'system_admin',
  NETWORK_ADMIN: 'network_admin',
  POINT_MANAGER: 'point_manager',
  OPERATOR: 'operator',
  DRIVER: 'driver',
  BTO_MANAGER: 'bto_manager',
  USER: 'user'
} as const;

// Определение разрешений
export const PERMISSIONS = {
  // Админ разрешения
  ADMIN_USERS: 'admin.users',
  ADMIN_ROLES: 'admin.roles',
  ADMIN_SETTINGS: 'admin.settings',
  ADMIN_AUDIT: 'admin.audit',

  // Сетевые разрешения
  NETWORKS_VIEW: 'networks.view',
  NETWORKS_MANAGE: 'networks.manage',

  // Торговые точки
  POINTS_VIEW: 'points.view',
  POINTS_MANAGE: 'points.manage',

  // Оборудование
  EQUIPMENT_VIEW: 'equipment.view',
  EQUIPMENT_MANAGE: 'equipment.manage',

  // Резервуары
  TANKS_VIEW: 'tanks.view',
  TANKS_MANAGE: 'tanks.manage',
  TANKS_CALIBRATE: 'tanks.calibrate',

  // Цены
  PRICES_VIEW: 'prices.view',
  PRICES_MANAGE: 'prices.manage',

  // Отчеты
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export'
} as const;

// Матрица ролей и разрешений
const ROLE_PERMISSIONS: Record<string, string[]> = {
  [ROLES.SUPER_ADMIN]: [
    PERMISSIONS.ADMIN_USERS,
    PERMISSIONS.ADMIN_ROLES,
    PERMISSIONS.ADMIN_SETTINGS,
    PERMISSIONS.ADMIN_AUDIT,
    PERMISSIONS.NETWORKS_VIEW,
    PERMISSIONS.NETWORKS_MANAGE,
    PERMISSIONS.POINTS_VIEW,
    PERMISSIONS.POINTS_MANAGE,
    PERMISSIONS.EQUIPMENT_VIEW,
    PERMISSIONS.EQUIPMENT_MANAGE,
    PERMISSIONS.TANKS_VIEW,
    PERMISSIONS.TANKS_MANAGE,
    PERMISSIONS.TANKS_CALIBRATE,
    PERMISSIONS.PRICES_VIEW,
    PERMISSIONS.PRICES_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT
  ],

  [ROLES.NETWORK_ADMIN]: [
    PERMISSIONS.NETWORKS_VIEW,
    PERMISSIONS.NETWORKS_MANAGE,
    PERMISSIONS.POINTS_VIEW,
    PERMISSIONS.POINTS_MANAGE,
    PERMISSIONS.EQUIPMENT_VIEW,
    PERMISSIONS.EQUIPMENT_MANAGE,
    PERMISSIONS.TANKS_VIEW,
    PERMISSIONS.TANKS_MANAGE,
    PERMISSIONS.TANKS_CALIBRATE,
    PERMISSIONS.PRICES_VIEW,
    PERMISSIONS.PRICES_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT
  ],

  [ROLES.POINT_MANAGER]: [
    PERMISSIONS.POINTS_VIEW,
    PERMISSIONS.EQUIPMENT_VIEW,
    PERMISSIONS.EQUIPMENT_MANAGE,
    PERMISSIONS.TANKS_VIEW,
    PERMISSIONS.TANKS_CALIBRATE,
    PERMISSIONS.PRICES_VIEW,
    PERMISSIONS.PRICES_MANAGE,
    PERMISSIONS.REPORTS_VIEW
  ],

  [ROLES.OPERATOR]: [
    PERMISSIONS.EQUIPMENT_VIEW,
    PERMISSIONS.TANKS_VIEW,
    PERMISSIONS.PRICES_VIEW,
    PERMISSIONS.REPORTS_VIEW
  ],

  [ROLES.BTO_MANAGER]: [
    PERMISSIONS.NETWORKS_VIEW,
    PERMISSIONS.POINTS_VIEW,
    PERMISSIONS.EQUIPMENT_VIEW,
    PERMISSIONS.TANKS_VIEW,
    PERMISSIONS.REPORTS_VIEW
  ],

  [ROLES.DRIVER]: [
    PERMISSIONS.EQUIPMENT_VIEW,
    PERMISSIONS.TANKS_VIEW
  ],

  [ROLES.USER]: [
    PERMISSIONS.NETWORKS_VIEW,
    PERMISSIONS.POINTS_VIEW
  ]
};

// Видимость меню на основе разрешений
export interface MenuVisibility {
  admin: boolean;
  networks: boolean;
  tradingPoint: boolean;
  settings: boolean;
  reports: boolean;
}

class PermissionService {
  /**
   * Получает все разрешения для роли пользователя
   */
  getPermissionsForUser(user: AppUser): string[] {
    // Если у пользователя есть permission "all" - суперадмин
    if (user.permissions.includes('all')) {
      return ROLE_PERMISSIONS[ROLES.SUPER_ADMIN];
    }

    // Если есть прямые разрешения в preferences, используем их
    if (user.permissions.length > 0) {
      return user.permissions;
    }

    // Получаем разрешения на основе роли
    const rolePermissions = ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS[ROLES.USER];

    console.log(`🔑 PermissionService: User ${user.email} role "${user.role}" has permissions:`, rolePermissions);

    return rolePermissions;
  }

  /**
   * Проверяет наличие конкретного разрешения у пользователя
   */
  hasPermission(user: AppUser, permission: string): boolean {
    const userPermissions = this.getPermissionsForUser(user);
    return userPermissions.includes(permission);
  }

  /**
   * Проверяет является ли пользователь администратором
   */
  isAdmin(user: AppUser): boolean {
    return user.role === ROLES.SUPER_ADMIN ||
           user.permissions.includes('all') ||
           this.hasPermission(user, PERMISSIONS.ADMIN_USERS);
  }

  /**
   * Определяет видимость разделов меню для пользователя
   */
  getMenuVisibility(user: AppUser): MenuVisibility {
    if (!user) {
      return {
        admin: false,
        networks: false,
        tradingPoint: false,
        settings: false,
        reports: false
      };
    }

    console.log('🔍 PermissionService: Calculating menu visibility for user:', {
      email: user.email,
      role: user.role,
      permissions: user.permissions
    });

    const permissions = this.getPermissionsForUser(user);

    const visibility: MenuVisibility = {
      admin: this.isAdmin(user),
      networks: permissions.includes(PERMISSIONS.NETWORKS_VIEW),
      tradingPoint: permissions.includes(PERMISSIONS.POINTS_VIEW) ||
                   permissions.includes(PERMISSIONS.EQUIPMENT_VIEW),
      settings: this.isAdmin(user),
      reports: permissions.includes(PERMISSIONS.REPORTS_VIEW)
    };

    console.log('📊 PermissionService: Menu visibility result:', visibility);

    return visibility;
  }

  /**
   * Получает отображаемое имя роли
   */
  getRoleDisplayName(role: string): string {
    const roleNames: Record<string, string> = {
      [ROLES.SUPER_ADMIN]: 'Супер Администратор',
      [ROLES.NETWORK_ADMIN]: 'Администратор Сети',
      [ROLES.POINT_MANAGER]: 'Менеджер Точки',
      [ROLES.OPERATOR]: 'Оператор',
      [ROLES.DRIVER]: 'Водитель',
      [ROLES.BTO_MANAGER]: 'Менеджер БТО',
      [ROLES.USER]: 'Пользователь'
    };

    return roleNames[role] || 'Пользователь';
  }

  /**
   * Проверяет специфические разрешения для обратной совместимости с AuthContext
   */
  canManageTanks(user: AppUser): boolean {
    return this.hasPermission(user, PERMISSIONS.TANKS_MANAGE);
  }

  canCalibrate(user: AppUser): boolean {
    return this.hasPermission(user, PERMISSIONS.TANKS_CALIBRATE);
  }

  canManagePrices(user: AppUser): boolean {
    return this.hasPermission(user, PERMISSIONS.PRICES_MANAGE);
  }

  canManageUsers(user: AppUser): boolean {
    return this.hasPermission(user, PERMISSIONS.ADMIN_USERS);
  }

  canViewReports(user: AppUser): boolean {
    return this.hasPermission(user, PERMISSIONS.REPORTS_VIEW);
  }
}

export const permissionService = new PermissionService();

// Утилитные функции для удобного использования
export const hasPermission = (user: AppUser | null | undefined, permission: string): boolean => {
  if (!user) return false;
  return permissionService.hasPermission(user, permission);
};

export const hasRole = (user: AppUser | null | undefined, role: string): boolean => {
  if (!user) return false;
  return user.role === role;
};

export const isAdmin = (user: AppUser | null | undefined): boolean => {
  if (!user) return false;
  return permissionService.isAdmin(user);
};

export type { MenuVisibility };