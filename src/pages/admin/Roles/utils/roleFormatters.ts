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
  const colorMap: Record<string, string> = {
    'global': 'text-purple-400 border-purple-500 bg-purple-500/10',
    'network': 'text-blue-400 border-blue-500 bg-blue-500/10',
    'trading_point': 'text-green-400 border-green-500 bg-emerald-500/10',
    'assigned': 'text-orange-400 border-orange-500 bg-orange-500/10'
  };

  return colorMap[scope] || 'text-muted-foreground border-border bg-muted-foreground/10';
}

/**
 * Получение цвета для Badge статуса
 */
export function getStatusBadgeColor(isActive: boolean): string {
  return isActive
    ? 'text-green-400 border-green-500 bg-emerald-500/10'
    : 'text-muted-foreground border-border bg-muted-foreground/10';
}
