/**
 * Компонент выбора периода для дашборда
 *
 * Поддерживает пресеты и раздельный выбор начальной/конечной даты
 */

import { useState, useEffect } from 'react';
import { Calendar, RefreshCw, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { PeriodPreset, PeriodSelection } from '@/types/shift-dashboard';
import { PRESET_LABELS } from '@/hooks/useDashboardPeriod';
import { ru } from 'date-fns/locale';

interface DashboardPeriodSelectorProps {
  /** Текущий выбор периода */
  period: PeriodSelection;

  /** Метки для отображения */
  labels: {
    period: string;
  };

  /** Установить пресет */
  onPresetChange: (preset: PeriodPreset) => void;

  /** Установить произвольные даты */
  onCustomDatesChange: (dateFrom: string, dateTo: string) => void;

  /** Обновить данные */
  onRefresh: () => void;

  /** Флаг загрузки */
  isLoading?: boolean;

  /** Дополнительный класс */
  className?: string;
}

const presets: PeriodPreset[] = ['today', 'yesterday', 'week', 'month', 'quarter'];

/**
 * Форматирует дату для кнопки
 */
const formatDateShort = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Форматирует период для наглядного отображения
 * Всегда показывает год и конкретные числа
 */
const formatPeriodLabel = (period: PeriodSelection): string => {
  const fromDate = new Date(period.dateFrom);
  const toDate = new Date(period.dateTo);

  // Всегда показываем полную дату с годом
  const formatFull: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };

  const fromStr = fromDate.toLocaleDateString('ru-RU', formatFull);
  const toStr = toDate.toLocaleDateString('ru-RU', formatFull);

  if (period.dateFrom === period.dateTo) {
    return fromStr;
  }

  return `с ${fromStr} по ${toStr}`;
};

/**
 * Вычисляет количество дней в периоде
 */
const calculateDays = (period: PeriodSelection): number => {
  const from = new Date(period.dateFrom);
  const to = new Date(period.dateTo);
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

export function DashboardPeriodSelector({
  period,
  labels,
  onPresetChange,
  onCustomDatesChange,
  onRefresh,
  isLoading = false,
  className,
}: DashboardPeriodSelectorProps) {
  // Раздельные состояния для начальной и конечной даты
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    period.dateFrom ? new Date(period.dateFrom) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    period.dateTo ? new Date(period.dateTo) : undefined
  );

  // Синхронизация с внешним состоянием
  useEffect(() => {
    setDateFrom(period.dateFrom ? new Date(period.dateFrom) : undefined);
    setDateTo(period.dateTo ? new Date(period.dateTo) : undefined);
  }, [period.dateFrom, period.dateTo]);

  const handlePresetClick = (preset: PeriodPreset) => {
    onPresetChange(preset);
  };

  // Форматирует дату в YYYY-MM-DD без сдвига таймзоны
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Выбор начальной даты
  const handleFromSelect = (date: Date | undefined) => {
    if (!date) return;
    setDateFrom(date);
    setFromOpen(false);

    // Если конечная дата раньше начальной, сдвигаем её
    const newTo = dateTo && dateTo >= date ? dateTo : date;
    setDateTo(newTo);
    onCustomDatesChange(formatDate(date), formatDate(newTo));
  };

  // Выбор конечной даты
  const handleToSelect = (date: Date | undefined) => {
    if (!date) return;
    setDateTo(date);
    setToOpen(false);

    // Если начальная дата позже конечной, сдвигаем её
    const newFrom = dateFrom && dateFrom <= date ? dateFrom : date;
    setDateFrom(newFrom);
    onCustomDatesChange(formatDate(newFrom), formatDate(date));
  };

  return (
    <div className={cn('flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3', className)}>
      {/* Пресеты периода */}
      <div className="flex items-center gap-1 bg-card rounded-lg p-1 overflow-x-auto">
        {presets.map((preset) => (
          <Button
            key={preset}
            variant={period.preset === preset ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handlePresetClick(preset)}
            className={cn(
              'h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm whitespace-nowrap',
              period.preset === preset
                ? 'bg-primary text-white hover:bg-primary/80'
                : 'text-foreground/80 hover:text-foreground hover:bg-secondary'
            )}
          >
            {PRESET_LABELS[preset]}
          </Button>
        ))}
      </div>

      {/* Раздельный выбор дат */}
      <div className="flex items-center gap-1 sm:gap-2 bg-card rounded-lg p-1">
        {/* Начальная дата */}
        <Popover open={fromOpen} onOpenChange={setFromOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={period.preset === 'custom' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm',
                period.preset === 'custom'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'text-foreground/80 hover:text-foreground hover:bg-secondary'
              )}
            >
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              {formatDateShort(period.dateFrom)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-2 border-b border-border bg-card">
              <span className="text-sm font-medium text-green-600 dark:text-green-400">Начальная дата</span>
            </div>
            <CalendarComponent
              mode="single"
              selected={dateFrom}
              onSelect={handleFromSelect}
              defaultMonth={dateFrom || new Date()}
              disabled={(date) => date > new Date()}
              locale={ru}
            />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground text-xs">—</span>

        {/* Конечная дата */}
        <Popover open={toOpen} onOpenChange={setToOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={period.preset === 'custom' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm',
                period.preset === 'custom'
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'text-foreground/80 hover:text-foreground hover:bg-secondary'
              )}
            >
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              {formatDateShort(period.dateTo)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-2 border-b border-border bg-card">
              <span className="text-sm font-medium text-orange-600 dark:text-orange-400">Конечная дата</span>
            </div>
            <CalendarComponent
              mode="single"
              selected={dateTo}
              onSelect={handleToSelect}
              defaultMonth={dateTo || new Date()}
              disabled={(date) => date > new Date()}
              locale={ru}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Отображение выбранного периода - адаптивно */}
      <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-50 dark:from-blue-900/50 to-card rounded-lg border border-primary/30 dark:border-blue-700/30">
        <CalendarDays className="h-5 w-5 text-primary dark:text-primary/70" />
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Период</span>
          <span className="text-sm text-foreground font-semibold">{formatPeriodLabel(period)}</span>
        </div>
        <div className="h-8 w-px bg-secondary mx-1" />
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Дней</span>
          <span className="text-sm text-primary dark:text-primary/70 font-bold">{calculateDays(period)}</span>
        </div>
      </div>

      {/* Мобильная версия периода */}
      <div className="flex sm:hidden items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-50 dark:from-blue-900/50 to-card rounded-lg border border-primary/30 dark:border-blue-700/30">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary dark:text-primary/70" />
          <span className="text-xs text-foreground font-medium">{calculateDays(period)} дн.</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-7 px-2 text-foreground/80 hover:text-foreground"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* Кнопка обновления - только desktop */}
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isLoading}
        className="hidden sm:flex h-8 px-3 border-border text-foreground/80 hover:bg-secondary hover:text-foreground"
      >
        <RefreshCw className={cn('h-4 w-4 mr-1', isLoading && 'animate-spin')} />
        Обновить
      </Button>
    </div>
  );
}

export default DashboardPeriodSelector;
