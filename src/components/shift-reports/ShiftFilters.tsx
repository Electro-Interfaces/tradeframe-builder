import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Filter, RefreshCw } from "lucide-react";
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
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 md:p-6 space-y-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <Filter className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-white">Фильтры</h2>
        </div>
        <div className="flex gap-2">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
          )}
        </div>
      </div>

      {/* Фильтры */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Дата начала */}
        <div>
          <Label className="text-sm text-slate-300">
            Дата начала
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
                <Input
                  placeholder="ДД.ММ.ГГГГ"
                  value={dateFromInput || (filters.dateFrom ? format(new Date(filters.dateFrom), "dd.MM.yyyy") : '')}
                  onChange={handleDateFromInputChange}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
                onSelect={(date) => {
                  if (date) {
                    const isoDate = date.toISOString().split('T')[0];
                    handleDateFromChange(isoDate);
                    setDateFromInput('');
                  }
                }}
                initialFocus
                locale={ru}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Дата окончания */}
        <div>
          <Label className="text-sm text-slate-300">
            Дата окончания
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
                <Input
                  placeholder="ДД.ММ.ГГГГ"
                  value={dateToInput || (filters.dateTo ? format(new Date(filters.dateTo), "dd.MM.yyyy") : '')}
                  onChange={handleDateToInputChange}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
                onSelect={(date) => {
                  if (date) {
                    const isoDate = date.toISOString().split('T')[0];
                    handleDateToChange(isoDate);
                    setDateToInput('');
                  }
                }}
                initialFocus
                locale={ru}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Статус смены */}
        <div>
          <Label htmlFor="status" className="text-sm text-slate-300">
            Статус смены
          </Label>
          <Select value={filters.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
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
          <Label htmlFor="shiftNumber" className="text-sm text-slate-300">
            Номер смены
          </Label>
          <Input
            id="shiftNumber"
            type="number"
            placeholder="№ смены"
            value={filters.shiftNumber || ''}
            onChange={(e) => handleShiftNumberChange(e.target.value)}
            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Кнопка сброса */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={handleReset}
          className="border-slate-600 text-white hover:bg-slate-700"
        >
          <Filter className="w-4 h-4 mr-2" />
          Сбросить фильтры
        </Button>
      </div>
    </div>
  );
};

export default ShiftFilters;
