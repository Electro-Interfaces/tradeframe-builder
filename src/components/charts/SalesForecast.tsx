import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, Target, AlertTriangle, Lightbulb } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  
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
    
    // Создаем массив исторических данных только для дней с фактическими данными
    const sortedDailyData = Object.entries(dailyData)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .slice(-14); // Последние 14 дней с данными
    
    const historicalData: ForecastData[] = sortedDailyData.map(([date, data]) => ({
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

      // Создаем прогнозные данные, начиная с последней даты с фактическими данными
      const forecastDays = 7;
      const forecastData: ForecastData[] = [...historicalData];
      
      // Определяем последнюю дату с данными или сегодняшнюю дату
      const lastDataDate = sortedDailyData.length > 0 
        ? new Date(sortedDailyData[sortedDailyData.length - 1][0])
        : new Date();
      
      for (let i = 1; i <= forecastDays; i++) {
        const futureDate = new Date(lastDataDate);
        futureDate.setDate(lastDataDate.getDate() + i);
        
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

    // Если недостаточно данных для расчета тренда, создаем простой прогноз
    const simpleforecastData: ForecastData[] = [...historicalData];
    const lastDataDate = sortedDailyData.length > 0 
      ? new Date(sortedDailyData[sortedDailyData.length - 1][0])
      : new Date();
    
    // Создаем простой прогноз на основе средних значений
    for (let i = 1; i <= 7; i++) {
      const futureDate = new Date(lastDataDate);
      futureDate.setDate(lastDataDate.getDate() + i);
      
      const predicted = avgDailyRevenue;
      simpleforecastData.push({
        date: futureDate.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
        predicted: predicted,
        confidenceUpper: predicted * 1.15,
        confidenceLower: predicted * 0.85,
        isHistorical: false
      });
    }

    return {
      forecastData: simpleforecastData,
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
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-4'}`}>
        <Card>
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
            <div className={`flex ${isMobile ? 'flex-col text-center space-y-2' : 'items-center justify-between'}`}>
              <div>
                <p className={`text-slate-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>Завтра ожидается</p>
                <p className={`font-bold text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                  {summary.tomorrowRevenue.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
                </p>
                <p className={`text-slate-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {summary.tomorrowVolume.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} л
                </p>
              </div>
              <div className="flex items-center space-x-1">
                {getTrendIcon(summary.trend)}
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} ${getTrendColor(summary.trend)}`}>
                  {summary.trendPercentage > 0 ? '+' : ''}{summary.trendPercentage}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
            <div className={`flex ${isMobile ? 'flex-col text-center space-y-2' : 'items-center justify-between'}`}>
              <div>
                <p className={`text-slate-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>Недельный прогноз</p>
                <p className={`font-bold text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                  {summary.weeklyRevenue.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
                </p>
                <p className={`text-slate-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>7 дней</p>
              </div>
              <Target className={`text-blue-400 ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
            <div className={`flex ${isMobile ? 'flex-col text-center space-y-2' : 'items-center justify-between'}`}>
              <div>
                <p className={`text-slate-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>Точность прогноза</p>
                <p className={`font-bold text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>{summary.confidence}%</p>
                <Badge variant={summary.confidence > 80 ? "default" : "secondary"} className={`${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                  {summary.confidence > 80 ? "Высокая" : summary.confidence > 60 ? "Средняя" : "Низкая"}
                </Badge>
              </div>
              <AlertTriangle className={`${summary.confidence > 80 ? 'text-green-400' : 'text-yellow-400'} ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
            <div className={`flex ${isMobile ? 'flex-col text-center space-y-2' : 'items-center justify-between'}`}>
              <div>
                <p className={`text-slate-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>Топ топливо</p>
                <p className={`font-bold text-white ${isMobile ? 'text-base' : 'text-lg'}`}>{summary.bestFuelType}</p>
                {summary.peakHours.length > 0 && (
                  <p className={`text-slate-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    Пик: {summary.peakHours.join(', ')}:00
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className={`bg-orange-500 rounded-full flex items-center justify-center ${isMobile ? 'w-6 h-6 text-xs' : 'w-8 h-8'}`}>
                  ⛽
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* График прогноза */}
      <Card>
        <CardHeader className={`${isMobile ? 'pb-2' : ''}`}>
          <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : ''}`}>
            <TrendingUp className="w-5 h-5" />
            <span>{isMobile ? 'Прогноз на 7 дней' : 'Прогноз продаж на 7 дней'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className={`${isMobile ? 'px-2' : ''}`}>
          <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
            <AreaChart data={forecastData} margin={isMobile ? { top: 5, right: 5, left: 5, bottom: 5 } : undefined}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                fontSize={isMobile ? 10 : 12}
                angle={isMobile ? -45 : 0}
                textAnchor={isMobile ? 'end' : 'middle'}
                height={isMobile ? 50 : 30}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={isMobile ? 10 : 12}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}к`}
                width={isMobile ? 30 : 60}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  color: '#F9FAFB',
                  fontSize: isMobile ? '12px' : '14px'
                }}
                formatter={(value: number, name) => [
                  `${value?.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`, 
                  name === 'actual' ? (isMobile ? 'Факт' : 'Фактические') : 
                  name === 'predicted' ? 'Прогноз' : 
                  name === 'confidenceUpper' ? (isMobile ? 'Верх' : 'Верх. граница') : (isMobile ? 'Низ' : 'Ниж. граница')
                ]}
              />
              {!isMobile && <Legend />}
              
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
                strokeWidth={isMobile ? 1.5 : 2}
                dot={{ fill: '#10B981', strokeWidth: isMobile ? 1.5 : 2, r: isMobile ? 2 : 3 }}
                connectNulls={false}
                name="Фактические продажи"
              />
              
              {/* Прогнозные данные */}
              <Line
                dataKey="predicted"
                stroke="#3B82F6"
                strokeWidth={isMobile ? 1.5 : 2}
                strokeDasharray="5 5"
                dot={{ fill: '#3B82F6', strokeWidth: isMobile ? 1.5 : 2, r: isMobile ? 2 : 3 }}
                connectNulls={false}
                name="Прогноз"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Рекомендации */}
      <Card>
        <CardHeader className={`${isMobile ? 'pb-2' : ''}`}>
          <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : ''}`}>
            <Lightbulb className="w-5 h-5" />
            <span>{isMobile ? 'Рекомендации' : 'Рекомендации по продажам'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`space-y-${isMobile ? '2' : '3'}`}>
            {summary.recommendations.map((recommendation, index) => (
              <div key={index} className={`flex items-start space-x-${isMobile ? '2' : '3'} ${isMobile ? 'p-2' : 'p-3'} bg-slate-700/50 rounded-lg`}>
                <div className={`bg-blue-600 rounded-full flex items-center justify-center text-white font-bold ${isMobile ? 'w-5 h-5 text-xs' : 'w-6 h-6 text-sm'}`}>
                  {index + 1}
                </div>
                <p className={`text-slate-200 leading-relaxed ${isMobile ? 'text-xs' : 'text-sm'}`}>{recommendation}</p>
              </div>
            ))}
            
            {summary.recommendations.length === 0 && (
              <p className={`text-slate-400 text-center ${isMobile ? 'py-2 text-sm' : 'py-4'}`}>
                Собираем данные для формирования рекомендаций...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}