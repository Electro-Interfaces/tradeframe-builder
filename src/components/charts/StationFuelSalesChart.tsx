import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend } from "recharts";
import { Transaction } from '@/services/stsApi';

interface StationFuelSalesChartProps {
  transactions: Transaction[];
  className?: string;
}

// Цвета для разных видов топлива
const FUEL_COLORS: Record<string, string> = {
  'АИ-92': '#3b82f6',    // blue
  'АИ-95': '#8b5cf6',    // violet
  'АИ-98': '#ec4899',    // pink
  'АИ-100': '#f59e0b',   // amber
  'ДТ': '#10b981',       // emerald
  'ДТ летнее': '#14b8a6', // teal
  'ДТ зимнее': '#06b6d4', // cyan
  'Газ': '#f97316',      // orange
};

// Функция для определения приоритета топлива при сортировке
const getFuelPriority = (fuelType: string): number => {
  const fuel = fuelType.toLowerCase();
  if (fuel.includes('аи-98') || fuel.includes('98')) return 1;
  if (fuel.includes('аи-95') || fuel.includes('95')) return 2;
  if (fuel.includes('аи-92') || fuel.includes('92')) return 3;
  if (fuel.includes('аи-100') || fuel.includes('100')) return 4;
  if (fuel.includes('дт зимнее') || fuel.includes('зимний')) return 10;
  if (fuel.includes('дт летнее') || fuel.includes('летний')) return 11;
  if (fuel.includes('дт') || fuel.includes('дизель') || fuel.includes('diesel')) return 12;
  if (fuel.includes('газ')) return 20;
  return 99;
};

export const StationFuelSalesChart: React.FC<StationFuelSalesChartProps> = ({
  transactions,
  className = ''
}) => {
  const { chartData, fuelTypes } = useMemo(() => {
    // Группируем по станциям и видам топлива
    const stationFuelMap = new Map<string, Map<string, number>>();
    const allFuelTypes = new Set<string>();

    transactions.forEach(transaction => {
      const stationKey = transaction.stationName || `Станция ${transaction.stationNumber || 'N/A'}`;
      const fuelType = transaction.fuelType || 'Неизвестно';

      if (!stationFuelMap.has(stationKey)) {
        stationFuelMap.set(stationKey, new Map());
      }

      const fuelMap = stationFuelMap.get(stationKey)!;
      const currentRevenue = fuelMap.get(fuelType) || 0;
      fuelMap.set(fuelType, currentRevenue + (transaction.total || 0));

      allFuelTypes.add(fuelType);
    });

    // Сортируем виды топлива по приоритету
    const sortedFuelTypes = Array.from(allFuelTypes).sort((a, b) => {
      const priorityA = getFuelPriority(a);
      const priorityB = getFuelPriority(b);
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.localeCompare(b, 'ru');
    });

    // Преобразуем в формат для графика
    const data = Array.from(stationFuelMap.entries())
      .map(([station, fuelMap]) => {
        const item: any = { station };
        let totalRevenue = 0;

        sortedFuelTypes.forEach(fuelType => {
          const revenue = fuelMap.get(fuelType) || 0;
          item[fuelType] = Math.round(revenue * 100) / 100;
          totalRevenue += revenue;
        });

        item._total = totalRevenue; // Для сортировки
        return item;
      })
      .sort((a, b) => b._total - a._total); // Сортируем по общей выручке

    return {
      chartData: data,
      fuelTypes: sortedFuelTypes
    };
  }, [transactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Генерируем config для всех видов топлива
  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    fuelTypes.forEach((fuelType, index) => {
      config[fuelType] = {
        label: fuelType,
        color: FUEL_COLORS[fuelType] || `hsl(${(index * 360) / fuelTypes.length}, 70%, 50%)`,
      };
    });
    return config;
  }, [fuelTypes]);

  if (chartData.length === 0) {
    return (
      <Card className={`bg-slate-800 border-slate-600 ${className}`}>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <span className="text-2xl">⛽</span>
            Продажи по видам топлива
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
          <span className="text-2xl">⛽</span>
          Продажи по видам топлива на станциях
        </CardTitle>
        <p className="text-sm text-slate-400 mt-1">
          Сравнение структуры продаж разных видов топлива по АЗС
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
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;

                  const total = payload.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

                  return (
                    <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 shadow-lg max-w-xs">
                      <p className="font-semibold text-white mb-2">{label}</p>
                      <div className="space-y-1 text-sm">
                        {payload
                          .filter(item => Number(item.value) > 0)
                          .sort((a, b) => Number(b.value) - Number(a.value))
                          .map((item, index) => (
                            <div key={index} className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded"
                                  style={{ backgroundColor: item.color }}
                                />
                                <span className="text-slate-300">{item.name}:</span>
                              </div>
                              <span className="text-white font-semibold">
                                {formatCurrency(Number(item.value))} ₽
                              </span>
                            </div>
                          ))}
                        <div className="border-t border-slate-700 mt-2 pt-2 flex items-center justify-between gap-3">
                          <span className="text-slate-400 font-semibold">Всего:</span>
                          <span className="text-blue-400 font-bold">
                            {formatCurrency(total)} ₽
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="rect"
                formatter={(value) => <span className="text-slate-300 text-sm">{value}</span>}
              />
              {fuelTypes.map((fuelType) => (
                <Bar
                  key={fuelType}
                  dataKey={fuelType}
                  fill={chartConfig[fuelType]?.color || '#94a3b8'}
                  radius={[4, 4, 0, 0]}
                  stackId="a"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Краткая статистика по видам топлива */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {fuelTypes.slice(0, 4).map((fuelType) => {
            const totalForFuel = chartData.reduce((sum, item) => sum + (item[fuelType] || 0), 0);
            return (
              <div key={fuelType} className="bg-slate-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: chartConfig[fuelType]?.color }}
                  />
                  <div className="text-xs text-slate-400">{fuelType}</div>
                </div>
                <div className="text-lg font-semibold text-white">
                  {formatCurrency(totalForFuel)} ₽
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
