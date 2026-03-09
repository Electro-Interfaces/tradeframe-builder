import { getBackendOrigin } from '@/utils/backendUrl';
import type {
  AcceptanceJournalFilters,
  AcceptanceSource,
  DocumentStatistics,
  DocumentType,
  DocumentTypeInfo,
  DocumentVersion,
  DocumentVersionInput,
  DocumentVersionUpdate,
  UserConsentRequirement,
  UserDocumentAcceptance,
} from '@/types/legal';

const API_BASE_URL = `${getBackendOrigin()}/api/legal`;

function getOptionalAuthToken(): string {
  const token = localStorage.getItem('auth_token')
    || sessionStorage.getItem('auth_token')
    || localStorage.getItem('tradeframe_token_v2')
    || localStorage.getItem('authToken')
    || '';

  return token.split('.').length === 3 ? token : '';
}

async function parseResponse(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getOptionalAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const body = await parseResponse(response);
  if (!response.ok) {
    throw new Error(body?.error || body?.message || `Ошибка API: ${response.status}`);
  }

  return body as T;
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const legalDocumentsApiClient = {
  getDocumentTypes(): Promise<DocumentTypeInfo[]> {
    return request<DocumentTypeInfo[]>('/document-types');
  },

  getDocumentTypeInfo(docTypeCode: DocumentType): Promise<DocumentTypeInfo | null> {
    return request<DocumentTypeInfo>(`/document-types/${docTypeCode}`);
  },

  getDocumentVersions(docTypeCode?: DocumentType): Promise<DocumentVersion[]> {
    return request<DocumentVersion[]>(`/document-versions${buildQuery({ docTypeCode })}`);
  },

  getDocumentVersion(versionId: string): Promise<DocumentVersion | null> {
    return request<DocumentVersion>(`/document-versions/${versionId}`);
  },

  getCurrentDocumentVersion(docTypeCode: DocumentType): Promise<DocumentVersion | null> {
    return request<DocumentVersion>(`/current-version/${docTypeCode}`);
  },

  acceptDocument(payload: {
    versionId?: string;
    docType?: DocumentType;
    userId?: string;
    userEmail?: string;
    source?: AcceptanceSource;
  }): Promise<UserDocumentAcceptance> {
    return request<UserDocumentAcceptance>('/acceptances', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getUserAcceptances(userId: string): Promise<UserDocumentAcceptance[]> {
    return request<UserDocumentAcceptance[]>(`/users/${userId}/acceptances`);
  },

  getUserConsentRequirement(userId: string): Promise<UserConsentRequirement> {
    return request<UserConsentRequirement>(`/users/${userId}/consent-requirement`);
  },

  updateUserLegalStatus(userId: string, payload: {
    docType: DocumentType;
    versionId: string;
    acceptedAt?: string;
  }): Promise<UserConsentRequirement> {
    return request<UserConsentRequirement>(`/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  getAcceptanceJournal(filters: AcceptanceJournalFilters = {}): Promise<UserDocumentAcceptance[]> {
    return request<UserDocumentAcceptance[]>(
      `/acceptance-journal${buildQuery({
        docType: filters.doc_type,
        versionId: filters.version_id,
        userId: filters.user_id,
        userEmail: filters.user_email,
        dateFrom: filters.date_from,
        dateTo: filters.date_to,
        source: filters.source,
        limit: filters.limit,
        offset: filters.offset,
      })}`
    );
  },

  getDocumentStatistics(): Promise<DocumentStatistics[]> {
    return request<DocumentStatistics[]>('/statistics');
  },

  createDocumentDraft(input: DocumentVersionInput & {
    editor_id?: string;
    editor_name?: string;
  }): Promise<DocumentVersion> {
    return request<DocumentVersion>('/document-drafts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateDocumentVersion(versionId: string, input: DocumentVersionUpdate): Promise<DocumentVersion> {
    return request<DocumentVersion>(`/document-versions/${versionId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  publishDocumentVersion(versionId: string): Promise<DocumentVersion> {
    return request<DocumentVersion>(`/document-versions/${versionId}/publish`, {
      method: 'POST',
    });
  },
};
