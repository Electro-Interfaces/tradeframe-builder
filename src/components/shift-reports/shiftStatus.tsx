import { AlertCircle, AlertTriangle, CheckCircle, Clock3 } from 'lucide-react';

import type { ShiftStatus } from '@/types/shift-reports-v2';

type ShiftStatusTone = 'blue' | 'green' | 'gray' | 'red' | 'amber';

interface ShiftStatusConfig {
  label: string;
  tone: ShiftStatusTone;
  icon: typeof Clock3;
}

function getOpenDurationHours(openedAt: string): number {
  return (Date.now() - new Date(openedAt).getTime()) / (1000 * 60 * 60);
}

export function getShiftStatusConfig(
  status: ShiftStatus,
  openedAt: string,
  hasDiscrepancies = false,
): ShiftStatusConfig {
  if (hasDiscrepancies) {
    return { label: 'Расхождения', tone: 'red', icon: AlertCircle };
  }

  if (status === 'open') {
    if (getOpenDurationHours(openedAt) > 24) {
      return { label: 'Открыта >24ч', tone: 'amber', icon: AlertTriangle };
    }

    return { label: 'Открыта', tone: 'blue', icon: Clock3 };
  }

  if (status === 'synchronized') {
    return { label: 'Закрыта без расхождений', tone: 'green', icon: CheckCircle };
  }

  if (status === 'closed') {
    return { label: 'Закрыта', tone: 'gray', icon: CheckCircle };
  }

  return { label: 'Неизвестно', tone: 'gray', icon: AlertCircle };
}

export function getShiftStatusBadgeClass(tone: ShiftStatusTone): string {
  switch (tone) {
    case 'blue':
      return 'bg-blue-600 text-white border-blue-600';
    case 'green':
      return 'bg-emerald-600 text-white border-emerald-600';
    case 'red':
      return 'bg-red-600 text-white border-red-600';
    case 'amber':
      return 'bg-amber-500 text-white border-amber-500';
    case 'gray':
    default:
      return 'bg-secondary text-foreground border-border';
  }
}
