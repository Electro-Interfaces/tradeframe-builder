/**
 * Компонент журнала инкассации купюроприемника
 * Отображает историю инкассаций с датами, сменами и суммами
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, History, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { CashoutRecord } from '@/types/equipment';
import {
  EQUIPMENT_DIALOG_CARD_CLASS,
  getEquipmentActionButtonClass,
} from './designTokens';

interface CashoutHistoryProps {
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

export function CashoutHistory({ cashoutRecords, loading, isMobile }: CashoutHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Сортируем записи по дате (от новых к старым)
  const sortedRecords = [...cashoutRecords].sort((a, b) =>
    new Date(b.dt).getTime() - new Date(a.dt).getTime()
  );

  // Если нет данных и не идет загрузка
  if (!loading && sortedRecords.length === 0) {
    return null;
  }

  return (
    <div className={`${isMobile ? 'mt-3' : 'mt-4'} border-t border-border pt-3`}>
      {/* Кнопка раскрытия/скрытия */}
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={loading}
        className={`w-full ${getEquipmentActionButtonClass(isMobile)} border-purple-600 text-purple-600 dark:text-purple-400 hover:bg-purple-600 hover:text-white transition-colors`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className={isMobile ? 'text-sm' : ''}>Загрузка журнала инкассации...</span>
          </>
        ) : (
          <>
            <History className="w-4 h-4" />
            <span className={isMobile ? 'text-sm' : ''}>
              {isExpanded ? 'Скрыть' : 'Показать'} журнал инкассации ({sortedRecords.length})
            </span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </>
        )}
      </Button>

      {/* Таблица журнала */}
      {isExpanded && !loading && (
        <div className={`${isMobile ? 'mt-3' : 'mt-4'} overflow-x-auto`}>
          {isMobile ? (
            // Мобильный вид - карточки
            <div className="space-y-2">
              {sortedRecords.map((record, index) => (
                <div
                  key={`${record.shift}-${record.cashoutno}-${index}`}
                  className={`${EQUIPMENT_DIALOG_CARD_CLASS} p-4`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(record.dt)}
                    </div>
                    <div className="text-sm font-bold text-di-on-surface">
                      {formatRubles(record.value)} ₽
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Смена</div>
                      <div className="text-foreground font-medium">{record.shift}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">POS</div>
                      <div className="text-foreground font-medium">{record.pos}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">№ инк.</div>
                      <div className="text-foreground font-medium">{record.cashoutno}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Desktop вид - таблица
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-2 px-2 text-foreground/80 font-medium">Дата и время</th>
                  <th className="text-center pb-2 px-2 text-foreground/80 font-medium">Смена</th>
                  <th className="text-center pb-2 px-2 text-foreground/80 font-medium">POS</th>
                  <th className="text-center pb-2 px-2 text-foreground/80 font-medium">№ инкассации</th>
                  <th className="text-right pb-2 px-2 text-foreground/80 font-medium">Сумма (₽)</th>
                </tr>
              </thead>
              <tbody>
                {sortedRecords.map((record, index) => (
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
                      <span className="text-di-on-surface font-bold">{formatRubles(record.value)} ₽</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
