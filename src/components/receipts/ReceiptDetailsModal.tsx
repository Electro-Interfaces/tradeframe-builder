/**
 * Модальное окно с деталями поступления топлива
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import type { FlatReceipt } from '@/types/receipts';

interface ReceiptDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: FlatReceipt | null;
}

export const ReceiptDetailsModal: React.FC<ReceiptDetailsModalProps> = ({
  isOpen,
  onClose,
  receipt,
}) => {
  const isMobile = useIsMobile();

  if (!receipt) return null;

  // Получение цвета индикатора отклонения
  const getDeviationColor = (percent: number) => {
    const absPercent = Math.abs(percent);
    if (absPercent < 1) return 'text-green-600 bg-emerald-50';
    if (absPercent < 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getDeviationBadgeVariant = (percent: number): "default" | "secondary" | "destructive" => {
    const absPercent = Math.abs(percent);
    if (absPercent < 1) return 'default';
    if (absPercent < 3) return 'secondary';
    return 'destructive';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "bg-card text-foreground border-border",
        isMobile ? "max-w-[95vw] max-h-[90vh] p-3" : "max-w-2xl max-h-[80vh] p-4"
      )}>
        <DialogHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-foreground mb-1">
                Детали поступления
              </DialogTitle>
              <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                <span>ТТН: <span className="text-foreground font-mono">{receipt.ttn}</span></span>
                <span>•</span>
                <span>Смена: <span className="text-foreground">{receipt.shiftNumber}</span></span>
                <span>•</span>
                <span>ТТ: <span className="text-foreground">{receipt.stationNumber}</span></span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto pr-2" style={{ maxHeight: isMobile ? '60vh' : '55vh' }}>
          {/* Основная информация */}
          <div className="bg-background rounded-lg p-3 border border-border">
            <h3 className="text-xs font-semibold text-foreground/80 mb-2">Основная информация</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground mb-0.5">Дата и время</div>
                <div className="text-foreground">
                  {format(new Date(receipt.dt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-0.5">Вид топлива</div>
                <div>
                  <Badge variant="outline" className="bg-card text-foreground border-border text-xs">
                    {receipt.service.service_name}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-0.5">Резервуар</div>
                <div className="text-foreground">Резервуар {receipt.tank}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-0.5">Нефтебаза</div>
                <div className="text-foreground">
                  {receipt.base.name || `База ${receipt.base.id}`}
                </div>
              </div>
            </div>
          </div>

          {/* Сравнительная таблица */}
          <div className="bg-background rounded-lg p-3 border border-border">
            <h3 className="text-xs font-semibold text-foreground/80 mb-2">Данные поступления</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1.5 text-muted-foreground font-medium">Параметр</th>
                    <th className="text-right py-1.5 text-muted-foreground font-medium">Документ</th>
                    <th className="text-right py-1.5 text-muted-foreground font-medium">Факт</th>
                    <th className="text-right py-1.5 text-muted-foreground font-medium">Разница</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-1.5 text-foreground/80">Объем (л)</td>
                    <td className="text-right py-1.5 font-mono text-foreground">{parseFloat(receipt.doc.volume).toFixed(2)}</td>
                    <td className="text-right py-1.5 font-mono text-foreground">{parseFloat(receipt.fact.volume).toFixed(2)}</td>
                    <td className={cn('text-right py-1.5 font-mono', receipt.volumeDiff > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                      {receipt.volumeDiff > 0 ? '+' : ''}{receipt.volumeDiff.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-1.5 text-foreground/80">Масса (кг)</td>
                    <td className="text-right py-1.5 font-mono text-foreground">{parseFloat(receipt.doc.amount).toFixed(2)}</td>
                    <td className="text-right py-1.5 font-mono text-foreground">{parseFloat(receipt.fact.amount).toFixed(2)}</td>
                    <td className={cn('text-right py-1.5 font-mono', receipt.amountDiff > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                      {receipt.amountDiff > 0 ? '+' : ''}{receipt.amountDiff.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-1.5 text-foreground/80">Плотность</td>
                    <td className="text-right py-1.5 font-mono text-foreground">{receipt.doc.density.toFixed(3)}</td>
                    <td className="text-right py-1.5 font-mono text-foreground">{receipt.fact.density.toFixed(3)}</td>
                    <td className={cn('text-right py-1.5 font-mono', (receipt.fact.density - receipt.doc.density) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                      {(receipt.fact.density - receipt.doc.density) > 0 ? '+' : ''}
                      {(receipt.fact.density - receipt.doc.density).toFixed(3)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-foreground/80">Температура (°C)</td>
                    <td className="text-right py-1.5 font-mono text-foreground">{receipt.doc.temp}</td>
                    <td className="text-right py-1.5 font-mono text-foreground">{receipt.fact.temp}</td>
                    <td className={cn('text-right py-1.5 font-mono', (receipt.fact.temp - receipt.doc.temp) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                      {(receipt.fact.temp - receipt.doc.temp) > 0 ? '+' : ''}
                      {receipt.fact.temp - receipt.doc.temp}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Отклонения в процентах */}
          <div className="bg-background rounded-lg p-3 border border-border">
            <h3 className="text-xs font-semibold text-foreground/80 mb-2">Отклонения</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between p-2 bg-card rounded">
                <div className="text-xs text-muted-foreground">По объему</div>
                <Badge variant={getDeviationBadgeVariant(receipt.volumeDiffPercent)} className="text-xs">
                  {receipt.volumeDiffPercent > 0 ? '+' : ''}
                  {receipt.volumeDiffPercent.toFixed(2)}%
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-card rounded">
                <div className="text-xs text-muted-foreground">По массе</div>
                <Badge variant={getDeviationBadgeVariant(receipt.amountDiffPercent)} className="text-xs">
                  {receipt.amountDiffPercent > 0 ? '+' : ''}
                  {receipt.amountDiffPercent.toFixed(2)}%
                </Badge>
              </div>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};
