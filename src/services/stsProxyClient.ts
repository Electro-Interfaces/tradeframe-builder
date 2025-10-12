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
  // В production используем текущий домен
  if (import.meta.env.PROD) {
    return window.location.origin;
  }

  // В development можем использовать другой порт если нужно
  return 'http://localhost:3001';
};

/**
 * Выполнить запрос к STS API через Backend Proxy
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

  // Формируем URL через наш Backend Proxy
  const baseUrl = getProxyBaseUrl();
  const url = new URL(`${baseUrl}/api/sts${endpoint}`);

  // Добавляем query параметры
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  // Выполняем запрос
  const response = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    ...(body && { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    // Пытаемся получить детали ошибки
    let errorDetails = response.statusText;
    try {
      const errorBody = await response.json();
      errorDetails = errorBody.message || JSON.stringify(errorBody);
      console.error('❌ STS Proxy Error:', response.status, errorBody);
    } catch (e) {
      console.error('❌ STS Proxy Error:', response.status, response.statusText);
    }
    throw new Error(`STS API request failed (${response.status}): ${errorDetails}`);
  }

  return response.json();
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
