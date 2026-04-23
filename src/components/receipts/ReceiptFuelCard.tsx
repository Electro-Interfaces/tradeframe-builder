import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Fuel } from "lucide-react";

interface ReceiptFuelCardProps {
  fuel: string;
  isSelected: boolean;
  isMobile: boolean;
  volume: number;
  amount: number;
  receiptCount: number;
  onClick: (fuel: string) => void;
}

const ReceiptFuelCard = React.memo(({ fuel, isSelected, isMobile, volume, amount, receiptCount, onClick }: ReceiptFuelCardProps) => {
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
                  <Fuel className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground text-sm font-medium">{receiptCount}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <div className="text-foreground text-sm font-semibold">{volume.toFixed(0)} л</div>
                <div className="text-foreground text-sm font-semibold">{amount.toFixed(0)} кг</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Desktop version — Equipment style
  return (
    <div
      className={`cursor-pointer transition-all duration-200 rounded-xl p-4 ${
        isSelected
          ? 'bg-primary/10 border border-primary/30'
          : 'bg-di-surface-low hover:bg-di-surface-high'
      }`}
      onClick={handleClick}
    >
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{fuel}</span>
      <div className="font-headline text-xl font-extrabold text-foreground tracking-tight leading-tight">
        {volume.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} <span className="text-xs font-normal text-muted-foreground">л</span>
      </div>
      <div className="text-[10px] text-muted-foreground leading-tight">
        {amount.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} кг · <Fuel className="w-2.5 h-2.5 inline" /> {receiptCount}
      </div>
    </div>
  );
});

ReceiptFuelCard.displayName = 'ReceiptFuelCard';

export default ReceiptFuelCard;
