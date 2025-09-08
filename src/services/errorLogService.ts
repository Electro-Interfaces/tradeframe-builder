/**
 * ЦЕНТРАЛИЗОВАННЫЙ СЕРВИС ЖУРНАЛА ОШИБОК
 * 
 * Логирует все критические ошибки системы в базу данных Supabase
 * Для физической торговой системы - обязательная трассировка всех сбоев
 */

import { supabase } from './supabaseClientBrowser';

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  level: 'critical' | 'error' | 'warning';
  service: string;
  operation: string;
  error_message: string;
  error_stack?: string;
  user_id?: string;
  trading_point_id?: string;
  metadata?: Record<string, any>;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
}

export interface ErrorLogFilters {
  level?: 'critical' | 'error' | 'warning';
  service?: string;
  trading_point_id?: string;
  resolved?: boolean;
  date_from?: string;
  date_to?: string;
}

class ErrorLogService {
  
  /**
   * КРИТИЧЕСКАЯ ОШИБКА - обязательно логируется
   */
  async logCriticalError(
    service: string,
    operation: string,
    error: Error | string,
    context?: {
      user_id?: string;
      trading_point_id?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const errorMessage = error instanceof Error ? error.message : error;
      const errorStack = error instanceof Error ? error.stack : undefined;

      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'critical' as const,
        service,
        operation,
        error_message: errorMessage,
        error_stack: errorStack,
        user_id: context?.user_id,
        trading_point_id: context?.trading_point_id,
        metadata: context?.metadata,
        resolved: false
      };

      const { error: dbError } = await supabase
        .from('error_logs')
        .insert(logEntry);

      if (dbError) {
        // Если не можем записать в БД - хотя бы в консоль
        console.error('❌ КРИТИЧНО: Не удалось записать ошибку в журнал:', dbError);
        console.error('❌ ИСХОДНАЯ ОШИБКА:', logEntry);
      } else {
        console.log('📝 Критическая ошибка записана в журнал:', { service, operation, error_message: errorMessage });
      }
    } catch (logError) {
      console.error('❌ КАТАСТРОФА: Сбой системы логирования ошибок:', logError);
      console.error('❌ ИСХОДНАЯ ОШИБКА:', { service, operation, error: error.toString() });
    }
  }

  /**
   * Обычная ошибка
   */
  async logError(
    service: string,
    operation: string,
    error: Error | string,
    context?: {
      user_id?: string;
      trading_point_id?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const errorMessage = error instanceof Error ? error.message : error;
      const errorStack = error instanceof Error ? error.stack : undefined;

      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'error' as const,
        service,
        operation,
        error_message: errorMessage,
        error_stack: errorStack,
        user_id: context?.user_id,
        trading_point_id: context?.trading_point_id,
        metadata: context?.metadata,
        resolved: false
      };

      const { error: dbError } = await supabase
        .from('error_logs')
        .insert(logEntry);

      if (dbError) {
        console.error('⚠️ Не удалось записать ошибку в журнал:', dbError);
      }
    } catch (logError) {
      console.error('❌ Сбой логирования ошибки:', logError);
    }
  }

  /**
   * Предупреждение
   */
  async logWarning(
    service: string,
    operation: string,
    message: string,
    context?: {
      user_id?: string;
      trading_point_id?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'warning' as const,
        service,
        operation,
        error_message: message,
        user_id: context?.user_id,
        trading_point_id: context?.trading_point_id,
        metadata: context?.metadata,
        resolved: false
      };

      await supabase.from('error_logs').insert(logEntry);
    } catch (logError) {
      console.error('❌ Сбой логирования предупреждения:', logError);
    }
  }

  /**
   * Получить журнал ошибок
   */
  async getErrorLogs(
    filters?: ErrorLogFilters,
    limit: number = 100
  ): Promise<ErrorLogEntry[]> {
    try {
      let query = supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (filters?.level) {
        query = query.eq('level', filters.level);
      }

      if (filters?.service) {
        query = query.eq('service', filters.service);
      }

      if (filters?.trading_point_id) {
        query = query.eq('trading_point_id', filters.trading_point_id);
      }

      if (filters?.resolved !== undefined) {
        query = query.eq('resolved', filters.resolved);
      }

      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ Не удалось загрузить журнал ошибок:', error);
      throw error;
    }
  }

  /**
   * Отметить ошибку как решенную
   */
  async resolveError(
    errorId: string,
    resolvedBy: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('error_logs')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedBy
        })
        .eq('id', errorId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('❌ Не удалось отметить ошибку как решенную:', error);
      throw error;
    }
  }

  /**
   * Получить статистику ошибок
   */
  async getErrorStats(): Promise<{
    total: number;
    critical: number;
    errors: number;
    warnings: number;
    unresolved: number;
    today: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('level, resolved, created_at');

      if (error) {
        throw error;
      }

      const today = new Date().toISOString().split('T')[0];
      
      const stats = {
        total: data?.length || 0,
        critical: data?.filter(e => e.level === 'critical').length || 0,
        errors: data?.filter(e => e.level === 'error').length || 0,
        warnings: data?.filter(e => e.level === 'warning').length || 0,
        unresolved: data?.filter(e => !e.resolved).length || 0,
        today: data?.filter(e => e.created_at.startsWith(today)).length || 0,
      };

      return stats;
    } catch (error) {
      console.error('❌ Не удалось загрузить статистику ошибок:', error);
      return { total: 0, critical: 0, errors: 0, warnings: 0, unresolved: 0, today: 0 };
    }
  }

  /**
   * Создать таблицу в базе данных (если не существует)
   */
  async createTableIfNotExists(): Promise<void> {
    try {
      // Проверяем существование таблицы через простой запрос
      const { error } = await supabase
        .from('error_logs')
        .select('id')
        .limit(1);

      if (error && error.code === '42P01') {
        // Таблица не существует - предлагаем создать
        console.warn('⚠️ Таблица error_logs не найдена. Необходимо создать её в Supabase.');
        console.log(`
📝 SQL для создания таблицы error_logs:

CREATE TABLE error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('critical', 'error', 'warning')),
  service TEXT NOT NULL,
  operation TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  user_id UUID,
  trading_point_id UUID,
  metadata JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX idx_error_logs_level ON error_logs(level);
CREATE INDEX idx_error_logs_service ON error_logs(service);
CREATE INDEX idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at);
        `);
      }
    } catch (error) {
      console.error('❌ Ошибка проверки таблицы журнала ошибок:', error);
    }
  }
}

// Singleton экземпляр
export const errorLogService = new ErrorLogService();

// Инициализация при старте
errorLogService.createTableIfNotExists();