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
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Поступления не найдены</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {receipts.map((receipt, index) => (
        <Card
          key={`${receipt.ttn}-${receipt.tank}-${index}`}
          className="bg-card border-border p-4 cursor-pointer hover:bg-secondary/50 transition-colors active:scale-[0.98]"
          onClick={() => onReceiptClick(receipt)}
        >
          {/* Заголовок карточки */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Fuel className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-foreground">{receipt.service.service_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>ТТ №{receipt.stationNumber}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-foreground">
                {receipt.doc?.volume ? parseFloat(receipt.doc.volume).toLocaleString('ru-RU', { maximumFractionDigits: 2 }) : '0'} л
              </div>
              <div className="text-xs text-muted-foreground">
                {receipt.doc?.amount ? parseFloat(receipt.doc.amount).toLocaleString('ru-RU', { maximumFractionDigits: 2 }) : '0'} кг
              </div>
            </div>
          </div>

          {/* Детали */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-foreground/80">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">
                {format(new Date(receipt.dt), 'dd MMM yyyy', { locale: ru })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-foreground/80">
              <Hash className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">Смена {receipt.shiftNumber}</span>
            </div>
            <div className="flex items-center gap-2 text-foreground/80 col-span-2">
              <FileText className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">ТТН: {receipt.ttn}</span>
            </div>
            <div className="flex items-center gap-2 text-foreground/80 col-span-2">
              <Gauge className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{receipt.base.name}</span>
            </div>
          </div>

          {/* Резервуар */}
          <div className="mt-3 pt-3 border-t border-border">
            <Badge
              variant="outline"
              className="text-xs border-border text-foreground/80"
            >
              Резервуар №{receipt.tank}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
