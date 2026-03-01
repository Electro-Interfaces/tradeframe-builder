import { describe, it, expect } from 'vitest';
import { PermissionChecker, PermissionValidator, PermissionStrings } from '../permissions';
import type { Permission, PermissionCondition, UserRole } from '@/types/auth';

// =============================================================================
// PermissionChecker.checkConditions
// =============================================================================
describe('PermissionChecker.checkConditions', () => {
  it('оператор "=" — совпадение', () => {
    const conditions: PermissionCondition[] = [
      { field: 'role', operator: '=', value: 'admin' },
    ];
    expect(PermissionChecker.checkConditions(conditions, { role: 'admin' })).toBe(true);
  });

  it('оператор "=" — нет совпадения', () => {
    const conditions: PermissionCondition[] = [
      { field: 'role', operator: '=', value: 'admin' },
    ];
    expect(PermissionChecker.checkConditions(conditions, { role: 'user' })).toBe(false);
  });

  it('оператор "!="', () => {
    const conditions: PermissionCondition[] = [
      { field: 'status', operator: '!=', value: 'blocked' },
    ];
    expect(PermissionChecker.checkConditions(conditions, { status: 'active' })).toBe(true);
    expect(PermissionChecker.checkConditions(conditions, { status: 'blocked' })).toBe(false);
  });

  it('оператор "in"', () => {
    const conditions: PermissionCondition[] = [
      { field: 'role', operator: 'in', value: ['admin', 'manager'] },
    ];
    expect(PermissionChecker.checkConditions(conditions, { role: 'admin' })).toBe(true);
    expect(PermissionChecker.checkConditions(conditions, { role: 'user' })).toBe(false);
  });

  it('оператор "not_in"', () => {
    const conditions: PermissionCondition[] = [
      { field: 'role', operator: 'not_in', value: ['blocked', 'deleted'] },
    ];
    expect(PermissionChecker.checkConditions(conditions, { role: 'active' })).toBe(true);
    expect(PermissionChecker.checkConditions(conditions, { role: 'blocked' })).toBe(false);
  });

  it('оператор "contains"', () => {
    const conditions: PermissionCondition[] = [
      { field: 'email', operator: 'contains', value: '@example' },
    ];
    expect(PermissionChecker.checkConditions(conditions, { email: 'user@example.com' })).toBe(true);
    expect(PermissionChecker.checkConditions(conditions, { email: 'user@other.com' })).toBe(false);
  });

  it('оператор "starts_with"', () => {
    const conditions: PermissionCondition[] = [
      { field: 'id', operator: 'starts_with', value: 'net-' },
    ];
    expect(PermissionChecker.checkConditions(conditions, { id: 'net-123' })).toBe(true);
    expect(PermissionChecker.checkConditions(conditions, { id: 'usr-123' })).toBe(false);
  });

  it('неизвестный оператор → false', () => {
    const conditions: PermissionCondition[] = [
      { field: 'x', operator: 'gt' as any, value: 10 },
    ];
    expect(PermissionChecker.checkConditions(conditions, { x: 20 })).toBe(false);
  });

  it('вложенный путь "user.role"', () => {
    const conditions: PermissionCondition[] = [
      { field: 'user.role', operator: '=', value: 'admin' },
    ];
    expect(PermissionChecker.checkConditions(conditions, { user: { role: 'admin' } })).toBe(true);
    expect(PermissionChecker.checkConditions(conditions, { user: { role: 'user' } })).toBe(false);
  });

  it('несколько условий — AND логика', () => {
    const conditions: PermissionCondition[] = [
      { field: 'role', operator: '=', value: 'admin' },
      { field: 'status', operator: '=', value: 'active' },
    ];
    expect(PermissionChecker.checkConditions(conditions, { role: 'admin', status: 'active' })).toBe(true);
    expect(PermissionChecker.checkConditions(conditions, { role: 'admin', status: 'blocked' })).toBe(false);
  });

  it('поле отсутствует в контексте → undefined', () => {
    const conditions: PermissionCondition[] = [
      { field: 'missing', operator: '=', value: 'test' },
    ];
    expect(PermissionChecker.checkConditions(conditions, {})).toBe(false);
  });
});

// =============================================================================
// PermissionChecker.checkScopeAccess
// =============================================================================
describe('PermissionChecker.checkScopeAccess', () => {
  it('global scope → всё true', () => {
    const role = { scope: 'global', permissions: [] } as UserRole;
    expect(PermissionChecker.checkScopeAccess(role, 'network')).toBe(true);
    expect(PermissionChecker.checkScopeAccess(role, 'trading_point')).toBe(true);
    expect(PermissionChecker.checkScopeAccess(role, 'anything')).toBe(true);
  });

  it('network scope → network доступен', () => {
    const role = { scope: 'network', scope_value: 'net-1', permissions: [] } as UserRole;
    expect(PermissionChecker.checkScopeAccess(role, 'network', 'net-1')).toBe(true);
  });

  it('network scope → другая сеть недоступна', () => {
    const role = { scope: 'network', scope_value: 'net-1', permissions: [] } as UserRole;
    expect(PermissionChecker.checkScopeAccess(role, 'network', 'net-2')).toBe(false);
  });

  it('network scope без scope_value → доступ к любой сети', () => {
    const role = { scope: 'network', permissions: [] } as UserRole;
    expect(PermissionChecker.checkScopeAccess(role, 'network', 'net-any')).toBe(true);
  });

  it('network scope → trading_point недоступен', () => {
    const role = { scope: 'network', scope_value: 'net-1', permissions: [] } as UserRole;
    expect(PermissionChecker.checkScopeAccess(role, 'trading_point', 'tp-1')).toBe(false);
  });

  it('trading_point scope → только trading_point', () => {
    const role = { scope: 'trading_point', scope_value: 'tp-1', permissions: [] } as UserRole;
    expect(PermissionChecker.checkScopeAccess(role, 'trading_point', 'tp-1')).toBe(true);
    expect(PermissionChecker.checkScopeAccess(role, 'network', 'net-1')).toBe(false);
  });

  it('trading_point scope → другая точка недоступна', () => {
    const role = { scope: 'trading_point', scope_value: 'tp-1', permissions: [] } as UserRole;
    expect(PermissionChecker.checkScopeAccess(role, 'trading_point', 'tp-2')).toBe(false);
  });

  it('assigned scope → exact match', () => {
    const role = { scope: 'assigned', scope_value: 'res-42', permissions: [] } as UserRole;
    expect(PermissionChecker.checkScopeAccess(role, 'custom', 'res-42')).toBe(true);
    expect(PermissionChecker.checkScopeAccess(role, 'custom', 'res-99')).toBe(false);
  });

  it('unknown scope → false', () => {
    const role = { scope: 'unknown' as any, permissions: [] } as UserRole;
    expect(PermissionChecker.checkScopeAccess(role, 'network')).toBe(false);
  });
});

// =============================================================================
// PermissionValidator.validatePermission
// =============================================================================
describe('PermissionValidator.validatePermission', () => {
  it('валидное разрешение → пустой массив ошибок', () => {
    const perm: Permission = {
      section: 'admin',
      resource: 'users',
      actions: ['read', 'write'],
    };
    expect(PermissionValidator.validatePermission(perm)).toEqual([]);
  });

  it('отсутствует section', () => {
    const perm = { section: '', resource: 'users', actions: ['read'] } as Permission;
    const errors = PermissionValidator.validatePermission(perm);
    expect(errors).toContain('Не указан раздел разрешения');
  });

  it('отсутствует resource', () => {
    const perm = { section: 'admin', resource: '', actions: ['read'] } as Permission;
    const errors = PermissionValidator.validatePermission(perm);
    expect(errors).toContain('Не указан ресурс разрешения');
  });

  it('пустой массив actions', () => {
    const perm = { section: 'admin', resource: 'users', actions: [] } as Permission;
    const errors = PermissionValidator.validatePermission(perm);
    expect(errors).toContain('Не указаны действия для разрешения');
  });

  it('недопустимое действие', () => {
    const perm = { section: 'admin', resource: 'users', actions: ['fly' as any] } as Permission;
    const errors = PermissionValidator.validatePermission(perm);
    expect(errors.some(e => e.includes('Недопустимые действия'))).toBe(true);
  });

  it('валидация вложенных conditions', () => {
    const perm: Permission = {
      section: 'admin',
      resource: 'users',
      actions: ['read'],
      conditions: [{ field: '', operator: '=', value: 'x' }],
    };
    const errors = PermissionValidator.validatePermission(perm);
    expect(errors.some(e => e.includes('Условие 1'))).toBe(true);
  });
});

// =============================================================================
// PermissionValidator.validateCondition
// =============================================================================
describe('PermissionValidator.validateCondition', () => {
  it('валидное условие → пустой массив', () => {
    const cond: PermissionCondition = { field: 'role', operator: '=', value: 'admin' };
    expect(PermissionValidator.validateCondition(cond)).toEqual([]);
  });

  it('отсутствует field', () => {
    const cond = { field: '', operator: '=', value: 'x' } as PermissionCondition;
    const errors = PermissionValidator.validateCondition(cond);
    expect(errors).toContain('Не указано поле условия');
  });

  it('отсутствует operator', () => {
    const cond = { field: 'x', operator: '', value: 'x' } as PermissionCondition;
    const errors = PermissionValidator.validateCondition(cond);
    expect(errors).toContain('Не указан оператор условия');
  });

  it('недопустимый operator', () => {
    const cond = { field: 'x', operator: 'like' as any, value: 'x' };
    const errors = PermissionValidator.validateCondition(cond);
    expect(errors.some(e => e.includes('Недопустимый оператор'))).toBe(true);
  });

  it('value = null → ошибка', () => {
    const cond = { field: 'x', operator: '=', value: null } as any;
    const errors = PermissionValidator.validateCondition(cond);
    expect(errors).toContain('Не указано значение условия');
  });

  it('value = undefined → ошибка', () => {
    const cond = { field: 'x', operator: '=', value: undefined } as any;
    const errors = PermissionValidator.validateCondition(cond);
    expect(errors).toContain('Не указано значение условия');
  });

  it('in/not_in с не-массивом → ошибка', () => {
    const cond: PermissionCondition = { field: 'x', operator: 'in', value: 'not-array' };
    const errors = PermissionValidator.validateCondition(cond);
    expect(errors).toContain('Для операторов in/not_in значение должно быть массивом');
  });

  it('in с массивом → нет ошибки о типе', () => {
    const cond: PermissionCondition = { field: 'x', operator: 'in', value: ['a', 'b'] };
    const errors = PermissionValidator.validateCondition(cond);
    expect(errors).toEqual([]);
  });
});

// =============================================================================
// PermissionStrings
// =============================================================================
describe('PermissionStrings', () => {
  describe('create', () => {
    it('формирует "section.resource.action"', () => {
      expect(PermissionStrings.create('admin', 'users', 'read')).toBe('admin.users.read');
    });
  });

  describe('parse', () => {
    it('валидная 3-частная строка', () => {
      expect(PermissionStrings.parse('admin.users.read')).toEqual({
        section: 'admin',
        resource: 'users',
        action: 'read',
      });
    });

    it('2 части → null', () => {
      expect(PermissionStrings.parse('admin.users')).toBeNull();
    });

    it('4 части → null', () => {
      expect(PermissionStrings.parse('a.b.c.d')).toBeNull();
    });

    it('невалидный action → null', () => {
      expect(PermissionStrings.parse('admin.users.fly')).toBeNull();
    });

    it('все валидные actions', () => {
      for (const action of ['read', 'write', 'delete', 'manage'] as const) {
        expect(PermissionStrings.parse(`x.y.${action}`)).not.toBeNull();
      }
    });
  });

  describe('fromPermission', () => {
    it('конвертирует Permission → массив строк', () => {
      const perm: Permission = {
        section: 'admin',
        resource: 'users',
        actions: ['read', 'write'],
      };
      expect(PermissionStrings.fromPermission(perm)).toEqual([
        'admin.users.read',
        'admin.users.write',
      ]);
    });
  });

  describe('toPermissions', () => {
    it('конвертирует строки → Permission[]', () => {
      const result = PermissionStrings.toPermissions([
        'admin.users.read',
        'admin.users.write',
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].section).toBe('admin');
      expect(result[0].resource).toBe('users');
      expect(result[0].actions).toContain('read');
      expect(result[0].actions).toContain('write');
    });

    it('дедупликация одинаковых actions', () => {
      const result = PermissionStrings.toPermissions([
        'admin.users.read',
        'admin.users.read',
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].actions).toEqual(['read']);
    });

    it('round-trip: fromPermission → toPermissions', () => {
      const original: Permission = {
        section: 'finance',
        resource: 'prices',
        actions: ['read', 'write'],
      };
      const strings = PermissionStrings.fromPermission(original);
      const restored = PermissionStrings.toPermissions(strings);
      expect(restored).toHaveLength(1);
      expect(restored[0].section).toBe(original.section);
      expect(restored[0].resource).toBe(original.resource);
      expect(restored[0].actions.sort()).toEqual(original.actions.sort());
    });

    it('невалидные строки пропускаются', () => {
      const result = PermissionStrings.toPermissions([
        'admin.users.read',
        'invalid',
        'also.invalid',
      ]);
      expect(result).toHaveLength(1);
    });

    it('разные ресурсы → разные Permission', () => {
      const result = PermissionStrings.toPermissions([
        'admin.users.read',
        'admin.roles.read',
      ]);
      expect(result).toHaveLength(2);
    });
  });
});
