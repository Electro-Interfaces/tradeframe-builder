/**
 * Модальное окно с анализом расхождений и рекомендациями
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lightbulb,
  CreditCard,
  ArrowRightLeft,
  HelpCircle
} from 'lucide-react';
import type {
  ReconciliationResult,
  ReconciliationTransaction,
  ReconciliationByStation
} from '@/types/reconciliation';

interface ReconciliationRecommendationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ReconciliationResult;
}

// Порог для "значительного" расхождения литров
const SIGNIFICANT_DIFF_LITERS = 1.0;

export function ReconciliationRecommendationsModal({
  open,
  onOpenChange,
  result
}: ReconciliationRecommendationsModalProps) {
  const { summary, transactions, byStation } = result;

  // Группируем транзакции по типам расхождений
  const onlyCorpTx = transactions.filter(tx => tx.status === 'only_corp');
  const onlyTfTx = transactions.filter(tx => tx.status === 'only_tf');
  const mismatchTx = transactions.filter(tx => tx.status === 'mismatch');

  // Анализ расхождений по станциям
  const stationsWithErrors = byStation.filter(s => s.status === 'error');

  // Уникальные карты с проблемами
  const problemCards = new Set<string>();
  onlyCorpTx.forEach(tx => problemCards.add(tx.cardNumber));
  onlyTfTx.forEach(tx => problemCards.add(tx.cardNumber));

  // Расчёт общих расхождений
  const totalCorpTfDiff = Math.abs((summary.totalCorpLiters || 0) - (summary.totalTfLiters || 0));
  const totalTfShiftDiff = Math.abs((summary.totalTfLiters || 0) - (summary.totalShiftLiters || 0));

  // Определение приоритетов
  const hasCriticalIssues = summary.onlyCorp > 5 || summary.onlyTf > 5 || totalCorpTfDiff > 100;
  const hasMediumIssues = summary.onlyCorp > 0 || summary.onlyTf > 0;
  const hasMinorIssues = summary.mismatch > 0 && mismatchTx.every(tx =>
    Math.abs((tx.corpLiters || 0) - (tx.tfLiters || 0)) < SIGNIFICANT_DIFF_LITERS
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] sm:max-h-[85vh] bg-slate-900 border-slate-700 p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
            <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
            Анализ и рекомендации
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] sm:max-h-[70vh] pr-2 sm:pr-4">
          <div className="space-y-4 sm:space-y-6">

            {/* Общий статус */}
            <section className="bg-slate-800 rounded-lg p-3 sm:p-4">
              <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                {summary.hasErrors ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                )}
                Общий статус
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span className="text-slate-300">{summary.matched} транзакций совпало</span>
                </div>

                {(summary.onlyCorp + summary.onlyTf + summary.mismatch) > 0 && (
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-400" />
                    <span className="text-slate-300">
                      {summary.onlyCorp + summary.onlyTf + summary.mismatch} расхождений
                    </span>
                  </div>
                )}
              </div>

              {/* Итоги по литрам */}
              <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Corp - TF:</span>
                  <span className={totalCorpTfDiff > SIGNIFICANT_DIFF_LITERS ? 'text-red-400' : 'text-green-400'}>
                    {totalCorpTfDiff > 0 ? `Δ ${totalCorpTfDiff.toFixed(1)} л` : 'Совпадает'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>TF - Смена:</span>
                  <span className={totalTfShiftDiff > SIGNIFICANT_DIFF_LITERS ? 'text-yellow-400' : 'text-green-400'}>
                    {totalTfShiftDiff > 0 ? `Δ ${totalTfShiftDiff.toFixed(1)} л` : 'Совпадает'}
                  </span>
                </div>
              </div>
            </section>

            {/* Детальный анализ - Только в Corp */}
            {summary.onlyCorp > 0 && (
              <section className="bg-slate-800 rounded-lg p-3 sm:p-4">
                <h3 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Только в Corp: {summary.onlyCorp} транзакций
                </h3>

                <div className="space-y-2 text-sm">
                  {onlyCorpTx.slice(0, 5).map((tx, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:justify-between text-slate-300 bg-slate-900/50 rounded px-2 py-1">
                      <span className="truncate">{tx.fuelType}: {(tx.corpLiters || 0).toFixed(1)} л</span>
                      <span className="text-slate-500 text-xs sm:text-sm">карта ...{String(tx.cardNumber || '').slice(-4)}</span>
                    </div>
                  ))}
                  {onlyCorpTx.length > 5 && (
                    <div className="text-slate-500 text-xs">
                      ... и ещё {onlyCorpTx.length - 5} транзакций
                    </div>
                  )}
                </div>

                <div className="mt-3 p-2 bg-purple-900/30 rounded text-xs text-purple-300 flex items-start gap-2">
                  <HelpCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Вероятные причины:</strong>
                    <ul className="mt-1 list-disc list-inside space-y-0.5">
                      <li>Карты не привязаны к системе TradeFrame</li>
                      <li>Задержка синхронизации (подождите 24 часа)</li>
                      <li>Операции по картам другой сети</li>
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {/* Детальный анализ - Только в TF */}
            {summary.onlyTf > 0 && (
              <section className="bg-slate-800 rounded-lg p-3 sm:p-4">
                <h3 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Только в TF: {summary.onlyTf} транзакций
                </h3>

                <div className="space-y-2 text-sm">
                  {onlyTfTx.slice(0, 5).map((tx, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:justify-between text-slate-300 bg-slate-900/50 rounded px-2 py-1">
                      <span className="truncate">{tx.fuelType}: {(tx.tfLiters || 0).toFixed(1)} л</span>
                      <span className="text-slate-500 text-xs sm:text-sm">карта ...{String(tx.cardNumber || '').slice(-4)}</span>
                    </div>
                  ))}
                  {onlyTfTx.length > 5 && (
                    <div className="text-slate-500 text-xs">
                      ... и ещё {onlyTfTx.length - 5} транзакций
                    </div>
                  )}
                </div>

                <div className="mt-3 p-2 bg-blue-900/30 rounded text-xs text-blue-300 flex items-start gap-2">
                  <HelpCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Вероятные причины:</strong>
                    <ul className="mt-1 list-disc list-inside space-y-0.5">
                      <li>Карта деактивирована в TradeCorp</li>
                      <li>Дублирование операции в TF</li>
                      <li>Ошибка POS-терминала</li>
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {/* Детальный анализ - Расхождение литров */}
            {summary.mismatch > 0 && (
              <section className="bg-slate-800 rounded-lg p-3 sm:p-4">
                <h3 className="text-sm font-medium text-yellow-400 mb-3 flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  Расхождение литров: {summary.mismatch} транзакций
                </h3>

                <div className="space-y-2 text-sm">
                  {mismatchTx.slice(0, 5).map((tx, idx) => {
                    const diff = (tx.corpLiters || 0) - (tx.tfLiters || 0);
                    const isSignificant = Math.abs(diff) >= SIGNIFICANT_DIFF_LITERS;
                    return (
                      <div key={idx} className="flex flex-col sm:flex-row sm:justify-between text-slate-300 bg-slate-900/50 rounded px-2 py-1.5">
                        <span className="text-xs sm:text-sm">
                          {tx.fuelType}: Corp {(tx.corpLiters || 0).toFixed(1)} vs TF {(tx.tfLiters || 0).toFixed(1)} л
                        </span>
                        <span className={`text-xs sm:text-sm font-medium ${isSignificant ? 'text-red-400' : 'text-yellow-400'}`}>
                          Δ {diff.toFixed(1)} л
                        </span>
                      </div>
                    );
                  })}
                  {mismatchTx.length > 5 && (
                    <div className="text-slate-500 text-xs">
                      ... и ещё {mismatchTx.length - 5} транзакций
                    </div>
                  )}
                </div>

                <div className="mt-3 p-2 bg-yellow-900/30 rounded text-xs text-yellow-300 flex items-start gap-2">
                  <HelpCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Вероятные причины:</strong>
                    <ul className="mt-1 list-disc list-inside space-y-0.5">
                      <li>Погрешность округления (до 0.5 л - норма)</li>
                      <li>Частичный возврат или отмена</li>
                      <li>Ошибка счётчика ТРК</li>
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {/* Станции с расхождениями */}
            {stationsWithErrors.length > 0 && (
              <section className="bg-slate-800 rounded-lg p-3 sm:p-4">
                <h3 className="text-sm font-medium text-orange-400 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Станции с расхождениями: {stationsWithErrors.length}
                </h3>

                <div className="space-y-2 text-sm">
                  {stationsWithErrors.map((station, idx) => {
                    const corpTfDiff = (station.corpLitersTotal || 0) - (station.tfLitersTotal || 0);
                    return (
                      <div key={idx} className="flex flex-col sm:flex-row sm:justify-between text-slate-300 bg-slate-900/50 rounded px-2 py-1.5">
                        <span className="truncate text-xs sm:text-sm">{station.stationName}</span>
                        <span className="text-orange-400 text-xs sm:text-sm font-medium">
                          Corp-TF: {corpTfDiff > 0 ? '+' : ''}{corpTfDiff.toFixed(1)} л
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Рекомендации */}
            <section className="bg-green-900/20 border border-green-800 rounded-lg p-3 sm:p-4">
              <h3 className="text-sm font-medium text-green-400 mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Рекомендации
              </h3>

              <div className="space-y-3 text-sm text-slate-300">
                {/* Нет расхождений */}
                {!summary.hasErrors && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Все данные сходятся. Дополнительных действий не требуется.</span>
                  </div>
                )}

                {/* Есть только в Corp */}
                {summary.onlyCorp > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-purple-400 font-bold">1.</span>
                    <div>
                      <span className="text-purple-300">Проверьте привязку карт</span>
                      {problemCards.size > 0 && problemCards.size <= 5 && (
                        <span className="text-slate-500">
                          {' '}(...{Array.from(problemCards).slice(0, 3).map(c => String(c || '').slice(-4)).join(', ...')})
                        </span>
                      )}
                      <span> в системе TradeFrame. Если карты новые - дождитесь синхронизации.</span>
                    </div>
                  </div>
                )}

                {/* Есть только в TF */}
                {summary.onlyTf > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-blue-400 font-bold">{summary.onlyCorp > 0 ? '2' : '1'}.</span>
                    <span>
                      Проверьте статус карт в TradeCorp. Возможно, карты деактивированы
                      или операции дублируются в TF.
                    </span>
                  </div>
                )}

                {/* Расхождение литров */}
                {summary.mismatch > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400 font-bold">
                      {(summary.onlyCorp > 0 ? 1 : 0) + (summary.onlyTf > 0 ? 1 : 0) + 1}.
                    </span>
                    <span>
                      {hasMinorIssues ? (
                        <>Расхождения литров в пределах погрешности (до {SIGNIFICANT_DIFF_LITERS} л) — можно игнорировать.</>
                      ) : (
                        <>Проверьте детали операций с расхождением литров. Обратите внимание на возвраты и отмены.</>
                      )}
                    </span>
                  </div>
                )}

                {/* Общая рекомендация при критических проблемах */}
                {hasCriticalIssues && (
                  <div className="mt-3 p-2 sm:p-3 bg-red-900/30 border border-red-800 rounded text-red-300 text-xs leading-relaxed">
                    <strong>Внимание:</strong> Обнаружено значительное количество расхождений.
                    Рекомендуется связаться с технической поддержкой TradeCorp для выяснения причин.
                  </div>
                )}
              </div>
            </section>

          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t border-slate-700">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto bg-slate-800 border-slate-600 hover:bg-slate-700"
          >
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
