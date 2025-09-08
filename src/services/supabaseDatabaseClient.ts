/**
 * 🗄️ SUPABASE DATABASE CLIENT
 * 
 * Клиент специально для работы с базой данных Supabase
 * Только для внутренних таблиц приложения
 */

// Интерфейс для ответов Supabase
export interface SupabaseResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
  headers?: Record<string, string>;
  responseTime?: number;
}

// Настройки запроса к Supabase
export interface SupabaseRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  queryParams?: Record<string, string | number | boolean>;
}

class SupabaseDatabaseClient {
  // ПРЯМЫЕ РЕКВИЗИТЫ SUPABASE (без обращения к разделу "Обмен данными")
  private readonly SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
  private readonly SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

  /**
   * Получить базовый URL для Supabase
   */
  private getBaseUrl(): string {
    // В режиме разработки используем proxy
    if (import.meta.env.DEV) {
      const port = window.location.port || '3000';
      return `http://localhost:${port}/supabase-proxy`;
    }
    
    // В продакшене - прямой URL
    return this.SUPABASE_URL;
  }

  /**
   * Получить заголовки для аутентификации
   */
  private getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': this.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  /**
   * Построить URL с query параметрами
   */
  private buildUrl(endpoint: string, queryParams?: Record<string, string | number | boolean>): string {
    const baseUrl = this.getBaseUrl();
    let url = `${baseUrl}${endpoint}`;
    
    if (queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        params.append(key, String(value));
      });
      url += `?${params.toString()}`;
    }
    
    return url;
  }

  /**
   * Основной метод для выполнения HTTP запросов
   */
  private async request<T>(
    endpoint: string, 
    config: SupabaseRequestConfig = {}
  ): Promise<SupabaseResponse<T>> {
    const startTime = Date.now();
    const method = config.method || 'GET';
    const url = this.buildUrl(endpoint, config.queryParams);
    
    console.log(`📡 [SUPABASE DB] ${method} ${url}`);
    
    try {
      const headers = {
        ...this.getAuthHeaders(),
        ...config.headers
      };

      const fetchOptions: RequestInit = {
        method,
        headers,
        ...(config.timeout && { signal: AbortSignal.timeout(config.timeout) })
      };

      if (config.body && method !== 'GET') {
        fetchOptions.body = typeof config.body === 'string' 
          ? config.body 
          : JSON.stringify(config.body);
      }

      const response = await fetch(url, fetchOptions);
      const responseTime = Date.now() - startTime;
      
      let responseData: any = null;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        try {
          responseData = await response.json();
        } catch (jsonError) {
          console.warn('⚠️ [SUPABASE DB] Ошибка парсинга JSON:', jsonError);
          responseData = null;
        }
      } else {
        responseData = await response.text();
      }

      if (response.ok) {
        console.log(`✅ [SUPABASE DB] Успешный ответ: ${response.status} (${responseTime}ms)`);
        if (Array.isArray(responseData)) {
          console.log(`📊 [SUPABASE DB] Получено записей: ${responseData.length}`);
        }
        
        return {
          success: true,
          data: responseData,
          status: response.status,
          responseTime,
          headers: Object.fromEntries(response.headers.entries())
        };
      } else {
        const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        console.error(`❌ [SUPABASE DB] Ошибка: ${errorMessage}`);
        console.error(`📄 [SUPABASE DB] Ответ сервера:`, responseData);
        
        return {
          success: false,
          error: errorMessage,
          status: response.status,
          responseTime,
          headers: Object.fromEntries(response.headers.entries())
        };
      }
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      
      console.error(`❌ [SUPABASE DB] Сетевая ошибка: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        responseTime
      };
    }
  }

  /**
   * GET запрос
   */
  async get<T>(endpoint: string, config: Omit<SupabaseRequestConfig, 'method'> = {}): Promise<SupabaseResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  /**
   * POST запрос
   */
  async post<T>(endpoint: string, data: any, config: Omit<SupabaseRequestConfig, 'method' | 'body'> = {}): Promise<SupabaseResponse<T>> {
    // Для POST запросов нужен заголовок Prefer для возврата созданных данных
    const headers = {
      'Prefer': 'return=representation',
      ...config.headers
    };
    return this.request<T>(endpoint, { ...config, method: 'POST', body: data, headers });
  }

  /**
   * PUT запрос
   */
  async put<T>(endpoint: string, data: any, config: Omit<SupabaseRequestConfig, 'method' | 'body'> = {}): Promise<SupabaseResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body: data });
  }

  /**
   * PATCH запрос
   */
  async patch<T>(endpoint: string, data: any, config: Omit<SupabaseRequestConfig, 'method' | 'body'> = {}): Promise<SupabaseResponse<T>> {
    // Для PATCH запросов нужен заголовок Prefer для возврата обновленных данных
    const headers = {
      'Prefer': 'return=representation',
      ...config.headers
    };
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body: data, headers });
  }

  /**
   * DELETE запрос
   */
  async delete<T>(endpoint: string, config: Omit<SupabaseRequestConfig, 'method'> = {}): Promise<SupabaseResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  /**
   * Специализированные методы для основных таблиц
   */
  
  // Получить сети
  async getNetworks(filters?: Record<string, any>): Promise<SupabaseResponse<any[]>> {
    const queryParams: Record<string, string> = { select: '*' };
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        queryParams[key] = `eq.${value}`;
      });
    }
    
    return this.get('/rest/v1/networks', { queryParams });
  }

  // Получить торговые точки
  async getTradingPoints(filters?: Record<string, any>): Promise<SupabaseResponse<any[]>> {
    const queryParams: Record<string, string> = { select: '*' };
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        queryParams[key] = `eq.${value}`;
      });
    }
    
    return this.get('/rest/v1/trading_points', { queryParams });
  }

  // Получить оборудование
  async getEquipment(filters?: Record<string, any>): Promise<SupabaseResponse<any[]>> {
    const queryParams: Record<string, string> = { select: '*' };
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        queryParams[key] = `eq.${value}`;
      });
    }
    
    return this.get('/rest/v1/equipment', { queryParams });
  }

  // Получить резервуары  
  async getTanks(filters?: Record<string, any>): Promise<SupabaseResponse<any[]>> {
    const queryParams: Record<string, string> = { select: '*' };
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        queryParams[key] = `eq.${value}`;
      });
    }
    
    return this.get('/rest/v1/tanks', { queryParams });
  }

  // Получить операции
  async getOperations(filters?: Record<string, any>): Promise<SupabaseResponse<any[]>> {
    const queryParams: Record<string, string> = { select: '*' };
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        queryParams[key] = `eq.${value}`;
      });
    }
    
    return this.get('/rest/v1/operations', { queryParams });
  }

  /**
   * Отладочная информация
   */
  getConnectionInfo(): Record<string, any> {
    return {
      baseUrl: this.getBaseUrl(),
      proxyMode: import.meta.env.DEV,
      timestamp: new Date().toISOString()
    };
  }
}

// Экспортируем singleton экземпляр
export const supabaseDatabaseClient = new SupabaseDatabaseClient();

// Экспорт для обратной совместимости  
export default supabaseDatabaseClient;