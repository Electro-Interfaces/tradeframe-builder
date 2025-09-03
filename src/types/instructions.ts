/**
 * Типы для системы инструкций
 */

// Статусы версий инструкций
export type InstructionStatus = 'draft' | 'published' | 'archived';

// Локали для поддержки многоязычности
export type InstructionLocale = 'ru' | 'en';

// Тема инструкции (привязка к странице)
export interface InstructionTopic {
  id: string;
  key: string; // Ключ для привязки (route.name или meta.helpKey)
  route: string; // Путь страницы
  title: string; // Заголовок темы
  description?: string; // Краткое описание
  is_active: boolean; // Активна ли тема
  created_at: string;
  updated_at: string;
  // Статистика
  views_total: number;
  current_version?: InstructionVersion;
}

// Версия инструкции
export interface InstructionVersion {
  id: string;
  topic_id: string;
  version: number;
  status: InstructionStatus;
  locale: InstructionLocale;
  title: string; // Заголовок версии
  content_md: string; // Контент в Markdown
  content_html: string; // Контент в HTML (сгенерированный)
  changelog: string; // Описание изменений
  editor_id: string; // ID редактора
  editor_name: string; // Имя редактора
  published_at?: string; // Дата публикации
  created_at: string;
  updated_at: string;
  // Статистика
  views_count: number;
}

// Просмотр инструкции
export interface InstructionView {
  id: string;
  topic_id: string;
  version_id: string;
  user_id: string;
  user_name: string;
  opened_at: string;
  session_id?: string;
  ip_address?: string;
}

// DTO для создания темы
export interface CreateInstructionTopicRequest {
  key: string;
  route: string;
  title: string;
  description?: string;
  is_active?: boolean;
}

// DTO для создания версии
export interface CreateInstructionVersionRequest {
  topic_id: string;
  title: string;
  content_md: string;
  changelog: string;
  locale?: InstructionLocale;
}

// DTO для обновления версии
export interface UpdateInstructionVersionRequest {
  title?: string;
  content_md?: string;
  changelog?: string;
  status?: InstructionStatus;
}

// DTO для получения инструкций пользователем
export interface InstructionForUser {
  topic: InstructionTopic;
  version: InstructionVersion;
  has_newer_version: boolean;
}

// Статистика по инструкциям
export interface InstructionStats {
  total_topics: number;
  total_versions: number;
  total_views: number;
  active_topics: number;
  published_versions: number;
  most_viewed_topics: Array<{
    topic: InstructionTopic;
    views: number;
  }>;
  recent_views: InstructionView[];
}

// Данные для аналитики
export interface InstructionAnalytics {
  views_by_topic: Array<{
    topic_id: string;
    topic_title: string;
    route: string;
    views_count: number;
    unique_users: number;
  }>;
  views_by_date: Array<{
    date: string;
    views_count: number;
    unique_users: number;
  }>;
  top_users: Array<{
    user_id: string;
    user_name: string;
    views_count: number;
    last_viewed: string;
  }>;
}

// Права доступа к инструкциям
export interface InstructionPermissions {
  can_read: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_publish: boolean;
  can_archive: boolean;
  can_view_analytics: boolean;
}

// Фильтры для поиска
export interface InstructionFilters {
  status?: InstructionStatus[];
  locale?: InstructionLocale[];
  route?: string;
  search?: string;
  editor_id?: string;
  date_from?: string;
  date_to?: string;
}

// Результат поиска
export interface InstructionSearchResult {
  topics: InstructionTopic[];
  versions: InstructionVersion[];
  total: number;
  page: number;
  per_page: number;
}