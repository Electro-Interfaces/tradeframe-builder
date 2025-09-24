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
            ? 'bg-slate-700 border-slate-500 border-2 shadow-[inset_0_-16px_0_0_rgb(37_99_235)] hover:shadow-[inset_0_-16px_0_0_rgb(37_99_235)]'
            : 'bg-slate-800 border-slate-600 hover:bg-slate-700'
        }`}
        onClick={handleClick}
      >
        <CardContent className="p-4">
          <div className="relative">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-slate-100 font-semibold text-sm truncate mb-1">{display}</p>
                <div className="flex items-center gap-1">
                  <Activity className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-200 text-sm font-medium">{transactionCount}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <div className="text-slate-200 text-sm font-semibold">{volume.toFixed(0)} л</div>
                <div className="text-slate-200 text-sm font-semibold">{cost.toLocaleString()} ₽</div>
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
      key={paymentKey}
      className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
        isSelected
          ? 'bg-slate-700 border-slate-500 border-2 shadow-[inset_0_-16px_0_0_rgb(37_99_235)] hover:shadow-[inset_0_-16px_0_0_rgb(37_99_235)]'
          : 'bg-slate-800 border-slate-600 hover:bg-slate-700'
      }`}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-slate-100 font-semibold text-base truncate pr-2">{display}</p>
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-slate-400" />
              <span className="text-slate-300 text-sm">{transactionCount}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-slate-200 text-sm font-semibold">{volume.toFixed(0)} л</div>
            <div className="text-slate-200 text-sm font-semibold">{cost.toLocaleString()} ₽</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

KPIPaymentCard.displayName = 'KPIPaymentCard';

export default KPIPaymentCard;