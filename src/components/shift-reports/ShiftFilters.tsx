import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar as CalendarIcon, Filter, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parse, isValid } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { ShiftFilters as ShiftFiltersType } from '@/types/shift-reports-v2';
import {
  FILTER_PANEL_CLASS,
  FILTER_PANEL_CONTROL_CLASS,
  FILTER_PANEL_FIELD_CLASS,
  FILTER_PANEL_FIELDS_CLASS,
  FILTER_PANEL_HEADER_CLASS,
  FILTER_PANEL_TITLE_CLASS,
} from '@/components/common/filterPanel';

interface ShiftFiltersProps {
  filters: ShiftFiltersType;
  onFiltersChange: (filters: ShiftFiltersType) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

const ShiftFilters: React.FC<ShiftFiltersProps> = ({
  filters,
  onFiltersChange,
  onRefresh,
  loading = false,
}) => {
  const [dateFromInput, setDateFromInput] = useState('');
  const [dateToInput, setDateToInput] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(true);

  const handleDateFromChange = (value: string) => {
    onFiltersChange({ ...filters, dateFrom: value });
  };

  const handleDateToChange = (value: string) => {
    onFiltersChange({ ...filters, dateTo: value });
  };

  const handleDateFromInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDateFromInput(value);

    // Попробуем распарсить дату в формате ДД.ММ.ГГГГ
    const parsedDate = parse(value, 'dd.MM.yyyy', new Date());
    if (isValid(parsedDate)) {
      const isoDate = parsedDate.toISOString().split('T')[0];
      handleDateFromChange(isoDate);
    }
  };

  const handleDateToInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDateToInput(value);

    // Попробуем распарсить дату в формате ДД.ММ.ГГГГ
    const parsedDate = parse(value, 'dd.MM.yyyy', new Date());
    if (isValid(parsedDate)) {
      const isoDate = parsedDate.toISOString().split('T')[0];
      handleDateToChange(isoDate);
    }
  };

  const handleStatusChange = (value: string) => {
    onFiltersChange({ ...filters, status: value as any });
  };

  const handleShiftNumberChange = (value: string) => {
    const num = value ? parseInt(value, 10) : undefined;
    onFiltersChange({ ...filters, shiftNumber: num });
  };

  const handleReset = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const today = new Date();

    onFiltersChange({
      dateFrom: yesterday.toISOString().split('T')[0],
      dateTo: today.toISOString().split('T')[0],
      status: 'all',
      shiftNumber: undefined,
    });
  };

  return (
    <div className={FILTER_PANEL_CLASS}>
      <div className={FILTER_PANEL_HEADER_CLASS}>
        <div className={FILTER_PANEL_TITLE_CLASS}>
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">Фильтры</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
        >
          Очистить фильтры
        </Button>
      </div>
      <div className={FILTER_PANEL_FIELDS_CLASS}>
              {/* Дата начала */}
              <div className={FILTER_PANEL_FIELD_CLASS}>
                <Label className="text-xs text-muted-foreground">
                  Дата от
                </Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  className={FILTER_PANEL_CONTROL_CLASS}
                />
              </div>

              {/* Дата до */}
              <div className={FILTER_PANEL_FIELD_CLASS}>
                <Label className="text-xs text-muted-foreground">
                  Дата до
                </Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleDateToChange(e.target.value)}
                  className={FILTER_PANEL_CONTROL_CLASS}
                />
              </div>

              {/* Статус смены */}
              <div className={FILTER_PANEL_FIELD_CLASS}>
                <Label htmlFor="status" className="text-xs text-muted-foreground">
                  Статус
                </Label>
                <Select value={filters.status} onValueChange={handleStatusChange}>
                  <SelectTrigger id="status" className={FILTER_PANEL_CONTROL_CLASS}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="open">Открыта</SelectItem>
                    <SelectItem value="closed">Закрыта</SelectItem>
                    <SelectItem value="synchronized">Синхронизирована</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Номер смены */}
              <div className={FILTER_PANEL_FIELD_CLASS}>
                <Label htmlFor="shiftNumber" className="text-xs text-muted-foreground">
                  Номер смены
                </Label>
                <Input
                  id="shiftNumber"
                  type="number"
                  placeholder="Введите номер"
                  value={filters.shiftNumber || ''}
                  onChange={(e) => handleShiftNumberChange(e.target.value)}
                  className={FILTER_PANEL_CONTROL_CLASS}
                />
              </div>
      </div>
    </div>
  );
};

export default ShiftFilters;
