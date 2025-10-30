import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend, Cell } from "recharts";
import { Transaction } from '@/services/stsApi';

interface StationRevenueChartProps {
  transactions: Transaction[];
  className?: string;
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
  className = ''
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
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <span className="text-2xl">💰</span>
          Выручка по станциям
        </CardTitle>
        <p className="text-sm text-slate-400 mt-1">
          Сравнение общей выручки по АЗС за выбранный период
        </p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <XAxis
                dataKey="station"
                stroke="#94a3b8"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8' }}
                tickFormatter={formatCurrency}
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
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Всего станций</div>
            <div className="text-lg font-semibold text-white">{chartData.length}</div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Общая выручка</div>
            <div className="text-lg font-semibold text-blue-400">
              {formatCurrency(chartData.reduce((sum, item) => sum + item.revenue, 0))} ₽
            </div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Лидер</div>
            <div className="text-lg font-semibold text-emerald-400 truncate">
              {chartData[0]?.station.replace('Станция ', 'АЗС ')}
            </div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Выручка лидера</div>
            <div className="text-lg font-semibold text-white">
              {formatCurrency(chartData[0]?.revenue || 0)} ₽
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
