import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut, User, Menu, Network, MapPin, Bell, MessageCircle } from "lucide-react";

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
  const networks = [
    { value: "network1", label: "Сеть АЗС №1" },
    { value: "network2", label: "Сеть АЗС №2" },
    { value: "network3", label: "Автодор" },
  ];

  const tradingPoints = [
    { value: "point1", label: "АЗС №001 - Центральная" },
    { value: "point2", label: "АЗС №002 - Северная" },
    { value: "point3", label: "АЗС №003 - Южная" },
  ];

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
          
          <Select value={selectedNetwork} onValueChange={onNetworkChange}>
            <SelectTrigger className="h-8 text-xs border-none bg-transparent hover:bg-accent min-w-0 flex-1">
              <Network className="h-3 w-3 mr-1 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Выберите сеть" className="truncate" />
            </SelectTrigger>
            <SelectContent>
              {networks.map((network) => (
                <SelectItem key={network.value} value={network.value}>
                  {network.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <div className="hidden md:flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <Select value={selectedNetwork} onValueChange={onNetworkChange}>
              <SelectTrigger className="w-56 h-10">
                <Network className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Выберите сеть" />
              </SelectTrigger>
              <SelectContent>
                {networks.map((network) => (
                  <SelectItem key={network.value} value={network.value}>
                    {network.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedNetwork && (
              <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
                Активна
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select 
              value={selectedTradingPoint} 
              onValueChange={onTradingPointChange}
              disabled={!selectedNetwork}
            >
              <SelectTrigger className="w-56 h-10">
                <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue 
                  placeholder={selectedNetwork ? "Выберите торговую точку" : "Сначала выберите сеть"} 
                />
              </SelectTrigger>
              <SelectContent>
                {tradingPoints.map((point) => (
                  <SelectItem key={point.value} value={point.value}>
                    {point.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTradingPoint && (
              <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                Выбрана
              </span>
            )}
          </div>
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
              <DropdownMenuItem>
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