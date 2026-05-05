import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

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

  const containerClassName = isSelected
    ? 'bg-primary/10 dark:bg-primary/20 border-primary/40'
    : 'bg-card border-border hover:bg-secondary/40';

  const contentClassName = isMobile ? 'p-3' : 'p-3 sm:p-4';

  return (
    <Card
      key={fuel}
      className={`cursor-pointer transition-all duration-200 ${containerClassName}`}
      onClick={handleClick}
    >
      <CardContent className={contentClassName}>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{fuel}</p>
            <p className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-foreground`}>
              {volume.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} л
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{amount.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} кг</span>
              <span>•</span>
              <span>{receiptCount} шт.</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

ReceiptFuelCard.displayName = 'ReceiptFuelCard';

export default ReceiptFuelCard;
