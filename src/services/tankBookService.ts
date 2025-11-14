/**
 * Сервис для расчета книжной реализации по транзакциям и поступлениям
 */

import { stsProxyRequest } from './stsProxyClient';
import type { TransactionV2Response, ReceiptResponse } from '@/types/tanks';

/**
 * Параметры для получения данных
 */
export interface BookDataParams {
  system: number;
  station: number;
  dt_beg?: string;
  dt_end?: string;
}

/**
 * Получить транзакции за период
 */
export async function getTransactions(params: BookDataParams): Promise<TransactionV2Response> {
  const queryParams: Record<string, any> = {
    system: params.system,
    number: params.station
  };

  if (params.dt_beg) {
    queryParams.dt_beg = params.dt_beg;
  }

  if (params.dt_end) {
    queryParams.dt_end = params.dt_end;
  }

  try {
    // API возвращает массив объектов: [{system, number, total, items}]
    const response = await stsProxyRequest<TransactionV2Response[]>('/v2/transactions', {
      method: 'GET',
      params: queryParams
    });

    // Ищем данные по запрошенной станции (API может вернуть несколько станций)
    const stationData = Array.isArray(response)
      ? response.find(item => item.number === params.station)
      : null;

    if (!stationData) {
      return {
        system: params.system,
        number: params.station,
        total: undefined,
        items: []
      };
    }

    return stationData;
  } catch (error) {
    console.error('❌ Ошибка загрузки транзакций:', error);
    throw error;
  }
}

/**
 * Получить поступления за период
 */
export async function getReceipts(params: BookDataParams): Promise<ReceiptResponse> {
  const queryParams: Record<string, any> = {
    system: params.system,
    number: params.station
  };

  if (params.dt_beg) {
    queryParams.dt_beg = params.dt_beg;
  }

  if (params.dt_end) {
    queryParams.dt_end = params.dt_end;
  }

  try {
    // API возвращает массив объектов: [{system, number, shifts}]
    const response = await stsProxyRequest<ReceiptResponse[]>('/v1/report/receipts', {
      method: 'GET',
      params: queryParams
    });

    // Ищем данные по запрошенной станции (API может вернуть несколько станций)
    const stationData = Array.isArray(response)
      ? response.find(item => item.number === params.station)
      : null;

    if (!stationData) {
      return {
        system: params.system,
        number: params.station,
        shifts: []
      };
    }

    return stationData;
  } catch (error) {
    console.error('❌ Ошибка загрузки поступлений:', error);
    throw error;
  }
}

/**
 * Рассчитать книжную реализацию по транзакциям для конкретного резервуара
 */
export function calculateBookReleaseFromTransactions(
  transactions: TransactionV2Response,
  tankNumber: number
): number {
  if (!transactions.items || transactions.items.length === 0) {
    console.warn('⚠️ Нет транзакций в массиве items');
    return 0;
  }

  // Фильтруем транзакции по номеру резервуара и суммируем quantity
  const tankTransactions = transactions.items.filter(item => item.tank === tankNumber);

  // API возвращает quantity как строку, конвертируем в число
  const totalRelease = tankTransactions.reduce((sum, item) => {
    const quantity = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
    return sum + (isNaN(quantity) ? 0 : quantity);
  }, 0);

  return totalRelease;
}

/**
 * Рассчитать поступления для конкретного резервуара с фильтрацией по датам
 */
export function calculateReceiptsForTank(
  receipts: ReceiptResponse,
  tankNumber: number,
  dt_beg?: string,
  dt_end?: string
): number {
  if (!receipts.shifts || receipts.shifts.length === 0) {
    return 0;
  }

  // Преобразуем даты фильтра в Date объекты для сравнения
  const filterStartDate = dt_beg ? new Date(dt_beg) : null;
  const filterEndDate = dt_end ? new Date(dt_end) : null;

  // Проходим по всем сменам и суммируем поступления для данного резервуара
  let totalReceipts = 0;
  let filteredCount = 0;
  let skippedCount = 0;

  receipts.shifts.forEach(shift => {
    if (shift.receipt && shift.receipt.length > 0) {
      shift.receipt
        .filter(item => item.tank === tankNumber)
        .forEach(item => {
          // Проверяем, попадает ли дата поступления в заданный период
          const receiptDate = new Date(item.dt);

          // Если заданы фильтры по датам, проверяем вхождение в период
          if (filterStartDate && receiptDate < filterStartDate) {
            skippedCount++;
            return; // Пропускаем поступления до начала периода
          }

          if (filterEndDate && receiptDate > filterEndDate) {
            skippedCount++;
            return; // Пропускаем поступления после конца периода
          }

          // Используем фактический объем поступления (API возвращает строку)
          const volume = typeof item.fact.volume === 'string'
            ? parseFloat(item.fact.volume)
            : item.fact.volume;
          totalReceipts += isNaN(volume) ? 0 : volume;
          filteredCount++;
        });
    }
  });

  return totalReceipts;
}

/**
 * Получить все данные для расчета книжной реализации
 */
export async function getBookData(
  params: BookDataParams,
  tankNumber: number
): Promise<{
  transactions: TransactionV2Response;
  receipts: ReceiptResponse;
  bookRelease: number;
  bookReceipts: number;
}> {
  // Параллельно запрашиваем транзакции и поступления
  const [transactions, receipts] = await Promise.all([
    getTransactions(params),
    getReceipts(params)
  ]);

  // Вычисляем книжную реализацию и поступления с фильтрацией по датам
  const bookRelease = calculateBookReleaseFromTransactions(transactions, tankNumber);
  const bookReceipts = calculateReceiptsForTank(receipts, tankNumber, params.dt_beg, params.dt_end);

  return {
    transactions,
    receipts,
    bookRelease,
    bookReceipts
  };
}
