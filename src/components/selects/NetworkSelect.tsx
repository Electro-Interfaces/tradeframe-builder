import { useState, useMemo } from "react";
import ReactDOM from "react-dom";
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
    // Клик по строке (тексту) → выбрать ТОЛЬКО эту сеть + закрыть
    onValueChange?.(networkId);
    if (isMultiMode) {
      onValuesChange!([networkId]);
    }
    setOpen(false);
  };

  // Текст кнопки
  const getTriggerLabel = () => {
    if (selectedNetworks.length === 0) return "Выберите сеть";
    if (selectedNetworks.length === 1) return selectedNetworks[0].name;
    return `${selectedNetworks.length} сети`;
  };

  return (
    <>
    {isMobile && open && ReactDOM.createPortal(
      <div className="fixed inset-0 z-40 bg-black/40 dark:bg-[#070e1b]/70 backdrop-blur-sm" onClick={() => setOpen(false)} />,
      document.body
    )}
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
        className={cn("p-0", isMobile ? "w-[calc(100vw-2rem)] rounded-t-[1.5rem] bg-card dark:bg-[#1c2533] shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-border/30 dark:border-[#434655]/40" : "w-[360px] min-w-[360px] rounded-xl bg-card dark:bg-di-surface-low border border-border/30 dark:border-di-outline-variant/15")}
        align="center"
        side={isMobile ? "top" : "bottom"}
        collisionPadding={16}
        sideOffset={isMobile ? 8 : 4}
      >
        {/* Drag handle (mobile) */}
        {isMobile && (
          <div className="w-full flex justify-center py-3">
            <div className="w-12 h-1 bg-di-outline-variant/30 rounded-full" />
          </div>
        )}

        {/* Header */}
        <div className={cn("px-4 pb-2", isMobile ? "pt-0" : "pt-3")}>
          <h2 className="font-headline font-bold text-foreground text-base">Выбор сети</h2>
        </div>

        <div className={cn("overflow-y-auto", isMobile ? "max-h-[45vh] px-4 py-1" : "max-h-[320px] px-3 py-1")}>
          <ul className="space-y-0.5">
            {/* «Выбрать все» */}
            {isMultiMode && networks.length > 1 && (
              <li
                key="all"
                className={cn(
                  "flex items-center gap-3 rounded-xl cursor-pointer transition-all",
                  isMobile ? "px-3 py-2.5" : "px-3 py-1.5",
                  selectedIds.length === networks.length ? "bg-blue-50 dark:bg-[#2563eb]/10 border border-blue-200 dark:border-[#2563eb]/20" : "hover:bg-secondary dark:hover:bg-di-surface-high border border-transparent"
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
                  className={cn("data-[state=checked]:bg-[#2563eb] data-[state=checked]:border-[#2563eb] border-di-outline-variant", isMobile && "h-5 w-5")}
                />
                <span className={cn("rounded-full bg-blue-400", isMobile ? "h-2.5 w-2.5" : "h-2 w-2")} aria-hidden />
                <span className={cn("truncate font-medium text-foreground", selectedIds.length === networks.length && "text-blue-700 dark:text-blue-200")}>
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
                    "flex items-center gap-3 rounded-xl transition-all",
                    isMobile ? "px-3 py-2.5" : "px-3 py-1.5",
                    isSelected ? "bg-blue-50 dark:bg-[#2563eb]/10 border border-blue-200 dark:border-[#2563eb]/20" : "hover:bg-secondary dark:hover:bg-di-surface-high border border-transparent"
                  )}
                >
                  {isMultiMode && (
                    <Checkbox
                      checked={isSelected}
                      className={cn("data-[state=checked]:bg-[#2563eb] data-[state=checked]:border-[#2563eb] border-di-outline-variant cursor-pointer shrink-0", isMobile && "h-5 w-5")}
                      onCheckedChange={() => handleToggle(network.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <div className="min-w-0 flex-1 flex items-center gap-2 cursor-pointer transition-colors duration-200" onClick={() => handleRowClick(network.id)}>
                    <span className={cn("rounded-full shrink-0", isMobile ? "h-2.5 w-2.5" : "h-2 w-2", isPrimary ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]")} aria-hidden />
                    <span className={cn("truncate text-muted-foreground", isSelected && "font-bold !text-foreground")}>{network.name}</span>
                    {network.code && <span className="text-xs text-blue-400 font-mono shrink-0">({network.code})</span>}
                  </div>
                  {!isMultiMode && isSelected && (
                    <Check className={cn("text-blue-400 shrink-0", isMobile ? "h-5 w-5" : "h-4 w-4")} />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        {/* Footer */}
        {isMultiMode && selectedIds.length > 0 && (
          <div className={cn("border-t border-border/20 dark:border-di-outline-variant/15", isMobile ? "px-4 py-3" : "px-3 py-2")}>
            <div className="flex gap-2">
              {selectedIds.length > 1 && (
                <button
                  className={cn("font-medium text-muted-foreground bg-secondary dark:bg-di-surface-high hover:bg-accent dark:hover:bg-di-surface-highest rounded-xl transition-colors", isMobile ? "px-4 py-2.5 text-sm" : "px-3 py-1.5 text-sm")}
                  onClick={() => {
                    const primary = value || selectedIds[0];
                    onValuesChange!([primary]);
                    onValueChange?.(primary);
                  }}
                >
                  Сбросить
                </button>
              )}
              <button
                className={cn("flex-1 font-bold text-white bg-[#2563eb] hover:bg-blue-600 active:scale-[0.98] rounded-xl transition-all shadow-[0_8px_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-1", isMobile ? "px-4 py-2.5 text-sm" : "px-3 py-1.5 text-sm")}
                onClick={() => setOpen(false)}
              >
                Применить ({selectedIds.length})
                <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
              </button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
    </>
  );
}
