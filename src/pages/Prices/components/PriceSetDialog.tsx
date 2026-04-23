import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  CalendarIcon,
  Edit,
  RefreshCw,
} from "lucide-react";
import type { PriceForUpdate } from "../hooks/usePricesData";

interface PriceSetDialogProps {
  isMobile: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedNetwork: any;
  selectedTradingPoint: any;
  pricesForUpdate: PriceForUpdate[];
  setPricesForUpdate: React.Dispatch<React.SetStateAction<PriceForUpdate[]>>;
  effectiveDateTime: Date;
  setEffectiveDateTime: React.Dispatch<React.SetStateAction<Date>>;
  isSettingPrices: boolean;
  onConfirmSetPrices: () => void;
}

export function PriceSetDialog({
  isMobile,
  isOpen,
  onOpenChange,
  selectedNetwork,
  selectedTradingPoint,
  pricesForUpdate,
  setPricesForUpdate,
  effectiveDateTime,
  setEffectiveDateTime,
  isSettingPrices,
  onConfirmSetPrices,
}: PriceSetDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[90vh]' : 'max-w-4xl max-h-[90vh]'} bg-card border border-di-outline-variant/20 rounded-xl overflow-y-auto`}>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-headline font-bold text-foreground flex items-center gap-2.5 text-lg">
            <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-di-primary/10 flex items-center justify-center">
              <Edit className="w-4 h-4 text-primary dark:text-di-primary-light" />
            </div>
            Установка цен
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-di-on-surface-variant text-sm space-y-3">
              <p>
                Будут установлены новые цены для всех видов топлива на выбранной торговой точке.
              </p>
              <div className="bg-di-surface-high p-3 rounded-xl border border-di-outline-variant/10">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-di-on-surface-variant uppercase tracking-widest block mb-0.5">Сеть</span>
                    <span className="text-foreground text-sm font-medium">{selectedNetwork?.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-di-on-surface-variant uppercase tracking-widest block mb-0.5">Торговая точка</span>
                    <span className="text-foreground text-sm font-medium">{
                      typeof selectedTradingPoint === 'string' ? selectedTradingPoint : selectedTradingPoint?.name
                    }</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-di-on-surface-variant uppercase tracking-widest block mb-0.5">Позиций</span>
                    <span className="text-foreground text-sm font-medium">{pricesForUpdate.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-5 space-y-4">
          {/* Date and time picker */}
          <div>
            <Label className="text-[10px] font-bold text-di-on-surface-variant uppercase tracking-widest">Дата и время вступления в силу</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal mt-2 bg-di-surface-lowest border-di-outline-variant/20 text-foreground hover:bg-di-surface-high"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-di-on-surface-variant" />
                  {effectiveDateTime ? format(effectiveDateTime, "dd.MM.yyyy HH:mm", { locale: ru }) : "Выберите дату и время"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-di-outline-variant/20 rounded-xl" align="start">
                <Calendar
                  mode="single"
                  selected={effectiveDateTime}
                  onSelect={(date) => {
                    if (date) {
                      const newDateTime = new Date(date);
                      newDateTime.setHours(effectiveDateTime.getHours());
                      newDateTime.setMinutes(effectiveDateTime.getMinutes());
                      setEffectiveDateTime(newDateTime);
                    }
                  }}
                  disabled={(date) => date < new Date("1900-01-01")}
                  initialFocus
                />
                <div className="p-3 border-t border-di-outline-variant/10">
                  <Input
                    type="time"
                    value={format(effectiveDateTime, "HH:mm")}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(':');
                      const newDateTime = new Date(effectiveDateTime);
                      newDateTime.setHours(parseInt(hours), parseInt(minutes));
                      setEffectiveDateTime(newDateTime);
                    }}
                    className="bg-di-surface-lowest border-di-outline-variant/20 text-foreground"
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Prices list for update */}
          <div>
            <Label className="text-[10px] font-bold text-di-on-surface-variant uppercase tracking-widest">Цены для установки</Label>
            <div className="mt-2 space-y-2">
              {pricesForUpdate.map((priceItem, index) => (
                <div key={index} className="flex items-center gap-3 p-3.5 bg-di-surface-high rounded-xl border border-di-outline-variant/10">
                  <div className="flex-1 min-w-0">
                    <div className="text-foreground font-headline font-bold text-sm">{priceItem.fuel_type}</div>
                    <div className="text-xs text-di-on-surface-variant">
                      Текущая: {priceItem.currentPrice?.toFixed(2) || '—'} ₽
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceItem.price}
                      onChange={(e) => {
                        const newPrices = [...pricesForUpdate];
                        newPrices[index].price = parseFloat(e.target.value) || 0;
                        setPricesForUpdate(newPrices);
                      }}
                      className="w-32 bg-di-surface-lowest border-di-outline-variant/20 text-foreground text-right font-headline font-bold"
                    />
                    <span className="text-di-on-surface-variant text-sm">₽</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className="border-di-outline-variant/20 text-di-on-surface-variant hover:bg-di-surface-high">
            Отмена
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmSetPrices}
            disabled={isSettingPrices}
            className="bg-di-primary hover:opacity-90 text-white"
          >
            {isSettingPrices ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Установка...
              </>
            ) : (
              <>
                <Edit className="w-4 h-4 mr-2" />
                Установить цены
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
