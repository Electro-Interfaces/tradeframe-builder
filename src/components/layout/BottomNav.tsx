import { memo, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Menu, RefreshCw, MessageCircle, LifeBuoy, HelpCircle } from "lucide-react";
import { PointSelect } from "@/components/selects/PointSelect";
import { useSupportContext } from "@/contexts/SupportContext";

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

const BottomNavComponent = ({ onMenuToggle, showPointSelect, pointSelectProps, onRefresh: onRefreshProp, refreshing: refreshingProp }: BottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sp] = useSearchParams();
  const { unreadCounts } = useSupportContext();
  const refreshing = refreshingProp ?? false;

  const onRefresh = useCallback(() => {
    if (onRefreshProp) {
      onRefreshProp();
    } else {
      window.dispatchEvent(new CustomEvent('bottomnav-refresh'));
    }
  }, [onRefreshProp]);

  const curTab = location.pathname.startsWith('/support/interaction') ? (sp.get('tab') || 'chat') : null;
  const navBtn = (active: boolean) =>
    `flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors duration-200 touch-manipulation active:translate-y-0.5 ${active ? 'text-primary dark:text-[#2563eb]' : 'text-slate-500 dark:text-slate-400'}`;

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
              className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-di-surface-high border border-di-outline-variant/15 text-di-on-surface-variant hover:text-di-on-surface transition-colors duration-200 active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      )}
      <div className="flex items-center justify-around h-16 px-1 pb-1">
        <button onClick={() => navigate('/support/interaction?tab=chat')} type="button" className={`relative ${navBtn(curTab === 'chat')}`}>
          <MessageCircle className="w-5 h-5" />
          <span className="text-[10px] font-semibold uppercase tracking-tighter leading-tight">Чат</span>
          {unreadCounts.chat > 0 && (
            <span className="absolute top-1 right-[22%] bg-red-600 text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center">
              {unreadCounts.chat}
            </span>
          )}
        </button>
        <button onClick={() => navigate('/support/interaction?tab=tickets')} type="button" className={`relative ${navBtn(curTab === 'tickets')}`}>
          <LifeBuoy className="w-5 h-5" />
          <span className="text-[10px] font-semibold uppercase tracking-tighter leading-tight">Заявки</span>
          {unreadCounts.tickets > 0 && (
            <span className="absolute top-1 right-[22%] bg-red-600 text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center">
              {unreadCounts.tickets}
            </span>
          )}
        </button>
        <button onClick={() => navigate('/support/interaction?tab=help')} type="button" className={navBtn(curTab === 'help')}>
          <HelpCircle className="w-5 h-5" />
          <span className="text-[10px] font-semibold uppercase tracking-tighter leading-tight">Помощь</span>
        </button>
        <button onClick={onMenuToggle} type="button" className={navBtn(false)}>
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-semibold uppercase tracking-tighter leading-tight">Меню</span>
        </button>
      </div>
    </nav>
  );
};

export const BottomNav = memo(BottomNavComponent);
