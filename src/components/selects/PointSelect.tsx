import { useState, useMemo } from "react";
import ReactDOM from "react-dom";
import { MapPin, ChevronDown, ChevronRight, Check, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { tradingPointsService } from "@/services/tradingPointsService";
import { TradingPoint } from "@/types/tradingpoint";
import { useQuery } from "@tanstack/react-query";
import { useNewAuth } from "@/contexts/NewAuthContext";

interface PointSelectProps {
  /** Массив выбранных ID торговых точек */
  values?: string[];
  /** Колбэк при изменении мультиселекта */
  onValuesChange?: (values: string[]) => void;
  /** Колбэк при клике по строке (смена текущей станции) */
  onPointClick?: (pointId: string) => void;
  className?: string;
  disabled?: boolean;
  /** Одна сеть (backward compat) */
  networkId?: string;
  /** Несколько сетей (мультиселект) */
  networkIds?: string[];
}

export function PointSelect({ values = [], onValuesChange, onPointClick, className, disabled, networkId, networkIds }: PointSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useNewAuth();
  const isMobile = useIsMobile();

  // Эффективный ключ: если передан networkIds — используем его, иначе одиночный networkId
  const effectiveNetworkIds = networkIds && networkIds.length > 0
    ? networkIds
    : networkId ? [networkId] : [];

  const { data: allTradingPoints = [] } = useQuery({
    queryKey: ['tradingPoints', ...effectiveNetworkIds.sort()],
    queryFn: async () => {
      let points: TradingPoint[];
      if (effectiveNetworkIds.length === 0) {
        points = await tradingPointsService.getAll();
      } else if (effectiveNetworkIds.length === 1) {
        points = await tradingPointsService.getByNetworkId(effectiveNetworkIds[0]);
      } else {
        // Мультиселект: загружаем станции из всех выбранных сетей
        const results = await Promise.all(
          effectiveNetworkIds.map(id => tradingPointsService.getByNetworkId(id))
        );
        points = results.flat();
      }
      return points.sort((a, b) => {
        const numA = parseInt(a.external_id || '999999', 10);
        const numB = parseInt(b.external_id || '999999', 10);
        return numA - numB;
      });
    },
    enabled: !disabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Фильтруем по scope_values из роли пользователя
  const tradingPoints = useMemo(() => {
    if (!user?.roles) return allTradingPoints;

    const tradingPointIds = new Set<string>();
    const stationCodes = new Set<string>();
    const networkIds = new Set<string>();
    let hasRestrictions = false;

    user.roles.forEach(role => {
      if (role.scopeValues && role.scopeValues.length > 0) {
        hasRestrictions = true;
        if (role.scope === 'network') {
          role.scopeValues.forEach(id => networkIds.add(id));
        } else if (role.scope === 'trading_point' || role.scope === 'assigned') {
          role.scopeValues.forEach(scopeValue => {
            const parts = scopeValue.split('-azs-');
            if (parts.length === 2) {
              stationCodes.add(parts[1]);
            } else {
              tradingPointIds.add(scopeValue);
            }
          });
        }
      }
    });

    if (!hasRestrictions) return allTradingPoints;

    return allTradingPoints.filter(point =>
      tradingPointIds.has(point.id) ||
      (point.external_id && stationCodes.has(point.external_id)) ||
      networkIds.has(point.networkId)
    );
  }, [allTradingPoints, user?.roles]);

  const hasRestrictedAccess = useMemo(() => {
    if (!user?.roles) return false;
    return user.roles.some(role =>
      (role.scope === 'network' || role.scope === 'trading_point' || role.scope === 'assigned') &&
      role.scopeValues && role.scopeValues.length > 0
    );
  }, [user?.roles]);

  const allIds = useMemo(() => tradingPoints.map(p => p.id), [tradingPoints]);
  const isAllSelected = values.length > 0 && tradingPoints.length > 0 && values.length === tradingPoints.length;
  const selectedPoints = tradingPoints.filter(p => values.includes(p.id));

  const handleToggle = (pointId: string) => {
    if (values.includes(pointId)) {
      onValuesChange?.(values.filter(id => id !== pointId));
    } else {
      onValuesChange?.([...values, pointId]);
    }
  };

  const handleToggleAll = () => {
    if (isAllSelected) {
      onValuesChange?.([]);
    } else {
      onValuesChange?.(allIds);
    }
  };

  // Текст кнопки
  const getTriggerLabel = () => {
    if (disabled) return "Сначала выберите сеть";
    if (values.length === 0) return "Выберите торговые точки";
    if (isAllSelected) {
      // Если единственная станция в сети — показываем её имя
      if (tradingPoints.length === 1 && selectedPoints.length === 1) {
        return selectedPoints[0].name;
      }
      return hasRestrictedAccess
        ? `Все доступные (${tradingPoints.length})`
        : "Все торговые точки";
    }
    if (values.length === 1 && selectedPoints.length === 1) {
      return selectedPoints[0].name;
    }
    return `${selectedPoints.length} из ${tradingPoints.length} АЗС`;
  };

  return (
    <>
    {isMobile && open && ReactDOM.createPortal(
      <div className="fixed inset-0 z-40 bg-black/40 dark:bg-[#070e1b]/70 backdrop-blur-sm" onClick={() => setOpen(false)} />,
      document.body
    )}
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearchQuery(''); }}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center justify-between w-full px-3 py-2 text-sm bg-secondary border border-border text-foreground rounded-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]",
            disabled && "opacity-50 cursor-not-allowed hover:bg-secondary",
            className
          )}
          disabled={disabled}
        >
          <MapPin className="inline h-4 w-4 mr-2 opacity-70" />
          <span className="truncate">
            {getTriggerLabel()}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-0", isMobile ? "w-[calc(100vw-2rem)] rounded-t-[1.5rem] bg-card dark:bg-[#1c2533] shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-border/30 dark:border-[#434655]/40" : "w-[420px] min-w-[420px] rounded-xl bg-card dark:bg-di-surface-low border border-border/30 dark:border-di-outline-variant/15")}
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
        <div className={cn("px-4 pb-3", isMobile ? "pt-0" : "pt-4")}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-headline font-bold text-foreground text-base">Выбор торговой точки</h2>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-di-surface-high transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              className="w-full bg-secondary dark:bg-di-surface-lowest border border-border/20 dark:border-di-outline-variant/15 rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:border-blue-500/40 transition-all placeholder:text-muted-foreground/50"
              placeholder="Поиск станции..."
              type="text"
              onChange={(e) => setSearchQuery(e.target.value)}
              value={searchQuery}
            />
          </div>
        </div>

        <div className={cn("overflow-y-auto", isMobile ? "max-h-[45vh] px-4 py-1" : "max-h-[320px] px-3 py-1")}>
          <ul className="space-y-0.5">
            {/* Выбрать все */}
            {tradingPoints.length > 1 && (
              <li
                key="all"
                className={cn(
                  "flex items-center gap-3 rounded-xl cursor-pointer transition-all",
                  isMobile ? "px-3 py-2" : "px-3 py-1.5",
                  isAllSelected ? "bg-blue-50 dark:bg-[#2563eb]/10 border border-blue-200 dark:border-[#2563eb]/20" : "hover:bg-secondary dark:hover:bg-di-surface-high border border-transparent"
                )}
                onClick={handleToggleAll}
              >
                <Checkbox
                  checked={isAllSelected}
                  className={cn(
                    "data-[state=checked]:bg-[#2563eb] data-[state=checked]:border-[#2563eb] border-di-outline-variant",
                    isMobile && "h-5 w-5"
                  )}
                />
                <span className={cn("rounded-full bg-blue-400", isMobile ? "h-2.5 w-2.5" : "h-2 w-2")} aria-hidden />
                <span className={cn("truncate font-medium text-foreground", isAllSelected && "text-blue-700 dark:text-blue-200")}>
                  {hasRestrictedAccess ? `Все доступные (${tradingPoints.length})` : "Все торговые точки"}
                </span>
              </li>
            )}
            {tradingPoints.filter(p => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              return p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q) || (p.external_id || '').includes(q);
            }).map((point) => {
              const isSelected = values.includes(point.id);
              return (
                <li
                  key={point.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl transition-all",
                    isMobile ? "px-3 py-2" : "px-3 py-1.5",
                    isSelected ? "bg-blue-50 dark:bg-[#2563eb]/10 border border-blue-200 dark:border-[#2563eb]/20" : "hover:bg-secondary dark:hover:bg-di-surface-high border border-transparent"
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    className={cn(
                      "data-[state=checked]:bg-[#2563eb] data-[state=checked]:border-[#2563eb] border-di-outline-variant cursor-pointer shrink-0",
                      isMobile && "h-5 w-5"
                    )}
                    onCheckedChange={() => handleToggle(point.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div
                    className="min-w-0 flex-1 flex items-center gap-2 cursor-pointer transition-colors duration-200"
                    onClick={() => {
                      onValuesChange?.([point.id]);
                      onPointClick?.(point.id);
                      setOpen(false);
                    }}
                  >
                    <span
                      className={cn(
                        "rounded-full shrink-0",
                        isMobile ? "h-2.5 w-2.5" : "h-2 w-2",
                        !point.isBlocked
                          ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                          : "bg-di-outline-variant opacity-50"
                      )}
                      aria-hidden
                    />
                    <span className={cn("truncate text-muted-foreground", isSelected && "font-bold !text-foreground !opacity-100")}>
                      {point.name}
                      {point.description && <span className="text-di-on-surface-variant"> - {point.description}</span>}
                    </span>
                    {point.external_id && (
                      <span className="text-xs text-blue-400 font-mono shrink-0">({point.external_id})</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        {/* Footer: Apply */}
        {values.length > 0 && (
          <div className={cn("border-t border-border/20 dark:border-di-outline-variant/15", isMobile ? "px-3 py-2.5" : "px-3 py-1.5")}>
            <div className="flex gap-2">
              {values.length > 1 && values.length < tradingPoints.length && (
                <button
                  className={cn(
                    "font-medium text-muted-foreground bg-secondary dark:bg-di-surface-high hover:bg-accent dark:hover:bg-di-surface-highest rounded-xl transition-colors",
                    isMobile ? "px-4 py-3 text-sm" : "px-3 py-1.5 text-sm"
                  )}
                  onClick={() => onValuesChange?.(allIds)}
                >
                  Все
                </button>
              )}
              <button
                className={cn(
                  "flex-1 font-bold text-white bg-[#2563eb] hover:bg-blue-600 active:scale-[0.98] rounded-xl transition-all shadow-[0_8px_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-1",
                  isMobile ? "px-4 py-3 text-sm" : "px-3 py-1.5 text-sm"
                )}
                onClick={() => setOpen(false)}
              >
                Применить ({values.length})
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
    </>
  );
}
