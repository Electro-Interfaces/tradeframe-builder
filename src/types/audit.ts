/**
 * Типы для системы аудита действий пользователей
 */

// Типы действий в системе
export type AuditActionType =
  | 'price_change'           // Изменение цен
  | 'user_management'        // Управление пользователями
  | 'equipment_management'   // Работа с оборудованием
  | 'authentication'         // Аутентификация (вход/выход)
  | 'network_settings'       // Настройки сети
  | 'reports'                // Работа с отчетами
  | 'system_maintenance'     // Обслуживание системы
  | 'legal_documents'        // Работа с правовыми документами
  | 'data_migration'         // Миграция данных
  | 'api_config';            // Настройка API

// Типы объектов в системе
export type AuditObjectType =
  | 'trading_point'   // Торговая точка
  | 'equipment'       // Оборудование
  | 'user'            // Пользователь
  | 'network'         // Сеть
  | 'report'          // Отчет
  | 'price'           // Цена
  | 'tank'            // Резервуар
  | 'shift'           // Смена
  | 'transaction'     // Транзакция
  | 'legal_document'  // Правовой документ
  | 'api_connection'  // API подключение
  | 'system';         // Системный объект

// Детальная информация о действии
export interface AuditDetails {
  before?: any;           // Состояние до изменения
  after?: any;            // Состояние после изменения
  reason?: string;        // Причина изменения
  changes?: string[];     // Список изменений
  error?: string;         // Ошибка (если была)
  success?: boolean;      // Успешность операции
  duration_ms?: number;   // Длительность операции
  [key: string]: any;     // Дополнительные поля
}

// Метаданные события
export interface AuditMetadata {
  session_id?: string;    // ID сессии
  user_agent?: string;    // User-Agent браузера
  location?: string;      // Местоположение (если доступно)
  device_info?: {         // Информация об устройстве
    type: 'desktop' | 'mobile' | 'tablet';
    os?: string;
    browser?: string;
  };
  request_id?: string;    // ID запроса для трейсинга
  source?: 'web' | 'api' | 'mobile' | 'system'; // Источник действия
  [key: string]: any;     // Дополнительные поля
}

// Запись в журнале аудита
export interface AuditLogEntry {
  id: string;
  timestamp: string;

  // Пользователь
  user_id: string | null;
  user_email: string;
  user_name?: string;

  // Действие
  action: string;
  action_type: AuditActionType;

  // Объект
  object?: string;
  object_type?: AuditObjectType;
  object_id?: string;

  // Сетевая информация
  ip_address?: string;
  user_agent?: string;

  // Детали
  details?: AuditDetails;
  metadata?: AuditMetadata;

  // Служебные поля
  created_at: string;
}

// Входные данные для создания записи в журнале аудита
export interface CreateAuditLogInput {
  // Пользователь (если не указан - берется из текущей сессии)
  user_id?: string;
  user_email?: string;
  user_name?: string;

  // Действие (обязательно)
  action: string;
  action_type: AuditActionType;

  // Объект (опционально)
  object?: string;
  object_type?: AuditObjectType;
  object_id?: string;

  // Сетевая информация (опционально, автоматически определяется)
  ip_address?: string;
  user_agent?: string;

  // Детали (опционально)
  details?: AuditDetails;
  metadata?: AuditMetadata;
}

// Фильтры для поиска в журнале аудита
export interface AuditLogFilters {
  // Временной диапазон
  date_from?: string;
  date_to?: string;

  // Пользователь
  user_id?: string;
  user_email?: string;

  // Тип действия
  action_type?: AuditActionType | 'all';

  // Объект
  object_type?: AuditObjectType;
  object_id?: string;

  // Поиск по тексту
  search_query?: string;

  // Пагинация
  limit?: number;
  offset?: number;
}

// Статистика по журналу аудита
export interface AuditLogStatistics {
  total_events: number;
  events_by_type: Record<AuditActionType, number>;
  events_by_user: Array<{
    user_id: string;
    user_email: string;
    user_name?: string;
    count: number;
  }>;
  recent_events: number; // События за последние 24 часа
  failed_operations: number; // Неудачные операции
}

// Типы действий для удобного использования
export const AUDIT_ACTION_TYPES: Record<AuditActionType, string> = {
  price_change: 'Изменение цен',
  user_management: 'Управление пользователями',
  equipment_management: 'Работа с оборудованием',
  authentication: 'Аутентификация',
  network_settings: 'Настройки сети',
  reports: 'Отчеты',
  system_maintenance: 'Обслуживание системы',
  legal_documents: 'Правовые документы',
  data_migration: 'Миграция данных',
  api_config: 'Настройка API'
};

// Типы объектов для удобного использования
export const AUDIT_OBJECT_TYPES: Record<AuditObjectType, string> = {
  trading_point: 'Торговая точка',
  equipment: 'Оборудование',
  user: 'Пользователь',
  network: 'Сеть',
  report: 'Отчет',
  price: 'Цена',
  tank: 'Резервуар',
  shift: 'Смена',
  transaction: 'Транзакция',
  legal_document: 'Правовой документ',
  api_connection: 'API подключение',
  system: 'Система'
};
