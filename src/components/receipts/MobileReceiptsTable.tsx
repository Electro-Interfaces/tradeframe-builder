/**
 * Мобильная таблица поступлений топлива
 * Оптимизирована для сенсорных экранов
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { FlatReceipt } from '@/types/receipts';
import type { ReceiptConfirmation } from '@/services/receiptConfirmationApiService';
import { Fuel, MapPin, Hash, FileText, Calendar, Gauge, Check, Pencil, XCircle } from 'lucide-react';

interface MobileReceiptsTableProps {
  receipts: FlatReceipt[];
  onReceiptClick: (receipt: FlatReceipt) => void;
  confirmations?: Map<string, ReceiptConfirmation>;
  getConfirmationKey?: (receipt: FlatReceipt) => string;
  onBulkConfirm?: (receipts: FlatReceipt[]) => Promise<void>;
}

const statusConfig = {
  confirmed: { label: 'Подтверждено', icon: Check, color: 'text-green-500' },
  corrected: { label: 'Скорректировано', icon: Pencil, color: 'text-amber-500' },
  rejected: { label: 'Отклонено', icon: XCircle, color: 'text-red-500' },
} as const;

export function MobileReceiptsTable({ receipts, onReceiptClick, confirmations, getConfirmationKey, onBulkConfirm }: MobileReceiptsTableProps) {
  const [bulkSaving, setBulkSaving] = useState(false);

  if (receipts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Поступления не найдены</p>
      </div>
    );
  }

  const unconfirmedReceipts = confirmations && getConfirmationKey
    ? receipts.filter(r => !confirmations.has(getConfirmationKey(r)))
    : [];

  const handleBulkConfirm = async () => {
    if (!onBulkConfirm || unconfirmedReceipts.length === 0) return;
    setBulkSaving(true);
    try {
      await onBulkConfirm(unconfirmedReceipts);
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Кнопка массового подтверждения */}
      {onBulkConfirm && unconfirmedReceipts.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Button
            size="sm"
            onClick={handleBulkConfirm}
            disabled={bulkSaving}
            className="bg-green-600 hover:bg-green-700 text-white text-xs flex-1"
          >
            <Check className="h-3 w-3 mr-1" />
            {bulkSaving ? 'Подтверждение...' : `Подтвердить все (${unconfirmedReceipts.length})`}
          </Button>
        </div>
      )}
      {receipts.map((receipt, index) => {
        const confKey = getConfirmationKey?.(receipt) || '';
        const conf = confirmations?.get(confKey);
        const Status = conf ? statusConfig[conf.status] : null;

        return (
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
                  {Status && (
                    <Status.icon className={`h-3.5 w-3.5 ${Status.color}`} />
                  )}
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

            {/* Резервуар + статус */}
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-xs border-border text-foreground/80"
              >
                Резервуар №{receipt.tank}
              </Badge>
              {Status && (
                <span className={`text-xs ${Status.color}`}>{Status.label}</span>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
