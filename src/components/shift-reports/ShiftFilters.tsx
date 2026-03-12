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
    <Card className="bg-card border-border">
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">Фильтры</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
              >
                Очистить фильтры
              </Button>
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRefresh();
                  }}
                  disabled={loading}
                  className="border-border text-foreground hover:bg-secondary"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              )}
              {filtersOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Дата начала */}
              <div>
                <Label className="text-xs text-muted-foreground">
                  Дата от
                </Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Дата до */}
              <div>
                <Label className="text-xs text-muted-foreground">
                  Дата до
                </Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleDateToChange(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Статус смены */}
              <div>
                <Label htmlFor="status" className="text-xs text-muted-foreground">
                  Статус
                </Label>
                <Select value={filters.status} onValueChange={handleStatusChange}>
                  <SelectTrigger id="status" className="mt-1">
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
              <div>
                <Label htmlFor="shiftNumber" className="text-xs text-muted-foreground">
                  Номер смены
                </Label>
                <Input
                  id="shiftNumber"
                  type="number"
                  placeholder="Введите номер"
                  value={filters.shiftNumber || ''}
                  onChange={(e) => handleShiftNumberChange(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ShiftFilters;
