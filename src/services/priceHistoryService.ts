/**
 * Price History Service - Сервис для работы с историей цен
 * Интеграция с Price History API
 */

import { apiConfigServiceDB } from './apiConfigServiceDB';
import { httpClient } from './universalHttpClient';

// Типы для API
export interface PriceHistoryRecord {
  id: string;
  fuel_type_id: string;
  trading_point_id: string;
  network_id: string;
  price: number;
  price_type: 'retail' | 'wholesale' | 'special';
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  created_by: string;
  reason: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  // Связанные данные
  fuel_types?: {
    name: string;
    code: string;
    category: string;
  };
  trading_points?: {
    name: string;
    code: string;
  };
  users?: {
    full_name: string;
  };
}

// Типы для UI (совместимость с PriceHistoryPage)
export interface PriceHistoryUI {
  id: string;
  date: string;
  time: string;
  fuelType: string;
  oldPrice: number;
  newPrice: number;
  changeReason: string;
  changedBy: string;
  tradingPoint?: string;
  status: 'applied' | 'pending' | 'cancelled';
}

// Фильтры для запросов
export interface PriceHistoryFilters {
  fuelTypeId?: string;
  tradingPointId?: string;
  networkId?: string;
  priceType?: 'retail' | 'wholesale' | 'special';
  startDate?: string;
  endDate?: string;
  activeOnly?: boolean;
}

// Пагинация
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Результат с пагинацией
export interface PaginatedPriceHistory {
  data: PriceHistoryUI[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters?: PriceHistoryFilters;
}

class PriceHistoryServiceClass {
  private async getApiUrl() {
    const connection = await apiConfigServiceDB.getCurrentConnection();
    return connection?.url || '';
  }

  /**
   * Получить историю цен с фильтрацией
   */
  async getPriceHistory(
    filters: PriceHistoryFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedPriceHistory> {
    try {
      // Если в режиме моков - используем mock данные
      if (await apiConfigServiceDB.isMockMode()) {
        return this.getMockPriceHistory(filters, pagination);
      }

      // Используем реальный API
      const queryParams = this.buildQueryParams(filters, pagination);
      const response = await this.apiRequest(`/price-history?${queryParams}`);
      
      return this.transformApiResponse(response);
      
    } catch (error) {
      console.error('Price History API error:', error);
      
      // Fallback на mock данные при ошибке API
      console.warn('Falling back to mock price history due to API error');
      return this.getMockPriceHistory(filters, pagination);
    }
  }

  /**
   * Получить текущие цены
   */
  async getCurrentPrices(filters: Pick<PriceHistoryFilters, 'tradingPointId' | 'networkId' | 'fuelTypeId'> = {}): Promise<PriceHistoryRecord[]> {
    try {
      if (await apiConfigServiceDB.isMockMode()) {
        return this.getMockCurrentPrices(filters);
      }

      const queryParams = new URLSearchParams();
      if (filters.tradingPointId) queryParams.append('tradingPointId', filters.tradingPointId);
      if (filters.networkId) queryParams.append('networkId', filters.networkId);
      if (filters.fuelTypeId) queryParams.append('fuelTypeId', filters.fuelTypeId);

      const response = await this.apiRequest(`/price-history/current?${queryParams}`);
      return response.data || [];
      
    } catch (error) {
      console.error('Current prices API error:', error);
      return this.getMockCurrentPrices(filters);
    }
  }

  /**
   * Получить изменения цен за период
   */
  async getPriceChanges(days: number = 7, filters: Pick<PriceHistoryFilters, 'tradingPointId' | 'networkId'> = {}): Promise<any[]> {
    try {
      if (await apiConfigServiceDB.isMockMode()) {
        return this.getMockPriceChanges(days, filters);
      }

      const queryParams = new URLSearchParams();
      queryParams.append('days', days.toString());
      if (filters.tradingPointId) queryParams.append('tradingPointId', filters.tradingPointId);
      if (filters.networkId) queryParams.append('networkId', filters.networkId);

      const response = await this.apiRequest(`/price-history/changes?${queryParams}`);
      return response.data || [];
      
    } catch (error) {
      console.error('Price changes API error:', error);
      return this.getMockPriceChanges(days, filters);
    }
  }

  /**
   * Создать новую цену
   */
  async createPriceRecord(priceData: {
    fuel_type_id: string;
    trading_point_id: string;
    price: number;
    price_type?: 'retail' | 'wholesale' | 'special';
    effective_from: string;
    effective_to?: string;
    reason?: string;
    metadata?: any;
  }): Promise<PriceHistoryRecord> {
    try {
      if (await apiConfigServiceDB.isMockMode()) {
        return this.createMockPriceRecord(priceData);
      }

      const response = await this.apiRequest('/price-history', {
        method: 'POST',
        body: JSON.stringify(priceData)
      });
      
      return response.data;
      
    } catch (error) {
      console.error('Create price record API error:', error);
      throw new Error(`Failed to create price record: ${error}`);
    }
  }

  /**
   * Деактивировать цену
   */
  async deactivatePriceRecord(id: string, reason?: string): Promise<PriceHistoryRecord> {
    try {
      if (await apiConfigServiceDB.isMockMode()) {
        throw new Error('Deactivation not supported in mock mode');
      }

      const response = await this.apiRequest(`/price-history/${id}/deactivate`, {
        method: 'PATCH',
        body: JSON.stringify({ reason })
      });
      
      return response.data;
      
    } catch (error) {
      console.error(`Deactivate price record ${id} API error:`, error);
      throw new Error(`Failed to deactivate price record: ${error}`);
    }
  }

  // ============================================
  // PRIVATE API HELPERS
  // ============================================

  private buildQueryParams(filters: PriceHistoryFilters, pagination: PaginationParams): string {
    const params = new URLSearchParams();
    
    if (filters.fuelTypeId) params.append('fuelTypeId', filters.fuelTypeId);
    if (filters.tradingPointId) params.append('tradingPointId', filters.tradingPointId);
    if (filters.networkId) params.append('networkId', filters.networkId);
    if (filters.priceType) params.append('priceType', filters.priceType);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.activeOnly) params.append('activeOnly', 'true');
    
    if (pagination.page) params.append('page', pagination.page.toString());
    if (pagination.limit) params.append('limit', pagination.limit.toString());
    
    return params.toString();
  }

  private async apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const apiUrl = await this.getApiUrl();
    const url = `${apiUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      }
    };
    
    const response = await httpClient.request(endpoint, {
      destination: 'supabase',
      ...options
    });
    
    if (!response.success) {
      throw {
        status: response.status || 500,
        statusText: 'Request failed',
        message: response.error || 'API request failed',
        details: response.data
      };
    }
    
    return response.data;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    if (token) {
      return {
        'Authorization': `Bearer ${token}`
      };
    }
    
    return {};
  }

  private transformApiResponse(apiResponse: any): PaginatedPriceHistory {
    const records = apiResponse.data || [];
    
    // Трансформируем записи API в формат UI
    const uiRecords: PriceHistoryUI[] = records.map((record: PriceHistoryRecord, index: number) => {
      // Для получения oldPrice нужно найти предыдущую запись для того же топлива и точки
      const oldPrice = this.findPreviousPrice(records, record, index) || null;
      
      const dateTime = new Date(record.effective_from);
      
      return {
        id: record.id,
        date: dateTime.toISOString().split('T')[0],
        time: dateTime.toTimeString().slice(0, 5),
        fuelType: record.fuel_types?.name || 'Неизвестно',
        oldPrice: oldPrice / 100, // Конвертируем из копеек в рубли
        newPrice: record.price / 100, // Конвертируем из копеек в рубли
        changeReason: record.reason || 'Обновление цены',
        changedBy: record.users?.full_name || 'Система',
        tradingPoint: record.trading_points?.name,
        status: record.is_active ? 'applied' : 'cancelled'
      };
    });

    return {
      data: uiRecords,
      pagination: apiResponse.pagination || {
        page: 1,
        limit: 50,
        total: uiRecords.length,
        pages: 1
      },
      filters: apiResponse.filters
    };
  }

  private findPreviousPrice(records: PriceHistoryRecord[], currentRecord: PriceHistoryRecord, currentIndex: number): number | null {
    // Ищем предыдущую запись для того же топлива и торговой точки
    for (let i = currentIndex + 1; i < records.length; i++) {
      const record = records[i];
      if (record.fuel_type_id === currentRecord.fuel_type_id && 
          record.trading_point_id === currentRecord.trading_point_id) {
        return record.price;
      }
    }
    return null;
  }

  // ============================================
  // MOCK DATA METHODS (для совместимости)
  // ============================================

  // ❌ MOCK ДАННЫЕ ЗАБЛОКИРОВАНЫ
  private async getMockPriceHistory(filters: PriceHistoryFilters, pagination: PaginationParams): Promise<PaginatedPriceHistory> {
    throw new Error('Mock данные заблокированы. Настройте подключение к Supabase в разделе "Обмен данными".');
    
    // ❌ MOCK ДАННЫЕ УДАЛЕНЫ ИЗ СООБРАЖЕНИЙ БЕЗОПАСНОСТИ
  }

  private async getMockCurrentPrices(filters: any): Promise<PriceHistoryRecord[]> {
    // Mock текущих цен
    return [];
  }

  private async getMockPriceChanges(days: number, filters: any): Promise<any[]> {
    // Mock изменений цен
    return [];
  }

  private async createMockPriceRecord(priceData: any): Promise<PriceHistoryRecord> {
    // Mock создания цены
    throw new Error('Price creation not supported in mock mode');
  }

  private mapFuelTypeIdToName(fuelTypeId: string): string {
    const map: Record<string, string> = {
      'ai95': 'АИ-95',
      'ai92': 'АИ-92', 
      'dt': 'ДТ'
    };
    return map[fuelTypeId] || fuelTypeId;
  }
}

// Экспорт singleton экземпляра
export const priceHistoryService = new PriceHistoryServiceClass();

/**
 * ИНСТРУКЦИЯ ПО ИНТЕГРАЦИИ:
 * 
 * 1. Импортировать сервис в PriceHistoryPage:
 *    import { priceHistoryService } from '@/services/priceHistoryService';
 * 
 * 2. Заменить mock данные на вызовы API:
 *    const result = await priceHistoryService.getPriceHistory(filters, pagination);
 * 
 * 3. Обновить типы данных в PriceHistoryPage:
 *    import { PriceHistoryUI } from '@/services/priceHistoryService';
 * 
 * 4. Добавить обработку загрузки и ошибок в UI
 */