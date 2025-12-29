/**
 * Круговая диаграмма по способам оплаты
 */

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Sector } from 'recharts';
import { cn } from '@/lib/utils';
import type { FinancialMetrics } from '@/types/shift-dashboard';

interface PaymentMethodsChartProps {
  /** Финансовые метрики */
  data: FinancialMetrics;
  /** Флаг загрузки */
  isLoading?: boolean;
  /** Дополнительный класс */
  className?: string;
}

// Цвета для способов оплаты
const PAYMENT_COLORS: Record<string, string> = {
  cash: '#22c55e',      // Зеленый - Наличные
  card: '#3b82f6',      // Синий - Карты
  sbp: '#a855f7',       // Фиолетовый - СБП
  fuelCard: '#f97316',  // Оранжевый - Топливные карты
  corporate: '#eab308', // Желтый - Корпоративные
  other: '#64748b',     // Серый - Прочее
};

const PAYMENT_NAMES: Record<string, string> = {
  cash: 'Наличные',
  card: 'Карты',
  sbp: 'СБП',
  fuelCard: 'Топливные карты',
  corporate: 'Корп. карты',
  other: 'Прочее',
};

/**
 * Форматирует валюту
 */
const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)} млн`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)} тыс`;
  }
  return value.toFixed(0);
};

/**
 * Активный сектор при наведении
 */
const renderActiveShape = (props: any) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 14}
        fill={fill}
      />
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#fff" className="text-sm font-medium">
        {payload.name}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#94a3b8" className="text-xs">
        {formatCurrency(value)} ₽
      </text>
      <text x={cx} y={cy + 28} textAnchor="middle" fill="#64748b" className="text-xs">
        {(percent * 100).toFixed(1)}%
      </text>
    </g>
  );
};

/**
 * Кастомный тултип
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-white mb-1">{data.name}</p>
        <p className="text-sm text-slate-300">
          Выручка: <span className="text-white font-medium">{formatCurrency(data.value)} ₽</span>
        </p>
        <p className="text-xs text-slate-400">
          Доля: {(data.percent * 100).toFixed(1)}%
        </p>
      </div>
    );
  }
  return null;
};

/**
 * Кастомная легенда
 */
const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex flex-wrap justify-center gap-3 mt-2">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-slate-400">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export function PaymentMethodsChart({ data, isLoading, className }: PaymentMethodsChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // Подготавливаем данные для диаграммы
  const chartData = [
    { key: 'cash', name: PAYMENT_NAMES.cash, value: data.cashRevenue, color: PAYMENT_COLORS.cash },
    { key: 'card', name: PAYMENT_NAMES.card, value: data.cardRevenue, color: PAYMENT_COLORS.card },
    { key: 'sbp', name: PAYMENT_NAMES.sbp, value: data.sbpRevenue, color: PAYMENT_COLORS.sbp },
    { key: 'fuelCard', name: PAYMENT_NAMES.fuelCard, value: data.fuelCardRevenue, color: PAYMENT_COLORS.fuelCard },
    { key: 'corporate', name: PAYMENT_NAMES.corporate, value: data.corporateCardRevenue || 0, color: PAYMENT_COLORS.corporate },
    { key: 'other', name: PAYMENT_NAMES.other, value: data.otherRevenue, color: PAYMENT_COLORS.other },
  ].filter(item => item.value > 0);

  // Добавляем процент
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const chartDataWithPercent = chartData.map(item => ({
    ...item,
    percent: total > 0 ? item.value / total : 0,
  }));

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(undefined);
  };

  return (
    <div className={cn('bg-slate-800 rounded-xl p-4 border border-slate-700', className)}>
      <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wide">
        По способам оплаты
      </h3>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : chartDataWithPercent.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-500">
          Нет данных
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={chartDataWithPercent}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
              >
                {chartDataWithPercent.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default PaymentMethodsChart;
