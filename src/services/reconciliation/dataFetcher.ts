/**
 * Модуль получения данных для сверки корпоративного процессинга
 *
 * Три источника данных:
 * 1. Corp (TradeCorp API) - транзакции корпоративного процессинга
 * 2. TF (/v2/transactions) - детальные операции TradeControl
 * 3. Смена (/v1/report/shift_report) - агрегированные данные сменного отчёта
 */

import type { CorpTransaction, TfTransaction, ShiftInfo } from '@/types/reconciliation';
import { getTradecorpTransactions } from '../tradecorpProxyClient';
import { stsProxyRequest } from '../stsProxyClient';
// SYSTEM_ID убран — systemId передаётся явно из настроек выбранной сети
import { mapTradecorpStationToSts, normalizeStationIds } from './utils';

/**
 * Получить транзакции Corp (TradeCorp API)
 */
export async function getCorpTransactions(
  dateFrom: string,
  dateTo: string,
  stationIds: number[]
): Promise<CorpTransaction[]> {
  const response = await getTradecorpTransactions(dateFrom, dateTo, stationIds);

  // Преобразуем данные
  const transactions = response.map(t => {
    // TradeCorp использует свою нумерацию станций, которая отличается от STS
    // Маппим номер станции через название (АКАЗС-3 -> 3)
    const rawStationNumber = typeof t.stationNumber === 'string'
      ? parseInt(t.stationNumber, 10)
      : (t.stationNumber || 0);

    // Если выбрана ровно одна станция, присваиваем её ID
    // Иначе извлекаем номер из названия станции
    let normalizedStationNumber: number;
    if (stationIds.length === 1) {
      // ВАЖНО: stationIds может содержать строки
      const id = stationIds[0];
      normalizedStationNumber = typeof id === 'string' ? parseInt(id as unknown as string, 10) : id;
    } else {
      // Маппинг по имени станции (АКАЗС-3 Автополе -> 3)
      normalizedStationNumber = mapTradecorpStationToSts(t.stationName || '', rawStationNumber);
    }

    return {
      id: t.id,
      date: t.date,
      cardNumber: t.cardNumber,
      cardId: t.cardId,
      stationId: t.stationId,
      stationNumber: normalizedStationNumber,
      // Приводим имя станции к формату TF (АЗС N) для корректной группировки
      stationName: `АЗС ${normalizedStationNumber}`,
      operationName: t.operationName,
      // Защита от NaN/undefined
      quantity: Math.abs(t.quantity || 0),
      cost: Math.abs(t.cost || 0),
      price: t.price || 0,
      productName: t.cheque?.[0]?.productName || t.operationName || 'Неизвестно',
      cheque: t.cheque || []
    };
  });

  return transactions;
}

/**
 * Получить транзакции TF (/v2/transactions) - только корп. карты
 */
export async function getTfTransactions(
  dateFrom: string,
  dateTo: string,
  stationIds: number[],
  systemId: number
): Promise<TfTransaction[]> {
  // Используем stsProxyRequest с обязательным параметром system
  const data = await stsProxyRequest<any[]>('/v2/transactions', {
    params: {
      system: systemId,
      date_from: dateFrom,
      date_to: dateTo
    }
  });

  // v2/transactions возвращает: [{system, number, total, items: [...]}]
  const allTransactions: any[] = [];
  if (Array.isArray(data)) {
    for (const station of data) {
      if (station.items && Array.isArray(station.items)) {
        for (const tx of station.items) {
          allTransactions.push({
            ...tx,
            stationNumber: station.number
          });
        }
      }
    }
  }

  // Фильтруем по датам (API может игнорировать date_from)
  const dateFilteredTransactions = allTransactions.filter(tx => {
    const txDate = tx.dt?.substring(0, 10);
    if (!txDate) return false;
    return txDate >= dateFrom && txDate <= dateTo;
  });

  // Фильтруем только корп. карты (КР)
  // ВАЖНО: МПС, Сбербанк, Мобил.П - это НЕ корп. карты!
  // Корп. карты определяются ТОЛЬКО по pay_type.name = "КР"
  const corpTransactions = dateFilteredTransactions.filter(tx => {
    const payTypeName = (tx.pay_type?.name || '').toLowerCase().trim();

    // Корп. карта ТОЛЬКО если pay_type = "КР" или содержит "корп"
    return payTypeName === 'кр' || payTypeName.includes('корп');
  });

  // Фильтруем по станциям если указаны
  // ВАЖНО: stationIds может содержать строки, а tx.stationNumber - число
  const stationIdsAsNumbers = normalizeStationIds(stationIds);
  const filtered = stationIdsAsNumbers.length > 0
    ? corpTransactions.filter(tx => stationIdsAsNumbers.includes(tx.stationNumber))
    : corpTransactions;

  return filtered.map(tx => ({
    id: tx.id || 0,
    transactionId: tx.transaction || tx.number?.toString() || String(tx.id),
    date: tx.dt || '',
    stationId: tx.stationNumber || 0,
    stationName: `АЗС ${tx.stationNumber}`,
    // Используем fuel_name как на странице операций, fallback на service.service_name
    fuelType: tx.fuel_name || tx.service?.service_name || '',
    // Используем quantity напрямую, как на странице операций
    // parseFloat может вернуть NaN - защита через || 0
    volume: Math.abs(parseFloat(tx.quantity || tx.release?.volume || '0') || 0),
    price: parseFloat(tx.price || tx.release?.price || '0') || 0,
    total: parseFloat(tx.cost || tx.release?.cost || '0') || 0,
    // card может быть строкой или объектом
    cardNumber: typeof tx.card === 'string' ? tx.card : (tx.card?.number || ''),
    paymentMethod: tx.pay_type?.name || ''
  }));
}

/**
 * Получить информацию о сменах с данными из сменных отчётов
 */
export async function getShiftsWithReports(
  dateFrom: string,
  dateTo: string,
  stationIds: number[],
  showAllShifts?: boolean,
  systemId?: number
): Promise<ShiftInfo[]> {
  if (!systemId) {
    throw new Error('systemId обязателен для загрузки смен');
  }

  // Нормализуем stationIds к числам (могут приходить как строки)
  const normalizedStationIds = normalizeStationIds(stationIds);

  // Если станции не указаны, получаем все доступные
  const stationsToQuery = normalizedStationIds.length > 0 ? normalizedStationIds : await getAvailableStations(systemId);

  // Шаг 1: Параллельная загрузка списков смен (батчами по 5)
  const BATCH_SIZE = 5;
  const stationShiftsMap = new Map<number, any[]>();

  for (let i = 0; i < stationsToQuery.length; i += BATCH_SIZE) {
    const batch = stationsToQuery.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(stationId =>
        stsProxyRequest<any[]>('/v1/shifts', {
          params: { system: systemId, station: stationId, date_from: dateFrom, date_to: dateTo }
        }).then(allShifts => ({
          stationId,
          shifts: (allShifts || []).filter(shift => {
            const shiftDate = shift.dt_open || shift.dt_close;
            if (!shiftDate) return false;
            const shiftDateStr = shiftDate.substring(0, 10);
            return shiftDateStr >= dateFrom && shiftDateStr <= dateTo;
          })
        }))
      )
    );
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.shifts.length > 0) {
        stationShiftsMap.set(result.value.stationId, result.value.shifts);
      }
    }
  }

  // Шаг 2: Параллельная загрузка shift_report (батчами по 10)
  const REPORT_BATCH_SIZE = 10;
  const reportTasks: { stationId: number; shift: any }[] = [];
  for (const [stationId, shifts] of stationShiftsMap) {
    for (const shift of shifts) {
      reportTasks.push({ stationId, shift });
    }
  }

  const shiftsInfo: ShiftInfo[] = [];

  for (let i = 0; i < reportTasks.length; i += REPORT_BATCH_SIZE) {
    const batch = reportTasks.slice(i, i + REPORT_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(({ stationId, shift }) =>
        stsProxyRequest<any>('/v1/report/shift_report', {
          method: 'GET',
          params: { system: systemId, station: stationId, shift: shift.shift }
        }).then(shiftReport => ({ stationId, shift, shiftReport }))
      )
    );

    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      const { stationId, shift, shiftReport } = result.value;

      const fuelSales: ShiftInfo['fuelSales'] = [];

      if (shiftReport?.sales) {
        for (const sale of shiftReport.sales) {
          const payTypeName = (sale.pay_type?.name || '').toLowerCase();
          const isCorporateCard =
            payTypeName === 'кр' ||
            payTypeName.includes('корпоратив') ||
            payTypeName.includes('корп.карт') ||
            payTypeName.includes('корп карт');
          if (!isCorporateCard) continue;

          if (sale.fuel && Array.isArray(sale.fuel)) {
            for (const fuelItem of sale.fuel) {
              const fuelName = fuelItem.service?.service_name || 'Топливо';
              const volume = parseFloat(fuelItem.release?.volume || '0') || 0;
              if (volume > 0 || showAllShifts) {
                fuelSales.push({ fuelName, quantity: Math.abs(volume) });
              }
            }
          }
        }
      }

      if (fuelSales.length > 0 || showAllShifts) {
        shiftsInfo.push({
          id: shift.shift,
          stationId,
          stationName: `АЗС ${stationId}`,
          openedAt: shift.dt_open || '',
          closedAt: shift.dt_close || null,
          fuelSales
        });
      }
    }
  }

  return shiftsInfo;
}

/**
 * Получить список доступных станций
 */
export async function getAvailableStations(systemId: number): Promise<number[]> {
  try {
    const info = await stsProxyRequest<any[]>('/v2/info', {
      params: { system: systemId }
    });

    if (Array.isArray(info)) {
      return info.map(s => s.station || s.id).filter(Boolean);
    }

    return [];
  } catch {
    return [];
  }
}
