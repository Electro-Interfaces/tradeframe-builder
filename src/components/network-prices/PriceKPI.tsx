/**
 * Компонент панели KPI для отображения сводной информации о ценах
 */

import { Card } from '@/components/ui/card';
import type { PriceStatistics } from '@/hooks/useNetworkPrices';

interface PriceKPIProps {
  statistics: PriceStatistics[];
  isMobile: boolean;
}

/**
 * Форматирование цены
 */
function formatPrice(price: number): string {
  return price.toFixed(2);
}

export function PriceKPI({ statistics, isMobile }: PriceKPIProps) {
  if (statistics.length === 0) {
    return null;
  }

  return (
    <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-2 md:grid-cols-4 gap-4'}`}>
      {statistics.map((stat) => (
        <Card
          key={stat.fuelType}
          className="bg-slate-800 border-slate-700 p-4 hover:border-slate-600 transition-colors"
        >
          <div className="space-y-2">
            {/* Название топлива */}
            <div className={`font-medium text-slate-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              {stat.fuelType}
            </div>

            {/* Подпись "Средняя цена" */}
            <div className={`text-slate-500 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
              Средняя цена
            </div>

            {/* Средняя цена */}
            <div className="flex items-baseline gap-2">
              <span className={`font-bold text-white ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                {formatPrice(stat.averagePrice)}
              </span>
              <span className={`text-slate-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>₽</span>
            </div>

            {/* Разброс цен */}
            {stat.priceRange > 0 && (
              <div className={`text-slate-500 ${isMobile ? 'text-[10px]' : 'text-xs'} pt-1 border-t border-slate-700`}>
                Разброс: {formatPrice(stat.priceRange)} ₽
                {stat.priceRangePercent > 5 && (
                  <span className="text-yellow-500 ml-1">
                    ({stat.priceRangePercent.toFixed(1)}%)
                  </span>
                )}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
