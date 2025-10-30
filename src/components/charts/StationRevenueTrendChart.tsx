import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { Transaction } from '@/services/stsApi';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface StationRevenueTrendChartProps {
  transactions: Transaction[];
  className?: string;
}

// Цвета для разных станций (те же что в StationRevenueChart)
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

export const StationRevenueTrendChart: React.FC<StationRevenueTrendChartProps> = ({
  transactions,
  className = ''
}) => {
  const { chartData, stations } = useMemo(() => {
    // Группируем транзакции по датам и станциям
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
      const currentRevenue = stationMap.get(stationKey) || 0;
      stationMap.set(stationKey, currentRevenue + (transaction.total || 0));

      allStations.add(stationKey);
    });

    // Сортируем даты
    const sortedDates = Array.from(dateStationMap.keys()).sort();

    // Подсчитываем общую выручку по станциям для сортировки
    const stationTotals = new Map<string, number>();
    allStations.forEach(station => {
      let total = 0;
      dateStationMap.forEach(stationMap => {
        total += stationMap.get(station) || 0;
      });
      stationTotals.set(station, total);
    });

    // Сортируем станции по общей выручке (по убыванию)
    const sortedStations = Array.from(allStations).sort(
      (a, b) => (stationTotals.get(b) || 0) - (stationTotals.get(a) || 0)
    );

    // Преобразуем в формат для графика
    const data = sortedDates.map(date => {
      const item: any = {
        date,
        displayDate: format(parseISO(date), 'dd MMM', { locale: ru })
      };

      const stationMap = dateStationMap.get(date)!;
      sortedStations.forEach(station => {
        item[station] = Math.round((stationMap.get(station) || 0) * 100) / 100;
      });

      return item;
    });

    return {
      chartData: data,
      stations: sortedStations
    };
  }, [transactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Генерируем config для всех станций
  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    stations.forEach((station, index) => {
      config[station] = {
        label: station,
        color: STATION_COLORS[index % STATION_COLORS.length],
      };
    });
    return config;
  }, [stations]);

  if (chartData.length === 0) {
    return (
      <Card className={`bg-slate-800 border-slate-600 ${className}`}>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <span className="text-2xl">📈</span>
            Динамика выручки по станциям
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
          <span className="text-2xl">📈</span>
          Динамика выручки по станциям
        </CardTitle>
        <p className="text-sm text-slate-400 mt-1">
          Тренды изменения выручки по дням для каждой АЗС
        </p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="displayDate"
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8' }}
                tickFormatter={formatCurrency}
              />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;

                  const total = payload.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

                  return (
                    <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 shadow-lg max-w-xs">
                      <p className="font-semibold text-white mb-2">{label}</p>
                      <div className="space-y-1 text-sm max-h-60 overflow-y-auto">
                        {payload
                          .filter(item => Number(item.value) > 0)
                          .sort((a, b) => Number(b.value) - Number(a.value))
                          .map((item, index) => (
                            <div key={index} className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: item.color }}
                                />
                                <span className="text-slate-300 text-xs">
                                  {String(item.name).replace('Станция ', 'АЗС ')}:
                                </span>
                              </div>
                              <span className="text-white font-semibold">
                                {formatCurrency(Number(item.value))} ₽
                              </span>
                            </div>
                          ))}
                        {payload.length > 1 && (
                          <div className="border-t border-slate-700 mt-2 pt-2 flex items-center justify-between gap-3">
                            <span className="text-slate-400 font-semibold text-xs">Всего:</span>
                            <span className="text-blue-400 font-bold">
                              {formatCurrency(total)} ₽
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
                formatter={(value) => (
                  <span className="text-slate-300 text-sm">
                    {String(value).replace('Станция ', 'АЗС ')}
                  </span>
                )}
              />
              {stations.map((station) => (
                <Line
                  key={station}
                  type="monotone"
                  dataKey={station}
                  stroke={chartConfig[station]?.color || '#94a3b8'}
                  strokeWidth={2}
                  dot={{ fill: chartConfig[station]?.color, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Статистика по трендам */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Период</div>
            <div className="text-lg font-semibold text-white">
              {chartData.length} {chartData.length === 1 ? 'день' : 'дней'}
            </div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Станций</div>
            <div className="text-lg font-semibold text-white">{stations.length}</div>
          </div>
          {stations.length > 0 && (
            <>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-1">Лидер тренда</div>
                <div className="text-sm font-semibold text-emerald-400 truncate">
                  {stations[0].replace('Станция ', 'АЗС ')}
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-1">Средняя выручка/день</div>
                <div className="text-sm font-semibold text-blue-400">
                  {formatCurrency(
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
