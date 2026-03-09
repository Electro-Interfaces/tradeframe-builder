import { getBackendOrigin } from '@/utils/backendUrl';

const ORG_API_MODE = import.meta.env.VITE_ORG_API_MODE === 'legacy' ? 'legacy' : 'backend';
const API_BASE_URL = `${getBackendOrigin()}/api`;

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

export function isOrgBackendMode(): boolean {
  return ORG_API_MODE === 'backend';
}

export async function orgApiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Требуется повторный вход в систему');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    credentials: 'include',
  });

  const body = await parseResponse(response);

  if (!response.ok) {
    const message = body?.error || body?.message || `Ошибка запроса: ${response.status}`;
    throw new Error(message);
  }

  return body;
}
