/**
 * Мобильная таблица операций — Deep Intel стиль
 * Карточки с border-l-4, крупная сумма, статус-badge, иконки топлива/оплаты
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Fuel, CreditCard, Banknote, Globe, Clock } from "lucide-react";
import { normalizePaymentMethod } from "@/utils/paymentUtils";

interface MobileOperationsTableProps {
  operations: any[];
  onOperationClick: (operation: any) => void;
  isDetailsOpen: boolean;
  selectedOperation: any;
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'completed':
      return { label: 'ВЫПОЛНЕНО', color: 'text-[#4ade80]', bg: 'bg-[#4ade80]/10', border: 'border-l-[#4ade80]' };
    case 'in_progress':
    case 'processing':
      return { label: 'В ОБРАБОТКЕ', color: 'text-[#fbbf24]', bg: 'bg-[#fbbf24]/10', border: 'border-l-[#fbbf24]' };
    case 'failed':
    case 'error':
      return { label: 'ОТКАЗ', color: 'text-[#f87171]', bg: 'bg-[#f87171]/10', border: 'border-l-[#f87171]' };
    default:
      return { label: status || '—', color: 'text-di-on-surface-variant', bg: 'bg-di-surface-high', border: 'border-l-di-primary-light' };
  }
}

function getPaymentIcon(method: string) {
  const normalized = normalizePaymentMethod(method);
  if (normalized.includes('Наличн')) return <Banknote className="w-4 h-4 text-di-on-surface-variant" />;
  if (normalized.includes('Онлайн') || normalized.includes('online')) return <Globe className="w-4 h-4 text-di-on-surface-variant" />;
  return <CreditCard className="w-4 h-4 text-di-on-surface-variant" />;
}

const MobileOperationsTable = React.memo(({ operations, onOperationClick, isDetailsOpen, selectedOperation }: MobileOperationsTableProps) => {
  return (
    <div className="space-y-3">
      {operations.map(op => {
        const status = getStatusConfig(op.status);
        const isFailed = op.status === 'failed' || op.status === 'error';
        const time = op.startTime ? new Date(op.startTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—';

        return (
          <div
            key={op.id}
            onClick={() => onOperationClick(op)}
            className={`bg-card rounded-xl p-4 border-l-4 ${status.border} relative overflow-hidden cursor-pointer transition-all duration-200 active:scale-[0.98] ${isFailed ? 'opacity-70' : ''}`}
          >
            {/* Header: ID + Status + Time */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mb-1">
                  {op.transactionId ? `#${op.transactionId}` : `ID: ${String(op.id).slice(0, 8)}`}
                </p>
                <h4 className={`font-headline text-2xl font-extrabold tracking-tight ${isFailed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                  {(op.totalCost || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
                </h4>
              </div>
              <div className="flex flex-col items-end">
                <span className={`text-[10px] font-bold ${status.color} ${status.bg} px-2 py-0.5 rounded uppercase`}>
                  {status.label}
                </span>
                <span className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {time}
                </span>
              </div>
            </div>

            {/* Footer: Fuel + Payment */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Fuel className="w-4 h-4 text-primary dark:text-di-primary-light" />
                <span className="text-sm font-medium text-foreground">
                  {op.fuelType || '—'} ({(op.quantity || 0).toFixed(1)} л)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {getPaymentIcon(op.paymentMethod)}
                <span className="text-sm font-medium text-foreground">
                  {normalizePaymentMethod(op.paymentMethod)}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={() => {}}>
        <DialogContent className="bg-card border border-di-outline-variant/20 text-foreground max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="font-headline font-bold text-foreground">Детали операции</DialogTitle>
          </DialogHeader>
          {selectedOperation && (() => {
            const st = getStatusConfig(selectedOperation.status);
            return (
              <div className="space-y-4">
                {/* Summary */}
                <div className="flex items-center justify-between">
                  <span className="font-headline text-2xl font-extrabold text-foreground">
                    {(selectedOperation.totalCost || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                  </span>
                  <span className={`text-xs font-bold ${st.color} ${st.bg} px-2 py-1 rounded uppercase`}>
                    {st.label}
                  </span>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">ID</span>
                    <div className="font-mono text-foreground text-xs break-all mt-0.5">{selectedOperation.transactionId || selectedOperation.id}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Время</span>
                    <div className="text-foreground text-xs mt-0.5">
                      {selectedOperation.startTime ? new Date(selectedOperation.startTime).toLocaleString('ru-RU') : '—'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Топливо</span>
                    <div className="text-foreground text-xs mt-0.5">{selectedOperation.fuelType || '—'}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Объём</span>
                    <div className="text-foreground text-xs mt-0.5">{(selectedOperation.quantity || 0).toFixed(2)} л</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Цена</span>
                    <div className="text-foreground text-xs mt-0.5">{(selectedOperation.price || 0).toFixed(2)} ₽/л</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Оплата</span>
                    <div className="text-foreground text-xs mt-0.5">{normalizePaymentMethod(selectedOperation.paymentMethod)}</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
});

MobileOperationsTable.displayName = 'MobileOperationsTable';

export default MobileOperationsTable;
