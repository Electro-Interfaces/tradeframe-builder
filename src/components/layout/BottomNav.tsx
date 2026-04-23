import { memo, useEffect, useState, useCallback } from "react";
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

/** Страницы торговой точки */
const pointPages = ['/point/equipment', '/point/prices', '/point/tanks', '/'];

const BottomNavComponent = ({ onMenuToggle, showPointSelect, pointSelectProps, onRefresh: onRefreshProp, refreshing: refreshingProp }: BottomNavProps) => {
  const location = useLocation();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    if (onRefreshProp) {
      onRefreshProp();
    } else {
      window.dispatchEvent(new CustomEvent('bottomnav-refresh'));
    }
  }, [onRefreshProp]);

  const isPointPage = pointPages.some(p => location.pathname === p || location.pathname.startsWith('/point/'));
  const navItems = isPointPage
    ? allPointItems.filter(item => item.url !== location.pathname)
    : defaultNavItems;

  const isActive = (url: string) => location.pathname === url;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#070e1b]/80 backdrop-blur-xl shadow-[0_-4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.4)] border-t border-border/30 dark:border-[#434655]/15 mobile-safe-bottom">
      {/* Point selector + refresh above tabs */}
      {showPointSelect && pointSelectProps && (
        <div className="px-3 pt-2 flex items-center gap-2">
          <PointSelect
            values={pointSelectProps.values}
            onValuesChange={pointSelectProps.onValuesChange}
            onPointClick={pointSelectProps.onPointClick}
            disabled={pointSelectProps.disabled}
            networkIds={pointSelectProps.networkIds}
            className="w-full flex-1"
          />
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-di-surface-high border border-di-outline-variant/15 text-di-on-surface-variant hover:text-di-on-surface transition-colors duration-200 active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      )}
      <div className="flex items-center justify-around h-14 px-1 pb-1">
        {navItems.map((item) => {
          const active = isActive(item.url);
          return (
            <NavLink
              key={item.url}
              to={item.url}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors duration-200 touch-manipulation active:translate-y-0.5 outline-none focus:outline-none focus-visible:outline-none ${
                active
                  ? "text-primary dark:text-[#2563eb]"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <item.icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-semibold uppercase tracking-tighter leading-none">{item.title}</span>
            </NavLink>
          );
        })}
        <button
          onClick={onMenuToggle}
          className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-slate-500 dark:text-slate-400 transition-colors duration-200 touch-manipulation active:translate-y-0.5"
          type="button"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-semibold uppercase tracking-tighter leading-none">Меню</span>
        </button>
      </div>
    </nav>
  );
};

export const BottomNav = memo(BottomNavComponent);
