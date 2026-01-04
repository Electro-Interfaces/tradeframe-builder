/**
 * Клиент для работы с TradeCorp API через Backend Proxy
 *
 * Все запросы идут через наш backend на /api/tradecorp/*
 * Backend автоматически выполняет авторизацию и проксирует к TradeCorp API
 *
 * TradeCorp API - корпоративный процессинг топливных карт
 */

import type {
  TradecorpTransaction,
  TradecorpTransactionsResponse,
  TradecorpSummaryResponse
} from '@/types/reconciliation';

interface TradecorpProxyRequestOptions {
  method?: 'GET' | 'POST';
  body?: any;
}

/**
 * Базовый URL для Backend Proxy
 */
const getProxyBaseUrl = (): string => {
  const origin = window.location.origin;

  if (!origin || origin === 'null' || origin === 'undefined') {
    throw new Error('Cannot determine origin for TradeCorp Proxy');
  }

  // GitHub Pages использует TEST backend
  if (origin.includes('github.io')) {
    return 'https://testtf.dataworker.ru';
  }

  return origin;
};

/**
 * Выполнить запрос к TradeCorp API через Backend Proxy
 */
async function tradecorpProxyRequest<T>(
  endpoint: string,
  options: TradecorpProxyRequestOptions = {}
): Promise<T> {
  const { method = 'GET', body } = options;
  const maxRetries = 2;
  const retryDelays = [1000, 3000];

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const baseUrl = getProxyBaseUrl();
      const fullPath = `${baseUrl}/api/tradecorp${endpoint}`;

      if (!baseUrl || !baseUrl.startsWith('http')) {
        throw new Error(`Некорректный baseUrl для TradeCorp Proxy: ${baseUrl}`);
      }

      const url = new URL(fullPath);
      const timeout = 60000; // 60 секунд

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url.toString(), {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `TradeCorp API Error: ${response.status}`;

          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorJson.error || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }

          throw new Error(errorMessage);
        }

        return await response.json();

      } finally {
        clearTimeout(timeoutId);
      }

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Не повторяем при AbortError (timeout) или последней попытке
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('TradeCorp API: превышено время ожидания');
      }

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
        continue;
      }
    }
  }

  throw lastError || new Error('TradeCorp API: неизвестная ошибка');
}

/**
 * Получить транзакции из TradeCorp
 */
export async function getTradecorpTransactions(
  dateFrom: string,
  dateTo: string,
  stationIds?: number[]
): Promise<TradecorpTransaction[]> {
  console.log('[TradeCorp] 📥 Запрос транзакций:', { dateFrom, dateTo, stationIds });

  const response = await tradecorpProxyRequest<TradecorpTransactionsResponse>(
    '/transactions',
    {
      method: 'POST',
      body: {
        dateFrom,
        dateTo,
        stationIds: stationIds || []
      }
    }
  );

  console.log('[TradeCorp] 📦 Ответ:', {
    success: response.success,
    transactionsCount: response.transactions?.length || 0,
    firstTransaction: response.transactions?.[0] || null
  });

  if (!response.success) {
    console.error('[TradeCorp] ❌ Ошибка: success=false');
    throw new Error('Не удалось получить транзакции TradeCorp');
  }

  return response.transactions;
}

/**
 * Получить сводку по транзакциям TradeCorp
 */
export async function getTradecorpSummary(
  dateFrom: string,
  dateTo: string,
  stationIds?: number[]
): Promise<TradecorpSummaryResponse['summary']> {
  const response = await tradecorpProxyRequest<TradecorpSummaryResponse>(
    '/transactions/summary',
    {
      method: 'POST',
      body: {
        dateFrom,
        dateTo,
        stationIds: stationIds || []
      }
    }
  );

  if (!response.success) {
    throw new Error('Не удалось получить сводку TradeCorp');
  }

  return response.summary;
}

/**
 * Проверить доступность TradeCorp API
 */
export async function checkTradecorpHealth(): Promise<{
  status: 'ok' | 'error';
  emitentId?: number;
  tokenValid?: boolean;
  message?: string;
}> {
  try {
    return await tradecorpProxyRequest<{
      status: 'ok' | 'error';
      emitentId: number;
      tokenValid: boolean;
    }>('/health');
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    };
  }
}
