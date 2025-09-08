/**
 * Базовый Supabase клиент ТОЛЬКО для загрузки системной конфигурации
 * Использует минимальные fallback настройки для решения циклической зависимости
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ТОЛЬКО ДЛЯ ЗАГРУЗКИ КОНФИГУРАЦИИ - минимальные настройки из environment
const configUrl = import.meta.env.VITE_SUPABASE_URL;
const configKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_SERVICE_KEY;

if (!configUrl || !configKey) {
  console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: Отсутствуют базовые переменные окружения VITE_SUPABASE_URL или VITE_SUPABASE_ANON_KEY');
  console.error('   Установите эти переменные для подключения к базе системной конфигурации');
}

// Создаем ТОЛЬКО клиент для чтения системной конфигурации
export const supabaseConfigClient: SupabaseClient = createClient(
  configUrl || 'https://placeholder.supabase.co',
  configKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

console.log('🔧 Базовый клиент системной конфигурации создан:', {
  url: configUrl ? `${configUrl.substring(0, 30)}...` : 'НЕ ЗАДАН',
  keyPresent: !!configKey,
  keyType: configKey?.includes('service_role') ? 'service_role' : configKey?.includes('anon') ? 'anon' : 'неизвестен'
});

/**
 * Проверка доступности базовой конфигурации
 */
export async function testConfigConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabaseConfigClient
      .from('system_config')
      .select('config_key')
      .limit(1);
      
    if (error) {
      console.error('❌ Ошибка подключения к системной конфигурации:', error.message);
      return false;
    }
    
    console.log('✅ Базовое подключение к системной конфигурации работает');
    return true;
    
  } catch (error) {
    console.error('❌ Критическая ошибка подключения к системной конфигурации:', error);
    return false;
  }
}