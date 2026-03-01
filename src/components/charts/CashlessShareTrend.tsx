import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { classifyPayment } from '@/utils/paymentUtils';
import { type ChartTransaction as Transaction, getRevenue, getTxDate, linearRegression } from '@/utils/transactionChartUtils';

interface ClientMixTrendProps {
  transactions: Transaction[];
  className?: string;
}

interface DayPoint {
  date: string;
  displayDate: string;
  // Области (стек → 100%)
  retailShare: number;
  corpShare: number;
  // Линии (индивидуальные доли)
  cashPct: number;
  cardPct: number;
  onlinePct: number;
  // Абсолютные
  cashRev: number;
  cardRev: number;
  onlineRev: number;
  corpRev: number;
  totalRev: number;
}

type ClientGroup = 'cash' | 'card' | 'online' | 'corp';

function toGroup(paymentMethod: string | undefined): ClientGroup {
  if (!paymentMethod) return 'cash';
  const cat = classifyPayment(paymentMethod);
  if (cat === 'fuel_card' || cat === 'corporate' || cat === 'coupon') return 'corp';
  if (cat === 'card') return 'card';
  if (cat === 'online') return 'online';
  return 'cash';
}

function pct(v: number, total: number): number {
  return total > 0 ? Math.round((v / total) * 1000) / 10 : 0;
}

const LINE_COLORS = {
  cash: '#f97316',   // оранжевый — наличные (контраст к синему фону)
  card: '#06b6d4',   // голубой насыщенный — карты / СБП
  online: '#059669', // тёмно-зелёный — онлайн заказы
};

export function CashlessShareTrend({ transactions, className }: ClientMixTrendProps) {
  const isMobile = useIsMobile();

  const { chartData, avgCorpShare, trendType, trendPct } = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return { chartData: [], avgCorpShare: 0, trendType: 'stable' as const, trendPct: 0 };
    }

    const dailyMap = new Map<string, { cash: number; card: number; online: number; corp: number }>();

    for (const tx of transactions) {
      const d = getTxDate(tx);
      if (!d) continue;
      const r = getRevenue(tx);
      if (r <= 0) continue;
      const key = d.toISOString().split('T')[0];
      const group = toGroup(tx.paymentMethod);
      const existing = dailyMap.get(key);
      if (existing) {
        existing[group] += r;
      } else {
        const init = { cash: 0, card: 0, online: 0, corp: 0 };
        init[group] = r;
        dailyMap.set(key, init);
      }
    }

    const sortedKeys = Array.from(dailyMap.keys()).sort();
    if (sortedKeys.length === 0) {
      return { chartData: [], avgCorpShare: 0, trendType: 'stable' as const, trendPct: 0 };
    }

    const points: DayPoint[] = sortedKeys.map((key) => {
      const v = dailyMap.get(key)!;
      const total = v.cash + v.card + v.online + v.corp;
      const d = new Date(key);
      const cashP = pct(v.cash, total);
      const cardP = pct(v.card, total);
      const onlineP = pct(v.online, total);
      const corpP = pct(v.corp, total);
      return {
        date: key,
        displayDate: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
        retailShare: Math.round((cashP + cardP + onlineP) * 10) / 10,
        corpShare: corpP,
        cashPct: cashP,
        cardPct: cardP,
        onlinePct: onlineP,
        cashRev: Math.round(v.cash),
        cardRev: Math.round(v.card),
        onlineRev: Math.round(v.online),
        corpRev: Math.round(v.corp),
        totalRev: Math.round(total),
      };
    });

    const avgCorpShare = Math.round(points.reduce((s, p) => s + p.corpShare, 0) / points.length * 10) / 10;

    const regInput = points.map((p, i) => ({ x: i, y: p.corpShare }));
    const { slope } = linearRegression(regInput);
    const trendPct = Math.round((slope * (points.length - 1)) * 10) / 10;
    const trendType = trendPct > 0.5 ? 'up' : trendPct < -0.5 ? 'down' : 'stable';

    return { chartData: points, avgCorpShare, trendType, trendPct };
  }, [transactions]);

  if (chartData.length === 0) return null;

  const trendLabel =
    trendType === 'up'
      ? `Корп. +${Math.abs(trendPct).toFixed(1)} п.п.`
      : trendType === 'down'
      ? `Корп. ${trendPct.toFixed(1)} п.п.`
      : 'Стабильно';

  const trendVariant = trendType === 'up' ? 'default' : trendType === 'down' ? 'destructive' : 'secondary';
  const TrendIcon = trendType === 'up' ? TrendingUp : trendType === 'down' ? TrendingDown : Minus;

  return (
    <Card className={className}>
      <CardHeader className={isMobile ? 'pb-2' : ''}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className={isMobile ? 'text-base' : ''}>
              Частные / Корпоративные
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Частные {(100 - avgCorpShare).toFixed(1)}% • Корп. {avgCorpShare.toFixed(1)}%
            </p>
          </div>
          <Badge variant={trendVariant} className="flex items-center gap-1">
            <TrendIcon className="w-3 h-3" />
            {trendLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className={isMobile ? 'px-2 pb-3' : ''}>
        <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
          <ComposedChart
            data={chartData}
            margin={
              isMobile
                ? { top: 5, right: 5, left: 0, bottom: 5 }
                : { top: 20, right: 20, left: 20, bottom: 20 }
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
              tickFormatter={(v) => `${v}%`}
              width={isMobile ? 32 : 50}
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload as DayPoint;
                if (!d) return null;
                return (
                  <div style={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    color: 'hsl(var(--foreground))',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: isMobile ? '12px' : '14px',
                    minWidth: 210,
                  }}>
                    <p style={{ fontWeight: 600, marginBottom: 6 }}>{d.displayDate}</p>
                    <p style={{ color: '#3b82f6', fontWeight: 500, marginBottom: 2 }}>
                      Частные {d.retailShare}%
                    </p>
                    <div style={{ paddingLeft: 10, marginBottom: 6 }}>
                      <p><span style={{ color: LINE_COLORS.cash }}>——</span> Наличные: {d.cashPct}% ({d.cashRev.toLocaleString('ru-RU')} ₽)</p>
                      <p><span style={{ color: LINE_COLORS.card }}>——</span> Карты / СБП: {d.cardPct}% ({d.cardRev.toLocaleString('ru-RU')} ₽)</p>
                      <p><span style={{ color: LINE_COLORS.online }}>——</span> Онлайн: {d.onlinePct}% ({d.onlineRev.toLocaleString('ru-RU')} ₽)</p>
                    </div>
                    <p style={{ color: '#8b5cf6', fontWeight: 500 }}>
                      Корп. {d.corpShare}% ({d.corpRev.toLocaleString('ru-RU')} ₽)
                    </p>
                    <p style={{ color: '#9CA3AF', fontSize: '0.85em', marginTop: 4 }}>
                      Итого: {d.totalRev.toLocaleString('ru-RU')} ₽
                    </p>
                  </div>
                );
              }}
            />
            {/* Области: частные (снизу) + корпоративные (сверху) = 100% */}
            <Area
              type="monotone"
              dataKey="retailShare"
              stackId="1"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="#3b82f6"
              fillOpacity={isMobile ? 0.25 : 0.4}
            />
            <Area
              type="monotone"
              dataKey="corpShare"
              stackId="1"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="#8b5cf6"
              fillOpacity={isMobile ? 0.3 : 0.5}
            />
            {/* Линии внутри: доли составляющих частных */}
            <Line
              type="monotone"
              dataKey="cashPct"
              stroke={LINE_COLORS.cash}
              strokeWidth={isMobile ? 2.5 : 2}
              strokeDasharray={isMobile ? undefined : "6 3"}
              dot={false}
              activeDot={{ r: isMobile ? 4 : 4, fill: LINE_COLORS.cash }}
            />
            <Line
              type="monotone"
              dataKey="cardPct"
              stroke={LINE_COLORS.card}
              strokeWidth={isMobile ? 2.5 : 2}
              strokeDasharray={isMobile ? undefined : "6 3"}
              dot={false}
              activeDot={{ r: isMobile ? 4 : 4, fill: LINE_COLORS.card }}
            />
            <Line
              type="monotone"
              dataKey="onlinePct"
              stroke={LINE_COLORS.online}
              strokeWidth={isMobile ? 2.5 : 2}
              strokeDasharray={isMobile ? undefined : "6 3"}
              dot={false}
              activeDot={{ r: isMobile ? 4 : 4, fill: LINE_COLORS.online }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        {/* Легенда */}
        <div className={`flex items-center justify-center flex-wrap gap-x-4 gap-y-1 ${isMobile ? 'mt-1' : 'mt-3'}`}>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6' }} />
            <span className="text-xs text-muted-foreground">Частные</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="14" height="10"><line x1="0" y1="5" x2="14" y2="5" stroke={LINE_COLORS.cash} strokeWidth={isMobile ? 2.5 : 2} strokeDasharray={isMobile ? undefined : "3 2"} /></svg>
            <span className="text-xs text-muted-foreground">Наличные</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="14" height="10"><line x1="0" y1="5" x2="14" y2="5" stroke={LINE_COLORS.card} strokeWidth={isMobile ? 2.5 : 2} strokeDasharray={isMobile ? undefined : "3 2"} /></svg>
            <span className="text-xs text-muted-foreground">Карты</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="14" height="10"><line x1="0" y1="5" x2="14" y2="5" stroke={LINE_COLORS.online} strokeWidth={isMobile ? 2.5 : 2} strokeDasharray={isMobile ? undefined : "3 2"} /></svg>
            <span className="text-xs text-muted-foreground">Онлайн</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#8b5cf6' }} />
            <span className="text-xs text-muted-foreground">Корпоративные</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
