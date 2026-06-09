import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Bell, Wifi, LifeBuoy, Sun, Moon, ChevronsLeft, ChevronsRight, MessageCircle, HelpCircle } from "lucide-react";
import UpdateChecker from "@/components/common/UpdateChecker";
import UpdateInfoDialog from "@/components/common/UpdateInfoDialog";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useTheme } from "@/contexts/ThemeContext";
import { NetworkSelect } from "@/components/selects/NetworkSelect";
import { APP_VERSION } from "@/config/version";
import { PointSelect } from "@/components/selects/PointSelect";
import { useNewAuth } from "@/contexts/NewAuthContext";
import { useMobile, mobileUtils } from "@/hooks/useMobile";
import { useSidebar } from "@/components/ui/sidebar";
import { useSupportContext } from "@/contexts/SupportContext";

interface HeaderProps {
  selectedNetwork: string;
  selectedNetworkIds: string[];
  selectedTradingPoints: string[];
  onNetworkChange: (value: string) => void;
  onNetworkIdsChange: (values: string[]) => void;
  onTradingPointsChange: (values: string[]) => void;
  onPointClick?: (pointId: string) => void;
  onMobileMenuToggle?: () => void;
  isMobile?: boolean;
}

export function Header({
  selectedNetwork,
  selectedNetworkIds,
  selectedTradingPoints,
  onNetworkChange,
  onNetworkIdsChange,
  onTradingPointsChange,
  onPointClick,
  onMobileMenuToggle,
  isMobile = false
}: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useNewAuth();
  const { openConnectionDialog, unreadCounts } = useSupportContext();
  const mobileInfo = useMobile();
  const { theme, toggleTheme } = useTheme();
  let sidebarState: 'expanded' | 'collapsed' = 'expanded';
  let toggleSidebar: (() => void) | null = null;
  try {
    const sidebar = useSidebar();
    sidebarState = sidebar.state;
    toggleSidebar = sidebar.toggleSidebar;
  } catch {
    // Header can render outside the sidebar provider in isolated layouts/tests.
  }

  // Состояние для диалога информации об обновлениях
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateDetails, setUpdateDetails] = useState<{
    version: string;
    buildNumber: string;
    hasUpdate: boolean;
    swRegistrations: number;
    swActive: boolean;
    swWaiting: boolean;
    swScope: string;
    lastCheck: string;
  } | null>(null);

  const handleShowUpdateInfo = (details: {
    version: string;
    buildNumber: string;
    hasUpdate: boolean;
    swRegistrations: number;
    swActive: boolean;
    swWaiting: boolean;
    swScope: string;
    lastCheck: string;
  }) => {
    setUpdateDetails(details);
    setShowUpdateDialog(true);
  };

  const handleLogout = async () => {
    try {
      // Виброотклик на мобильных устройствах
      if (mobileInfo.isTouchDevice) {
        mobileUtils.vibrate(50);
      }
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleMobileMenuClick = () => {
    if (mobileInfo.isTouchDevice) {
      mobileUtils.vibrate(30); // Легкая вибрация для обратной связи
    }
    onMobileMenuToggle?.();
  };

  const getUserDisplayName = () => {
    return user?.email || 'Пользователь';
  };
  
  const getUserRole = () => {
    if (user?.roles && user.roles.length > 0) {
      return user.roles[0].roleName;
    }
    return 'Пользователь';
  };

  return (
    <header className={`${isMobile ? 'relative shadow-[0_6px_16px_rgba(15,23,42,0.12)] dark:shadow-none dark:border-b dark:border-white/10' : 'fixed top-0'} left-0 right-0 z-50 min-h-header bg-background mobile-safe-top`}>
      <div className="flex items-center justify-between min-h-header px-4 md:px-6">
        {/* Mobile Header: Station selector + support entry + Avatar */}
        <div className="flex items-center gap-1.5 md:hidden flex-1 min-w-0">
          <NetworkSelect
            value={selectedNetwork}
            values={selectedNetworkIds}
            onValueChange={onNetworkChange}
            onValuesChange={onNetworkIdsChange}
            className="!h-9 !py-0 text-sm min-w-0 flex-1 bg-white dark:bg-di-surface-high border border-border/20 dark:border-di-outline-variant/15 text-foreground dark:text-di-on-surface font-headline font-bold rounded-xl"
          />

          {/* Связь — наверху (Чат/Заявки/Помощь — в нижнем меню) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={openConnectionDialog}
            className="shrink-0 h-9 px-3 gap-2 bg-primary hover:bg-primary/90 shadow-[0_0_15px_rgba(37,99,235,0.4)] text-white rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all"
          >
            <Wifi className="h-3.5 w-3.5" />
            Связь
          </Button>
        </div>

        {/* Desktop Left Section: Logo + Brand + Sidebar toggle */}
        <div className="hidden md:flex items-center gap-4">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-base">TP</span>
          </div>
          <div>
            <h1 className="font-semibold text-foreground text-lg tracking-tight">TradePoint</h1>
            <p className="text-xs text-muted-foreground">v{APP_VERSION}</p>
          </div>
          {toggleSidebar && (
            <button
              onClick={toggleSidebar}
              className="ml-2 w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary dark:hover:bg-di-surface-high active:scale-90 transition-all"
              title={sidebarState === 'collapsed' ? 'Развернуть меню (Ctrl+B)' : 'Свернуть меню (Ctrl+B)'}
            >
              {sidebarState === 'collapsed' ? <ChevronsRight className="w-5 h-5" /> : <ChevronsLeft className="w-5 h-5" />}
            </button>
          )}
        </div>

        {/* Desktop Center: Context Selectors + Support Button */}
        <div className="hidden md:flex items-center justify-center gap-2">
          <NetworkSelect
            value={selectedNetwork}
            values={selectedNetworkIds}
            onValueChange={onNetworkChange}
            onValuesChange={onNetworkIdsChange}
            className="!h-11 !py-0 rounded-xl"
          />
          <PointSelect
            values={selectedTradingPoints}
            onValuesChange={onTradingPointsChange}
            onPointClick={onPointClick}
            disabled={!selectedNetwork}
            networkIds={selectedNetworkIds}
            className="inline-flex !h-11 !py-0 rounded-xl"
          />
          {/* Связь */}
          <Button
            variant="outline"
            size="sm"
            onClick={openConnectionDialog}
            className="h-11 px-3 gap-2 bg-primary/10 dark:bg-primary/20 hover:bg-primary text-primary dark:text-primary/70 hover:text-white border border-primary/30 dark:border-primary/50 hover:border-primary rounded-xl transition-all duration-200 font-medium"
            title="Связь со станциями"
          >
            <Wifi className="h-4 w-4" />
            Связь
          </Button>
          {/* Чат */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/support/interaction?tab=chat')}
            className="relative h-11 px-3 gap-2 bg-primary/10 dark:bg-primary/20 hover:bg-primary text-primary dark:text-primary/70 hover:text-white border border-primary/30 dark:border-primary/50 hover:border-primary rounded-xl transition-all duration-200 font-medium"
            title="Чат"
          >
            <MessageCircle className="h-4 w-4" />
            Чат
            {unreadCounts.chat > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                {unreadCounts.chat}
              </span>
            )}
          </Button>
          {/* Заявки */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/support/interaction?tab=tickets')}
            className="relative h-11 px-3 gap-2 bg-primary/10 dark:bg-primary/20 hover:bg-primary text-primary dark:text-primary/70 hover:text-white border border-primary/30 dark:border-primary/50 hover:border-primary rounded-xl transition-all duration-200 font-medium"
            title="Заявки"
          >
            <LifeBuoy className="h-4 w-4" />
            Заявка
            {unreadCounts.tickets > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                {unreadCounts.tickets}
              </span>
            )}
          </Button>
          {/* Помощь */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/support/interaction?tab=help')}
            className="h-11 px-3 gap-2 bg-primary/10 dark:bg-primary/20 hover:bg-primary text-primary dark:text-primary/70 hover:text-white border border-primary/30 dark:border-primary/50 hover:border-primary rounded-xl transition-all duration-200 font-medium"
            title="Помощь"
          >
            <HelpCircle className="h-4 w-4" />
            Помощь
          </Button>
        </div>

        {/* Right Section: Theme Toggle (desktop only) + User Profile */}
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0 ml-2 md:ml-0">
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          {/* User Profile */}
          <DropdownMenu onOpenChange={(open) => {
            const el = document.getElementById('user-menu-overlay');
            if (el) el.style.display = open && isMobile ? 'block' : 'none';
          }}>
            {isMobile && <div id="user-menu-overlay" className="fixed inset-0 z-40 bg-black/40 dark:bg-[#070e1b]/70 backdrop-blur-sm" style={{ display: 'none' }} />}
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-3 px-0 md:px-3 transition-all duration-200 h-9 md:h-10 hover:bg-transparent md:hover:bg-accent rounded-lg border-none"
              >
                <div className="p-2.5 bg-primary rounded-xl flex items-center justify-center">
                  <User className="text-white" />
                </div>
                <div className="hidden lg:flex flex-col items-start">
                  <span className="font-medium text-sm text-foreground leading-none">{getUserDisplayName()}</span>
                  <span className="text-xs text-muted-foreground mt-1">{getUserRole()}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-72 p-0 bg-card dark:bg-[#1c2533] border border-border/30 dark:border-[#434655]/40 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-xl"
            >
              {/* Header Section - User Info */}
              <div className="p-4 border-b border-border/20 dark:border-di-outline-variant/15">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {getUserDisplayName()}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user?.email || 'admin@tradecontrol.ru'}
                    </span>
                    <span className="text-xs text-primary dark:text-primary/70 font-medium mt-0.5">
                      {getUserRole()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-2">
                <DropdownMenuItem
                  onClick={() => navigate('/profile')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary dark:hover:bg-di-surface-high cursor-pointer transition-all duration-200 text-foreground focus:bg-secondary dark:focus:bg-di-surface-high focus:text-foreground group"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted group-hover:bg-primary/90/20 flex items-center justify-center transition-colors duration-200">
                    <User className="h-4 w-4 text-muted-foreground group-hover:text-primary/70 transition-colors duration-200" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-sm font-medium">Профиль</span>
                    <span className="text-xs text-muted-foreground/70 group-hover:text-muted-foreground">Личные данные</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={(e) => { e.preventDefault(); toggleTheme(); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary dark:hover:bg-di-surface-high cursor-pointer transition-all duration-200 text-foreground focus:bg-secondary dark:focus:bg-di-surface-high focus:text-foreground group md:hidden"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted group-hover:bg-primary/90/20 flex items-center justify-center transition-colors duration-200">
                    {theme === "dark" ? (
                      <Sun className="h-4 w-4 text-muted-foreground group-hover:text-primary/70 transition-colors duration-200" />
                    ) : (
                      <Moon className="h-4 w-4 text-muted-foreground group-hover:text-primary/70 transition-colors duration-200" />
                    )}
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-sm font-medium">{theme === "dark" ? "Светлая тема" : "Тёмная тема"}</span>
                    <span className="text-xs text-muted-foreground/70 group-hover:text-muted-foreground">Переключить оформление</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => navigate('/settings/notifications')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary dark:hover:bg-di-surface-high cursor-pointer transition-all duration-200 text-foreground focus:bg-secondary dark:focus:bg-di-surface-high focus:text-foreground group"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted group-hover:bg-primary/90/20 flex items-center justify-center transition-colors duration-200">
                    <Bell className="h-4 w-4 text-muted-foreground group-hover:text-primary/70 transition-colors duration-200" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-sm font-medium">Уведомления</span>
                    <span className="text-xs text-muted-foreground/70 group-hover:text-muted-foreground">Настройки оповещений</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem className="p-0 focus:bg-transparent">
                  <UpdateChecker onShowUpdateInfo={handleShowUpdateInfo} />
                </DropdownMenuItem>
              </div>

              {/* Footer Section - Logout */}
              <div className="p-2 border-t border-border/20 dark:border-di-outline-variant/15">
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/10 cursor-pointer transition-all duration-200 text-red-600 dark:text-red-400 hover:text-red-300 focus:bg-red-500/10 focus:text-red-300 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 group-hover:bg-red-500/20 flex items-center justify-center transition-colors duration-200">
                    <LogOut className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-sm font-medium">Выйти</span>
                    <span className="text-xs text-red-500/60 group-hover:text-red-400/80">Завершить сеанс</span>
                  </div>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <UpdateInfoDialog
        open={showUpdateDialog}
        onOpenChange={setShowUpdateDialog}
        details={updateDetails}
      />

    </header>
  );
}
