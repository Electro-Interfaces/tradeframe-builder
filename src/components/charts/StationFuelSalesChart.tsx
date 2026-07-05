import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Transaction } from '@/services/sts';
import { getFuelColor } from '@/types/shift-dashboard';
import { getFuelPriority } from '@/utils/fuelPriority';

interface StationFuelSalesChartProps {
  transactions: Transaction[];
  className?: string;
  isMobile?: boolean;
}

const formatFull = (value: number) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);

export const StationFuelSalesChart: React.FC<StationFuelSalesChartProps> = ({
  transactions,
  className = '',
  isMobile = false
}) => {
  const { chartData, fuelTypes, fuelTotals } = useMemo(() => {
    const stationFuelMap = new Map<string, Map<string, number>>();
    const allFuelTypes = new Set<string>();

    transactions.forEach(transaction => {
      const stationKey = transaction.stationName || `Станция ${transaction.stationNumber || 'N/A'}`;
      const fuelType = transaction.fuelType || 'Неизвестно';

      if (!stationFuelMap.has(stationKey)) {
        stationFuelMap.set(stationKey, new Map());
      }
      const fuelMap = stationFuelMap.get(stationKey)!;
      fuelMap.set(fuelType, (fuelMap.get(fuelType) || 0) + (transaction.total || 0));
      allFuelTypes.add(fuelType);
    });

    const sortedFuelTypes = Array.from(allFuelTypes).sort((a, b) => {
      const pa = getFuelPriority(a);
      const pb = getFuelPriority(b);
      return pa !== pb ? pa - pb : a.localeCompare(b, 'ru');
    });

    // Общие итоги по топливу
    const totals = new Map<string, number>();
    sortedFuelTypes.forEach(ft => {
      let sum = 0;
      stationFuelMap.forEach(fuelMap => { sum += fuelMap.get(ft) || 0; });
      totals.set(ft, sum);
    });

    // Данные: процент каждого топлива на станции + абсолют в _raw
    const data = Array.from(stationFuelMap.entries())
      .map(([station, fuelMap]) => {
        const total = sortedFuelTypes.reduce((s, ft) => s + (fuelMap.get(ft) || 0), 0);
        const item: any = { station, _total: total };

        sortedFuelTypes.forEach(ft => {
          const rev = fuelMap.get(ft) || 0;
          item[ft] = total > 0 ? Math.round((rev / total) * 1000) / 10 : 0; // %
          item[`_raw_${ft}`] = Math.round(rev); // абсолют для tooltip
        });

        return item;
      })
      .sort((a, b) => b._total - a._total);

    return { chartData: data, fuelTypes: sortedFuelTypes, fuelTotals: totals };
  }, [transactions]);

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    fuelTypes.forEach(ft => {
      config[ft] = { label: ft, color: getFuelColor(ft) };
    });
    return config;
  }, [fuelTypes]);

  if (chartData.length === 0) {
    return (
      <Card className={`bg-card border-border ${className}`}>
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <span className="text-2xl">⛽</span>
            Структура топлива по станциям
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
          <span className={isMobile ? 'text-lg' : 'text-2xl'}>⛽</span>
          {isMobile ? 'Структура топлива' : 'Структура топлива по станциям'}
        </CardTitle>
        <p className={`text-muted-foreground mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
          Доля каждого вида топлива в выручке АЗС
        </p>
      </CardHeader>
      <CardContent className={isMobile ? 'px-3 pb-3' : ''}>
        <ChartContainer config={chartConfig} className={isMobile ? 'h-64 w-full' : 'h-80 w-full'}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={isMobile
                ? { top: 10, right: 10, left: 10, bottom: 50 }
                : { top: 20, right: 30, left: 20, bottom: 60 }
              }
            >
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
                tickFormatter={(v) => `${v}%`}
                width={isMobile ? 40 : 50}
                domain={[0, 100]}
              />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const d = payload[0]?.payload;
                  if (!d) return null;
                  return (
                    <div className="bg-background border border-border rounded-lg p-3 shadow-lg max-w-xs">
                      <p className="font-semibold text-foreground mb-1">{label}</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        Итого: {formatFull(d._total)} ₽
                      </p>
                      <div className="space-y-1 text-sm">
                        {fuelTypes
                          .filter(ft => d[ft] > 0)
                          .sort((a, b) => d[b] - d[a])
                          .map((ft, i) => (
                            <div key={i} className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: chartConfig[ft]?.color }} />
                                <span className="text-foreground/80 text-xs">{ft}</span>
                              </div>
                              <span className="text-foreground font-semibold text-xs">
                                {d[ft]}% ({formatFull(d[`_raw_${ft}`])} ₽)
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                }}
              />
              {fuelTypes.map(ft => (
                <Bar
                  key={ft}
                  dataKey={ft}
                  fill={chartConfig[ft]?.color || '#94a3b8'}
                  stackId="pct"
                  radius={0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Легенда + итоги */}
        <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-${Math.min(fuelTypes.length, 5)} ${isMobile ? 'mt-3 gap-2' : 'mt-4 gap-3'}`}>
          {fuelTypes.map(ft => {
            const total = fuelTotals.get(ft) || 0;
            const grandTotal = Array.from(fuelTotals.values()).reduce((s, v) => s + v, 0);
            const pct = grandTotal > 0 ? Math.round((total / grandTotal) * 1000) / 10 : 0;
            return (
              <div key={ft} className={`bg-secondary/50 rounded-lg ${isMobile ? 'p-2' : 'p-3'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={isMobile ? 'w-2 h-2 rounded' : 'w-3 h-3 rounded'} style={{ backgroundColor: chartConfig[ft]?.color }} />
                  <div className={`text-muted-foreground ${isMobile ? 'text-[10px]' : 'text-xs'}`}>{ft} ({pct}%)</div>
                </div>
                <div className={`font-semibold text-foreground ${isMobile ? 'text-sm' : 'text-lg'}`}>
                  {formatFull(total)} ₽
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
