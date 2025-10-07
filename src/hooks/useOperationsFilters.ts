/**
 * Хук для управления фильтрами операций
 */

import { useState, useMemo } from 'react';
import { useDebounce } from './use-debounce';

export interface OperationsFilters {
  selectedFuelType: string;
  selectedPaymentMethod: string;
  selectedStatus: string;
  dateFrom: string;
  dateTo: string;
  searchQuery: string;
  selectedKpiFuels: Set<string>;
  selectedKpiPayments: Set<string>;
}

export interface UseOperationsFiltersReturn {
  filters: OperationsFilters;
  debouncedFilters: {
    dateFrom: string;
    dateTo: string;
    searchQuery: string;
  };
  setSelectedFuelType: (value: string) => void;
  setSelectedPaymentMethod: (value: string) => void;
  setSelectedStatus: (value: string) => void;
  setDateFrom: (value: string) => void;
  setDateTo: (value: string) => void;
  setSearchQuery: (value: string) => void;
  setSelectedKpiFuels: (value: Set<string>) => void;
  setSelectedKpiPayments: (value: Set<string>) => void;
  clearFilters: () => void;
  handleKpiFuelClick: (fuel: string) => void;
  handleKpiPaymentClick: (payment: string) => void;
}

export function useOperationsFilters(): UseOperationsFiltersReturn {
  // Базовые фильтры
  const [selectedFuelType, setSelectedFuelType] = useState("Все");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("Все");
  const [selectedStatus, setSelectedStatus] = useState("Все");

  // Даты
  const [dateFrom, setDateFrom] = useState(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  // Поиск
  const [searchQuery, setSearchQuery] = useState("");

  // KPI карточки фильтры
  const [selectedKpiFuels, setSelectedKpiFuels] = useState<Set<string>>(new Set());
  const [selectedKpiPayments, setSelectedKpiPayments] = useState<Set<string>>(new Set());

  // Debounced версии фильтров для оптимизации производительности
  const debouncedDateFrom = useDebounce(dateFrom, 400);
  const debouncedDateTo = useDebounce(dateTo, 400);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Обработка клика по KPI карточке топлива
  const handleKpiFuelClick = (fuel: string) => {
    const newSelected = new Set(selectedKpiFuels);
    if (newSelected.has(fuel)) {
      newSelected.delete(fuel);
    } else {
      newSelected.add(fuel);
    }
    setSelectedKpiFuels(newSelected);
  };

  // Обработка клика по KPI карточке способа оплаты
  const handleKpiPaymentClick = (payment: string) => {
    const newSelected = new Set(selectedKpiPayments);
    if (newSelected.has(payment)) {
      newSelected.delete(payment);
    } else {
      newSelected.add(payment);
    }
    setSelectedKpiPayments(newSelected);
  };

  // Очистка всех фильтров
  const clearFilters = () => {
    setSelectedFuelType("Все");
    setSelectedPaymentMethod("Все");
    setSelectedStatus("Все");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setDateFrom(yesterday.toISOString().split('T')[0]);
    setDateTo(new Date().toISOString().split('T')[0]);
    setSearchQuery("");
    setSelectedKpiFuels(new Set());
    setSelectedKpiPayments(new Set());
  };

  const filters = useMemo(() => ({
    selectedFuelType,
    selectedPaymentMethod,
    selectedStatus,
    dateFrom,
    dateTo,
    searchQuery,
    selectedKpiFuels,
    selectedKpiPayments
  }), [
    selectedFuelType,
    selectedPaymentMethod,
    selectedStatus,
    dateFrom,
    dateTo,
    searchQuery,
    selectedKpiFuels,
    selectedKpiPayments
  ]);

  const debouncedFilters = useMemo(() => ({
    dateFrom: debouncedDateFrom,
    dateTo: debouncedDateTo,
    searchQuery: debouncedSearchQuery
  }), [debouncedDateFrom, debouncedDateTo, debouncedSearchQuery]);

  return {
    filters,
    debouncedFilters,
    setSelectedFuelType,
    setSelectedPaymentMethod,
    setSelectedStatus,
    setDateFrom,
    setDateTo,
    setSearchQuery,
    setSelectedKpiFuels,
    setSelectedKpiPayments,
    clearFilters,
    handleKpiFuelClick,
    handleKpiPaymentClick
  };
}
