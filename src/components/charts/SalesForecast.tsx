import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, Target, AlertTriangle, Lightbulb } from 'lucide-react';

interface Transaction {
  id: number;
  startTime: string;
  total: number;
  volume: number;
  fuelType: string;
  paymentMethod?: string;
}

interface SalesForecastProps {
  transactions: Transaction[];
  className?: string;
}

interface ForecastData {
  date: string;
  actual?: number;
  predicted?: number;
  confidenceUpper?: number;
  confidenceLower?: number;
  isHistorical: boolean;
}

interface ForecastSummary {
  tomorrowRevenue: number;
  tomorrowVolume: number;
  weeklyRevenue: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  peakHours: number[];
  bestFuelType: string;
  recommendations: string[];
}

export function SalesForecast({ transactions, className }: SalesForecastProps) {
  // Функции для анализа данных
  const analyzeTransactions = (transactions: Transaction[]) => {
    if (!transactions || transactions.length === 0) {
      return {
        dailyData: [],
        hourlyPattern: {},
        fuelTypeStats: {},
        paymentStats: {}
      };
    }

    // Группируем по дням
    const dailyData = transactions.reduce((acc, tx) => {
      const date = new Date(tx.startTime).toDateString();
      if (!acc[date]) {
        acc[date] = { revenue: 0, volume: 0, count: 0 };
      }
      acc[date].revenue += tx.total || 0;
      acc[date].volume += tx.volume || 0;
      acc[date].count += 1;
      return acc;
    }, {} as Record<string, { revenue: number; volume: number; count: number }>);

    // Группируем по часам
    const hourlyPattern = transactions.reduce((acc, tx) => {
      const hour = new Date(tx.startTime).getHours();
      if (!acc[hour]) acc[hour] = 0;
      acc[hour] += tx.total || 0;
      return acc;
    }, {} as Record<number, number>);

    // Статистика по видам топлива
    const fuelTypeStats = transactions.reduce((acc, tx) => {
      const fuel = tx.fuelType || 'Неизвестно';
      if (!acc[fuel]) acc[fuel] = { revenue: 0, volume: 0, count: 0 };
      acc[fuel].revenue += tx.total || 0;
      acc[fuel].volume += tx.volume || 0;
      acc[fuel].count += 1;
      return acc;
    }, {} as Record<string, { revenue: number; volume: number; count: number }>);

    return { dailyData, hourlyPattern, fuelTypeStats };
  };

  // Расчет прогноза
  const calculateForecast = (transactions: Transaction[]): { forecastData: ForecastData[]; summary: ForecastSummary } => {
    if (!transactions || transactions.length === 0) {
      return {
        forecastData: [],
        summary: {
          tomorrowRevenue: 0,
          tomorrowVolume: 0,
          weeklyRevenue: 0,
          confidence: 0,
          trend: 'stable',
          trendPercentage: 0,
          peakHours: [],
          bestFuelType: 'Неизвестно',
          recommendations: ['Недостаточно данных для прогноза']
        }
      };
    }

    const { dailyData, hourlyPattern, fuelTypeStats } = analyzeTransactions(transactions);
    
    // Создаем массив исторических данных
    const historicalData: ForecastData[] = Object.entries(dailyData)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .slice(-14) // Последние 14 дней
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
        actual: data.revenue,
        isHistorical: true
      }));

    // Простой алгоритм прогноза на основе скользящей средней
    const recentRevenues = Object.values(dailyData).slice(-7).map(d => d.revenue);
    const recentVolumes = Object.values(dailyData).slice(-7).map(d => d.volume);
    
    const avgDailyRevenue = recentRevenues.reduce((a, b) => a + b, 0) / recentRevenues.length;
    const avgDailyVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;

    // Расчет тренда
    if (recentRevenues.length >= 2) {
      const firstHalf = recentRevenues.slice(0, Math.floor(recentRevenues.length / 2));
      const secondHalf = recentRevenues.slice(Math.floor(recentRevenues.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      const trendPercentage = ((secondAvg - firstAvg) / firstAvg) * 100;
      const trend = trendPercentage > 5 ? 'up' : trendPercentage < -5 ? 'down' : 'stable';

      // Учет тренда в прогнозе
      const trendMultiplier = 1 + (trendPercentage / 100);
      const adjustedRevenue = avgDailyRevenue * trendMultiplier;
      const adjustedVolume = avgDailyVolume * trendMultiplier;

      // Создаем прогнозные данные
      const forecastDays = 7;
      const forecastData: ForecastData[] = [...historicalData];
      
      for (let i = 1; i <= forecastDays; i++) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + i);
        
        // Добавляем случайную вариацию ±15%
        const variation = 0.85 + Math.random() * 0.3;
        const predicted = adjustedRevenue * variation;
        
        forecastData.push({
          date: futureDate.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
          predicted: predicted,
          confidenceUpper: predicted * 1.2,
          confidenceLower: predicted * 0.8,
          isHistorical: false
        });
      }

      // Определяем пиковые часы
      const peakHours = Object.entries(hourlyPattern)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => parseInt(hour))
        .sort((a, b) => a - b);

      // Определяем самый прибыльный вид топлива
      const bestFuelType = Object.entries(fuelTypeStats)
        .sort(([,a], [,b]) => b.revenue - a.revenue)[0]?.[0] || 'Неизвестно';

      // Генерируем рекомендации
      const recommendations: string[] = [];
      
      if (trend === 'up') {
        recommendations.push('📈 Продажи растут! Рассмотрите увеличение закупок топлива');
      } else if (trend === 'down') {
        recommendations.push('📉 Снижение продаж. Проанализируйте причины и рассмотрите акции');
      }

      if (peakHours.length > 0) {
        recommendations.push(`⏰ Пиковые часы: ${peakHours.join(', ')}:00. Обеспечьте достаточный персонал`);
      }

      recommendations.push(`⛽ Топ топливо: ${bestFuelType}. Контролируйте остатки в резервуарах`);

      const confidence = Math.min(95, Math.max(60, 85 - Math.abs(trendPercentage)));

      return {
        forecastData,
        summary: {
          tomorrowRevenue: adjustedRevenue,
          tomorrowVolume: adjustedVolume,
          weeklyRevenue: adjustedRevenue * 7,
          confidence: Math.round(confidence),
          trend,
          trendPercentage: Math.round(trendPercentage),
          peakHours,
          bestFuelType,
          recommendations
        }
      };
    }

    return {
      forecastData: historicalData,
      summary: {
        tomorrowRevenue: avgDailyRevenue,
        tomorrowVolume: avgDailyVolume,
        weeklyRevenue: avgDailyRevenue * 7,
        confidence: 70,
        trend: 'stable',
        trendPercentage: 0,
        peakHours: [],
        bestFuelType: 'Неизвестно',
        recommendations: ['Накапливайте больше данных для улучшения точности прогноза']
      }
    };
  };

  const { forecastData, summary } = useMemo(() => 
    calculateForecast(transactions), [transactions]
  );

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Target className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-500';
      case 'down': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Основные прогнозы */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Завтра ожидается</p>
                <p className="text-2xl font-bold text-white">
                  {summary.tomorrowRevenue.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
                </p>
                <p className="text-sm text-slate-300">
                  {summary.tomorrowVolume.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} л
                </p>
              </div>
              <div className="flex items-center space-x-1">
                {getTrendIcon(summary.trend)}
                <span className={`text-sm ${getTrendColor(summary.trend)}`}>
                  {summary.trendPercentage > 0 ? '+' : ''}{summary.trendPercentage}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Недельный прогноз</p>
                <p className="text-2xl font-bold text-white">
                  {summary.weeklyRevenue.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
                </p>
                <p className="text-sm text-slate-300">7 дней</p>
              </div>
              <Target className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Точность прогноза</p>
                <p className="text-2xl font-bold text-white">{summary.confidence}%</p>
                <Badge variant={summary.confidence > 80 ? "default" : "secondary"} className="text-xs">
                  {summary.confidence > 80 ? "Высокая" : summary.confidence > 60 ? "Средняя" : "Низкая"}
                </Badge>
              </div>
              <AlertTriangle className={`w-8 h-8 ${summary.confidence > 80 ? 'text-green-400' : 'text-yellow-400'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Топ топливо</p>
                <p className="text-lg font-bold text-white">{summary.bestFuelType}</p>
                {summary.peakHours.length > 0 && (
                  <p className="text-sm text-slate-300">
                    Пик: {summary.peakHours.join(', ')}:00
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  ⛽
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* График прогноза */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Прогноз продаж на 7 дней</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}к`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  color: '#F9FAFB'
                }}
                formatter={(value: number, name) => [
                  `${value?.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`, 
                  name === 'actual' ? 'Фактические' : 
                  name === 'predicted' ? 'Прогноз' : 
                  name === 'confidenceUpper' ? 'Верх. граница' : 'Ниж. граница'
                ]}
              />
              <Legend />
              
              {/* Доверительный интервал */}
              <Area
                dataKey="confidenceUpper"
                stroke="none"
                fill="#3B82F6"
                fillOpacity={0.1}
                connectNulls={false}
              />
              <Area
                dataKey="confidenceLower"
                stroke="none"
                fill="#3B82F6"
                fillOpacity={0.1}
                connectNulls={false}
              />
              
              {/* Исторические данные */}
              <Line
                dataKey="actual"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
                connectNulls={false}
                name="Фактические продажи"
              />
              
              {/* Прогнозные данные */}
              <Line
                dataKey="predicted"
                stroke="#3B82F6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
                connectNulls={false}
                name="Прогноз"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Рекомендации */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5" />
            <span>Рекомендации по продажам</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {summary.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-slate-700/50 rounded-lg">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {index + 1}
                </div>
                <p className="text-slate-200 text-sm leading-relaxed">{recommendation}</p>
              </div>
            ))}
            
            {summary.recommendations.length === 0 && (
              <p className="text-slate-400 text-center py-4">
                Собираем данные для формирования рекомендаций...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}