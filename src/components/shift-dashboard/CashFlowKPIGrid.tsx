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
    case 'opening': return 'text-blue-600 dark:text-blue-400';
    case 'closing': return 'text-purple-600 dark:text-purple-400';
    case 'income': return 'text-green-600 dark:text-green-400';
    case 'expense': return 'text-red-600 dark:text-red-400';
    default: return 'text-muted-foreground';
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
  valueColor = 'text-foreground',
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
        'bg-card rounded-xl p-3 sm:p-4 border border-border transition-colors',
        onClick && 'cursor-pointer hover:border-border'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        <div className={cn('p-1 sm:p-1.5 rounded-lg', iconBg)}>
          {icon}
        </div>
        <span className="text-xs sm:text-sm font-medium text-foreground truncate">{title}</span>
      </div>

      {isLoading ? (
        <div className="h-6 sm:h-7 w-20 sm:w-28 bg-secondary rounded animate-pulse" />
      ) : (
        <div>
          <div className="flex items-baseline gap-1 sm:gap-2">
            <span className={cn('text-base sm:text-xl font-bold', valueColor)}>{value}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">₽</span>
          </div>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 hidden sm:block">{subtitle}</p>
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
    <div className={cn('space-y-3 sm:space-y-4', className)}>
      {/* Заголовок секции */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide">
          <span className="hidden sm:inline">Движение наличных (сверка кассы)</span>
          <span className="sm:hidden">Сверка кассы</span>
        </h3>
        {safeCashFlow.details.length > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-300"
          >
            <span className="hidden sm:inline">{isExpanded ? 'Скрыть детали' : 'Показать детали'}</span>
            <span className="sm:hidden">{isExpanded ? 'Скрыть' : 'Детали'}</span>
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
          icon={<ArrowUpCircle className="w-4 h-4 text-foreground" />}
          iconBg="bg-emerald-600"
          valueColor="text-green-600 dark:text-green-400"
          isLoading={isLoading}
          onClick={() => safeCashFlow.details.length > 0 && setIsExpanded(!isExpanded)}
        />

        {/* Расход */}
        <KPICard
          title="Расход"
          value={formatCurrency(safeCashFlow.totalExpense)}
          icon={<ArrowDownCircle className="w-4 h-4 text-foreground" />}
          iconBg="bg-red-600"
          valueColor="text-red-600 dark:text-red-400"
          isLoading={isLoading}
          onClick={() => safeCashFlow.details.length > 0 && setIsExpanded(!isExpanded)}
        />

        {/* Расчетный остаток */}
        <KPICard
          title="Расчетный остаток"
          value={formatCurrency(safeCashFlow.calculatedBalance)}
          icon={<Calculator className="w-4 h-4 text-foreground" />}
          iconBg="bg-blue-600"
          isLoading={isLoading}
          subtitle="Приход − Расход"
          onClick={() => safeCashFlow.details.length > 0 && setIsExpanded(!isExpanded)}
        />

        {/* Фактический остаток */}
        <KPICard
          title="Факт. остаток"
          value={formatCurrency(safeCashFlow.closingBalance)}
          icon={<Wallet className="w-4 h-4 text-foreground" />}
          iconBg="bg-purple-600"
          isLoading={isLoading}
          onClick={() => safeCashFlow.details.length > 0 && setIsExpanded(!isExpanded)}
        />

        {/* Разница */}
        <div
          className={cn(
            'rounded-xl p-3 sm:p-4 border transition-colors',
            hasDifference
              ? 'bg-gradient-to-br from-amber-50 dark:from-amber-900/50 to-card border-amber-300 dark:border-amber-700/50'
              : 'bg-card border-border',
            safeCashFlow.details.length > 0 && 'cursor-pointer hover:border-border'
          )}
          onClick={() => safeCashFlow.details.length > 0 && setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <div className={cn('p-1 sm:p-1.5 rounded-lg', hasDifference ? 'bg-amber-600' : 'bg-secondary')}>
              <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-foreground" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-foreground">Разница</span>
          </div>

          {isLoading ? (
            <div className="h-5 sm:h-7 w-16 sm:w-20 bg-secondary rounded animate-pulse" />
          ) : (
            <div>
              <div className="flex items-baseline gap-1 sm:gap-2">
                <span className={cn(
                  'text-base sm:text-xl font-bold',
                  hasDifference ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'
                )}>
                  {safeCashFlow.difference > 0 && '+'}{formatCurrency(safeCashFlow.difference)}
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">₽</span>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 hidden sm:block">
                {hasDifference ? 'Требует проверки' : 'Сходится'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Таблица детализации */}
      {isExpanded && safeCashFlow.details.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-background/50">
                <tr>
                  <th className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">
                    Дата/время
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">
                    Тип
                  </th>
                  <th className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">
                    Описание
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">
                    Смена
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">
                    Сумма
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {safeCashFlow.details.map((item, idx) => (
                  <tr key={`${item.id}-${idx}`} className="hover:bg-secondary/30">
                    <td className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-foreground/80 whitespace-nowrap text-xs">
                      {formatDate(item.datetime)}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3">
                      <div className={cn('flex items-center gap-1 sm:gap-2', getOperationTypeColor(item.operationType))}>
                        <span className="hidden sm:inline">{getOperationTypeIcon(item.operationType)}</span>
                        <span className="truncate max-w-[80px] sm:max-w-none">{getOperationTypeName(item.operationType)}</span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3 text-foreground/80 max-w-[200px] truncate" title={item.description}>
                      {item.description}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-muted-foreground">
                      {item.shiftNumber ? `№${item.shiftNumber}` : '-'}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                      <span className={cn(
                        'font-medium text-xs sm:text-sm',
                        item.operationType === 'income' && 'text-green-600 dark:text-green-400',
                        item.operationType === 'expense' && 'text-red-600 dark:text-red-400',
                        (item.operationType === 'opening' || item.operationType === 'closing') && 'text-foreground'
                      )}>
                        {item.operationType === 'income' && '+'}
                        {item.operationType === 'expense' && '−'}
                        {formatCurrency(item.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-background/50 border-t border-border">
                <tr>
                  <td className="hidden sm:table-cell"></td>
                  <td colSpan={2} className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold text-foreground">
                    <span className="hidden sm:inline">ИТОГО ({safeCashFlow.operationsCount} операций)</span>
                    <span className="sm:hidden">Σ {safeCashFlow.operationsCount}</span>
                  </td>
                  <td className="hidden md:table-cell"></td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-bold text-foreground">
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
