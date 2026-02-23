/**
 * Типы для интеграции с TSupport (заявки + чат)
 */

// === Тикеты ===

export type TicketStatus = 'new' | 'in_progress' | 'waiting_customer' | 'escalated' | 'resolved' | 'closed' | 'cancelled' | 'reopened';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketType = 'incident' | 'request' | 'question' | 'problem';
export type MessageType = 'comment' | 'status_change' | 'assignment' | 'internal_note' | 'ai_suggestion';

// Общие константы файлов
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 МБ
export const MAX_FILES_TICKET = 5;
export const MAX_FILES_CHAT = 10;

export interface SupportTicket {
  id: string;
  number?: number;
  display_number?: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  category?: string;
  category_id?: string;
  category_name?: string;
  category_code?: string;
  parent_category_name?: string;
  parent_category_code?: string;
  company_id: string;
  company_name?: string;
  location_id?: string;
  location_name?: string;
  equipment_id?: string;
  customer_user_id: string;
  customer_name?: string;
  customer_email?: string;
  current_assignee_id?: string;
  assignee_name?: string;
  vendor_id?: string;
  vendor_name?: string;
  source_id?: string;
  source_name?: string;
  source_code?: string;
  app_context?: AppContext;
  external_id?: string;
  media_urls?: string[];
  tags?: string[];
  resolution_notes?: string;
  sla_deadline?: string;
  sla_response_deadline?: string;
  sla_response_at?: string;
  sla_breached?: boolean;
  resolved_at?: string;
  closed_at?: string;
  cancelled_at?: string;
  cancel_reason?: string;
  reopen_count?: number;
  customer_rating?: number;
  customer_feedback?: string;
  unread_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  content: string;
  message_type: MessageType;
  internal: boolean;
  ai_generated?: boolean;
  media_urls?: string[];
  attachments?: { url: string; name: string; size?: number; type?: string }[];
  voice_url?: string;
  voice_text?: string;
  created_at: string;
}

export interface TicketActivity {
  id: string;
  ticket_id: string;
  event_type: 'history' | 'message';
  user_id: string;
  user_name: string;
  user_role?: string;
  // history fields
  field?: string;
  old_value?: string;
  new_value?: string;
  // message fields
  content?: string;
  message_type?: string;
  internal?: boolean;
  ai_generated?: boolean;
  media_urls?: string[];
  media_attachments?: { url: string; name: string; size?: number; type?: string }[];
  is_edited?: boolean;
  edited_at?: string;
  created_at: string;
}

// === Категории ===

export interface TicketCategory {
  id?: string;
  code: string;
  name: string;
  icon?: string;
  default_priority?: TicketPriority;
  children?: TicketCategory[];
}

// === Контекст приложения ===

export interface AppContext {
  source: 'tradeframe';
  version?: string;

  // Навигация
  route: string;
  routeName?: string;
  section?: string;
  urlParams?: Record<string, string>;

  // Сеть и ТТ
  networkId?: string;
  networkName?: string;
  tradingPointId?: string;
  tradingPointName?: string;

  // Пользователь
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;

  // Контекст страницы (данные компонентов)
  pageData?: Record<string, unknown>;

  // Мета
  browser?: string;
  screenSize?: string;
  timestamp: string;
}

// === Создание заявки ===

export interface CreateTicketInput {
  title: string;
  description: string;
  company_id?: string;
  location_id?: string;
  equipment_id?: string;
  priority?: TicketPriority;
  type?: TicketType;
  category?: string;
  category_id?: string;
  app_context?: AppContext;
  source_code?: string;
  media_urls?: string[];
}

// === Чат ===

export interface ChatRoom {
  id: string;
  type: 'direct' | 'company' | 'ticket' | 'group';
  name?: string;
  ticket_id?: string;
  company_id?: string;
  unread_count: number;
  last_message?: string;
  last_message_at?: string;
  last_message_by?: string;
  last_read_at?: string;
  created_at: string;
  updated_at: string;
  participants?: ChatParticipant[];
}

export interface ChatParticipant {
  id: string;
  user_id: string;
  name: string;
  email: string;
  user_role: string;
  role: 'member' | 'admin' | 'observer';
  avatar_url?: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  type: 'text' | 'image' | 'video' | 'voice' | 'file' | 'system';
  content: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  reply_to?: string;
  reply_to_content?: string | null;
  reply_to_user_name?: string | null;
  reply_to_deleted?: boolean;
  is_edited: boolean;
  edited_at?: string;
  is_deleted?: boolean;
  created_at: string;
}

// === Непрочитанные ===

export interface UnreadCounts {
  tickets: number;
  chat: number;
  total: number;
}

// === Утилиты ===

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  waiting_customer: 'Ожидает ответа',
  escalated: 'Эскалация',
  resolved: 'Решена',
  closed: 'Закрыта',
  cancelled: 'Отменена',
  reopened: 'Переоткрыта',
};

export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  new: 'bg-slate-700/50 text-slate-300 border-slate-600',
  in_progress: 'bg-slate-700/50 text-slate-300 border-slate-600',
  waiting_customer: 'bg-slate-700/50 text-slate-300 border-slate-600',
  escalated: 'bg-slate-700/50 text-slate-300 border-slate-600',
  resolved: 'bg-slate-700/50 text-slate-300 border-slate-600',
  closed: 'bg-slate-700/50 text-slate-300 border-slate-600',
  cancelled: 'bg-slate-700/50 text-slate-300 border-slate-600',
  reopened: 'bg-slate-700/50 text-slate-300 border-slate-600',
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический',
};

export const TICKET_PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: 'text-slate-400',
  medium: 'text-blue-400',
  high: 'text-amber-400',
  critical: 'text-red-400',
};

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  incident: 'Инцидент',
  request: 'Запрос',
  question: 'Вопрос',
  problem: 'Проблема',
};
