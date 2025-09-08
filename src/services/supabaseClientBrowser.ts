/**
 * Динамический Supabase Client для браузера
 * Получает настройки из systemConfigService вместо хардкоженных значений
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { apiConfigServiceDB } from './apiConfigServiceDB';

let dynamicClient: SupabaseClient | null = null;
let lastConnectionId: string | null = null;

/**
 * Получить динамический Supabase клиент на основе системной конфигурации
 */
async function getDynamicSupabaseClient(): Promise<SupabaseClient | null> {
  try {
    // Получаем текущую конфигурацию подключения
    const connection = await apiConfigServiceDB.getCurrentConnection();
    
    if (!connection) {
      console.error('❌ Нет активного подключения к базе данных');
      return null;
    }
    
    if (connection.type !== 'supabase') {
      console.error(`❌ Неподдерживаемый тип подключения: ${connection.type}`);
      return null;
    }
    
    // Проверяем, нужно ли пересоздать клиент
    if (dynamicClient && lastConnectionId === connection.id) {
      return dynamicClient;
    }
    
    const url = connection.url;
    const key = connection.settings?.serviceRoleKey || connection.settings?.apiKey;
    
    if (!url || !key) {
      console.error('❌ Отсутствуют URL или ключи в конфигурации подключения');
      return null;
    }
    
    console.log('🔧 Создаем динамический Supabase клиент:', {
      connectionId: connection.id,
      name: connection.name,
      url: url,
      keyType: key.includes('service_role') ? 'service_role' : key.includes('anon') ? 'anon' : 'unknown',
      keyPreview: key.substring(0, 50) + '...'
    });
    
    // Создаем новый клиент
    dynamicClient = createClient(url, key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      db: {
        schema: connection.settings?.schema || 'public'
      }
    });
    
    lastConnectionId = connection.id;
    return dynamicClient;
    
  } catch (error) {
    console.error('❌ Ошибка создания динамического Supabase клиента:', error);
    return null;
  }
}

/**
 * Proxy объект для динамического клиента
 */
export const supabaseClientBrowser = new Proxy({} as SupabaseClient, {
  get: function(target, prop: keyof SupabaseClient) {
    // Для chainable методов возвращаем синхронную функцию
    if (prop === 'from') {
      return (tableName: string) => {
        // Возвращаем promise-based query builder
        return {
          async insert(data: any) {
            const client = await getDynamicSupabaseClient();
            if (!client) {
              throw new Error('Supabase клиент недоступен. Проверьте конфигурацию подключения.');
            }
            return client.from(tableName).insert(data);
          },
          async select(columns?: string) {
            const client = await getDynamicSupabaseClient();
            if (!client) {
              throw new Error('Supabase клиент недоступен. Проверьте конфигурацию подключения.');
            }
            const queryBuilder = client.from(tableName).select(columns);
            // Добавляем chainable методы к результату
            return {
              ...queryBuilder,
              async eq(column: string, value: any) {
                return queryBuilder.eq(column, value);
              },
              async single() {
                return queryBuilder.single();
              }
            };
          },
          async update(data: any) {
            const client = await getDynamicSupabaseClient();
            if (!client) {
              throw new Error('Supabase клиент недоступен. Проверьте конфигурацию подключения.');
            }
            return client.from(tableName).update(data);
          },
          async delete() {
            const client = await getDynamicSupabaseClient();
            if (!client) {
              throw new Error('Supabase клиент недоступен. Проверьте конфигурацию подключения.');
            }
            return client.from(tableName).delete();
          }
        };
      };
    }
    
    // Для остальных методов
    return async (...args: any[]) => {
      const client = await getDynamicSupabaseClient();
      if (!client) {
        throw new Error('Supabase клиент недоступен. Проверьте конфигурацию подключения.');
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
 * Экспорт для обратной совместимости
 */
export const supabase = supabaseClientBrowser;

/**
 * Получить реальный Supabase клиент для использования в коде
 */
export async function getSupabaseClient() {
  const client = await getDynamicSupabaseClient();
  if (!client) {
    throw new Error('Supabase клиент недоступен. Проверьте конфигурацию подключения.');
  }
  return client;
}

/**
 * Принудительное обновление клиента
 */
export async function refreshSupabaseClient(): Promise<void> {
  dynamicClient = null;
  lastConnectionId = null;
  console.log('🔄 Принудительное обновление Supabase клиента');
}

/**
 * Проверка доступности динамического клиента
 */
export async function testDynamicConnection(): Promise<boolean> {
  try {
    const client = await getDynamicSupabaseClient();
    if (!client) return false;
    
    // Тестовый запрос
    const { error } = await client
      .from('system_config')
      .select('config_key')
      .limit(1);
      
    if (error) {
      console.error('❌ Тест динамического подключения неудачен:', error.message);
      return false;
    }
    
    console.log('✅ Динамическое подключение к Supabase работает');
    return true;
    
  } catch (error) {
    console.error('❌ Критическая ошибка тестирования динамического подключения:', error);
    return false;
  }
}

// Добавляем отладочную информацию в режиме разработки
if (import.meta.env.DEV) {
  console.log('🔧 Динамический Supabase клиент инициализирован');
  
  // Логирование запросов через Proxy пока не реализовано
  // так как Proxy перехватывает все методы асинхронно
}