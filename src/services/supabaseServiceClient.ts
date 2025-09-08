/**
 * Supabase Service Role Client (только для админских операций)
 * Использует динамическую конфигурацию с service role ключом
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { apiConfigServiceDB } from './apiConfigServiceDB';

let serviceClient: SupabaseClient | null = null;
let lastServiceConnectionId: string | null = null;

/**
 * Получить динамический service role клиент
 */
async function getDynamicServiceClient(): Promise<SupabaseClient | null> {
  try {
    const connection = await apiConfigServiceDB.getCurrentConnection();
    
    if (!connection || connection.type !== 'supabase') {
      console.error('❌ Нет Supabase подключения для service client');
      return null;
    }
    
    // Проверяем, нужно ли пересоздать клиент
    if (serviceClient && lastServiceConnectionId === connection.id) {
      return serviceClient;
    }
    
    const url = connection.url;
    const serviceKey = connection.settings?.serviceRoleKey;
    
    if (!url || !serviceKey) {
      console.error('❌ Отсутствует service role key в конфигурации');
      return null;
    }
    
    console.log('🔧 Создаем динамический Service Client:', {
      url: url,
      keyPreview: serviceKey.substring(0, 50) + '...'
    });
    
    serviceClient = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      }
    });
    
    lastServiceConnectionId = connection.id;
    return serviceClient;
    
  } catch (error) {
    console.error('❌ Ошибка создания service client:', error);
    return null;
  }
}

/**
 * Proxy для service role клиента
 */
export const supabaseService = new Proxy({} as SupabaseClient, {
  get: function(target, prop: keyof SupabaseClient) {
    return async (...args: any[]) => {
      const client = await getDynamicServiceClient();
      if (!client) {
        throw new Error('Service role клиент недоступен. Проверьте конфигурацию.');
      }
      
      const method = client[prop];
      if (typeof method === 'function') {
        return method.apply(client, args);
      }
      return method;
    };
  }
});

/**
 * Тест подключения с service role
 */
export const testServiceConnection = async () => {
  try {
    const client = await getDynamicServiceClient();
    if (!client) {
      return {
        success: false,
        error: 'Service client недоступен'
      };
    }
    
    const { data, error, count } = await client
      .from('networks')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
    
    return {
      success: true,
      message: 'Service role connection successful',
      data: { count }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    };
  }
};

export default supabaseService;