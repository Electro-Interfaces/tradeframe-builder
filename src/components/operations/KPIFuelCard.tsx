import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Activity } from "lucide-react";

interface KPIFuelCardProps {
  fuel: string;
  isSelected: boolean;
  isMobile: boolean;
  volume: number;
  cost: number;
  transactionCount: number;
  onClick: (fuel: string) => void;
}

const KPIFuelCard = React.memo(({ fuel, isSelected, isMobile, volume, cost, transactionCount, onClick }: KPIFuelCardProps) => {
  const handleClick = React.useCallback(() => {
    onClick(fuel);
  }, [onClick, fuel]);

  if (isMobile) {
    return (
      <Card
        key={fuel}
        className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
          isSelected
            ? 'bg-secondary border-border border-2 shadow-[inset_0_-16px_0_0_rgb(37_99_235)] hover:shadow-[inset_0_-16px_0_0_rgb(37_99_235)]'
            : 'bg-card border-border hover:bg-secondary'
        }`}
        onClick={handleClick}
      >
        <CardContent className="p-4">
          <div className="relative">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-semibold text-sm truncate mb-1">{fuel}</p>
                <div className="flex items-center gap-1">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground text-sm font-medium">{transactionCount}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <div className="text-foreground text-sm font-semibold">{volume.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} л</div>
                <div className="text-foreground text-sm font-semibold">{cost.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Desktop version
  return (
    <Card
      key={fuel}
      className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
        isSelected
          ? 'bg-secondary border-border border-2 shadow-[inset_0_-16px_0_0_rgb(37_99_235)] hover:shadow-[inset_0_-16px_0_0_rgb(37_99_235)]'
          : 'bg-card border-border hover:bg-secondary'
      }`}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-foreground font-semibold text-base truncate pr-2">{fuel}</p>
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-muted-foreground" />
              <span className="text-foreground/80 text-sm">{transactionCount}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-foreground text-sm font-semibold">{volume.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} л</div>
            <div className="text-foreground text-sm font-semibold">{cost.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

KPIFuelCard.displayName = 'KPIFuelCard';

export default KPIFuelCard;