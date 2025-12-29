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
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
      <div className="text-sm font-medium text-white mb-2">
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
              <span className="text-slate-300">{entry.name}</span>
            </div>
            <span className="text-white font-medium">{formatValue(entry.value)} ₽</span>
          </div>
        ))}
        <div className="border-t border-slate-600 pt-1 mt-1 flex justify-between text-xs">
          <span className="text-slate-300">Итого</span>
          <span className="text-white font-bold">{formatValue(total)} ₽</span>
        </div>
      </div>
    </div>
  );
};

export function RevenueByDayChart({ data, isLoading, className }: RevenueByDayChartProps) {
  if (isLoading) {
    return (
      <div className={cn('bg-slate-800 rounded-xl p-5 border border-slate-700', className)}>
        <div className="h-6 w-40 bg-slate-700 rounded animate-pulse mb-4" />
        <div className="h-[300px] bg-slate-700/50 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className={cn('bg-slate-800 rounded-xl p-5 border border-slate-700', className)}>
      <h3 className="text-lg font-semibold text-white mb-4">Выручка по дням</h3>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={{ stroke: '#475569' }}
              tickLine={{ stroke: '#475569' }}
            />
            <YAxis
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={{ stroke: '#475569' }}
              tickLine={{ stroke: '#475569' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="square"
              formatter={(value) => <span className="text-slate-300 text-sm">{value}</span>}
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
