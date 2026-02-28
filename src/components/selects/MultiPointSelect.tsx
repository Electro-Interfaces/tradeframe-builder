/**
 * Компонент мультивыбора торговых точек
 * Используется для назначения доступа к конкретным ТТ в ролях
 */

import { useState, useEffect } from "react";
import { MapPin, ChevronDown, X, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { tradingPointsService } from "@/services/tradingPointsService";
import { TradingPoint } from "@/types/tradingpoint";
import { useQuery } from "@tanstack/react-query";

interface MultiPointSelectProps {
  value: string[];
  onValueChange: (values: string[]) => void;
  className?: string;
  disabled?: boolean;
  networkId?: string;
  placeholder?: string;
}

export function MultiPointSelect({
  value = [],
  onValueChange,
  className,
  disabled,
  networkId,
  placeholder = "Выберите торговые точки"
}: MultiPointSelectProps) {
  const [open, setOpen] = useState(false);

  const { data: tradingPoints = [], isLoading } = useQuery({
    queryKey: ['tradingPoints', networkId || 'all'],
    queryFn: async () => {
      let points: TradingPoint[];
      if (networkId) {
        points = await tradingPointsService.getByNetworkId(networkId);
      } else {
        points = await tradingPointsService.getAll();
      }
      return points
        .filter(p => !p.isBlocked)
        .sort((a, b) => {
          const numA = parseInt(a.external_id || '999999', 10);
          const numB = parseInt(b.external_id || '999999', 10);
          return numA - numB;
        });
    },
    enabled: !disabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const selectedPoints = tradingPoints.filter(p => value.includes(p.id));

  const handleToggle = (pointId: string) => {
    if (value.includes(pointId)) {
      onValueChange(value.filter(id => id !== pointId));
    } else {
      onValueChange([...value, pointId]);
    }
  };

  const handleSelectAll = () => {
    if (value.length === tradingPoints.length) {
      onValueChange([]);
    } else {
      onValueChange(tradingPoints.map(p => p.id));
    }
  };

  const handleClear = () => {
    onValueChange([]);
  };

  const handleRemove = (pointId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange(value.filter(id => id !== pointId));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center justify-between w-full px-3 py-2 text-sm bg-card border border-border text-foreground rounded-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[42px]",
            disabled && "opacity-50 cursor-not-allowed hover:bg-card",
            className
          )}
          disabled={disabled}
          type="button"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MapPin className="h-4 w-4 opacity-70 shrink-0" />
            {selectedPoints.length === 0 ? (
              <span className="text-muted-foreground truncate">{placeholder}</span>
            ) : selectedPoints.length <= 2 ? (
              <div className="flex flex-wrap gap-1">
                {selectedPoints.map(point => (
                  <Badge
                    key={point.id}
                    variant="secondary"
                    className="text-xs bg-blue-600/30 text-blue-600 dark:text-blue-300 border border-blue-500/30"
                  >
                    {point.name}
                    <X
                      className="ml-1 h-3 w-3 cursor-pointer hover:text-red-400"
                      onClick={(e) => handleRemove(point.id, e)}
                    />
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-blue-600 dark:text-blue-300">
                Выбрано: {selectedPoints.length} из {tradingPoints.length}
              </span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 opacity-70 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto min-w-[320px] max-w-md p-0 bg-card border-border"
        align="start"
      >
        {/* Header с кнопками */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-sm text-foreground/80">
            {isLoading ? "Загрузка..." : `Торговые точки (${tradingPoints.length})`}
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleSelectAll}
              type="button"
            >
              {value.length === tradingPoints.length ? "Снять все" : "Выбрать все"}
            </Button>
            {value.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-red-600 dark:text-red-400 hover:text-red-300"
                onClick={handleClear}
                type="button"
              >
                Очистить
              </Button>
            )}
          </div>
        </div>

        {/* Список точек */}
        <div className="max-h-[300px] overflow-y-auto p-2">
          {tradingPoints.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              {networkId ? "Нет торговых точек в выбранной сети" : "Сначала выберите сеть"}
            </div>
          ) : (
            <ul className="space-y-1">
              {tradingPoints.map((point) => {
                const isSelected = value.includes(point.id);
                return (
                  <li
                    key={point.id}
                    className={cn(
                      "flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors",
                      isSelected
                        ? "bg-blue-600/20 border border-blue-500/30"
                        : "hover:bg-secondary border border-transparent"
                    )}
                    onClick={() => handleToggle(point.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        !point.isBlocked ? "bg-emerald-400" : "bg-muted-foreground"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "truncate",
                          isSelected ? "text-blue-700 dark:text-blue-200 font-medium" : "text-foreground"
                        )}>
                          {point.name}
                        </span>
                        {point.external_id && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-mono shrink-0">
                            ({point.external_id})
                          </span>
                        )}
                      </div>
                      {point.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {point.description}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer со статистикой */}
        {value.length > 0 && (
          <div className="px-3 py-2 border-t border-border bg-background/50">
            <div className="flex flex-wrap gap-1">
              {selectedPoints.slice(0, 5).map(point => (
                <Badge
                  key={point.id}
                  variant="outline"
                  className="text-xs"
                >
                  {point.name}
                </Badge>
              ))}
              {selectedPoints.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{selectedPoints.length - 5}
                </Badge>
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
