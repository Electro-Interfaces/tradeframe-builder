import { useState, useMemo } from "react";
import { MapPin, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { tradingPointsService } from "@/services/tradingPointsService";
import { TradingPoint } from "@/types/tradingpoint";
import { useQuery } from "@tanstack/react-query";
import { useNewAuth } from "@/contexts/NewAuthContext";

interface PointSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  networkId?: string;
}

export function PointSelect({ value, onValueChange, className, disabled, networkId }: PointSelectProps) {
  const [open, setOpen] = useState(false);
  const { user } = useNewAuth();

  // ✅ ИСПРАВЛЕНИЕ: Используем React Query для кэширования
  const { data: allTradingPoints = [] } = useQuery({
    queryKey: ['tradingPoints', networkId],
    queryFn: async () => {
      let points: TradingPoint[];
      if (networkId) {
        points = await tradingPointsService.getByNetworkId(networkId);
      } else {
        points = await tradingPointsService.getAll();
      }
      // Сортируем по external_id (номеру станции) по возрастанию
      return points.sort((a, b) => {
        const numA = parseInt(a.external_id || '999999', 10);
        const numB = parseInt(b.external_id || '999999', 10);
        return numA - numB;
      });
    },
    enabled: !disabled, // Загружаем только если не disabled
    staleTime: 5 * 60 * 1000, // 5 минут - данные считаются свежими
    gcTime: 30 * 60 * 1000, // 30 минут - время хранения в кэше
  });

  // Фильтруем торговые точки по scope_values из роли пользователя
  // Учитываем разные форматы scope_values:
  // - scope='network': UUID сетей
  // - scope='trading_point'/'assigned': ID точек в формате {networkCode}-azs-{stationCode}
  const tradingPoints = useMemo(() => {
    if (!user?.roles) return allTradingPoints;

    const tradingPointIds = new Set<string>(); // UUID точек (если формат UUID)
    const stationCodes = new Set<string>(); // external_id точек из формата {networkCode}-azs-{stationCode}
    const networkIds = new Set<string>(); // UUID сетей для scope='network'
    let hasRestrictions = false;

    user.roles.forEach(role => {
      if (role.scopeValues && role.scopeValues.length > 0) {
        hasRestrictions = true;
        if (role.scope === 'network') {
          // Для scope='network' scopeValues содержат UUID сетей
          role.scopeValues.forEach(id => networkIds.add(id));
        } else if (role.scope === 'trading_point' || role.scope === 'assigned') {
          // Для trading_point/assigned scopeValues могут быть:
          // 1. UUID точки напрямую
          // 2. Формат {networkCode}-azs-{stationCode} (например "65-azs-3")
          role.scopeValues.forEach(scopeValue => {
            const parts = scopeValue.split('-azs-');
            if (parts.length === 2) {
              // Формат {networkCode}-azs-{stationCode}
              stationCodes.add(parts[1]); // stationCode = external_id точки
            } else {
              // Возможно UUID
              tradingPointIds.add(scopeValue);
            }
          });
        }
      }
    });

    // Если нет ограничений - показываем все торговые точки (полный доступ)
    if (!hasRestrictions) {
      return allTradingPoints;
    }

    // Фильтруем: по UUID точки, по external_id (stationCode) ИЛИ по принадлежности к разрешенной сети
    return allTradingPoints.filter(point =>
      tradingPointIds.has(point.id) ||
      (point.external_id && stationCodes.has(point.external_id)) ||
      networkIds.has(point.networkId)
    );
  }, [allTradingPoints, user?.roles]);

  // Проверяем, есть ли ограничения по торговым точкам или сетям
  const hasRestrictedAccess = useMemo(() => {
    if (!user?.roles) return false;
    return user.roles.some(role =>
      (role.scope === 'network' || role.scope === 'trading_point' || role.scope === 'assigned') &&
      role.scopeValues && role.scopeValues.length > 0
    );
  }, [user?.roles]);

  const selectedPoint = tradingPoints.find(p => p.id === value);
  
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
          className={cn(
            "flex items-center justify-between w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 text-white rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]",
            disabled && "opacity-50 cursor-not-allowed hover:bg-slate-700",
            className
          )}
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
      <PopoverContent className="w-auto min-w-56 max-w-md p-2" align="start">
        <ul className="space-y-1">
          {/* Опция "Все" - показывает все доступные торговые точки */}
          {tradingPoints.length > 1 && (
            <li
              key="all"
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-md cursor-pointer border-b border-slate-700 mb-1"
              onClick={() => handleSelect("all")}
            >
              <span
                className="h-2 w-2 rounded-full bg-blue-400"
                aria-hidden
              />
              <span className="truncate font-medium">
                {hasRestrictedAccess
                  ? `Все доступные (${tradingPoints.length})`
                  : "Все торговые точки"
                }
              </span>
            </li>
          )}
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
              <div className="min-w-0 flex-1 flex items-center gap-2">
                <span>
                  {point.name}
                  {point.description && <span className="text-slate-400"> - {point.description}</span>}
                </span>
                {point.external_id && (
                  <span className="text-xs text-blue-400 font-mono shrink-0">({point.external_id})</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}