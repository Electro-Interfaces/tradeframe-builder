/**
 * Типы для системы уведомлений
 */

// Типы правил уведомлений
export type NotificationRuleType =
  | 'bill_acceptor_threshold'  // Пороги купюроприемника
  | 'equipment_offline'         // Оборудование офлайн
  | 'low_fuel_level'           // Низкий уровень топлива
  | 'shift_not_closed'         // Незакрытая смена
  | 'custom';                  // Пользовательское правило

// Приоритеты уведомлений
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

// Каналы доставки уведомлений
export type NotificationChannel = 'email' | 'telegram';

// Типы расписания
export type ScheduleType = 'cron' | 'interval' | 'realtime';

// Статусы уведомления
export type NotificationStatus = 'pending' | 'sent' | 'read' | 'archived' | 'failed';

// Конфигурация правила
export interface RuleConfig {
  checkType: string;
  warningLevel?: 'warning' | 'critical' | 'both';
  applyToAllStations?: boolean;
  specificStations?: string[];
  [key: string]: any;
}

// Конфигурация расписания
export interface ScheduleConfig {
  cron?: string;           // Cron выражение, например "0 */6 * * *"
  interval?: number;       // Интервал в миллисекундах
  realtime?: boolean;      // Проверка в реальном времени
}

// Конфигурация уведомлений
export interface NotificationConfig {
  channels: NotificationChannel[];     // Каналы доставки
  priority: NotificationPriority;      // Приоритет
  groupByStation?: boolean;            // Группировать по станциям
  suppressDuplicates?: boolean;        // Подавлять дубликаты
  suppressDuration?: number;           // Длительность подавления (мс)
  emailTemplate?: string;              // Шаблон email
  telegramTemplate?: string;           // Шаблон Telegram сообщения
}

// Правило уведомления (структура из базы данных - snake_case)
export interface NotificationRule {
  id: string;
  tenant_id: string;

  // Основная информация
  name: string;
  description?: string;
  type: NotificationRuleType;

  // Статус
  is_active: boolean;

  // Конфигурация
  rule_config: RuleConfig;
  schedule_type: ScheduleType;
  schedule_config: ScheduleConfig;
  notification_config: NotificationConfig;

  // Получатели
  recipients?: {
    roles: string[];
    users: string[];
  };

  // Метаданные
  created_at: string;
  updated_at: string;
  created_by?: string;

  // Статистика
  last_check_at?: string;
  last_notification_at?: string;
  total_notifications_sent?: number;
}

// Уведомление
export interface Notification {
  id: string;
  tenantId: string;
  ruleId?: string;

  // Информация об уведомлении
  type: NotificationRuleType;
  title: string;
  message: string;
  priority: NotificationPriority;

  // Контекст (данные для шаблона)
  context?: Record<string, any>;

  // Статус
  status: NotificationStatus;

  // Доставка
  channels: NotificationChannel[];
  sentAt?: string;
  readAt?: string;

  // Метаданные
  createdAt: string;
  expiresAt?: string;
  archivedAt?: string;
}

// Подписка пользователя на уведомления
export interface UserNotificationSubscription {
  id: string;
  userId: string;

  // Тип уведомлений
  notificationType: NotificationRuleType;

  // Каналы доставки
  channels: NotificationChannel[];

  // Фильтры
  filters?: {
    priority?: NotificationPriority[];
    stations?: string[];
    networks?: string[];
  };

  // Статус подписки
  isActive: boolean;

  // Метаданные
  createdAt: string;
  updatedAt: string;
}

// Журнал доставки уведомления
export interface NotificationDeliveryLog {
  id: string;
  notificationId: string;
  userId: string;

  // Информация о доставке
  channel: NotificationChannel;
  status: 'sent' | 'delivered' | 'failed' | 'bounced';

  // Детали
  sentAt: string;
  deliveredAt?: string;
  errorMessage?: string;

  // Метаданные (email ID, Telegram message ID, и т.д.)
  metadata?: Record<string, any>;
}

// Настройки Email для пользователя
export interface UserEmailSettings {
  email: string;
  verified: boolean;
  enabled: boolean;
}

// Настройки Telegram для пользователя
export interface UserTelegramSettings {
  chatId?: string;          // Telegram Chat ID
  username?: string;        // Telegram username
  verified: boolean;        // Подтверждена ли привязка
  enabled: boolean;         // Включены ли уведомления
}

// Настройки уведомлений пользователя (для профиля)
export interface UserNotificationSettings {
  email?: UserEmailSettings;
  telegram?: UserTelegramSettings;

  // Глобальные настройки
  doNotDisturb?: {
    enabled: boolean;
    startTime: string;  // "22:00"
    endTime: string;    // "08:00"
  };

  // Настройки по умолчанию для новых подписок
  defaultChannels: NotificationChannel[];
  defaultPriority: NotificationPriority[];
}

// Шаблон уведомления
export interface NotificationTemplate {
  id: string;
  type: NotificationRuleType;
  channel: NotificationChannel;

  // Шаблон
  subject?: string;         // Для email
  body: string;            // Текст с плейсхолдерами {{variable}}

  // Метаданные
  createdAt: string;
  updatedAt: string;
}
