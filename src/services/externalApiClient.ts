/**
 * 🌐 EXTERNAL API CLIENT
 * 
 * Клиент специально для работы с внешними торговыми сетями
 * Использует настройки из раздела "Обмен данными"
 */

import { tradingNetworkConfigService } from './tradingNetworkConfigService';
import { tokenRefreshService } from './tokenRefreshService';

// Интерфейс для ответов внешних API
export interface ExternalApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
  headers?: Record<string, string>;
  responseTime?: number;
}

// Настройки запроса к внешним API
export interface ExternalApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retryAttempts?: number;
  useAuth?: boolean;
  customBaseUrl?: string;
  queryParams?: Record<string, string | number | boolean>;
}

class ExternalApiClient {
  private requestInterceptors: ((config: ExternalApiRequestConfig) => ExternalApiRequestConfig)[] = [];
  private responseInterceptors: ((response: ExternalApiResponse) => ExternalApiResponse)[] = [];

  /**
   * Получить базовый URL для внешнего API
   */
  private async getBaseUrl(customUrl?: string): Promise<string> {
    if (customUrl) {
      return customUrl;
    }

    try {
      const tradingConfig = await tradingNetworkConfigService.getConfig();
      if (!tradingConfig.baseUrl) {
        const errorMsg = 'Базовый URL для внешнего API не настроен. Пожалуйста, настройте его в разделе "Обмен данными"';
        console.error('❌ [EXTERNAL API]', errorMsg);
        throw new Error(errorMsg);
      }
      console.log('🔧 [EXTERNAL API] Используется базовый URL:', tradingConfig.baseUrl);
      return tradingConfig.baseUrl;
    } catch (error) {
      const errorMsg = `Не удалось получить конфигурацию внешнего API: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`;
      console.error('❌ [EXTERNAL API] Ошибка получения конфигурации:', errorMsg);
      console.error('💡 [EXTERNAL API] Проверьте настройки в разделе "Обмен данными" или таблицу system_config в базе данных');
      throw new Error(errorMsg);
    }
  }

  /**
   * Получить заголовки аутентификации
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const config = await tradingNetworkConfigService.getConfig();
      const headers: Record<string, string> = {};

      if (config.authType === 'bearer' && config.authToken) {
        headers['Authorization'] = `Bearer ${config.authToken}`;
      } else if (config.authType === 'basic' && config.username && config.password) {
        const credentials = btoa(`${config.username}:${config.password}`);
        headers['Authorization'] = `Basic ${credentials}`;
      } else if (config.authType === 'api-key' && config.apiKey) {
        headers['X-API-Key'] = config.apiKey;
      }

      return headers;
    } catch (error) {
      console.warn('⚠️ [EXTERNAL API] Не удалось получить заголовки аутентификации:', error);
      return {};
    }
  }

  /**
   * Построить URL с query параметрами
   */
  private buildUrl(baseUrl: string, endpoint: string, queryParams?: Record<string, string | number | boolean>): string {
    let url = `${baseUrl.replace(/\/$/, '')}${endpoint}`;
    
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
    config: ExternalApiRequestConfig = {}
  ): Promise<ExternalApiResponse<T>> {
    const startTime = Date.now();
    const method = config.method || 'GET';
    
    try {
      // Применяем interceptors
      let finalConfig = config;
      for (const interceptor of this.requestInterceptors) {
        finalConfig = interceptor(finalConfig);
      }

      const baseUrl = await this.getBaseUrl(finalConfig.customBaseUrl);
      const url = this.buildUrl(baseUrl, endpoint, finalConfig.queryParams);
      
      console.log(`🌐 [EXTERNAL API] ${method} ${url}`);
      
      // Базовые заголовки
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...finalConfig.headers
      };

      // Добавляем аутентификацию если требуется
      if (finalConfig.useAuth !== false) {
        const authHeaders = await this.getAuthHeaders();
        headers = { ...headers, ...authHeaders };
      }

      const fetchOptions: RequestInit = {
        method,
        headers,
        ...(finalConfig.timeout && { signal: AbortSignal.timeout(finalConfig.timeout || 30000) })
      };

      if (finalConfig.body && method !== 'GET') {
        fetchOptions.body = typeof finalConfig.body === 'string' 
          ? finalConfig.body 
          : JSON.stringify(finalConfig.body);
      }

      // Попытка запроса с повторами
      const maxRetries = finalConfig.retryAttempts || 1;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`📡 [EXTERNAL API] Попытка ${attempt}/${maxRetries}`);
          
          const response = await fetch(url, fetchOptions);
          const responseTime = Date.now() - startTime;
          
          let responseData: any = null;
          const contentType = response.headers.get('content-type');
          
          if (contentType?.includes('application/json')) {
            try {
              responseData = await response.json();
            } catch (jsonError) {
              console.warn('⚠️ [EXTERNAL API] Ошибка парсинга JSON:', jsonError);
              responseData = await response.text();
            }
          } else {
            responseData = await response.text();
          }

          let apiResponse: ExternalApiResponse<T>;

          if (response.ok) {
            console.log(`✅ [EXTERNAL API] Успешный ответ: ${response.status} (${responseTime}ms)`);
            if (Array.isArray(responseData)) {
              console.log(`📊 [EXTERNAL API] Получено записей: ${responseData.length}`);
            }
            
            apiResponse = {
              success: true,
              data: responseData,
              status: response.status,
              responseTime,
              headers: Object.fromEntries(response.headers.entries())
            };
          } else {
            const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            console.error(`❌ [EXTERNAL API] Ошибка: ${errorMessage}`);
            console.error(`📄 [EXTERNAL API] Ответ сервера:`, responseData);
            
            // Для некоторых ошибок не повторяем запрос
            if (response.status === 401 || response.status === 403 || response.status === 404) {
              apiResponse = {
                success: false,
                error: errorMessage,
                status: response.status,
                responseTime,
                headers: Object.fromEntries(response.headers.entries())
              };
              break;
            }
            
            if (attempt === maxRetries) {
              apiResponse = {
                success: false,
                error: errorMessage,
                status: response.status,
                responseTime,
                headers: Object.fromEntries(response.headers.entries())
              };
            } else {
              console.log(`🔄 [EXTERNAL API] Повторяем запрос через 1 секунду...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
          }

          // Применяем response interceptors
          for (const interceptor of this.responseInterceptors) {
            apiResponse = interceptor(apiResponse);
          }

          return apiResponse;
          
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.error(`❌ [EXTERNAL API] Попытка ${attempt} неудачна:`, lastError.message);
          
          if (attempt < maxRetries) {
            console.log(`🔄 [EXTERNAL API] Повторяем через 2 секунды...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          }
        }
      }

      // Все попытки неудачны
      const responseTime = Date.now() - startTime;
      const errorMessage = lastError?.message || 'Неизвестная ошибка';
      
      return {
        success: false,
        error: `Все попытки неудачны: ${errorMessage}`,
        responseTime
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      
      console.error(`❌ [EXTERNAL API] Критическая ошибка: ${errorMessage}`);
      
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
  async get<T>(endpoint: string, config: Omit<ExternalApiRequestConfig, 'method'> = {}): Promise<ExternalApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  /**
   * POST запрос
   */
  async post<T>(endpoint: string, data: any, config: Omit<ExternalApiRequestConfig, 'method' | 'body'> = {}): Promise<ExternalApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body: data });
  }

  /**
   * PUT запрос
   */
  async put<T>(endpoint: string, data: any, config: Omit<ExternalApiRequestConfig, 'method' | 'body'> = {}): Promise<ExternalApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body: data });
  }

  /**
   * DELETE запрос
   */
  async delete<T>(endpoint: string, config: Omit<ExternalApiRequestConfig, 'method'> = {}): Promise<ExternalApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  /**
   * Специализированные методы для торговых сетей
   */
  
  // Получить резервуары (танки)
  async getTanks(systemId: string, stationId: string): Promise<ExternalApiResponse<any[]>> {
    return this.get('/tanks', {
      queryParams: { system: systemId, station: stationId },
      timeout: 15000,
      retryAttempts: 2
    });
  }

  // Получить транзакции
  async getTransactions(systemId: string, stationId: string, date?: string): Promise<ExternalApiResponse<any[]>> {
    const params: Record<string, string> = { 
      system: systemId, 
      station: stationId 
    };
    
    if (date) {
      params.date = date;
    }

    return this.get('/transactions', {
      queryParams: params,
      timeout: 20000,
      retryAttempts: 2
    });
  }

  // Получить сводку по продажам
  async getSalesSummary(systemId: string, stationId: string, date?: string): Promise<ExternalApiResponse<any>> {
    const params: Record<string, string> = { 
      system: systemId, 
      station: stationId 
    };
    
    if (date) {
      params.date = date;
    }

    return this.get('/sales-summary', {
      queryParams: params,
      timeout: 15000,
      retryAttempts: 2
    });
  }

  /**
   * Interceptors
   */
  addRequestInterceptor(interceptor: (config: ExternalApiRequestConfig) => ExternalApiRequestConfig): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: (response: ExternalApiResponse) => ExternalApiResponse): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Отладочная информация
   */
  async getConnectionInfo(): Promise<Record<string, any>> {
    try {
      const config = await tradingNetworkConfigService.getConfig();
      return {
        baseUrl: config.baseUrl,
        authType: config.authType,
        hasCredentials: !!(config.username || config.apiKey || config.authToken),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Экспортируем singleton экземпляр
export const externalApiClient = new ExternalApiClient();

// Экспорт для обратной совместимости
export default externalApiClient;