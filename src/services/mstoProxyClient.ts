/**
 * Клиент для работы с MSTO IntegratorService API через Backend Proxy
 *
 * Все запросы идут через backend на /api/msto/*
 * Backend автоматически управляет JWT авторизацией
 */

import type {
  MSTOTransaction,
  MSTOServicePoint,
  MSTOTariff
} from '@/types/mstoReconciliation';

interface ProxyError extends Error {
  status?: number;
  isTimeout?: boolean;
}

interface MstoProxyRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, string | number | boolean>;
  body?: unknown;
}

import { getBackendOrigin } from '@/utils/backendUrl';

const getProxyBaseUrl = getBackendOrigin;

/**
 * Выполнить запрос к MSTO API через Backend Proxy
 */
export async function mstoProxyRequest<T>(
  endpoint: string,
  options: MstoProxyRequestOptions = {}
): Promise<T> {
  const { method = 'GET', params, body } = options;
  const maxRetries = 2;
  const retryDelays = [1000, 2000];

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const baseUrl = getProxyBaseUrl();
      const fullPath = `${baseUrl}/api/msto${endpoint}`;

      if (!baseUrl || !baseUrl.startsWith('http')) {
        throw new Error(`Некорректный baseUrl для MSTO Proxy: ${baseUrl}`);
      }

      const url = new URL(fullPath);

      // Добавляем query параметры
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value));
          }
        });
      }

      const timeout = 60000; // 60 секунд (MSTO API может быть медленным)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url.toString(), {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          ...(body && { body: JSON.stringify(body) }),
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorDetails = response.statusText;
          try {
            const errorBody = await response.json();
            errorDetails = errorBody.message || JSON.stringify(errorBody);
          } catch (e) {
            // Игнорируем ошибки парсинга
          }

          const error: ProxyError = Object.assign(new Error(`MSTO API request failed (${response.status}): ${errorDetails}`), { status: response.status });

          // Не повторяем для клиентских ошибок (кроме 401)
          if (response.status >= 400 && response.status < 500 && response.status !== 401) {
            throw error;
          }

          throw error;
        }

        return response.json();

      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError') {
          const timeoutError: ProxyError = Object.assign(new Error(`MSTO request timeout after ${timeout}ms`), { isTimeout: true as const });
          throw timeoutError;
        }

        throw fetchError;
      }

    } catch (error: any) {
      lastError = error;

      // Не повторяем для клиентских ошибок
      if (error.status >= 400 && error.status < 500 && error.status !== 401) {
        throw error;
      }

      if (attempt === maxRetries) {
        break;
      }

      const delay = retryDelays[attempt] || 2000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

// ============================================
// API методы
// ============================================

/**
 * Параметры запроса транзакций MSTO
 */
export interface GetMstoTransactionsParams {
  dateFrom: string;             // YYYY-MM-DD
  dateTo: string;               // YYYY-MM-DD
  servicePointIds?: number[];   // Фильтр по станциям MSTO
  tariffIds?: number[];         // Фильтр по агрегаторам
  operationResults?: string[];  // Фильтр по статусам (success, wait, error, cancel)
}

/**
 * Преобразование даты из формата MSTO (dd.MM.yyyy HH:mm:ss) в ISO
 */
function parseMstoDate(dateStr: string): string {
  if (!dateStr) return '';
  // Формат: "23.01.2026 17:05:22" -> "2026-01-23T17:05:22"
  const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (match) {
    const [, day, month, year, hour, min, sec] = match;
    return `${year}-${month}-${day}T${hour}:${min}:${sec}`;
  }
  return dateStr;
}

// MSTO может отдавать StationExtendedId (1500x) вместо servicePointId (212/238/245/251)
// Приводим к каноническим MSTO servicePointId для корректной фильтрации/сопоставления
const MSTO_SERVICE_POINT_ID_ALIASES: Record<number, number> = {
  15001: 212,
  15002: 238,
  15003: 245,
  15004: 251,
};

function normalizeServicePointId(servicePointId: number): number {
  return MSTO_SERVICE_POINT_ID_ALIASES[servicePointId] ?? servicePointId;
}

/**
 * Маппинг номера станции АКАЗС → MSTO servicePointId
 * Используется для поиска по названию типа "АКАЗС-1", "АКАЗС №2", etc.
 */
const AKAZS_NUMBER_TO_MSTO_ID: Record<number, number> = {
  1: 212,  // АКАЗС №1 Непокоренных
  2: 238,  // АКАЗС №2 Выборг
  3: 245,  // АКАЗС №3 Кудрово
  4: 251,  // АКАЗС №4 Первомайское
};

/**
 * Уникальные ключевые слова станций (НЕ названия городов!)
 * Используются только если не нашли по "АКАЗС" + номер
 */
const UNIQUE_STATION_KEYWORDS: Record<string, number> = {
  'непокоренных': 212,
  'непокорённых': 212,
  'первомайское': 251,
  'первомайск': 251,
  // НЕ добавляем 'выборг', 'кудрово' — это названия городов, там много АЗС!
};

/**
 * Извлечение servicePointId из servicePointName
 * Используется когда MSTO не передаёт StationExtendedId в JSON
 * 
 * ВАЖНО: Ищем ТОЛЬКО наши АКАЗС, не чужие АЗС!
 * Примеры наших: "АКАЗС-2 Выборг", "АКАЗС №1 Непокоренных"
 * Примеры чужих: "АЗС 208 - Выборг", "Северное - Выборгское" — НЕ сопоставляем!
 */
function extractServicePointIdFromName(name: string): number {
  if (!name) return 0;

  const nameLower = name.toLowerCase();

  // 1. Ищем по "АКАЗС" + номер (наши станции)
  if (/аказс/i.test(name)) {
    const match = name.match(/аказс[^\d]*(\d)/i);
    if (match) {
      const stationNumber = parseInt(match[1], 10);
      return AKAZS_NUMBER_TO_MSTO_ID[stationNumber] || 0;
    }
  }

  // 2. Ищем по уникальным ключевым словам (только если содержит "АКАЗС" или наши уникальные слова)
  for (const [keyword, mstoId] of Object.entries(UNIQUE_STATION_KEYWORDS)) {
    if (nameLower.includes(keyword)) {
      return mstoId;
    }
  }

  // 3. НЕ сопоставляем чужие АЗС — возвращаем 0
  return 0;
}

/**
 * Трансформация сырой транзакции MSTO в наш формат
 * Сохраняем также сырые данные для детального просмотра
 */
function transformMstoTransaction(raw: any): MSTOTransaction & { json?: string; companyName?: string; tariff?: string; refundSum?: number } {
  // Извлекаем servicePointId из поля json (StationExtendedId или stationExtendedId)
  // ВАЖНО: Всегда приводим к числу!
  let servicePointId = 0;

  // Пробуем сначала из прямого поля
  if (raw.servicePointId) {
    servicePointId = typeof raw.servicePointId === 'string'
      ? parseInt(raw.servicePointId, 10) || 0
      : raw.servicePointId;
  }

  // Если нет - извлекаем из JSON
  if (!servicePointId && raw.json) {
    try {
      const jsonData = typeof raw.json === 'string' ? JSON.parse(raw.json) : raw.json;
      // MSTO использует StationExtendedId (с большой буквы) или stationExtendedId (с маленькой)
      const extId = jsonData.StationExtendedId || jsonData.stationExtendedId;
      if (extId) {
        servicePointId = typeof extId === 'string' ? parseInt(extId, 10) || 0 : extId;
      }
    } catch {
      // Игнорируем ошибки парсинга JSON
    }
  }

  servicePointId = normalizeServicePointId(servicePointId);

  // Если servicePointId всё ещё 0 — извлекаем из servicePointName
  // Это нужно для тарифов, которые не передают StationExtendedId (например "ЯЗ.Сигма")
  if (!servicePointId && raw.servicePointName) {
    servicePointId = extractServicePointIdFromName(raw.servicePointName);
  }

  return {
    id: raw.id || 0,
    externalId: raw.sessionId || '',
    servicePointId,
    servicePointName: raw.servicePointName || '',
    tariffId: raw.tariffId || 0,
    tariffName: raw.tariff || '',
    fuelName: raw.service || '',
    orderDate: parseMstoDate(raw.dateTime),
    completedAt: parseMstoDate(raw.dateTime),
    orderSum: raw.sum || 0,
    orderValue: raw.value || 0,
    resultSum: raw.resultSum || 0,
    resultValue: raw.resultValue || 0,
    operationResult: raw.operationResult || 'unknown',
    price: raw.price || raw.discountPrice || 0,
    columnNumber: raw.postNumber,
    nozzleNumber: undefined,
    // Сырые данные для детального просмотра
    json: raw.json,
    companyName: raw.companyName,
    tariff: raw.tariff,
    refundSum: raw.refundSum,
  };
}

/**
 * Получить транзакции MSTO за период
 */
export async function getMstoTransactions(
  params: GetMstoTransactionsParams
): Promise<MSTOTransaction[]> {
  const queryParams: Record<string, any> = {
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    size: 2000, // Оптимизировано для баланса скорости и полноты данных
  };

  // MSTO API принимает фильтры в единственном числе
  // servicePointId - фильтр по одной станции (или comma-separated список)
  if (params.servicePointIds?.length) {
    queryParams.servicePointId = params.servicePointIds.join(',');
  }

  // operationResult - фильтр по статусу (comma-separated: "success,wait")
  if (params.operationResults?.length) {
    // MSTO API принимает comma-separated список значений
    queryParams.operationResult = params.operationResults.join(',');
  }

  const response = await mstoProxyRequest<any>('/transactions', {
    params: queryParams
  });

  // MSTO возвращает { operationStatus, totalCount, models: [...] }
  let rawTransactions: any[] = [];

  if (response && typeof response === 'object') {
    if (Array.isArray(response.models)) {
      rawTransactions = response.models;
    } else if (Array.isArray(response.transactions)) {
      rawTransactions = response.transactions;
    } else if (Array.isArray(response)) {
      rawTransactions = response;
    }
  }

  // Трансформируем в наш формат
  return rawTransactions.map(transformMstoTransaction);
}

/**
 * Получить список станций MSTO
 */
export async function getMstoServicePoints(): Promise<MSTOServicePoint[]> {
  const response = await mstoProxyRequest<MSTOServicePoint[]>('/servicePoints');

  if (Array.isArray(response)) {
    return response;
  }

  if (response && typeof response === 'object' && 'servicePoints' in response) {
    return (response as { servicePoints: MSTOServicePoint[] }).servicePoints;
  }

  return [];
}

/**
 * Получить список тарифов (агрегаторов) MSTO
 */
export async function getMstoTariffs(): Promise<MSTOTariff[]> {
  const response = await mstoProxyRequest<MSTOTariff[]>('/tariffs');

  if (Array.isArray(response)) {
    return response;
  }

  if (response && typeof response === 'object' && 'tariffs' in response) {
    return (response as { tariffs: MSTOTariff[] }).tariffs;
  }

  return [];
}

/**
 * Проверка доступности MSTO API
 */
export async function checkMstoHealth(): Promise<{
  status: 'ok' | 'error';
  message?: string;
  tokenValid?: boolean;
}> {
  try {
    const response = await mstoProxyRequest<any>('/health');
    return {
      status: response.status || 'ok',
      tokenValid: response.tokenValid
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================
// Orders API - детальная история заказов
// ============================================

import type {
  MSTOOrderStatus,
  MSTOOrderDetailsResponse,
  MSTOOrderHistoryResponse,
  MSTOOrderHistoryParams
} from '@/types/mstoOrders';

/**
 * Получить справочник статусов заказов
 */
export async function getMstoOrderStatuses(): Promise<MSTOOrderStatus[]> {
  return mstoProxyRequest<MSTOOrderStatus[]>('/orders/statuses');
}

/**
 * Получить детали заказа по sessionId
 * Включает: order, actions (этапы с timestamps), finish, timeline
 */
export async function getMstoOrderDetails(sessionId: string): Promise<MSTOOrderDetailsResponse> {
  return mstoProxyRequest<MSTOOrderDetailsResponse>('/orders/details', {
    params: { sessionId }
  });
}

/**
 * Получить список заказов с фильтрами
 */
export async function getMstoOrderHistory(
  params: MSTOOrderHistoryParams = {}
): Promise<MSTOOrderHistoryResponse> {
  return mstoProxyRequest<MSTOOrderHistoryResponse>('/orders/history', {
    params: {
      page: params.page ?? 0,
      size: params.size ?? 20,
      ...params
    }
  });
}

/**
 * Клиент для работы с MSTO API
 */
export const mstoProxyClient = {
  get: <T>(endpoint: string, params?: Record<string, any>) =>
    mstoProxyRequest<T>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, body?: any, params?: Record<string, any>) =>
    mstoProxyRequest<T>(endpoint, { method: 'POST', body, params }),

  // Высокоуровневые методы - транзакции
  getTransactions: getMstoTransactions,
  getServicePoints: getMstoServicePoints,
  getTariffs: getMstoTariffs,
  checkHealth: checkMstoHealth,
  
  // Orders API - детальная история заказов
  getOrderStatuses: getMstoOrderStatuses,
  getOrderDetails: getMstoOrderDetails,
  getOrderHistory: getMstoOrderHistory,
};

export default mstoProxyClient;
