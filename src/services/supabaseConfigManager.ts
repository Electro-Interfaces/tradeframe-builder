/**
 * Менеджер конфигурации Supabase
 * ОБНОВЛЕНО: Использует настройки из БД через systemConfigService
 */

import { apiConfigServiceDB } from './apiConfigServiceDB';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { httpClient } from './universalHttpClient';

class SupabaseConfigManager {
  private client: SupabaseClient | null = null;

  /**
   * Получить текущий Supabase клиент
   * ОБНОВЛЕНО: Использует настройки из БД через apiConfigServiceDB
   */
  async getClient(): Promise<SupabaseClient | null> {
    const connection = await apiConfigServiceDB.getCurrentConnection();
    
    if (!connection || connection.type !== 'supabase') {
      console.warn('⚠️ Current connection is not Supabase type');
      return null;
    }

    const url = connection.url;
    const apiKey = connection.settings?.serviceRoleKey || connection.settings?.apiKey;

    if (!url || !apiKey) {
      console.error('❌ Missing Supabase URL or API key in configuration');
      return null;
    }

    // Создаем новый клиент если конфигурация изменилась
    if (!this.client) {
      console.log('🔧 Creating new Supabase client from DB configuration:', {
        url: url,
        keyType: apiKey.includes('service_role') ? 'service_role' : 'anon',
        keyPreview: apiKey.substring(0, 50) + '...'
      });

      this.client = createClient(url, apiKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true
        },
        db: {
          schema: connection.settings?.schema || 'public'
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });
    }

    return this.client;
  }

  /**
   * Получить настройки для прямых fetch запросов
   * ОБНОВЛЕНО: Асинхронный метод для работы с БД
   */
  async getFetchConfig(): Promise<{ url: string; headers: Record<string, string> } | null> {
    const connection = await apiConfigServiceDB.getCurrentConnection();
    
    if (!connection || connection.type !== 'supabase') {
      console.warn('⚠️ Current connection is not Supabase type');
      return null;
    }

    const url = connection.url;
    const apiKey = connection.settings?.serviceRoleKey || connection.settings?.apiKey;

    if (!url || !apiKey) {
      console.error('❌ Missing Supabase URL or API key in configuration');
      return null;
    }

    return {
      url,
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };
  }

  /**
   * Тестирование подключения
   * ОБНОВЛЕНО: Использует асинхронный getFetchConfig
   */
  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      const fetchConfig = await this.getFetchConfig();
      
      if (!fetchConfig) {
        return {
          success: false,
          error: 'Invalid configuration'
        };
      }

      const response = await httpClient.get('/rest/v1/networks', {
        destination: 'supabase',
        queryParams: { select: 'id', limit: '1' }
      });

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Request failed'
        };
      }

      const data = response.data;
      
      return {
        success: true,
        details: {
          status: 'connected',
          url: fetchConfig.url,
          testQuery: 'networks',
          responseLength: data.length
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Сброс клиента (для переподключения с новыми настройками)
   */
  resetClient(): void {
    this.client = null;
    console.log('🔄 Supabase client reset');
  }

  /**
   * Получить информацию о текущем подключении
   * ОБНОВЛЕНО: Асинхронный метод для работы с БД
   */
  async getConnectionInfo(): Promise<{ isConfigured: boolean; connectionName?: string; url?: string; keyType?: string }> {
    const connection = await apiConfigServiceDB.getCurrentConnection();
    
    if (!connection || connection.type !== 'supabase') {
      return { isConfigured: false };
    }

    const apiKey = connection.settings?.serviceRoleKey || connection.settings?.apiKey;
    
    return {
      isConfigured: !!(connection.url && apiKey),
      connectionName: connection.name,
      url: connection.url,
      keyType: apiKey?.includes('service_role') ? 'service_role' : 
               apiKey?.includes('anon') ? 'anon' : 'unknown'
    };
  }

  /**
   * Универсальный метод для выполнения запросов к Supabase
   * ОБНОВЛЕНО: Использует асинхронный getFetchConfig
   */
  async fetchFromSupabase(endpoint: string, options: any = {}): Promise<any> {
    const response = await httpClient.request(endpoint, {
      destination: 'supabase',
      ...options
    });

    if (!response.success) {
      throw new Error(response.error || 'Request failed');
    }

    return response.data;
  }
}

// Singleton экземпляр
export const supabaseConfigManager = new SupabaseConfigManager();

// Хелперы для обратной совместимости (ОБНОВЛЕНЫ для асинхронной работы)
export const getSupabaseClient = async () => await supabaseConfigManager.getClient();
export const getSupabaseFetchConfig = async () => await supabaseConfigManager.getFetchConfig();
export const testSupabaseConnection = async () => await supabaseConfigManager.testConnection();