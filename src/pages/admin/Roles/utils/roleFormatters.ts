/**
 * Утилиты для форматирования данных ролей
 */

/**
 * Форматирование области видимости роли
 */
export function formatRoleScope(scope: string): string {
  const scopeMap: Record<string, string> = {
    'global': 'Глобальная',
    'network': 'Сеть',
    'trading_point': 'Торговая точка',
    'assigned': 'Назначенная'
  };

  return scopeMap[scope] || scope;
}

/**
 * Форматирование статуса роли
 */
export function formatRoleStatus(isActive: boolean): string {
  return isActive ? 'Активна' : 'Неактивна';
}

/**
 * Получение цвета для Badge области видимости
 */
export function getScopeBadgeColor(scope: string): string {
  return 'text-foreground border-border bg-secondary';
}

/**
 * Получение цвета для Badge статуса
 */
export function getStatusBadgeColor(isActive: boolean): string {
  return isActive
    ? 'text-foreground border-border bg-secondary'
    : 'text-red-700 border-red-200 bg-red-50 dark:text-red-300 dark:border-red-900/60 dark:bg-red-950/40';
}
