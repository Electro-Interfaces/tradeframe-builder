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
import { LogOut, User, Menu, Bell, Wifi, LifeBuoy, Sun, Moon } from "lucide-react";
import UpdateChecker from "@/components/common/UpdateChecker";
import UpdateInfoDialog from "@/components/common/UpdateInfoDialog";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useTheme } from "@/contexts/ThemeContext";
import { NetworkSelect } from "@/components/selects/NetworkSelect";
import { APP_VERSION } from "@/config/version";
import { PointSelect } from "@/components/selects/PointSelect";
import { useNewAuth } from "@/contexts/NewAuthContext";
import { useMobile, mobileUtils } from "@/hooks/useMobile";
import StationsConnectionDialog from "@/components/operations/StationsConnectionDialog";
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
  const { openCreateDialog } = useSupportContext();
  const mobileInfo = useMobile();
  const { theme, toggleTheme } = useTheme();

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

  // Состояние для диалога проверки связи
  const [isConnectionDialogOpen, setIsConnectionDialogOpen] = useState(false);

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
    <header className={`${isMobile ? 'relative' : 'fixed top-0'} left-0 right-0 z-50 min-h-header bg-card border-b border-border shadow-sm mobile-safe-top`}>
      <div className="flex items-center justify-between min-h-header px-4 md:px-6">
        {/* Mobile Left Section: Burger + Network Selector + Action Buttons */}
        <div className="flex items-center gap-1.5 md:hidden flex-1 min-w-0 mr-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMobileMenuClick}
            aria-label="Открыть меню"
            className={`shrink-0 h-11 w-11 bg-secondary hover:bg-accent text-foreground border border-border rounded-lg transition-all duration-200 ${mobileInfo.isTouchDevice ? 'mobile-touch-target mobile-button mobile-no-highlight' : ''}`}
          >
            <Menu className="h-4 w-4" />
          </Button>

          <NetworkSelect
            value={selectedNetwork}
            values={selectedNetworkIds}
            onValueChange={onNetworkChange}
            onValuesChange={onNetworkIdsChange}
            className="!h-9 !py-0 text-sm min-w-0 flex-1 bg-secondary/50 border-border hover:bg-accent/50 max-w-[140px]"
          />

          {/* Mobile Connection Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsConnectionDialogOpen(true)}
            aria-label="Проверить связь со станциями"
            className="shrink-0 h-11 w-11 bg-secondary hover:bg-blue-600 text-blue-500 dark:text-blue-400 hover:text-white border border-border rounded-lg transition-all duration-200"
            title="Проверить связь со станциями"
          >
            <Wifi className="h-4 w-4" />
          </Button>

          {/* Mobile Support Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={openCreateDialog}
            aria-label="Создать заявку"
            className="shrink-0 h-11 w-11 bg-secondary hover:bg-green-600 text-green-500 dark:text-green-400 hover:text-white border border-border rounded-lg transition-all duration-200"
            title="Создать заявку"
          >
            <LifeBuoy className="h-4 w-4" />
          </Button>
        </div>

        {/* Desktop Left Section: Logo + Brand */}
        <div className="hidden md:flex items-center gap-4">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-base">TC</span>
          </div>
          <div>
            <h1 className="font-semibold text-foreground text-lg tracking-tight">TradeControl</h1>
            <p className="text-xs text-muted-foreground">v{APP_VERSION}</p>
          </div>
        </div>

        {/* Desktop Center: Context Selectors + Connection Button */}
        <div className="hidden md:flex items-center justify-center gap-2">
          <NetworkSelect value={selectedNetwork} values={selectedNetworkIds} onValueChange={onNetworkChange} onValuesChange={onNetworkIdsChange} />
          <PointSelect
            values={selectedTradingPoints}
            onValuesChange={onTradingPointsChange}
            onPointClick={onPointClick}
            disabled={!selectedNetwork}
            networkIds={selectedNetworkIds}
            className="inline-flex"
          />
          {/* Desktop Connection Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsConnectionDialogOpen(true)}
            className="h-9 px-3 bg-blue-100 dark:bg-blue-600/20 hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white border border-blue-300 dark:border-blue-500/50 hover:border-blue-500 rounded-lg transition-all duration-200 font-medium"
            title="Проверить связь со станциями"
          >
            <Wifi className="h-4 w-4 mr-1.5" />
            Связь
          </Button>
          {/* Desktop Support Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={openCreateDialog}
            className="h-9 px-3 bg-green-100 dark:bg-green-600/20 hover:bg-green-600 text-green-600 dark:text-green-400 hover:text-white border border-green-300 dark:border-green-500/50 hover:border-green-500 rounded-lg transition-all duration-200 font-medium"
            title="Создать заявку в поддержку"
          >
            <LifeBuoy className="h-4 w-4 mr-1.5" />
            Заявка
          </Button>
        </div>

        {/* Right Section: Theme Toggle (desktop only) + User Profile */}
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-3 px-1.5 md:px-3 transition-all duration-200 h-9 md:h-11 hover:bg-accent rounded-lg border border-border/30 hover:border-border"
              >
                <div className="w-7 h-7 md:w-9 md:h-9 bg-blue-600 rounded-full flex items-center justify-center shadow-md ring-1 ring-border">
                  <User className="w-3.5 h-3.5 md:w-5 md:h-5 text-white" />
                </div>
                <div className="hidden lg:flex flex-col items-start">
                  <span className="font-medium text-sm text-foreground leading-none">{getUserDisplayName()}</span>
                  <span className="text-xs text-muted-foreground mt-1">{getUserRole()}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-72 p-0 bg-popover border-border shadow-xl"
            >
              {/* Header Section - User Info */}
              <div className="p-4 border-b border-border bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-md ring-2 ring-blue-500/20">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {getUserDisplayName()}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user?.email || 'admin@tradecontrol.ru'}
                    </span>
                    <span className="text-xs text-blue-500 dark:text-blue-400 font-medium mt-0.5">
                      {getUserRole()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-2">
                <DropdownMenuItem
                  onClick={() => navigate('/profile')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent cursor-pointer transition-all duration-200 text-foreground focus:bg-accent focus:text-foreground group"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted group-hover:bg-blue-500/20 flex items-center justify-center transition-colors duration-200">
                    <User className="h-4 w-4 text-muted-foreground group-hover:text-blue-400 transition-colors duration-200" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-sm font-medium">Профиль</span>
                    <span className="text-xs text-muted-foreground/70 group-hover:text-muted-foreground">Личные данные</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={(e) => { e.preventDefault(); toggleTheme(); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent cursor-pointer transition-all duration-200 text-foreground focus:bg-accent focus:text-foreground group md:hidden"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted group-hover:bg-blue-500/20 flex items-center justify-center transition-colors duration-200">
                    {theme === "dark" ? (
                      <Sun className="h-4 w-4 text-muted-foreground group-hover:text-blue-400 transition-colors duration-200" />
                    ) : (
                      <Moon className="h-4 w-4 text-muted-foreground group-hover:text-blue-400 transition-colors duration-200" />
                    )}
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-sm font-medium">{theme === "dark" ? "Светлая тема" : "Тёмная тема"}</span>
                    <span className="text-xs text-muted-foreground/70 group-hover:text-muted-foreground">Переключить оформление</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => navigate('/settings/notifications')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent cursor-pointer transition-all duration-200 text-foreground focus:bg-accent focus:text-foreground group"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted group-hover:bg-blue-500/20 flex items-center justify-center transition-colors duration-200">
                    <Bell className="h-4 w-4 text-muted-foreground group-hover:text-blue-400 transition-colors duration-200" />
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
              <div className="p-2 border-t border-border bg-popover/50">
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

      <StationsConnectionDialog
        open={isConnectionDialogOpen}
        onOpenChange={setIsConnectionDialogOpen}
      />
    </header>
  );
}