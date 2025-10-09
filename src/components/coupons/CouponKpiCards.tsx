/**
 * Компонент KPI карточек купонов с фильтрацией
 */

import { Card, CardContent } from '@/components/ui/card';
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

export function CouponKpiCards({
  uniqueStates,
  uniqueFuelTypes,
  fuelStats,
  allCoupons,
  filteredCoupons,
  selectedKpiStates,
  selectedFuelType,
  onStateClick,
  onFuelTypeClick,
  onResetAll
}: CouponKpiCardsProps) {
  if (allCoupons.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {/* Карточки по статусам */}
        {uniqueStates.map((state) => {
          const allStateCoupons = allCoupons.filter((c) => c.state.name === state);
          const filteredStateCoupons = filteredCoupons.filter((c) => c.state.name === state);

          const allAmount = allStateCoupons.reduce((sum, c) => sum + c.rest_summ, 0);
          const filteredAmount = filteredStateCoupons.reduce((sum, c) => sum + c.rest_summ, 0);

          const isSelected = selectedKpiStates.has(state);

          return (
            <Card
              key={state}
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                isSelected
                  ? 'bg-slate-700 border-slate-500 border-2 shadow-[inset_0_-16px_0_0_rgb(37_99_235)] hover:shadow-[inset_0_-16px_0_0_rgb(37_99_235)]'
                  : 'bg-slate-800 border-slate-600 hover:bg-slate-700'
              }`}
              onClick={() => onStateClick(state)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-100 font-semibold text-base truncate pr-2">
                      {state}
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-300 text-sm">
                        {filteredStateCoupons.length}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-slate-200 text-sm font-semibold">
                      {filteredAmount.toFixed(0)} ₽
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Карточки по видам топлива */}
        {uniqueFuelTypes.length > 0 && (
          <>
            {fuelStats.map((stat) => {
              const isSelected = selectedFuelType === stat.fuelType;

              return (
                <Card
                  key={stat.fuelType}
                  className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                    isSelected
                      ? 'bg-slate-700 border-slate-500 border-2 shadow-[inset_0_-16px_0_0_rgb(37_99_235)] hover:shadow-[inset_0_-16px_0_0_rgb(37_99_235)]'
                      : 'bg-slate-800 border-slate-600 hover:bg-slate-700'
                  }`}
                  onClick={() => onFuelTypeClick(stat.fuelType)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-slate-100 font-semibold text-base truncate pr-2">
                          {stat.fuelType}
                        </p>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-300 text-sm">
                            {stat.filteredCoupons}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-slate-200 text-sm font-semibold">
                          {stat.filteredLiters.toFixed(1)} л
                        </div>
                        <div className="text-slate-200 text-sm font-semibold">
                          {stat.filteredAmount.toFixed(0)} ₽
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}

        {/* Итоговая карточка */}
        {(() => {
          const totalAmount = filteredCoupons.reduce((sum, c) => sum + c.rest_summ, 0);
          const hasActiveFilters = selectedKpiStates.size > 0 || selectedFuelType !== 'all';

          return (
            <Card
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                hasActiveFilters
                  ? 'bg-slate-700 border-slate-500 border-2 shadow-[inset_0_-16px_0_0_rgb(37_99_235)] hover:shadow-[inset_0_-16px_0_0_rgb(37_99_235)]'
                  : 'bg-slate-800 border-slate-600 hover:bg-slate-700'
              }`}
              onClick={onResetAll}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-100 font-semibold text-base truncate pr-2">
                      Итого
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-300 text-sm">
                        {filteredCoupons.length}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-slate-200 text-sm font-semibold">
                      {totalAmount.toFixed(0)} ₽
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </div>
  );
}
