import { describe, it, expect } from 'vitest';
import {
  permissionService,
  hasPermission,
  hasRole,
  isAdmin,
  isSuperAdmin,
} from '../permissionService';
import type { AppUser } from '../authService';

/** Фабрика тестового пользователя */
function createTestUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    status: 'active',
    role: 'user',
    roleId: 1,
    permissions: [],
    roles: [],
    ...overrides,
  };
}

// =============================================================================
// hasPermission
// =============================================================================
describe('permissionService.hasPermission', () => {
  it('возвращает false для null user', () => {
    expect(permissionService.hasPermission(null as any, 'admin.users.read')).toBe(false);
  });

  it('строковый формат "section.resource.action"', () => {
    const user = createTestUser({
      permissions: ['admin.users.read'],
    });
    expect(permissionService.hasPermission(user, 'admin.users.read')).toBe(true);
  });

  it('строковый формат — нет совпадения', () => {
    const user = createTestUser({
      permissions: ['admin.users.read'],
    });
    expect(permissionService.hasPermission(user, 'admin.users.write')).toBe(false);
  });

  it('объектный формат { section, resource, action }', () => {
    const user = createTestUser({
      permissions: [{ section: 'admin', resource: 'users', actions: ['read'] }],
    });
    expect(
      permissionService.hasPermission(user, { section: 'admin', resource: 'users', action: 'read' })
    ).toBe(true);
  });

  it('объектный формат — нет совпадения по action', () => {
    const user = createTestUser({
      permissions: [{ section: 'admin', resource: 'users', actions: ['read'] }],
    });
    expect(
      permissionService.hasPermission(user, { section: 'admin', resource: 'users', action: 'write' })
    ).toBe(false);
  });

  it('wildcard resource "*" даёт доступ к любому ресурсу', () => {
    const user = createTestUser({
      permissions: [{ section: 'admin', resource: '*', actions: ['read'] }],
    });
    expect(
      permissionService.hasPermission(user, { section: 'admin', resource: 'users', action: 'read' })
    ).toBe(true);
  });

  it('"manage" действует как wildcard action', () => {
    const user = createTestUser({
      permissions: [{ section: 'admin', resource: 'users', actions: ['manage'] }],
    });
    expect(
      permissionService.hasPermission(user, { section: 'admin', resource: 'users', action: 'read' })
    ).toBe(true);
  });

  it('пустой массив permissions → false', () => {
    const user = createTestUser({ permissions: [] });
    expect(permissionService.hasPermission(user, 'admin.users.read')).toBe(false);
  });

  it('permissions = undefined → false', () => {
    const user = createTestUser();
    (user as any).permissions = undefined;
    expect(permissionService.hasPermission(user, 'admin.users.read')).toBe(false);
  });

  it('строковое разрешение "all" → true для любого запроса', () => {
    const user = createTestUser({ permissions: ['all'] });
    expect(permissionService.hasPermission(user, 'anything.any.read')).toBe(true);
  });

  it('строковое разрешение "*" → true для любого запроса', () => {
    const user = createTestUser({ permissions: ['*'] });
    expect(permissionService.hasPermission(user, 'anything.any.read')).toBe(true);
  });

  it('parsePermissionString: 2 части → action по умолчанию "read"', () => {
    const user = createTestUser({ permissions: ['admin.users.read'] });
    expect(permissionService.hasPermission(user, 'admin.users')).toBe(true);
  });

  it('parsePermissionString: 1 часть → null → false', () => {
    const user = createTestUser({ permissions: ['admin'] });
    expect(permissionService.hasPermission(user, 'admin')).toBe(false);
  });

  it('суперадмин имеет любое разрешение', () => {
    const user = createTestUser({ role: 'super_admin' });
    expect(permissionService.hasPermission(user, 'any.thing.delete')).toBe(true);
  });
});

// =============================================================================
// isSuperAdmin
// =============================================================================
describe('permissionService.isSuperAdmin', () => {
  it('permission "all" → true', () => {
    const user = createTestUser({ permissions: ['all'] });
    expect(permissionService.isSuperAdmin(user)).toBe(true);
  });

  it('permission "*" → true', () => {
    const user = createTestUser({ permissions: ['*'] });
    expect(permissionService.isSuperAdmin(user)).toBe(true);
  });

  it('role "super_admin" → true', () => {
    const user = createTestUser({ role: 'super_admin' });
    expect(permissionService.isSuperAdmin(user)).toBe(true);
  });

  it('role "system_admin" → true', () => {
    const user = createTestUser({ role: 'system_admin' });
    expect(permissionService.isSuperAdmin(user)).toBe(true);
  });

  it('roleCode в массиве roles → true', () => {
    const user = createTestUser({
      roles: [{ roleCode: 'super_admin' } as any],
    });
    expect(permissionService.isSuperAdmin(user)).toBe(true);
  });

  it('обычный user → false', () => {
    const user = createTestUser();
    expect(permissionService.isSuperAdmin(user)).toBe(false);
  });

  it('null user → false', () => {
    expect(permissionService.isSuperAdmin(null as any)).toBe(false);
  });
});

// =============================================================================
// isAdmin
// =============================================================================
describe('permissionService.isAdmin', () => {
  it('super_admin = admin', () => {
    const user = createTestUser({ role: 'super_admin' });
    expect(permissionService.isAdmin(user)).toBe(true);
  });

  it('permission admin.users.manage → admin', () => {
    const user = createTestUser({
      permissions: [{ section: 'admin', resource: 'users', actions: ['manage'] }],
    });
    expect(permissionService.isAdmin(user)).toBe(true);
  });

  it('permission admin.roles.manage → admin', () => {
    const user = createTestUser({
      permissions: [{ section: 'admin', resource: 'roles', actions: ['manage'] }],
    });
    expect(permissionService.isAdmin(user)).toBe(true);
  });

  it('role "network_admin" → admin', () => {
    const user = createTestUser({ role: 'network_admin' });
    expect(permissionService.isAdmin(user)).toBe(true);
  });

  it('обычный user → false', () => {
    const user = createTestUser();
    expect(permissionService.isAdmin(user)).toBe(false);
  });

  it('null user → false', () => {
    expect(permissionService.isAdmin(null as any)).toBe(false);
  });
});

// =============================================================================
// getMenuVisibility
// =============================================================================
describe('permissionService.getMenuVisibility', () => {
  it('null user → все false', () => {
    const vis = permissionService.getMenuVisibility(null as any);
    expect(vis).toEqual({
      admin: false,
      networks: false,
      tradingPoint: false,
      settings: false,
      reports: false,
    });
  });

  it('super_admin → все true', () => {
    const user = createTestUser({ role: 'super_admin' });
    const vis = permissionService.getMenuVisibility(user);
    expect(vis).toEqual({
      admin: true,
      networks: true,
      tradingPoint: true,
      settings: true,
      reports: true,
    });
  });

  it('user с networks.networks.read → networks = true', () => {
    const user = createTestUser({
      permissions: [{ section: 'networks', resource: 'networks', actions: ['read'] }],
    });
    const vis = permissionService.getMenuVisibility(user);
    expect(vis.networks).toBe(true);
    expect(vis.admin).toBe(false);
  });

  it('user с equipment.tanks.read → tradingPoint = true', () => {
    const user = createTestUser({
      permissions: [{ section: 'equipment', resource: 'tanks', actions: ['read'] }],
    });
    const vis = permissionService.getMenuVisibility(user);
    expect(vis.tradingPoint).toBe(true);
  });

  it('user с operations.reports.read → reports = true', () => {
    const user = createTestUser({
      permissions: [{ section: 'operations', resource: 'reports', actions: ['read'] }],
    });
    const vis = permissionService.getMenuVisibility(user);
    expect(vis.reports).toBe(true);
  });
});

// =============================================================================
// getRoleDisplayName
// =============================================================================
describe('permissionService.getRoleDisplayName', () => {
  const cases = [
    ['super_admin', 'Супер Администратор'],
    ['system_admin', 'Системный Администратор'],
    ['network_admin', 'Администратор Сети'],
    ['point_manager', 'Менеджер Точки'],
    ['manager', 'Менеджер'],
    ['operator', 'Оператор'],
    ['driver', 'Водитель'],
    ['bto_manager', 'Менеджер БТО'],
    ['user', 'Пользователь'],
  ] as const;

  cases.forEach(([code, expected]) => {
    it(`"${code}" → "${expected}"`, () => {
      expect(permissionService.getRoleDisplayName(code)).toBe(expected);
    });
  });

  it('unknown role → возвращает сам код', () => {
    expect(permissionService.getRoleDisplayName('custom_role')).toBe('custom_role');
  });

  it('пустая строка → "Пользователь"', () => {
    expect(permissionService.getRoleDisplayName('')).toBe('Пользователь');
  });
});

// =============================================================================
// canManageTanks / canManagePrices / canManageUsers / canCalibrate / canViewReports
// =============================================================================
describe('специфические проверки (canManage*)', () => {
  it('canManageTanks: true при equipment.tanks.manage', () => {
    const user = createTestUser({
      permissions: [{ section: 'equipment', resource: 'tanks', actions: ['manage'] }],
    });
    expect(permissionService.canManageTanks(user)).toBe(true);
  });

  it('canManageTanks: false без разрешения', () => {
    const user = createTestUser();
    expect(permissionService.canManageTanks(user)).toBe(false);
  });

  it('canManagePrices: true при finance.prices.write', () => {
    const user = createTestUser({
      permissions: [{ section: 'finance', resource: 'prices', actions: ['write'] }],
    });
    expect(permissionService.canManagePrices(user)).toBe(true);
  });

  it('canManagePrices: false без разрешения', () => {
    const user = createTestUser();
    expect(permissionService.canManagePrices(user)).toBe(false);
  });

  it('canManageUsers: true при admin.users.manage', () => {
    const user = createTestUser({
      permissions: [{ section: 'admin', resource: 'users', actions: ['manage'] }],
    });
    expect(permissionService.canManageUsers(user)).toBe(true);
  });

  it('canManageUsers: false без разрешения', () => {
    const user = createTestUser();
    expect(permissionService.canManageUsers(user)).toBe(false);
  });

  it('canCalibrate: true при equipment.calibration.write', () => {
    const user = createTestUser({
      permissions: [{ section: 'equipment', resource: 'calibration', actions: ['write'] }],
    });
    expect(permissionService.canCalibrate(user)).toBe(true);
  });

  it('canCalibrate: false без разрешения', () => {
    const user = createTestUser();
    expect(permissionService.canCalibrate(user)).toBe(false);
  });

  it('canViewReports: true при operations.reports.read', () => {
    const user = createTestUser({
      permissions: [{ section: 'operations', resource: 'reports', actions: ['read'] }],
    });
    expect(permissionService.canViewReports(user)).toBe(true);
  });

  it('canViewReports: false без разрешения', () => {
    const user = createTestUser();
    expect(permissionService.canViewReports(user)).toBe(false);
  });
});

// =============================================================================
// Утилитные функции-обёртки
// =============================================================================
describe('утилитные функции (hasPermission, hasRole, isAdmin, isSuperAdmin)', () => {
  it('hasPermission: null user → false', () => {
    expect(hasPermission(null, 'admin.users.read')).toBe(false);
  });

  it('hasPermission: undefined user → false', () => {
    expect(hasPermission(undefined, 'admin.users.read')).toBe(false);
  });

  it('hasRole: совпадение по role', () => {
    const user = createTestUser({ role: 'operator' });
    expect(hasRole(user, 'operator')).toBe(true);
  });

  it('hasRole: совпадение через roles[].roleCode', () => {
    const user = createTestUser({
      roles: [{ roleCode: 'bto_manager' } as any],
    });
    expect(hasRole(user, 'bto_manager')).toBe(true);
  });

  it('hasRole: нет совпадения', () => {
    const user = createTestUser();
    expect(hasRole(user, 'admin')).toBe(false);
  });

  it('isAdmin wrapper: null → false', () => {
    expect(isAdmin(null)).toBe(false);
  });

  it('isSuperAdmin wrapper: null → false', () => {
    expect(isSuperAdmin(null)).toBe(false);
  });
});
