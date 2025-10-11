/**
 * Форматирование данных для отображения
 */

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'Никогда';

  const d = new Date(date);

  if (isNaN(d.getTime())) return 'Никогда';

  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return 'Никогда';

  const d = new Date(date);

  if (isNaN(d.getTime())) return 'Никогда';

  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatUserStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'active': 'Активен',
    'inactive': 'Неактивен',
    'blocked': 'Заблокирован',
    'pending': 'Ожидает подтверждения'
  };

  return statusMap[status] || status;
}
