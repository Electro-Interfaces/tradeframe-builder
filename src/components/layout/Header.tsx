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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-header bg-background/95 backdrop-blur-sm border-b border-border shadow-soft">
      <div className="flex items-center justify-between h-full px-3 md:px-6">
        {/* Mobile Left Section: Burger + Network Selector */}
        <div className="flex items-center gap-2 md:hidden flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileMenuToggle}
            className="shrink-0 h-8 w-8"
          >
            <Menu className="h-4 w-4" />
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
            className="hidden md:inline-flex"
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
              <Button variant="ghost" className="flex items-center gap-1 px-1 md:px-3 transition-colors duration-200 h-8 md:h-auto">
                <Avatar className="w-7 h-7 md:w-8 md:h-8 rounded-full">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    А
                  </AvatarFallback>
                </Avatar>
                <span className="hidden lg:block font-medium text-sm">Андрей</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                Профиль
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Настройки
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}