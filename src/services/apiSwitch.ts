/**
 * 🔄 ПЕРЕКЛЮЧАТЕЛЬ API - для тестирования миграции
 * 
 * Этот файл позволяет быстро переключаться между mock и HTTP API
 * для тестирования готовности к production
 */

import { 
  mockEquipmentAPI, 
  mockEquipmentTemplatesAPI 
} from './equipment';

import { 
  mockComponentsAPI
} from './components';

import { 
  httpEquipmentAPI,
  httpEquipmentTemplatesAPI,
  httpComponentsAPI,
  HttpApiError
} from './httpClients';

// 🎛️ КОНФИГУРАЦИЯ ПЕРЕКЛЮЧЕНИЯ
const API_CONFIG = {
  // Установить true для использования реального HTTP API
  USE_HTTP_API: import.meta.env.VITE_USE_HTTP_API === 'true' || false,
  
  // URL реального API
  API_BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  
  // Режим отладки
  DEBUG_MODE: import.meta.env.DEV || false
};

// 📊 Логирование переключений
const logApiUsage = (service: string, mode: 'MOCK' | 'HTTP') => {
  if (API_CONFIG.DEBUG_MODE) {
    console.log(`🔄 ${service}: Используется ${mode} API`);
  }
};

// ===== ПЕРЕКЛЮЧАЕМЫЕ СЕРВИСЫ =====

// 🔧 Equipment API
export const currentEquipmentAPI = (() => {
  if (API_CONFIG.USE_HTTP_API) {
    logApiUsage('Equipment', 'HTTP');
    return httpEquipmentAPI;
  } else {
    logApiUsage('Equipment', 'MOCK');
    return mockEquipmentAPI;
  }
})();

// 📋 Equipment Templates API  
export const currentEquipmentTemplatesAPI = (() => {
  if (API_CONFIG.USE_HTTP_API) {
    logApiUsage('Equipment Templates', 'HTTP');
    return httpEquipmentTemplatesAPI;
  } else {
    logApiUsage('Equipment Templates', 'MOCK');
    return mockEquipmentTemplatesAPI;
  }
})();

// 🧩 Components API
export const currentComponentsAPI = (() => {
  if (API_CONFIG.USE_HTTP_API) {
    logApiUsage('Components', 'HTTP');
    return httpComponentsAPI;
  } else {
    logApiUsage('Components', 'MOCK');
    return mockComponentsAPI;
  }
})();

// 🔍 Функции для тестирования подключения

/**
 * Проверка доступности реального API
 */
export const testApiConnection = async (): Promise<{
  success: boolean;
  service: string;
  error?: string;
}[]> => {
  const results = [];
  
  // Тест Equipment API
  try {
    await httpEquipmentAPI.list({ trading_point_id: 'test' });
    results.push({ success: true, service: 'Equipment API' });
  } catch (error) {
    results.push({ 
      success: false, 
      service: 'Equipment API',
      error: error instanceof HttpApiError ? error.message : 'Unknown error'
    });
  }
  
  // Тест Equipment Templates API
  try {
    await httpEquipmentTemplatesAPI.list();
    results.push({ success: true, service: 'Equipment Templates API' });
  } catch (error) {
    results.push({ 
      success: false, 
      service: 'Equipment Templates API',
      error: error instanceof HttpApiError ? error.message : 'Unknown error'
    });
  }
  
  // Тест Components API
  try {
    await httpComponentsAPI.list({ equipment_id: 'test' });
    results.push({ success: true, service: 'Components API' });
  } catch (error) {
    results.push({ 
      success: false, 
      service: 'Components API',
      error: error instanceof HttpApiError ? error.message : 'Unknown error'
    });
  }
  
  return results;
};

/**
 * Получение статуса текущего режима API
 */
export const getApiStatus = () => ({
  mode: API_CONFIG.USE_HTTP_API ? 'HTTP' : 'MOCK',
  baseUrl: API_CONFIG.API_BASE_URL,
  debugMode: API_CONFIG.DEBUG_MODE,
  config: API_CONFIG
});

/**
 * Принудительное переключение на HTTP API (для тестирования)
 */
export const forceHttpMode = () => {
  // @ts-ignore
  window.__FORCE_HTTP_API = true;
  console.warn('🔄 Принудительно включен HTTP API режим');
  location.reload();
};

/**
 * Принудительное переключение на Mock API (для тестирования)
 */
export const forceMockMode = () => {
  // @ts-ignore
  window.__FORCE_HTTP_API = false;
  console.warn('🔄 Принудительно включен MOCK API режим');
  location.reload();
};

// Добавляем функции в window для удобного тестирования в консоли
if (API_CONFIG.DEBUG_MODE) {
  // @ts-ignore
  window.apiTest = {
    testConnection: testApiConnection,
    getStatus: getApiStatus,
    forceHttp: forceHttpMode,
    forceMock: forceMockMode
  };
  
  console.log('🧪 API тестирование доступно через window.apiTest');
  console.log('📊 Текущий режим:', getApiStatus().mode);
}