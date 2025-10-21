/**
 * Высокоуровневый сервис для журнала аудита
 * Упрощает логирование действий пользователей
 */

import { AuditLogSupabaseService } from './auditLogSupabaseService';
import type {
  AuditLogEntry,
  CreateAuditLogInput,
  AuditLogFilters,
  AuditLogStatistics,
  AuditActionType,
  AuditObjectType,
  AuditDetails
} from '@/types/audit';

// Получение текущего пользователя из localStorage/sessionStorage
const getCurrentUser = () => {
  try {
    // Проверяем старый формат (AuthContext)
    const savedUser = localStorage.getItem('tradeframe_user');
    if (savedUser && !savedUser.includes('[object Object]')) {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser && parsedUser.id && parsedUser.email) {
        return {
          id: parsedUser.id,
          name: parsedUser.name || parsedUser.firstName || 'User',
          email: parsedUser.email
        };
      }
    }

    // Проверяем новый формат (NewAuthContext)
    const sessionEmail = sessionStorage.getItem('current_user_email');
    if (sessionEmail) {
      // Для NewAuthContext возвращаем только email
      return {
        id: null,
        name: sessionEmail.split('@')[0],
        email: sessionEmail
      };
    }
  } catch (error) {
    // Игнорируем ошибки парсинга
  }

  return null;
};

// Получение IP адреса (может быть заменено на реальный IP через API)
const getClientIp = (): string | undefined => {
  // В production можно использовать API для получения IP
  // Например: https://api.ipify.org?format=json
  return undefined; // В dev режиме не пытаемся определить IP
};

// Определение типа устройства
const getDeviceType = (): 'desktop' | 'mobile' | 'tablet' => {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
    return 'tablet';
  }
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
    return 'mobile';
  }
  return 'desktop';
};

// Основной сервис
export const auditLogService = {
  /**
   * Создает запись в журнале аудита
   */
  async log(input: CreateAuditLogInput): Promise<AuditLogEntry | null> {
    try {
      // Получаем информацию о текущем пользователе из storage (если есть)
      const currentUser = getCurrentUser();

      // Если email передан явно в input - используем его, иначе из currentUser
      if (!input.user_email && !currentUser) {
        // Нет информации о пользователе - не логируем
        if (import.meta.env.DEV) {
          console.warn('[AuditLog] Пропущено логирование - нет данных о пользователе');
        }
        return null;
      }

      // Дополняем входные данные информацией о пользователе
      const enrichedInput: CreateAuditLogInput = {
        ...input,
        user_id: input.user_id || currentUser?.id || undefined,
        user_email: input.user_email || currentUser?.email || '',
        user_name: input.user_name || currentUser?.name || 'Неизвестно',
        ip_address: input.ip_address || getClientIp(),
        user_agent: input.user_agent || navigator.userAgent,
        metadata: {
          ...input.metadata,
          device_info: {
            type: getDeviceType(),
            os: navigator.platform,
            browser: navigator.userAgent
          },
          source: 'web'
        }
      };

      return await AuditLogSupabaseService.createAuditLog(enrichedInput);
    } catch (error) {
      // Не бросаем ошибку, чтобы не сломать основной функционал
      // В production можно логировать через сервис мониторинга
      if (import.meta.env.DEV) {
        console.error('[AuditLog] Ошибка при создании записи:', error);
      }
      return null;
    }
  },

  /**
   * Логирование аутентификации
   */
  async logAuthentication(
    action: 'login' | 'logout' | 'failed_login',
    userEmail: string,
    details?: AuditDetails
  ): Promise<AuditLogEntry | null> {
    // Защита от undefined/null userEmail
    if (!userEmail) {
      if (import.meta.env.DEV) {
        console.warn('[AuditLog] Пропущено логирование аутентификации - userEmail не передан');
      }
      return null;
    }

    const actionTexts = {
      login: `Вход в систему: ${userEmail}`,
      logout: `Выход из системы: ${userEmail}`,
      failed_login: `Неудачная попытка входа: ${userEmail}`
    };

    // Для аутентификации передаем email явно (т.к. может вызываться до сохранения в storage)
    return this.log({
      action: actionTexts[action],
      action_type: 'authentication',
      object: userEmail,
      object_type: 'user',
      user_email: userEmail, // Явно передаем email
      user_name: details?.user_name || (userEmail.includes('@') ? userEmail.split('@')[0] : userEmail), // Имя из details или из email
      user_id: details?.user_id, // ID из details если есть
      details: {
        ...details,
        success: action !== 'failed_login'
      }
    });
  },

  /**
   * Логирование изменения цен
   */
  async logPriceChange(
    tradingPointName: string,
    tradingPointId: string,
    fuelType: string,
    oldPrice: number,
    newPrice: number,
    reason?: string
  ): Promise<AuditLogEntry | null> {
    return this.log({
      action: `Изменил цену на ${fuelType} с ${oldPrice} на ${newPrice} руб.`,
      action_type: 'price_change',
      object: tradingPointName,
      object_type: 'trading_point',
      object_id: tradingPointId,
      details: {
        before: { price: oldPrice, fuel_type: fuelType },
        after: { price: newPrice, fuel_type: fuelType },
        reason: reason || 'Не указана',
        success: true
      }
    });
  },

  /**
   * Логирование операций с оборудованием
   */
  async logEquipmentOperation(
    operation: 'reload' | 'diagnostics' | 'update' | 'create' | 'delete',
    equipmentName: string,
    equipmentId: string,
    details?: AuditDetails
  ): Promise<AuditLogEntry | null> {
    const operationTexts = {
      reload: 'Перезагрузил оборудование',
      diagnostics: 'Запустил диагностику оборудования',
      update: 'Обновил настройки оборудования',
      create: 'Добавил новое оборудование',
      delete: 'Удалил оборудование'
    };

    return this.log({
      action: `${operationTexts[operation]}: ${equipmentName}`,
      action_type: 'equipment_management',
      object: equipmentName,
      object_type: 'equipment',
      object_id: equipmentId,
      details: {
        ...details,
        success: true
      }
    });
  },

  /**
   * Логирование управления пользователями
   */
  async logUserManagement(
    operation: 'create' | 'update' | 'delete' | 'block' | 'unblock',
    targetUserEmail: string,
    targetUserId?: string,
    details?: AuditDetails
  ): Promise<AuditLogEntry | null> {
    const operationTexts = {
      create: 'Создал пользователя',
      update: 'Обновил данные пользователя',
      delete: 'Удалил пользователя',
      block: 'Заблокировал пользователя',
      unblock: 'Разблокировал пользователя'
    };

    return this.log({
      action: `${operationTexts[operation]}: ${targetUserEmail}`,
      action_type: 'user_management',
      object: targetUserEmail,
      object_type: 'user',
      object_id: targetUserId,
      details: {
        ...details,
        success: true
      }
    });
  },

  /**
   * Логирование работы с отчетами
   */
  async logReportOperation(
    operation: 'generate' | 'export' | 'view',
    reportName: string,
    reportType?: string,
    details?: AuditDetails
  ): Promise<AuditLogEntry | null> {
    const operationTexts = {
      generate: 'Сформировал отчет',
      export: 'Экспортировал отчет',
      view: 'Просмотрел отчет'
    };

    return this.log({
      action: `${operationTexts[operation]}: ${reportName}`,
      action_type: 'reports',
      object: reportName,
      object_type: 'report',
      details: {
        ...details,
        report_type: reportType,
        success: true
      }
    });
  },

  /**
   * Логирование настроек сети
   */
  async logNetworkSettings(
    operation: string,
    networkName: string,
    networkId?: string,
    details?: AuditDetails
  ): Promise<AuditLogEntry | null> {
    return this.log({
      action: `${operation}: ${networkName}`,
      action_type: 'network_settings',
      object: networkName,
      object_type: 'network',
      object_id: networkId,
      details: {
        ...details,
        success: true
      }
    });
  },

  /**
   * Логирование работы с правовыми документами
   */
  async logLegalDocument(
    operation: 'create' | 'update' | 'publish' | 'accept' | 'view',
    documentName: string,
    documentId?: string,
    details?: AuditDetails
  ): Promise<AuditLogEntry | null> {
    const operationTexts = {
      create: 'Создал правовой документ',
      update: 'Обновил правовой документ',
      publish: 'Опубликовал правовой документ',
      accept: 'Принял правовой документ',
      view: 'Просмотрел правовой документ'
    };

    return this.log({
      action: `${operationTexts[operation]}: ${documentName}`,
      action_type: 'legal_documents',
      object: documentName,
      object_type: 'legal_document',
      object_id: documentId,
      details: {
        ...details,
        success: true
      }
    });
  },

  /**
   * Логирование настройки API
   */
  async logApiConfig(
    operation: string,
    apiName: string,
    details?: AuditDetails
  ): Promise<AuditLogEntry | null> {
    return this.log({
      action: `${operation}: ${apiName}`,
      action_type: 'api_config',
      object: apiName,
      object_type: 'api_connection',
      details: {
        ...details,
        success: true
      }
    });
  },

  /**
   * Логирование системного обслуживания
   */
  async logSystemMaintenance(
    operation: string,
    details?: AuditDetails
  ): Promise<AuditLogEntry | null> {
    return this.log({
      action: operation,
      action_type: 'system_maintenance',
      object_type: 'system',
      details: {
        ...details,
        success: true
      }
    });
  },

  /**
   * Получает записи журнала с фильтрами
   */
  async getAuditLogs(filters?: AuditLogFilters): Promise<AuditLogEntry[]> {
    try {
      return await AuditLogSupabaseService.getAuditLogs(filters);
    } catch (error) {
      return [];
    }
  },

  /**
   * Получает статистику по журналу
   */
  async getStatistics(): Promise<AuditLogStatistics | null> {
    try {
      return await AuditLogSupabaseService.getAuditLogStatistics();
    } catch (error) {
      return null;
    }
  },

  /**
   * Получает последние N записей
   */
  async getRecentLogs(limit: number = 10): Promise<AuditLogEntry[]> {
    try {
      return await AuditLogSupabaseService.getRecentAuditLogs(limit);
    } catch (error) {
      return [];
    }
  }
};

export default auditLogService;
