/**
 * Helper для стандартизации работы с Supabase подключениями
 * КРИТИЧЕСКИ ВАЖНО: Все Supabase сервисы должны использовать этот helper
 * для проверки доступности подключения через централизованную конфигурацию
 */

import { apiConfigServiceDB } from './apiConfigServiceDB';

export class SupabaseConnectionHelper {
  /**
   * Получить активное подключение к Supabase
   */
  static async getActiveConnection() {
    try {
      const connection = await apiConfigServiceDB.getCurrentConnection();
      
      if (!connection) {
        console.log('🔄 Нет активного подключения в конфигурации');
        return null;
      }
      
      if (connection.type !== 'supabase') {
        console.log(`🔄 Подключение типа ${connection.type}, Supabase недоступен`);
        return null;
      }
      
      console.log('✅ Supabase подключение активно');
      return connection;
    } catch (error) {
      console.error('❌ Ошибка получения Supabase подключения:', error);
      return null;
    }
  }

  /**
   * Проверить доступность Supabase
   */
  static async isSupabaseAvailable(): Promise<boolean> {
    const connection = await this.getActiveConnection();
    return connection !== null;
  }

  /**
   * ❌ FALLBACK МЕХАНИЗМ ЗАБЛОКИРОВАН
   * Выполнить операцию БЕЗ fallback - только Supabase
   */
  static async executeWithFallback<T>(
    supabaseOperation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>
  ): Promise<T> {
    if (!(await this.isSupabaseAvailable())) {
      throw new Error('Supabase недоступен. Настройте подключение в разделе "Обмен данными".');
    }

    return await supabaseOperation();
  }

  /**
   * Выполнить операцию с проверкой подключения
   * Бросает исключение, если Supabase недоступен
   */
  static async executeWithConnection<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    if (!(await this.isSupabaseAvailable())) {
      throw new Error('Supabase недоступен или не настроен в конфигурации');
    }

    try {
      return await operation();
    } catch (error) {
      console.error('❌ Ошибка выполнения Supabase операции:', error);
      throw error;
    }
  }

  /**
   * ❌ FALLBACK МЕХАНИЗМ ЗАБЛОКИРОВАН
   * Выполнить операцию БЕЗ fallback - только Supabase
   */
  static async safeExecute<T>(
    operationName: string,
    operation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>
  ): Promise<T> {
    console.log(`🔄 ${operationName}: проверка подключения Supabase...`);
    
    const isAvailable = await this.isSupabaseAvailable();
    
    if (!isAvailable) {
      throw new Error(`${operationName}: Supabase недоступен. Настройте подключение в разделе "Обмен данными".`);
    }

    console.log(`✅ ${operationName}: выполнение через Supabase`);
    const result = await operation();
    console.log(`✅ ${operationName}: успешно выполнено`);
    return result;
  }

  /**
   * Получить состояние подключения для отладки
   */
  static async getConnectionStatus() {
    try {
      const connection = await apiConfigServiceDB.getCurrentConnection();
      
      return {
        hasConnection: !!connection,
        type: connection?.type || null,
        isSupabaseActive: connection?.type === 'supabase',
        config: connection ? {
          name: connection.name,
          description: connection.description,
          status: connection.status
        } : null
      };
    } catch (error) {
      return {
        hasConnection: false,
        type: null,
        isSupabaseActive: false,
        config: null,
        error: error.message
      };
    }
  }

  /**
   * Инициализировать helper (для совместимости)
   */
  static async initialize(): Promise<void> {
    try {
      await apiConfigServiceDB.initialize();
      console.log('✅ SupabaseConnectionHelper инициализирован');
    } catch (error) {
      console.warn('⚠️ Ошибка инициализации SupabaseConnectionHelper:', error);
    }
  }

  /**
   * Получить режим работы (mock/database)
   */
  static async isMockMode(): Promise<boolean> {
    try {
      return await apiConfigServiceDB.isMockMode();
    } catch (error) {
      console.warn('⚠️ Ошибка проверки режима, используется mock режим:', error);
      return true;
    }
  }
}

/**
 * Decorator для автоматической проверки подключения
 */
export function withSupabaseConnection(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = async function (...args: any[]) {
    if (!(await SupabaseConnectionHelper.isSupabaseAvailable())) {
      throw new Error(`${propertyName}: Supabase недоступен`);
    }
    
    return method.apply(this, args);
  };
}

/**
 * Универсальная функция для стандартизации всех Supabase вызовов
 */
// ❌ FALLBACK МЕХАНИЗМ ЗАБЛОКИРОВАН
export async function executeSupabaseOperation<T>(
  operationName: string,
  operation: () => Promise<{ data: T; error: any }>,
  fallback?: () => Promise<T>
): Promise<T> {
  return SupabaseConnectionHelper.safeExecute(
    operationName,
    async () => {
      const { data, error } = await operation();
      if (error) throw error;
      return data;
    }
    // Fallback удален - только Supabase
  );
}

// Экспорт для обратной совместимости
export const supabaseConnectionHelper = SupabaseConnectionHelper;