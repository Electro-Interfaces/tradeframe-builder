/**
 * Компонент карточек поступлений по ТТН
 */

import { useState } from 'react';
import { Truck, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReceiptsMetrics, ReceiptsByFuel } from '@/types/shift-dashboard';

interface ReceiptsKPIGridProps {
  /** Метрики поступлений */
  receipts: ReceiptsMetrics;
  /** Флаг загрузки */
  isLoading?: boolean;
  /** Дополнительный класс */
  className?: string;
}

/**
 * Форматирует объем
 */
const formatVolume = (value: number): string => {
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
 * Карточка поступления по топливу
 */
function ReceiptFuelCard({ fuel, isLoading, onClick }: { fuel: ReceiptsByFuel; isLoading?: boolean; onClick?: () => void }) {
  const diffPercent = fuel.docVolume > 0 ? (fuel.volumeDiff / fuel.docVolume) * 100 : 0;
  const isPositive = fuel.volumeDiff > 0;
  const isNegative = fuel.volumeDiff < 0;

  return (
    <div
      className="bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-700 cursor-pointer hover:border-slate-500 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        <div
          className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: fuel.color || '#3b82f6' }}
        />
        <span className="text-xs sm:text-sm font-medium text-white truncate">{fuel.fuelName}</span>
        <span className="text-[10px] sm:text-xs text-slate-500 ml-auto flex-shrink-0">{fuel.ttnCount} ТТН</span>
      </div>

      {isLoading ? (
        <div className="space-y-1.5 sm:space-y-2">
          <div className="h-5 sm:h-6 w-20 sm:w-24 bg-slate-700 rounded animate-pulse" />
          <div className="h-4 w-16 sm:w-20 bg-slate-700 rounded animate-pulse" />
        </div>
      ) : (
        <div className="space-y-1 sm:space-y-2">
          {/* По документу */}
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] sm:text-xs text-slate-500">DOC:</span>
            <div className="flex items-baseline gap-0.5 sm:gap-1">
              <span className="text-sm sm:text-lg font-bold text-white">{formatVolume(fuel.docVolume)}</span>
              <span className="text-[10px] sm:text-xs text-slate-400">л</span>
            </div>
          </div>

          {/* Фактически */}
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] sm:text-xs text-slate-500">FACT:</span>
            <div className="flex items-baseline gap-0.5 sm:gap-1">
              <span className="text-sm sm:text-lg text-blue-400">{formatVolume(fuel.factVolume)}</span>
              <span className="text-[10px] sm:text-xs text-slate-400">л</span>
            </div>
          </div>

          {/* Разница */}
          <div className="flex items-center justify-between pt-1.5 sm:pt-2 border-t border-slate-700">
            <span className="text-[10px] sm:text-xs text-slate-500">Разн:</span>
            <div className="flex items-center gap-0.5 sm:gap-1">
              {isPositive && <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-400" />}
              {isNegative && <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-400" />}
              {!isPositive && !isNegative && <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400" />}
              <span className={cn(
                'text-xs sm:text-sm font-medium',
                isPositive && 'text-green-400',
                isNegative && 'text-red-400',
                !isPositive && !isNegative && 'text-slate-400'
              )}>
                {isPositive && '+'}{formatVolume(fuel.volumeDiff)}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400">л</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Итоговая карточка поступлений
 */
function ReceiptsTotalCard({
  receipts,
  isLoading,
  onClick
}: {
  receipts: ReceiptsMetrics;
  isLoading?: boolean;
  onClick?: () => void;
}) {
  const diffPercent = receipts.totalDocVolume > 0
    ? (receipts.totalDiff / receipts.totalDocVolume) * 100
    : 0;
  const isPositive = receipts.totalDiff > 0;
  const isNegative = receipts.totalDiff < 0;

  return (
    <div
      className="bg-gradient-to-br from-emerald-900/50 to-slate-800 rounded-xl p-3 sm:p-4 border border-emerald-700/50 cursor-pointer hover:border-emerald-500/70 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
        <span className="text-xs sm:text-sm font-bold text-white">ИТОГО</span>
        <span className="text-[10px] sm:text-xs text-slate-500 ml-auto">{receipts.ttnCount} ТТН</span>
      </div>

      {isLoading ? (
        <div className="space-y-1.5 sm:space-y-2">
          <div className="h-6 sm:h-8 w-24 sm:w-32 bg-slate-700 rounded animate-pulse" />
          <div className="h-5 sm:h-6 w-20 sm:w-28 bg-slate-700 rounded animate-pulse" />
        </div>
      ) : (
        <div className="space-y-1 sm:space-y-2">
          {/* По документу */}
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] sm:text-xs text-slate-500">DOC:</span>
            <div className="flex items-baseline gap-0.5 sm:gap-1">
              <span className="text-base sm:text-xl font-bold text-white">{formatVolume(receipts.totalDocVolume)}</span>
              <span className="text-[10px] sm:text-sm text-slate-400">л</span>
            </div>
          </div>

          {/* Фактически */}
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] sm:text-xs text-slate-500">FACT:</span>
            <div className="flex items-baseline gap-0.5 sm:gap-1">
              <span className="text-base sm:text-xl text-emerald-400">{formatVolume(receipts.totalFactVolume)}</span>
              <span className="text-[10px] sm:text-sm text-slate-400">л</span>
            </div>
          </div>

          {/* Разница */}
          <div className="flex items-center justify-between pt-1.5 sm:pt-2 border-t border-emerald-700/50">
            <span className="text-[10px] sm:text-xs text-slate-500">Разн:</span>
            <div className="flex items-center gap-0.5 sm:gap-1">
              {isPositive && <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />}
              {isNegative && <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />}
              {!isPositive && !isNegative && <Minus className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />}
              <span className={cn(
                'text-xs sm:text-base font-bold',
                isPositive && 'text-green-400',
                isNegative && 'text-red-400',
                !isPositive && !isNegative && 'text-slate-400'
              )}>
                {isPositive && '+'}{formatVolume(receipts.totalDiff)}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400">л</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Сетка карточек поступлений
 */
export function ReceiptsKPIGrid({ receipts, isLoading, className }: ReceiptsKPIGridProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedFuelCode, setSelectedFuelCode] = useState<number | null>(null);

  // Защита от undefined
  const safeReceipts = receipts || { ttnCount: 0, totalDocVolume: 0, totalFactVolume: 0, totalDiff: 0, byFuel: [], details: [] };

  // Если нет поступлений
  if (!isLoading && safeReceipts.ttnCount === 0) {
    return (
      <div className={cn('', className)}>
        <h3 className="text-xs sm:text-sm font-medium text-slate-400 mb-2 sm:mb-3 uppercase tracking-wide">
          Поступления по ТТН
        </h3>
        <div className="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700 text-center">
          <Truck className="w-6 h-6 sm:w-8 sm:h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-xs sm:text-sm text-slate-500">Нет поступлений за выбранный период</p>
        </div>
      </div>
    );
  }

  // Клик на карточку топлива
  const handleFuelCardClick = (fuelCode: number) => {
    if (safeReceipts.details.length === 0) return;

    if (isExpanded && selectedFuelCode === fuelCode) {
      // Повторный клик - закрыть
      setIsExpanded(false);
      setSelectedFuelCode(null);
    } else {
      // Открыть с фильтром по этому топливу
      setSelectedFuelCode(fuelCode);
      setIsExpanded(true);
    }
  };

  // Клик на итоговую карточку - показать все
  const handleTotalCardClick = () => {
    if (safeReceipts.details.length === 0) return;

    if (isExpanded && selectedFuelCode === null) {
      setIsExpanded(false);
    } else {
      setSelectedFuelCode(null);
      setIsExpanded(true);
    }
  };

  // Сброс фильтра
  const handleResetFilter = () => {
    setSelectedFuelCode(null);
  };

  // Закрыть журнал
  const handleCloseJournal = () => {
    setIsExpanded(false);
    setSelectedFuelCode(null);
  };

  // Фильтрованные данные
  const filteredDetails = selectedFuelCode !== null
    ? safeReceipts.details.filter(item => item.fuelCode === selectedFuelCode)
    : safeReceipts.details;

  // Выбранное топливо для отображения
  const selectedFuel = selectedFuelCode !== null
    ? safeReceipts.byFuel.find(f => f.fuelCode === selectedFuelCode)
    : null;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Заголовок секции */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-medium text-slate-400 uppercase tracking-wide">
          Поступления по ТТН
          {selectedFuel && isExpanded && (
            <span className="ml-2 text-white">→ {selectedFuel.fuelName}</span>
          )}
        </h3>
        {isExpanded && (
          <button
            onClick={handleCloseJournal}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
          >
            <span className="hidden sm:inline">Скрыть журнал</span>
            <span className="sm:hidden">Скрыть</span>
            <ChevronUp className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Карточки */}
      {(!isExpanded || selectedFuelCode === null) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {/* Карточки по топливам */}
          {safeReceipts.byFuel.map((fuel) => (
            <ReceiptFuelCard
              key={fuel.fuelCode}
              fuel={fuel}
              isLoading={isLoading}
              onClick={() => handleFuelCardClick(fuel.fuelCode)}
            />
          ))}

          {/* Итого */}
          <ReceiptsTotalCard receipts={safeReceipts} isLoading={isLoading} onClick={handleTotalCardClick} />
        </div>
      )}

      {/* Выбранная карточка топлива */}
      {isExpanded && selectedFuelCode !== null && selectedFuel && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
          <div className="flex-shrink-0 w-full sm:w-64">
            <ReceiptFuelCard
              fuel={selectedFuel}
              isLoading={isLoading}
              onClick={() => handleFuelCardClick(selectedFuel.fuelCode)}
            />
          </div>
          <button
            onClick={handleResetFilter}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            <span className="hidden sm:inline">Показать все топлива</span>
            <span className="sm:hidden">Все топлива</span>
          </button>
        </div>
      )}

      {/* Таблица детализации по ТТН */}
      {isExpanded && filteredDetails.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-slate-400 uppercase">
                    Дата
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-slate-400 uppercase">
                    ТТН
                  </th>
                  {selectedFuelCode === null && (
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-slate-400 uppercase">
                      Топливо
                    </th>
                  )}
                  <th className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-medium text-slate-400 uppercase">
                    Резерв.
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-slate-400 uppercase">
                    DOC
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-slate-400 uppercase">
                    FACT
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-slate-400 uppercase">
                    <span className="hidden sm:inline">Разница</span>
                    <span className="sm:hidden">±</span>
                  </th>
                  <th className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-slate-400 uppercase">
                    Нефтебаза
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredDetails.map((item, idx) => {
                  const diffPercent = item.docVolume > 0 ? (item.volumeDiff / item.docVolume) * 100 : 0;
                  const isPositive = item.volumeDiff > 0;
                  const isNegative = item.volumeDiff < 0;

                  return (
                    <tr key={`${item.ttn}-${item.tankNumber}-${idx}`} className="hover:bg-slate-700/30">
                      <td className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-slate-300 whitespace-nowrap text-xs">
                        {formatDate(item.datetime)}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-white font-medium">
                        {item.ttn}
                      </td>
                      {selectedFuelCode === null && (
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.color || '#3b82f6' }}
                            />
                            <span className="text-slate-300 truncate max-w-[60px] sm:max-w-none">{item.fuelName}</span>
                          </div>
                        </td>
                      )}
                      <td className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3 text-center text-slate-400">
                        №{item.tankNumber}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-slate-300">
                        {formatVolume(item.docVolume)}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-blue-400">
                        {formatVolume(item.factVolume)}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                        <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                          <span className={cn(
                            'font-medium text-xs sm:text-sm',
                            isPositive && 'text-green-400',
                            isNegative && 'text-red-400',
                            !isPositive && !isNegative && 'text-slate-400'
                          )}>
                            {isPositive && '+'}{formatVolume(item.volumeDiff)}
                          </span>
                          <span className={cn(
                            'text-[10px] sm:text-xs hidden sm:inline',
                            isPositive && 'text-green-400',
                            isNegative && 'text-red-400',
                            !isPositive && !isNegative && 'text-slate-500'
                          )}>
                            ({diffPercent >= 0 ? '+' : ''}{diffPercent.toFixed(1)}%)
                          </span>
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 text-slate-400 max-w-[150px] truncate" title={item.baseName}>
                        {item.baseName || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-900/50 border-t border-slate-600">
                {(() => {
                  // Подсчет итогов для фильтрованных данных
                  const totalDoc = filteredDetails.reduce((sum, item) => sum + item.docVolume, 0);
                  const totalFact = filteredDetails.reduce((sum, item) => sum + item.factVolume, 0);
                  const totalDiff = filteredDetails.reduce((sum, item) => sum + item.volumeDiff, 0);
                  const ttnCount = filteredDetails.length;

                  return (
                    <tr>
                      <td colSpan={selectedFuelCode === null ? 2 : 1} className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold text-white">
                        <span className="hidden sm:inline">ИТОГО ({ttnCount} ТТН{selectedFuel ? ` - ${selectedFuel.fuelName}` : ''})</span>
                        <span className="sm:hidden">Σ {ttnCount}</span>
                      </td>
                      <td className="hidden sm:table-cell"></td>
                      <td className="hidden md:table-cell"></td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-bold text-white">
                        {formatVolume(totalDoc)}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-bold text-blue-400">
                        {formatVolume(totalFact)}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-bold">
                        <span className={cn(
                          totalDiff > 0 && 'text-green-400',
                          totalDiff < 0 && 'text-red-400',
                          totalDiff === 0 && 'text-slate-400'
                        )}>
                          {totalDiff > 0 && '+'}{formatVolume(totalDiff)}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell"></td>
                    </tr>
                  );
                })()}
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReceiptsKPIGrid;
