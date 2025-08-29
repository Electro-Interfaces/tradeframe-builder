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
import { Settings, LogOut, User } from "lucide-react";

interface HeaderProps {
  selectedNetwork: string;
  selectedTradingPoint: string;
  onNetworkChange: (value: string) => void;
  onTradingPointChange: (value: string) => void;
}

export function Header({ 
  selectedNetwork, 
  selectedTradingPoint, 
  onNetworkChange, 
  onTradingPointChange 
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
    <header className="fixed top-0 left-0 right-0 z-50 h-header bg-background border-b border-border">
      <div className="flex items-center justify-between h-full px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">TC</span>
          </div>
          <div>
            <h1 className="font-semibold text-foreground">TradeControl</h1>
            <p className="text-xs text-muted-foreground">v2.0</p>
          </div>
        </div>

        {/* Context Selectors */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Сеть</label>
            <Select value={selectedNetwork} onValueChange={onNetworkChange}>
              <SelectTrigger className="w-48">
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
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Торговая точка</label>
            <Select 
              value={selectedTradingPoint} 
              onValueChange={onTradingPointChange}
              disabled={!selectedNetwork}
            >
              <SelectTrigger className="w-48">
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
          </div>
        </div>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 px-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  А
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">Андрей</span>
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
    </header>
  );
}