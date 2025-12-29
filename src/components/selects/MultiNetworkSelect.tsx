/**
 * Компонент мультивыбора торговых сетей
 * Используется для назначения доступа к нескольким сетям в ролях
 */

import { useState } from "react";
import { Network as NetworkIcon, ChevronDown, X, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { networksService } from "@/services/networksService";
import type { Network } from "@/types/network";
import { useQuery } from "@tanstack/react-query";

interface MultiNetworkSelectProps {
  value: string[];
  onValueChange: (values: string[]) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function MultiNetworkSelect({
  value = [],
  onValueChange,
  className,
  disabled,
  placeholder = "Выберите торговые сети"
}: MultiNetworkSelectProps) {
  const [open, setOpen] = useState(false);

  const { data: networks = [], isLoading } = useQuery({
    queryKey: ['networks-all'],
    queryFn: () => networksService.getAll(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !disabled,
  });

  const selectedNetworks = networks.filter(n => value.includes(n.id));

  const handleToggle = (networkId: string) => {
    if (value.includes(networkId)) {
      onValueChange(value.filter(id => id !== networkId));
    } else {
      onValueChange([...value, networkId]);
    }
  };

  const handleSelectAll = () => {
    if (value.length === networks.length) {
      onValueChange([]);
    } else {
      onValueChange(networks.map(n => n.id));
    }
  };

  const handleClear = () => {
    onValueChange([]);
  };

  const handleRemove = (networkId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange(value.filter(id => id !== networkId));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center justify-between w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 text-white rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[42px]",
            disabled && "opacity-50 cursor-not-allowed hover:bg-slate-800",
            className
          )}
          disabled={disabled}
          type="button"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <NetworkIcon className="h-4 w-4 opacity-70 shrink-0" />
            {selectedNetworks.length === 0 ? (
              <span className="text-slate-400 truncate">{placeholder}</span>
            ) : selectedNetworks.length <= 2 ? (
              <div className="flex flex-wrap gap-1">
                {selectedNetworks.map(network => (
                  <Badge
                    key={network.id}
                    variant="secondary"
                    className="text-xs bg-purple-600/30 text-purple-300 border border-purple-500/30"
                  >
                    {network.name}
                    <X
                      className="ml-1 h-3 w-3 cursor-pointer hover:text-red-400"
                      onClick={(e) => handleRemove(network.id, e)}
                    />
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-purple-300">
                Выбрано: {selectedNetworks.length} из {networks.length}
              </span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 opacity-70 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto min-w-[320px] max-w-md p-0 bg-slate-800 border-slate-700"
        align="start"
      >
        {/* Header с кнопками */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
          <span className="text-sm text-slate-300">
            {isLoading ? "Загрузка..." : `Торговые сети (${networks.length})`}
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleSelectAll}
              type="button"
            >
              {value.length === networks.length ? "Снять все" : "Выбрать все"}
            </Button>
            {value.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-red-400 hover:text-red-300"
                onClick={handleClear}
                type="button"
              >
                Очистить
              </Button>
            )}
          </div>
        </div>

        {/* Список сетей */}
        <div className="max-h-[300px] overflow-y-auto p-2">
          {networks.length === 0 ? (
            <div className="text-center py-4 text-slate-400 text-sm">
              Нет доступных торговых сетей
            </div>
          ) : (
            <ul className="space-y-1">
              {networks.map((network) => {
                const isSelected = value.includes(network.id);
                return (
                  <li
                    key={network.id}
                    className={cn(
                      "flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors",
                      isSelected
                        ? "bg-purple-600/20 border border-purple-500/30"
                        : "hover:bg-slate-700 border border-transparent"
                    )}
                    onClick={() => handleToggle(network.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                    />
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        "bg-emerald-400"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "truncate",
                          isSelected ? "text-purple-200 font-medium" : "text-white"
                        )}>
                          {network.name}
                        </span>
                        {network.code && (
                          <span className="text-xs text-purple-400 font-mono shrink-0">
                            ({network.code})
                          </span>
                        )}
                      </div>
                      {network.description && (
                        <div className="text-xs text-slate-400 truncate">
                          {network.description}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-purple-400 shrink-0" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer со статистикой */}
        {value.length > 0 && (
          <div className="px-3 py-2 border-t border-slate-700 bg-slate-900/50">
            <div className="flex flex-wrap gap-1">
              {selectedNetworks.slice(0, 5).map(network => (
                <Badge
                  key={network.id}
                  variant="outline"
                  className="text-xs"
                >
                  {network.name}
                </Badge>
              ))}
              {selectedNetworks.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{selectedNetworks.length - 5}
                </Badge>
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
