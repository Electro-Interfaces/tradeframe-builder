/**
 * Типы для системы правовых документов
 */

// Типы документов
export type DocumentType = 'tos' | 'privacy' | 'pdn';

// Статусы версий документов
export type DocumentStatus = 'draft' | 'published' | 'archived';

// Источники принятия согласий
export type AcceptanceSource = 'web' | 'app' | 'api';

// Локали (для будущей мультиязычности)
export type DocumentLocale = 'ru' | 'en';

// Роли пользователей
export type UserRole = 'superadmin' | 'admin' | 'user';

// Основная сущность - тип документа
export interface DocumentTypeRecord {
  id: string;
  code: DocumentType;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Версия документа
export interface DocumentVersion {
  id: string;
  doc_type_id: string;
  doc_type_code: DocumentType;
  version: string; // semver или дата YYYY.MM.DD
  status: DocumentStatus;
  published_at?: string;
  archived_at?: string;
  checksum: string; // MD5/SHA256 контрольная сумма
  editor_id: string;
  editor_name: string;
  changelog: string;
  content_html: string;
  content_md: string;
  locale: DocumentLocale;
  is_current: boolean; // Текущая активная версия для типа
  created_at: string;
  updated_at: string;
}

// Согласие пользователя с документом
export interface UserDocumentAcceptance {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  doc_version_id: string;
  doc_type_code: DocumentType;
  doc_version: string;
  accepted_at: string;
  ip_address: string;
  user_agent: string;
  source: AcceptanceSource;
  immutable: boolean; // Неизменяемая запись
  created_at: string;
}

// Расширение пользователя для отметок о согласии
export interface UserLegalStatus {
  user_id: string;
  // Отметки о принятых версиях (read-only, кроме суперадмина)
  tos_version_id?: string;
  privacy_version_id?: string;
  pdn_version_id?: string;
  // Даты принятия (read-only, кроме суперадмина)
  tos_accepted_at?: string;
  privacy_accepted_at?: string;
  pdn_accepted_at?: string;
  updated_at: string;
}

// Запись аудита действий
export interface AuditLogEntry {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_role: UserRole;
  action: string; // 'create_draft', 'publish', 'archive', 'edit_user_status', etc.
  resource_type: 'document_version' | 'user_legal_status';
  resource_id: string;
  before_state?: Record<string, any>;
  after_state?: Record<string, any>;
  comment?: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

// DTO для создания/редактирования версии документа
export interface DocumentVersionInput {
  doc_type_code: DocumentType;
  version: string;
  changelog: string;
  content_md: string;
  locale?: DocumentLocale;
}

// DTO для обновления версии документа
export interface DocumentVersionUpdate {
  version?: string;
  changelog?: string;
  content_md?: string;
  locale?: DocumentLocale;
}

// Ответ API с информацией о необходимых согласиях
export interface UserConsentRequirement {
  user_id: string;
  requires_consent: boolean;
  pending_documents: {
    type: DocumentType;
    version_id: string;
    version: string;
    title: string;
  }[];
  current_acceptances: {
    type: DocumentType;
    version_id?: string;
    version?: string;
    accepted_at?: string;
  }[];
}

// Статистика по документам
export interface DocumentStatistics {
  doc_type_code: DocumentType;
  current_version: string;
  published_at: string;
  total_users: number;
  accepted_users: number;
  pending_users: number;
  acceptance_percentage: number;
  avg_acceptance_time_hours?: number;
}

// Фильтры для журналов
export interface AcceptanceJournalFilters {
  doc_type?: DocumentType;
  version_id?: string;
  user_id?: string;
  user_email?: string;
  date_from?: string;
  date_to?: string;
  source?: AcceptanceSource;
  limit?: number;
  offset?: number;
}

export interface AuditLogFilters {
  actor_id?: string;
  action?: string;
  resource_type?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

// Константы
export const DOCUMENT_TYPES: Record<DocumentType, string> = {
  tos: 'Пользовательское соглашение',
  privacy: 'Политика конфиденциальности',
  pdn: 'Политика в области защиты персональных данных'
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: 'Черновик',
  published: 'Опубликован',
  archived: 'Архивирован'
};

export const ACCEPTANCE_SOURCE_LABELS: Record<AcceptanceSource, string> = {
  web: 'Веб-интерфейс',
  app: 'Мобильное приложение',
  api: 'API интеграция'
};

// Утилитарные типы
export type DocumentTypeInfo = {
  code: DocumentType;
  title: string;
  current_version?: DocumentVersion;
  statistics?: DocumentStatistics;
};

// Ошибки API
export interface LegalDocumentError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// HTTP статусы для согласий
export const CONSENT_HTTP_CODES = {
  UPGRADE_REQUIRED: 426,
  NEEDS_CONSENT: 409
} as const;