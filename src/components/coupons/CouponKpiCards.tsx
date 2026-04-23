/**
 * KPI фильтры купонов — горизонтальные pills
 */

import type { CouponWithAge } from '@/types/coupons';
import type { FuelStat } from '@/hooks/useCouponStats';

interface CouponKpiCardsProps {
  uniqueStates: string[];
  uniqueFuelTypes: string[];
  fuelStats: FuelStat[];
  allCoupons: CouponWithAge[];
  filteredCoupons: CouponWithAge[];
  selectedKpiStates: Set<string>;
  selectedFuelType: string;
  onStateClick: (state: string) => void;
  onFuelTypeClick: (fuelType: string) => void;
  onResetAll: () => void;
}

const stateColors: Record<string, string> = {
  'Активный': 'bg-green-500',
  'Active': 'bg-green-500',
  'Погашен': 'bg-primary',
  'Redeemed': 'bg-primary',
  'Просрочен': 'bg-red-500',
  'Expired': 'bg-red-500',
};

export function CouponKpiCards({
  uniqueStates, fuelStats, allCoupons, filteredCoupons,
  selectedKpiStates, selectedFuelType,
  onStateClick, onFuelTypeClick, onResetAll
}: CouponKpiCardsProps) {
  if (allCoupons.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {/* Status pills */}
      {uniqueStates.map((state) => {
        const count = filteredCoupons.filter((c) => c.state.name === state).length;
        const isSelected = selectedKpiStates.has(state);
        const dotColor = stateColors[state] || 'bg-muted-foreground';

        return (
          <button
            key={state}
            onClick={() => onStateClick(state)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-[11px] font-bold transition-all ${
              isSelected
                ? 'bg-primary/10 border-primary/30 text-foreground'
                : 'bg-di-surface-low border border-border/20 text-foreground hover:bg-di-surface-high hover:border-primary/20 cursor-pointer'
            }`}
          >
            <span className={`w-2 h-2 rounded-xl ${dotColor}`} />
            <span>{state}:</span>
            <span className="text-primary">{count}</span>
          </button>
        );
      })}

      {/* Divider */}
      {fuelStats.length > 0 && uniqueStates.length > 0 && (
        <div className="h-6 w-px bg-di-outline-variant/20 mx-1 self-center" />
      )}

      {/* Fuel type pills */}
      {fuelStats.map((stat) => {
        const isSelected = selectedFuelType === stat.fuelType;
        return (
          <button
            key={stat.fuelType}
            onClick={() => onFuelTypeClick(stat.fuelType)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-[11px] font-bold transition-all ${
              isSelected
                ? 'bg-primary/10 border-primary/30 text-foreground'
                : 'bg-di-surface-low border border-border/20 text-foreground hover:bg-di-surface-high hover:border-primary/20 cursor-pointer'
            }`}
          >
            <span className="text-[10px] text-muted-foreground">{stat.fuelType}</span>
            <span className="text-foreground">{stat.filteredLiters.toFixed(0)} л</span>
          </button>
        );
      })}

      {/* Reset */}
      {(selectedKpiStates.size > 0 || selectedFuelType !== 'all') && (
        <button
          onClick={onResetAll}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          Сбросить
        </button>
      )}
    </div>
  );
}
