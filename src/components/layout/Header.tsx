import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut, User, Menu, Bell, MessageCircle, Info } from "lucide-react";
import UpdateChecker from "@/components/common/UpdateChecker";
import UpdateInfoDialog from "@/components/common/UpdateInfoDialog";
import { NetworkSelect } from "@/components/selects/NetworkSelect";
import { PointSelect } from "@/components/selects/PointSelect";
import { useAuth } from "@/contexts/AuthContext";
import { useMobile, mobileUtils } from "@/hooks/useMobile";

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
  const { user, logout } = useAuth();
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
    console.log('🔄 Header: Получили данные для диалога обновлений:', details);
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
  
  // Получаем инициалы и имя пользователя
  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return user.firstName[0] + user.lastName[0];
    }
    if (user?.name) {
      const names = user.name.split(' ');
      if (names.length >= 2) {
        return names[0][0] + names[1][0];
      }
      return user.name[0];
    }
    return 'У';
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
    <header className={`${isMobile ? 'relative' : 'fixed'} top-0 left-0 right-0 z-50 h-header bg-slate-900/98 backdrop-blur-md border-b border-slate-700/50 shadow-lg`}>
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        {/* Mobile Left Section: Burger + Network Selector */}
        <div className="flex items-center gap-3 md:hidden flex-1 min-w-0">
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
        </div>

        {/* Desktop Left Section: Logo + Brand */}
        <div className="hidden md:flex items-center gap-4">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md relative">
            <span className="text-white font-bold text-sm">TF</span>
            <span className="absolute -top-1 -right-1 text-white font-bold text-xs bg-blue-400 rounded-full w-4 h-4 flex items-center justify-center">24</span>
          </div>
          <div>
            <h1 className="font-semibold text-white text-lg tracking-tight">TradeFrame</h1>
            <p className="text-xs text-slate-400">v1.5.5</p>
          </div>
        </div>

        {/* Desktop Center: Context Selectors */}
        <div className="hidden md:flex items-center justify-center gap-2">
          <NetworkSelect value={selectedNetwork} onValueChange={onNetworkChange} />
          <PointSelect 
            value={selectedTradingPoint} 
            onValueChange={onTradingPointChange}
            disabled={!selectedNetwork}
            networkId={selectedNetwork}
            className="inline-flex"
          />
        </div>

        {/* Right Section: Notifications + User Profile */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile Quick Actions */}
          <div className="flex md:hidden items-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-slate-800/50 rounded-lg">
              <Bell className="h-4 w-4 text-slate-300" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-slate-800/50 rounded-lg">
              <MessageCircle className="h-4 w-4 text-slate-300" />
            </Button>
          </div>

          {/* Desktop Quick Actions */}
          <div className="hidden md:flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-slate-800/50 rounded-lg">
              <Bell className="h-5 w-5 text-slate-300 hover:text-white" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-slate-800/50 rounded-lg">
              <MessageCircle className="h-5 w-5 text-slate-300 hover:text-white" />
            </Button>
          </div>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-3 px-2 md:px-3 transition-all duration-200 h-10 md:h-11 hover:bg-slate-800/50 rounded-lg border border-slate-700/30 hover:border-slate-600/50"
              >
                <Avatar className="w-8 h-8 md:w-9 md:h-9 rounded-lg shadow-md ring-1 ring-slate-700/50">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-semibold rounded-lg">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex flex-col items-start">
                  <span className="font-medium text-sm text-white leading-none">{getUserDisplayName()}</span>
                  <span className="text-xs text-slate-400 mt-1">{getUserRole()}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 shadow-lg border border-border/50">
              <div className="flex items-center gap-3 p-3 mb-2 bg-muted/30 rounded-lg">
                <Avatar className="w-10 h-10 rounded-lg">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold rounded-lg">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{getUserDisplayName()}</span>
                  <span className="text-xs text-muted-foreground">{user?.email || 'admin@tradecontrol.ru'}</span>
                </div>
              </div>
              <DropdownMenuItem
                onClick={() => navigate('/profile')}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 cursor-pointer"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Профиль</span>
              </DropdownMenuItem>

              <DropdownMenuItem className="p-0">
                <UpdateChecker onShowUpdateInfo={handleShowUpdateInfo} />
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem 
                onClick={handleLogout} 
                className="flex items-center gap-3 p-2 rounded-md hover:bg-destructive/10 cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                <span>Выйти</span>
              </DropdownMenuItem>
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