/**
 * Сервис для работы с правовыми документами через Supabase
 * Заменяет localStorage на работу с базой данных
 */

import { supabaseService as supabase } from './supabaseServiceClient';
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

// Интерфейсы для работы с Supabase
interface DatabaseDocumentType {
  id: string;
  code: string;
  title: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DatabaseDocumentVersion {
  id: string;
  doc_type_id: string;
  doc_type_code: string;
  version: string;
  status: string;
  title?: string;
  content_html?: string;
  content_md?: string;
  checksum?: string;
  changelog?: string;
  locale: string;
  is_current: boolean;
  editor_id?: string;
  editor_name?: string;
  published_at?: string;
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

interface DatabaseUserAcceptance {
  id: string;
  user_id: string;
  user_email?: string;
  doc_version_id?: string;
  doc_type_code: string;
  doc_version?: string;
  accepted_at: string;
  ip_address?: string;
  user_agent?: string;
  source: string;
  is_revoked: boolean;
  revoked_at?: string;
  created_at: string;
}

export class LegalDocumentsSupabaseService {
  /**
   * Получить все типы документов
   * ОПТИМИЗИРОВАНО: Один запрос вместо N+1
   */
  static async getDocumentTypes(): Promise<DocumentTypeInfo[]> {
    try {
      // Получаем типы документов
      const { data: typesData, error: typesError } = await supabase
        .from('document_types')
        .select('*')
        .eq('is_active', true)
        .order('code');

      if (typesError) {
        console.error('Error fetching document types:', typesError);
        throw typesError;
      }

      // Получаем ВСЕ текущие версии ОДНИМ запросом
      const { data: versionsData, error: versionsError } = await supabase
        .from('document_versions')
        .select('*')
        .eq('is_current', true)
        .eq('status', 'published');

      if (versionsError) {
        console.error('Error fetching current versions:', versionsError);
        // Продолжаем без версий
      }

      // Создаем Map для быстрого поиска версий по типу документа
      const versionsByType = new Map<string, DatabaseDocumentVersion>();
      (versionsData || []).forEach(v => {
        versionsByType.set(v.doc_type_code, v);
      });

      // Собираем результат
      const types: DocumentTypeInfo[] = (typesData || []).map(type => {
        const versionData = versionsByType.get(type.code);
        return {
          code: type.code as DocumentType,
          title: type.title,
          current_version: versionData ? this.mapDatabaseToDocumentVersion(versionData) : undefined
        };
      });

      return types;
    } catch (error) {
      console.error('Failed to get document types:', error);
      return [];
    }
  }

  /**
   * Получить версии документов
   */
  static async getDocumentVersions(docTypeCode?: DocumentType): Promise<DocumentVersion[]> {
    try {
      let query = supabase
        .from('document_versions')
        .select('*')
        .order('created_at', { ascending: false });

      if (docTypeCode) {
        query = query.eq('doc_type_code', docTypeCode);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching document versions:', error);
        throw error;
      }

      return (data || []).map(this.mapDatabaseToDocumentVersion);
    } catch (error) {
      console.error('Failed to get document versions:', error);
      return [];
    }
  }

  /**
   * Получить версию документа по ID
   */
  static async getDocumentVersion(versionId: string): Promise<DocumentVersion | null> {
    try {
      const { data, error } = await supabase
        .from('document_versions')
        .select('*')
        .eq('id', versionId)
        .single();

      if (error) {
        console.error('Error fetching document version:', error);
        return null;
      }

      return data ? this.mapDatabaseToDocumentVersion(data) : null;
    } catch (error) {
      console.error(`Failed to get document version ${versionId}:`, error);
      return null;
    }
  }

  /**
   * Получить текущую версию документа
   */
  static async getCurrentDocumentVersion(docTypeCode: DocumentType): Promise<DocumentVersion | null> {
    try {
      const { data, error } = await supabase
        .from('document_versions')
        .select('*')
        .eq('doc_type_code', docTypeCode)
        .eq('is_current', true)
        .eq('status', 'published')
        .single();

      if (error) {
        console.error('Error fetching current document version:', error);
        return null;
      }

      return data ? this.mapDatabaseToDocumentVersion(data) : null;
    } catch (error) {
      console.error(`Failed to get current document version for ${docTypeCode}:`, error);
      return null;
    }
  }

  /**
   * Принять документ
   */
  static async acceptDocument(
    versionId: string, 
    userId: string, 
    userEmail: string,
    source: AcceptanceSource = 'web'
  ): Promise<UserDocumentAcceptance> {
    try {
      // Получаем информацию о версии документа
      const version = await this.getDocumentVersion(versionId);
      if (!version) {
        throw new Error('Document version not found');
      }

      // Проверяем, нет ли уже согласия на эту версию
      const { data: existing } = await supabase
        .from('user_document_acceptances')
        .select('*')
        .eq('user_id', userId)
        .eq('doc_version_id', versionId)
        .eq('is_revoked', false)
        .single();

      if (existing) {
        return this.mapDatabaseToUserAcceptance(existing);
      }

      // Создаем новое согласие
      const acceptanceData = {
        user_id: userId,
        user_email: userEmail,
        doc_version_id: versionId,
        doc_type_code: version.doc_type_code,
        doc_version: version.version,
        accepted_at: new Date().toISOString(),
        ip_address: '127.0.0.1',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
        source: source,
        is_revoked: false
      };

      const { data, error } = await supabase
        .from('user_document_acceptances')
        .insert(acceptanceData)
        .select()
        .single();

      if (error) {
        console.error('Error accepting document:', error);
        throw error;
      }

      // Обновляем статус пользователя
      await this.updateUserLegalStatus(userId, version.doc_type_code as DocumentType, versionId);

      return this.mapDatabaseToUserAcceptance(data);
    } catch (error) {
      console.error('Failed to accept document:', error);
      throw error;
    }
  }

  /**
   * Получить согласия пользователя
   */
  static async getUserAcceptances(userId: string): Promise<UserDocumentAcceptance[]> {
    try {
      const { data, error } = await supabase
        .from('user_document_acceptances')
        .select('*')
        .eq('user_id', userId)
        .eq('is_revoked', false)
        .order('accepted_at', { ascending: false });

      if (error) {
        console.error('Error fetching user acceptances:', error);
        throw error;
      }

      return (data || []).map(this.mapDatabaseToUserAcceptance);
    } catch (error) {
      console.error(`Failed to get user acceptances for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Получить требования согласий пользователя
   */
  static async getUserConsentRequirement(userId: string): Promise<UserConsentRequirement> {
    try {
      // Получаем статус пользователя
      const { data: statusData } = await supabase
        .from('user_legal_statuses')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Получаем текущие версии документов
      const currentVersions = await this.getDocumentVersions();
      const currentByType = currentVersions
        .filter(v => v.is_current && v.status === 'published')
        .reduce((acc, v) => {
          acc[v.doc_type_code] = v;
          return acc;
        }, {} as Record<string, DocumentVersion>);

      const pendingDocuments = [];
      const currentAcceptances = [];

      for (const docType of ['tos', 'privacy', 'pdn'] as DocumentType[]) {
        const currentVersion = currentByType[docType];
        if (!currentVersion) continue;

        const hasAcceptance = statusData && (
          (docType === 'tos' && statusData.tos_version_id === currentVersion.id) ||
          (docType === 'privacy' && statusData.privacy_version_id === currentVersion.id) ||
          (docType === 'pdn' && statusData.pdn_version_id === currentVersion.id)
        );

        if (!hasAcceptance) {
          pendingDocuments.push({
            type: docType,
            version_id: currentVersion.id,
            version: currentVersion.version,
            title: DOCUMENT_TYPES[docType]
          });
        }

        currentAcceptances.push({
          type: docType,
          version_id: statusData ? (
            docType === 'tos' ? statusData.tos_version_id :
            docType === 'privacy' ? statusData.privacy_version_id :
            statusData.pdn_version_id
          ) : undefined,
          version: hasAcceptance ? currentVersion.version : undefined,
          accepted_at: statusData ? (
            docType === 'tos' ? statusData.tos_accepted_at :
            docType === 'privacy' ? statusData.privacy_accepted_at :
            statusData.pdn_accepted_at
          ) : undefined
        });
      }

      return {
        user_id: userId,
        requires_consent: pendingDocuments.length > 0,
        pending_documents: pendingDocuments,
        current_acceptances: currentAcceptances
      };
    } catch (error) {
      console.error(`Failed to get consent requirement for ${userId}:`, error);
      return {
        user_id: userId,
        requires_consent: true,
        pending_documents: [],
        current_acceptances: []
      };
    }
  }

  /**
   * Обновить статус согласий пользователя
   */
  static async updateUserLegalStatus(
    userId: string, 
    docType: DocumentType, 
    versionId: string
  ): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      const updateData: any = {
        [`${docType}_version_id`]: versionId,
        [`${docType}_accepted_at`]: now,
        updated_at: now
      };

      const { error } = await supabase
        .from('user_legal_statuses')
        .upsert({
          user_id: userId,
          ...updateData
        });

      if (error) {
        console.error('Error updating user legal status:', error);
        throw error;
      }

      // Проверяем, нужны ли еще согласия
      const requirement = await this.getUserConsentRequirement(userId);
      
      await supabase
        .from('user_legal_statuses')
        .update({ 
          requires_consent: requirement.requires_consent,
          updated_at: now 
        })
        .eq('user_id', userId);

    } catch (error) {
      console.error('Failed to update user legal status:', error);
      throw error;
    }
  }

  /**
   * Получить журнал согласий
   */
  static async getAcceptanceJournal(
    filters: AcceptanceJournalFilters = {}
  ): Promise<UserDocumentAcceptance[]> {
    try {
      let query = supabase
        .from('user_document_acceptances')
        .select('*')
        .eq('is_revoked', false)
        .order('accepted_at', { ascending: false });

      if (filters.doc_type) {
        query = query.eq('doc_type_code', filters.doc_type);
      }

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters.user_email) {
        query = query.ilike('user_email', `%${filters.user_email}%`);
      }

      if (filters.date_from) {
        query = query.gte('accepted_at', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('accepted_at', filters.date_to);
      }

      if (filters.source) {
        query = query.eq('source', filters.source);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching acceptance journal:', error);
        throw error;
      }

      return (data || []).map(this.mapDatabaseToUserAcceptance);
    } catch (error) {
      console.error('Failed to get acceptance journal:', error);
      return [];
    }
  }

  /**
   * Получить статистику документов
   * ОПТИМИЗИРОВАНО: Минимум запросов вместо N*2
   */
  static async getDocumentStatistics(): Promise<DocumentStatistics[]> {
    try {
      // Получаем текущие версии ОДНИМ запросом
      const { data: currentVersions, error: versionsError } = await supabase
        .from('document_versions')
        .select('*')
        .eq('is_current', true)
        .eq('status', 'published');

      if (versionsError) {
        console.error('Error fetching current versions:', versionsError);
        throw versionsError;
      }

      if (!currentVersions || currentVersions.length === 0) {
        return [];
      }

      // Получаем общее количество пользователей ОДНИМ запросом
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      const total = totalUsers || 0;

      // Получаем ВСЕ согласия для текущих версий ОДНИМ запросом
      const versionIds = currentVersions.map(v => v.id);
      const { data: allAcceptances, error: acceptancesError } = await supabase
        .from('user_document_acceptances')
        .select('doc_version_id, user_id')
        .in('doc_version_id', versionIds)
        .eq('is_revoked', false);

      if (acceptancesError) {
        console.error('Error fetching acceptances:', acceptancesError);
        // Продолжаем со статистикой без согласий
      }

      // Группируем согласия по версиям
      const acceptancesByVersion = new Map<string, Set<string>>();
      (allAcceptances || []).forEach(acc => {
        if (!acceptancesByVersion.has(acc.doc_version_id)) {
          acceptancesByVersion.set(acc.doc_version_id, new Set());
        }
        acceptancesByVersion.get(acc.doc_version_id)!.add(acc.user_id);
      });

      // Собираем статистику
      const statistics: DocumentStatistics[] = currentVersions.map(version => {
        const acceptedUsers = acceptancesByVersion.get(version.id)?.size || 0;

        return {
          doc_type_code: version.doc_type_code as DocumentType,
          current_version: version.version,
          published_at: version.published_at!,
          total_users: total,
          accepted_users: acceptedUsers,
          pending_users: total - acceptedUsers,
          acceptance_percentage: total > 0 ? Math.round((acceptedUsers / total) * 100) : 0
        };
      });

      return statistics;
    } catch (error) {
      console.error('Failed to get document statistics:', error);
      return [];
    }
  }

  /**
   * Создать черновик новой версии документа
   */
  static async createDocumentDraft(
    docTypeCode: DocumentType,
    version: string,
    contentMd: string,
    changelog: string,
    editorId: string,
    editorName: string
  ): Promise<DocumentVersion> {
    try {
      // Получаем ID типа документа
      const { data: docTypeData, error: docTypeError } = await supabase
        .from('document_types')
        .select('id')
        .eq('code', docTypeCode)
        .single();

      if (docTypeError || !docTypeData) {
        throw new Error(`Document type ${docTypeCode} not found`);
      }

      // Создаём черновик версии
      const draftData = {
        doc_type_id: docTypeData.id,
        doc_type_code: docTypeCode,
        version: version,
        status: 'draft',
        content_md: contentMd,
        changelog: changelog,
        locale: 'ru',
        is_current: false,
        editor_id: editorId,
        editor_name: editorName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('document_versions')
        .insert(draftData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating document draft:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          draftData
        });
        throw new Error(`Failed to create draft: ${error.message}${error.hint ? ` (${error.hint})` : ''}`);
      }

      if (!data) {
        throw new Error('No data returned from insert');
      }

      return this.mapDatabaseToDocumentVersion(data);
    } catch (error) {
      console.error('Failed to create document draft:', error);
      throw error;
    }
  }

  /**
   * Обновить черновик версии документа
   */
  static async updateDocumentVersion(
    versionId: string,
    version: string,
    contentMd: string,
    changelog: string
  ): Promise<DocumentVersion> {
    try {
      const { data, error } = await supabase
        .from('document_versions')
        .update({
          version: version,
          content_md: contentMd,
          changelog: changelog,
          updated_at: new Date().toISOString()
        })
        .eq('id', versionId)
        .eq('status', 'draft') // Обновлять можно только черновики
        .select()
        .single();

      if (error) {
        console.error('Error updating document version:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Document version not found or not a draft');
      }

      return this.mapDatabaseToDocumentVersion(data);
    } catch (error) {
      console.error('Failed to update document version:', error);
      throw error;
    }
  }

  /**
   * Опубликовать версию документа
   */
  static async publishDocumentVersion(versionId: string): Promise<DocumentVersion> {
    try {
      // Получаем информацию о версии
      const version = await this.getDocumentVersion(versionId);
      if (!version) {
        throw new Error('Document version not found');
      }

      if (version.status !== 'draft') {
        throw new Error('Only draft versions can be published');
      }

      // Снимаем флаг is_current со всех версий этого типа документа
      await supabase
        .from('document_versions')
        .update({ is_current: false })
        .eq('doc_type_code', version.doc_type_code);

      // Публикуем версию
      const { data, error } = await supabase
        .from('document_versions')
        .update({
          status: 'published',
          is_current: true,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', versionId)
        .select()
        .single();

      if (error) {
        console.error('Error publishing document version:', error);
        throw error;
      }

      return this.mapDatabaseToDocumentVersion(data);
    } catch (error) {
      console.error('Failed to publish document version:', error);
      throw error;
    }
  }

  /**
   * Маппинг данных из базы в типы приложения
   */
  private static mapDatabaseToDocumentVersion(data: DatabaseDocumentVersion): DocumentVersion {
    return {
      id: data.id,
      doc_type_id: data.doc_type_id,
      doc_type_code: data.doc_type_code as DocumentType,
      version: data.version,
      status: data.status as DocumentStatus,
      title: data.title,
      content_html: data.content_html,
      content_md: data.content_md,
      checksum: data.checksum,
      changelog: data.changelog,
      locale: data.locale,
      is_current: data.is_current,
      editor_id: data.editor_id,
      editor_name: data.editor_name,
      published_at: data.published_at,
      archived_at: data.archived_at,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }

  private static mapDatabaseToUserAcceptance(data: DatabaseUserAcceptance): UserDocumentAcceptance {
    return {
      id: data.id,
      user_id: data.user_id,
      user_name: 'Пользователь', // TODO: получать из таблицы users
      user_email: data.user_email || '',
      doc_version_id: data.doc_version_id || '',
      doc_type_code: data.doc_type_code as DocumentType,
      doc_version: data.doc_version || '',
      accepted_at: data.accepted_at,
      ip_address: data.ip_address,
      user_agent: data.user_agent,
      source: data.source as AcceptanceSource,
      immutable: true,
      created_at: data.created_at
    };
  }
}

export default LegalDocumentsSupabaseService;