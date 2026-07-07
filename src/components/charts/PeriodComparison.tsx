import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import type { OverviewKpi, OverviewDay } from '@/services/analyticsService';

interface PeriodStats {
  revenue: number;
  volume: number;
  avgCheck: number;
  operations: number;
  weekdayRevenue: number;
  weekdayVolume: number;
  weekdayOps: number;
  weekdayDays: number;
  weekendRevenue: number;
  weekendVolume: number;
  weekendOps: number;
  weekendDays: number;
}

/** Готовые серверные агрегаты периода: KPI + разбивка по дням. */
export interface PeriodAggregate {
  kpi: OverviewKpi;
  byDay: OverviewDay[];
}

interface PeriodComparisonProps {
  currentPeriod: PeriodAggregate;
  previousPeriod: PeriodAggregate | null;
  dateFrom: string;
  dateTo: string;
  className?: string;
}

const EMPTY_STATS: PeriodStats = {
  revenue: 0, volume: 0, avgCheck: 0, operations: 0,
  weekdayRevenue: 0, weekdayVolume: 0, weekdayOps: 0, weekdayDays: 0,
  weekendRevenue: 0, weekendVolume: 0, weekendOps: 0, weekendDays: 0,
};

/**
 * Собираем PeriodStats из готового агрегата: KPI-итоги берём как есть, а
 * разбивку будни/выходные восстанавливаем из byDay (каждая запись = один день,
 * поэтому кол-во будних/выходных дней = число соответствующих записей).
 */
function calcStats(agg: PeriodAggregate): PeriodStats {
  let wdRevenue = 0, wdVolume = 0, wdOps = 0, weekdayDays = 0;
  let weRevenue = 0, weVolume = 0, weOps = 0, weekendDays = 0;

  for (const day of agg.byDay) {
    const d = new Date(day.date);
    if (isNaN(d.getTime())) continue;
    const dow = d.getDay(); // 0=Sun, 6=Sat
    if (dow === 0 || dow === 6) {
      weRevenue += day.revenue;
      weVolume += day.volume;
      weOps += day.operations;
      weekendDays++;
    } else {
      wdRevenue += day.revenue;
      wdVolume += day.volume;
      wdOps += day.operations;
      weekdayDays++;
    }
  }

  return {
    revenue: agg.kpi.revenue,
    volume: agg.kpi.volume,
    avgCheck: agg.kpi.avgCheck,
    operations: agg.kpi.operations,
    weekdayRevenue: wdRevenue,
    weekdayVolume: wdVolume,
    weekdayOps: wdOps,
    weekdayDays,
    weekendRevenue: weRevenue,
    weekendVolume: weVolume,
    weekendOps: weOps,
    weekendDays,
  };
}

/**
 * Взвешенное сравнение с учётом будней/выходных.
 *
 * Считаем среднедневные показатели по будням и выходным отдельно,
 * затем собираем «нормализованный итог» предыдущего периода
 * с весами текущего периода (сколько будних/выходных дней).
 */
function weightedChange(
  curr: PeriodStats,
  prev: PeriodStats,
  field: 'revenue' | 'volume' | 'operations'
): number | null {
  const wdField = field === 'revenue' ? 'weekdayRevenue'
    : field === 'volume' ? 'weekdayVolume' : 'weekdayOps';
  const weField = field === 'revenue' ? 'weekendRevenue'
    : field === 'volume' ? 'weekendVolume' : 'weekendOps';

  // Среднедневные предыдущего периода
  const prevWdDaily = prev.weekdayDays > 0 ? prev[wdField] / prev.weekdayDays : 0;
  const prevWeDaily = prev.weekendDays > 0 ? prev[weField] / prev.weekendDays : 0;

  // «Ожидаемый» итог предыдущего периода, нормализованный на структуру текущего
  const normalizedPrev =
    prevWdDaily * curr.weekdayDays + prevWeDaily * curr.weekendDays;

  if (normalizedPrev === 0) return null;

  return ((curr[field] - normalizedPrev) / normalizedPrev) * 100;
}

function avgCheckChange(curr: PeriodStats, prev: PeriodStats): number | null {
  if (prev.operations === 0 || curr.operations === 0) return null;
  // Средний чек — простое сравнение (не зависит от кол-ва дней)
  return ((curr.avgCheck - prev.avgCheck) / prev.avgCheck) * 100;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function PeriodComparison({
  currentPeriod,
  previousPeriod,
  dateFrom,
  dateTo,
  className,
}: PeriodComparisonProps) {
  const isMobile = useIsMobile();

  const current = useMemo(() => calcStats(currentPeriod), [currentPeriod]);
  const previous = useMemo(() => (previousPeriod ? calcStats(previousPeriod) : EMPTY_STATS), [previousPeriod]);

  const hasPrevData = previous.operations > 0;

  // Даты предыдущего периода для подзаголовка
  const periodLengthMs = new Date(dateTo).getTime() - new Date(dateFrom).getTime();
  const prevFrom = new Date(new Date(dateFrom).getTime() - periodLengthMs - 86400000);
  const prevTo = new Date(new Date(dateFrom).getTime() - 86400000);

  const subtitle = hasPrevData
    ? `${formatDate(dateFrom)} — ${formatDate(dateTo)} vs ${formatDate(prevFrom.toISOString())} — ${formatDate(prevTo.toISOString())}`
    : `${formatDate(dateFrom)} — ${formatDate(dateTo)}`;

  const cards = useMemo(() => {
    const revenueChange = hasPrevData ? weightedChange(current, previous, 'revenue') : null;
    const volumeChange = hasPrevData ? weightedChange(current, previous, 'volume') : null;
    const checkChange = hasPrevData ? avgCheckChange(current, previous) : null;
    const opsChange = hasPrevData ? weightedChange(current, previous, 'operations') : null;

    return [
      {
        label: 'Выручка',
        value: `${Math.round(current.revenue).toLocaleString('ru-RU')} ₽`,
        prev: hasPrevData ? `было ${Math.round(previous.revenue).toLocaleString('ru-RU')} ₽` : null,
        change: revenueChange,
      },
      {
        label: 'Объём',
        value: `${Math.round(current.volume).toLocaleString('ru-RU')} л`,
        prev: hasPrevData ? `было ${Math.round(previous.volume).toLocaleString('ru-RU')} л` : null,
        change: volumeChange,
      },
      {
        label: 'Средний чек',
        value: `${Math.round(current.avgCheck).toLocaleString('ru-RU')} ₽`,
        prev: hasPrevData ? `было ${Math.round(previous.avgCheck).toLocaleString('ru-RU')} ₽` : null,
        change: checkChange,
      },
      {
        label: 'Операции',
        value: current.operations.toLocaleString('ru-RU'),
        prev: hasPrevData ? `было ${previous.operations.toLocaleString('ru-RU')}` : null,
        change: opsChange,
      },
    ];
  }, [current, previous, hasPrevData]);

  return (
    <Card className={className}>
      <CardHeader className={isMobile ? 'pb-2' : ''}>
        <CardTitle className={isMobile ? 'text-base' : ''}>
          Сравнение периодов
        </CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
        {hasPrevData && (current.weekdayDays > 0 || current.weekendDays > 0) && (
          <p className="text-[10px] text-muted-foreground">
            С учётом структуры недели: {current.weekdayDays} будн. + {current.weekendDays} вых.
          </p>
        )}
      </CardHeader>
      <CardContent className={isMobile ? 'px-3 pb-3' : ''}>
        {!hasPrevData ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Нет данных для сравнения с предыдущим периодом
          </p>
        ) : (
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
            {cards.map((card) => (
              <div
                key={card.label}
                className="rounded-lg border bg-card p-3 space-y-1"
              >
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className={`font-bold ${isMobile ? 'text-lg' : 'text-xl'}`}>
                  {card.value}
                </p>
                {card.change !== null && (
                  <div className="flex items-center gap-1">
                    {card.change > 0.5 ? (
                      <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                    ) : card.change < -0.5 ? (
                      <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                    ) : (
                      <Minus className="w-3.5 h-3.5 text-yellow-500" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        card.change > 0.5
                          ? 'text-green-500'
                          : card.change < -0.5
                          ? 'text-red-500'
                          : 'text-yellow-500'
                      }`}
                    >
                      {card.change > 0 ? '+' : ''}
                      {card.change.toFixed(1)}%
                    </span>
                  </div>
                )}
                {card.prev && (
                  <p className="text-[10px] text-muted-foreground">{card.prev}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
