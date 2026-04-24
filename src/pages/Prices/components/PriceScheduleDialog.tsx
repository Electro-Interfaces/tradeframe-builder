import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Fuel, Clock } from "lucide-react";
import type { PriceJournalEntry } from "../hooks/usePricesData";
import { formatPrice, getSourceColor, getSourceText } from "../hooks/usePricesData";

function getStatusConfig(status: string) {
  switch (status) {
    case 'applied':
      return { label: 'ПРИМЕНЕНО', color: 'text-[#4ade80]', bg: 'bg-[#4ade80]/10' };
    case 'scheduled':
      return { label: 'ЗАПЛАНИРОВАНО', color: 'text-[#fbbf24]', bg: 'bg-[#fbbf24]/10' };
    default:
      return { label: 'ОТМЕНЕНО', color: 'text-[#f87171]', bg: 'bg-[#f87171]/10' };
  }
}

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
      <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[95vh] overflow-y-auto' : 'max-w-6xl max-h-[85vh]'} bg-card border border-di-outline-variant/20 rounded-xl`}>
        <DialogHeader className="pb-4 border-b border-di-outline-variant/10">
          <DialogTitle className="font-headline font-bold text-foreground flex items-center gap-2">
            Журнал изменения цен
            {journalEntries.length > 0 && (
              <span className="text-[10px] font-bold text-di-on-surface-variant bg-di-surface-high px-2 py-0.5 rounded-full">
                {journalEntries.length}
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-di-on-surface-variant text-sm">
            История всех изменений цен с указанием времени, источника и автора
          </DialogDescription>
        </DialogHeader>

        {/* Journal content */}
        <div className="overflow-auto max-h-[60vh]">
          {journalEntries.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-xl bg-di-surface-high flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-di-on-surface-variant" />
              </div>
              <p className="text-foreground font-headline font-bold text-base mb-1">Журнал пуст</p>
              <p className="text-di-on-surface-variant text-sm">Изменений цен пока не было</p>
            </div>
          ) : isMobile ? (
            /* Мобильные карточки */
            <div className="space-y-2.5">
              {journalEntries.map((entry) => {
                const st = getStatusConfig(entry.status);
                return (
                  <div key={entry.id} className="bg-di-surface-high rounded-xl p-3.5 border border-di-outline-variant/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Fuel className="w-3.5 h-3.5 text-primary dark:text-di-primary-light" />
                        <span className="text-foreground font-headline font-bold text-sm">{entry.fuelType}</span>
                        <span className="text-[9px] text-di-on-surface-variant">{entry.fuelCode}</span>
                      </div>
                      <span className={`text-[10px] font-bold ${st.color} ${st.bg} px-2 py-0.5 rounded uppercase`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-headline font-extrabold text-foreground text-lg">
                        {formatPrice(entry.priceGross, entry.source !== 'sts-api')} <span className="text-xs font-bold text-muted-foreground">₽</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {entry.timestamp}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-di-outline-variant/10">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getSourceColor(entry.source)}`}>
                        {getSourceText(entry.source)}
                      </span>
                      <span className="text-xs text-di-on-surface-variant">{entry.authorName}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Десктоп таблица */
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-0.5">
                <thead>
                  <tr>
                    <th className="text-left py-2 px-4 text-[10px] font-bold text-di-on-surface-variant tracking-widest uppercase">Время</th>
                    <th className="text-left py-2 px-4 text-[10px] font-bold text-di-on-surface-variant tracking-widest uppercase">Топливо</th>
                    <th className="text-right py-2 px-4 text-[10px] font-bold text-di-on-surface-variant tracking-widest uppercase">Цена</th>
                    <th className="text-center py-2 px-4 text-[10px] font-bold text-di-on-surface-variant tracking-widest uppercase">Источник</th>
                    <th className="text-center py-2 px-4 text-[10px] font-bold text-di-on-surface-variant tracking-widest uppercase">Статус</th>
                    <th className="text-left py-2 px-4 text-[10px] font-bold text-di-on-surface-variant tracking-widest uppercase">Автор</th>
                    <th className="text-left py-2 px-4 text-[10px] font-bold text-di-on-surface-variant tracking-widest uppercase">Пакет</th>
                  </tr>
                </thead>
                <tbody>
                  {journalEntries.map((entry) => {
                    const st = getStatusConfig(entry.status);
                    return (
                      <tr
                        key={entry.id}
                        className="bg-di-surface-high hover:bg-di-surface-highest transition-colors duration-200"
                      >
                        <td className="py-3 px-4 first:rounded-l-lg">
                          <span className="text-di-on-surface-variant font-mono text-xs">{entry.timestamp}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Fuel className="w-4 h-4 text-primary dark:text-di-primary-light" />
                            <div>
                              <span className="text-foreground font-medium text-sm">{entry.fuelType}</span>
                              <span className="text-[10px] text-di-on-surface-variant ml-1.5">{entry.fuelCode}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-foreground font-headline font-extrabold text-base">
                            {formatPrice(entry.priceGross, entry.source !== 'sts-api')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getSourceColor(entry.source)}`}>
                            {getSourceText(entry.source)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`text-[10px] font-bold ${st.color} ${st.bg} px-2.5 py-1 rounded uppercase`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-foreground text-sm">{entry.authorName}</span>
                        </td>
                        <td className="py-3 px-4 last:rounded-r-lg">
                          <code className="text-di-on-surface-variant bg-di-surface-mid px-2 py-0.5 rounded text-[10px] font-mono">
                            {entry.packageId}
                          </code>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        {journalEntries.length > 0 && (
          <div className="flex items-center justify-center pt-3 border-t border-di-outline-variant/10">
            <span className="text-xs text-di-on-surface-variant">
              Показано записей: {journalEntries.length}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
