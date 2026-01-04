/**
 * Утилиты для сервиса сверки корпоративного процессинга
 */

import { STATION_NAME_PATTERNS } from './constants';

/**
 * Нормализация названия топлива для сопоставления
 * Приводит к верхнему регистру и убирает пробелы
 */
export function normalizeFuelName(name: string): string {
  if (!name) return 'НЕИЗВЕСТНО';
  return name.toUpperCase().trim();
}

/**
 * Округление до 2 знаков после запятой
 */
export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Маппинг станций TradeCorp -> STS
 * TradeCorp использует свою нумерацию, STS - свою
 * Извлекаем номер станции из названия (АКАЗС-3 Автополе -> 3)
 */
export function mapTradecorpStationToSts(stationName: string, stationNumber: number): number {
  for (const pattern of STATION_NAME_PATTERNS) {
    const match = stationName?.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }

  // Fallback: используем оригинальный номер
  return stationNumber;
}

/**
 * Нормализация stationIds к числам (могут приходить как строки)
 */
export function normalizeStationIds(stationIds: (number | string)[]): number[] {
  return stationIds.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
}

/**
 * Создание унифицированного имени станции
 */
export function getStationName(stationId: number, stationNameMap: Map<number, string>): string {
  return stationNameMap.get(stationId) || `АЗС ${stationId}`;
}

/**
 * Построение карты имён станций из данных
 * Приоритет: TradeCorp > TF > Shifts > generic
 */
export function buildStationNameMap(
  corpTransactions: { stationNumber: number; stationName: string }[],
  tfTransactions: { stationId: number; stationName?: string }[],
  shiftsInfo: { stationId: number; stationName?: string }[]
): Map<number, string> {
  const stationNameMap = new Map<number, string>();

  // Сначала добавляем из Corp (лучшие имена)
  for (const t of corpTransactions) {
    if (t.stationNumber && t.stationName) {
      stationNameMap.set(t.stationNumber, t.stationName);
    }
  }

  // Потом из TF (если нет в Corp)
  for (const t of tfTransactions) {
    if (t.stationId && !stationNameMap.has(t.stationId)) {
      stationNameMap.set(t.stationId, t.stationName || `АЗС ${t.stationId}`);
    }
  }

  // И из смен (fallback)
  for (const s of shiftsInfo) {
    if (s.stationId && !stationNameMap.has(s.stationId)) {
      stationNameMap.set(s.stationId, s.stationName || `АЗС ${s.stationId}`);
    }
  }

  return stationNameMap;
}
