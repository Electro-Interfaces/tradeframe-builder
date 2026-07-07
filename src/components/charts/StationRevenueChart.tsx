import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend, Cell } from "recharts";
import type { OverviewStation } from '@/services/analyticsService';

interface StationRevenueChartProps {
  stations: OverviewStation[];
  className?: string;
  isMobile?: boolean;
}

// Цвета для разных станций
const STATION_COLORS = [
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#ef4444', // red-500
  '#ec4899', // pink-500
  '#f97316', // orange-500
];

export const StationRevenueChart: React.FC<StationRevenueChartProps> = ({
  stations,
  className = '',
  isMobile = false
}) => {
  const chartData = useMemo(() => {
    // Готовый серверный агрегат по станциям (byStation) → формат графика.
    return stations
      .map((s) => ({
        station: `Станция ${s.stationCode}`,
        revenue: Math.round(s.revenue * 100) / 100,
        volume: Math.round(s.volume * 10) / 10,
        operations: s.operations,
        averageCheck: s.operations > 0 ? Math.round((s.revenue / s.operations) * 100) / 100 : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [stations]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const chartConfig = {
    revenue: {
      label: "Выручка",
      color: "hsl(var(--chart-1))",
    },
  };

  if (chartData.length === 0) {
    return (
      <Card className={`bg-card border-border ${className}`}>
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <span className="text-2xl">💰</span>
            Выручка по станциям
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Нет данных для отображения
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-card border-border ${className}`}>
      <CardHeader className={isMobile ? 'pb-3 px-3 pt-3' : ''}>
        <CardTitle className={`text-foreground flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
          <span className={isMobile ? 'text-lg' : 'text-2xl'}>💰</span>
          Выручка по станциям
        </CardTitle>
        <p className={`text-muted-foreground mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
          Сравнение общей выручки по АЗС за выбранный период
        </p>
      </CardHeader>
      <CardContent className={isMobile ? 'px-3 pb-3' : ''}>
        <ChartContainer config={chartConfig} className={isMobile ? 'h-64 w-full' : 'h-80 w-full'}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={isMobile ? { top: 10, right: 10, left: 10, bottom: 50 } : { top: 20, right: 30, left: 20, bottom: 60 }}>
              <XAxis
                dataKey="station"
                stroke="hsl(var(--muted-foreground))"
                angle={-45}
                textAnchor="end"
                height={isMobile ? 60 : 80}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
                tickFormatter={formatCurrency}
                width={isMobile ? 60 : 80}
              />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;

                  const data = payload[0].payload;
                  return (
                    <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                      <p className="font-semibold text-foreground mb-2">{data.station}</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Выручка:</span>
                          <span className="text-primary dark:text-primary/70 font-semibold">
                            {formatCurrency(data.revenue)} ₽
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Объем:</span>
                          <span className="text-cyan-600 dark:text-cyan-400">
                            {data.volume.toLocaleString('ru-RU')} л
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Операций:</span>
                          <span className="text-foreground/80">{data.operations}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Средний чек:</span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(data.averageCheck)} ₽
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STATION_COLORS[index % STATION_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Краткая статистика */}
        <div className={`grid grid-cols-2 md:grid-cols-4 ${isMobile ? 'mt-3 gap-2' : 'mt-4 gap-3'}`}>
          <div className={`bg-secondary/50 rounded-lg ${isMobile ? 'p-2' : 'p-3'}`}>
            <div className={`text-muted-foreground mb-1 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Всего станций</div>
            <div className={`font-semibold text-foreground ${isMobile ? 'text-base' : 'text-lg'}`}>{chartData.length}</div>
          </div>
          <div className={`bg-secondary/50 rounded-lg ${isMobile ? 'p-2' : 'p-3'}`}>
            <div className={`text-muted-foreground mb-1 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Общая выручка</div>
            <div className={`font-semibold text-primary dark:text-primary/70 ${isMobile ? 'text-sm' : 'text-lg'}`}>
              {formatCurrency(chartData.reduce((sum, item) => sum + item.revenue, 0))} ₽
            </div>
          </div>
          <div className={`bg-secondary/50 rounded-lg ${isMobile ? 'p-2' : 'p-3'}`}>
            <div className={`text-muted-foreground mb-1 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Лидер</div>
            <div className={`font-semibold text-emerald-600 dark:text-emerald-400 truncate ${isMobile ? 'text-sm' : 'text-lg'}`}>
              {chartData[0]?.station.replace('Станция ', 'АЗС ')}
            </div>
          </div>
          <div className={`bg-secondary/50 rounded-lg ${isMobile ? 'p-2' : 'p-3'}`}>
            <div className={`text-muted-foreground mb-1 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Выручка лидера</div>
            <div className={`font-semibold text-foreground ${isMobile ? 'text-sm' : 'text-lg'}`}>
              {formatCurrency(chartData[0]?.revenue || 0)} ₽
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
