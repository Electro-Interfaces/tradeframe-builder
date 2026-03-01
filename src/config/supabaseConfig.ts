/**
 * Конфигурация Supabase для TradeControl Builder
 * Поддержка development и production режимов
 */

import { supabaseService } from '@/services/supabaseServiceClient';

// Получение конфигурации из переменных окружения
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Проверяем что ключи настроены
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Supabase configuration missing!');
  console.error('   Please check your .env files:');
  console.error('   - VITE_SUPABASE_URL should be set');
  console.error('   - VITE_SUPABASE_ANON_KEY should be set');
  throw new Error('Supabase configuration is incomplete');
}

// Определяем режим работы
const isDevelopment = import.meta.env.DEV;
const useSupabaseDirect = import.meta.env.VITE_USE_SUPABASE_DIRECT === 'true';

// Используем готовый service клиент
export const supabase = supabaseService;

// Информация о конфигурации (для отладки)
export const supabaseConfig = {
  url: SUPABASE_URL,
  isDevelopment,
  useSupabaseDirect,
  keyType: SUPABASE_ANON_KEY.includes('"role":"service_role"') ? 'SERVICE_ROLE' : 'ANON',
  schema: 'public'
};

// Debug информация (только в development)
if (isDevelopment && import.meta.env.VITE_DEBUG_MODE === 'true') {
  console.log('🔧 Supabase Configuration:', {
    url: supabaseConfig.url,
    keyType: supabaseConfig.keyType,
    isDevelopment,
    useSupabaseDirect
  });
  
  if (supabaseConfig.keyType === 'SERVICE_ROLE') {
  } else {
  }
}

/**
 * Тестирование соединения с Supabase
 */
export async function testSupabaseConnection() {
  
  try {
    const result = await supabase.testConnection();
    
    if (result.success) {
      
      // Дополнительная проверка доступности таблиц
      const tablesResult = await supabase.select('equipment_templates', { limit: 1 });
      if (tablesResult.error) {
        // Table access limited
        return { success: true, warning: 'Limited table access', details: result.info };
      } else {
        return { success: true, details: result.info };
      }
      
    } else {
      console.error('❌ Supabase connection failed:', result.error);
      return { success: false, error: result.error };
    }
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Supabase connection test error:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Получить информацию о доступных таблицах
 */
export async function getAvailableTables() {
  try {
    const result = await supabase.getTables();
    
    if (result.error) {
      // Could not fetch tables list
      return { success: false, error: result.error };
    }
    
    const tables = result.data?.map(t => t.table_name) || [];
    
    return { success: true, tables };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Error fetching tables:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Проверка конкретной таблицы
 */
export async function checkTableAccess(tableName: string) {
  try {
    const result = await supabase.select(tableName, { limit: 1 });
    
    if (result.error) {
      // Table access issue
      return { accessible: false, error: result.error };
    }
    
    return { accessible: true, sampleData: result.data?.[0] };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error checking table '${tableName}':`, errorMsg);
    return { accessible: false, error: errorMsg };
  }
}

// Экспорт для использования в компонентах
export default supabase;