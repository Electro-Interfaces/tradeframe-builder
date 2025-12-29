/**
 * Компонент отображения движения наличных (сверка кассы)
 */

import { useState } from 'react';
import { Wallet, ArrowUpCircle, ArrowDownCircle, Calculator, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CashFlowMetrics, CashFlowItem } from '@/types/shift-dashboard';

interface CashFlowKPIGridProps {
  /** Метрики движения наличных */
  cashFlow: CashFlowMetrics;
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
 * Название типа операции
 */
const getOperationTypeName = (type: string): string => {
  switch (type) {
    case 'opening': return 'Остаток на начало';
    case 'closing': return 'Остаток на конец';
    case 'income': return 'Приход';
    case 'expense': return 'Расход';
    default: return type;
  }
};

/**
 * Цвет типа операции
 */
const getOperationTypeColor = (type: string): string => {
  switch (type) {
    case 'opening': return 'text-blue-400';
    case 'closing': return 'text-purple-400';
    case 'income': return 'text-green-400';
    case 'expense': return 'text-red-400';
    default: return 'text-slate-400';
  }
};

/**
 * Иконка типа операции
 */
const getOperationTypeIcon = (type: string) => {
  switch (type) {
    case 'opening': return <Wallet className="w-4 h-4" />;
    case 'closing': return <Calculator className="w-4 h-4" />;
    case 'income': return <ArrowUpCircle className="w-4 h-4" />;
    case 'expense': return <ArrowDownCircle className="w-4 h-4" />;
    default: return null;
  }
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
  valueColor = 'text-white',
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  isLoading?: boolean;
  onClick?: () => void;
  valueColor?: string;
  subtitle?: string;
}) {
  return (
    <div
      className={cn(
        'bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-700 transition-colors',
        onClick && 'cursor-pointer hover:border-slate-500'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        <div className={cn('p-1 sm:p-1.5 rounded-lg', iconBg)}>
          {icon}
        </div>
        <span className="text-xs sm:text-sm font-medium text-white truncate">{title}</span>
      </div>

      {isLoading ? (
        <div className="h-6 sm:h-7 w-20 sm:w-28 bg-slate-700 rounded animate-pulse" />
      ) : (
        <div>
          <div className="flex items-baseline gap-1 sm:gap-2">
            <span className={cn('text-base sm:text-xl font-bold', valueColor)}>{value}</span>
            <span className="text-[10px] sm:text-xs text-slate-400">₽</span>
          </div>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 hidden sm:block">{subtitle}</p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Сетка KPI движения наличных
 */
export function CashFlowKPIGrid({ cashFlow, isLoading, className }: CashFlowKPIGridProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Защита от undefined
  const safeCashFlow = cashFlow || {
    openingBalance: 0,
    totalIncome: 0,
    totalExpense: 0,
    closingBalance: 0,
    calculatedBalance: 0,
    difference: 0,
    operationsCount: 0,
    details: [],
  };

  // Если нет данных - не показываем секцию
  if (!isLoading && safeCashFlow.operationsCount === 0 && safeCashFlow.totalIncome === 0) {
    return null;
  }

  const hasDifference = Math.abs(safeCashFlow.difference) > 0.01;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Заголовок секции */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
          Движение наличных (сверка кассы)
        </h3>
        {safeCashFlow.details.length > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
          >
            {isExpanded ? 'Скрыть детали' : 'Показать детали'}
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
        {/* Приход */}
        <KPICard
          title="Приход"
          value={formatCurrency(safeCashFlow.totalIncome)}
          icon={<ArrowUpCircle className="w-4 h-4 text-white" />}
          iconBg="bg-green-600"
          valueColor="text-green-400"
          isLoading={isLoading}
          onClick={() => safeCashFlow.details.length > 0 && setIsExpanded(!isExpanded)}
        />

        {/* Расход */}
        <KPICard
          title="Расход"
          value={formatCurrency(safeCashFlow.totalExpense)}
          icon={<ArrowDownCircle className="w-4 h-4 text-white" />}
          iconBg="bg-red-600"
          valueColor="text-red-400"
          isLoading={isLoading}
          onClick={() => safeCashFlow.details.length > 0 && setIsExpanded(!isExpanded)}
        />

        {/* Расчетный остаток */}
        <KPICard
          title="Расчетный остаток"
          value={formatCurrency(safeCashFlow.calculatedBalance)}
          icon={<Calculator className="w-4 h-4 text-white" />}
          iconBg="bg-blue-600"
          isLoading={isLoading}
          subtitle="Приход − Расход"
          onClick={() => safeCashFlow.details.length > 0 && setIsExpanded(!isExpanded)}
        />

        {/* Фактический остаток */}
        <KPICard
          title="Факт. остаток"
          value={formatCurrency(safeCashFlow.closingBalance)}
          icon={<Wallet className="w-4 h-4 text-white" />}
          iconBg="bg-purple-600"
          isLoading={isLoading}
          onClick={() => safeCashFlow.details.length > 0 && setIsExpanded(!isExpanded)}
        />

        {/* Разница */}
        <div
          className={cn(
            'rounded-xl p-4 border transition-colors',
            hasDifference
              ? 'bg-gradient-to-br from-amber-900/50 to-slate-800 border-amber-700/50'
              : 'bg-slate-800 border-slate-700',
            safeCashFlow.details.length > 0 && 'cursor-pointer hover:border-slate-500'
          )}
          onClick={() => safeCashFlow.details.length > 0 && setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className={cn('p-1.5 rounded-lg', hasDifference ? 'bg-amber-600' : 'bg-slate-600')}>
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-white">Разница</span>
          </div>

          {isLoading ? (
            <div className="h-7 w-20 bg-slate-700 rounded animate-pulse" />
          ) : (
            <div>
              <div className="flex items-baseline gap-2">
                <span className={cn(
                  'text-xl font-bold',
                  hasDifference ? 'text-amber-400' : 'text-green-400'
                )}>
                  {safeCashFlow.difference > 0 && '+'}{formatCurrency(safeCashFlow.difference)}
                </span>
                <span className="text-xs text-slate-400">₽</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {hasDifference ? 'Требует проверки' : 'Сходится'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Таблица детализации */}
      {isExpanded && safeCashFlow.details.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    Дата/время
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    Тип
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    Описание
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">
                    Смена
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">
                    Сумма (₽)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {safeCashFlow.details.map((item, idx) => (
                  <tr key={`${item.id}-${idx}`} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {formatDate(item.datetime)}
                    </td>
                    <td className="px-4 py-3">
                      <div className={cn('flex items-center gap-2', getOperationTypeColor(item.operationType))}>
                        {getOperationTypeIcon(item.operationType)}
                        <span>{getOperationTypeName(item.operationType)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 max-w-[200px] truncate" title={item.description}>
                      {item.description}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400">
                      {item.shiftNumber ? `№${item.shiftNumber}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        'font-medium',
                        item.operationType === 'income' && 'text-green-400',
                        item.operationType === 'expense' && 'text-red-400',
                        (item.operationType === 'opening' || item.operationType === 'closing') && 'text-white'
                      )}>
                        {item.operationType === 'income' && '+'}
                        {item.operationType === 'expense' && '−'}
                        {formatCurrency(item.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900/50 border-t border-slate-600">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-sm font-bold text-white">
                    ИТОГО ({safeCashFlow.operationsCount} операций)
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-white">
                    {formatCurrency(safeCashFlow.closingBalance)}
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

export default CashFlowKPIGrid;
