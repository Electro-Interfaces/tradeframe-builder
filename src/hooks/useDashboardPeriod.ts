/**
 * Хук для управления периодом дашборда
 *
 * Поддерживает пресеты (сегодня, вчера, неделя, месяц, квартал)
 * и произвольный выбор дат с возможностью сравнения с предыдущим периодом
 */

import { useState, useCallback, useMemo } from 'react';
import { PeriodSelection, PeriodPreset } from '@/types/shift-dashboard';

/**
 * Форматирует дату в ISO формат (YYYY-MM-DD) в локальном часовом поясе
 */
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Получает начало дня
 */
const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Получает конец дня
 */
const endOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Вычисляет даты для пресета
 */
const calculatePresetDates = (preset: PeriodPreset): { dateFrom: string; dateTo: string } => {
  const today = new Date();
  let dateFrom: Date;
  let dateTo: Date = endOfDay(today);

  switch (preset) {
    case 'today':
      dateFrom = startOfDay(today);
      break;

    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      dateFrom = startOfDay(yesterday);
      dateTo = endOfDay(yesterday);
      break;
    }

    case 'week':
      dateFrom = new Date(today);
      dateFrom.setDate(today.getDate() - 6); // 6 предыдущих дней + сегодня = 7 дней
      dateFrom = startOfDay(dateFrom);
      break;

    case 'month':
      dateFrom = new Date(today);
      dateFrom.setMonth(today.getMonth() - 1);
      dateFrom = startOfDay(dateFrom);
      break;

    case 'quarter':
      dateFrom = new Date(today);
      dateFrom.setMonth(today.getMonth() - 3);
      dateFrom = startOfDay(dateFrom);
      break;

    case 'custom':
    default:
      // Для custom возвращаем последние 7 дней по умолчанию
      dateFrom = new Date(today);
      dateFrom.setDate(today.getDate() - 6); // 6 предыдущих дней + сегодня = 7 дней
      dateFrom = startOfDay(dateFrom);
      break;
  }

  return {
    dateFrom: formatDate(dateFrom),
    dateTo: formatDate(dateTo),
  };
};

/**
 * Вычисляет период сравнения (предыдущий период той же длины)
 */
const calculateComparePeriod = (dateFrom: string, dateTo: string): { compareDateFrom: string; compareDateTo: string } => {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  const periodLength = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const compareTo = new Date(from);
  compareTo.setDate(compareTo.getDate() - 1);

  const compareFrom = new Date(compareTo);
  compareFrom.setDate(compareFrom.getDate() - periodLength + 1);

  return {
    compareDateFrom: formatDate(compareFrom),
    compareDateTo: formatDate(compareTo),
  };
};

interface UseDashboardPeriodOptions {
  /** Начальный пресет */
  initialPreset?: PeriodPreset;
  /** Включить сравнение по умолчанию */
  initialCompareEnabled?: boolean;
}

interface UseDashboardPeriodReturn {
  /** Текущий выбор периода */
  period: PeriodSelection;

  /** Установить пресет */
  setPreset: (preset: PeriodPreset) => void;

  /** Установить произвольные даты */
  setCustomDates: (dateFrom: string, dateTo: string) => void;

  /** Включить/выключить сравнение */
  toggleCompare: () => void;

  /** Установить период сравнения вручную */
  setCompareDates: (compareDateFrom: string, compareDateTo: string) => void;

  /** Сбросить на значения по умолчанию */
  reset: () => void;

  /** Длина периода в днях */
  periodDays: number;

  /** Метки для отображения */
  labels: {
    period: string;
    compare: string;
  };
}

/**
 * Хук для управления периодом дашборда
 */
export function useDashboardPeriod(options: UseDashboardPeriodOptions = {}): UseDashboardPeriodReturn {
  const {
    initialPreset = 'week',
    initialCompareEnabled = false,
  } = options;

  // Инициализация состояния
  const [period, setPeriod] = useState<PeriodSelection>(() => {
    const dates = calculatePresetDates(initialPreset);
    const compareDates = calculateComparePeriod(dates.dateFrom, dates.dateTo);

    return {
      preset: initialPreset,
      dateFrom: dates.dateFrom,
      dateTo: dates.dateTo,
      compareEnabled: initialCompareEnabled,
      compareDateFrom: compareDates.compareDateFrom,
      compareDateTo: compareDates.compareDateTo,
    };
  });

  // Установка пресета
  const setPreset = useCallback((preset: PeriodPreset) => {
    const dates = calculatePresetDates(preset);
    const compareDates = calculateComparePeriod(dates.dateFrom, dates.dateTo);

    setPeriod(prev => ({
      ...prev,
      preset,
      dateFrom: dates.dateFrom,
      dateTo: dates.dateTo,
      compareDateFrom: compareDates.compareDateFrom,
      compareDateTo: compareDates.compareDateTo,
    }));
  }, []);

  // Установка произвольных дат
  const setCustomDates = useCallback((dateFrom: string, dateTo: string) => {
    const compareDates = calculateComparePeriod(dateFrom, dateTo);

    setPeriod(prev => ({
      ...prev,
      preset: 'custom',
      dateFrom,
      dateTo,
      compareDateFrom: compareDates.compareDateFrom,
      compareDateTo: compareDates.compareDateTo,
    }));
  }, []);

  // Переключение сравнения
  const toggleCompare = useCallback(() => {
    setPeriod(prev => ({
      ...prev,
      compareEnabled: !prev.compareEnabled,
    }));
  }, []);

  // Установка дат сравнения вручную
  const setCompareDates = useCallback((compareDateFrom: string, compareDateTo: string) => {
    setPeriod(prev => ({
      ...prev,
      compareDateFrom,
      compareDateTo,
    }));
  }, []);

  // Сброс на значения по умолчанию
  const reset = useCallback(() => {
    const dates = calculatePresetDates(initialPreset);
    const compareDates = calculateComparePeriod(dates.dateFrom, dates.dateTo);

    setPeriod({
      preset: initialPreset,
      dateFrom: dates.dateFrom,
      dateTo: dates.dateTo,
      compareEnabled: initialCompareEnabled,
      compareDateFrom: compareDates.compareDateFrom,
      compareDateTo: compareDates.compareDateTo,
    });
  }, [initialPreset, initialCompareEnabled]);

  // Вычисляем длину периода
  const periodDays = useMemo(() => {
    const from = new Date(period.dateFrom);
    const to = new Date(period.dateTo);
    return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }, [period.dateFrom, period.dateTo]);

  // Форматируем метки для отображения
  const labels = useMemo(() => {
    const formatLabel = (from: string, to: string) => {
      const fromDate = new Date(from);
      const toDate = new Date(to);

      const formatOptions: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'short',
      };

      const fromStr = fromDate.toLocaleDateString('ru-RU', formatOptions);
      const toStr = toDate.toLocaleDateString('ru-RU', formatOptions);

      if (from === to) {
        return fromStr;
      }

      return `${fromStr} — ${toStr}`;
    };

    return {
      period: formatLabel(period.dateFrom, period.dateTo),
      compare: period.compareDateFrom && period.compareDateTo
        ? formatLabel(period.compareDateFrom, period.compareDateTo)
        : '',
    };
  }, [period]);

  return {
    period,
    setPreset,
    setCustomDates,
    toggleCompare,
    setCompareDates,
    reset,
    periodDays,
    labels,
  };
}

/**
 * Названия пресетов на русском
 */
export const PRESET_LABELS: Record<PeriodPreset, string> = {
  today: 'Сегодня',
  yesterday: 'Вчера',
  week: 'Неделя',
  month: 'Месяц',
  quarter: 'Квартал',
  custom: 'Выбрать',
};

export default useDashboardPeriod;
