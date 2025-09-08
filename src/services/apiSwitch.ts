/**
 * 🔄 ПРЯМОЕ ПОДКЛЮЧЕНИЕ К SUPABASE
 * 
 * Все сервисы теперь используют прямое подключение к Supabase
 * без промежуточного API сервера
 */

import { supabaseEquipmentAPI, supabaseEquipmentTemplatesAPI } from './equipmentSupabase';
import { componentsSupabaseAPI } from './componentsSupabase';
import { commandTemplatesSupabaseAPI } from './commandTemplatesSupabase';

// 📊 Логирование использования Supabase
const logSupabaseUsage = (service: string) => {
  if (import.meta.env.DEV) {
    console.log(`🔗 ${service}: Используется прямое подключение к Supabase`);
  }
};

// ===== SUPABASE СЕРВИСЫ =====

// 🔧 Equipment API
export const currentEquipmentAPI = (() => {
  logSupabaseUsage('Equipment');
  return supabaseEquipmentAPI;
})();

// 📋 Equipment Templates API (используем тот же equipmentSupabase)  
export const currentEquipmentTemplatesAPI = (() => {
  logSupabaseUsage('Equipment Templates');
  return supabaseEquipmentTemplatesAPI; // правильный API для шаблонов
})();

// 🧩 Components API
export const currentComponentsAPI = (() => {
  logSupabaseUsage('Components');
  return componentsSupabaseAPI;
})();

// 📝 Command Templates API
export const currentCommandTemplatesAPI = (() => {
  logSupabaseUsage('Command Templates');
  return commandTemplatesSupabaseAPI;
})();

// 🔍 Функции для тестирования подключения Supabase

/**
 * Проверка подключения к Supabase
 */
export const testSupabaseConnection = async (): Promise<{
  success: boolean;
  service: string;
  error?: string;
}[]> => {
  const results = [];
  
  // Тест Equipment Supabase
  try {
    await currentEquipmentAPI.list({ trading_point_id: 'test' });
    results.push({ success: true, service: 'Equipment Supabase' });
  } catch (error) {
    results.push({ 
      success: false, 
      service: 'Equipment Supabase',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  
  // Тест Components Supabase
  try {
    await currentComponentsAPI.list({ equipment_id: 'test' });
    results.push({ success: true, service: 'Components Supabase' });
  } catch (error) {
    results.push({ 
      success: false, 
      service: 'Components Supabase',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  
  // Тест Command Templates Supabase
  try {
    await currentCommandTemplatesAPI.list();
    results.push({ success: true, service: 'Command Templates Supabase' });
  } catch (error) {
    results.push({ 
      success: false, 
      service: 'Command Templates Supabase',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  
  return results;
};

/**
 * Получение статуса текущего режима подключения
 * ФИНАЛЬНАЯ КОНФИГУРАЦИЯ: ТОЛЬКО SUPABASE, MOCK ПОЛНОСТЬЮ ОТКЛЮЧЕН
 */
export const getConnectionStatus = () => ({
  mode: 'SUPABASE_PRODUCTION',
  database: 'Supabase',
  connection: 'Direct',
  mockDisabled: true,
  forceDatabaseMode: true,
  debugMode: import.meta.env.DEV
});

// Добавляем функции в window для удобного тестирования в консоли
if (import.meta.env.DEV) {
  // @ts-ignore
  window.supabaseTest = {
    testConnection: testSupabaseConnection,
    getStatus: getConnectionStatus,
    services: {
      equipment: currentEquipmentAPI,
      components: currentComponentsAPI,
      commandTemplates: currentCommandTemplatesAPI
    }
  };
  
  console.log('🧪 Supabase тестирование доступно через window.supabaseTest');
  console.log('🔗 ФИНАЛЬНЫЙ РЕЖИМ: Только Supabase, Mock отключен');
  console.log('🚫 Mock режим полностью деактивирован');
}