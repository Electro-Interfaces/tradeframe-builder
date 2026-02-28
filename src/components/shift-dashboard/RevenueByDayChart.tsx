/**
 * График выручки по дням
 *
 * Stacked BarChart с разбивкой по способам оплаты
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { DailyDataPoint } from '@/types/shift-dashboard';

interface RevenueByDayChartProps {
  /** Данные по дням */
  data: DailyDataPoint[];

  /** Флаг загрузки */
  isLoading?: boolean;

  /** Дополнительный класс */
  className?: string;
}

/**
 * Форматирует число для tooltip
 */
const formatValue = (value: number): string => {
  return new Intl.NumberFormat('ru-RU').format(value);
};

/**
 * Форматирует дату для оси X
 */
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

/**
 * Кастомный tooltip
 */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <div className="text-sm font-medium text-foreground mb-2">
        {formatDate(label)}
      </div>
      <div className="space-y-1">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-foreground/80">{entry.name}</span>
            </div>
            <span className="text-foreground font-medium">{formatValue(entry.value)} ₽</span>
          </div>
        ))}
        <div className="border-t border-border pt-1 mt-1 flex justify-between text-xs">
          <span className="text-foreground/80">Итого</span>
          <span className="text-foreground font-bold">{formatValue(total)} ₽</span>
        </div>
      </div>
    </div>
  );
};

export function RevenueByDayChart({ data, isLoading, className }: RevenueByDayChartProps) {
  if (isLoading) {
    return (
      <div className={cn('bg-card rounded-xl p-5 border border-border', className)}>
        <div className="h-6 w-40 bg-secondary rounded animate-pulse mb-4" />
        <div className="h-[300px] bg-secondary/50 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className={cn('bg-card rounded-xl p-5 border border-border', className)}>
      <h3 className="text-lg font-semibold text-foreground mb-4">Выручка по дням</h3>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="square"
              formatter={(value) => <span className="text-foreground/80 text-sm">{value}</span>}
            />
            <Bar
              dataKey="cashRevenue"
              name="Наличные"
              stackId="revenue"
              fill="#22c55e"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="cardRevenue"
              name="Карты"
              stackId="revenue"
              fill="#3b82f6"
            />
            <Bar
              dataKey="sbpRevenue"
              name="СБП"
              stackId="revenue"
              fill="#8b5cf6"
            />
            <Bar
              dataKey="fuelCardRevenue"
              name="Топливные карты"
              stackId="revenue"
              fill="#f97316"
            />
            <Bar
              dataKey="corporateCardRevenue"
              name="Корп. карты"
              stackId="revenue"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default RevenueByDayChart;
