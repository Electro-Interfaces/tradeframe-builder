/**
 * Единый HTTP-клиент для backend API.
 * Все модульные клиенты (admin, org, audit, nomenclature) используют его.
 */

import { getBackendOrigin } from '@/utils/backendUrl';

const BASE = `${getBackendOrigin()}/api`;

function getAuthToken(): string {
  return localStorage.getItem('auth_token')
    || sessionStorage.getItem('auth_token')
    || '';
}

async function parseResponse(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Выполнить запрос к backend API.
 * @param endpoint — путь после /api (напр. "/users", "/audit/stats")
 * @param options — RequestInit (method, body, headers...)
 * @param requiresAuth — если false, запрос пойдёт без токена (по умолчанию true)
 */
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {},
  requiresAuth = true,
): Promise<any> {
  const token = getAuthToken();

  if (requiresAuth && !token) {
    throw new Error('Требуется повторный вход в систему');
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const body = await parseResponse(response);

  if (!response.ok) {
    const message = body?.error || body?.message || `Ошибка запроса: ${response.status}`;
    const err = new Error(message);
    (err as any).status = response.status;
    throw err;
  }

  return body;
}
