import { 
  Connection, 
  CreateConnectionRequest, 
  UpdateConnectionRequest, 
  ConnectionTestResult, 
  ConnectionsApiResponse, 
  ApiError 
} from '@/types/connections';

import { apiConfigServiceDB } from './apiConfigServiceDB';
import { httpClient } from './universalHttpClient';

// Helper function to get API URL
const getApiUrl = async (): Promise<string> => {
  const connection = await apiConfigServiceDB.getCurrentConnection();
  return connection?.url || '';
};

class ConnectionsApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ConnectionsApiError';
  }
}

export const connectionsApi = {
  async getConnections(): Promise<Connection[]> {
    try {
      const response = await httpClient.get('/connections', {
        destination: 'supabase'
      });
      if (!response.success) {
        throw new ConnectionsApiError(response.status || 500, response.error || 'Request failed');
      }
      return response.data.connections || response.data;
    } catch (error) {
      if (error instanceof ConnectionsApiError) throw error;
      throw new ConnectionsApiError(500, 'Failed to fetch connections');
    }
  },

  async createConnection(data: CreateConnectionRequest): Promise<Connection> {
    try {
      const response = await httpClient.post('/connections', data, {
        destination: 'supabase'
      });

      if (!response.success) {
        throw new ConnectionsApiError(response.status || 500, response.error || 'Request failed');
      }

      return response.data;
    } catch (error) {
      if (error instanceof ConnectionsApiError) throw error;
      throw new ConnectionsApiError(500, 'Failed to create connection');
    }
  },

  async updateConnection(id: string, data: UpdateConnectionRequest): Promise<Connection> {
    try {
      const response = await httpClient.patch(`/connections/${id}`, data, {
        destination: 'supabase'
      });

      if (!response.success) {
        throw new ConnectionsApiError(response.status || 500, response.error || 'Request failed');
      }

      return response.data;
    } catch (error) {
      if (error instanceof ConnectionsApiError) throw error;
      throw new ConnectionsApiError(500, 'Failed to update connection');
    }
  },

  async deleteConnection(id: string): Promise<void> {
    try {
      const response = await httpClient.delete(`/connections/${id}`, {
        destination: 'supabase'
      });

      if (!response.success) {
        throw new ConnectionsApiError(response.status || 500, response.error || 'Request failed');
      }
    } catch (error) {
      if (error instanceof ConnectionsApiError) throw error;
      throw new ConnectionsApiError(500, 'Failed to delete connection');
    }
  },

  async cloneConnection(id: string): Promise<Connection> {
    try {
      const response = await httpClient.post(`/connections/${id}/clone`, null, {
        destination: 'supabase'
      });

      if (!response.success) {
        throw new ConnectionsApiError(response.status || 500, response.error || 'Request failed');
      }

      return response.data;
    } catch (error) {
      if (error instanceof ConnectionsApiError) throw error;
      throw new ConnectionsApiError(500, 'Failed to clone connection');
    }
  },

  async testConnection(id: string): Promise<ConnectionTestResult> {
    try {
      const response = await httpClient.post(`/connections/${id}/test`, null, {
        destination: 'supabase'
      });

      if (!response.success) {
        throw new ConnectionsApiError(response.status || 500, response.error || 'Request failed');
      }

      return response.data;
    } catch (error) {
      if (error instanceof ConnectionsApiError) throw error;
      throw new ConnectionsApiError(500, 'Failed to test connection');
    }
  },

  async rotateSecret(id: string): Promise<Connection> {
    try {
      const response = await httpClient.post(`/connections/${id}/rotate-secret`, null, {
        destination: 'supabase'
      });

      if (!response.success) {
        throw new ConnectionsApiError(response.status || 500, response.error || 'Request failed');
      }

      return response.data;
    } catch (error) {
      if (error instanceof ConnectionsApiError) throw error;
      throw new ConnectionsApiError(500, 'Failed to rotate secret');
    }
  },
};

// ❌ MOCK ДАННЫЕ УДАЛЕНЫ ИЗ СООБРАЖЕНИЙ БЕЗОПАСНОСТИ
// Все подключения должны настраиваться через раздел "Обмен данными"
export const mockConnections: Connection[] = [];

// ❌ MOCK API ФУНКЦИИ ЗАБЛОКИРОВАНЫ ИЗ СООБРАЖЕНИЙ БЕЗОПАСНОСТИ
// Используйте только реальные API подключения через раздел "Обмен данными"
export const mockConnectionsApi = {
  async getConnections(): Promise<Connection[]> {
    throw new Error('Mock API заблокирован. Настройте реальное подключение в разделе "Обмен данными".');
  },

  async createConnection(data: CreateConnectionRequest): Promise<Connection> {
    throw new Error('Mock API заблокирован. Настройте реальное подключение в разделе "Обмен данными".');
  },

  async updateConnection(id: string, data: UpdateConnectionRequest): Promise<Connection> {
    throw new Error('Mock API заблокирован. Настройте реальное подключение в разделе "Обмен данными".');
  },

  async deleteConnection(id: string): Promise<void> {
    throw new Error('Mock API заблокирован. Настройте реальное подключение в разделе "Обмен данными".');
  },

  async cloneConnection(id: string): Promise<Connection> {
    throw new Error('Mock API заблокирован. Настройте реальное подключение в разделе "Обмен данными".');
  },

  async testConnection(id: string): Promise<ConnectionTestResult> {
    throw new Error('Mock API заблокирован. Настройте реальное подключение в разделе "Обмен данными".');
  },

  async rotateSecret(id: string): Promise<Connection> {
    throw new Error('Mock API заблокирован. Настройте реальное подключение в разделе "Обмен данными".');
  },
};