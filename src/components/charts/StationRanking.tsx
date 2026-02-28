import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Transaction } from '@/services/stsApi';

interface StationRankingProps {
  transactions: Transaction[];
  isMobile?: boolean;
  className?: string;
}

interface StationData {
  name: string;
  revenue: number;
  volume: number;
  operations: number;
  avgCheck: number;
  pctOfTotal: number;
  vsAverage: number; // % отклонения от среднего
}

export function StationRanking({ transactions, isMobile = false, className }: StationRankingProps) {
  const { chartItems, avgRevenue } = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return { chartItems: [], avgRevenue: 0 };
    }

    // Группируем по станциям
    const stationMap = new Map<string, { revenue: number; volume: number; operations: number }>();

    for (const tx of transactions) {
      const stationKey = tx.stationName || `Станция ${tx.stationNumber || 'N/A'}`;
      const existing = stationMap.get(stationKey);
      const r = tx.total || 0;
      const v = tx.volume || 0;
      if (existing) {
        existing.revenue += r;
        existing.volume += v;
        existing.operations++;
      } else {
        stationMap.set(stationKey, { revenue: r, volume: v, operations: 1 });
      }
    }

    const totalRevenue = Array.from(stationMap.values()).reduce((s, v) => s + v.revenue, 0);
    const stationCount = stationMap.size;
    if (stationCount === 0) return { chartItems: [], avgRevenue: 0 };

    const avgRevenue = totalRevenue / stationCount;

    // Сортируем по выручке
    const sorted: StationData[] = Array.from(stationMap.entries())
      .map(([name, data]) => ({
        name,
        revenue: Math.round(data.revenue),
        volume: Math.round(data.volume),
        operations: data.operations,
        avgCheck: data.operations > 0 ? Math.round(data.revenue / data.operations) : 0,
        pctOfTotal: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 1000) / 10 : 0,
        vsAverage: avgRevenue > 0 ? Math.round(((data.revenue - avgRevenue) / avgRevenue) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Топ-5 + Низ-5 (если станций <= 5 — показываем все)
    let items: StationData[];
    if (sorted.length <= 5) {
      items = sorted;
    } else {
      const top5 = sorted.slice(0, 5);
      const bottom5 = sorted.slice(-5);
      // Убираем дубликаты (если станций 6-9)
      const seen = new Set(top5.map(s => s.name));
      const uniqueBottom = bottom5.filter(s => !seen.has(s.name));
      items = [...top5, ...uniqueBottom];
    }

    return { chartItems: items, avgRevenue: Math.round(avgRevenue) };
  }, [transactions]);

  if (chartItems.length === 0) return null;

  // Для определения цвета: топ-5 зелёные, остальные красные
  const top5Names = new Set(
    [...chartItems].sort((a, b) => b.revenue - a.revenue).slice(0, 5).map(s => s.name)
  );
  const isAllGreen = chartItems.length <= 5;

  const chartHeight = Math.max(300, chartItems.length * 40);

  return (
    <Card className={className}>
      <CardHeader className={isMobile ? 'pb-2' : ''}>
        <CardTitle className={isMobile ? 'text-base' : ''}>
          Рейтинг станций по выручке
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {isAllGreen
            ? `${chartItems.length} станций`
            : `Топ-5 и Низ-5 из ${chartItems.length} станций`
          }
          {' • Среднее: '}
          {avgRevenue.toLocaleString('ru-RU')} ₽
        </p>
      </CardHeader>
      <CardContent className={isMobile ? 'px-2 pb-3' : ''}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={chartItems}
            layout="vertical"
            margin={
              isMobile
                ? { top: 5, right: 10, left: 10, bottom: 5 }
                : { top: 10, right: 30, left: 20, bottom: 10 }
            }
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis
              type="number"
              stroke="#9CA3AF"
              fontSize={isMobile ? 10 : 12}
              tickFormatter={(v) => `${Math.round(v / 1000)}к`}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#9CA3AF"
              fontSize={isMobile ? 10 : 12}
              width={isMobile ? 90 : 130}
              tickFormatter={(v: string) => v.length > (isMobile ? 12 : 18) ? v.slice(0, isMobile ? 11 : 17) + '…' : v}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0].payload as StationData;
                return (
                  <div style={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    color: 'hsl(var(--foreground))',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: isMobile ? '12px' : '14px',
                  }}>
                    <p style={{ fontWeight: 600, marginBottom: 6 }}>{d.name}</p>
                    <p>Выручка: {d.revenue.toLocaleString('ru-RU')} ₽</p>
                    <p>% от общей: {d.pctOfTotal}%</p>
                    <p>Объём: {d.volume.toLocaleString('ru-RU')} л</p>
                    <p>Операций: {d.operations.toLocaleString('ru-RU')}</p>
                    <p>Ср. чек: {d.avgCheck.toLocaleString('ru-RU')} ₽</p>
                    <p>vs среднее: {d.vsAverage > 0 ? '+' : ''}{d.vsAverage}%</p>
                  </div>
                );
              }}
            />
            <ReferenceLine
              x={avgRevenue}
              stroke="#f59e0b"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: 'Среднее',
                position: 'top',
                fill: '#f59e0b',
                fontSize: isMobile ? 10 : 12,
              }}
            />
            <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
              {chartItems.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={isAllGreen || top5Names.has(entry.name) ? '#10b981' : '#ef4444'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
