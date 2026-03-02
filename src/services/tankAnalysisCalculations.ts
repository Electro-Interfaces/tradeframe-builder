/**
 * Модуль расчетов для детального анализа резервуаров
 *
 * Содержит чистые функции для расчета:
 * - Фактических и книжных остатков
 * - Фактической и книжной реализации
 * - Погрешностей
 */

import type { TankHistoryRecord, TransactionV2Response, ReceiptResponse } from '@/types/tanks';

/**
 * Нормализованная транзакция для быстрых расчетов
 */
interface NormalizedTransaction {
  time: number;
  quantity: number;
}

/**
 * Нормализованное поступление для быстрых расчетов
 */
interface NormalizedReceipt {
  time: number;
  volume: number;
}

/**
 * Точка данных для графиков
 */
export interface ChartDataPoint {
  time: string;                // Время в формате "ДД.ММ, ЧЧ:ММ"
  volumeActual: number;        // Фактический остаток (из датчиков)
  volumeBook: number;          // Книжный остаток (расчетный)
  releaseActual: number;       // Фактическая реализация (из изменения остатков)
  releaseBook: number;         // Книжная реализация (из транзакций)
  releaseDifference: number;   // Разница между фактом и книгой
  temperature: number;         // Температура
  density: number;             // Плотность
  waterLevel: number;          // Уровень воды
}

/**
 * Начальные значения для расчетов
 */
interface InitialValues {
  firstVolume: number;          // Первый фактический остаток в периоде
  firstVolumeBegin: number;     // Начальный объем первой записи
  firstReleaseBook: number;     // Накопленная книжная реализация до начала периода
  firstReceiptsBook: number;    // Накопленные поступления до начала периода
}

/**
 * Нормализует транзакции для быстрых расчетов
 * Фильтрует по номеру резервуара, парсит числа, сортирует по времени
 */
export function normalizeTransactions(
  transactions: TransactionV2Response | null,
  fuelCode: number,
  dt_beg?: string,
  dt_end?: string
): NormalizedTransaction[] {
  if (!transactions?.items) return [];

  // Преобразуем даты фильтра в timestamp для быстрого сравнения
  const filterStartTime = dt_beg ? new Date(dt_beg).getTime() : -Infinity;
  const filterEndTime = dt_end ? new Date(dt_end).getTime() : Infinity;

  // Фильтрация по коду топлива (fuel), не по tank — маппинг tank в транзакциях ≠ физ. резервуарам
  return transactions.items
    .filter(item => item.fuel === fuelCode)
    .map(item => ({
      time: new Date(item.dt || '').getTime(),
      quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity
    }))
    .filter(item =>
      !isNaN(item.quantity) &&
      item.quantity > 0 &&
      item.time >= filterStartTime &&
      item.time <= filterEndTime
    )
    .sort((a, b) => a.time - b.time);
}

/**
 * Нормализует поступления для быстрых расчетов
 * Извлекает из смен, фильтрует по резервуару, парсит числа, сортирует
 */
export function normalizeReceipts(
  receipts: ReceiptResponse | null,
  tankNumber: number,
  dt_beg?: string,
  dt_end?: string
): NormalizedReceipt[] {
  if (!receipts?.shifts) return [];

  // Преобразуем даты фильтра в timestamp для быстрого сравнения
  const filterStartTime = dt_beg ? new Date(dt_beg).getTime() : -Infinity;
  const filterEndTime = dt_end ? new Date(dt_end).getTime() : Infinity;

  return receipts.shifts
    .flatMap(shift => shift.receipt || [])
    .filter(item => item.tank === tankNumber)
    .map(item => ({
      time: new Date(item.dt).getTime(),
      volume: typeof item.fact.volume === 'string'
        ? parseFloat(item.fact.volume)
        : item.fact.volume
    }))
    .filter(item =>
      !isNaN(item.volume) &&
      item.volume > 0 &&
      item.time >= filterStartTime &&
      item.time <= filterEndTime
    )
    .sort((a, b) => a.time - b.time);
}

/**
 * Вычисляет начальные значения для расчетов
 * Определяет точку отсчета и накопленные значения до начала периода
 */
export function calculateInitialValues(
  firstRecord: TankHistoryRecord | undefined,
  transactions: NormalizedTransaction[],
  receipts: NormalizedReceipt[]
): InitialValues {
  if (!firstRecord) {
    return {
      firstVolume: 0,
      firstVolumeBegin: 0,
      firstReleaseBook: 0,
      firstReceiptsBook: 0
    };
  }

  const firstTime = new Date(firstRecord.dt).getTime();
  const firstVolume = parseFloat(firstRecord.volume);
  const firstVolumeBegin = parseFloat(firstRecord.volume_begin);

  // Суммируем все транзакции ДО начала периода
  const firstReleaseBook = transactions
    .filter(tx => tx.time <= firstTime)
    .reduce((sum, tx) => sum + tx.quantity, 0);

  // Суммируем все поступления ДО начала периода
  const firstReceiptsBook = receipts
    .filter(rcp => rcp.time <= firstTime)
    .reduce((sum, rcp) => sum + rcp.volume, 0);

  return {
    firstVolume,
    firstVolumeBegin,
    firstReleaseBook,
    firstReceiptsBook
  };
}

/**
 * Основная функция расчета данных для графиков
 *
 * Использует алгоритм TWO-POINTER для эффективного расчета O(n+m)
 *
 * Формулы:
 * - Книжный остаток = Начальный объем + Чистые поступления - Чистая реализация
 * - Фактическая реализация = Начальный объем + Чистые поступления - Текущий остаток
 * - Книжная реализация = Сумма транзакций за период
 *
 * где:
 * - Чистые поступления = Поступления за период (без учета до начала)
 * - Чистая реализация = Транзакции за период (без учета до начала)
 */
export function calculateChartData(
  history: TankHistoryRecord[],
  transactions: NormalizedTransaction[],
  receipts: NormalizedReceipt[],
  initialValues: InitialValues
): ChartDataPoint[] {
  if (history.length === 0) return [];

  const {
    firstVolume,
    firstVolumeBegin,
    firstReleaseBook,
    firstReceiptsBook
  } = initialValues;

  // TWO-POINTER алгоритм: указатели на текущую позицию в массивах
  let txPointer = 0;
  let rcpPointer = 0;

  // Накопительные счетчики (включают ВСЕ транзакции/поступления с начала времен)
  let cumulativeRelease = 0;
  let cumulativeReceipts = 0;

  return history.map((record) => {
    const currentTime = new Date(record.dt).getTime();
    const currentVolume = parseFloat(record.volume);

    // ═══════════════════════════════════════════════════════════════════
    // НАКОПЛЕНИЕ ТРАНЗАКЦИЙ до текущего момента
    // ═══════════════════════════════════════════════════════════════════
    while (txPointer < transactions.length && transactions[txPointer].time <= currentTime) {
      cumulativeRelease += transactions[txPointer].quantity;
      txPointer++;
    }

    // ═══════════════════════════════════════════════════════════════════
    // НАКОПЛЕНИЕ ПОСТУПЛЕНИЙ до текущего момента
    // ═══════════════════════════════════════════════════════════════════
    while (rcpPointer < receipts.length && receipts[rcpPointer].time <= currentTime) {
      cumulativeReceipts += receipts[rcpPointer].volume;
      rcpPointer++;
    }

    // ═══════════════════════════════════════════════════════════════════
    // ЧИСТЫЕ ЗНАЧЕНИЯ ЗА ПЕРИОД (вычитаем то, что было ДО начала периода)
    // ═══════════════════════════════════════════════════════════════════
    const releaseBook = cumulativeRelease - firstReleaseBook;
    const receiptsBook = cumulativeReceipts - firstReceiptsBook;

    // ═══════════════════════════════════════════════════════════════════
    // РАСЧЕТ ОСТАТКОВ И РЕАЛИЗАЦИИ
    // ═══════════════════════════════════════════════════════════════════

    // КНИЖНЫЙ ОСТАТОК = Начало + Поступления - Реализация
    // Это теоретический расчет, основанный на транзакциях
    const volumeBook = firstVolume + receiptsBook - releaseBook;

    // ФАКТИЧЕСКАЯ РЕАЛИЗАЦИЯ = Начало + Поступления - Текущий остаток
    // Это фактическое изменение объема по датчикам
    const releaseActual = firstVolume + receiptsBook - currentVolume;

    // РАЗНИЦА между фактом и книгой показывает погрешность учета
    const releaseDifference = releaseActual - releaseBook;

    return {
      time: new Date(record.dt).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      volumeActual: currentVolume,
      volumeBook: volumeBook,
      releaseActual: releaseActual,
      releaseBook: releaseBook,
      releaseDifference: releaseDifference,
      temperature: parseFloat(record.temperature),
      density: parseFloat(record.density),
      waterLevel: parseFloat(record.water.level)
    };
  });
}

/**
 * Пересчитывает статистику для книжного остатка на основе chartData
 * Исправляет значения, полученные из tankHistoryService
 */
export function recalculateVolumeBookStats(chartData: ChartDataPoint[]): {
  current: number;
  min: number;
  max: number;
  avg: number;
} {
  if (chartData.length === 0) {
    return { current: 0, min: 0, max: 0, avg: 0 };
  }

  const volumeBookValues = chartData.map(point => point.volumeBook);

  return {
    current: volumeBookValues[volumeBookValues.length - 1],
    min: Math.min(...volumeBookValues),
    max: Math.max(...volumeBookValues),
    avg: volumeBookValues.reduce((a, b) => a + b, 0) / volumeBookValues.length
  };
}
