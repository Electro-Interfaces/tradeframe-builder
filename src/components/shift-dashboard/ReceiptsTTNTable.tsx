/**
 * Таблица поступлений по ТТН
 */

import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReceiptTTNItem } from '@/types/shift-dashboard';

interface ReceiptsTTNTableProps {
  /** Список поступлений */
  receipts: ReceiptTTNItem[];
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

type SortField = 'datetime' | 'ttn' | 'fuelName' | 'docVolume' | 'factVolume' | 'volumeDiff';
type SortDirection = 'asc' | 'desc';

/**
 * Таблица поступлений по ТТН
 */
export function ReceiptsTTNTable({ receipts, isLoading, className }: ReceiptsTTNTableProps) {
  const [sortField, setSortField] = useState<SortField>('datetime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expanded, setExpanded] = useState(true);

  // Сортировка
  const sortedReceipts = [...receipts].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (sortField === 'datetime') {
      aVal = new Date(aVal || 0).getTime();
      bVal = new Date(bVal || 0).getTime();
    }

    if (typeof aVal === 'string') {
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc'
      ? <ChevronUp className="w-3 h-3" />
      : <ChevronDown className="w-3 h-3" />;
  };

  // Если нет данных
  if (!isLoading && receipts.length === 0) {
    return null;
  }

  return (
    <div className={cn('bg-slate-800 rounded-xl border border-slate-700', className)}>
      {/* Заголовок */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-700/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-medium text-white">Детализация по ТТН</h3>
          <span className="text-xs text-slate-500">({receipts.length} записей)</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </div>

      {/* Таблица */}
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/50">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase cursor-pointer hover:text-white"
                  onClick={() => handleSort('datetime')}
                >
                  <div className="flex items-center gap-1">
                    Дата <SortIcon field="datetime" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase cursor-pointer hover:text-white"
                  onClick={() => handleSort('ttn')}
                >
                  <div className="flex items-center gap-1">
                    ТТН <SortIcon field="ttn" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase cursor-pointer hover:text-white"
                  onClick={() => handleSort('fuelName')}
                >
                  <div className="flex items-center gap-1">
                    Топливо <SortIcon field="fuelName" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                  Резервуар
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase cursor-pointer hover:text-white"
                  onClick={() => handleSort('docVolume')}
                >
                  <div className="flex items-center justify-end gap-1">
                    DOC (л) <SortIcon field="docVolume" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase cursor-pointer hover:text-white"
                  onClick={() => handleSort('factVolume')}
                >
                  <div className="flex items-center justify-end gap-1">
                    FACT (л) <SortIcon field="factVolume" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase cursor-pointer hover:text-white"
                  onClick={() => handleSort('volumeDiff')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Разница <SortIcon field="volumeDiff" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                  Нефтебаза
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                  Станция
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {isLoading ? (
                // Скелетон загрузки
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(9)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                sortedReceipts.map((receipt, idx) => {
                  const isPositive = receipt.volumeDiff > 0;
                  const isNegative = receipt.volumeDiff < 0;

                  return (
                    <tr key={`${receipt.ttn}-${idx}`} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                        {formatDate(receipt.datetime)}
                      </td>
                      <td className="px-4 py-3 text-white font-medium">
                        {receipt.ttn}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: receipt.color || '#3b82f6' }}
                          />
                          <span className="text-slate-300">{receipt.fuelName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        №{receipt.tankNumber}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        {formatVolume(receipt.docVolume)}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-400">
                        {formatVolume(receipt.factVolume)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isPositive && <TrendingUp className="w-3 h-3 text-green-400" />}
                          {isNegative && <TrendingDown className="w-3 h-3 text-red-400" />}
                          {!isPositive && !isNegative && <Minus className="w-3 h-3 text-slate-400" />}
                          <span className={cn(
                            'font-medium',
                            isPositive && 'text-green-400',
                            isNegative && 'text-red-400',
                            !isPositive && !isNegative && 'text-slate-400'
                          )}>
                            {isPositive && '+'}{formatVolume(receipt.volumeDiff)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {receipt.baseName}
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {receipt.stationName || `Станция ${receipt.stationCode}`}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ReceiptsTTNTable;
