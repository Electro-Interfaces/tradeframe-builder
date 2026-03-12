/**
 * Компонент графиков динамики изменения цен
 */

import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PriceStatistics, NetworkPriceData } from '@/hooks/useNetworkPrices';
import { getFuelColor } from '@/types/shift-dashboard';

interface PriceDynamicsChartProps {
  statistics: PriceStatistics[];
  networkPrices: NetworkPriceData[];
  priceHistoryMap: Map<string, Array<{ date: string; price: number; fuelType: string }>> | null;
  isMobile: boolean;
  selectedPeriod: string; // Период передается с родительской страницы
}

// FUEL_COLORS удалён — используется getFuelColor() из shift-dashboard

/**
 * Форматирование даты для оси X
 */
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear().toString().slice(-2);
  return `${day}.${month}.${year}`;
};

/**
 * Форматирование цены для tooltip
 */
const formatPrice = (value: number): string => {
  return value.toFixed(2) + ' ₽';
};

export function PriceDynamicsChart({ statistics, networkPrices, priceHistoryMap, isMobile, selectedPeriod }: PriceDynamicsChartProps) {
  // Выбранные виды топлива для отображения (по умолчанию все)
  const [selectedFuels, setSelectedFuels] = useState<Set<string>>(
    new Set(statistics.map(s => s.fuelType))
  );

  // Выбранная торговая точка (все или конкретная)
  const [selectedStation, setSelectedStation] = useState<string>('all');

  // Фильтруем статистику с историей
  const statsWithHistory = statistics.filter(s => s.priceHistory && s.priceHistory.length > 0);

  // Вычисляем диапазон цен для шкалы Y (только для выбранных видов топлива)
  const calculatePriceRange = () => {
    const selectedStats = statsWithHistory.filter(s => selectedFuels.has(s.fuelType));
    if (selectedStats.length === 0) return { min: 50, max: 60 };

    const allPrices: number[] = [];
    selectedStats.forEach(stat => {
      stat.priceHistory?.forEach(h => allPrices.push(h.price));
    });

    if (allPrices.length === 0) return { min: 50, max: 60 };

    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);

    // Добавляем небольшой отступ (2%)
    const padding = (maxPrice - minPrice) * 0.02;

    return {
      min: Math.max(50, Math.floor(minPrice - padding)), // Не меньше 50
      max: Math.ceil(maxPrice + padding)
    };
  };

  const priceRange = calculatePriceRange();

  // Вычисляем дату начала периода
  const getStartDate = () => {
    const now = new Date();
    switch (selectedPeriod) {
      case '7':
        now.setDate(now.getDate() - 7);
        return now.toISOString().split('T')[0];
      case '30':
        now.setDate(now.getDate() - 30);
        return now.toISOString().split('T')[0];
      case '90':
        now.setDate(now.getDate() - 90);
        return now.toISOString().split('T')[0];
      case 'all':
      default:
        return null;
    }
  };

  const startDate = getStartDate();

  // Формируем данные для графика на основе priceHistoryMap и выбранной станции
  const chartData = useMemo(() => {
    if (!priceHistoryMap || priceHistoryMap.size === 0) return [];

    // Определяем какую историю использовать
    let relevantHistory: Array<{ date: string; price: number; fuelType: string }> = [];

    if (selectedStation === 'all') {
      // Среднее по всем станциям - используем данные из statistics
      const allDates = new Set<string>();
      statsWithHistory.forEach(stat => {
        stat.priceHistory?.forEach(h => {
          if (!startDate || h.date >= startDate) {
            allDates.add(h.date);
          }
        });
      });

      const sortedDates = Array.from(allDates).sort();
      return sortedDates.map(date => {
        const dataPoint: any = { date };

        statsWithHistory.forEach(stat => {
          const priceEntry = stat.priceHistory?.find(h => h.date === date);
          if (priceEntry && selectedFuels.has(stat.fuelType)) {
            dataPoint[stat.fuelType] = priceEntry.price;
          }
        });

        return dataPoint;
      });
    } else {
      // Конкретная станция - используем данные из priceHistoryMap
      relevantHistory = priceHistoryMap.get(selectedStation) || [];

      // Фильтруем по периоду
      const filteredHistory = relevantHistory.filter(h => !startDate || h.date >= startDate);

      // Группируем по датам
      const dateMap = new Map<string, Map<string, number>>();

      filteredHistory.forEach(h => {
        if (!dateMap.has(h.date)) {
          dateMap.set(h.date, new Map());
        }
        if (selectedFuels.has(h.fuelType)) {
          dateMap.get(h.date)!.set(h.fuelType, h.price);
        }
      });

      // Сортируем даты и формируем данные
      const sortedDates = Array.from(dateMap.keys()).sort();
      return sortedDates.map(date => {
        const dataPoint: any = { date };
        const fuelsAtDate = dateMap.get(date)!;
        fuelsAtDate.forEach((price, fuelType) => {
          dataPoint[fuelType] = price;
        });
        return dataPoint;
      });
    }
  }, [priceHistoryMap, selectedStation, selectedFuels, startDate, statsWithHistory]);

  if (statsWithHistory.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-2">Нет данных по истории цен</p>
        <p className="text-sm">История цен станет доступна после накопления данных</p>
      </div>
    );
  }

  // Переключение видимости вида топлива
  const toggleFuel = (fuelType: string) => {
    setSelectedFuels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fuelType)) {
        newSet.delete(fuelType);
      } else {
        newSet.add(fuelType);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-4">
      {/* Фильтр: торговая точка */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground/80">Торговая точка</label>
        <Select value={selectedStation} onValueChange={setSelectedStation}>
          <SelectTrigger className="bg-secondary border-border text-foreground">
            <SelectValue placeholder="Выберите точку" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all" className="text-foreground hover:bg-secondary">Среднее по сети</SelectItem>
            {networkPrices.map(station => (
              <SelectItem
                key={station.stationId}
                value={station.stationId}
                className="text-foreground hover:bg-secondary"
              >
                {station.stationName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Легенда с кнопками выбора топлива */}
      <div className="flex flex-wrap gap-2">
        {statsWithHistory.map(stat => (
          <Button
            key={stat.fuelType}
            variant={selectedFuels.has(stat.fuelType) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleFuel(stat.fuelType)}
            className={`${isMobile ? 'text-xs px-2 py-1' : ''}`}
            style={{
              backgroundColor: selectedFuels.has(stat.fuelType) ? getFuelColor(stat.fuelType) : undefined,
              borderColor: getFuelColor(stat.fuelType)
            }}
          >
            {stat.fuelType}
          </Button>
        ))}
      </div>

      {/* График */}
      <Card className="bg-card border-border p-4">
        <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: isMobile ? 5 : 30,
              left: isMobile ? 0 : 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
              tickFormatter={(value) => value.toFixed(2)}
              domain={[priceRange.min, priceRange.max]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
              labelFormatter={(label) => `Дата: ${formatDate(label as string)}`}
              formatter={(value: number) => [formatPrice(value), '']}
            />
            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
              iconType="line"
            />

            {statsWithHistory.map(stat => (
              selectedFuels.has(stat.fuelType) && (
                <Line
                  key={stat.fuelType}
                  type="stepAfter"
                  dataKey={stat.fuelType}
                  stroke={getFuelColor(stat.fuelType)}
                  strokeWidth={2}
                  dot={{ fill: getFuelColor(stat.fuelType), r: isMobile ? 3 : 4 }}
                  activeDot={{ r: isMobile ? 5 : 8 }}
                  name={stat.fuelType}
                  connectNulls
                />
              )
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
