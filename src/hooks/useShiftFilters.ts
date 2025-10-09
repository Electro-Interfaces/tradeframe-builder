/**
 * Хук для управления фильтрами сменных отчетов
 */

import { useState } from 'react';
import type { ShiftFilters } from '@/types/shift-reports-v2';

export function useShiftFilters() {
  const [filters, setFilters] = useState<ShiftFilters>(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const today = new Date();

    return {
      dateFrom: weekAgo.toISOString().split('T')[0],
      dateTo: today.toISOString().split('T')[0],
      status: 'all',
    };
  });

  return {
    filters,
    setFilters
  };
}
