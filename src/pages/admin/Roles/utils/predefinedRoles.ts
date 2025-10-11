/**
 * Конфигурация предустановленных ролей системы
 */

export interface PredefinedRoleConfig {
  code: string;
  name: string;
  description: string;
  scope: 'global' | 'network' | 'trading_point' | 'assigned';
  permissions: Array<{
    section: string;
    resource: string;
    actions: string[];
  }>;
  is_system: boolean;
  is_active: boolean;
}

/**
 * Список предустановленных ролей
 */
export const PREDEFINED_ROLES: PredefinedRoleConfig[] = [
  {
    code: 'super_admin',
    name: 'Суперадминистратор',
    description: 'Полный доступ ко всем функциям системы',
    scope: 'global',
    permissions: [
      {
        section: '*',
        resource: '*',
        actions: ['read', 'write', 'delete', 'manage', 'view_menu']
      }
    ],
    is_system: true,
    is_active: true
  },
  {
    code: 'network_admin',
    name: 'Администратор сети',
    description: 'Управление торговой сетью и её точками',
    scope: 'network',
    permissions: [
      {
        section: 'network',
        resource: '*',
        actions: ['read', 'write', 'delete', 'manage', 'view_menu']
      },
      {
        section: 'point',
        resource: '*',
        actions: ['read', 'write', 'manage', 'view_menu']
      }
    ],
    is_system: true,
    is_active: true
  },
  {
    code: 'manager',
    name: 'Менеджер',
    description: 'Управление операционной деятельностью',
    scope: 'trading_point',
    permissions: [
      {
        section: 'network',
        resource: 'overview',
        actions: ['read', 'view_menu']
      },
      {
        section: 'point',
        resource: 'prices',
        actions: ['read', 'write', 'view_menu']
      }
    ],
    is_system: true,
    is_active: true
  }
];

/**
 * Получить конфигурацию роли по коду
 */
export function getPredefinedRoleByCode(code: string): PredefinedRoleConfig | undefined {
  return PREDEFINED_ROLES.find(role => role.code === code);
}

/**
 * Получить все коды предустановленных ролей
 */
export function getPredefinedRoleCodes(): string[] {
  return PREDEFINED_ROLES.map(role => role.code);
}
