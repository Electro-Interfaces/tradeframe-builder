/**
 * 🚀 ФИНАЛЬНАЯ ПРОИЗВОДСТВЕННАЯ КОНФИГУРАЦИЯ
 * 
 * Mock режим полностью отключен
 * Все сервисы работают напрямую с Supabase
 * Обмен данными только через прямые подключения к БД
 */

export const PRODUCTION_CONFIG = {
  // === ОСНОВНЫЕ НАСТРОЙКИ ===
  mode: 'PRODUCTION' as const,
  mockDisabled: true,
  forceDatabaseMode: true,
  
  // === БАЗА ДАННЫХ ===
  database: {
    type: 'supabase' as const,
    url: 'DYNAMIC', // Получается из системной конфигурации
    directConnection: true,
    fallbackToMock: false, // ПОЛНОСТЬЮ ОТКЛЮЧЕН FALLBACK
    connectionTimeout: 8000,
    retryAttempts: 3,
    poolSize: 10
  },
  
  // === АУТЕНТИФИКАЦИЯ ===
  auth: {
    provider: 'supabase' as const,
    requireAuth: true,
    sessionPersistence: true,
    autoRefresh: true
  },
  
  // === ПРОИЗВОДИТЕЛЬНОСТЬ ===
  performance: {
    enableCaching: true,
    cacheTTL: 300000, // 5 минут
    compression: true,
    minifyResponses: true,
    queryOptimization: true
  },
  
  // === БЕЗОПАСНОСТЬ ===
  security: {
    enableSSL: true,
    validateCertificates: true,
    encryptStorage: true,
    sanitizeQueries: true,
    preventSQLInjection: true
  },
  
  // === ЛОГИРОВАНИЕ ===
  logging: {
    level: 'error' as const,
    enableConsoleLogging: false,
    enableRemoteLogging: true,
    logQueries: false, // В продакшене не логируем запросы
    logErrors: true
  },
  
  // === МОНИТОРИНГ ===
  monitoring: {
    enableHealthChecks: true,
    enablePerformanceMonitoring: true,
    enableErrorReporting: true,
    metricsCollection: true
  },
  
  // === ОТКЛЮЧЕННЫЕ ФУНКЦИИ ===
  disabled: {
    mockServices: true,
    demoMode: true,
    localStorageFallback: false, // Оставляем для критических случаев
    debugMode: false,
    testEndpoints: true
  },
  
  // === SUPABASE КОНФИГУРАЦИЯ ===
  supabase: {
    url: 'https://tohtryzyffcebtyvkxwh.supabase.co',
    schema: 'public',
    autoApiKey: false, // В продакшене используем явные ключи
    enableRealtimeSubscriptions: true,
    maxConnections: 10
  }
};

/**
 * Проверка готовности к производственному режиму
 */
export const validateProductionReadiness = () => {
  const checks = {
    mockDisabled: PRODUCTION_CONFIG.mockDisabled,
    databaseConfigured: !!PRODUCTION_CONFIG.database.url,
    authConfigured: PRODUCTION_CONFIG.auth.provider === 'supabase',
    sslEnabled: PRODUCTION_CONFIG.security.enableSSL,
    debugDisabled: PRODUCTION_CONFIG.disabled.debugMode
  };
  
  const allChecks = Object.values(checks).every(Boolean);
  
  if (!allChecks) {
    console.error('❌ Система не готова к производственному режиму:', checks);
    throw new Error('Production readiness validation failed');
  }
  
  console.log('✅ Система готова к производственному режиму');
  return true;
};

/**
 * Получить текущий статус конфигурации
 */
export const getProductionStatus = () => ({
  mode: PRODUCTION_CONFIG.mode,
  database: PRODUCTION_CONFIG.database.type,
  mockDisabled: PRODUCTION_CONFIG.mockDisabled,
  forceDatabaseMode: PRODUCTION_CONFIG.forceDatabaseMode,
  ready: true
});

// Автоматическая проверка при импорте в продакшен режиме
if (import.meta.env.PROD) {
  try {
    validateProductionReadiness();
    console.log('🚀 Производственная конфигурация активна');
  } catch (error) {
    console.error('❌ Ошибка инициализации производственной конфигурации:', error);
  }
}