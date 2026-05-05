import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw } from 'lucide-react';
import {
  FILTER_PANEL_ACTION_FIELD_CLASS,
  FILTER_PANEL_CONTROL_CLASS,
  FILTER_PANEL_FIELD_CLASS,
  FILTER_PANEL_FIELDS_CLASS,
} from '@/components/common/filterPanel';

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
    <div className={FILTER_PANEL_FIELDS_CLASS}>
          {/* Дата от */}
          <div className={FILTER_PANEL_FIELD_CLASS}>
            <Label htmlFor="date-from" className="text-xs text-muted-foreground">Дата от</Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className={FILTER_PANEL_CONTROL_CLASS}
            />
          </div>

          {/* Дата до */}
          <div className={FILTER_PANEL_FIELD_CLASS}>
            <Label htmlFor="date-to" className="text-xs text-muted-foreground">Дата до</Label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className={FILTER_PANEL_CONTROL_CLASS}
            />
          </div>

          {/* Кнопка применить */}
          <div className={`${FILTER_PANEL_ACTION_FIELD_CLASS} flex items-end`}>
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
  );
};
