import { HelpCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getFuelLegendItems } from '@/utils/fuelColors';

export function FuelLegend() {
  const items = getFuelLegendItems();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground">
          <HelpCircle className="h-4 w-4 mr-1" />
          Топливо
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 bg-card border-border">
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium text-foreground">Легенда топлива</div>
            <div className="text-xs text-muted-foreground">Цвет и сокращение используются в таблицах и графиках</div>
          </div>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={`${item.label}-${item.name}`} className="flex items-center gap-3">
                <span className={`inline-flex items-center justify-center min-w-8 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase text-white ${item.bg}`}>
                  {item.label}
                </span>
                <span className="text-sm text-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
