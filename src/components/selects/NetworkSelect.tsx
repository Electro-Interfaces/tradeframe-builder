import { useState, useMemo } from "react";
import { Network as NetworkIcon, ChevronDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Network } from "@/types/network";
import { useNewAuth } from "@/contexts/NewAuthContext";
import { useQuery } from "@tanstack/react-query";
import { networksService } from "@/services/networksService";

interface NetworkSelectProps {
  /** Основная выбранная сеть (backward compat) */
  value?: string;
  /** Колбэк при клике по строке — переключение основной сети */
  onValueChange?: (value: string) => void;
  /** Массив ID выбранных сетей (мультиселект) */
  values?: string[];
  /** Колбэк при изменении мультиселекта */
  onValuesChange?: (values: string[]) => void;
  className?: string;
}

export function NetworkSelect({ value, onValueChange, values, onValuesChange, className }: NetworkSelectProps) {
  const [open, setOpen] = useState(false);
  const { user } = useNewAuth();
  const isMobile = useIsMobile();
  const isMultiMode = Boolean(onValuesChange);

  const { data: allNetworks = [] } = useQuery({
    queryKey: ['networks', user?.role],
    queryFn: () => networksService.getAll(user?.role),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Фильтруем сети по scope_values из ролей пользователя
  const networks = useMemo(() => {
    const networkIds = new Set<string>();
    const networkCodes = new Set<string>();
    let hasRestrictions = false;

    if (user?.roles) {
      user.roles.forEach(role => {
        if (role.scopeValues && role.scopeValues.length > 0) {
          hasRestrictions = true;
          if (role.scope === 'network') {
            role.scopeValues.forEach(id => networkIds.add(id));
          } else if (role.scope === 'trading_point' || role.scope === 'assigned') {
            role.scopeValues.forEach(scopeValue => {
              const parts = scopeValue.split('-azs-');
              if (parts.length === 2) {
                networkCodes.add(parts[0]);
              }
            });
          }
        }
      });
    }

    if (!hasRestrictions) return allNetworks;

    return allNetworks.filter(network =>
      networkIds.has(network.id) || networkCodes.has(network.code)
    );
  }, [allNetworks, user?.roles]);

  const selectedIds = values || (value ? [value] : []);
  const selectedNetworks = networks.filter(n => selectedIds.includes(n.id));

  const handleToggle = (networkId: string) => {
    if (isMultiMode) {
      const next = selectedIds.includes(networkId)
        ? selectedIds.filter(id => id !== networkId)
        : [...selectedIds, networkId];
      // Не позволяем снять все — минимум одна сеть
      if (next.length === 0) return;
      onValuesChange!(next);
    } else {
      onValueChange?.(networkId);
      setOpen(false);
    }
  };

  const handleRowClick = (networkId: string) => {
    onValueChange?.(networkId);
    setOpen(false);
  };

  // Текст кнопки
  const getTriggerLabel = () => {
    if (selectedNetworks.length === 0) return "Выберите сеть";
    if (selectedNetworks.length === 1) return selectedNetworks[0].name;
    return `${selectedNetworks.length} сети`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn(
          "flex items-center justify-between w-full px-3 py-2 text-sm bg-secondary border border-border text-foreground rounded-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]",
          className
        )}>
          <NetworkIcon className="inline h-4 w-4 mr-2 opacity-70" />
          <span className="truncate">
            {getTriggerLabel()}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-0", isMobile ? "w-[calc(100vw-2rem)] min-w-0" : "w-auto min-w-56 max-w-md")}
        align={isMobile ? "center" : "start"}
        sideOffset={isMobile ? 8 : 4}
      >
        <div className={cn("overflow-y-auto", isMobile ? "max-h-[50vh] p-1.5" : "max-h-[360px] p-2")}>
          <ul className="space-y-0.5">
            {/* «Выбрать все» — только в мультирежиме при >1 сети */}
            {isMultiMode && networks.length > 1 && (
              <li
                key="all"
                className={cn(
                  "flex items-center gap-2 px-2 rounded-md cursor-pointer border-b border-border mb-1 transition-colors",
                  isMobile ? "py-2.5 gap-3" : "py-1.5",
                  selectedIds.length === networks.length ? "bg-blue-600/10" : "hover:bg-card"
                )}
                onClick={() => {
                  if (selectedIds.length === networks.length) {
                    onValuesChange!(value ? [value] : [networks[0].id]);
                  } else {
                    onValuesChange!(networks.map(n => n.id));
                  }
                }}
              >
                <Checkbox
                  checked={selectedIds.length === networks.length}
                  className={cn(
                    "data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600",
                    isMobile && "h-5 w-5"
                  )}
                />
                <span className={cn("rounded-full bg-blue-400", isMobile ? "h-2.5 w-2.5" : "h-2 w-2")} aria-hidden />
                <span className={cn("truncate font-medium", isMobile && "text-base", selectedIds.length === networks.length && "text-blue-700 dark:text-blue-200")}>
                  Все сети ({networks.length})
                </span>
              </li>
            )}
            {networks.map((network) => {
              const isSelected = selectedIds.includes(network.id);
              const isPrimary = network.id === value;
              return (
                <li
                  key={network.id}
                  className={cn(
                    "flex items-center gap-2 px-2 rounded-md transition-colors",
                    isMobile ? "py-2.5 gap-3" : "py-1.5",
                    isSelected ? "bg-blue-600/10" : "hover:bg-card"
                  )}
                >
                  {isMultiMode && (
                    <Checkbox
                      checked={isSelected}
                      className={cn(
                        "data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 cursor-pointer shrink-0",
                        isMobile && "h-5 w-5"
                      )}
                      onCheckedChange={() => handleToggle(network.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <div
                    className="min-w-0 flex-1 flex items-center gap-2 cursor-pointer"
                    onClick={() => handleRowClick(network.id)}
                  >
                    <span
                      className={cn(
                        "rounded-full shrink-0",
                        isMobile ? "h-2.5 w-2.5" : "h-2 w-2",
                        isPrimary ? "bg-blue-500" : "bg-emerald-400"
                      )}
                      aria-hidden
                    />
                    <span className={cn(
                      "truncate",
                      isMobile && "text-base",
                      isSelected && "text-blue-700 dark:text-blue-200 font-medium"
                    )}>
                      {network.name}
                    </span>
                    {network.code && (
                      <span className={cn("text-muted-foreground font-mono shrink-0", isMobile ? "text-sm" : "text-xs")}>({network.code})</span>
                    )}
                  </div>
                  {!isMultiMode && isSelected && (
                    <Check className={cn("text-blue-600 dark:text-blue-400 shrink-0", isMobile ? "h-5 w-5" : "h-4 w-4")} />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        {/* Кнопка «Применить» — закрыть dropdown после мультиселекта */}
        {isMultiMode && selectedIds.length > 0 && (
          <div className={cn("border-t border-border px-2", isMobile ? "py-2.5 px-3" : "py-2")}>
            <button
              className={cn(
                "w-full font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors",
                isMobile ? "px-4 py-2.5 text-base" : "px-3 py-1.5 text-sm"
              )}
              onClick={() => setOpen(false)}
            >
              Применить ({selectedIds.length})
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
