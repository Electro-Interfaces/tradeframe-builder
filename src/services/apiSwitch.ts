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
import { apiConfigService } from '@/services/apiConfigService';

const API_CONFIG = {
  // Установить true для использования реального HTTP API
  USE_HTTP_API: !apiConfigService.isMockMode(),
  
  // URL реального API
  API_BASE_URL: apiConfigService.getCurrentApiUrl(),
  
  // Режим отладки
  DEBUG_MODE: import.meta.env.DEV || false
};

type ApiSwitchWindow = Window & typeof globalThis & {
  __FORCE_HTTP_API?: boolean;
  apiTest?: {
    testConnection: typeof testApiConnection;
    getStatus: typeof getApiStatus;
    forceHttp: typeof forceHttpMode;
    forceMock: typeof forceMockMode;
  };
};

// 📊 Логирование переключений
const logApiUsage = (service: string, mode: 'MOCK' | 'HTTP') => {
  void API_CONFIG.DEBUG_MODE;
  void service;
  void mode;
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
  (window as ApiSwitchWindow).__FORCE_HTTP_API = true;
  // Forced HTTP API mode
  location.reload();
};

/**
 * Принудительное переключение на Mock API (для тестирования)
 */
export const forceMockMode = () => {
  (window as ApiSwitchWindow).__FORCE_HTTP_API = false;
  // Forced MOCK API mode
  location.reload();
};

// Добавляем функции в window для удобного тестирования в консоли
if (API_CONFIG.DEBUG_MODE) {
  (window as ApiSwitchWindow).apiTest = {
    testConnection: testApiConnection,
    getStatus: getApiStatus,
    forceHttp: forceHttpMode,
    forceMock: forceMockMode
  };
}
