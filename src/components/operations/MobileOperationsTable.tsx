import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Fuel, CreditCard, Calendar } from "lucide-react";
import { normalizePaymentMethod } from "@/utils/paymentUtils";

interface MobileOperationsTableProps {
  operations: any[];
  onOperationClick: (operation: any) => void;
  isDetailsOpen: boolean;
  selectedOperation: any;
}

const MobileOperationsTable = React.memo(({ operations, onOperationClick, isDetailsOpen, selectedOperation }: MobileOperationsTableProps) => {

  return (
    <div>
      <div className="bg-slate-800 overflow-hidden">
        {operations.map(op => (
          <Card key={op.id} className="mb-3 bg-slate-700 border-slate-600 cursor-pointer hover:bg-slate-650 transition-colors"
                onClick={() => onOperationClick(op)}>
            <CardContent className="p-3">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <span className="font-semibold text-white text-sm truncate">
                    {op.fuelType || '-'}
                  </span>
                </div>
                <Badge variant={op.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                  {op.status === 'completed' ? 'Завершено' : 'В процессе'}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                <div>
                  <span className="text-slate-400">Объем:</span>
                  <div className="font-semibold text-white">{(op.quantity || 0).toFixed(1)} л</div>
                </div>
                <div>
                  <span className="text-slate-400">Сумма:</span>
                  <div className="font-semibold text-green-400">
                    {(op.totalCost || 0).toFixed(0)} ₽
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Цена:</span>
                  <div className="font-semibold text-blue-400">
                    {(op.price || 0).toFixed(1)} ₽/л
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1 text-xs text-slate-300">
                  <CreditCard className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{normalizePaymentMethod(op.paymentMethod)}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Calendar className="w-3 h-3 flex-shrink-0" />
                  <span>
                    {op.startTime ? new Date(op.startTime).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : '-'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Modal for operation details */}
        <Dialog open={isDetailsOpen} onOpenChange={() => {}}>
          <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-slate-200">Детали операции</DialogTitle>
            </DialogHeader>
            {selectedOperation && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-400">ID:</span>
                    <div className="font-mono text-slate-200 break-all">{selectedOperation.id}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Статус:</span>
                    <div className="text-white">{selectedOperation.status === 'completed' ? 'Завершено' : 'В процессе'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Топливо:</span>
                    <div className="text-white">{selectedOperation.fuelType || '-'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Объем:</span>
                    <div className="text-white">{(selectedOperation.quantity || 0).toFixed(2)} л</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Цена:</span>
                    <div className="text-white">{(selectedOperation.price || 0).toFixed(2)} ₽/л</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Сумма:</span>
                    <div className="text-white">{(selectedOperation.totalCost || 0).toFixed(2)} ₽</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Способ оплаты:</span>
                    <div className="text-white">{normalizePaymentMethod(selectedOperation.paymentMethod)}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Время:</span>
                    <div className="text-white">
                      {selectedOperation.startTime ? new Date(selectedOperation.startTime).toLocaleString('ru-RU') : '-'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
});

MobileOperationsTable.displayName = 'MobileOperationsTable';

export default MobileOperationsTable;