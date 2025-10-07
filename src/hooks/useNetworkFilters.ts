/**
 * Хук для управления фильтрами даты в обзоре сети
 */

import { useState } from 'react';

export function useNetworkFilters() {
  const today = new Date();
  const monthAgo = new Date();
  monthAgo.setMonth(today.getMonth() - 1);

  const [dateFrom, setDateFrom] = useState(monthAgo.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(today.toISOString().split('T')[0]);
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
