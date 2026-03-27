import { apiRequest } from './apiClient';

export async function nomenclatureApiRequest(endpoint = '', options: RequestInit = {}): Promise<any> {
  return apiRequest(`/nomenclature${endpoint}`, options);
}
