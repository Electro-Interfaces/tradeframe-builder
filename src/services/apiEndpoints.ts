/**
 * 🎯 ТИПИЗИРОВАННЫЕ API ENDPOINTS
 * 
 * Централизованные методы для работы с конкретными API endpoints
 * Использует универсальный HTTP клиент с автоматической конфигурацией
 */

import { httpClient, RequestConfig } from './universalHttpClient';

// === ИНТЕРФЕЙСЫ ДАННЫХ ===

// Данные резервуара из торгового API
export interface TradingApiTank {
  number: number;
  fuel: number;
  fuel_name: string;
  state: number;
  volume_begin?: string | null;
  volume_end: string;
  volume_max: string;
  volume_free: string;
  volume: string;
  amount_begin?: string | null;
  amount_end: string;
  level: string;
  water: {
    volume: string;
    amount: string;
    level: string;
  };
  temperature: string;
  density: string;
  release: {
    volume: string;
    amount: string;
  };
  dt: string;
}

// Транзакция из торгового API
export interface TradingApiTransaction {
  id: string;
  timestamp: string;
  stationId: string;
  dispenserId: number;
  fuelType: number;
  volume: number;
  amount: number;
  price: number;
  paymentMethod: string;
  status: 'completed' | 'pending' | 'failed';
}

// Данные из Supabase
export interface SupabaseRecord {
  id: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

// Параметры для фильтрации данных
export interface FilterParams {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  stationId?: string;
  systemId?: string;
  [key: string]: any;
}

// === ТОРГОВАЯ СЕТЬ API ===

class TradingNetworkApiEndpoints {
  /**
   * 🛢️ Получить данные резервуаров
   */
  async getTanks(systemId: string, stationId: string, params?: FilterParams) {
    return httpClient.get<TradingApiTank[]>('/v1/tanks', {
      destination: 'external-api',
      queryParams: {
        system: systemId,
        station: stationId,
        ...params
      }
    });
  }

  /**
   * 🧾 Получить транзакции
   */
  async getTransactions(systemId: string, stationId: string, params?: FilterParams) {
    return httpClient.get<TradingApiTransaction[]>('/v1/transactions', {
      destination: 'external-api',
      queryParams: {
        system: systemId,
        station: stationId,
        ...(params?.startDate && { date_from: params.startDate }),
        ...(params?.endDate && { date_to: params.endDate }),
        ...(params?.limit && { limit: params.limit })
      }
    });
  }

  /**
   * 💰 Получить цены на топливо
   */
  async getFuelPrices(systemId: string, stationId: string) {
    return httpClient.get<Record<string, number>>('/fuel-prices', {
      destination: 'external-api',
      queryParams: { systemId, stationId }
    });
  }

  /**
   * 📊 Установить цены на топливо
   */
  async setFuelPrices(systemId: string, stationId: string, prices: Record<string, number>) {
    return httpClient.post<{ success: boolean }>('/fuel-prices', {
      systemId,
      stationId,
      prices
    }, {
      destination: 'external-api'
    });
  }

  /**
   * 🧪 Тестировать подключение
   */
  async testConnection() {
    return httpClient.testExternalApiConnection();
  }
}

// === SUPABASE API ===

class SupabaseApiEndpoints {
  /**
   * 📋 Получить записи из таблицы
   */
  async getRecords<T = SupabaseRecord>(
    table: string, 
    params?: FilterParams & {
      select?: string;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
    }
  ) {
    const queryParams: any = {};
    
    if (params?.select) queryParams.select = params.select;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;
    if (params?.orderBy) queryParams.order = `${params.orderBy}.${params.orderDirection || 'asc'}`;

    return httpClient.get<T[]>(`/rest/v1/${table}`, {
      destination: 'supabase',
      queryParams
    });
  }

  /**
   * ➕ Создать запись
   */
  async createRecord<T = SupabaseRecord>(table: string, data: Partial<T>) {
    return httpClient.post<T>(`/rest/v1/${table}`, data, {
      destination: 'supabase',
      headers: {
        'Prefer': 'return=representation'
      }
    });
  }

  /**
   * 🔄 Обновить запись
   */
  async updateRecord<T = SupabaseRecord>(table: string, id: string, data: Partial<T>) {
    return httpClient.patch<T>(`/rest/v1/${table}?id=eq.${id}`, data, {
      destination: 'supabase',
      headers: {
        'Prefer': 'return=representation'
      }
    });
  }

  /**
   * ❌ Удалить запись
   */
  async deleteRecord(table: string, id: string) {
    return httpClient.delete(`/rest/v1/${table}?id=eq.${id}`, {
      destination: 'supabase'
    });
  }

  /**
   * 🔍 Получить одну запись
   */
  async getRecord<T = SupabaseRecord>(table: string, id: string, select?: string) {
    const queryParams: any = { limit: 1 };
    if (select) queryParams.select = select;

    const response = await httpClient.get<T[]>(`/rest/v1/${table}?id=eq.${id}`, {
      destination: 'supabase',
      queryParams
    });

    return {
      ...response,
      data: response.data?.[0] || null
    };
  }

  /**
   * 📊 Выполнить RPC функцию
   */
  async callRpcFunction<T = any>(functionName: string, params?: any) {
    return httpClient.post<T>(`/rest/v1/rpc/${functionName}`, params, {
      destination: 'supabase'
    });
  }
}

// === СПЕЦИАЛИЗИРОВАННЫЕ ENDPOINT ГРУППЫ ===

/**
 * 🛢️ Методы для работы с резервуарами
 */
export class TanksApiEndpoints {
  private tradingApi = new TradingNetworkApiEndpoints();
  private supabaseApi = new SupabaseApiEndpoints();

  /**
   * Получить резервуары из торговой сети
   */
  async getTanksFromTradingNetwork(systemId: string, stationId: string) {
    return this.tradingApi.getTanks(systemId, stationId);
  }

  /**
   * Получить резервуары из Supabase
   */
  async getTanksFromDatabase(tradingPointId?: string) {
    const params: any = {};
    if (tradingPointId) {
      // Добавляем фильтр по торговой точке если нужно
      params.trading_point_id = `eq.${tradingPointId}`;
    }

    return this.supabaseApi.getRecords('tanks', {
      select: '*',
      ...params
    });
  }

  /**
   * Синхронизировать резервуары между API и БД
   */
  async syncTanks(systemId: string, stationId: string, tradingPointId: string) {
    // Получаем данные из торгового API
    const tradingResponse = await this.getTanksFromTradingNetwork(systemId, stationId);
    
    if (!tradingResponse.success || !tradingResponse.data) {
      return {
        success: false,
        error: 'Failed to fetch tanks from trading network'
      };
    }

    // Здесь будет логика синхронизации с БД
    // Пока возвращаем данные из API
    return {
      success: true,
      data: {
        tradingData: tradingResponse.data,
        syncedCount: tradingResponse.data.length
      }
    };
  }
}

/**
 * 🧾 Методы для работы с операциями/транзакциями
 */
export class OperationsApiEndpoints {
  private tradingApi = new TradingNetworkApiEndpoints();
  private supabaseApi = new SupabaseApiEndpoints();

  /**
   * Получить операции из торговой сети
   */
  async getOperationsFromTradingNetwork(systemId: string, stationId: string, params?: FilterParams) {
    return this.tradingApi.getTransactions(systemId, stationId, params);
  }

  /**
   * Получить операции из Supabase
   */
  async getOperationsFromDatabase(params?: FilterParams) {
    return this.supabaseApi.getRecords('operations', {
      select: '*',
      orderBy: 'start_time',
      orderDirection: 'desc',
      ...params
    });
  }

  /**
   * Создать новую операцию
   */
  async createOperation(operationData: any) {
    return this.supabaseApi.createRecord('operations', operationData);
  }
}

/**
 * 💰 Методы для работы с ценами
 */
export class PricesApiEndpoints {
  private tradingApi = new TradingNetworkApiEndpoints();
  private supabaseApi = new SupabaseApiEndpoints();

  /**
   * Получить цены из торговой сети
   */
  async getPricesFromTradingNetwork(systemId: string, stationId: string) {
    return this.tradingApi.getFuelPrices(systemId, stationId);
  }

  /**
   * Установить цены в торговой сети
   */
  async setPricesInTradingNetwork(systemId: string, stationId: string, prices: Record<string, number>) {
    return this.tradingApi.setFuelPrices(systemId, stationId, prices);
  }

  /**
   * Получить цены из базы данных
   */
  async getPricesFromDatabase(tradingPointId?: string) {
    return this.supabaseApi.getRecords('prices', {
      select: '*',
      ...(tradingPointId && { trading_point_id: `eq.${tradingPointId}` })
    });
  }

  /**
   * Сохранить цены в базу данных
   */
  async savePricesToDatabase(pricesData: any[]) {
    // Batch insert prices
    const results = await Promise.all(
      pricesData.map(price => this.supabaseApi.createRecord('prices', price))
    );

    return {
      success: results.every(r => r.success),
      data: results
    };
  }
}

// === ЭКСПОРТ ЭКЗЕМПЛЯРОВ ===

export const tradingNetworkApi = new TradingNetworkApiEndpoints();
export const supabaseApi = new SupabaseApiEndpoints();
export const tanksApi = new TanksApiEndpoints();
export const operationsApi = new OperationsApiEndpoints();
export const pricesApi = new PricesApiEndpoints();

// Основной объект со всеми API
export const apiEndpoints = {
  tradingNetwork: tradingNetworkApi,
  supabase: supabaseApi,
  tanks: tanksApi,
  operations: operationsApi,
  prices: pricesApi,
};

export default apiEndpoints;