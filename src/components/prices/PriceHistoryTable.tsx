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
    <Card className="bg-slate-800 border-slate-700 mt-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center gap-2">
          <History className="w-5 h-5" />
          <span className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold`}>
            История изменения цен
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoadingSchedule ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-400 mr-2" />
            <span className="text-slate-300">Загрузка истории цен...</span>
          </div>
        ) : priceSchedule.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">История цен не найдена</p>
            <p className="text-slate-500 text-sm mt-2">
              За последние 30 дней изменений цен не было
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className={`text-left py-3 px-4 text-slate-300 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    Дата создания
                  </th>
                  <th className={`text-left py-3 px-4 text-slate-300 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    Дата применения
                  </th>
                  <th className={`text-left py-3 px-4 text-slate-300 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    Топливо
                  </th>
                  <th className={`text-right py-3 px-4 text-slate-300 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    Цена (руб/л)
                  </th>
                  <th className={`text-right py-3 px-4 text-slate-300 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    Изменение
                  </th>
                  <th className={`text-left py-3 px-4 text-slate-300 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
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
                      className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                    >
                      <td className={`py-3 px-4 text-slate-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        {entry.created_at ? new Date(entry.created_at).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '—'}
                      </td>
                      <td className={`py-3 px-4 text-slate-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        {entry.effective_date ? new Date(entry.effective_date).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '—'}
                      </td>
                      <td className={`py-3 px-4 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        <div className="flex items-center gap-2">
                          <Fuel className="w-4 h-4 text-blue-400" />
                          <span className="text-slate-300 font-medium">
                            {entry.fuel_type || `Код: ${entry.service_code}`}
                          </span>
                        </div>
                      </td>
                      <td className={`py-3 px-4 text-right ${isMobile ? 'text-base' : 'text-lg'}`}>
                        <span className="text-green-400 font-semibold">
                          {Number(entry.price).toFixed(2)}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        {change ? (
                          <div className="flex items-center justify-end gap-1">
                            {change.diff > 0 ? (
                              <>
                                <TrendingUp className="w-4 h-4 text-red-400" />
                                <span className="text-red-400 font-semibold">
                                  +{change.diff.toFixed(2)} ({change.percent > 0 ? '+' : ''}{change.percent.toFixed(1)}%)
                                </span>
                              </>
                            ) : change.diff < 0 ? (
                              <>
                                <TrendingDown className="w-4 h-4 text-green-400" />
                                <span className="text-green-400 font-semibold">
                                  {change.diff.toFixed(2)} ({change.percent.toFixed(1)}%)
                                </span>
                              </>
                            ) : (
                              <>
                                <Minus className="w-4 h-4 text-slate-400" />
                                <span className="text-slate-400">
                                  Без изменений
                                </span>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">Первая цена</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={`border-blue-600 text-blue-400 bg-blue-900/20 ${isMobile ? 'text-xs' : 'text-sm'}`}
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
