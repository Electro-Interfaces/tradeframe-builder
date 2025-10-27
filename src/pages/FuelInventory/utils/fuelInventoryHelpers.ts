/**
 * Вспомогательные функции для страницы "Остатки топлива"
 */

import type { TankInventory } from '@/services/fuelInventoryService';

/**
 * Форматирование даты для API (YYYY-MM-DD HH:MM:SS)
 */
export const formatDateForApi = (dateStr: string, isEndOfDay: boolean = false): string => {
  const date = new Date(dateStr);
  if (isEndOfDay) {
    date.setHours(23, 59, 59);
  } else {
    date.setHours(0, 0, 0);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * Форматирование числа с разделителями тысяч
 */
export const formatNumber = (num: number): string => {
  return num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

/**
 * Фильтрация остатков по выбранным критериям
 */
export const filterInventory = (
  inventory: TankInventory[],
  selectedFuel: string,
  selectedStation: string
): TankInventory[] => {
  return inventory.filter(tank => {
    // Пропускаем резервуары с некорректными данными
    if (tank.volumeBook < 0 || tank.capacity <= 0) {
      return false;
    }

    // Фильтр по виду топлива
    const matchesFuel = selectedFuel === 'all' || tank.fuelCode === parseInt(selectedFuel);

    // Фильтр по ТТ
    const matchesStation = selectedStation === 'all' || tank.station === parseInt(selectedStation);

    return matchesFuel && matchesStation;
  });
};

/**
 * Сортировка остатков
 */
export const sortInventory = (
  inventory: TankInventory[],
  sortColumn: 'station' | 'fuel',
  sortDirection: 'asc' | 'desc'
): TankInventory[] => {
  return [...inventory].sort((a, b) => {
    let comparison = 0;

    if (sortColumn === 'station') {
      comparison = a.station - b.station;
    } else if (sortColumn === 'fuel') {
      comparison = a.fuelCode - b.fuelCode || a.station - b.station;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });
};

/**
 * Расчет суммарных значений для отфильтрованных данных
 */
export const calculateTotals = (inventory: TankInventory[]) => {
  if (inventory.length === 0) return null;

  return {
    volumeBegin: inventory.reduce((sum, tank) => sum + tank.volumeBegin, 0),
    volumeReceipts: inventory.reduce((sum, tank) => sum + tank.volumeReceipts, 0),
    volumeSales: inventory.reduce((sum, tank) => sum + tank.volumeSales, 0),
    volumeBook: inventory.reduce((sum, tank) => sum + tank.volumeBook, 0),
    capacity: inventory.reduce((sum, tank) => sum + tank.capacity, 0),
    tankCount: inventory.length
  };
};

/**
 * Получение уникальных ТТ из списка остатков
 */
export const getUniqueStations = (inventory: TankInventory[]): number[] => {
  return Array.from(new Set(inventory.map(t => t.station)));
};
