/**
 * Supabase REST API клиент с универсальным HTTP клиентом
 * Использует httpClient для работы с Supabase REST API
 */

import { httpClient } from './universalHttpClient';

export interface SupabaseConfig {
  url: string;
  apiKey: string;
  schema?: string;
}

export interface SupabaseResponse<T> {
  data: T[] | null;
  error: string | null;
  count?: number;
}

class QueryBuilder {
  private client: SupabaseClient;
  private table: string;
  private query: {
    select?: string;
    filters: Array<{ field: string; operator: string; value: any }>;
    limit?: number;
    offset?: number;
    isConditions: Array<{ field: string; value: any }>;
  };

  constructor(client: SupabaseClient, table: string) {
    this.client = client;
    this.table = table;
    this.query = {
      filters: [],
      isConditions: []
    };
  }

  select(columns = '*') {
    this.query.select = columns;
    return this;
  }

  eq(field: string, value: any) {
    this.query.filters.push({ field, operator: 'eq', value });
    return this;
  }

  is(field: string, value: any) {
    this.query.isConditions.push({ field, value });
    return this;
  }

  limit(count: number) {
    this.query.limit = count;
    return this;
  }

  offset(count: number) {
    this.query.offset = count;
    return this;
  }

  async execute() {
    const url = new URL(`${this.client.baseUrl}/rest/v1/${this.table}`);
    
    // Add select parameter
    if (this.query.select) {
      url.searchParams.set('select', this.query.select);
    }
    
    // Add filters
    this.query.filters.forEach(filter => {
      if (filter.value === null) {
        url.searchParams.append(filter.field, 'is.null');
      } else {
        url.searchParams.append(filter.field, `${filter.operator}.${filter.value}`);
      }
    });
    
    // Add IS conditions
    this.query.isConditions.forEach(condition => {
      if (condition.value === null) {
        url.searchParams.append(condition.field, 'is.null');
      } else {
        url.searchParams.append(condition.field, `is.${condition.value}`);
      }
    });
    
    // Add limit
    if (this.query.limit) {
      url.searchParams.set('limit', this.query.limit.toString());
    }
    
    // Add offset
    if (this.query.offset) {
      url.searchParams.set('offset', this.query.offset.toString());
    }

    const response = await httpClient.request({
      method: 'GET',
      url: url.toString(),
      destination: 'supabase',
      headers: {
        'apikey': this.client.apiKey,
        'Authorization': `Bearer ${this.client.apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    });

    if (response.status >= 400) {
      return {
        data: null,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const data = response.data;
    return {
      data: Array.isArray(data) ? data : [data],
      error: null
    };
  }

  // INSERT method
  insert(data: any[]) {
    return {
      select: () => this.insertAndSelect(data)
    };
  }

  async insertAndSelect(data: any[]) {
    const url = `${this.client.baseUrl}/rest/v1/${this.table}`;
    
    const response = await httpClient.request({
      method: 'POST',
      url,
      destination: 'supabase',
      headers: {
        'apikey': this.client.apiKey,
        'Authorization': `Bearer ${this.client.apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      data: data.length === 1 ? data[0] : data
    });

    if (response.status >= 400) {
      return {
        data: null,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const responseData = response.data;
    return {
      data: Array.isArray(responseData) ? responseData : [responseData],
      error: null
    };
  }

  // Alias for execute to match Supabase's API
  then(onfulfilled?: any, onrejected?: any) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export class SupabaseClient {
  public baseUrl: string;
  public apiKey: string;
  private schema: string;

  constructor(config: SupabaseConfig) {
    this.baseUrl = config.url.replace(/\/$/, ''); // Убираем слэш в конце
    this.apiKey = config.apiKey;
    this.schema = config.schema || 'public';
  }

  /**
   * Create a query builder for the specified table
   */
  from(table: string) {
    return new QueryBuilder(this, table);
  }

  /**
   * Выполнить GET запрос к таблице
   */
  async select<T = any>(
    table: string, 
    options: {
      select?: string;
      eq?: Record<string, any>;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<SupabaseResponse<T>> {
    try {
      const url = new URL(`${this.baseUrl}/rest/v1/${table}`);
      
      // Добавляем параметры запроса
      if (options.select) {
        url.searchParams.set('select', options.select);
      }
      
      if (options.eq) {
        Object.entries(options.eq).forEach(([key, value]) => {
          url.searchParams.set(`${key}`, `eq.${value}`);
        });
      }
      
      if (options.limit) {
        url.searchParams.set('limit', options.limit.toString());
      }
      
      if (options.offset) {
        url.searchParams.set('offset', options.offset.toString());
      }

      const response = await httpClient.request({
        method: 'GET',
        url: url.toString(),
        destination: 'supabase',
        headers: {
          'apikey': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      });

      if (response.status >= 400) {
        return {
          data: null,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = response.data;
      return {
        data: Array.isArray(data) ? data : [data],
        error: null,
        count: Array.isArray(data) ? data.length : 1
      };

    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Выполнить INSERT запрос
   */
  async insert<T = any>(table: string, data: Record<string, any> | Record<string, any>[]): Promise<SupabaseResponse<T>> {
    try {
      const response = await httpClient.request({
        method: 'POST',
        url: `${this.baseUrl}/rest/v1/${table}`,
        destination: 'supabase',
        headers: {
          'apikey': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        data: data
      });

      if (response.status >= 400) {
        return {
          data: null,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const result = response.data;
      return {
        data: Array.isArray(result) ? result : [result],
        error: null
      };

    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Выполнить UPDATE запрос
   */
  async update<T = any>(
    table: string, 
    data: Record<string, any>, 
    where: Record<string, any>
  ): Promise<SupabaseResponse<T>> {
    try {
      const url = new URL(`${this.baseUrl}/rest/v1/${table}`);
      
      // Добавляем условия WHERE
      Object.entries(where).forEach(([key, value]) => {
        url.searchParams.set(`${key}`, `eq.${value}`);
      });

      const response = await httpClient.request({
        method: 'PATCH',
        url: url.toString(),
        destination: 'supabase',
        headers: {
          'apikey': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        data: data
      });

      if (response.status >= 400) {
        return {
          data: null,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const result = response.data;
      return {
        data: Array.isArray(result) ? result : [result],
        error: null
      };

    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Выполнить DELETE запрос
   */
  async delete<T = any>(table: string, where: Record<string, any>): Promise<SupabaseResponse<T>> {
    try {
      const url = new URL(`${this.baseUrl}/rest/v1/${table}`);
      
      // Формируем query параметры для WHERE условий
      const queryParams: Record<string, string> = {};
      Object.entries(where).forEach(([key, value]) => {
        queryParams[key] = `eq.${value}`;
      });

      const response = await httpClient.delete(`/rest/v1/${table}`, {
        destination: 'supabase',
        queryParams,
        headers: {
          'Prefer': 'return=representation'
        }
      });

      if (!response.success) {
        return {
          data: null,
          error: response.error || `Request failed`
        };
      }

      return {
        data: response.data || [],
        error: null
      };

    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Проверить соединение с базой данных
   */
  async testConnection(): Promise<{ success: boolean; error?: string; info?: any }> {
    try {
      // Пробуем получить информацию о базе данных
      const response = await httpClient.get('/rest/v1/', {
        destination: 'supabase'
      });

      if (response.success) {
        return {
          success: true,
          info: {
            status: response.status || 200,
            statusText: 'OK',
            url: this.baseUrl,
            schema: this.schema
          }
        };
      } else {
        return {
          success: false,
          error: response.error || 'Connection test failed'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Получить список таблиц в схеме
   */
  async getTables(): Promise<SupabaseResponse<{ table_name: string }>> {
    return this.select('information_schema.tables', {
      select: 'table_name',
      eq: { table_schema: this.schema }
    });
  }
}

/**
 * Создать клиент Supabase с конфигурацией
 */
export function createSupabaseClient(config: SupabaseConfig): SupabaseClient {
  return new SupabaseClient(config);
}

/**
 * Создать клиент из настроек подключения
 */
export function createSupabaseFromSettings(url: string, apiKey: string, schema = 'public'): SupabaseClient {
  return createSupabaseClient({ url, apiKey, schema });
}