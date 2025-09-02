/**
 * Mock data store for Connection Settings
 * Provides realistic test data for the Templates & Connections system
 */

import { ConnectionSettings, ConnectionStatus, AuthType } from '@/types/connections';

// Helper to generate UUIDv7-like IDs
const generateId = () => `cs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Mock connection settings data
const connectionSettingsData: ConnectionSettings[] = [
  {
    id: generateId(),
    provider_id: 'autooplata_tms',
    base_url: 'https://pos.autooplata.ru/tms',
    auth: {
      type: 'bearer',
      location: 'header',
      name: 'Authorization'
    },
    secrets_ref: 'vault://autooplata/jwt-token',
    timeout_ms: 10000,
    rate_limit: 60,
    status: 'active',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-02-20T14:15:00Z',
    created_by: 'admin',
    updated_by: 'admin',
    version: 1
  },
  {
    id: generateId(),
    provider_id: 'payment_gateway',
    base_url: 'https://secure-payments.example.com/api/v1',
    auth: {
      type: 'bearer',
      location: 'header',
      name: 'Authorization'
    },
    secrets_ref: 'vault://payments/oauth-token',
    timeout_ms: 10000,
    rate_limit: 50,
    status: 'active',
    created_at: '2024-01-20T09:00:00Z',
    updated_at: '2024-02-25T16:30:00Z',
    created_by: 'integrator',
    updated_by: 'integrator',
    version: 3
  },
  {
    id: generateId(),
    provider_id: 'inventory_system',
    base_url: 'https://inventory.internal.corp/api',
    auth: {
      type: 'api_key',
      location: 'query',
      name: 'api_key'
    },
    secrets_ref: 'vault://internal/inventory-key',
    timeout_ms: 3000,
    rate_limit: 200,
    status: 'active',
    created_at: '2024-02-01T08:45:00Z',
    updated_at: '2024-02-28T12:00:00Z',
    created_by: 'admin',
    updated_by: 'admin',
    version: 2
  },
  {
    id: generateId(),
    provider_id: 'weather_service',
    base_url: 'https://api.weather.com/v1',
    auth: {
      type: 'none'
    },
    timeout_ms: 6000,
    rate_limit: 60,
    status: 'inactive',
    created_at: '2024-01-10T12:00:00Z',
    updated_at: '2024-01-10T12:00:00Z',
    created_by: 'admin',
    updated_by: 'admin',
    version: 1
  },
  {
    id: generateId(),
    provider_id: 'loyalty_program',
    base_url: 'https://loyalty-api.company.com/v2',
    auth: {
      type: 'bearer',
      location: 'header',
      name: 'Authorization'
    },
    secrets_ref: 'vault://loyalty/jwt-token',
    timeout_ms: 8000,
    rate_limit: 150,
    status: 'testing',
    created_at: '2024-02-15T14:20:00Z',
    updated_at: '2024-03-01T10:45:00Z',
    created_by: 'integrator',
    updated_by: 'integrator',
    version: 1
  },
  {
    id: generateId(),
    provider_id: 'crm_system',
    base_url: 'https://crm.example.com/api/v3',
    auth: {
      type: 'api_key',
      location: 'header',
      name: 'X-CRM-Key'
    },
    secrets_ref: 'vault://crm/api-key',
    timeout_ms: 7000,
    rate_limit: 80,
    status: 'error',
    created_at: '2024-01-25T11:30:00Z',
    updated_at: '2024-02-10T09:15:00Z',
    created_by: 'admin',
    updated_by: 'admin',
    version: 1
  }
];

// Store interface
export const connectionSettingsStore = {
  // Get all connection settings
  getAll(): ConnectionSettings[] {
    return [...connectionSettingsData];
  },

  // Get connection by ID
  getById(id: string): ConnectionSettings | undefined {
    return connectionSettingsData.find(cs => cs.id === id);
  },

  // Get connections by provider ID
  getByProviderId(providerId: string): ConnectionSettings[] {
    return connectionSettingsData.filter(cs => cs.provider_id === providerId);
  },

  // Get connections by status
  getByStatus(status: ConnectionStatus): ConnectionSettings[] {
    return connectionSettingsData.filter(cs => cs.status === status);
  },

  // Get active connections only
  getActive(): ConnectionSettings[] {
    return connectionSettingsData.filter(cs => cs.status === 'active');
  },

  // Search connections by various fields
  search(query: string): ConnectionSettings[] {
    const searchTerm = query.toLowerCase();
    return connectionSettingsData.filter(cs =>
      cs.provider_id.toLowerCase().includes(searchTerm) ||
      cs.base_url.toLowerCase().includes(searchTerm) ||
      cs.auth.type.toLowerCase().includes(searchTerm)
    );
  },

  // Get connections with pagination and sorting
  getFiltered(params: {
    provider_id?: string;
    status?: ConnectionStatus;
    search?: string;
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }) {
    let filtered = [...connectionSettingsData];

    // Apply filters
    if (params.provider_id) {
      filtered = filtered.filter(cs => cs.provider_id === params.provider_id);
    }

    if (params.status) {
      filtered = filtered.filter(cs => cs.status === params.status);
    }

    if (params.search) {
      const searchTerm = params.search.toLowerCase();
      filtered = filtered.filter(cs =>
        cs.provider_id.toLowerCase().includes(searchTerm) ||
        cs.base_url.toLowerCase().includes(searchTerm) ||
        cs.auth.type.toLowerCase().includes(searchTerm)
      );
    }

    // Apply sorting
    if (params.sort_by) {
      filtered.sort((a, b) => {
        const aVal = (a as any)[params.sort_by!];
        const bVal = (b as any)[params.sort_by!];
        
        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        else if (aVal > bVal) comparison = 1;
        
        return params.sort_order === 'desc' ? -comparison : comparison;
      });
    }

    // Apply pagination
    const page = params.page || 1;
    const limit = params.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filtered.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      total: filtered.length,
      page,
      limit,
      total_pages: Math.ceil(filtered.length / limit)
    };
  }
};

// Available provider IDs for dropdowns
export const AVAILABLE_PROVIDERS = [
  { id: 'autooplata_tms', name: 'Autooplata TMS', description: 'Система управления терминалами Autooplata' },
  { id: 'payment_gateway', name: 'Payment Gateway', description: 'Платежный шлюз для обработки платежей' },
  { id: 'inventory_system', name: 'Inventory System', description: 'Система управления запасами' },
  { id: 'weather_service', name: 'Weather Service', description: 'Сервис погодных данных' },
  { id: 'loyalty_program', name: 'Loyalty Program', description: 'API программы лояльности' },
  { id: 'crm_system', name: 'CRM System', description: 'Система управления клиентами' },
  { id: 'analytics_platform', name: 'Analytics Platform', description: 'Платформа бизнес-аналитики' },
  { id: 'notification_service', name: 'Notification Service', description: 'Сервис уведомлений' }
];

// Auth type configurations
export const AUTH_TYPE_CONFIGS = [
  {
    type: 'none' as AuthType,
    name: 'Без аутентификации',
    description: 'Открытый API без аутентификации',
    requires_location: false,
    requires_name: false,
    requires_secrets: false
  },
  {
    type: 'api_key' as AuthType,
    name: 'API Key',
    description: 'Аутентификация через API ключ',
    requires_location: true,
    requires_name: true,
    requires_secrets: true
  },
  {
    type: 'bearer' as AuthType,
    name: 'Bearer Token',
    description: 'JWT или OAuth2 Bearer token',
    requires_location: true,
    requires_name: true,
    requires_secrets: true
  }
];

// Default timeout and rate limit values
export const DEFAULT_CONFIG = {
  timeout_ms: 6000,
  rate_limit: 100
};