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
import { Settings, LogOut, User, Menu, Bell, MessageCircle } from "lucide-react";
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
    <header className="fixed top-0 left-0 right-0 z-50 h-header bg-background/95 backdrop-blur-sm border-b border-border shadow-soft">
      <div className="flex items-center justify-between h-full px-3 md:px-6">
        {/* Mobile Left Section: Burger + Network Selector */}
        <div className="flex items-center gap-2 md:hidden flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMobileMenuClick}
            className={`shrink-0 h-10 w-10 bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 ${mobileInfo.isTouchDevice ? 'mobile-touch-target mobile-button mobile-no-highlight' : ''}`}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <NetworkSelect 
            value={selectedNetwork} 
            onValueChange={onNetworkChange}
            className="h-8 text-xs min-w-0 flex-1"
          />
        </div>

        {/* Desktop Left Section: Logo + Brand */}
        <div className="hidden md:flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">TC</span>
          </div>
          <div>
            <h1 className="font-semibold text-foreground text-lg">TradeControl</h1>
            <p className="text-xs text-muted-foreground">v2.0</p>
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
        <div className="flex items-center gap-1 shrink-0">
          {/* Mobile Quick Actions */}
          <div className="flex md:hidden items-center">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>

          {/* Desktop Quick Actions */}
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <MessageCircle className="h-5 w-5" />
            </Button>
          </div>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 px-2 md:px-3 transition-all duration-200 h-9 md:h-10 hover:bg-accent/50 rounded-lg border border-transparent hover:border-border"
              >
                <Avatar className="w-8 h-8 md:w-9 md:h-9 rounded-lg shadow-sm ring-2 ring-background">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-semibold rounded-lg">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex flex-col items-start">
                  <span className="font-medium text-sm text-foreground leading-none">{getUserDisplayName()}</span>
                  <span className="text-xs text-muted-foreground mt-1">{getUserRole()}</span>
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
              <DropdownMenuItem 
                className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 cursor-pointer"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span>Настройки</span>
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
    </header>
  );
}