import { getBackendOrigin } from '@/utils/backendUrl';

const AUDIT_API_MODE = import.meta.env.VITE_AUDIT_API_MODE === 'backend'
  ? 'backend'
  : 'legacy';
const API_BASE_URL = `${getBackendOrigin()}/api/audit`;

function getAuthToken(): string {
  return localStorage.getItem('auth_token')
    || sessionStorage.getItem('auth_token')
    || '';
}

async function parseResponse(response: Response): Promise<any> {
  const responseText = await response.text();

  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
}

export function isAuditBackendMode(): boolean {
  return AUDIT_API_MODE === 'backend';
}

export async function auditApiRequest(
  endpoint = '',
  options: RequestInit = {},
  requiresAuth: boolean = false
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
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const body = await parseResponse(response);
  if (!response.ok) {
    const message = body?.error || body?.message || `Ошибка запроса: ${response.status}`;
    throw new Error(message);
  }

  return body;
}
