/**
 * Обновленный сервис для работы с правовыми документами через Supabase
 * Заменяет localStorage на работу с базой данных
 */

import { LegalDocumentsSupabaseService } from './legalDocumentsSupabaseService';
import { apiConfigService } from './apiConfigService';
import { authService } from './auth/authService';
import type {
  DocumentType,
  DocumentVersion,
  DocumentVersionInput,
  DocumentVersionUpdate,
  UserDocumentAcceptance,
  UserLegalStatus,
  AuditLogEntry,
  DocumentStatistics,
  DocumentTypeInfo,
  AcceptanceJournalFilters,
  AuditLogFilters,
  UserConsentRequirement,
  DocumentStatus,
  DOCUMENT_TYPES,
  AcceptanceSource
} from '@/types/legal';

// Утилитарная функция для задержки (для совместимости с старым API)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Простой кэш для текущих версий документов (TTL 5 минут)
const documentVersionsCache = new Map<DocumentType, {version: DocumentVersion, timestamp: number}>();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

const getCachedDocumentVersion = (docType: DocumentType): DocumentVersion | null => {
  const cached = documentVersionsCache.get(docType);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.version;
  }
  return null;
};

const setCachedDocumentVersion = (docType: DocumentType, version: DocumentVersion) => {
  documentVersionsCache.set(docType, {
    version,
    timestamp: Date.now()
  });
};

// Получение текущего пользователя (синхронная версия)
const getCurrentUser = () => {
  try {
    // Сначала проверяем старый формат (AuthContext)
    const savedUser = localStorage.getItem('tradeframe_user');
    if (savedUser && !savedUser.includes('[object Object]')) {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser && parsedUser.id && parsedUser.email) {
        return {
          id: parsedUser.id,
          name: parsedUser.name || parsedUser.firstName || 'User',
          email: parsedUser.email,
          role: parsedUser.role || 'user'
        };
      }
    }

    // Проверяем новый формат (NewAuthContext) - email в sessionStorage
    const sessionEmail = sessionStorage.getItem('current_user_email');
    if (sessionEmail) {
      // Для NewAuthContext возвращаем только email - методы будут использовать async версию
      return {
        email: sessionEmail,
        id: null as any, // Будет заполнено в async версии
        name: sessionEmail.split('@')[0],
        role: 'user'
      };
    }
  } catch (error) {
    console.error('Error parsing current user:', error);
  }

  // НЕТ FALLBACK! Это реальная система - требуем авторизацию
  throw new Error('Пользователь не авторизован. Необходимо войти в систему.');
};

// Асинхронная версия получения пользователя с полными данными из БД
const getCurrentUserAsync = async () => {
  try {
    // Сначала пробуем синхронный вариант
    const syncUser = getCurrentUser();

    // Если у нас уже есть ID - возвращаем как есть
    if (syncUser.id) {
      return syncUser;
    }

    // Если есть только email - запрашиваем полные данные из БД
    if (syncUser.email) {
      const dbUser = await authService.getUserByEmail(syncUser.email);
      if (dbUser) {
        return {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role || 'user'
        };
      }
    }
  } catch (error) {
    console.error('Error getting current user from DB:', error);
  }

  throw new Error('Пользователь не авторизован. Необходимо войти в систему.');
};

// Основной сервис
export const legalDocumentsService = {
  // === РАБОТА С ТИПАМИ ДОКУМЕНТОВ ===
  
  async getDocumentTypes(): Promise<DocumentTypeInfo[]> {
    try {
      return await LegalDocumentsSupabaseService.getDocumentTypes();
    } catch (error) {
      console.error('❌ Supabase error, using fallback:', error);

      // Простой fallback с базовыми типами
      return [
        {
          code: 'tos' as DocumentType,
          title: 'Пользовательское соглашение',
          current_version: undefined
        },
        {
          code: 'privacy' as DocumentType,
          title: 'Политика конфиденциальности',
          current_version: undefined
        },
        {
          code: 'pdn' as DocumentType,
          title: 'Политика в области защиты персональных данных',
          current_version: undefined
        }
      ];
    }
  },

  async getDocumentTypeInfo(docTypeCode: DocumentType): Promise<DocumentTypeInfo | null> {
    try {
      const types = await this.getDocumentTypes();
      return types.find(t => t.code === docTypeCode) || null;
    } catch (error) {
      console.error('❌ Error getting document type info:', error);
      return null;
    }
  },

  // === РАБОТА С ВЕРСИЯМИ ДОКУМЕНТОВ ===

  async getDocumentVersions(docTypeCode?: DocumentType): Promise<DocumentVersion[]> {
    try {
      return await LegalDocumentsSupabaseService.getDocumentVersions(docTypeCode);
    } catch (error) {
      console.error('❌ Supabase error, returning empty array:', error);
      return [];
    }
  },

  async getDocumentVersion(versionId: string): Promise<DocumentVersion | null> {
    try {
      return await LegalDocumentsSupabaseService.getDocumentVersion(versionId);
    } catch (error) {
      console.error('❌ Supabase error getting document version:', error);
      return null;
    }
  },

  async getCurrentDocumentVersion(docTypeCode: DocumentType): Promise<DocumentVersion | null> {
    try {
      // Проверяем кэш
      const cached = getCachedDocumentVersion(docTypeCode);
      if (cached) {
        return cached;
      }

      // Загружаем из БД если нет в кэше
      const version = await LegalDocumentsSupabaseService.getCurrentDocumentVersion(docTypeCode);

      // Кэшируем результат
      if (version) {
        setCachedDocumentVersion(docTypeCode, version);
      }

      return version;
    } catch (error) {
      console.error('❌ Supabase error getting current document version:', error);
      return null;
    }
  },


  // === РАБОТА С СОГЛАСИЯМИ ПОЛЬЗОВАТЕЛЕЙ ===

  async acceptDocument(versionId: string, userId?: string, source: AcceptanceSource = 'web'): Promise<UserDocumentAcceptance> {
    try {
      // Используем async версию для получения реального UUID из БД
      const currentUser = await getCurrentUserAsync();
      const actualUserId = userId || currentUser.id;
      const actualUserEmail = currentUser.email;

      return await LegalDocumentsSupabaseService.acceptDocument(
        versionId,
        actualUserId,
        actualUserEmail,
        source
      );
    } catch (error) {
      console.error('❌ Error accepting document:', error);
      throw error;
    }
  },

  async acceptDocumentByType(docType: DocumentType, userId?: string, source: AcceptanceSource = 'web'): Promise<UserDocumentAcceptance> {
    try {
      // Получаем текущую версию документа
      const currentVersion = await this.getCurrentDocumentVersion(docType);
      if (!currentVersion) {
        throw new Error(`Не найдена текущая версия документа типа ${docType}`);
      }
      
      return await this.acceptDocument(currentVersion.id, userId, source);
    } catch (error) {
      console.error('❌ Error accepting document by type:', error);
      throw error;
    }
  },

  async getUserAcceptances(userId: string): Promise<UserDocumentAcceptance[]> {
    try {
      return await LegalDocumentsSupabaseService.getUserAcceptances(userId);
    } catch (error) {
      console.error('❌ Supabase error getting user acceptances:', error);
      return [];
    }
  },

  async getUserConsentRequirement(userId: string): Promise<UserConsentRequirement> {
    try {
      return await LegalDocumentsSupabaseService.getUserConsentRequirement(userId);
    } catch (error) {
      console.error('❌ Supabase error getting consent requirement:', error);
      
      // Fallback - считаем что согласия требуются
      return {
        user_id: userId,
        requires_consent: true,
        pending_documents: [],
        current_acceptances: []
      };
    }
  },

  async updateUserLegalStatus(userId: string, docType: DocumentType, versionId: string): Promise<void> {
    try {
      await LegalDocumentsSupabaseService.updateUserLegalStatus(userId, docType, versionId);
    } catch (error) {
      console.error('❌ Error updating user legal status:', error);
      throw error;
    }
  },

  // === ЖУРНАЛЫ И СТАТИСТИКА ===

  async getAcceptanceJournal(filters: AcceptanceJournalFilters = {}): Promise<UserDocumentAcceptance[]> {
    try {
      return await LegalDocumentsSupabaseService.getAcceptanceJournal(filters);
    } catch (error) {
      console.error('❌ Supabase error getting acceptance journal:', error);
      return [];
    }
  },

  async getDocumentStatistics(): Promise<DocumentStatistics[]> {
    try {
      return await LegalDocumentsSupabaseService.getDocumentStatistics();
    } catch (error) {
      console.error('❌ Supabase error getting document statistics:', error);
      return [];
    }
  },

  // === МЕТОДЫ РЕДАКТИРОВАНИЯ ===

  async createDocumentDraft(input: DocumentVersionInput): Promise<DocumentVersion> {
    try {
      const currentUser = await getCurrentUserAsync();

      return await LegalDocumentsSupabaseService.createDocumentDraft(
        input.doc_type_code,
        input.version,
        input.content_md || '',
        input.changelog || '',
        currentUser.id,
        currentUser.name
      );
    } catch (error) {
      console.error('❌ Error creating document draft:', error);
      throw error;
    }
  },

  async updateDocumentVersion(versionId: string, update: DocumentVersionUpdate): Promise<DocumentVersion> {
    try {
      return await LegalDocumentsSupabaseService.updateDocumentVersion(
        versionId,
        update.version || '',
        update.content_md || '',
        update.changelog || ''
      );
    } catch (error) {
      console.error('❌ Error updating document version:', error);
      throw error;
    }
  },

  async publishDocumentVersion(versionId: string): Promise<DocumentVersion> {
    try {
      return await LegalDocumentsSupabaseService.publishDocumentVersion(versionId);
    } catch (error) {
      console.error('❌ Error publishing document version:', error);
      throw error;
    }
  },

  async archiveDocumentVersion(versionId: string): Promise<DocumentVersion> {
    console.warn('⚠️ archiveDocumentVersion not implemented in Supabase service yet');
    throw new Error('Архивирование версий документов пока не реализовано');
  },

  async getAuditLog(filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> {
    console.warn('⚠️ getAuditLog not implemented in Supabase service yet');
    return [];
  }
};

export default legalDocumentsService;
export { getCurrentUser };