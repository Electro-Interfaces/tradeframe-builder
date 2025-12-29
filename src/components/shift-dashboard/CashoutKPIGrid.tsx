/**
 * Компонент отображения метрик инкассации
 */

import { useState } from 'react';
import { Banknote, Wallet, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CashoutMetrics, CashoutItem } from '@/types/shift-dashboard';

interface CashoutKPIGridProps {
  /** Метрики инкассации */
  cashout: CashoutMetrics;
  /** Флаг загрузки */
  isLoading?: boolean;
  /** Дополнительный класс */
  className?: string;
}

/**
 * Форматирует валюту
 */
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Форматирует дату
 */
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Карточка KPI
 */
function KPICard({
  title,
  value,
  icon,
  iconBg,
  isLoading,
  onClick,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  isLoading?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className="bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-700 cursor-pointer hover:border-slate-500 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        <div className={cn('p-1 sm:p-1.5 rounded-lg', iconBg)}>
          {icon}
        </div>
        <span className="text-xs sm:text-sm font-medium text-white">{title}</span>
      </div>

      {isLoading ? (
        <div className="h-5 sm:h-7 w-20 sm:w-28 bg-slate-700 rounded animate-pulse" />
      ) : (
        <div className="flex items-baseline gap-1 sm:gap-2">
          <span className="text-base sm:text-xl font-bold text-white">{value}</span>
          <span className="text-[10px] sm:text-xs text-slate-400">₽</span>
        </div>
      )}
    </div>
  );
}

/**
 * Сетка KPI инкассации
 */
export function CashoutKPIGrid({ cashout, isLoading, className }: CashoutKPIGridProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Защита от undefined
  const safeCashout = cashout || { totalAmount: 0, totalBillAmount: 0, count: 0, details: [] };

  // Если нет данных - не показываем секцию
  if (!isLoading && safeCashout.count === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3 sm:space-y-4', className)}>
      {/* Заголовок секции */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-medium text-slate-400 uppercase tracking-wide">
          Инкассация купюроприемников
        </h3>
        {safeCashout.count > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
          >
            <span className="hidden sm:inline">{isExpanded ? 'Скрыть детали' : 'Показать детали'}</span>
            <span className="sm:hidden">{isExpanded ? 'Скрыть' : 'Детали'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <KPICard
          title="Общая сумма"
          value={formatCurrency(safeCashout.totalAmount)}
          icon={<Wallet className="w-3 h-3 sm:w-4 sm:h-4 text-white" />}
          iconBg="bg-green-600"
          isLoading={isLoading}
          onClick={() => safeCashout.count > 0 && setIsExpanded(!isExpanded)}
        />
        <KPICard
          title="Купюры"
          value={formatCurrency(safeCashout.totalBillAmount)}
          icon={<Banknote className="w-3 h-3 sm:w-4 sm:h-4 text-white" />}
          iconBg="bg-blue-600"
          isLoading={isLoading}
          onClick={() => safeCashout.count > 0 && setIsExpanded(!isExpanded)}
        />
        <div
          className="bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-700 cursor-pointer hover:border-slate-500 transition-colors"
          onClick={() => safeCashout.count > 0 && setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <div className="p-1 sm:p-1.5 rounded-lg bg-purple-600">
              <Banknote className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-white">Кол-во</span>
          </div>
          {isLoading ? (
            <div className="h-5 sm:h-7 w-12 sm:w-16 bg-slate-700 rounded animate-pulse" />
          ) : (
            <div className="flex items-baseline gap-1 sm:gap-2">
              <span className="text-base sm:text-xl font-bold text-white">{safeCashout.count}</span>
              <span className="text-[10px] sm:text-xs text-slate-400 hidden sm:inline">инкассаций</span>
            </div>
          )}
        </div>
      </div>

      {/* Таблица детализации */}
      {isExpanded && safeCashout.details.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-slate-400 uppercase">
                    Дата/время
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-slate-400 uppercase">
                    Смена
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-slate-400 uppercase">
                    POS
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-slate-400 uppercase">
                    Купюры
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-slate-400 uppercase">
                    Всего
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {safeCashout.details.map((item, idx) => (
                  <tr key={`${item.shiftNumber}-${item.posNumber}-${idx}`} className="hover:bg-slate-700/30">
                    <td className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-slate-300 whitespace-nowrap text-xs">
                      {formatDate(item.datetime)}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-white font-medium">
                      №{item.shiftNumber}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-400">
                      {item.posNumber}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-blue-400">
                      {formatCurrency(item.billAmount)}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-white font-medium">
                      {formatCurrency(item.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900/50 border-t border-slate-600">
                <tr>
                  <td className="hidden sm:table-cell"></td>
                  <td colSpan={2} className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold text-white">
                    <span className="hidden sm:inline">ИТОГО ({safeCashout.count} инкассаций)</span>
                    <span className="sm:hidden">Σ {safeCashout.count}</span>
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-bold text-blue-400">
                    {formatCurrency(safeCashout.totalBillAmount)}
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-bold text-white">
                    {formatCurrency(safeCashout.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default CashoutKPIGrid;
