/**
 * Аналитические карточки купонов — минималистичный стиль
 */

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
  stats, totalIssuedLiters, usedCouponsCount,
  activeCouponsCount, activeCouponsLiters, activeCouponsAmount
}: CouponStatsCardsProps) {
  return (
    <div className="bg-di-surface-mid rounded-xl border border-transparent p-4 grid grid-cols-2 gap-2 md:gap-3 shrink-0 md:w-[320px] h-full">
      <div className="bg-di-surface-low rounded-xl p-3 flex flex-col justify-between">
        <span className="text-[10px] font-bold text-muted-foreground uppercase">Выдано</span>
        <span className="font-headline text-2xl font-extrabold text-foreground tracking-tight">{stats.totalCoupons || 0}</span>
      </div>

      <div className="bg-di-surface-low rounded-xl p-3 flex flex-col justify-between">
        <span className="text-[10px] font-bold text-muted-foreground uppercase">Топливо</span>
        <div className="flex items-baseline gap-1">
          <span className="font-headline text-2xl font-extrabold text-foreground tracking-tight">{usedCouponsCount}</span>
          <span className="text-[10px] text-muted-foreground">{(stats.totalFuelDelivered || 0).toFixed(0)} л</span>
        </div>
      </div>

      <div className="bg-di-surface-low rounded-xl p-3 flex flex-col justify-between">
        <span className="text-[10px] font-bold text-muted-foreground uppercase">Остаток</span>
        <div className="flex items-baseline gap-1">
          <span className="font-headline text-2xl font-extrabold text-foreground tracking-tight">{activeCouponsCount}</span>
          <span className="text-[10px] text-muted-foreground">{activeCouponsLiters.toFixed(0)} л</span>
        </div>
      </div>

      <div className="bg-di-surface-low rounded-xl p-3 flex flex-col justify-between">
        <span className="text-[10px] font-bold text-muted-foreground uppercase">Просрочено</span>
        <span className="font-headline text-2xl font-extrabold text-foreground tracking-tight">{stats.expiredCoupons || 0}</span>
      </div>
    </div>
  );
}
