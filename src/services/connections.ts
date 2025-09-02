import { 
  Connection, 
  CreateConnectionRequest, 
  UpdateConnectionRequest, 
  ConnectionTestResult, 
  ConnectionsApiResponse, 
  ApiError 
} from '@/types/connections';

import { getApiBaseUrl, isApiMockMode } from '@/services/apiConfigService';
const API_BASE_URL = getApiBaseUrl();

class ConnectionsApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ConnectionsApiError';
  }
}

export const connectionsApi = {
  async getConnections(): Promise<Connection[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/connections`);
      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new ConnectionsApiError(response.status, error.message);
      }
      const data: ConnectionsApiResponse = await response.json();
      return data.connections;
    } catch (error) {
      if (error instanceof ConnectionsApiError) throw error;
      throw new ConnectionsApiError(500, 'Failed to fetch connections');
    }
  },

  async createConnection(data: CreateConnectionRequest): Promise<Connection> {
    try {
      const response = await fetch(`${API_BASE_URL}/connections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new ConnectionsApiError(response.status, error.message);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ConnectionsApiError) throw error;
      throw new ConnectionsApiError(500, 'Failed to create connection');
    }
  },

  async updateConnection(id: string, data: UpdateConnectionRequest): Promise<Connection> {
    try {
      const response = await fetch(`${API_BASE_URL}/connections/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new ConnectionsApiError(response.status, error.message);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ConnectionsApiError) throw error;
      throw new ConnectionsApiError(500, 'Failed to update connection');
    }
  },

  async deleteConnection(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/connections/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new ConnectionsApiError(response.status, error.message);
      }
    } catch (error) {
      if (error instanceof ConnectionsApiError) throw error;
      throw new ConnectionsApiError(500, 'Failed to delete connection');
    }
  },

  async cloneConnection(id: string): Promise<Connection> {
    try {
      const response = await fetch(`${API_BASE_URL}/connections/${id}/clone`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new ConnectionsApiError(response.status, error.message);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ConnectionsApiError) throw error;
      throw new ConnectionsApiError(500, 'Failed to clone connection');
    }
  },

  async testConnection(id: string): Promise<ConnectionTestResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/connections/${id}/test`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new ConnectionsApiError(response.status, error.message);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ConnectionsApiError) throw error;
      throw new ConnectionsApiError(500, 'Failed to test connection');
    }
  },

  async rotateSecret(id: string): Promise<Connection> {
    try {
      const response = await fetch(`${API_BASE_URL}/connections/${id}/rotate-secret`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new ConnectionsApiError(response.status, error.message);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ConnectionsApiError) throw error;
      throw new ConnectionsApiError(500, 'Failed to rotate secret');
    }
  },
};

// Mock data for development
export const mockConnections: Connection[] = [
  {
    id: '1',
    name: 'API баз данных',
    type: 'API_DB',
    connectionType: 'OTHER',
    purpose: 'Основная база данных приложения',
    baseUrl: 'https://xyzabc123.supabase.co',
    transport: 'HTTPS',
    format: 'JSON',
    auth: {
      type: 'API_KEY',
      apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emFiYzEyMyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjk0NzIwNDAwLCJleHAiOjIwMTAyOTY0MDB9.example',
    },
    exchangeParams: {
      endpoints: ['/rest/v1', '/auth/v1', '/storage/v1'],
      headers: {},
      retries: 3,
      rateLimit: 100,
    },
    security: {
      ipAllowlist: [],
    },
    isEnabled: true,
    tags: ['production', 'database'],
    responsible: 'admin@company.com',
    isSystem: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'API торговой сети',
    type: 'API_NETWORK',
    connectionType: 'OTHER',
    purpose: 'Подключение к внешнему API торговой сети',
    baseUrl: 'https://api.fuel-terminals.com/v2/',
    transport: 'HTTPS',
    format: 'JSON',
    auth: {
      type: 'API_KEY',
      apiKey: 'ft_api_key_abc123def456ghi789',
    },
    exchangeParams: {
      endpoints: ['/terminals', '/prices', '/transactions'],
      headers: { 'Accept': 'application/json' },
      schedule: '0 */30 * * * *', // Every 30 minutes
      retries: 3,
      rateLimit: 60,
    },
    security: {
      ipAllowlist: ['192.168.1.0/24'],
    },
    isEnabled: true,
    tags: ['production', 'external-api'],
    responsible: 'api-admin@company.com',
    isSystem: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

// Mock API functions for development
export const mockConnectionsApi = {
  async getConnections(): Promise<Connection[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockConnections), 500);
    });
  },

  async createConnection(data: CreateConnectionRequest): Promise<Connection> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate system connection creation restriction
        if (data.name.toLowerCase().includes('система') || 
            data.name.toLowerCase().includes('system')) {
          reject(new ConnectionsApiError(409, 'Cannot create system connections'));
          return;
        }

        const newConnection: Connection = {
          id: Date.now().toString(),
          ...data,
          type: 'API_NETWORK', // Default for user connections
          isSystem: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isEnabled: data.isEnabled ?? true,
          tags: data.tags ?? [],
        };
        resolve(newConnection);
      }, 500);
    });
  },

  async updateConnection(id: string, data: UpdateConnectionRequest): Promise<Connection> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const connection = mockConnections.find(c => c.id === id);
        if (!connection) {
          reject(new ConnectionsApiError(404, 'Connection not found'));
          return;
        }

        const updatedConnection: Connection = {
          ...connection,
          ...data,
          updatedAt: new Date().toISOString(),
        };
        resolve(updatedConnection);
      }, 500);
    });
  },

  async deleteConnection(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const connection = mockConnections.find(c => c.id === id);
        if (!connection) {
          reject(new ConnectionsApiError(404, 'Connection not found'));
          return;
        }

        if (connection.isSystem) {
          reject(new ConnectionsApiError(403, 'Cannot delete system connections'));
          return;
        }

        resolve();
      }, 500);
    });
  },

  async cloneConnection(id: string): Promise<Connection> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const connection = mockConnections.find(c => c.id === id);
        if (!connection) {
          reject(new ConnectionsApiError(404, 'Connection not found'));
          return;
        }

        if (connection.isSystem) {
          reject(new ConnectionsApiError(403, 'Cannot clone system connections'));
          return;
        }

        const clonedConnection: Connection = {
          ...connection,
          id: Date.now().toString(),
          name: `${connection.name} (копия)`,
          isSystem: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        resolve(clonedConnection);
      }, 500);
    });
  },

  async testConnection(id: string): Promise<ConnectionTestResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.3; // 70% success rate
        resolve({
          success,
          message: success ? 'Соединение установлено' : 'Ошибка подключения',
          ping: success ? Math.floor(Math.random() * 200) + 50 : undefined,
          error: success ? undefined : 'Connection timeout',
        });
      }, 2000);
    });
  },

  async rotateSecret(id: string): Promise<Connection> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const connection = mockConnections.find(c => c.id === id);
        if (!connection) {
          reject(new ConnectionsApiError(404, 'Connection not found'));
          return;
        }

        // Generate new API key (mock)
        const newApiKey = 'new_' + Math.random().toString(36).substr(2, 32);
        const updatedConnection: Connection = {
          ...connection,
          auth: {
            ...connection.auth,
            apiKey: newApiKey,
          },
          updatedAt: new Date().toISOString(),
        };
        resolve(updatedConnection);
      }, 500);
    });
  },
};