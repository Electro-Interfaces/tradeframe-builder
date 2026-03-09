/**
 * Сервис хранения закупочных цен поставок (localStorage)
 * Используется для расчёта маржи по методу FIFO
 */

import { PersistentStorage } from '@/utils/persistentStorage';
import type { ReceiptCostEntry } from '@/types/tanks';

const STORAGE_KEY = 'receipt_costs';

/** Генерация уникального ключа для записи */
export function makeReceiptCostKey(
  system: number,
  station: number,
  tank: number,
  ttn: string,
  dt: string
): string {
  return `${system}:${station}:${tank}:${ttn}:${dt}`;
}

/** Загрузить все закупочные цены */
function loadAll(): ReceiptCostEntry[] {
  return PersistentStorage.load<ReceiptCostEntry>(STORAGE_KEY, []);
}

/** Сохранить все закупочные цены */
function saveAll(entries: ReceiptCostEntry[]): void {
  PersistentStorage.save(STORAGE_KEY, entries);
}

/** Получить закупочные цены для конкретного резервуара */
export function getReceiptCostsForTank(
  system: number,
  station: number,
  tank: number
): ReceiptCostEntry[] {
  const all = loadAll();
  return all.filter(
    e => e.system === system && e.station === station && e.tank === tank
  );
}

/** Получить закупочную цену по ключу */
export function getReceiptCost(key: string): ReceiptCostEntry | undefined {
  const all = loadAll();
  return all.find(e => e.key === key);
}

/** Сохранить / обновить закупочную цену */
export function saveReceiptCost(entry: ReceiptCostEntry): void {
  const all = loadAll();
  const idx = all.findIndex(e => e.key === entry.key);
  if (idx >= 0) {
    all[idx] = entry;
  } else {
    all.push(entry);
  }
  saveAll(all);
}

/** Удалить закупочную цену */
export function deleteReceiptCost(key: string): void {
  const all = loadAll();
  saveAll(all.filter(e => e.key !== key));
}

/**
 * Пересчёт стоимости при смене единицы измерения
 * density в кг/м³ → 1 литр = density / 1000 кг
 */
export function recalculateCosts(
  value: number,
  inputUnit: 'liter' | 'kg',
  density: number
): { costPerLiter: number; costPerKg: number } {
  const kgPerLiter = density / 1000;

  if (inputUnit === 'liter') {
    return {
      costPerLiter: value,
      costPerKg: kgPerLiter > 0 ? value / kgPerLiter : 0,
    };
  } else {
    return {
      costPerLiter: value * kgPerLiter,
      costPerKg: value,
    };
  }
}
