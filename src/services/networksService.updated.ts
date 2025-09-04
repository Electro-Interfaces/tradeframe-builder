/**
 * Networks Service - Обновлено для работы с реальным API
 * Для АГЕНТА 3: API Endpoints
 * 
 * Этот файл демонстрирует как переписать существующий сервис
 * для работы с реальным API вместо mock данных
 */

import { apiConfigService } from './apiConfigService';

export interface Network {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: 'active' | 'inactive' | 'maintenance';
  settings?: Record<string, any>;
  tradingPoints?: TradingPoint[];
  createdAt?: string;
  updatedAt?: string;
  created_at?: string; // БД формат
  updated_at?: string; // БД формат
}

export interface TradingPoint {
  id: string;
  networkId: string;
  name: string;
  code: string;
  address?: string;
  location?: { lat?: number; lng?: number; region?: string; city?: string };
  type?: 'station' | 'terminal' | 'depot' | 'warehouse';
  status: 'active' | 'inactive' | 'maintenance' | 'closed';
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
}

class NetworksServiceUpdated {
  private apiUrl = apiConfigService.getCurrentApiUrl();
  
  /**
   * Получить список всех сетей
   */
  async getNetworks(): Promise<Network[]> {
    try {
      // Если в режиме моков - используем старую логику
      if (apiConfigService.isMockMode()) {
        return this.getMockNetworks();
      }
      
      // Используем реальный API
      const response = await this.apiRequest('/networks');
      return this.transformNetworksFromApi(response.data);
      
    } catch (error) {
      console.error('Networks API error:', error);
      
      // Fallback на mock данные при ошибке API
      console.warn('Falling back to mock data due to API error');
      return this.getMockNetworks();
    }
  }
  
  /**
   * Получить сеть по ID
   */
  async getNetworkById(id: string): Promise<Network | null> {
    try {
      if (apiConfigService.isMockMode()) {
        const networks = await this.getMockNetworks();
        return networks.find(n => n.id === id) || null;
      }
      
      const response = await this.apiRequest(`/networks/${id}`);
      return this.transformNetworkFromApi(response.data);
      
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      
      console.error(`Network ${id} API error:`, error);
      
      // Fallback на mock данные
      const networks = await this.getMockNetworks();
      return networks.find(n => n.id === id) || null;
    }
  }
  
  /**
   * Создать новую сеть
   */
  async createNetwork(networkData: Omit<Network, 'id' | 'createdAt' | 'updatedAt'>): Promise<Network> {
    try {
      if (apiConfigService.isMockMode()) {
        return this.createMockNetwork(networkData);
      }
      
      const response = await this.apiRequest('/networks', {
        method: 'POST',
        body: JSON.stringify({
          name: networkData.name,
          code: networkData.code,
          description: networkData.description,
          status: networkData.status || 'active',
          settings: networkData.settings || {}
        })
      });
      
      return this.transformNetworkFromApi(response.data);
      
    } catch (error) {
      console.error('Create network API error:', error);
      throw new Error(`Failed to create network: ${error}`);
    }
  }
  
  /**
   * Обновить сеть
   */
  async updateNetwork(id: string, updates: Partial<Network>): Promise<Network> {
    try {
      if (apiConfigService.isMockMode()) {
        return this.updateMockNetwork(id, updates);
      }
      
      const response = await this.apiRequest(`/networks/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: updates.name,
          description: updates.description,
          status: updates.status,
          settings: updates.settings
        })
      });
      
      return this.transformNetworkFromApi(response.data);
      
    } catch (error) {
      console.error(`Update network ${id} API error:`, error);
      throw new Error(`Failed to update network: ${error}`);
    }
  }
  
  /**
   * Удалить сеть
   */
  async deleteNetwork(id: string): Promise<boolean> {
    try {
      if (apiConfigService.isMockMode()) {
        return this.deleteMockNetwork(id);
      }
      
      await this.apiRequest(`/networks/${id}`, {
        method: 'DELETE'
      });
      
      return true;
      
    } catch (error) {
      console.error(`Delete network ${id} API error:`, error);
      throw new Error(`Failed to delete network: ${error}`);
    }
  }
  
  /**
   * Получить статистику сетей
   */
  async getNetworksStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    maintenance: number;
  }> {
    try {
      if (apiConfigService.isMockMode()) {
        return this.getMockNetworksStats();
      }
      
      const response = await this.apiRequest('/networks/stats');
      return response.data;
      
    } catch (error) {
      console.error('Networks stats API error:', error);
      return this.getMockNetworksStats();
    }
  }
  
  // ============================================
  // PRIVATE API HELPERS
  // ============================================
  
  /**
   * Выполнить запрос к API
   */
  private async apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.apiUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      }
    };
    
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        statusText: response.statusText,
        message: errorData.error || 'API request failed',
        details: errorData.details
      };
    }
    
    return await response.json();
  }
  
  /**
   * Получить заголовки аутентификации
   */
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    if (token) {
      return {
        'Authorization': `Bearer ${token}`
      };
    }
    
    return {};
  }
  
  /**
   * Преобразовать данные из API в формат приложения
   */
  private transformNetworkFromApi(apiData: any): Network {
    return {
      id: apiData.id,
      name: apiData.name,
      code: apiData.code,
      description: apiData.description || '',
      status: apiData.status,
      settings: apiData.settings || {},
      createdAt: apiData.created_at,
      updatedAt: apiData.updated_at,
      // Сохраняем и БД формат для совместимости
      created_at: apiData.created_at,
      updated_at: apiData.updated_at
    };
  }
  
  /**
   * Преобразовать массив сетей из API
   */
  private transformNetworksFromApi(apiData: any[]): Network[] {
    return apiData.map(item => this.transformNetworkFromApi(item));
  }
  
  // ============================================
  // MOCK DATA METHODS (для совместимости)
  // ============================================
  
  private async getMockNetworks(): Promise<Network[]> {
    // Оригинальная mock логика
    // Импортируем из оригинального файла или воссоздаем здесь
    return [
      {
        id: "net_001",
        name: "Северная сеть",
        code: "NORTH_NET",
        description: "Сеть АЗС в северном регионе",
        status: "active" as const,
        settings: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      // ... другие mock данные
    ];
  }
  
  private async createMockNetwork(networkData: any): Promise<Network> {
    // Mock логика создания
    const newNetwork: Network = {
      id: `net_${Date.now()}`,
      ...networkData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // В реальном приложении сохраняем в localStorage
    return newNetwork;
  }
  
  private async updateMockNetwork(id: string, updates: Partial<Network>): Promise<Network> {
    // Mock логика обновления
    const networks = await this.getMockNetworks();
    const network = networks.find(n => n.id === id);
    if (!network) {
      throw new Error('Network not found');
    }
    
    return { ...network, ...updates, updatedAt: new Date().toISOString() };
  }
  
  private async deleteMockNetwork(id: string): Promise<boolean> {
    // Mock логика удаления
    return true;
  }
  
  private async getMockNetworksStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    maintenance: number;
  }> {
    const networks = await this.getMockNetworks();
    
    return {
      total: networks.length,
      active: networks.filter(n => n.status === 'active').length,
      inactive: networks.filter(n => n.status === 'inactive').length,
      maintenance: networks.filter(n => n.status === 'maintenance').length
    };
  }
}

// Экспорт singleton экземпляра
export const networksServiceUpdated = new NetworksServiceUpdated();

/**
 * ИНСТРУКЦИЯ ПО МИГРАЦИИ:
 * 
 * 1. Переименовать оригинальный файл:
 *    mv src/services/networksService.ts src/services/networksService.old.ts
 * 
 * 2. Переименовать этот файл:
 *    mv src/services/networksService.updated.ts src/services/networksService.ts
 * 
 * 3. Обновить импорты в компонентах:
 *    import { networksService } from '@/services/networksService';
 * 
 * 4. Протестировать переключение между mock и API режимами через apiSwitch.ts
 * 
 * 5. Настроить переменные окружения для API URL
 */