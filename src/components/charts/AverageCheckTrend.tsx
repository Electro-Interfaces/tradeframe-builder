import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { linearRegression } from '@/utils/transactionChartUtils';
import type { OverviewDay } from '@/services/analyticsService';

interface AverageCheckTrendProps {
  days: OverviewDay[];
  className?: string;
}

interface DayPoint {
  date: string;
  displayDate: string;
  avgCheck: number;
  operations: number;
  trend?: number;
}

export function AverageCheckTrend({ days, className }: AverageCheckTrendProps) {
  const isMobile = useIsMobile();

  const { chartData, currentAvgCheck, trendType, trendPct } = useMemo(() => {
    if (!days || days.length === 0) {
      return { chartData: [], currentAvgCheck: 0, trendType: 'stable' as const, trendPct: 0 };
    }

    // Готовый серверный агрегат по дням: средний чек дня = выручка / операции.
    const sorted = days
      .filter((d) => d.operations > 0 && d.revenue > 0)
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (sorted.length === 0) {
      return { chartData: [], currentAvgCheck: 0, trendType: 'stable' as const, trendPct: 0 };
    }

    // Строим точки
    const points: DayPoint[] = sorted.map((day) => {
      const d = new Date(day.date);
      return {
        date: String(day.date),
        displayDate: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
        avgCheck: Math.round(day.revenue / day.operations),
        operations: day.operations,
      };
    });

    // Линейная регрессия
    const regressionInput = points.map((p, i) => ({ x: i, y: p.avgCheck }));
    const { slope, intercept } = linearRegression(regressionInput);

    // Добавляем линию тренда
    const chartData: DayPoint[] = points.map((p, i) => ({
      ...p,
      trend: Math.round(intercept + slope * i),
    }));

    // Текущий средний чек (последний день)
    const currentAvgCheck = points[points.length - 1].avgCheck;

    // Тренд в % (от первого к последнему значению тренд-линии)
    const trendFirst = intercept;
    const trendLast = intercept + slope * (points.length - 1);
    const trendPct = trendFirst > 0 ? ((trendLast - trendFirst) / trendFirst) * 100 : 0;
    const trendType = trendPct > 1 ? 'up' : trendPct < -1 ? 'down' : 'stable';

    return { chartData, currentAvgCheck, trendType, trendPct };
  }, [days]);

  if (chartData.length === 0) {
    return null;
  }

  const trendLabel =
    trendType === 'up'
      ? `Рост +${Math.abs(trendPct).toFixed(1)}%`
      : trendType === 'down'
      ? `Снижение ${trendPct.toFixed(1)}%`
      : 'Стабильно';

  const trendVariant = trendType === 'up' ? 'default' : trendType === 'down' ? 'destructive' : 'secondary';

  const TrendIcon = trendType === 'up' ? TrendingUp : trendType === 'down' ? TrendingDown : Minus;

  return (
    <Card className={className}>
      <CardHeader className={isMobile ? 'pb-2' : ''}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className={isMobile ? 'text-base' : ''}>
              Средний чек (частные)
            </CardTitle>
            <p className="text-xs text-muted-foreground">Без корп. карт, талонов, купонов</p>
            <p className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'} mt-1`}>
              {currentAvgCheck.toLocaleString('ru-RU')} ₽
            </p>
          </div>
          <Badge variant={trendVariant} className="flex items-center gap-1">
            <TrendIcon className="w-3 h-3" />
            {trendLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className={isMobile ? 'px-1 pb-3' : ''}>
        <ResponsiveContainer width="100%" height={isMobile ? 240 : 300}>
          <LineChart
            data={chartData}
            margin={
              isMobile
                ? { top: 5, right: 5, left: 0, bottom: 5 }
                : { top: 20, right: 30, left: 20, bottom: 20 }
            }
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="displayDate"
              stroke="#9CA3AF"
              fontSize={isMobile ? 9 : 12}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? 'end' : 'middle'}
              height={isMobile ? 50 : 40}
              interval={isMobile ? 2 : 'preserveStartEnd'}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={isMobile ? 9 : 12}
              tickFormatter={(v) => `${Math.round(v / 1000)}к`}
              width={isMobile ? 30 : 70}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--foreground))',
                fontSize: isMobile ? '12px' : '14px',
              }}
              formatter={(value: number, name: string) => {
                const label = name === 'avgCheck' ? 'Средний чек' : 'Тренд';
                return [`${Math.round(value).toLocaleString('ru-RU')} ₽`, label];
              }}
              labelFormatter={(label) => `${label}`}
            />
            {/* Факт — синяя сплошная */}
            <Line
              type="monotone"
              dataKey="avgCheck"
              stroke="#3B82F6"
              strokeWidth={isMobile ? 2 : 2.5}
              dot={isMobile ? false : { fill: '#3B82F6', strokeWidth: 1.5, r: 4 }}
              activeDot={{ r: isMobile ? 4 : 6, fill: '#3B82F6' }}
              name="avgCheck"
            />
            {/* Тренд — пунктирная */}
            <Line
              type="monotone"
              dataKey="trend"
              stroke="#9CA3AF"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              dot={false}
              activeDot={false}
              name="trend"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
