/**
 * Сервис для работы с ролями и разрешениями
 * РЕФАКТОРИНГ: Динамические разрешения из БД вместо статической матрицы
 */

import type { AppUser, UserRole } from './authService';
import type { Permission, PermissionAction } from '@/types/auth';

// Видимость меню на основе разрешений
export interface MenuVisibility {
  admin: boolean;
  networks: boolean;
  tradingPoint: boolean;
  settings: boolean;
  reports: boolean;
}

/**
 * Типы для проверки разрешений
 */
interface PermissionCheck {
  section: string;
  resource: string;
  action: PermissionAction;
}

class PermissionService {
  /**
   * Проверяет наличие конкретного разрешения у пользователя
   * Поддерживает оба формата: строковый и объектный
   *
   * Строковый формат: "section.resource.action" (например "admin.users.read")
   * Объектный формат: { section, resource, actions: [] }
   */
  hasPermission(user: AppUser, permission: string | PermissionCheck): boolean {
    if (!user) return false;

    // Суперадмины имеют все права
    if (this.isSuperAdmin(user)) {
      return true;
    }

    // Парсим permission если это строка
    let check: PermissionCheck;
    if (typeof permission === 'string') {
      const parsed = this.parsePermissionString(permission);
      if (!parsed) return false;
      check = parsed;
    } else {
      check = permission;
    }

    // Проверяем в массиве permissions пользователя
    return this.checkUserPermissions(user, check);
  }

  /**
   * Проверяет разрешение в массиве permissions пользователя
   */
  private checkUserPermissions(user: AppUser, check: PermissionCheck): boolean {
    if (!user.permissions || user.permissions.length === 0) {
      return false;
    }

    return user.permissions.some((perm: any) => {
      // Если permission - объект с section/resource/actions
      if (typeof perm === 'object' && perm !== null) {
        const matchSection = perm.section === check.section;
        const matchResource = perm.resource === check.resource || perm.resource === '*';
        const matchAction = perm.actions?.includes(check.action) || perm.actions?.includes('manage');
        return matchSection && matchResource && matchAction;
      }

      // Если permission - строка
      if (typeof perm === 'string') {
        // Проверяем специальное разрешение "all"
        if (perm === 'all' || perm === '*') {
          return true;
        }

        // Парсим строку в формате "section.resource.action"
        const permString = `${check.section}.${check.resource}.${check.action}`;
        return perm === permString;
      }

      return false;
    });
  }

  /**
   * Проверяет наличие любого из списка разрешений
   */
  hasAnyPermission(user: AppUser, permissions: Array<string | PermissionCheck>): boolean {
    if (!user) return false;
    if (this.isSuperAdmin(user)) return true;

    return permissions.some(perm => this.hasPermission(user, perm));
  }

  /**
   * Проверяет наличие всех разрешений из списка
   */
  hasAllPermissions(user: AppUser, permissions: Array<string | PermissionCheck>): boolean {
    if (!user) return false;
    if (this.isSuperAdmin(user)) return true;

    return permissions.every(perm => this.hasPermission(user, perm));
  }

  /**
   * Проверяет является ли пользователь суперадминистратором
   * Проверяем по разрешению "all" или по роли super_admin/system_admin
   */
  isSuperAdmin(user: AppUser): boolean {
    if (!user) return false;

    // Проверяем специальное разрешение "all"
    if (user.permissions?.some((p: any) => p === 'all' || p === '*')) {
      return true;
    }

    // Проверяем роль (для обратной совместимости)
    const superAdminRoles = ['super_admin', 'system_admin'];
    if (superAdminRoles.includes(user.role)) {
      return true;
    }

    // Проверяем в массиве ролей
    if (user.roles?.some(r => superAdminRoles.includes(r.roleCode))) {
      return true;
    }

    return false;
  }

  /**
   * Проверяет является ли пользователь администратором (любого уровня)
   */
  isAdmin(user: AppUser): boolean {
    if (!user) return false;

    // Суперадмин - тоже админ
    if (this.isSuperAdmin(user)) return true;

    // Проверяем разрешение на управление пользователями или ролями
    if (this.hasPermission(user, { section: 'admin', resource: 'users', action: 'manage' })) {
      return true;
    }
    if (this.hasPermission(user, { section: 'admin', resource: 'roles', action: 'manage' })) {
      return true;
    }

    // Для обратной совместимости - проверяем роль
    const adminRoles = ['super_admin', 'system_admin', 'network_admin'];
    if (adminRoles.includes(user.role)) {
      return true;
    }

    return false;
  }

  /**
   * Проверяет доступ к конкретному разделу меню
   */
  hasMenuAccess(user: AppUser, menuSection: string): boolean {
    if (!user) return false;
    if (this.isSuperAdmin(user)) return true;

    // Проверяем разрешение на видимость меню
    return this.hasPermission(user, {
      section: 'menu_visibility',
      resource: `${menuSection}_menu`,
      action: 'view_menu'
    });
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

    // Суперадмин видит всё
    if (this.isSuperAdmin(user)) {
      return {
        admin: true,
        networks: true,
        tradingPoint: true,
        settings: true,
        reports: true
      };
    }

    // Проверяем разрешения на видимость меню
    const visibility: MenuVisibility = {
      admin: this.hasMenuAccess(user, 'admin') || this.isAdmin(user),
      networks: this.hasMenuAccess(user, 'networks') || this.hasAnyPermission(user, [
        { section: 'networks', resource: 'networks', action: 'read' },
        { section: 'networks', resource: 'trading_points', action: 'read' }
      ]),
      tradingPoint: this.hasMenuAccess(user, 'trading_point') || this.hasAnyPermission(user, [
        { section: 'equipment', resource: 'tanks', action: 'read' },
        { section: 'finance', resource: 'prices', action: 'read' }
      ]),
      settings: this.hasMenuAccess(user, 'settings') || this.isAdmin(user),
      reports: this.hasMenuAccess(user, 'reports') || this.hasPermission(user, {
        section: 'operations',
        resource: 'reports',
        action: 'read'
      })
    };

    return visibility;
  }

  /**
   * Получает отображаемое имя роли
   */
  getRoleDisplayName(role: string): string {
    const roleNames: Record<string, string> = {
      'super_admin': 'Супер Администратор',
      'system_admin': 'Системный Администратор',
      'network_admin': 'Администратор Сети',
      'point_manager': 'Менеджер Точки',
      'manager': 'Менеджер',
      'operator': 'Оператор',
      'driver': 'Водитель',
      'bto_manager': 'Менеджер БТО',
      'user': 'Пользователь'
    };

    return roleNames[role] || role || 'Пользователь';
  }

  /**
   * Парсит строку разрешения в объект
   * Формат: "section.resource.action"
   */
  private parsePermissionString(permission: string): PermissionCheck | null {
    const parts = permission.split('.');
    if (parts.length < 2) return null;

    return {
      section: parts[0],
      resource: parts[1],
      action: (parts[2] || 'read') as PermissionAction
    };
  }

  // =====================================================
  // Специфические проверки для обратной совместимости
  // =====================================================

  canManageTanks(user: AppUser): boolean {
    return this.hasAnyPermission(user, [
      { section: 'equipment', resource: 'tanks', action: 'manage' },
      { section: 'equipment', resource: 'tanks', action: 'write' }
    ]);
  }

  canCalibrate(user: AppUser): boolean {
    return this.hasAnyPermission(user, [
      { section: 'equipment', resource: 'calibration', action: 'write' },
      { section: 'equipment', resource: 'calibration', action: 'manage' },
      { section: 'equipment', resource: 'tanks', action: 'manage' }
    ]);
  }

  canManagePrices(user: AppUser): boolean {
    return this.hasAnyPermission(user, [
      { section: 'finance', resource: 'prices', action: 'manage' },
      { section: 'finance', resource: 'prices', action: 'write' }
    ]);
  }

  canManageUsers(user: AppUser): boolean {
    return this.hasAnyPermission(user, [
      { section: 'admin', resource: 'users', action: 'manage' },
      { section: 'admin', resource: 'users', action: 'write' }
    ]);
  }

  canViewReports(user: AppUser): boolean {
    return this.hasAnyPermission(user, [
      { section: 'operations', resource: 'reports', action: 'read' },
      { section: 'operations', resource: 'shifts', action: 'read' }
    ]);
  }

  canManageNetworks(user: AppUser): boolean {
    return this.hasAnyPermission(user, [
      { section: 'networks', resource: 'networks', action: 'manage' },
      { section: 'networks', resource: 'networks', action: 'write' }
    ]);
  }

  canManageEquipment(user: AppUser): boolean {
    return this.hasAnyPermission(user, [
      { section: 'equipment', resource: 'dispensers', action: 'manage' },
      { section: 'equipment', resource: 'sensors', action: 'manage' }
    ]);
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
  // Проверяем основную роль
  if (user.role === role) return true;
  // Проверяем в массиве ролей
  return user.roles?.some(r => r.roleCode === role) || false;
};

export const isAdmin = (user: AppUser | null | undefined): boolean => {
  if (!user) return false;
  return permissionService.isAdmin(user);
};

export const isSuperAdmin = (user: AppUser | null | undefined): boolean => {
  if (!user) return false;
  return permissionService.isSuperAdmin(user);
};

export type { MenuVisibility };
