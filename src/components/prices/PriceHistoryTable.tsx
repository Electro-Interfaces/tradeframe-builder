/**
 * История изменения цен — Fuel Monitor Command Center
 * Timeline с вертикальными цветными барами и grid-layout
 */

import React, { useMemo } from "react";
import { History, RefreshCw, AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PriceScheduleEntry {
  service_code: string;
  effective_date: string;
  created_at?: string;
  price: string | number;
  fuel_type?: string;
}

interface PriceHistoryTableProps {
  priceSchedule: PriceScheduleEntry[];
  isLoadingSchedule: boolean;
  isMobile: boolean;
}

function getBarConfig(change: { diff: number; percent: number } | null | undefined) {
  if (!change) return {
    barColor: 'bg-primary',
    barGlow: 'dark:shadow-[0_0_12px_rgba(37,99,235,0.25)]',
    icon: null,
    textColor: 'text-di-on-surface-variant',
    text: 'Первая цена'
  };
  if (change.diff !== 0) return {
    barColor: 'bg-primary',
    barGlow: 'dark:shadow-[0_0_12px_rgba(37,99,235,0.25)]',
    icon: change.diff > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />,
    textColor: 'text-di-primary-light',
    text: `${change.diff > 0 ? '+' : ''}${change.diff.toFixed(2)} ₽ (${change.percent > 0 ? '+' : ''}${change.percent.toFixed(1)}%)`
  };
  return {
    barColor: 'bg-di-outline-variant',
    barGlow: '',
    icon: <Minus className="w-4 h-4" />,
    textColor: 'text-di-on-surface-variant',
    text: '0.00 ₽'
  };
}

export function PriceHistoryTable({
  priceSchedule,
  isLoadingSchedule,
  isMobile
}: PriceHistoryTableProps) {
  const sortedSchedule = useMemo(() => {
    return [...priceSchedule].sort((a, b) =>
      new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime()
    );
  }, [priceSchedule]);

  const priceChanges = useMemo(() => {
    const changes = new Map<number, { diff: number; percent: number; previousPrice: number } | null>();
    const byFuelType = new Map<string, PriceScheduleEntry[]>();
    priceSchedule.forEach(entry => {
      const key = entry.service_code;
      if (!byFuelType.has(key)) byFuelType.set(key, []);
      byFuelType.get(key)!.push(entry);
    });

    byFuelType.forEach(entries => {
      entries.sort((a, b) =>
        new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
      );
      for (let i = 1; i < entries.length; i++) {
        const currentPrice = Number(entries[i].price);
        const previousPrice = Number(entries[i - 1].price);
        const diff = currentPrice - previousPrice;
        const percent = previousPrice !== 0 ? (diff / previousPrice) * 100 : 0;
        const currentIndex = priceSchedule.indexOf(entries[i]);
        changes.set(currentIndex, { diff, percent, previousPrice });
      }
    });
    return changes;
  }, [priceSchedule]);

  return (
    <section className="space-y-6 mt-8">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <History className="w-5 h-5 text-di-on-surface-variant" />
        <h3 className={`font-headline font-bold text-foreground ${isMobile ? 'text-base' : 'text-lg'}`}>
          История цен
        </h3>
        {priceSchedule.length > 0 && (
          <span className="text-[10px] font-bold text-di-on-surface-variant">
            ({priceSchedule.length})
          </span>
        )}
      </div>

      {/* Content */}
      {isLoadingSchedule ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-5 h-5 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground text-sm">Загрузка истории цен...</span>
        </div>
      ) : priceSchedule.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            За последние 30 дней изменений цен не было
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedSchedule.map((entry, index) => {
            const originalIndex = priceSchedule.indexOf(entry);
            const change = priceChanges.get(originalIndex);
            const bar = getBarConfig(change);
            const effectiveDate = entry.effective_date
              ? new Date(entry.effective_date).toLocaleString('ru-RU', {
                  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })
              : '—';

            return (
              <div
                key={`${entry.service_code}-${entry.effective_date}-${index}`}
                className="flex items-center gap-5 p-4 rounded-xl bg-di-surface-mid border border-transparent hover:border-di-primary/20 transition-all group"
              >
                {/* Color bar */}
                <div className={`w-1 ${isMobile ? 'h-10' : 'h-12'} rounded-full ${bar.barColor} ${bar.barGlow} shrink-0`} />

                {/* Grid content */}
                <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} w-full gap-4 items-center`}>
                  {/* Fuel type */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-di-on-surface-variant mb-1">Топливо</p>
                    <p className="text-foreground font-semibold text-sm">
                      {entry.fuel_type || `Код: ${entry.service_code}`}
                    </p>
                  </div>

                  {/* Change */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-di-on-surface-variant mb-1">Изменение</p>
                    <p className={`${bar.textColor} font-bold flex items-center gap-1 text-sm`}>
                      {bar.icon}
                      {bar.text}
                    </p>
                  </div>

                  {/* Date — desktop only */}
                  {!isMobile && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-di-on-surface-variant mb-1">Дата</p>
                      <p className="text-di-on-surface-variant text-sm">{effectiveDate}</p>
                    </div>
                  )}

                  {/* Price — desktop only */}
                  {!isMobile && (
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-di-on-surface-variant mb-1">Цена</p>
                      <p className="text-foreground font-headline font-extrabold text-lg tracking-tight">
                        {Number(entry.price).toFixed(2)} <span className="text-di-on-surface-variant text-sm font-normal">₽</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
