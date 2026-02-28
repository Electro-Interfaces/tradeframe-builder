import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useIsMobile } from '@/hooks/use-mobile';

interface Transaction {
  id?: number;
  startTime?: string;
  timestamp?: string;
  createdAt?: string;
  date?: string;
  total?: number;
  actualAmount?: number;
  totalCost?: number;
  volume?: number;
  actualQuantity?: number;
  quantity?: number;
}

interface WeekdayPatternProps {
  transactions: Transaction[];
  className?: string;
}

const WEEKDAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WEEKDAY_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

function getRevenue(tx: Transaction): number {
  return tx.total || tx.actualAmount || tx.totalCost || 0;
}

function getVolume(tx: Transaction): number {
  return tx.volume || tx.actualQuantity || tx.quantity || 0;
}

function getTxDate(tx: Transaction): Date | null {
  const raw = tx.startTime || tx.timestamp || tx.createdAt || tx.date;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

/** Преобразует JS getDay() (0=Вс) в индекс Пн=0..Вс=6 */
function toWeekdayIndex(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function WeekdayPattern({ transactions, className }: WeekdayPatternProps) {
  const isMobile = useIsMobile();

  const { chartData, bestDay, worstDay } = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return { chartData: [], bestDay: '', worstDay: '' };
    }

    // Собираем данные по дням недели
    const weekdays = Array.from({ length: 7 }, () => ({
      revenue: 0,
      volume: 0,
      operations: 0,
      uniqueDays: new Set<string>(),
    }));

    for (const tx of transactions) {
      const d = getTxDate(tx);
      if (!d) continue;
      const r = getRevenue(tx);
      if (r <= 0) continue;
      const idx = toWeekdayIndex(d.getDay());
      const dayKey = d.toISOString().split('T')[0];
      weekdays[idx].revenue += r;
      weekdays[idx].volume += getVolume(tx);
      weekdays[idx].operations++;
      weekdays[idx].uniqueDays.add(dayKey);
    }

    const data = weekdays.map((wd, i) => {
      const dayCount = wd.uniqueDays.size || 1;
      return {
        name: WEEKDAY_NAMES[i],
        fullName: WEEKDAY_FULL[i],
        avgRevenue: Math.round(wd.revenue / dayCount),
        avgOperations: Math.round(wd.operations / dayCount),
        avgVolume: Math.round(wd.volume / dayCount),
        dayCount,
      };
    });

    // Определяем лучший и худший (только среди дней с данными)
    const withData = data.filter(d => d.avgRevenue > 0);
    if (withData.length === 0) {
      return { chartData: [], bestDay: '', worstDay: '' };
    }

    let best = withData[0];
    let worst = withData[0];
    for (const d of withData) {
      if (d.avgRevenue > best.avgRevenue) best = d;
      if (d.avgRevenue < worst.avgRevenue) worst = d;
    }

    return {
      chartData: data,
      bestDay: best.fullName,
      worstDay: worst.fullName,
    };
  }, [transactions]);

  if (chartData.length === 0) return null;

  // Определяем min/max для раскраски
  const revenues = chartData.map(d => d.avgRevenue).filter(v => v > 0);
  const maxRev = Math.max(...revenues);
  const minRev = Math.min(...revenues);

  function getBarColor(val: number): string {
    if (val === 0) return '#9CA3AF';
    if (val === maxRev) return '#10b981';
    if (val === minRev) return '#ef4444';
    return '#3b82f6';
  }

  return (
    <Card className={className}>
      <CardHeader className={isMobile ? 'pb-2' : ''}>
        <CardTitle className={isMobile ? 'text-base' : ''}>
          Паттерн по дням недели
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Лучший: {bestDay}, Худший: {worstDay}
        </p>
      </CardHeader>
      <CardContent className={isMobile ? 'px-2 pb-3' : ''}>
        <ResponsiveContainer width="100%" height={isMobile ? 240 : 300}>
          <BarChart
            data={chartData}
            margin={
              isMobile
                ? { top: 5, right: 5, left: 0, bottom: 5 }
                : { top: 20, right: 30, left: 20, bottom: 20 }
            }
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              stroke="#9CA3AF"
              fontSize={isMobile ? 11 : 13}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={isMobile ? 10 : 12}
              tickFormatter={(v) => {
                if (v >= 1000000) return `${(v / 1000000).toFixed(1)}М`;
                if (v >= 1000) return `${Math.round(v / 1000)}к`;
                return String(Math.round(v));
              }}
              width={isMobile ? 35 : 70}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--foreground))',
                fontSize: isMobile ? '12px' : '14px',
              }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0].payload;
                return (
                  <div style={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    color: 'hsl(var(--foreground))',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: isMobile ? '12px' : '14px',
                  }}>
                    <p style={{ fontWeight: 600, marginBottom: 4 }}>{d.fullName}</p>
                    <p>Ср. выручка: {d.avgRevenue.toLocaleString('ru-RU')} ₽</p>
                    <p>Ср. операций: {d.avgOperations.toLocaleString('ru-RU')}</p>
                    <p>Ср. объём: {d.avgVolume.toLocaleString('ru-RU')} л</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="avgRevenue" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.avgRevenue)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
