/**
 * Factory для создания Supabase клиентов с различными настройками
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface DatabaseSettings {
  url: string;
  apiKey: string;
  serviceRoleKey?: string;
}

/**
 * Создает Supabase клиент на основе настроек из localStorage или переданных параметров
 */
export function createSupabaseFromSettings(settings?: DatabaseSettings): SupabaseClient | null {
  try {
    let config: DatabaseSettings;
    
    if (settings) {
      config = settings;
    } else {
      // Пытаемся получить настройки из localStorage
      const storedSettings = localStorage.getItem('externalDatabase');
      if (!storedSettings) {
        console.warn('⚠️ Настройки внешней БД не найдены в localStorage');
        return null;
      }
      
      const parsedSettings = JSON.parse(storedSettings);
      if (!parsedSettings.url || !parsedSettings.apiKey) {
        console.warn('⚠️ Некорректные настройки внешней БД');
        return null;
      }
      
      config = {
        url: parsedSettings.url,
        apiKey: parsedSettings.apiKey,
        serviceRoleKey: parsedSettings.serviceRoleKey
      };
    }

    // Создаем клиент
    const client = createClient(config.url, config.serviceRoleKey || config.apiKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          'x-application-name': 'tradeframe-builder'
        }
      }
    });

    console.log('✅ Supabase клиент создан через factory');
    return client;
    
  } catch (error) {
    console.error('❌ Ошибка создания Supabase клиента:', error);
    return null;
  }
}

/**
 * Создает административный Supabase клиент с service role ключом
 */
export function createAdminSupabaseClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'x-application-name': 'tradeframe-builder-admin'
      }
    }
  });
}

/**
 * Проверяет подключение к Supabase
 */
export async function testSupabaseConnection(client: SupabaseClient): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await client
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