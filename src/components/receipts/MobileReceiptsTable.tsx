/**
 * Мобильная таблица поступлений топлива
 * Оптимизирована для сенсорных экранов
 */

import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { FlatReceipt } from '@/types/receipts';
import { Fuel, MapPin, Hash, FileText, Calendar, Gauge } from 'lucide-react';

interface MobileReceiptsTableProps {
  receipts: FlatReceipt[];
  onReceiptClick: (receipt: FlatReceipt) => void;
}

export function MobileReceiptsTable({ receipts, onReceiptClick }: MobileReceiptsTableProps) {
  if (receipts.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Поступления не найдены</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {receipts.map((receipt) => (
        <Card
          key={receipt.id}
          className="bg-slate-800 border-slate-700 p-4 cursor-pointer hover:bg-slate-700/50 transition-colors active:scale-[0.98]"
          onClick={() => onReceiptClick(receipt)}
        >
          {/* Заголовок карточки */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Fuel className="h-4 w-4 text-blue-400" />
                <span className="font-medium text-white">{receipt.fuelType}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <MapPin className="h-3 w-3" />
                <span>{receipt.stationName}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-white">
                {receipt.volume.toLocaleString('ru-RU')} л
              </div>
              <div className="text-xs text-slate-400">
                {receipt.totalPrice.toLocaleString('ru-RU')} ₽
              </div>
            </div>
          </div>

          {/* Детали */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-slate-300">
              <Calendar className="h-3 w-3 text-slate-400" />
              <span className="truncate">
                {format(new Date(receipt.receiptDate), 'dd MMM yyyy', { locale: ru })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Hash className="h-3 w-3 text-slate-400" />
              <span className="truncate">Смена {receipt.shiftNumber}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300 col-span-2">
              <FileText className="h-3 w-3 text-slate-400" />
              <span className="truncate">ТТН: {receipt.ttn}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300 col-span-2">
              <Gauge className="h-3 w-3 text-slate-400" />
              <span className="truncate">{receipt.base.name}</span>
            </div>
          </div>

          {/* Резервуары */}
          {receipt.tanks.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <div className="flex flex-wrap gap-2">
                {receipt.tanks.map((tank, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-xs border-slate-600 text-slate-300"
                  >
                    Р{tank.number}: {tank.volume}л
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
