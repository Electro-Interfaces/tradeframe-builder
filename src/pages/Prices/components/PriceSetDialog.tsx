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
      <AlertDialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[90vh]' : 'max-w-4xl max-h-[90vh]'} bg-background border-border overflow-y-auto`}>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Edit className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            Установка цен
          </AlertDialogTitle>
          <AlertDialogDescription className="text-foreground/80 text-base">
            <div className="space-y-3">
              <p>
                <strong>Внимание!</strong> Будут установлены новые цены для всех видов топлива на выбранной торговой точке.
              </p>
              <div className="bg-card p-3 rounded-lg border border-border">
                <p className="text-sm"><strong>Сеть:</strong> {selectedNetwork?.name} (ID: {selectedNetwork?.external_id})</p>
                <p className="text-sm"><strong>Торговая точка:</strong> {
                  typeof selectedTradingPoint === 'string' ? selectedTradingPoint : selectedTradingPoint?.name
                }</p>
                <p className="text-sm"><strong>Количество цен:</strong> {pricesForUpdate.length}</p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-6 space-y-4">
          {/* Date and time picker */}
          <div>
            <Label className="text-foreground font-medium">Дата и время вступления в силу</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal mt-2 bg-card border-border text-foreground hover:bg-secondary"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {effectiveDateTime ? format(effectiveDateTime, "dd.MM.yyyy HH:mm", { locale: ru }) : "Выберите дату и время"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
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
                  className="bg-card"
                />
                <div className="p-3 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      type="time"
                      value={format(effectiveDateTime, "HH:mm")}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(':');
                        const newDateTime = new Date(effectiveDateTime);
                        newDateTime.setHours(parseInt(hours), parseInt(minutes));
                        setEffectiveDateTime(newDateTime);
                      }}
                      className="bg-secondary border-border text-foreground"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Prices list for update */}
          <div>
            <Label className="text-foreground font-medium">Цены для установки</Label>
            <div className="mt-2 space-y-2">
              {pricesForUpdate.map((priceItem, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border">
                  <div className="flex-1">
                    <div className="text-foreground font-medium">{priceItem.fuel_type}</div>
                    <div className="text-sm text-muted-foreground">
                      Текущая: {priceItem.currentPrice?.toFixed(2) || '\u2014'} \u20BD
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
                      className="w-40 bg-secondary border-border text-foreground text-right pr-6"
                    />
                    <span className="text-muted-foreground text-sm">\u20BD</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className="bg-secondary border-border text-foreground hover:bg-secondary">
            Отмена
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmSetPrices}
            disabled={isSettingPrices}
            className="bg-orange-600 hover:bg-orange-700 text-white"
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
