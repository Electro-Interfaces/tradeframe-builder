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

  // Подсчитываем общую сумму и суммы купюр/монет
  const totalAmount = sortedRecords.reduce((sum, record) => sum + record.value, 0);
  const totalBills = sortedRecords.reduce((sum, record) => sum + record.billsum, 0);
  const totalCoins = totalAmount - totalBills;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          className={`border-primary text-primary dark:text-primary/70 hover:bg-primary hover:text-white transition-colors ${
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

      <DialogContent className={`${isMobile ? 'max-w-[95vw] h-[90vh]' : 'max-w-3xl max-h-[80vh]'} bg-card border-border`}>
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <History className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Журнал инкассации купюроприемника
          </DialogTitle>
        </DialogHeader>

        {/* Статистика */}
        {sortedRecords.length > 0 && (
          <div className="mb-4 space-y-3">
            <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-4 gap-4'}`}>
              <div className="bg-secondary/30 p-3 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Всего инкассаций</div>
                <div className="text-lg font-bold text-primary dark:text-primary/70">{sortedRecords.length}</div>
              </div>
              <div className="bg-secondary/30 p-3 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Касса</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{formatRubles(totalAmount)} ₽</div>
              </div>
              <div className="bg-secondary/30 p-3 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Купюры</div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{formatRubles(totalBills)} ₽</div>
              </div>
              <div className="bg-secondary/30 p-3 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Разница</div>
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatRubles(totalCoins)} ₽</div>
              </div>
            </div>
          </div>
        )}

        {/* Таблица журнала */}
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400" />
            </div>
          ) : sortedRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Нет данных об инкассации</p>
            </div>
          ) : isMobile ? (
            // Мобильный вид - карточки
            <div className="space-y-2">
              {sortedRecords.map((record, index) => {
                const coins = record.value - record.billsum;
                return (
                  <div
                    key={`${record.shift}-${record.cashoutno}-${index}`}
                    className="bg-secondary/30 p-3 rounded-lg border border-border"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(record.dt)}
                      </div>
                      <div className="text-sm font-bold text-green-600 dark:text-green-400">
                        {formatRubles(record.value)} ₽
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                      <div>
                        <div className="text-muted-foreground">Смена</div>
                        <div className="text-foreground font-medium">{record.shift}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">POS</div>
                        <div className="text-foreground font-medium">{record.pos}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">№ в смене</div>
                        <div className="text-foreground font-medium">{record.cashoutno}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border">
                      <div>
                        <div className="text-muted-foreground">Купюры</div>
                        <div className="text-purple-600 dark:text-purple-400 font-medium">{formatRubles(record.billsum)} ₽</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Разница</div>
                        <div className="text-orange-600 dark:text-orange-400 font-medium">{formatRubles(coins)} ₽</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Desktop вид - таблица
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border">
                  <th className="text-left pb-2 px-2 text-foreground/80 font-medium">Дата и время</th>
                  <th className="text-center pb-2 px-2 text-foreground/80 font-medium">Смена</th>
                  <th className="text-center pb-2 px-2 text-foreground/80 font-medium">POS</th>
                  <th className="text-center pb-2 px-2 text-foreground/80 font-medium">№</th>
                  <th className="text-right pb-2 px-2 text-foreground/80 font-medium">Касса</th>
                  <th className="text-right pb-2 px-2 text-foreground/80 font-medium">Купюры</th>
                  <th className="text-right pb-2 px-2 text-foreground/80 font-medium">Разница</th>
                </tr>
              </thead>
              <tbody>
                {sortedRecords.map((record, index) => {
                  const coins = record.value - record.billsum;
                  return (
                    <tr
                      key={`${record.shift}-${record.cashoutno}-${index}`}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="py-2 px-2">
                        <span className="text-foreground/80">{formatDateTime(record.dt)}</span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="text-foreground font-medium">{record.shift}</span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="text-foreground font-medium">{record.pos}</span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="text-foreground font-medium">{record.cashoutno}</span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span className="text-green-600 dark:text-green-400 font-bold">{formatRubles(record.value)} ₽</span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span className="text-purple-600 dark:text-purple-400 font-semibold">{formatRubles(record.billsum)} ₽</span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span className="text-orange-600 dark:text-orange-400 font-semibold">{formatRubles(coins)} ₽</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
