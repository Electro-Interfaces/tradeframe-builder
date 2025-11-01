/**
 * Модальное окно с журналом инкассации купюроприемника
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { History, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { CashoutRecord } from '@/types/equipment';

interface CashoutHistoryDialogProps {
  cashoutRecords: CashoutRecord[];
  loading?: boolean;
  isMobile: boolean;
}

/**
 * Форматирует сумму в рублях
 */
function formatRubles(rubles: number): string {
  return rubles.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

/**
 * Форматирует дату и время
 */
function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return format(date, 'dd.MM.yyyy HH:mm', { locale: ru });
  } catch {
    return dateString;
  }
}

export function CashoutHistoryDialog({ cashoutRecords, loading, isMobile }: CashoutHistoryDialogProps) {
  const [open, setOpen] = useState(false);

  // Сортируем записи по дате (от новых к старым)
  const sortedRecords = [...cashoutRecords].sort((a, b) =>
    new Date(b.dt).getTime() - new Date(a.dt).getTime()
  );

  // Подсчитываем общую сумму
  const totalAmount = sortedRecords.reduce((sum, record) => sum + record.value, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          className={`border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white transition-colors ${
            isMobile ? 'flex-1' : ''
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {!isMobile && <span className="ml-1.5">Загрузка...</span>}
            </>
          ) : (
            <>
              <History className="w-4 h-4" />
              {!isMobile && <span className="ml-1.5">Журнал инкассации</span>}
            </>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className={`${isMobile ? 'max-w-[95vw] h-[90vh]' : 'max-w-3xl max-h-[80vh]'} bg-slate-800 border-slate-700`}>
        <DialogHeader>
          <DialogTitle className="text-slate-200 flex items-center gap-2">
            <History className="w-5 h-5 text-purple-400" />
            Журнал инкассации купюроприемника
          </DialogTitle>
        </DialogHeader>

        {/* Статистика */}
        {sortedRecords.length > 0 && (
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-3 gap-4'} mb-4`}>
            <div className="bg-slate-700/30 p-3 rounded-lg">
              <div className="text-xs text-slate-400 mb-1">Всего инкассаций</div>
              <div className="text-lg font-bold text-blue-400">{sortedRecords.length}</div>
            </div>
            <div className="bg-slate-700/30 p-3 rounded-lg">
              <div className="text-xs text-slate-400 mb-1">Общая сумма</div>
              <div className="text-lg font-bold text-green-400">{formatRubles(totalAmount)} ₽</div>
            </div>
            <div className="bg-slate-700/30 p-3 rounded-lg">
              <div className="text-xs text-slate-400 mb-1">Средняя сумма</div>
              <div className="text-lg font-bold text-orange-400">
                {formatRubles(Math.round(totalAmount / sortedRecords.length))} ₽
              </div>
            </div>
          </div>
        )}

        {/* Таблица журнала */}
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
          ) : sortedRecords.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Нет данных об инкассации</p>
            </div>
          ) : isMobile ? (
            // Мобильный вид - карточки
            <div className="space-y-2">
              {sortedRecords.map((record, index) => (
                <div
                  key={`${record.shift}-${record.cashoutno}-${index}`}
                  className="bg-slate-700/30 p-3 rounded-lg border border-slate-600"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-xs text-slate-400">
                      {formatDateTime(record.dt)}
                    </div>
                    <div className="text-sm font-bold text-green-400">
                      {formatRubles(record.value)} ₽
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-slate-500">Смена</div>
                      <div className="text-white font-medium">{record.shift}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">POS</div>
                      <div className="text-white font-medium">{record.pos}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">№ в смене</div>
                      <div className="text-white font-medium">{record.cashoutno}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Desktop вид - таблица
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-800 z-10">
                <tr className="border-b border-slate-600">
                  <th className="text-left pb-2 px-2 text-slate-300 font-medium">Дата и время</th>
                  <th className="text-center pb-2 px-2 text-slate-300 font-medium">Смена</th>
                  <th className="text-center pb-2 px-2 text-slate-300 font-medium">POS</th>
                  <th className="text-center pb-2 px-2 text-slate-300 font-medium">№ в смене</th>
                  <th className="text-right pb-2 px-2 text-slate-300 font-medium">Сумма (₽)</th>
                </tr>
              </thead>
              <tbody>
                {sortedRecords.map((record, index) => (
                  <tr
                    key={`${record.shift}-${record.cashoutno}-${index}`}
                    className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="py-2 px-2">
                      <span className="text-slate-300">{formatDateTime(record.dt)}</span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className="text-white font-medium">{record.shift}</span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className="text-white font-medium">{record.pos}</span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className="text-white font-medium">{record.cashoutno}</span>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <span className="text-green-400 font-bold">{formatRubles(record.value)} ₽</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
