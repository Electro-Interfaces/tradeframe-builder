import { apiRequest } from './apiClient';

export async function auditApiRequest(
  endpoint = '',
  options: RequestInit = {},
  requiresAuth = false,
): Promise<any> {
  return apiRequest(`/audit${endpoint}`, options, requiresAuth);
}
