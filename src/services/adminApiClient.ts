import { apiRequest } from './apiClient';

export async function adminApiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  return apiRequest(endpoint, options);
}
