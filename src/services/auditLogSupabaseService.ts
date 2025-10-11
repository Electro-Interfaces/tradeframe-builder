/**
 * Supabase сервис для работы с журналом аудита
 * Прямое взаимодействие с таблицей audit_log
 */

import { apiConfigService } from './apiConfigService';
import type {
  AuditLogEntry,
  CreateAuditLogInput,
  AuditLogFilters,
  AuditLogStatistics,
  AuditActionType
} from '@/types/audit';

export class AuditLogSupabaseService {
  /**
   * Получает URL и ключ Supabase из конфигурации
   */
  private static getSupabaseConfig() {
    const connection = apiConfigService.getCurrentConnection();

    // Если это Supabase подключение - используем его
    if (connection?.type === 'supabase') {
      return {
        url: connection.url,
        apiKey: connection.settings?.serviceRoleKey || connection.settings?.apiKey || ''
      };
    }

    // Фоллбэк на хардкод (для совместимости)
    return {
      url: 'https://ssvazdgnmatbdynkhkqo.supabase.co',
      apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0'
    };
  }

  /**
   * Создает новую запись в журнале аудита
   */
  static async createAuditLog(input: CreateAuditLogInput): Promise<AuditLogEntry> {
    const config = this.getSupabaseConfig();
    const url = `${config.url}/rest/v1/audit_log`;
    const headers = {
      'Content-Type': 'application/json',
      'apikey': config.apiKey,
      'Authorization': `Bearer ${config.apiKey}`,
      'Prefer': 'return=representation'
    };

    // Автоматически добавляем timestamp если не указан
    const timestamp = new Date().toISOString();

    // Подготавливаем данные для вставки
    const data = {
      timestamp,
      user_id: input.user_id || null,
      user_email: input.user_email || '',
      user_name: input.user_name || null,
      action: input.action,
      action_type: input.action_type,
      object: input.object || null,
      object_type: input.object_type || null,
      object_id: input.object_id || null,
      ip_address: input.ip_address || null,
      user_agent: input.user_agent || navigator?.userAgent || null,
      details: input.details || null,
      metadata: input.metadata || null,
      created_at: timestamp
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create audit log: ${response.status} ${errorText}`);
    }

    const [result] = await response.json();
    return result;
  }

  /**
   * Получает записи журнала аудита с фильтрами
   */
  static async getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> {
    const config = this.getSupabaseConfig();
    const url = new URL(`${config.url}/rest/v1/audit_log`);
    const headers = {
      'apikey': config.apiKey,
      'Authorization': `Bearer ${config.apiKey}`
    };

    // Применяем фильтры
    const params = new URLSearchParams();
    params.append('select', '*');
    params.append('order', 'timestamp.desc');

    // Фильтр по дате
    if (filters.date_from) {
      params.append('timestamp', `gte.${filters.date_from}`);
    }
    if (filters.date_to) {
      params.append('timestamp', `lte.${filters.date_to}`);
    }

    // Фильтр по пользователю
    if (filters.user_id) {
      params.append('user_id', `eq.${filters.user_id}`);
    }
    if (filters.user_email) {
      params.append('user_email', `eq.${filters.user_email}`);
    }

    // Фильтр по типу действия
    if (filters.action_type && filters.action_type !== 'all') {
      params.append('action_type', `eq.${filters.action_type}`);
    }

    // Фильтр по объекту
    if (filters.object_type) {
      params.append('object_type', `eq.${filters.object_type}`);
    }
    if (filters.object_id) {
      params.append('object_id', `eq.${filters.object_id}`);
    }

    // Поиск по тексту (ищем в action и object)
    if (filters.search_query) {
      params.append('or', `(action.ilike.*${filters.search_query}*,object.ilike.*${filters.search_query}*,user_email.ilike.*${filters.search_query}*)`);
    }

    // Пагинация
    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    } else {
      params.append('limit', '100'); // По умолчанию 100 записей
    }

    if (filters.offset) {
      params.append('offset', filters.offset.toString());
    }

    url.search = params.toString();

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get audit logs: ${response.status} ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Получает одну запись журнала по ID
   */
  static async getAuditLogById(id: string): Promise<AuditLogEntry | null> {
    const config = this.getSupabaseConfig();
    const url = `${config.url}/rest/v1/audit_log`;
    const headers = {
      'apikey': config.apiKey,
      'Authorization': `Bearer ${config.apiKey}`
    };

    const params = new URLSearchParams({
      id: `eq.${id}`,
      select: '*'
    });

    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get audit log: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.length > 0 ? data[0] : null;
  }

  /**
   * Получает статистику по журналу аудита
   */
  static async getAuditLogStatistics(): Promise<AuditLogStatistics> {
    try {
      // Получаем все записи для подсчета статистики
      const allLogs = await this.getAuditLogs({ limit: 10000 });

      // Подсчитываем события по типам
      const eventsByType = allLogs.reduce((acc, log) => {
        acc[log.action_type] = (acc[log.action_type] || 0) + 1;
        return acc;
      }, {} as Record<AuditActionType, number>);

      // Подсчитываем события по пользователям
      const userEventsMap = new Map<string, { user_id: string; user_email: string; user_name?: string; count: number }>();

      allLogs.forEach(log => {
        const key = log.user_email;
        if (!userEventsMap.has(key)) {
          userEventsMap.set(key, {
            user_id: log.user_id || '',
            user_email: log.user_email,
            user_name: log.user_name,
            count: 0
          });
        }
        userEventsMap.get(key)!.count++;
      });

      const eventsByUser = Array.from(userEventsMap.values())
        .sort((a, b) => b.count - a.count);

      // Подсчитываем события за последние 24 часа
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      const recentEvents = allLogs.filter(log =>
        new Date(log.timestamp) > yesterday
      ).length;

      // Подсчитываем неудачные операции
      const failedOperations = allLogs.filter(log =>
        log.details && log.details.success === false
      ).length;

      return {
        total_events: allLogs.length,
        events_by_type: eventsByType,
        events_by_user: eventsByUser,
        recent_events: recentEvents,
        failed_operations: failedOperations
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Получает последние N записей журнала
   */
  static async getRecentAuditLogs(limit: number = 10): Promise<AuditLogEntry[]> {
    return this.getAuditLogs({ limit });
  }

  /**
   * Получает записи журнала для конкретного пользователя
   */
  static async getUserAuditLogs(userId: string, limit: number = 50): Promise<AuditLogEntry[]> {
    return this.getAuditLogs({ user_id: userId, limit });
  }

  /**
   * Получает записи журнала для конкретного объекта
   */
  static async getObjectAuditLogs(objectId: string, limit: number = 50): Promise<AuditLogEntry[]> {
    return this.getAuditLogs({ object_id: objectId, limit });
  }

  /**
   * Удаляет старые записи журнала (используется функция clean_old_audit_logs)
   */
  static async cleanOldAuditLogs(daysToKeep: number = 180): Promise<number> {
    const config = this.getSupabaseConfig();
    const url = `${config.url}/rest/v1/rpc/clean_old_audit_logs`;
    const headers = {
      'Content-Type': 'application/json',
      'apikey': config.apiKey,
      'Authorization': `Bearer ${config.apiKey}`
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ days_to_keep: daysToKeep })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to clean old audit logs: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result;
  }
}
