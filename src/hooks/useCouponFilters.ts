/**
 * Хук для управления фильтрами купонов
 */

import { useState, useEffect } from 'react';
import { useSelection } from '@/contexts/SelectionContext';
import type { CouponsFilter } from '@/types/coupons';
import { daysAgoString } from '@/utils/dateUtils';

export function useCouponFilters() {
  const { selectedNetwork } = useSelection();

  // Состояния фильтров
  const [filters, setFilters] = useState<CouponsFilter>({
    system: 15, // Начальное значение
    search: '',
    state: undefined,
    ageFilter: 'all',
    dateFrom: daysAgoString(90),
    dateTo: daysAgoString(-2) // +2 дня для надёжности
  });

  const [filtersOpen, setFiltersOpen] = useState(true);

  // KPI фильтры
  const [selectedKpiStates, setSelectedKpiStates] = useState<Set<string>>(new Set());
  const [selectedFuelType, setSelectedFuelType] = useState<string>('all');

  // Обновляем system в фильтрах при изменении выбранной сети
  useEffect(() => {
    if (selectedNetwork?.external_id && !isNaN(Number(selectedNetwork.external_id))) {
      setFilters(prev => ({
        ...prev,
        system: Number(selectedNetwork.external_id)
      }));
    }
  }, [selectedNetwork]);

  /**
   * Обработка клика по KPI карточке статуса
   */
  const handleKpiStateClick = (state: string) => {
    const newSelected = new Set(selectedKpiStates);
    if (newSelected.has(state)) {
      newSelected.delete(state);
    } else {
      newSelected.add(state);
    }
    setSelectedKpiStates(newSelected);
  };

  /**
   * Обработка клика по KPI карточке топлива
   */
  const handleFuelTypeKpiClick = (fuelType: string) => {
    setSelectedFuelType(selectedFuelType === fuelType ? 'all' : fuelType);
  };

  /**
   * Сброс всех KPI фильтров
   */
  const handleKpiResetAll = () => {
    setSelectedKpiStates(new Set());
    setSelectedFuelType('all');
  };

  /**
   * Очистка всех фильтров
   */
  const clearAllFilters = () => {
    setFilters({
      system: filters.system, // Сохраняем system
      dateFrom: '',
      dateTo: '',
      search: '',
      state: undefined,
      ageFilter: 'all'
    });
    handleKpiResetAll();
  };

  return {
    filters,
    setFilters,
    filtersOpen,
    setFiltersOpen,
    selectedKpiStates,
    selectedFuelType,
    handleKpiStateClick,
    handleFuelTypeKpiClick,
    handleKpiResetAll,
    clearAllFilters
  };
}
