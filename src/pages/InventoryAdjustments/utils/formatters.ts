import type { InventoryAdjustmentStatus } from '@/types/inventoryAdjustment';

export function formatStatus(status: InventoryAdjustmentStatus): string {
  switch (status) {
    case 'draft':
      return 'Черновик';
    case 'sent':
      return 'Отправлен';
    case 'cancelled':
      return 'Отменён';
    default:
      return status;
  }
}

export function getStatusBadgeClass(status: InventoryAdjustmentStatus): string {
  switch (status) {
    case 'draft':
      return 'bg-secondary text-foreground/80 border-border';
    case 'sent':
      return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/40 dark:text-emerald-400';
    case 'cancelled':
      return 'bg-secondary text-muted-foreground border-border line-through';
    default:
      return 'bg-secondary text-foreground border-border';
  }
}

export function formatDateRu(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return String(value);
  }
}

export function formatDateTimeRu(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(value);
  }
}

export function formatLitersDelta(delta: number | null | undefined): string {
  if (delta === null || delta === undefined) return '—';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} л`;
}

export function sumDeltaVolume(items?: { factVolumeL: number | null; deltaVolumeL: number | null }[]): number {
  if (!items?.length) return 0;
  return items
    .filter((it) => it.factVolumeL !== null)
    .reduce((acc, it) => acc + (it.deltaVolumeL ?? 0), 0);
}
