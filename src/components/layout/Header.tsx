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
import { LogOut, User, Menu, Bell, Wifi } from "lucide-react";
import UpdateChecker from "@/components/common/UpdateChecker";
import UpdateInfoDialog from "@/components/common/UpdateInfoDialog";
import { NetworkSelect } from "@/components/selects/NetworkSelect";
import { APP_VERSION } from "@/config/version";
import { PointSelect } from "@/components/selects/PointSelect";
import { useNewAuth } from "@/contexts/NewAuthContext";
import { useMobile, mobileUtils } from "@/hooks/useMobile";
import StationsConnectionDialog from "@/components/operations/StationsConnectionDialog";

interface HeaderProps {
  selectedNetwork: string;
  selectedTradingPoint: string;
  onNetworkChange: (value: string) => void;
  onTradingPointChange: (value: string) => void;
  onMobileMenuToggle?: () => void;
  isMobile?: boolean;
}

export function Header({
  selectedNetwork,
  selectedTradingPoint,
  onNetworkChange,
  onTradingPointChange,
  onMobileMenuToggle,
  isMobile = false
}: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useNewAuth();
  const mobileInfo = useMobile();

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
    <header className={`${isMobile ? 'relative' : 'fixed top-0'} left-0 right-0 z-50 min-h-header bg-slate-900 border-b border-slate-700/50 shadow-lg mobile-safe-top`}>
      <div className="flex items-center justify-between min-h-header px-4 md:px-6">
        {/* Mobile Left Section: Burger + Network Selector + Connection Button */}
        <div className="flex items-center gap-2 md:hidden flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMobileMenuClick}
            className={`shrink-0 h-10 w-10 bg-slate-800/80 hover:bg-slate-700 text-white border border-slate-600/50 rounded-lg transition-all duration-200 ${mobileInfo.isTouchDevice ? 'mobile-touch-target mobile-button mobile-no-highlight' : ''}`}
          >
            <Menu className="h-4 w-4" />
          </Button>

          <NetworkSelect
            value={selectedNetwork}
            onValueChange={onNetworkChange}
            className="!h-10 !py-0 text-sm min-w-0 flex-1 bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50"
          />

          {/* Mobile Connection Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsConnectionDialogOpen(true)}
            className="shrink-0 h-10 w-10 bg-slate-800/80 hover:bg-blue-600 text-blue-400 hover:text-white border border-slate-600/50 rounded-lg transition-all duration-200"
            title="Проверить связь со станциями"
          >
            <Wifi className="h-4 w-4" />
          </Button>
        </div>

        {/* Desktop Left Section: Logo + Brand */}
        <div className="hidden md:flex items-center gap-4">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-base">TF</span>
          </div>
          <div>
            <h1 className="font-semibold text-white text-lg tracking-tight">TradeFrame</h1>
            <p className="text-xs text-slate-400">v{APP_VERSION}</p>
          </div>
        </div>

        {/* Desktop Center: Context Selectors + Connection Button */}
        <div className="hidden md:flex items-center justify-center gap-2">
          <NetworkSelect value={selectedNetwork} onValueChange={onNetworkChange} />
          <PointSelect 
            value={selectedTradingPoint} 
            onValueChange={onTradingPointChange}
            disabled={!selectedNetwork}
            networkId={selectedNetwork}
            className="inline-flex"
          />
          {/* Desktop Connection Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsConnectionDialogOpen(true)}
            className="h-9 px-3 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/50 hover:border-blue-500 rounded-lg transition-all duration-200 font-medium"
            title="Проверить связь со станциями"
          >
            <Wifi className="h-4 w-4 mr-1.5" />
            Связь
          </Button>
        </div>

        {/* Right Section: User Profile */}
        <div className="flex items-center gap-2 shrink-0">
          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-3 px-2 md:px-3 transition-all duration-200 h-10 md:h-11 hover:bg-slate-800/50 rounded-lg border border-slate-700/30 hover:border-slate-600/50"
              >
                <div className="w-8 h-8 md:w-9 md:h-9 bg-blue-600 rounded-full flex items-center justify-center shadow-md ring-1 ring-slate-700/50">
                  <User className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div className="hidden lg:flex flex-col items-start">
                  <span className="font-medium text-sm text-white leading-none">{getUserDisplayName()}</span>
                  <span className="text-xs text-slate-400 mt-1">{getUserRole()}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-72 p-0 bg-slate-900 border-slate-700/50 shadow-xl"
            >
              {/* Header Section - User Info */}
              <div className="p-4 border-b border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-md ring-2 ring-blue-500/20">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-semibold text-sm text-white truncate">
                      {getUserDisplayName()}
                    </span>
                    <span className="text-xs text-slate-400 truncate">
                      {user?.email || 'admin@tradecontrol.ru'}
                    </span>
                    <span className="text-xs text-blue-400 font-medium mt-0.5">
                      {getUserRole()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-2">
                <DropdownMenuItem
                  onClick={() => navigate('/profile')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/80 cursor-pointer transition-all duration-200 text-slate-200 hover:text-white focus:bg-slate-800/80 focus:text-white group"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-800/50 group-hover:bg-blue-500/20 flex items-center justify-center transition-colors duration-200">
                    <User className="h-4 w-4 text-slate-400 group-hover:text-blue-400 transition-colors duration-200" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-sm font-medium">Профиль</span>
                    <span className="text-xs text-slate-500 group-hover:text-slate-400">Личные данные</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => navigate('/settings/notifications')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/80 cursor-pointer transition-all duration-200 text-slate-200 hover:text-white focus:bg-slate-800/80 focus:text-white group"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-800/50 group-hover:bg-blue-500/20 flex items-center justify-center transition-colors duration-200">
                    <Bell className="h-4 w-4 text-slate-400 group-hover:text-blue-400 transition-colors duration-200" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-sm font-medium">Уведомления</span>
                    <span className="text-xs text-slate-500 group-hover:text-slate-400">Настройки оповещений</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem className="p-0 focus:bg-transparent">
                  <UpdateChecker onShowUpdateInfo={handleShowUpdateInfo} />
                </DropdownMenuItem>
              </div>

              {/* Footer Section - Logout */}
              <div className="p-2 border-t border-slate-700/50 bg-slate-900/50">
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/10 cursor-pointer transition-all duration-200 text-red-400 hover:text-red-300 focus:bg-red-500/10 focus:text-red-300 group"
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