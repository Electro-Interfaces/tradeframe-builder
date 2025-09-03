/**
 * Supabase REST API клиент без дополнительных зависимостей
 * Использует стандартный fetch для работы с Supabase REST API
 */

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

export class SupabaseClient {
  private baseUrl: string;
  private apiKey: string;
  private schema: string;

  constructor(config: SupabaseConfig) {
    this.baseUrl = config.url.replace(/\/$/, ''); // Убираем слэш в конце
    this.apiKey = config.apiKey;
    this.schema = config.schema || 'public';
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

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'apikey': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          data: null,
          error: `HTTP ${response.status}: ${errorText}`
        };
      }

      const data = await response.json();
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
      const response = await fetch(`${this.baseUrl}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'apikey': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          data: null,
          error: `HTTP ${response.status}: ${errorText}`
        };
      }

      const result = await response.json();
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

      const response = await fetch(url.toString(), {
        method: 'PATCH',
        headers: {
          'apikey': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          data: null,
          error: `HTTP ${response.status}: ${errorText}`
        };
      }

      const result = await response.json();
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
      
      // Добавляем условия WHERE
      Object.entries(where).forEach(([key, value]) => {
        url.searchParams.set(`${key}`, `eq.${value}`);
      });

      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: {
          'apikey': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          data: null,
          error: `HTTP ${response.status}: ${errorText}`
        };
      }

      const result = await response.text();
      return {
        data: result ? JSON.parse(result) : [],
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
      const response = await fetch(`${this.baseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return {
          success: true,
          info: {
            status: response.status,
            statusText: response.statusText,
            url: this.baseUrl,
            schema: this.schema
          }
        };
      } else {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`
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