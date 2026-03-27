import { apiRequest } from './apiClient';

export async function orgApiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  return apiRequest(endpoint, options);
}
