import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Activity } from "lucide-react";

interface KPIPaymentCardProps {
  paymentKey: string;
  display: string;
  isSelected: boolean;
  isMobile: boolean;
  volume: number;
  cost: number;
  transactionCount: number;
  onClick: (paymentKey: string) => void;
}

const formatCompact = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
};

const KPIPaymentCard = React.memo(({ paymentKey, display, isSelected, isMobile, volume, cost, transactionCount, onClick }: KPIPaymentCardProps) => {
  const handleClick = React.useCallback(() => {
    onClick(paymentKey);
  }, [onClick, paymentKey]);

  if (isMobile) {
    return (
      <Card
        key={paymentKey}
        className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
          isSelected
            ? 'bg-secondary border-border border-2 shadow-[inset_0_-16px_0_0_rgb(37_99_235)] hover:shadow-[inset_0_-16px_0_0_rgb(37_99_235)]'
            : 'bg-card border-border hover:bg-secondary'
        }`}
        onClick={handleClick}
      >
        <CardContent className="p-2.5">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <p className="text-foreground font-semibold text-xs truncate">{display}</p>
              <div className="flex items-center gap-0.5 ml-1 flex-shrink-0">
                <Activity className="w-2.5 h-2.5 text-muted-foreground" />
                <span className="text-foreground text-[10px] font-medium">{transactionCount}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">{formatCompact(volume)} л</span>
              <span className="text-foreground font-semibold">{formatCompact(cost)} ₽</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Desktop version — compact chip-style
  return (
    <Card
      key={paymentKey}
      className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
        isSelected
          ? 'bg-secondary border-border border-2 shadow-[inset_0_-16px_0_0_rgb(37_99_235)] hover:shadow-[inset_0_-16px_0_0_rgb(37_99_235)]'
          : 'bg-card border-border hover:bg-secondary'
      }`}
      onClick={handleClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-foreground font-semibold text-sm truncate">{display}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Activity className="w-3 h-3 text-muted-foreground" />
              <span className="text-foreground/80 text-xs">{transactionCount}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-foreground/80 text-xs">{formatCompact(volume)} л</div>
            <div className="text-foreground text-xs font-semibold">{formatCompact(cost)} ₽</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

KPIPaymentCard.displayName = 'KPIPaymentCard';

export default KPIPaymentCard;
