/**
 * Компонент фильтров для остатков топлива
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw } from 'lucide-react';

interface FuelInventoryFiltersProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onApply: () => void;
  loading?: boolean;
}

export const FuelInventoryFilters = ({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onApply,
  loading = false
}: FuelInventoryFiltersProps) => {
  return (
    <Card className="bg-card border-border">
      <CardContent className="py-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* Дата от */}
          <div>
            <Label htmlFor="date-from" className="text-xs text-muted-foreground">Дата от</Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Дата до */}
          <div>
            <Label htmlFor="date-to" className="text-xs text-muted-foreground">Дата до</Label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Кнопка применить */}
          <div className="flex items-end">
            <Button
              onClick={onApply}
              disabled={loading}
              className="w-full gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Применить
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
