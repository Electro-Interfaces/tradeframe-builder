/**
 * График объемов по топливам
 *
 * BarChart с группировкой по видам топлива
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { FuelVolumeItem } from '@/types/shift-dashboard';

interface VolumeByFuelChartProps {
  /** Данные по топливам */
  data: FuelVolumeItem[];

  /** Флаг загрузки */
  isLoading?: boolean;

  /** Дополнительный класс */
  className?: string;
}

/**
 * Форматирует объем
 */
const formatVolume = (value: number): string => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} тыс`;
  }
  return new Intl.NumberFormat('ru-RU').format(value);
};

/**
 * Кастомный tooltip
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload as FuelVolumeItem;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <div className="text-sm font-medium text-foreground mb-2">
        {data.fuelName}
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-foreground/80">Объем</span>
          <span className="text-foreground font-medium">
            {new Intl.NumberFormat('ru-RU').format(data.volume)} л
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-foreground/80">Выручка</span>
          <span className="text-foreground font-medium">
            {new Intl.NumberFormat('ru-RU').format(data.revenue)} ₽
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-foreground/80">Доля</span>
          <span className="text-foreground font-medium">
            {data.percentOfTotal.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export function VolumeByFuelChart({ data, isLoading, className }: VolumeByFuelChartProps) {
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className={cn('bg-card rounded-xl p-3 sm:p-5 border border-border', className)}>
        <div className="h-5 sm:h-6 w-32 sm:w-40 bg-secondary rounded animate-pulse mb-3 sm:mb-4" />
        <div className="h-[180px] sm:h-[300px] bg-secondary/50 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className={cn('bg-card rounded-xl p-3 sm:p-5 border border-border', className)}>
      <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Объем по топливам</h3>

      <div className="h-[180px] sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%" minHeight={1}>
          <BarChart
            data={data}
            layout="vertical"
            margin={isMobile
              ? { top: 5, right: 5, left: 40, bottom: 0 }
              : { top: 10, right: 10, left: 80, bottom: 0 }
            }
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
            <XAxis
              type="number"
              tickFormatter={(value) => formatVolume(value)}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              type="category"
              dataKey="fuelName"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
              width={isMobile ? 40 : 70}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="volume" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Легенда */}
      <div className="flex flex-wrap gap-2 sm:gap-3 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
        {data.map((fuel) => (
          <div key={fuel.fuelCode} className="flex items-center gap-1.5 sm:gap-2">
            <div
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded"
              style={{ backgroundColor: fuel.color || '#3b82f6' }}
            />
            <span className="text-[11px] sm:text-xs text-foreground/80">
              {fuel.fuelName}: {fuel.percentOfTotal.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default VolumeByFuelChart;
