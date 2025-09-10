/**
 * Обновленный сервис для работы с правовыми документами через Supabase
 * Заменяет localStorage на работу с базой данных
 */

import { LegalDocumentsSupabaseService } from './legalDocumentsSupabaseService';
import { apiConfigService } from './apiConfigService';
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

// Получение текущего пользователя
const getCurrentUser = () => {
  try {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser && !savedUser.includes('[object Object]')) {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser && parsedUser.id && parsedUser.email) {
        return {
          id: parsedUser.id,
          name: parsedUser.name || 'User',
          email: parsedUser.email,
          role: 'superadmin' as const
        };
      }
    }
  } catch (error) {
    console.error('Error parsing current user:', error);
  }
  
  // Fallback to mock user
  return {
    id: 'user_admin',
    name: 'Администратор системы',
    email: 'admin@demo-azs.ru',
    role: 'superadmin' as const
  };
};

// Основной сервис
export const legalDocumentsService = {
  // === РАБОТА С ТИПАМИ ДОКУМЕНТОВ ===
  
  async getDocumentTypes(): Promise<DocumentTypeInfo[]> {
    try {
      console.log('🔍 Загружаем типы документов из Supabase...');
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

  // === РАБОТА С ВЕРСИЯМИ ДОКУМЕНТОВ ===

  async getDocumentVersions(docTypeCode?: DocumentType): Promise<DocumentVersion[]> {
    try {
      console.log('🔍 Загружаем версии документов из Supabase...');
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
      return await LegalDocumentsSupabaseService.getCurrentDocumentVersion(docTypeCode);
    } catch (error) {
      console.error('❌ Supabase error getting current document version:', error);
      return null;
    }
  },

  getLatestVersion(docTypeCode: DocumentType): DocumentVersion | null {
    // Синхронный метод для совместимости - возвращает null
    // В новой версии нужно использовать getCurrentDocumentVersion
    console.warn('⚠️ getLatestVersion is deprecated, use getCurrentDocumentVersion instead');
    return null;
  },

  // === РАБОТА С СОГЛАСИЯМИ ПОЛЬЗОВАТЕЛЕЙ ===

  async acceptDocument(versionId: string, userId?: string, source: AcceptanceSource = 'web'): Promise<UserDocumentAcceptance> {
    try {
      const actualUserId = userId || getCurrentUser().id;
      const actualUserEmail = getCurrentUser().email;
      
      console.log('📝 Принимаем согласие на документ:', { versionId, actualUserId, source });
      
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

  // === МЕТОДЫ РЕДАКТИРОВАНИЯ (пока заглушки) ===

  async createDocumentDraft(input: DocumentVersionInput): Promise<DocumentVersion> {
    console.warn('⚠️ createDocumentDraft not implemented in Supabase service yet');
    throw new Error('Создание черновиков документов пока не реализовано');
  },

  async updateDocumentVersion(versionId: string, update: DocumentVersionUpdate): Promise<DocumentVersion> {
    console.warn('⚠️ updateDocumentVersion not implemented in Supabase service yet');
    throw new Error('Редактирование версий документов пока не реализовано');
  },

  async publishDocumentVersion(versionId: string): Promise<DocumentVersion> {
    console.warn('⚠️ publishDocumentVersion not implemented in Supabase service yet');
    throw new Error('Публикация версий документов пока не реализована');
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