import { useState } from "react";
import { MapPin, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { tradingPointsStore } from "@/mock/tradingPointsStore";

interface PointSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  networkId?: string;
}

export function PointSelect({ value, onValueChange, className, disabled, networkId }: PointSelectProps) {
  const [open, setOpen] = useState(false);
  const allTradingPoints = tradingPointsStore.getAll();
  const tradingPoints = networkId 
    ? tradingPointsStore.getByNetworkId(networkId)
    : allTradingPoints;
  
  const selectedPoint = tradingPoints.find(p => p.id === value);
  
  const handleSelect = (pointId: string) => {
    onValueChange?.(pointId);
    setOpen(false); // Закрываем селектор после выбора
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          className={cn("sel", className, disabled && "opacity-50 cursor-not-allowed")}
          disabled={disabled}
        >
          <MapPin className="inline h-4 w-4 mr-2 opacity-70" />
          <span className="truncate">
            {selectedPoint?.name || (disabled ? "Сначала выберите сеть" : "Выберите торговую точку")}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <ul className="space-y-1">
          {tradingPoints.map((point) => (
            <li
              key={point.id}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-md cursor-pointer"
              onClick={() => handleSelect(point.id)}
            >
              <span 
                className={cn(
                  "h-2 w-2 rounded-full",
                  !point.isBlocked ? "bg-emerald-400" : "bg-slate-500"
                )} 
                aria-hidden 
              />
              <span className="truncate">{point.name}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}