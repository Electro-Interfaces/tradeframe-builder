import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fuel } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface FuelStat {
  type: string;
  operations: number;
  revenue: number;
  volume: number;
  avgCheck: number;
  share: number;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
}

interface FuelPerformanceChartProps {
  data: FuelStat[];
  isMobile?: boolean;
}

// Определяем цвета для разных видов топлива
const getFuelColor = (fuelType: string): string => {
  const fuel = fuelType.toLowerCase();
  if (fuel.includes('аи-98') || fuel.includes('98')) return '#a855f7'; // purple-500
  if (fuel.includes('аи-95') || fuel.includes('95')) return '#3b82f6'; // blue-500
  if (fuel.includes('аи-92') || fuel.includes('92')) return '#10b981'; // green-500
  if (fuel.includes('аи-91') || fuel.includes('91')) return '#eab308'; // yellow-500
  if (fuel.includes('дт') || fuel.includes('дизель') || fuel.includes('diesel')) return '#f97316'; // orange-500
  if (fuel.includes('сут') || fuel.includes('газ')) return '#ef4444'; // red-500
  return '#6b7280'; // gray-500
};

export const FuelPerformanceChart = memo(function FuelPerformanceChart({
  data,
  isMobile = false
}: FuelPerformanceChartProps) {

  if (!data || data.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-600">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Fuel className="h-5 w-5 text-blue-400" />
            Производительность по видам топлива
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-slate-400">
            <p>Нет данных</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Сортируем по выручке (самое прибыльное топливо сверху)
  const sortedData = [...data].sort((a, b) => b.revenue - a.revenue);

  // Вычисляем итоговые значения
  const totalOperations = sortedData.reduce((sum, f) => sum + f.operations, 0);
  const totalRevenue = sortedData.reduce((sum, f) => sum + f.revenue, 0);
  const totalVolume = sortedData.reduce((sum, f) => sum + f.volume, 0);

  // Подготовка данных для Pie Chart
  const pieData = sortedData.map(fuel => ({
    name: fuel.type,
    value: fuel.revenue,
    volume: fuel.volume,
    operations: fuel.operations,
    share: fuel.share
  }));

  // Custom label для pie chart
  const renderCustomLabel = (entry: any) => {
    return `${entry.share.toFixed(0)}%`;
  };

  return (
    <Card className={`bg-slate-800 border-slate-600 ${isMobile ? '' : 'lg:h-full lg:flex lg:flex-col'}`}>
      <CardHeader className={`${isMobile ? 'pb-2' : 'pb-3'}`}>
        <CardTitle className={`text-white ${isMobile ? 'text-base' : 'text-lg'} flex items-center gap-2`}>
          <Fuel className="h-5 w-5 text-blue-400" />
          Виды топлива
        </CardTitle>
      </CardHeader>
      <CardContent className={`space-y-3 ${isMobile ? '' : 'lg:flex-1 lg:flex lg:flex-col'}`}>
        {/* Круговая диаграмма */}
        <div className="w-full" style={{ height: isMobile ? '180px' : '200px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={isMobile ? 60 : 70}
                fill="#8884d8"
                dataKey="value"
              >
                {sortedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getFuelColor(entry.type)} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900/95 border border-slate-600 rounded-lg p-3 shadow-xl">
                      <p className="text-white font-medium mb-2">{data.name}</p>
                      <div className="space-y-1 text-xs">
                        <p className="text-slate-300">
                          Выручка: <span className="font-medium">{data.value.toLocaleString('ru-RU')}₽</span>
                        </p>
                        <p className="text-slate-300">
                          Объем: <span className="font-medium">{data.volume.toFixed(0)} л</span>
                        </p>
                        <p className="text-slate-300">
                          Операций: <span className="font-medium">{data.operations}</span>
                        </p>
                        <p className="text-blue-400">
                          Доля: <span className="font-medium">{data.share.toFixed(1)}%</span>
                        </p>
                      </div>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Легенда */}
        <div className="space-y-2">
          {sortedData.map((fuel) => (
            <div key={fuel.type} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getFuelColor(fuel.type) }}
                />
                <span className="text-slate-300">{fuel.type}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-400">{fuel.volume.toFixed(0)} л</span>
                <span className="text-white font-medium">{fuel.share.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Оптимизация: пересчитываем только если данные изменились
  return (
    prevProps.data === nextProps.data &&
    prevProps.isMobile === nextProps.isMobile
  );
});
