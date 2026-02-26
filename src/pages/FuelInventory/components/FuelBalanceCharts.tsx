/**
 * Компонент графиков остатков топлива по сменам
 * Показывает остатки на начало и конец смены по видам топлива
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, RefreshCw } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import type { FuelChartData } from '../hooks/useShiftChartData';
import { getFuelColor } from '@/types/shift-dashboard';

interface FuelBalanceChartsProps {
  chartData: FuelChartData[];
  loading: boolean;
  loaded: boolean;
  onLoad: () => void;
}

// FUEL_COLORS удалён — используется getFuelColor() из shift-dashboard
const getColor = (fuelName: string) => getFuelColor(fuelName);

// Форматирование числа с разделителями
const formatVolume = (value: number) => {
  return value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' л';
};

// Кастомный тултип
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
      <p className="text-slate-300 text-sm mb-2">{label}</p>
      {payload.map((item: any, idx: number) => (
        <p key={idx} className="text-sm" style={{ color: item.color }}>
          {item.name}: {formatVolume(item.value)}
        </p>
      ))}
    </div>
  );
};

export const FuelBalanceCharts = ({ chartData, loading, loaded, onLoad }: FuelBalanceChartsProps) => {
  // Если данные не загружены - показываем кнопку
  if (!loaded && !loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <LineChart className="w-12 h-12 text-slate-500" />
            <p className="text-slate-400 text-center">
              Нажмите кнопку для построения графиков остатков по сменам
            </p>
            <Button onClick={onLoad} variant="outline" className="gap-2">
              <LineChart className="w-4 h-4" />
              Построить графики
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Загрузка
  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-3">
            <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
            <p className="text-blue-400">Загрузка данных для графиков...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Нет данных
  if (chartData.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-8 text-center text-slate-400">
          Нет данных для построения графиков
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Динамика остатков по сменам</h3>
        <Button onClick={onLoad} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Обновить
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {chartData.map(fuel => {
          const color = getColor(fuel.fuelName);
          const firstValue = fuel.points[0]?.volumeEnd || 0;
          const lastValue = fuel.points[fuel.points.length - 1]?.volumeEnd || 0;
          const change = lastValue - firstValue;
          const changePercent = firstValue > 0 ? ((change / firstValue) * 100).toFixed(1) : '0';

          return (
            <Card key={fuel.fuelCode} className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white flex items-center justify-between">
                  <span>{fuel.fuelName}</span>
                  <span className={`text-sm font-normal ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {change >= 0 ? '+' : ''}{changePercent}%
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={fuel.points}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id={`grad-${fuel.fuelCode}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="dateLabel"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        axisLine={{ stroke: '#475569' }}
                        tickLine={{ stroke: '#475569' }}
                      />
                      <YAxis
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        axisLine={{ stroke: '#475569' }}
                        tickLine={{ stroke: '#475569' }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="stepAfter"
                        dataKey="volumeEnd"
                        name="Остаток"
                        stroke={color}
                        fill={`url(#grad-${fuel.fuelCode})`}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Статистика */}
                <div className="flex justify-between mt-3 pt-3 border-t border-slate-700">
                  <div>
                    <div className="text-xs text-slate-400">Начало периода</div>
                    <div className="text-sm font-mono text-slate-200">
                      {formatVolume(firstValue)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Конец периода</div>
                    <div className="text-sm font-mono text-slate-200">
                      {formatVolume(lastValue)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
