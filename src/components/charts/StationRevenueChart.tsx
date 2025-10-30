import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend, Cell } from "recharts";
import { Transaction } from '@/services/stsApi';

interface StationRevenueChartProps {
  transactions: Transaction[];
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
  transactions,
  className = '',
  isMobile = false
}) => {
  const chartData = useMemo(() => {
    // Группируем транзакции по станциям
    const stationMap = new Map<string, { revenue: number; volume: number; operations: number }>();

    transactions.forEach(transaction => {
      const stationKey = transaction.stationName || `Станция ${transaction.stationNumber || 'N/A'}`;

      if (!stationMap.has(stationKey)) {
        stationMap.set(stationKey, { revenue: 0, volume: 0, operations: 0 });
      }

      const data = stationMap.get(stationKey)!;
      data.revenue += transaction.total || 0;
      data.volume += transaction.volume || 0;
      data.operations += 1;
    });

    // Преобразуем в массив и сортируем по выручке (по убыванию)
    return Array.from(stationMap.entries())
      .map(([station, data]) => ({
        station,
        revenue: Math.round(data.revenue * 100) / 100,
        volume: Math.round(data.volume * 10) / 10,
        operations: data.operations,
        averageCheck: data.operations > 0 ? Math.round((data.revenue / data.operations) * 100) / 100 : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [transactions]);

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
      <Card className={`bg-slate-800 border-slate-600 ${className}`}>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <span className="text-2xl">💰</span>
            Выручка по станциям
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-400">
            Нет данных для отображения
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-slate-800 border-slate-600 ${className}`}>
      <CardHeader className={isMobile ? 'pb-3 px-3 pt-3' : ''}>
        <CardTitle className={`text-white flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
          <span className={isMobile ? 'text-lg' : 'text-2xl'}>💰</span>
          Выручка по станциям
        </CardTitle>
        <p className={`text-slate-400 mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
          Сравнение общей выручки по АЗС за выбранный период
        </p>
      </CardHeader>
      <CardContent className={isMobile ? 'px-3 pb-3' : ''}>
        <ChartContainer config={chartConfig} className={isMobile ? 'h-64 w-full' : 'h-80 w-full'}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={isMobile ? { top: 10, right: 10, left: 10, bottom: 50 } : { top: 20, right: 30, left: 20, bottom: 60 }}>
              <XAxis
                dataKey="station"
                stroke="#94a3b8"
                angle={-45}
                textAnchor="end"
                height={isMobile ? 60 : 80}
                tick={{ fill: '#94a3b8', fontSize: isMobile ? 10 : 12 }}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: isMobile ? 10 : 12 }}
                tickFormatter={formatCurrency}
                width={isMobile ? 60 : 80}
              />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;

                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 shadow-lg">
                      <p className="font-semibold text-white mb-2">{data.station}</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-400">Выручка:</span>
                          <span className="text-blue-400 font-semibold">
                            {formatCurrency(data.revenue)} ₽
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-400">Объем:</span>
                          <span className="text-cyan-400">
                            {data.volume.toLocaleString('ru-RU')} л
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-400">Операций:</span>
                          <span className="text-slate-300">{data.operations}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-400">Средний чек:</span>
                          <span className="text-emerald-400">
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
          <div className={`bg-slate-700/50 rounded-lg ${isMobile ? 'p-2' : 'p-3'}`}>
            <div className={`text-slate-400 mb-1 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Всего станций</div>
            <div className={`font-semibold text-white ${isMobile ? 'text-base' : 'text-lg'}`}>{chartData.length}</div>
          </div>
          <div className={`bg-slate-700/50 rounded-lg ${isMobile ? 'p-2' : 'p-3'}`}>
            <div className={`text-slate-400 mb-1 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Общая выручка</div>
            <div className={`font-semibold text-blue-400 ${isMobile ? 'text-sm' : 'text-lg'}`}>
              {formatCurrency(chartData.reduce((sum, item) => sum + item.revenue, 0))} ₽
            </div>
          </div>
          <div className={`bg-slate-700/50 rounded-lg ${isMobile ? 'p-2' : 'p-3'}`}>
            <div className={`text-slate-400 mb-1 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Лидер</div>
            <div className={`font-semibold text-emerald-400 truncate ${isMobile ? 'text-sm' : 'text-lg'}`}>
              {chartData[0]?.station.replace('Станция ', 'АЗС ')}
            </div>
          </div>
          <div className={`bg-slate-700/50 rounded-lg ${isMobile ? 'p-2' : 'p-3'}`}>
            <div className={`text-slate-400 mb-1 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Выручка лидера</div>
            <div className={`font-semibold text-white ${isMobile ? 'text-sm' : 'text-lg'}`}>
              {formatCurrency(chartData[0]?.revenue || 0)} ₽
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
