import { memo, useCallback } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Network, Receipt, Clock, Menu, DollarSign, Database, RefreshCw, Settings } from "lucide-react";
import { PointSelect } from "@/components/selects/PointSelect";

interface BottomNavProps {
  onMenuToggle: () => void;
  showPointSelect?: boolean;
  pointSelectProps?: {
    values: string[];
    onValuesChange: (values: string[]) => void;
    onPointClick: (pointId: string) => void;
    disabled: boolean;
    networkIds: string[];
  };
  onRefresh?: () => void;
  refreshing?: boolean;
}

const defaultNavItems = [
  { title: "Обзор", url: "/network/overview", icon: Network },
  { title: "Операции", url: "/network/operations-transactions", icon: Receipt },
  { title: "Смены", url: "/point/shift-reports-v2", icon: Clock },
];

const allPointItems = [
  { title: "Операции", url: "/network/operations-transactions", icon: Receipt },
  { title: "Цены", url: "/point/prices", icon: DollarSign },
  { title: "Резервуары", url: "/point/tanks", icon: Database },
  { title: "Оборудование", url: "/point/equipment", icon: Settings },
];

/** Fallback для /point/* страниц, которых нет в allPointItems (например, shift-reports-v2) */
const pointFallbackItems = [
  { title: "Операции", url: "/network/operations-transactions", icon: Receipt },
  { title: "Цены", url: "/point/prices", icon: DollarSign },
  { title: "Оборудование", url: "/point/equipment", icon: Settings },
];

/** Страницы торговой точки */
const pointPages = ['/point/equipment', '/point/prices', '/point/tanks', '/'];

const BottomNavComponent = ({ onMenuToggle, showPointSelect, pointSelectProps, onRefresh: onRefreshProp, refreshing: refreshingProp }: BottomNavProps) => {
  const location = useLocation();
  const refreshing = refreshingProp ?? false;

  const onRefresh = useCallback(() => {
    if (onRefreshProp) {
      onRefreshProp();
    } else {
      window.dispatchEvent(new CustomEvent('bottomnav-refresh'));
    }
  }, [onRefreshProp]);

  const isPointPage = location.pathname === '/' || location.pathname.startsWith('/point/');
  const rawItems = isPointPage
    ? (allPointItems.some(item => item.url === location.pathname)
        ? allPointItems.filter(item => item.url !== location.pathname)
        : pointFallbackItems)
    : defaultNavItems;
  // Гарантируем ≤ 3 пункта (+ Меню = 4 total)
  const navItems = rawItems.slice(0, 3);

  const isActive = (url: string) => location.pathname === url;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#070e1b]/80 backdrop-blur-xl shadow-[0_-6px_16px_rgba(15,23,42,0.12)] dark:shadow-none border-t border-border/30 dark:border-white/10 mobile-safe-bottom">
      {/* Point selector + refresh above tabs */}
      {showPointSelect && pointSelectProps && (
        <div className="px-3 pt-2 flex items-center gap-2">
          <PointSelect
            values={pointSelectProps.values}
            onValuesChange={pointSelectProps.onValuesChange}
            onPointClick={pointSelectProps.onPointClick}
            disabled={pointSelectProps.disabled}
            networkIds={pointSelectProps.networkIds}
            className="flex-1 min-w-0"
          />
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Обновить"
              className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-di-surface-high border border-di-outline-variant/15 text-di-on-surface-variant hover:text-di-on-surface transition-colors duration-200 active:scale-95"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      )}
      <div className="flex items-center justify-around h-16 px-1 pb-1">
        {navItems.map((item) => {
          const active = isActive(item.url);
          return (
            <NavLink
              key={item.url}
              to={item.url}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors duration-200 touch-manipulation active:translate-y-0.5 outline-none focus:outline-none focus-visible:outline-none ${
                active
                  ? "text-primary dark:text-[#2563eb]"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <item.icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-semibold uppercase tracking-tighter leading-tight">{item.title}</span>
            </NavLink>
          );
        })}
        <button
          onClick={onMenuToggle}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-slate-500 dark:text-slate-400 transition-colors duration-200 touch-manipulation active:translate-y-0.5"
          type="button"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-semibold uppercase tracking-tighter leading-tight">Меню</span>
        </button>
      </div>
    </nav>
  );
};

export const BottomNav = memo(BottomNavComponent);
