/**
 * TypeScript типы для системы обмена сообщениями
 */

export type MessageType = 'news' | 'announcement' | 'alert' | 'maintenance';
export type MessagePriority = 'low' | 'medium' | 'high' | 'critical';
export type MessageStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
export type MessageChannel = 'telegram' | 'email';
export type RecipientType = 'all' | 'roles' | 'users' | 'trading_points' | 'networks';

export interface RecipientFilter {
  role_ids?: string[];
  user_ids?: string[];
  trading_point_ids?: string[];
  network_ids?: string[];
}

export interface BroadcastMessage {
  id: string;
  author_id: string;
  title: string;
  content: string;
  content_html?: string;
  message_type: MessageType;
  priority: MessagePriority;
  channels: MessageChannel[];
  recipient_type: RecipientType;
  recipient_filter?: RecipientFilter;
  status: MessageStatus;
  scheduled_at?: string;
  sent_at?: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  read_count: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;

  // Связанные данные (при запросе с join)
  author?: {
    id: string;
    email: string;
    full_name: string | null;
  };
  recipients?: MessageRecipient[];
}

export interface MessageRecipient {
  id: string;
  message_id: string;
  user_id: string;
  channel: MessageChannel;
  contact_info: string;
  delivery_status: DeliveryStatus;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  error_message?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;

  // Связанные данные
  user?: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

export interface MessageTemplate {
  id: string;
  author_id: string;
  name: string;
  description?: string;
  title_template: string;
  content_template: string;
  message_type: MessageType;
  category?: string;
  variables?: Record<string, string>;
  default_priority: MessagePriority;
  default_channels: MessageChannel[];
  default_recipient_type: RecipientType;
  is_active: boolean;
  usage_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  file_url: string;
  created_at: string;
}

export interface MessageStats {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  failed: number;
  read: number;
  by_channel: {
    telegram: number;
    email: number;
  };
}

export interface CreateMessageData {
  author_id: string;
  title: string;
  content: string;
  content_html?: string;
  message_type?: MessageType;
  priority?: MessagePriority;
  channels?: MessageChannel[];
  recipient_type?: RecipientType;
  recipient_filter?: RecipientFilter;
  scheduled_at?: string;
  metadata?: Record<string, any>;
}

export interface UpdateMessageData {
  title?: string;
  content?: string;
  content_html?: string;
  message_type?: MessageType;
  priority?: MessagePriority;
  channels?: MessageChannel[];
  recipient_type?: RecipientType;
  recipient_filter?: RecipientFilter;
  scheduled_at?: string;
  status?: MessageStatus;
  metadata?: Record<string, any>;
}

export interface MessageListResponse {
  success: boolean;
  data: BroadcastMessage[];
  total: number;
  limit: number;
  offset: number;
}

export interface MessageResponse {
  success: boolean;
  data: BroadcastMessage;
}

export interface MessageStatsResponse {
  success: boolean;
  data: MessageStats;
}

export interface SendMessageResponse {
  success: boolean;
  message: string;
  total_recipients: number;
}

// Константы для отображения
export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  news: 'Новости',
  announcement: 'Объявление',
  alert: 'Оповещение',
  maintenance: 'Техническое обслуживание'
};

export const MESSAGE_PRIORITY_LABELS: Record<MessagePriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический'
};

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  draft: 'Черновик',
  scheduled: 'Запланировано',
  sending: 'Отправка',
  sent: 'Отправлено',
  failed: 'Ошибка'
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'Ожидание',
  sent: 'Отправлено',
  delivered: 'Доставлено',
  failed: 'Ошибка',
  read: 'Прочитано'
};

export const RECIPIENT_TYPE_LABELS: Record<RecipientType, string> = {
  all: 'Все пользователи',
  roles: 'По ролям',
  users: 'Конкретные пользователи',
  trading_points: 'По торговым точкам',
  networks: 'По торговым сетям'
};

export const MESSAGE_CHANNEL_LABELS: Record<MessageChannel, string> = {
  telegram: 'Telegram',
  email: 'Email'
};

// Цвета для приоритетов
export const MESSAGE_PRIORITY_COLORS: Record<MessagePriority, string> = {
  low: 'text-primary',
  medium: 'text-yellow-600',
  high: 'text-orange-600',
  critical: 'text-red-600'
};

// Цвета для статусов
export const MESSAGE_STATUS_COLORS: Record<MessageStatus, string> = {
  draft: 'text-muted-foreground',
  scheduled: 'text-primary',
  sending: 'text-yellow-600',
  sent: 'text-green-600',
  failed: 'text-red-600'
};
