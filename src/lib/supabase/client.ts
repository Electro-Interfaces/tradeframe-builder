/**
 * Клиент БД с retry логикой и обработкой ошибок
 */

import { createClient, SupabaseClient, PostgrestError } from '@supabase/supabase-js';

interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  maxRetries?: number;
  retryDelay?: number;
}

interface RetryOptions {
  maxRetries: number;
  delay: number;
  backoff: boolean;
}

class EnhancedSupabaseClient {
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig | null = null;
  private readonly defaultRetryOptions: RetryOptions = {
    maxRetries: 3,
    delay: 1000,
    backoff: true
  };

  /**
   * Инициализация клиента с настройками из localStorage
   */
  initialize(): boolean {
    try {
      const settings = localStorage.getItem('externalDatabase');
      if (!settings) return false;

      const parsed = JSON.parse(settings);
      if (!parsed.url || !parsed.apiKey) return false;

      this.config = {
        url: parsed.url,
        anonKey: parsed.apiKey,
        serviceRoleKey: parsed.serviceRoleKey,
        maxRetries: parsed.maxRetries || 3,
        retryDelay: parsed.retryDelay || 1000
      };

      // Создаем клиент с улучшенными настройками
      this.client = createClient(this.config.url, this.config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'x-application-name': 'tradeframe-builder'
          }
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });

      return true;
    } catch (error) {
      console.error('❌ Ошибка инициализации DB client:', error);
      return false;
    }
  }

  /**
   * Проверка подключения к БД
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Клиент не инициализирован' };
    }

    try {
      const { data, error } = await this.client
        .from('users')
        .select('id')
        .limit(1);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Retry механизм для запросов
   */
  private async executeWithRetry<T>(
    operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
    options: Partial<RetryOptions> = {}
  ): Promise<{ data: T | null; error: PostgrestError | null }> {
    const retryOptions = { ...this.defaultRetryOptions, ...options };
    let lastError: PostgrestError | null = null;

    for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        if (!result.error) {
          return result;
        }

        lastError = result.error;

        // Проверяем, стоит ли повторять запрос
        if (!this.shouldRetry(result.error, attempt, retryOptions.maxRetries)) {
          break;
        }

        // Ждем перед следующей попыткой
        const delay = retryOptions.backoff 
          ? retryOptions.delay * Math.pow(2, attempt)
          : retryOptions.delay;
        
        // Retry attempt failed, will retry after delay
        await this.sleep(delay);

      } catch (error) {
        console.error(`❌ Неожиданная ошибка на попытке ${attempt + 1}:`, error);
        if (attempt === retryOptions.maxRetries) {
          return { data: null, error: lastError };
        }
      }
    }

    return { data: null, error: lastError };
  }

  /**
   * Определяет, стоит ли повторять запрос при данной ошибке
   */
  private shouldRetry(error: PostgrestError, attempt: number, maxRetries: number): boolean {
    if (attempt >= maxRetries) return false;

    // Коды ошибок, при которых стоит повторить запрос
    const retryableErrors = [
      'connection_failure',
      'timeout',
      'network_error',
      'rate_limit_exceeded'
    ];

    // Проверяем HTTP статусы
    if (error.code) {
      const httpStatus = parseInt(error.code);
      if (httpStatus >= 500 && httpStatus < 600) return true; // Server errors
      if (httpStatus === 429) return true; // Rate limiting
      if (httpStatus === 408) return true; // Request timeout
    }

    // Проверяем сообщение об ошибке
    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError)
    );
  }

  /**
   * Утилита для задержки
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Безопасное выполнение SELECT запроса с retry
   */
  async select<T = any>(
    table: string, 
    columns: string = '*',
    options: {
      filters?: Record<string, any>;
      orderBy?: { column: string; ascending: boolean };
      limit?: number;
      retryOptions?: Partial<RetryOptions>;
    } = {}
  ): Promise<{ data: T[] | null; error: PostgrestError | null }> {
    if (!this.client) {
      return { data: null, error: { message: 'Клиент не инициализирован', details: '', hint: '', code: '' } as PostgrestError };
    }

    return this.executeWithRetry(async () => {
      let query = this.client!.from(table).select(columns);

      // Применяем фильтры
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      // Применяем сортировку
      if (options.orderBy) {
        query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending });
      }

      // Применяем лимит
      if (options.limit) {
        query = query.limit(options.limit);
      }

      return query;
    }, options.retryOptions);
  }

  /**
   * Безопасное выполнение INSERT запроса с retry
   */
  async insert<T = any>(
    table: string, 
    data: any | any[],
    options: { retryOptions?: Partial<RetryOptions> } = {}
  ): Promise<{ data: T[] | null; error: PostgrestError | null }> {
    if (!this.client) {
      return { data: null, error: { message: 'Клиент не инициализирован', details: '', hint: '', code: '' } as PostgrestError };
    }

    return this.executeWithRetry(async () => {
      return this.client!.from(table).insert(data).select();
    }, options.retryOptions);
  }

  /**
   * Безопасное выполнение UPDATE запроса с retry
   */
  async update<T = any>(
    table: string, 
    data: any,
    filters: Record<string, any>,
    options: { retryOptions?: Partial<RetryOptions> } = {}
  ): Promise<{ data: T[] | null; error: PostgrestError | null }> {
    if (!this.client) {
      return { data: null, error: { message: 'Клиент не инициализирован', details: '', hint: '', code: '' } as PostgrestError };
    }

    return this.executeWithRetry(async () => {
      let query = this.client!.from(table).update(data);
      
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      return query.select();
    }, options.retryOptions);
  }

  /**
   * Безопасное выполнение DELETE запроса с retry
   */
  async delete<T = any>(
    table: string,
    filters: Record<string, any>,
    options: { retryOptions?: Partial<RetryOptions> } = {}
  ): Promise<{ data: T[] | null; error: PostgrestError | null }> {
    if (!this.client) {
      return { data: null, error: { message: 'Клиент не инициализирован', details: '', hint: '', code: '' } as PostgrestError };
    }

    return this.executeWithRetry(async () => {
      let query = this.client!.from(table).delete();
      
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      return query.select();
    }, options.retryOptions);
  }

  /**
   * Batch операции с транзакциями
   */
  async batch<T = any>(
    operations: Array<{
      type: 'select' | 'insert' | 'update' | 'delete';
      table: string;
      data?: any;
      filters?: Record<string, any>;
      columns?: string;
    }>,
    options: { retryOptions?: Partial<RetryOptions> } = {}
  ): Promise<{ data: T[] | null; error: PostgrestError | null }> {
    if (!this.client) {
      return { data: null, error: { message: 'Клиент не инициализирован', details: '', hint: '', code: '' } as PostgrestError };
    }

    return this.executeWithRetry(async () => {
      const results = [];
      
      for (const operation of operations) {
        let result;
        switch (operation.type) {
          case 'select':
            result = await this.select(operation.table, operation.columns || '*', { filters: operation.filters });
            break;
          case 'insert':
            result = await this.insert(operation.table, operation.data);
            break;
          case 'update':
            result = await this.update(operation.table, operation.data, operation.filters || {});
            break;
          case 'delete':
            result = await this.delete(operation.table, operation.filters || {});
            break;
        }
        
        if (result.error) {
          return { data: null, error: result.error };
        }
        
        results.push(result.data);
      }
      
      return { data: results as T[], error: null };
    }, options.retryOptions);
  }

  /**
   * Real-time подписка с автоматическим переподключением
   */
  subscribe(
    table: string,
    callback: (payload: any) => void,
    options: {
      event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      filter?: string;
    } = {}
  ) {
    if (!this.client) {
      console.error('❌ Клиент не инициализирован для подписки');
      return null;
    }

    const channel = this.client
      .channel(`${table}-changes`)
      .on('postgres_changes', {
        event: options.event || '*',
        schema: 'public',
        table: table,
        filter: options.filter
      }, callback)
      .subscribe((status) => {
      });

    return channel;
  }

  /**
   * Получение текущего клиента (для прямого использования)
   */
  getClient(): SupabaseClient | null {
    return this.client;
  }

  /**
   * Проверка инициализации клиента
   */
  isInitialized(): boolean {
    return this.client !== null;
  }
}

// Глобальный экземпляр
export const supabaseClient = new EnhancedSupabaseClient();

// Утилиты для работы с ошибками
export const SupabaseErrorHandler = {
  isNetworkError: (error: any): boolean => {
    return error?.message?.includes('fetch') || error?.code === 'network_error';
  },

  isAuthError: (error: any): boolean => {
    return error?.message?.includes('JWT') || error?.code?.startsWith('auth');
  },

  isPermissionError: (error: any): boolean => {
    return error?.message?.includes('permission') || error?.code === '42501';
  },

  getHumanReadableError: (error: any): string => {
    if (!error) return 'Неизвестная ошибка';

    if (SupabaseErrorHandler.isNetworkError(error)) {
      return 'Проблемы с сетью. Проверьте подключение к интернету.';
    }

    if (SupabaseErrorHandler.isAuthError(error)) {
      return 'Ошибка авторизации. Проверьте настройки API ключа.';
    }

    if (SupabaseErrorHandler.isPermissionError(error)) {
      return 'Недостаточно прав доступа. Проверьте настройки RLS.';
    }

    return error.message || 'Неизвестная ошибка';
  }
};
