/**
 * Компонент аналитических карточек купонов
 */

import { Card, CardContent } from '@/components/ui/card';
import type { CouponsStats } from '@/types/coupons';

interface CouponStatsCardsProps {
  stats: CouponsStats;
  totalIssuedLiters: number;
  usedCouponsCount: number;
  activeCouponsCount: number;
  activeCouponsLiters: number;
  activeCouponsAmount: number;
}

export function CouponStatsCards({
  stats,
  totalIssuedLiters,
  usedCouponsCount,
  activeCouponsCount,
  activeCouponsLiters,
  activeCouponsAmount
}: CouponStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
      {/* Выдано купонов */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-foreground font-semibold text-base truncate pr-2 mb-1">
                Выдано купонов
              </p>
              <div className="text-foreground/80 text-sm">
                {stats.totalCoupons || 0}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-foreground text-sm font-semibold">
                {totalIssuedLiters.toFixed(1)} л
              </div>
              <div className="text-foreground text-sm font-semibold">
                {stats.totalAmount?.toFixed(0) || '0'} ₽
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Объем выданного топлива */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-foreground font-semibold text-base truncate pr-2 mb-1">
                Выдано топлива
              </p>
              <div className="text-foreground/80 text-sm">
                {usedCouponsCount}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-foreground text-sm font-semibold">
                {stats.totalFuelDelivered?.toFixed(1) || '0.0'} л
              </div>
              <div className="text-foreground text-sm font-semibold">
                {stats.usedAmount?.toFixed(0) || '0'} ₽
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Остаток (активные купоны) */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-foreground font-semibold text-base truncate pr-2 mb-1">
                Остаток
              </p>
              <div className="text-foreground/80 text-sm">
                {activeCouponsCount}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-foreground text-sm font-semibold">
                {activeCouponsLiters.toFixed(1)} л
              </div>
              <div className="text-foreground text-sm font-semibold">
                {activeCouponsAmount.toFixed(0)} ₽
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Просроченные купоны */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-foreground font-semibold text-base truncate pr-2 mb-1">
                Просрочено
              </p>
              <div className="text-foreground/80 text-sm">
                {stats.expiredCoupons || 0}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-foreground text-sm font-semibold">
                {stats.expiredFuelLoss?.toFixed(1) || '0.0'} л
              </div>
              <div className="text-foreground text-sm font-semibold">
                {stats.expiredAmount?.toFixed(0) || '0'} ₽
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
