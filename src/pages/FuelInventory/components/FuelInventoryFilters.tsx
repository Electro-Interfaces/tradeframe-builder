import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FILTER_PANEL_CONTROL_CLASS,
  FILTER_PANEL_FIELD_CLASS,
  FILTER_PANEL_FIELDS_CLASS,
} from '@/components/common/filterPanel';

interface FuelInventoryFiltersProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
}

// Период применяется автоматически (с задержкой) — отдельной кнопки «Применить»
// нет, как и на остальных страницах. Свежие данные — кнопкой «Обновить» в шапке.
export const FuelInventoryFilters = ({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
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
    </div>
  );
};
