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
    // Пропускаем резервуары только с явно некорректным книжным остатком.
    // capacity = 0 допустим (STS /v1/tank_history не для всех АЗС возвращает volume_max,
    // например АЗС 209/210 — в таком случае просто показываем остатки без прогресс-бара заполнения).
    if (tank.volumeBook < 0) {
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
  sortColumn: 'station' | 'fuel' | 'volumeBook',
  sortDirection: 'asc' | 'desc'
): TankInventory[] => {
  return [...inventory].sort((a, b) => {
    let comparison = 0;

    if (sortColumn === 'station') {
      comparison = a.station - b.station;
    } else if (sortColumn === 'fuel') {
      comparison = a.fuelCode - b.fuelCode || a.station - b.station;
    } else if (sortColumn === 'volumeBook') {
      comparison = a.volumeBook - b.volumeBook;
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
    receiptCount: inventory.reduce((sum, tank) => sum + (tank.receiptCount || 0), 0),
    shiftCount: inventory.reduce((sum, tank) => sum + (tank.shiftCount || 0), 0),
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

/**
 * Число дней в выбранном периоде (разница дат + 1, минимум 1)
 */
export const getPeriodDays = (dateFrom: string, dateTo: string): number => {
  const from = new Date(dateFrom).getTime();
  const to = new Date(dateTo).getTime();
  if (isNaN(from) || isNaN(to)) return 1;
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((to - from) / MS_PER_DAY) + 1);
};

/**
 * Прогноз: на сколько дней хватит книжного остатка при текущем темпе реализации.
 *
 * Темп считаем по числу ФАКТИЧЕСКИХ смен с продажами (shiftCount), а не по
 * календарным дням фильтра: станция могла закрыть не каждый день, а сегодняшний
 * день ещё не закрыт — деление на календарный период занижало бы темп и завышало
 * прогноз (ДТ показывал «35 дней» вместо реальных ~26). Одна суточная смена ≈ один
 * день продаж. Резерв — периодные дни, если смен нет.
 * Возвращает null, если реализации/смен не было — прогноз невозможен.
 */
export const getDaysToReorder = (
  volumeBook: number,
  volumeSales: number,
  shiftCount: number,
  periodDays?: number
): number | null => {
  const days = shiftCount > 0 ? shiftCount : (periodDays && periodDays > 0 ? periodDays : 0);
  if (days <= 0 || volumeSales <= 0) return null;
  const perDay = volumeSales / days;
  if (!isFinite(perDay) || perDay <= 0) return null;
  return Math.max(1, Math.round(volumeBook / perDay));
};

/**
 * Уровень заполнения резервуара: критический (<10%), внимание (<22%), норма
 */
export type FillLevel = 'crit' | 'warn' | 'ok';

export const getFillLevel = (fillPercent: number): FillLevel => {
  if (fillPercent < 10) return 'crit';
  if (fillPercent < 22) return 'warn';
  return 'ok';
};

/**
 * Резервуар «требует внимания»: низкое заполнение (<22% при известной ёмкости)
 * ИЛИ скоро опустеет (дней до дозаказа <= 6)
 */
export const isTankAttention = (tank: TankInventory, periodDays: number): boolean => {
  const days = getDaysToReorder(tank.volumeBook, tank.volumeSales, tank.shiftCount, periodDays);
  const lowFill = tank.capacity > 0 && tank.fillPercent < 22;
  const lowDays = days != null && days <= 6;
  return lowFill || lowDays;
};

/**
 * Группа резервуаров одной станции
 */
export interface StationGroup {
  key: string;             // уникальный ключ станции (station + name)
  station: number;
  stationName: string;
  tanks: TankInventory[];
  totalBook: number;       // суммарный книжный остаток по станции
  alertCount: number;      // число проблемных резервуаров
}

/**
 * Группировка резервуаров по станциям с сохранением порядка появления
 * (порядок станций и резервуаров наследуется от переданного отсортированного списка)
 */
export const groupByStation = (
  inventory: TankInventory[],
  periodDays: number
): StationGroup[] => {
  const map = new Map<string, StationGroup>();

  for (const tank of inventory) {
    const stationName = tank.stationName || `АЗС ${tank.station}`;
    const key = `${tank.station}|${stationName}`;

    let group = map.get(key);
    if (!group) {
      group = { key, station: tank.station, stationName, tanks: [], totalBook: 0, alertCount: 0 };
      map.set(key, group);
    }

    group.tanks.push(tank);
    group.totalBook += tank.volumeBook;
    if (isTankAttention(tank, periodDays)) {
      group.alertCount += 1;
    }
  }

  return Array.from(map.values());
};
