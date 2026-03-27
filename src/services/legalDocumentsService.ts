/**
 * Сервис правовых документов.
 * Все запросы через backend API `/api/legal`.
 */

import { authService } from './auth/authService';
import { legalDocumentsApiClient } from './legalDocumentsApiClient';
import { getSessionEmail, getUser } from '@/utils/authStorage';
import type {
  AcceptanceJournalFilters,
  AcceptanceSource,
  AuditLogEntry,
  AuditLogFilters,
  DocumentStatistics,
  DocumentType,
  DocumentTypeInfo,
  DocumentVersion,
  DocumentVersionInput,
  DocumentVersionUpdate,
  UserConsentRequirement,
  UserDocumentAcceptance,
} from '@/types/legal';

const LEGAL_DOCUMENT_TYPES: DocumentType[] = ['tos', 'privacy', 'pdn'];

const documentVersionsCache = new Map<DocumentType, {version: DocumentVersion, timestamp: number}>();
const CACHE_TTL = 5 * 60 * 1000;

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

const isDocumentTypeValue = (value: string): value is DocumentType =>
  LEGAL_DOCUMENT_TYPES.includes(value as DocumentType);

const getCurrentUser = () => {
  try {
    const savedUser = getUser<{ id?: string; name?: string; firstName?: string; email?: string; role?: string }>();
    if (savedUser?.email) {
      return {
        id: savedUser.id || null,
        name: savedUser.name || savedUser.firstName || 'User',
        email: savedUser.email,
        role: savedUser.role || 'user'
      };
    }

    const sessionEmail = getSessionEmail();
    if (sessionEmail) {
      return {
        email: sessionEmail,
        id: null as any,
        name: sessionEmail.split('@')[0],
        role: 'user'
      };
    }
  } catch (error) {
    console.error('Error parsing current user:', error);
  }

  throw new Error('Пользователь не авторизован. Необходимо войти в систему.');
};

const getCurrentUserAsync = async () => {
  try {
    const syncUser = getCurrentUser();
    if (syncUser.id) {
      return syncUser;
    }

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

const resolveCurrentUserId = async (userId?: string) => {
  if (userId && userId !== 'current_user') {
    return userId;
  }

  const currentUser = await getCurrentUserAsync();
  return currentUser.id;
};

export const legalDocumentsService = {
  async getDocumentTypes(): Promise<DocumentTypeInfo[]> {
    return legalDocumentsApiClient.getDocumentTypes();
  },

  async getDocumentTypeInfo(docTypeCode: DocumentType): Promise<DocumentTypeInfo | null> {
    try {
      return await legalDocumentsApiClient.getDocumentTypeInfo(docTypeCode);
    } catch {
      return null;
    }
  },

  async getDocumentVersions(docTypeCode?: DocumentType): Promise<DocumentVersion[]> {
    return legalDocumentsApiClient.getDocumentVersions(docTypeCode);
  },

  async getDocumentVersion(versionId: string): Promise<DocumentVersion | null> {
    try {
      return await legalDocumentsApiClient.getDocumentVersion(versionId);
    } catch {
      return null;
    }
  },

  async getCurrentDocumentVersion(docTypeCode: DocumentType): Promise<DocumentVersion | null> {
    const cached = getCachedDocumentVersion(docTypeCode);
    if (cached) return cached;

    const version = await legalDocumentsApiClient.getCurrentDocumentVersion(docTypeCode);
    if (version) {
      setCachedDocumentVersion(docTypeCode, version);
    }
    return version;
  },

  async acceptDocument(versionId: string, userId?: string, source: AcceptanceSource = 'web'): Promise<UserDocumentAcceptance> {
    if (isDocumentTypeValue(versionId)) {
      return this.acceptDocumentByType(versionId, userId, source);
    }

    const currentUser = await getCurrentUserAsync();
    return legalDocumentsApiClient.acceptDocument({
      versionId,
      userId: userId || currentUser.id,
      userEmail: currentUser.email,
      source
    });
  },

  async acceptDocumentByType(docType: DocumentType, userId?: string, source: AcceptanceSource = 'web'): Promise<UserDocumentAcceptance> {
    const currentUser = await getCurrentUserAsync();
    return legalDocumentsApiClient.acceptDocument({
      docType,
      userId: userId || currentUser.id,
      userEmail: currentUser.email,
      source
    });
  },

  async getUserAcceptances(userId: string): Promise<UserDocumentAcceptance[]> {
    const effectiveUserId = await resolveCurrentUserId(userId);
    return legalDocumentsApiClient.getUserAcceptances(effectiveUserId);
  },

  async getUserConsentRequirement(userId: string): Promise<UserConsentRequirement> {
    const effectiveUserId = await resolveCurrentUserId(userId);
    return legalDocumentsApiClient.getUserConsentRequirement(effectiveUserId);
  },

  async updateUserLegalStatus(userId: string, docType: DocumentType, versionId: string): Promise<void> {
    const effectiveUserId = await resolveCurrentUserId(userId);
    await legalDocumentsApiClient.updateUserLegalStatus(effectiveUserId, { docType, versionId });
  },

  async getAcceptanceJournal(filters: AcceptanceJournalFilters = {}): Promise<UserDocumentAcceptance[]> {
    return legalDocumentsApiClient.getAcceptanceJournal(filters);
  },

  async getDocumentStatistics(): Promise<DocumentStatistics[]> {
    return legalDocumentsApiClient.getDocumentStatistics();
  },

  async createDocumentDraft(input: DocumentVersionInput): Promise<DocumentVersion> {
    const currentUser = await getCurrentUserAsync();
    return legalDocumentsApiClient.createDocumentDraft({
      ...input,
      editor_id: currentUser.id,
      editor_name: currentUser.name
    });
  },

  async updateDocumentVersion(versionId: string, update: DocumentVersionUpdate): Promise<DocumentVersion> {
    return legalDocumentsApiClient.updateDocumentVersion(versionId, update);
  },

  async publishDocumentVersion(versionId: string): Promise<DocumentVersion> {
    return legalDocumentsApiClient.publishDocumentVersion(versionId);
  },

  async archiveDocumentVersion(versionId: string): Promise<DocumentVersion> {
    throw new Error('Архивирование версий документов пока не реализовано');
  },

  async getAuditLog(filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> {
    return [];
  }
};

export default legalDocumentsService;
export { getCurrentUser };
