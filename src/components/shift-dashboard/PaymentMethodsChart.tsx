/**
 * Круговая диаграмма по способам оплаты
 */

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Sector } from 'recharts';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { FinancialMetrics } from '@/types/shift-dashboard';
import { getPaymentColor } from '@/types/shift-dashboard';

interface PaymentMethodsChartProps {
  /** Финансовые метрики */
  data: FinancialMetrics;
  /** Флаг загрузки */
  isLoading?: boolean;
  /** Дополнительный класс */
  className?: string;
}

// Названия для известных типов оплаты (используется как fallback)
const PAYMENT_TYPE_NAMES: Record<string, string> = {
  cash: 'Наличные',
  card: 'Карты',
  online: 'Онлайн',
  corporate: 'Корп. карты',
  coupon: 'Купоны/Талоны',
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
      <text x={cx} y={cy - 10} textAnchor="middle" fill="hsl(var(--foreground))" className="text-xs sm:text-sm font-medium">
        {payload.name}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="hsl(var(--muted-foreground))" className="text-[10px] sm:text-xs">
        {formatCurrency(value)} ₽
      </text>
      <text x={cx} y={cy + 28} textAnchor="middle" fill="hsl(var(--muted-foreground))" className="text-[10px] sm:text-xs">
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
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground mb-1">{data.name}</p>
        <p className="text-sm text-foreground/80">
          Выручка: <span className="text-foreground font-medium">{formatCurrency(data.value)} ₽</span>
        </p>
        <p className="text-xs text-muted-foreground">
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
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-1">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export function PaymentMethodsChart({ data, isLoading, className }: PaymentMethodsChartProps) {
  const isMobile = useIsMobile();
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // Подготавливаем данные для диаграммы — динамически из paymentDetails
  const paymentDetails = data.paymentDetails || {};
  const hasPaymentDetails = Object.keys(paymentDetails).length > 0;

  const chartData = hasPaymentDetails
    ? Object.entries(paymentDetails)
        .filter(([, details]) => details.revenue > 0)
        .map(([key, details]) => ({
          key,
          name: PAYMENT_TYPE_NAMES[key] || key,
          value: details.revenue,
          color: getPaymentColor(PAYMENT_TYPE_NAMES[key] || key),
        }))
    : [
        // Legacy fallback — из плоских полей FinancialMetrics
        { key: 'cash', name: 'Наличные', value: data.cashRevenue, color: getPaymentColor('Наличные') },
        { key: 'card', name: 'Карты', value: data.cardRevenue, color: getPaymentColor('Карта') },
        { key: 'sbp', name: 'СБП', value: data.sbpRevenue, color: getPaymentColor('СБП') },
        { key: 'fuelCard', name: 'Топливные карты', value: data.fuelCardRevenue, color: getPaymentColor('Топливные карты') },
        { key: 'corporate', name: 'Корп. карты', value: data.corporateCardRevenue || 0, color: getPaymentColor('Корп. карты') },
        { key: 'other', name: 'Прочее', value: data.otherRevenue, color: '#64748b' },
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
    <div className={cn('bg-card rounded-xl p-3 sm:p-4 border border-border', className)}>
      <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3 sm:mb-4 uppercase tracking-wide">
        По способам оплаты
      </h3>

      {isLoading ? (
        <div className="h-48 sm:h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : chartDataWithPercent.length === 0 ? (
        <div className="h-48 sm:h-64 flex items-center justify-center text-muted-foreground">
          Нет данных
        </div>
      ) : (
        <div className="h-48 sm:h-64">
          <ResponsiveContainer width="100%" height="100%" minHeight={1}>
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={chartDataWithPercent}
                cx="50%"
                cy="50%"
                innerRadius={isMobile ? 35 : 50}
                outerRadius={isMobile ? 60 : 80}
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
