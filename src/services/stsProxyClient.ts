/**
 * Клиент для работы с STS API через Backend Proxy
 *
 * Все запросы идут через наш backend на /api/sts/*
 * Backend автоматически добавляет Basic Auth и проксирует к STS API
 *
 * Преимущества:
 * - Учетные данные не попадают в frontend bundle
 * - Не нужна авторизация на клиенте
 * - Централизованное управление credentials
 */

interface StsProxyRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, any>;
  body?: any;
}

/**
 * Базовый URL для Backend Proxy
 * В development - localhost, в production - текущий домен
 */
const getProxyBaseUrl = (): string => {
  // Всегда используем текущий домен (откуда загружено приложение)
  const origin = window.location.origin;

  // Проверка на корректность origin
  if (!origin || origin === 'null' || origin === 'undefined') {
    console.error('❌ window.location.origin некорректен:', origin);
    throw new Error('Cannot determine origin for STS Proxy');
  }

  return origin;
};

/**
 * Выполнить запрос к STS API через Backend Proxy с retry механизмом
 *
 * @param endpoint - Endpoint STS API (например, /v1/shifts)
 * @param options - Опции запроса
 * @returns Данные от STS API
 *
 * @example
 * const shifts = await stsProxyRequest('/v1/shifts', {
 *   params: { system: 15, station: 1 }
 * });
 */
export async function stsProxyRequest<T>(
  endpoint: string,
  options: StsProxyRequestOptions = {}
): Promise<T> {
  const { method = 'GET', params, body } = options;
  const maxRetries = 3;
  const retryDelays = [1000, 2000, 4000]; // Exponential backoff в миллисекундах

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Формируем URL через наш Backend Proxy
      const baseUrl = getProxyBaseUrl();
      const fullPath = `${baseUrl}/api/sts${endpoint}`;

      // Проверка корректности URL перед созданием
      if (!baseUrl || !baseUrl.startsWith('http')) {
        throw new Error(`Некорректный baseUrl для STS Proxy: ${baseUrl}`);
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

      // Адаптивный timeout: первый запрос 45 сек, последующие 90 сек (увеличено для медленных соединений на PROD)
      const timeout = attempt === 0 ? 45000 : 90000;

      // Выполняем запрос с timeout
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
          // Пытаемся получить детали ошибки
          let errorDetails = response.statusText;
          try {
            const errorBody = await response.json();
            errorDetails = errorBody.message || JSON.stringify(errorBody);
          } catch (e) {
            // Игнорируем ошибки парсинга
          }

          const error = new Error(`STS API request failed (${response.status}): ${errorDetails}`) as any;
          error.status = response.status;

          // Не повторяем для клиентских ошибок (кроме 401/408)
          if (response.status >= 400 && response.status < 500 && response.status !== 401 && response.status !== 408) {
            throw error;
          }

          throw error;
        }

        // Успешный запрос
        return response.json();

      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        // Обработка timeout
        if (fetchError.name === 'AbortError') {
          const timeoutError = new Error(`Request timeout after ${timeout}ms`) as any;
          timeoutError.isTimeout = true;
          throw timeoutError;
        }

        throw fetchError;
      }

    } catch (error: any) {
      lastError = error;

      // Не повторяем для клиентских ошибок (кроме 401/408)
      if (error.status >= 400 && error.status < 500 && error.status !== 401 && error.status !== 408) {
        throw error;
      }

      // Если это последняя попытка, выбрасываем ошибку
      if (attempt === maxRetries) {
        break;
      }

      // Ждем перед следующей попыткой
      const delay = retryDelays[attempt] || 4000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Все попытки исчерпаны
  throw lastError || new Error('All retry attempts failed');
}

/**
 * Клиент для работы с STS API
 */
export const stsProxyClient = {
  /**
   * GET запрос к STS API
   */
  get: <T>(endpoint: string, params?: Record<string, any>) =>
    stsProxyRequest<T>(endpoint, { method: 'GET', params }),

  /**
   * POST запрос к STS API
   */
  post: <T>(endpoint: string, body?: any, params?: Record<string, any>) =>
    stsProxyRequest<T>(endpoint, { method: 'POST', body, params }),

  /**
   * PUT запрос к STS API
   */
  put: <T>(endpoint: string, body?: any, params?: Record<string, any>) =>
    stsProxyRequest<T>(endpoint, { method: 'PUT', body, params }),

  /**
   * DELETE запрос к STS API
   */
  delete: <T>(endpoint: string, params?: Record<string, any>) =>
    stsProxyRequest<T>(endpoint, { method: 'DELETE', params }),
};

export default stsProxyClient;
