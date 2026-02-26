/**
 * Хук для управления фильтрами сменных отчетов
 */

import { useState } from 'react';
import type { ShiftFilters } from '@/types/shift-reports-v2';
import { todayString, daysAgoString } from '@/utils/dateUtils';

export function useShiftFilters() {
  const [filters, setFilters] = useState<ShiftFilters>(() => ({
    dateFrom: daysAgoString(7),
    dateTo: todayString(),
    status: 'all',
  }));

  return {
    filters,
    setFilters
  };
}
