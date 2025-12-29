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
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
      <div className="text-sm font-medium text-white mb-2">
        {data.fuelName}
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-slate-300">Объем</span>
          <span className="text-white font-medium">
            {new Intl.NumberFormat('ru-RU').format(data.volume)} л
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-300">Выручка</span>
          <span className="text-white font-medium">
            {new Intl.NumberFormat('ru-RU').format(data.revenue)} ₽
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-300">Доля</span>
          <span className="text-white font-medium">
            {data.percentOfTotal.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export function VolumeByFuelChart({ data, isLoading, className }: VolumeByFuelChartProps) {
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
      <h3 className="text-lg font-semibold text-white mb-4">Объем по топливам</h3>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 10, left: 80, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={false} />
            <XAxis
              type="number"
              tickFormatter={(value) => formatVolume(value)}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={{ stroke: '#475569' }}
              tickLine={{ stroke: '#475569' }}
            />
            <YAxis
              type="category"
              dataKey="fuelName"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={{ stroke: '#475569' }}
              tickLine={{ stroke: '#475569' }}
              width={70}
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
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-700">
        {data.map((fuel) => (
          <div key={fuel.fuelCode} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: fuel.color || '#3b82f6' }}
            />
            <span className="text-xs text-slate-300">
              {fuel.fuelName}: {fuel.percentOfTotal.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default VolumeByFuelChart;
