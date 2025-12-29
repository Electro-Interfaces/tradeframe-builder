/**
 * Модальное окно детализации KPI по сменам
 */

import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ShiftDetails } from '@/types/shift-reports-v2';

export type KPIDetailType =
  | 'fuel'           // По топливу
  | 'payment'        // По способу оплаты
  | 'receipt';       // Поступления

interface KPIDetailModalProps {
  /** Открыто ли окно */
  isOpen: boolean;
  /** Закрытие окна */
  onClose: () => void;
  /** Тип детализации */
  type: KPIDetailType;
  /** Название (топливо, способ оплаты) */
  title: string;
  /** Код (fuelCode, paymentType) */
  code: number | string;
  /** Цвет */
  color?: string;
  /** Смены для детализации */
  shifts: ShiftDetails[];
}

/**
 * Форматирует число
 */
const formatNumber = (value: number, decimals = 2): string => {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
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

type SortField = 'shiftNumber' | 'openedAt' | 'revenue' | 'volume' | 'stationName';
type SortDirection = 'asc' | 'desc';

/**
 * Данные по виду топлива
 */
interface FuelItem {
  fuelCode: number;
  fuelName: string;
  volume: number;
  revenue: number;
}

/**
 * Строка данных по смене
 */
interface ShiftRowData {
  shiftNumber: number;
  openedAt: string;
  closedAt: string | null;
  stationCode: number;
  stationName: string;
  revenue: number;
  volume: number;
  /** Разбивка по видам топлива */
  fuelBreakdown: FuelItem[];
}

export function KPIDetailModal({
  isOpen,
  onClose,
  type,
  title,
  code,
  color,
  shifts,
}: KPIDetailModalProps) {
  const [sortField, setSortField] = useState<SortField>('openedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Агрегируем данные по сменам в зависимости от типа
  const shiftData: ShiftRowData[] = shifts.map(shift => {
    let revenue = 0;
    let volume = 0;
    const fuelBreakdown: FuelItem[] = [];

    if (type === 'fuel') {
      // По топливу - ищем в fuelSales
      const fuelCode = Number(code);
      const fuelSale = shift.fuelSales?.find(f => f.fuelCode === fuelCode);
      if (fuelSale) {
        revenue = fuelSale.cost;
        volume = fuelSale.quantity;
        fuelBreakdown.push({
          fuelCode: fuelSale.fuelCode,
          fuelName: fuelSale.fuelName,
          volume: fuelSale.quantity,
          revenue: fuelSale.cost,
        });
      }
    } else if (type === 'payment') {
      // По способу оплаты - ищем в salesRaw
      const salesRaw = (shift as any).salesRaw || [];
      const paymentType = String(code);
      const fuelMap = new Map<number, FuelItem>();

      for (const sale of salesRaw) {
        const payTypeName = (sale.pay_type?.name || '').toLowerCase();
        let matched = false;

        if (paymentType === 'cash' && payTypeName.includes('наличн')) matched = true;
        if (paymentType === 'coupon' && payTypeName.includes('купон')) matched = true;
        if (paymentType === 'card' && (
          payTypeName.includes('карт') || payTypeName.includes('сбербанк') ||
          payTypeName.includes('сбп') || payTypeName.includes('эквайр')
        )) matched = true;
        if (paymentType === 'online' && (
          payTypeName.includes('мобил') || payTypeName.includes('онлайн')
        )) matched = true;
        if (paymentType === 'corporate' && (
          payTypeName === 'кр' || payTypeName.includes('корпоратив') ||
          payTypeName.includes('корп.карт') || payTypeName.includes('топливн')
        )) matched = true;

        if (matched && sale.fuel) {
          for (const fuel of sale.fuel) {
            // Купоны в API имеют отрицательные значения - берём абсолютное значение
            const rawCost = parseFloat(fuel.release?.cost || '0');
            const rawVolume = parseFloat(fuel.release?.volume || '0');
            const fuelCost = paymentType === 'coupon' ? Math.abs(rawCost) : rawCost;
            const fuelVolume = paymentType === 'coupon' ? Math.abs(rawVolume) : rawVolume;

            revenue += fuelCost;
            volume += fuelVolume;

            // Группируем по виду топлива
            const fuelCode = fuel.service?.service_code || 0;
            const fuelName = fuel.service?.service_name || 'Неизвестно';
            const existing = fuelMap.get(fuelCode);
            if (existing) {
              existing.volume += fuelVolume;
              existing.revenue += fuelCost;
            } else {
              fuelMap.set(fuelCode, {
                fuelCode,
                fuelName,
                volume: fuelVolume,
                revenue: fuelCost,
              });
            }
          }
        }
      }

      // Конвертируем Map в массив
      fuelBreakdown.push(...Array.from(fuelMap.values()));
    } else if (type === 'receipt') {
      // Поступления - ищем в receiptsRaw
      const receiptsRaw = (shift as any).receiptsRaw || [];
      const fuelCode = Number(code);

      for (const receipt of receiptsRaw) {
        if (receipt.service?.service_code === fuelCode) {
          const vol = parseFloat(receipt.fact?.volume || '0');
          volume += vol;
          fuelBreakdown.push({
            fuelCode,
            fuelName: receipt.service?.service_name || 'Неизвестно',
            volume: vol,
            revenue: 0,
          });
        }
      }
    }

    return {
      shiftNumber: shift.shiftNumber,
      openedAt: shift.openedAt,
      closedAt: shift.closedAt,
      stationCode: shift.stationCode || 0,
      stationName: shift.stationName || `Станция ${shift.stationCode}`,
      revenue,
      volume,
      fuelBreakdown,
    };
  }).filter(row => row.revenue > 0 || row.volume > 0);

  // Сортировка
  const sortedData = [...shiftData].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (sortField === 'openedAt') {
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

  // Итоги
  const totals = sortedData.reduce(
    (acc, row) => ({
      revenue: acc.revenue + row.revenue,
      volume: acc.volume + row.volume,
    }),
    { revenue: 0, volume: 0 }
  );

  // Показывать ли колонку "Выручка"
  // Для корп.карт, онлайн и купонов - только литры (отпуск топлива, не выручка в кассе)
  const showRevenue = type === 'fuel' ||
    (type === 'payment' && (code === 'cash' || code === 'card'));

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {color && (
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: color }}
              />
            )}
            {title} — детализация по сменам
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {sortedData.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              Нет данных для отображения
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50 sticky top-0">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase cursor-pointer hover:text-white"
                    onClick={() => handleSort('shiftNumber')}
                  >
                    <div className="flex items-center gap-1">
                      Смена <SortIcon field="shiftNumber" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase cursor-pointer hover:text-white"
                    onClick={() => handleSort('openedAt')}
                  >
                    <div className="flex items-center gap-1">
                      Дата открытия <SortIcon field="openedAt" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase cursor-pointer hover:text-white"
                    onClick={() => handleSort('stationName')}
                  >
                    <div className="flex items-center gap-1">
                      Станция <SortIcon field="stationName" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                    Топливо
                  </th>
                  {showRevenue && (
                    <th
                      className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase cursor-pointer hover:text-white"
                      onClick={() => handleSort('revenue')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Выручка (₽) <SortIcon field="revenue" />
                      </div>
                    </th>
                  )}
                  <th
                    className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase cursor-pointer hover:text-white"
                    onClick={() => handleSort('volume')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Объем (л) <SortIcon field="volume" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {sortedData.map((row, idx) => (
                  <tr key={`${row.shiftNumber}-${idx}`} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-white font-medium">
                      №{row.shiftNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {formatDate(row.openedAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {row.stationName}
                    </td>
                    <td className="px-4 py-3">
                      {row.fuelBreakdown.length > 0 ? (
                        <div className="space-y-1">
                          {row.fuelBreakdown.map((fuel, fIdx) => (
                            <div key={`${fuel.fuelCode}-${fIdx}`} className="flex items-center gap-2 text-xs flex-wrap">
                              <span className="text-slate-400">{fuel.fuelName}:</span>
                              <span className="text-blue-400">{formatNumber(fuel.volume)} л</span>
                              {showRevenue && fuel.revenue > 0 && (
                                <span className="text-slate-300">({formatNumber(fuel.revenue)} ₽)</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    {showRevenue && (
                      <td className="px-4 py-3 text-right text-slate-300">
                        {formatNumber(row.revenue)}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right text-blue-400 font-medium">
                      {formatNumber(row.volume)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900/50 border-t border-slate-600">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm font-bold text-white">
                    ИТОГО ({sortedData.length} смен)
                  </td>
                  <td></td>
                  {showRevenue && (
                    <td className="px-4 py-3 text-right text-sm font-bold text-white">
                      {formatNumber(totals.revenue)}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right text-sm font-bold text-blue-400">
                    {formatNumber(totals.volume)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KPIDetailModal;
