import React from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { PriceJournalEntry } from "../hooks/usePricesData";
import { formatPrice, getSourceColor, getSourceText } from "../hooks/usePricesData";

interface PriceScheduleDialogProps {
  isMobile: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  journalEntries: PriceJournalEntry[];
}

export function PriceScheduleDialog({
  isMobile,
  isOpen,
  onOpenChange,
  journalEntries,
}: PriceScheduleDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[95vh] overflow-y-auto' : 'max-w-6xl max-h-[85vh]'}`}>
        <DialogHeader className="pb-4 border-b border-border">
          <DialogTitle className="text-xl font-semibold text-foreground">
            Журнал изменения цен ({journalEntries.length} записей)
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            История всех изменений цен с указанием времени, источника и автора
          </DialogDescription>
        </DialogHeader>

        {/* Journal table */}
        <div className="overflow-auto max-h-[60vh]">
          {journalEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Журнал изменений пуст
            </div>
          ) : (
            <div className="w-full">
              <div className="overflow-x-auto w-full rounded-lg border border-border">
                <table className="w-full text-sm min-w-full table-fixed">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-4 py-3 text-left text-foreground font-medium" style={{width: '12%'}}>ВРЕМЯ</th>
                      <th className="px-4 py-3 text-left text-foreground font-medium" style={{width: '15%'}}>ТОПЛИВО</th>
                      <th className="px-4 py-3 text-left text-foreground font-medium" style={{width: '24%'}}>ЦЕНА</th>
                      <th className="px-4 py-3 text-left text-foreground font-medium" style={{width: '10%'}}>ИСТОЧНИК</th>
                      <th className="px-4 py-3 text-left text-foreground font-medium" style={{width: '12%'}}>СТАТУС</th>
                      <th className="px-4 py-3 text-left text-foreground font-medium" style={{width: '15%'}}>АВТОР</th>
                      <th className="px-4 py-3 text-left text-foreground font-medium" style={{width: '12%'}}>ПАКЕТ ID</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card">
                    {journalEntries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b border-border hover:bg-secondary transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="text-foreground font-mono text-xs">
                            {entry.timestamp}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-foreground text-sm">{entry.fuelType}</div>
                            <div className="text-xs text-muted-foreground">{entry.fuelCode}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3" colSpan={2}>
                          <div className="text-foreground font-medium text-center">
                            {formatPrice(entry.priceGross, entry.source !== 'sts-api')}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className={`text-xs ${getSourceColor(entry.source)}`}>
                            {getSourceText(entry.source)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className={`text-xs ${entry.status === 'applied' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-green-600 dark:text-green-400' : entry.status === 'scheduled' ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'}`}>
                            {entry.status === 'applied' ? 'Применено' : entry.status === 'scheduled' ? 'Запланировано' : 'Отменено'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-foreground text-sm">{entry.authorName}</div>
                        </td>
                        <td className="px-4 py-3">
                          <code className="bg-secondary text-foreground px-2 py-1 rounded text-xs">
                            {entry.packageId}
                          </code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Показано записей: {journalEntries.length}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
