/**
 * Компонент отображения статуса купона
 */

import { Badge } from '@/components/ui/badge';

interface CouponStatusBadgeProps {
  stateName: string;
  variant?: 'default' | 'compact';
}

export function CouponStatusBadge({ stateName, variant = 'default' }: CouponStatusBadgeProps) {
  const isCompact = variant === 'compact';
  const compactClass = isCompact ? 'text-xs px-1 py-0' : '';

  switch (stateName) {
    case 'Активный':
      return (
        <Badge className={`bg-emerald-600 text-white ${compactClass}`}>
          Активный
        </Badge>
      );
    case 'Погашен':
      return (
        <Badge className={`bg-secondary text-foreground ${compactClass}`}>
          Погашен
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className={compactClass}>
          {stateName}
        </Badge>
      );
  }
}
