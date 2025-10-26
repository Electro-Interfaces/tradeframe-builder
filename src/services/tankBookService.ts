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

  console.log('🔄 Запрос транзакций:', queryParams);

  try {
    // API возвращает массив объектов: [{system, number, total, items}]
    const response = await stsProxyRequest<TransactionV2Response[]>('/v2/transactions', {
      method: 'GET',
      params: queryParams
    });

    // Извлекаем первый элемент массива (данные по запрошенной станции)
    const stationData = Array.isArray(response) && response.length > 0 ? response[0] : null;

    if (!stationData) {
      console.warn('⚠️ API вернул пустой массив или некорректный формат');
      return {
        system: params.system,
        number: params.station,
        total: undefined,
        items: []
      };
    }

    console.log('✅ Транзакции получены:', {
      hasItems: !!stationData.items,
      itemsCount: stationData.items?.length || 0,
      hasTotal: !!stationData.total,
      totalFuelsCount: stationData.total?.fuels?.length || 0,
      firstItem: stationData.items?.[0] ? {
        tank: stationData.items[0].tank,
        fuel: stationData.items[0].fuel,
        quantity: stationData.items[0].quantity
      } : null
    });

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

  console.log('🔄 Запрос поступлений:', queryParams);

  try {
    // API возвращает массив объектов: [{system, number, shifts}]
    const response = await stsProxyRequest<ReceiptResponse[]>('/v1/report/receipts', {
      method: 'GET',
      params: queryParams
    });

    // Извлекаем первый элемент массива (данные по запрошенной станции)
    const stationData = Array.isArray(response) && response.length > 0 ? response[0] : null;

    if (!stationData) {
      console.warn('⚠️ API вернул пустой массив поступлений');
      return {
        system: params.system,
        number: params.station,
        shifts: []
      };
    }

    console.log('✅ Поступления получены:', {
      shiftsCount: stationData.shifts?.length || 0,
      receiptsCount: stationData.shifts?.reduce((sum, s) => sum + (s.receipt?.length || 0), 0) || 0
    });

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

  console.log(`📊 Транзакции для резервуара ${tankNumber}:`, {
    totalTransactions: transactions.items.length,
    tankTransactions: tankTransactions.length,
    totalRelease,
    sampleQuantities: tankTransactions.slice(0, 3).map(t => ({
      quantity: t.quantity,
      type: typeof t.quantity
    }))
  });

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

  console.log(`📦 Поступления для резервуара ${tankNumber}:`, {
    totalShifts: receipts.shifts.length,
    filteredReceipts: filteredCount,
    skippedReceipts: skippedCount,
    totalReceipts,
    period: dt_beg && dt_end ? `${dt_beg} - ${dt_end}` : 'Все время'
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
