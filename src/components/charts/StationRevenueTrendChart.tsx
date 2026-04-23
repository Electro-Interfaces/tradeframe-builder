import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";
import { Transaction } from '@/services/stsApi';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface StationRevenueTrendChartProps {
  transactions: Transaction[];
  className?: string;
  isMobile?: boolean;
}

const STATION_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#ec4899', // pink
  '#f97316', // orange
  '#14b8a6', // teal
  '#a855f7', // purple
];

export const StationRevenueTrendChart: React.FC<StationRevenueTrendChartProps> = ({
  transactions,
  className = '',
  isMobile = false
}) => {
  const { chartData, stations, stationTotals } = useMemo(() => {
    const dateStationMap = new Map<string, Map<string, number>>();
    const allStations = new Set<string>();

    transactions.forEach(transaction => {
      if (!transaction.date) return;
      const dateKey = format(parseISO(transaction.date), 'yyyy-MM-dd');
      const stationKey = transaction.stationName || `Станция ${transaction.stationNumber || 'N/A'}`;

      if (!dateStationMap.has(dateKey)) {
        dateStationMap.set(dateKey, new Map());
      }
      const stationMap = dateStationMap.get(dateKey)!;
      stationMap.set(stationKey, (stationMap.get(stationKey) || 0) + (transaction.total || 0));
      allStations.add(stationKey);
    });

    const sortedDates = Array.from(dateStationMap.keys()).sort();

    // Общие итоги по станциям
    const totals = new Map<string, number>();
    allStations.forEach(station => {
      let total = 0;
      dateStationMap.forEach(stationMap => {
        total += stationMap.get(station) || 0;
      });
      totals.set(station, total);
    });

    // Сортируем: наибольшая выручка снизу стека (рисуется первой)
    const sortedStations = Array.from(allStations).sort(
      (a, b) => (totals.get(b) || 0) - (totals.get(a) || 0)
    );

    const data = sortedDates.map(date => {
      const item: any = {
        date,
        displayDate: format(parseISO(date), 'dd MMM', { locale: ru })
      };
      const stationMap = dateStationMap.get(date)!;
      sortedStations.forEach(station => {
        item[station] = Math.round(stationMap.get(station) || 0);
      });
      return item;
    });

    return { chartData: data, stations: sortedStations, stationTotals: totals };
  }, [transactions]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}М`;
    if (value >= 1000) return `${Math.round(value / 1000)}к`;
    return String(value);
  };

  const formatFull = (value: number) =>
    new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    stations.forEach((station, index) => {
      config[station] = {
        label: station.replace('Станция ', 'АЗС '),
        color: STATION_COLORS[index % STATION_COLORS.length],
      };
    });
    return config;
  }, [stations]);

  if (chartData.length === 0) {
    return (
      <Card className={`bg-card border-border ${className}`}>
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <span className="text-2xl">📈</span>
            Динамика выручки по станциям
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
          <span className={isMobile ? 'text-lg' : 'text-2xl'}>📈</span>
          {isMobile ? 'Динамика выручки' : 'Динамика выручки по станциям'}
        </CardTitle>
        <p className={`text-muted-foreground mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
          Вклад каждой АЗС в общую выручку по дням
        </p>
      </CardHeader>
      <CardContent className={isMobile ? 'px-3 pb-3' : ''}>
        <ChartContainer config={chartConfig} className={isMobile ? 'h-64 w-full' : 'h-80 w-full'}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={isMobile
                ? { top: 10, right: 10, left: 10, bottom: 10 }
                : { top: 20, right: 30, left: 20, bottom: 20 }
              }
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="displayDate"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
                tickFormatter={formatCurrency}
                width={isMobile ? 45 : 65}
              />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const total = payload.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
                  return (
                    <div className="bg-background border border-border rounded-lg p-3 shadow-lg max-w-xs">
                      <p className="font-semibold text-foreground mb-2">{label}</p>
                      <div className="space-y-1 text-sm max-h-60 overflow-y-auto">
                        {[...payload]
                          .filter(item => Number(item.value) > 0)
                          .sort((a, b) => Number(b.value) - Number(a.value))
                          .map((item, index) => (
                            <div key={index} className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-foreground/80 text-xs">
                                  {String(item.name).replace('Станция ', 'АЗС ')}
                                </span>
                              </div>
                              <span className="text-foreground font-semibold">
                                {formatFull(Number(item.value))} ₽
                              </span>
                            </div>
                          ))}
                        {payload.length > 1 && (
                          <div className="border-t border-border mt-2 pt-2 flex items-center justify-between gap-3">
                            <span className="text-muted-foreground font-semibold text-xs">Всего:</span>
                            <span className="text-primary dark:text-primary/70 font-bold">
                              {formatFull(total)} ₽
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
              {/* Стек: крупнейшие станции снизу */}
              {[...stations].reverse().map((station) => (
                <Area
                  key={station}
                  type="monotone"
                  dataKey={station}
                  stackId="revenue"
                  stroke={chartConfig[station]?.color || '#94a3b8'}
                  strokeWidth={1}
                  fill={chartConfig[station]?.color || '#94a3b8'}
                  fillOpacity={0.7}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Легенда — компактная */}
        <div className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 ${isMobile ? 'mt-2' : 'mt-3'}`}>
          {stations.map((station, i) => (
            <div key={station} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STATION_COLORS[i % STATION_COLORS.length] }} />
              <span className="text-xs text-muted-foreground">
                {station.replace('Станция ', 'АЗС ')}
              </span>
            </div>
          ))}
        </div>

        {/* Статистика */}
        <div className={`grid grid-cols-2 md:grid-cols-4 ${isMobile ? 'mt-3 gap-2' : 'mt-4 gap-3'}`}>
          <div className={`bg-secondary/50 rounded-lg ${isMobile ? 'p-2' : 'p-3'}`}>
            <div className={`text-muted-foreground mb-1 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Период</div>
            <div className={`font-semibold text-foreground ${isMobile ? 'text-sm' : 'text-lg'}`}>
              {chartData.length} {chartData.length === 1 ? 'день' : 'дней'}
            </div>
          </div>
          <div className={`bg-secondary/50 rounded-lg ${isMobile ? 'p-2' : 'p-3'}`}>
            <div className={`text-muted-foreground mb-1 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Станций</div>
            <div className={`font-semibold text-foreground ${isMobile ? 'text-base' : 'text-lg'}`}>{stations.length}</div>
          </div>
          {stations.length > 0 && (
            <>
              <div className={`bg-secondary/50 rounded-lg ${isMobile ? 'p-2' : 'p-3'}`}>
                <div className={`text-muted-foreground mb-1 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Лидер</div>
                <div className={`font-semibold text-emerald-600 dark:text-emerald-400 truncate ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {stations[0].replace('Станция ', 'АЗС ')}
                </div>
              </div>
              <div className={`bg-secondary/50 rounded-lg ${isMobile ? 'p-2' : 'p-3'}`}>
                <div className={`text-muted-foreground mb-1 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Средняя выручка/день</div>
                <div className={`font-semibold text-primary dark:text-primary/70 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {formatFull(
                    chartData.reduce((sum, day) => {
                      const dayTotal = stations.reduce((s, st) => s + (day[st] || 0), 0);
                      return sum + dayTotal;
                    }, 0) / chartData.length
                  )} ₽
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
