/**
 * Компонент таблицы истории изменения цен
 * Отображает историю цен с возможностью адаптивного отображения
 */

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, RefreshCw, AlertCircle, Fuel, TrendingUp, TrendingDown, Minus } from "lucide-react";

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

export function PriceHistoryTable({
  priceSchedule,
  isLoadingSchedule,
  isMobile
}: PriceHistoryTableProps) {
  // Сортируем историю: самые новые даты наверху
  const sortedSchedule = useMemo(() => {
    return [...priceSchedule].sort((a, b) => {
      const dateA = new Date(a.effective_date).getTime();
      const dateB = new Date(b.effective_date).getTime();
      return dateB - dateA; // Сортировка от новых к старым
    });
  }, [priceSchedule]);

  // Рассчитываем изменения цен для каждой записи
  const priceChanges = useMemo(() => {
    const changes = new Map<number, { diff: number; percent: number; previousPrice: number } | null>();

    // Группируем записи по типу топлива
    const byFuelType = new Map<string, PriceScheduleEntry[]>();
    priceSchedule.forEach(entry => {
      const key = entry.service_code;
      if (!byFuelType.has(key)) {
        byFuelType.set(key, []);
      }
      byFuelType.get(key)!.push(entry);
    });

    // Сортируем записи каждого топлива по дате применения (от старых к новым для расчета изменений)
    byFuelType.forEach(entries => {
      entries.sort((a, b) =>
        new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
      );

      // Рассчитываем изменения
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
    <Card className="bg-di-surface-high border border-di-outline-variant/20 rounded-xl mt-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-foreground flex items-center gap-2">
          <History className="w-5 h-5" />
          <span className={`${isMobile ? 'text-base' : 'text-lg'} font-headline font-bold`}>
            История изменения цен
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoadingSchedule ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400 mr-2" />
            <span className="text-foreground/80">Загрузка истории цен...</span>
          </div>
        ) : priceSchedule.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">История цен не найдена</p>
            <p className="text-muted-foreground text-sm mt-2">
              За последние 30 дней изменений цен не было
            </p>
          </div>
        ) : isMobile ? (
          // Мобильная версия - карточки
          <div className="space-y-3">
            {sortedSchedule.map((entry, index) => {
              const originalIndex = priceSchedule.indexOf(entry);
              const change = priceChanges.get(originalIndex);

              return (
                <div
                  key={`${entry.service_code}-${entry.effective_date}-${index}`}
                  className="bg-secondary/50 border border-border rounded-lg p-3"
                >
                  {/* Заголовок карточки - топливо и цена */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-di-outline-variant/15">
                    <div className="flex items-center gap-2">
                      <Fuel className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-foreground font-semibold text-sm">
                        {entry.fuel_type || `Код: ${entry.service_code}`}
                      </span>
                    </div>
                    <span className="text-green-600 dark:text-green-400 font-bold text-lg">
                      {Number(entry.price).toFixed(2)} ₽
                    </span>
                  </div>

                  {/* Изменение цены - ВАЖНЫЙ БЛОК */}
                  {change && (
                    <div className="mb-3 pb-3 border-b border-di-outline-variant/15">
                      <div className="text-xs text-muted-foreground mb-1">Изменение:</div>
                      <div className="flex items-center gap-2">
                        {change.diff > 0 ? (
                          <>
                            <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400" />
                            <span className="text-red-600 dark:text-red-400 font-semibold text-sm">
                              +{change.diff.toFixed(2)} ₽ ({change.percent > 0 ? '+' : ''}{change.percent.toFixed(1)}%)
                            </span>
                          </>
                        ) : change.diff < 0 ? (
                          <>
                            <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <span className="text-green-600 dark:text-green-400 font-semibold text-sm">
                              {change.diff.toFixed(2)} ₽ ({change.percent.toFixed(1)}%)
                            </span>
                          </>
                        ) : (
                          <>
                            <Minus className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground text-xs">
                              Без изменений
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Даты */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Дата применения:</span>
                      <span className="text-foreground/80">
                        {entry.effective_date ? new Date(entry.effective_date).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '—'}
                      </span>
                    </div>
                    {entry.created_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Дата создания:</span>
                        <span className="text-foreground/80">
                          {new Date(entry.created_at).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Статус */}
                  <div className="mt-3 pt-3 border-t border-di-outline-variant/15">
                    <Badge
                      variant="outline"
                      className="border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20 text-xs"
                    >
                      Применена
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Десктопная версия - таблица
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-di-outline-variant/15">
                  <th className="text-left py-3 px-4 text-foreground/80 font-medium text-sm">
                    Дата создания
                  </th>
                  <th className="text-left py-3 px-4 text-foreground/80 font-medium text-sm">
                    Дата применения
                  </th>
                  <th className="text-left py-3 px-4 text-foreground/80 font-medium text-sm">
                    Топливо
                  </th>
                  <th className="text-right py-3 px-4 text-foreground/80 font-medium text-sm">
                    Цена (руб/л)
                  </th>
                  <th className="text-right py-3 px-4 text-foreground/80 font-medium text-sm">
                    Изменение
                  </th>
                  <th className="text-left py-3 px-4 text-foreground/80 font-medium text-sm">
                    Статус
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedSchedule.map((entry, index) => {
                  const originalIndex = priceSchedule.indexOf(entry);
                  const change = priceChanges.get(originalIndex);

                  return (
                    <tr
                      key={`${entry.service_code}-${entry.effective_date}-${index}`}
                      className="border-b border-di-outline-variant/15 hover:bg-card/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-foreground/80 text-sm">
                        {entry.created_at ? new Date(entry.created_at).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '—'}
                      </td>
                      <td className="py-3 px-4 text-foreground/80 text-sm">
                        {entry.effective_date ? new Date(entry.effective_date).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '—'}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Fuel className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-foreground/80 font-medium">
                            {entry.fuel_type || `Код: ${entry.service_code}`}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-lg">
                        <span className="text-green-600 dark:text-green-400 font-semibold">
                          {Number(entry.price).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm">
                        {change ? (
                          <div className="flex items-center justify-end gap-1">
                            {change.diff > 0 ? (
                              <>
                                <TrendingUp className="w-4 h-4 text-red-600 dark:text-red-400" />
                                <span className="text-red-600 dark:text-red-400 font-semibold">
                                  +{change.diff.toFixed(2)} ({change.percent > 0 ? '+' : ''}{change.percent.toFixed(1)}%)
                                </span>
                              </>
                            ) : change.diff < 0 ? (
                              <>
                                <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-400" />
                                <span className="text-green-600 dark:text-green-400 font-semibold">
                                  {change.diff.toFixed(2)} ({change.percent.toFixed(1)}%)
                                </span>
                              </>
                            ) : (
                              <>
                                <Minus className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  Без изменений
                                </span>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Первая цена</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className="border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20 text-sm"
                        >
                          Применена
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
