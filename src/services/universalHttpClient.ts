/**
 * 🌐 УНИВЕРСАЛЬНЫЙ HTTP КЛИЕНТ
 * 
 * Единый клиент для всех HTTP запросов в приложении
 * Автоматически использует настройки из раздела "Обмен данными"
 * Поддерживает все типы аутентификации и автоматическое получение конфигурации
 */

import { tradingNetworkConfigService } from './tradingNetworkConfigService';
import { apiConfigServiceDB } from './apiConfigServiceDB';
import { tokenRefreshService } from './tokenRefreshService';

// Типы для различных назначений запросов
export type RequestDestination = 'external-api' | 'supabase' | 'internal';

// Интерфейс для ответов API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
  headers?: Record<string, string>;
  responseTime?: number;
}

// Настройки запроса
export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retryAttempts?: number;
  destination?: RequestDestination;
  useAuth?: boolean;
  customBaseUrl?: string;
  queryParams?: Record<string, string | number | boolean>;
}

class UniversalHttpClient {
  private requestInterceptors: ((config: RequestConfig) => RequestConfig)[] = [];
  private responseInterceptors: ((response: ApiResponse) => ApiResponse)[] = [];

  /**
   * 🔧 Получить базовый URL в зависимости от назначения
   */
  private async getBaseUrl(destination: RequestDestination): Promise<string> {
    switch (destination) {
      case 'external-api':
        try {
          const tradingConfig = await tradingNetworkConfigService.getConfig();
          if (!tradingConfig.baseUrl) {
            const errorMsg = 'Базовый URL для внешнего API не настроен. Пожалуйста, настройте его в разделе "Обмен данными"';
            console.error('❌ [HTTP CLIENT]', errorMsg);
            throw new Error(errorMsg);
          }
          console.log('🔧 [HTTP CLIENT] Используется базовый URL:', tradingConfig.baseUrl);
          return tradingConfig.baseUrl;
        } catch (error) {
          const errorMsg = `Не удалось получить конфигурацию внешнего API: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`;
          console.error('❌ [HTTP CLIENT] Ошибка получения конфигурации:', errorMsg);
          console.error('💡 [HTTP CLIENT] Проверьте настройки в разделе "Обмен данными" или таблицу system_config в базе данных');
          throw new Error(errorMsg);
        }
      
      case 'supabase':
        // ПРЯМОЕ ПОДКЛЮЧЕНИЕ К SUPABASE БЕЗ РАЗДЕЛА "ОБМЕН ДАННЫМИ"
        const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
        
        // В режиме разработки используем proxy для обхода CORS
        if (import.meta.env.DEV) {
          const port = window.location.port || '3000';
          return `http://localhost:${port}/supabase-proxy`;
        }
        
        // В продакшене используем прямой URL
        console.log('🔧 [HTTP CLIENT] Используется прямое подключение к Supabase:', SUPABASE_URL);
        return SUPABASE_URL;
        
        // Закомментированный fallback на раздел "Обмен данными"
        /*
        try {
          const supabaseConnection = await apiConfigServiceDB.getCurrentConnection();
          if (!supabaseConnection?.url) {
            throw new Error('URL Supabase не настроен. Настройте подключение в разделе "Обмен данными".');
          }
          return supabaseConnection.url;
        } catch (error) {
          throw new Error('Не удалось получить конфигурацию Supabase. Настройте подключение в разделе "Обмен данными": ' + (error instanceof Error ? error.message : 'неизвестная ошибка'));
        }
        */
      
      case 'internal':
      default:
        throw new Error('Внутренние API отключены. Используйте external-api или supabase.');
    }
  }

  /**
   * 🔐 Получить заголовки аутентификации
   */
  private async getAuthHeaders(destination: RequestDestination): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};

    try {
      switch (destination) {
        case 'external-api':
          const tradingConfig = await tradingNetworkConfigService.getConfig();
          console.log('🔐 [HTTP CLIENT] Тип аутентификации:', tradingConfig.authType);
        
        if (tradingConfig.authType === 'bearer') {
          // 🔄 АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ ТОКЕНА
          const tokenResult = await tokenRefreshService.ensureValidToken();
          
          if (!tokenResult.success) {
            const errorMsg = `Ошибка аутентификации Bearer: ${tokenResult.error}`;
            console.error('❌ [HTTP CLIENT]', errorMsg);
            throw new Error(errorMsg);
          }
          
          if (!tokenResult.newToken) {
            const errorMsg = 'API ключ не настроен. Пожалуйста, настройте его в разделе "Обмен данными"';
            console.error('❌ [HTTP CLIENT]', errorMsg);
            throw new Error(errorMsg);
          }
          
          headers['Authorization'] = `Bearer ${tokenResult.newToken}`;
          console.log('🔐 [HTTP CLIENT] Используем обновленный Bearer токен для запроса');
          
        } else if (tradingConfig.authType === 'basic') {
          if (!tradingConfig.username || !tradingConfig.password) {
            const errorMsg = `Логин и пароль не настроены. Username: "${tradingConfig.username || 'отсутствует'}", Password: ${tradingConfig.password ? 'указан' : 'отсутствует'}`;
            console.error('❌ [HTTP CLIENT]', errorMsg);
            throw new Error(errorMsg);
          }
          const credentials = btoa(`${tradingConfig.username}:${tradingConfig.password}`);
          headers['Authorization'] = `Basic ${credentials}`;
          console.log('🔐 [HTTP CLIENT] Используем Basic Auth:', tradingConfig.username);
        }
          break;
        
        case 'supabase':
          // ПРЯМОЙ API КЛЮЧ SUPABASE БЕЗ РАЗДЕЛА "ОБМЕН ДАННЫМИ"
          const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';
          
          console.log('🔑 [HTTP CLIENT] Используется прямой API ключ Supabase');
          headers['apikey'] = SUPABASE_SERVICE_ROLE_KEY;
          headers['Authorization'] = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
          
          // Закомментированный fallback на раздел "Обмен данными"
          /*
          const supabaseConnection = await apiConfigServiceDB.getCurrentConnection();
          if (!supabaseConnection?.settings?.apiKey) {
            throw new Error('API ключ Supabase не настроен.');
          }
          console.log('🔑 DEBUG: Supabase connection settings:', {
            name: supabaseConnection.name,
            url: supabaseConnection.url,
            hasApiKey: !!supabaseConnection.settings.apiKey,
            apiKeyPreview: supabaseConnection.settings.apiKey ? supabaseConnection.settings.apiKey.substring(0, 50) + '...' : 'НЕТ',
            fullKeyLength: supabaseConnection.settings.apiKey?.length || 0,
            keyEndsWithCorrect: supabaseConnection.settings.apiKey?.endsWith('kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY') || false
          });
          headers['apikey'] = supabaseConnection.settings.apiKey;
          headers['Authorization'] = `Bearer ${supabaseConnection.settings.apiKey}`;
          */
          break;
        
        default:
          throw new Error(`Неподдерживаемый тип назначения: ${destination}`);
      }
    } catch (error) {
      throw new Error('Ошибка получения заголовков аутентификации: ' + (error instanceof Error ? error.message : 'неизвестная ошибка'));
    }

    return headers;
  }

  /**
   * 📝 Построить URL с параметрами запроса
   */
  private buildUrl(baseUrl: string, endpoint: string, queryParams?: Record<string, string | number | boolean>): string {
    const url = new URL(endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`);
    
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * 🚀 Основной метод для выполнения запросов
   */
  public async request<T = any>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    const {
      method = 'GET',
      headers: customHeaders = {},
      body,
      timeout = 30000,
      retryAttempts = 3,
      destination = 'external-api',
      useAuth = true,
      customBaseUrl,
      queryParams
    } = config;

    try {
      // Применяем интерцепторы запроса
      let finalConfig = { ...config };
      for (const interceptor of this.requestInterceptors) {
        finalConfig = interceptor(finalConfig);
      }

      // Получаем базовый URL
      const baseUrl = customBaseUrl || await this.getBaseUrl(destination);
      
      // Строим полный URL
      const fullUrl = this.buildUrl(baseUrl, endpoint, queryParams);

      // Получаем заголовки аутентификации
      const authHeaders = useAuth ? await this.getAuthHeaders(destination) : {};

      // Формируем финальные заголовки
      const finalHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...authHeaders,
        ...customHeaders,
      };

      // Выполняем запрос с таймаутом
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      console.log(`🌐 [HTTP CLIENT] Выполняем запрос:`, {
        method,
        url: fullUrl,
        destination,
        useAuth,
        hasAuthHeaders: Object.keys(authHeaders).length > 0,
        queryParams: queryParams || 'нет',
        bodySize: body ? JSON.stringify(body).length : 0
      });
      
      // Детальное логирование для отладки проблем с API
      if (destination === 'external-api') {
        console.log(`🔍 [HTTP CLIENT] Детали запроса к внешнему API:`, {
          endpoint,
          baseUrl,
          queryParams,
          authType: authHeaders['Authorization'] ? authHeaders['Authorization'].split(' ')[0] : 'нет',
          hasAuth: !!authHeaders['Authorization']
        });
      }

      const response = await fetch(fullUrl, {
        method,
        headers: finalHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Получаем данные ответа
      let responseData: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      const responseTime = Date.now() - startTime;

      // Формируем результат
      let apiResponse: ApiResponse<T> = {
        success: response.ok,
        data: responseData,
        status: response.status,
        responseTime,
        headers: Object.fromEntries(response.headers.entries()),
      };

      if (!response.ok) {
        apiResponse.error = `HTTP ${response.status}: ${response.statusText}`;
        if (responseData && typeof responseData === 'object' && responseData.message) {
          apiResponse.error = responseData.message;
        }
        
        // Детальное логирование ошибок
        console.error(`❌ [HTTP CLIENT] Ошибка ответа:`, {
          status: response.status,
          statusText: response.statusText,
          url: fullUrl,
          responseData: responseData,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        // Специальная обработка для 404
        if (response.status === 404) {
          console.error(`💡 [HTTP CLIENT] 404 Not Found - проверьте правильность URL и endpoint:`, fullUrl);
        }
      }

      // Применяем интерцепторы ответа
      for (const interceptor of this.responseInterceptors) {
        apiResponse = interceptor(apiResponse);
      }

      if (response.ok) {
        console.log(`✅ [HTTP CLIENT] Успешный ответ:`, {
          status: response.status,
          responseTime: `${responseTime}ms`,
          dataType: Array.isArray(responseData) ? `массив (${responseData.length} элементов)` : typeof responseData,
          endpoint: endpoint
        });
      }
      
      return apiResponse;

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      console.error(`❌ [HTTP CLIENT] Критическая ошибка запроса:`, {
        message: error.message,
        name: error.name,
        endpoint: endpoint,
        destination: destination,
        responseTime: `${responseTime}ms`,
        stack: error.stack
      });

      // Повторяем запрос при ошибке
      if (retryAttempts > 0 && !error.name?.includes('AbortError')) {
        console.log(`🔄 Retrying request (${retryAttempts} attempts left)`);
        return this.request(endpoint, { ...config, retryAttempts: retryAttempts - 1 });
      }

      const errorResponse: ApiResponse<T> = {
        success: false,
        error: error.message || 'Network error',
        responseTime,
      };

      // Применяем интерцепторы ответа для ошибок
      let finalErrorResponse = errorResponse;
      for (const interceptor of this.responseInterceptors) {
        finalErrorResponse = interceptor(finalErrorResponse);
      }

      return finalErrorResponse;
    }
  }

  /**
   * 📥 GET запрос
   */
  public async get<T = any>(endpoint: string, config: Omit<RequestConfig, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  /**
   * 📤 POST запрос
   */
  public async post<T = any>(endpoint: string, body?: any, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  /**
   * 🔄 PUT запрос
   */
  public async put<T = any>(endpoint: string, body?: any, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body });
  }

  /**
   * ❌ DELETE запрос
   */
  public async delete<T = any>(endpoint: string, config: Omit<RequestConfig, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  /**
   * 🔧 PATCH запрос
   */
  public async patch<T = any>(endpoint: string, body?: any, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body });
  }

  /**
   * 🛡️ Добавить интерцептор запроса
   */
  public addRequestInterceptor(interceptor: (config: RequestConfig) => RequestConfig): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * 📨 Добавить интерцептор ответа
   */
  public addResponseInterceptor(interceptor: (response: ApiResponse) => ApiResponse): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * 🧪 Тестировать подключение к внешнему API
   */
  public async testExternalApiConnection(): Promise<ApiResponse> {
    try {
      const tradingConfig = await tradingNetworkConfigService.getConfig();
      
      if (!tradingConfig.enabled) {
        return {
          success: false,
          error: 'Интеграция с внешней торговой сетью отключена.'
        };
      }
      
      // Тестируем эндпоинт резервуаров
      return await this.get(tradingConfig.endpoints.tanks, {
        destination: 'external-api',
        queryParams: {
          systemId: '1', // Тестовый system ID
          stationId: '1' // Тестовый station ID
        }
      });
    } catch (error: any) {
      return {
        success: false,
        error: `Ошибка тестирования подключения: ${error.message}`
      };
    }
  }

  /**
   * 🔍 Получить информацию о текущей конфигурации
   */
  public async getConfigurationInfo(): Promise<{
    externalApi: any;
    supabase: any;
  }> {
    try {
      const [tradingConfig, supabaseConnection] = await Promise.all([
        tradingNetworkConfigService.getConfig(),
        apiConfigServiceDB.getCurrentConnection()
      ]);
      
      return {
        externalApi: {
          enabled: tradingConfig.enabled,
          baseUrl: tradingConfig.baseUrl,
          authType: tradingConfig.authType,
          hasCredentials: !!(tradingConfig.apiKey || (tradingConfig.username && tradingConfig.password)),
          endpoints: tradingConfig.endpoints
        },
        supabase: {
          url: supabaseConnection?.url,
          type: supabaseConnection?.type,
          hasApiKey: !!supabaseConnection?.settings?.apiKey
        }
      };
    } catch (error) {
      throw new Error('Не удалось получить информацию о конфигурации: ' + (error instanceof Error ? error.message : 'неизвестная ошибка'));
    }
  }

  /**
   * 🌐 Получить все сети
   */
  public async getNetworks(config?: { limit?: number; order?: string }): Promise<ApiResponse<any[]>> {
    const queryParams: Record<string, string> = {
      select: 'id,name,external_id,code'
    };
    
    if (config?.limit) {
      queryParams.limit = config.limit.toString();
    }
    
    if (config?.order) {
      queryParams.order = config.order;
    } else {
      queryParams.order = 'name';
    }

    return this.get('/rest/v1/networks', {
      destination: 'supabase',
      queryParams,
      timeout: 10000
    });
  }

  /**
   * 📍 Получить торговые точки по network_id
   */
  public async getTradingPointsByNetworkId(networkId: string): Promise<ApiResponse<any[]>> {
    return this.get('/rest/v1/trading_points', {
      destination: 'supabase',
      queryParams: {
        select: 'id,name,external_id,network_id',
        network_id: `eq.${networkId}`,
        order: 'name'
      },
      timeout: 10000
    });
  }

  /**
   * 🎯 Получить конкретную торговую точку по ID
   */
  public async getTradingPointById(tradingPointId: string): Promise<ApiResponse<any>> {
    const response = await this.get('/rest/v1/trading_points', {
      destination: 'supabase',
      queryParams: {
        select: 'id,name,external_id,network_id',
        id: `eq.${tradingPointId}`
      },
      timeout: 10000
    });

    if (response.success && response.data && response.data.length > 0) {
      return {
        ...response,
        data: response.data[0]  // Возвращаем один объект вместо массива
      };
    }

    return {
      success: false,
      error: 'Торговая точка не найдена',
      status: 404
    };
  }

  /**
   * 🔍 Получить все торговые точки с информацией о сетях
   */
  public async getAllTradingPointsWithNetworks(): Promise<ApiResponse<any[]>> {
    try {
      // Получаем все сети
      const networksResponse = await this.getNetworks();
      if (!networksResponse.success || !networksResponse.data) {
        return {
          success: false,
          error: 'Не удалось получить список сетей'
        };
      }

      // Создаем карту сетей для быстрого поиска
      const networksMap = new Map();
      networksResponse.data.forEach(network => {
        networksMap.set(network.id, network);
      });

      // Получаем все торговые точки
      const allTradingPoints: any[] = [];
      
      for (const network of networksResponse.data) {
        const tpResponse = await this.getTradingPointsByNetworkId(network.id);
        if (tpResponse.success && tpResponse.data) {
          // Добавляем информацию о сети к каждой торговой точке
          tpResponse.data.forEach(tp => {
            allTradingPoints.push({
              ...tp,
              networkInfo: network,
              systemId: network.external_id || network.code || '',
              stationId: tp.external_id || '',
              apiReady: !!(network.external_id || network.code) && !!tp.external_id
            });
          });
        }
      }

      return {
        success: true,
        data: allTradingPoints,
        status: 200
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Ошибка получения торговых точек с сетями'
      };
    }
  }

  /**
   * 🎯 Получить API параметры для конкретной торговой точки
   */
  public async getApiParamsForTradingPoint(tradingPointId: string): Promise<{
    success: boolean;
    systemId?: string;
    stationId?: string;
    networkInfo?: any;
    tradingPointInfo?: any;
    apiReady?: boolean;
    error?: string;
  }> {
    try {
      // Получаем торговую точку
      const tpResponse = await this.getTradingPointById(tradingPointId);
      if (!tpResponse.success || !tpResponse.data) {
        return {
          success: false,
          error: 'Торговая точка не найдена'
        };
      }

      const tradingPoint = tpResponse.data;

      // Получаем информацию о сети
      const networkResponse = await this.get('/rest/v1/networks', {
        destination: 'supabase',
        queryParams: {
          select: 'id,name,external_id,code',
          id: `eq.${tradingPoint.network_id}`
        }
      });

      if (!networkResponse.success || !networkResponse.data || networkResponse.data.length === 0) {
        return {
          success: false,
          error: 'Связанная сеть не найдена'
        };
      }

      const network = networkResponse.data[0];
      const systemId = network.external_id || network.code || '';
      const stationId = tradingPoint.external_id || '';

      return {
        success: true,
        systemId,
        stationId,
        networkInfo: network,
        tradingPointInfo: tradingPoint,
        apiReady: !!(systemId && stationId)
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Ошибка получения API параметров'
      };
    }
  }
}

// Создаем singleton экземпляр
export const httpClient = new UniversalHttpClient();

// Добавляем базовые интерцепторы
httpClient.addResponseInterceptor((response) => {
  // Логирование ошибок
  if (!response.success) {
    console.warn('🚨 API Error:', response.error, response.status);
  }
  return response;
});

httpClient.addRequestInterceptor((config) => {
  // Добавляем timestamp к каждому запросу для отладки
  if (config.headers) {
    config.headers['X-Request-Time'] = new Date().toISOString();
  }
  return config;
});

export default httpClient;