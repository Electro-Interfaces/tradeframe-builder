import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend } from "recharts";
import { Transaction } from '@/services/stsApi';
import { getFuelColor } from '@/types/shift-dashboard';
import { getFuelPriority } from '@/utils/fuelPriority';

interface StationFuelSalesChartProps {
  transactions: Transaction[];
  className?: string;
  isMobile?: boolean;
}

export const StationFuelSalesChart: React.FC<StationFuelSalesChartProps> = ({
  transactions,
  className = '',
  isMobile = false
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
    fuelTypes.forEach((fuelType) => {
      config[fuelType] = {
        label: fuelType,
        color: getFuelColor(fuelType),
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
      <CardHeader className={isMobile ? 'pb-3 px-3 pt-3' : ''}>
        <CardTitle className={`text-white flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
          <span className={isMobile ? 'text-lg' : 'text-2xl'}>⛽</span>
          {isMobile ? 'Продажи по топливу' : 'Продажи по видам топлива на станциях'}
        </CardTitle>
        <p className={`text-slate-400 mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
          Сравнение структуры продаж {isMobile ? '' : 'разных видов топлива '}по АЗС
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
        <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 ${isMobile ? 'mt-3 gap-2' : 'mt-4 gap-3'}`}>
          {fuelTypes.slice(0, 4).map((fuelType) => {
            const totalForFuel = chartData.reduce((sum, item) => sum + (item[fuelType] || 0), 0);
            return (
              <div key={fuelType} className={`bg-slate-700/50 rounded-lg ${isMobile ? 'p-2' : 'p-3'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={isMobile ? 'w-2 h-2 rounded' : 'w-3 h-3 rounded'}
                    style={{ backgroundColor: chartConfig[fuelType]?.color }}
                  />
                  <div className={`text-slate-400 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>{fuelType}</div>
                </div>
                <div className={`font-semibold text-white ${isMobile ? 'text-sm' : 'text-lg'}`}>
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
