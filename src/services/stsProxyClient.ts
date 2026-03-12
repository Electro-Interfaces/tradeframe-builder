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

interface ProxyError extends Error {
  status?: number;
  isTimeout?: boolean;
}

interface StsProxyRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, string | number | boolean>;
  body?: unknown;
}

/**
 * Получение данных текущего пользователя из localStorage
 * Передаются как X-User-Id и X-User-Name заголовки в каждом запросе к backend proxy
 */
function getUserHeaders(): Record<string, string> {
  try {
    // Источник 1: auth_user из нашей БД (NewAuthContext)
    const appUserRaw = localStorage.getItem('auth_user');
    if (appUserRaw) {
      const appUser = JSON.parse(appUserRaw);
      if (appUser?.id || appUser?.name) {
        const headers: Record<string, string> = {};
        if (appUser.id) headers['X-User-Id'] = appUser.id;
        if (appUser.name) headers['X-User-Name'] = encodeURIComponent(appUser.name);
        else if (appUser.email) headers['X-User-Name'] = encodeURIComponent(appUser.email);
        return headers;
      }
    }

    // Источник 2: Legacy auth token (fallback)
    const projectRef = (import.meta.env.VITE_SUPABASE_URL || '').replace('https://', '').split('.')[0];
    const raw = localStorage.getItem(`sb-${projectRef}-auth-token`);
    if (raw) {
      const parsed = JSON.parse(raw);
      const user = parsed?.user;
      if (user) {
        const headers: Record<string, string> = {};
        if (user.id) headers['X-User-Id'] = user.id;
        const name = user.user_metadata?.name || user.email || '';
        if (name) headers['X-User-Name'] = encodeURIComponent(name);
        return headers;
      }
    }
  } catch {
    // Если не удалось получить данные пользователя — не критично
  }
  return {};
}

import { getBackendOrigin } from '@/utils/backendUrl';

const getProxyBaseUrl = getBackendOrigin;

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
            ...getUserHeaders(),
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

          const error: ProxyError = Object.assign(new Error(`STS API request failed (${response.status}): ${errorDetails}`), { status: response.status });

          // Не повторяем для клиентских ошибок (кроме 401/408/429)
          // 429 = rate limit — повторяем с увеличенной задержкой
          if (response.status >= 400 && response.status < 500 && response.status !== 401 && response.status !== 408 && response.status !== 429) {
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
          const timeoutError: ProxyError = Object.assign(new Error(`Request timeout after ${timeout}ms`), { isTimeout: true as const });
          throw timeoutError;
        }

        throw fetchError;
      }

    } catch (error: any) {
      lastError = error;

      // Не повторяем для клиентских ошибок (кроме 401/408/429)
      if (error.status >= 400 && error.status < 500 && error.status !== 401 && error.status !== 408 && error.status !== 429) {
        throw error;
      }

      // Если это последняя попытка, выбрасываем ошибку
      if (attempt === maxRetries) {
        break;
      }

      // При 429 ждём дольше (rate limit)
      const baseDelay = retryDelays[attempt] || 4000;
      const delay = error.status === 429 ? baseDelay * 2 : baseDelay;
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
