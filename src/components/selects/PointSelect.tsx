import { useState, useEffect } from "react";
import { MapPin, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { tradingPointsService } from "@/services/tradingPointsService";
import { TradingPoint } from "@/types/tradingpoint";

interface PointSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  networkId?: string;
}

export function PointSelect({ value, onValueChange, className, disabled, networkId }: PointSelectProps) {
  const [open, setOpen] = useState(false);
  const [tradingPoints, setTradingPoints] = useState<TradingPoint[]>([]);
  const selectedPoint = tradingPoints.find(p => p.id === value);
  
  useEffect(() => {
    const loadTradingPoints = async () => {
      try {
        let data;
        if (networkId) {
          data = await tradingPointsService.getByNetworkId(networkId);
        } else {
          data = await tradingPointsService.getAll();
        }
        setTradingPoints(data);
      } catch (error) {
        console.error('Error loading trading points:', error);
        setTradingPoints([]);
      }
    };

    loadTradingPoints();
  }, [networkId]);
  
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };
  
  const handleSelect = (pointId: string) => {
    onValueChange?.(pointId);
    setOpen(false); // Закрываем селектор после выбора
  };
  
  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button 
          className={cn("sel", className, disabled && "opacity-50 cursor-not-allowed")}
          disabled={disabled}
        >
          <MapPin className="inline h-4 w-4 mr-2 opacity-70" />
          <span className="truncate">
            {value === "all" 
              ? "Все торговые точки" 
              : selectedPoint?.name || (disabled ? "Сначала выберите сеть" : "Выберите торговую точку")
            }
          </span>
          <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <ul className="space-y-1">
          {/* Опция "Все" */}
          <li
            key="all"
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-md cursor-pointer border-b border-slate-700 mb-1"
            onClick={() => handleSelect("all")}
          >
            <span 
              className="h-2 w-2 rounded-full bg-blue-400" 
              aria-hidden 
            />
            <span className="truncate font-medium">Все торговые точки</span>
          </li>
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
              <div className="min-w-0 flex-1">
                <span className="truncate block">{point.name}</span>
                {point.external_id && (
                  <span className="text-xs text-blue-400 font-mono">ID: {point.external_id}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}