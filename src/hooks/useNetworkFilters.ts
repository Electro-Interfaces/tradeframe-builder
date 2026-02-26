/**
 * Хук для управления фильтрами даты в обзоре сети
 */

import { useState } from 'react';
import { todayString, monthsAgoString } from '@/utils/dateUtils';

export function useNetworkFilters() {
  const [dateFrom, setDateFrom] = useState(() => monthsAgoString(1));
  const [dateTo, setDateTo] = useState(() => todayString());
  const [filtersOpen, setFiltersOpen] = useState(true);

  return {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    filtersOpen,
    setFiltersOpen
  };
}
