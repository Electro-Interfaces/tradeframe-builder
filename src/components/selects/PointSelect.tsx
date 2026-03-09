import { useState, useMemo } from "react";
import { MapPin, ChevronDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
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
  const { user } = useNewAuth();

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
    <Popover open={open} onOpenChange={setOpen}>
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
      <PopoverContent className="w-auto min-w-56 max-w-md p-0" align="start">
        <div className="max-h-[360px] overflow-y-auto p-2">
          <ul className="space-y-0.5">
            {/* Выбрать все */}
            {tradingPoints.length > 1 && (
              <li
                key="all"
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer border-b border-border mb-1 transition-colors",
                  isAllSelected ? "bg-blue-600/10" : "hover:bg-card"
                )}
                onClick={handleToggleAll}
              >
                <Checkbox
                  checked={isAllSelected}
                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <span
                  className="h-2 w-2 rounded-full bg-blue-400"
                  aria-hidden
                />
                <span className={cn("truncate font-medium", isAllSelected && "text-blue-700 dark:text-blue-200")}>
                  {hasRestrictedAccess
                    ? `Все доступные (${tradingPoints.length})`
                    : "Все торговые точки"
                  }
                </span>
              </li>
            )}
            {tradingPoints.map((point) => {
              const isSelected = values.includes(point.id);
              return (
                <li
                  key={point.id}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors",
                    isSelected ? "bg-blue-600/10" : "hover:bg-card"
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 cursor-pointer shrink-0"
                    onCheckedChange={() => handleToggle(point.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div
                    className="min-w-0 flex-1 flex items-center gap-2 cursor-pointer"
                    onClick={() => onPointClick ? onPointClick(point.id) : handleToggle(point.id)}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        !point.isBlocked ? "bg-emerald-400" : "bg-muted-foreground"
                      )}
                      aria-hidden
                    />
                    <span className={cn(isSelected && "text-blue-700 dark:text-blue-200 font-medium")}>
                      {point.name}
                      {point.description && <span className="text-muted-foreground"> - {point.description}</span>}
                    </span>
                    {point.external_id && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-mono shrink-0">({point.external_id})</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}
