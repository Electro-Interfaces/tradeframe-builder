import { MapPin, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface PointSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

const tradingPoints = [
  { value: "point1", label: "АЗС №001 - Центральная", status: "active" },
  { value: "point2", label: "АЗС №002 - Северная", status: "active" },
  { value: "point3", label: "АЗС №003 - Южная", status: "inactive" },
];

export function PointSelect({ value, onValueChange, className, disabled }: PointSelectProps) {
  const selectedPoint = tradingPoints.find(p => p.value === value);
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button 
          className={cn("sel", className, disabled && "opacity-50 cursor-not-allowed")}
          disabled={disabled}
        >
          <MapPin className="inline h-4 w-4 mr-2 opacity-70" />
          <span className="truncate">
            {selectedPoint?.label || (disabled ? "Сначала выберите сеть" : "Выберите торговую точку")}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <ul className="space-y-1">
          {tradingPoints.map((point) => (
            <li
              key={point.value}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-md cursor-pointer"
              onClick={() => onValueChange?.(point.value)}
            >
              <span 
                className={cn(
                  "h-2 w-2 rounded-full",
                  point.status === "active" ? "bg-emerald-400" : "bg-slate-500"
                )} 
                aria-hidden 
              />
              <span className="truncate">{point.label}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}