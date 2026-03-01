/**
 * Supabase Service Role Client (только для админских операций)
 * Использует service role key для полного доступа к данным
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  // Supabase credentials not configured in env vars
}

// Создание service role клиента для админских операций
export const supabaseService: SupabaseClient = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
);

// Тест подключения с service role
// ПРИМЕЧАНИЕ: Используйте существующую таблицу (например, users) вместо networks
export const testServiceConnection = async () => {
  try {
    // Используем таблицу users вместо несуществующей networks
    const { data, error, count } = await supabaseService
      .from('users')
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

// ПРИМЕЧАНИЕ: Автотест отключен, так как таблица networks не существует в Supabase
// Используйте testServiceConnection() вручную при необходимости
// testServiceConnection().then(result => {
//   console.log('🔍 Service connection test:', result);
// });

export default supabaseService;