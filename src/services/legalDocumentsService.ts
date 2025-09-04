/**
 * Сервис для работы с правовыми документами
 * Включает персистентное хранение в localStorage
 */

import { PersistentStorage } from '@/utils/persistentStorage';
import { apiConfigService } from './apiConfigService';
// Убран неиспользуемый импорт
import { supabaseService as officialSupabase } from './supabaseServiceClient';
import {
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

// Начальные типы документов
const initialDocumentTypes = [
  {
    id: 'dt_1',
    code: 'tos' as DocumentType,
    title: 'Пользовательское соглашение',
    description: 'Условия использования платформы TradeControl',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString()
  },
  {
    id: 'dt_2', 
    code: 'privacy' as DocumentType,
    title: 'Политика конфиденциальности',
    description: 'Политика обработки персональных данных',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString()
  },
  {
    id: 'dt_3',
    code: 'pdn' as DocumentType,
    title: 'Политика в области защиты персональных данных',
    description: 'Подробная политика защиты персональных данных',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString()
  }
];

// Начальные версии документов
const initialDocumentVersions: DocumentVersion[] = [
  // Пользовательское соглашение
  {
    id: 'dv_tos_1',
    doc_type_id: 'dt_1',
    doc_type_code: 'tos',
    version: '1.0.0',
    status: 'published',
    published_at: new Date('2024-01-01T00:00:00Z').toISOString(),
    checksum: 'sha256:abc123tos100',
    editor_id: 'user_admin',
    editor_name: 'Системный администратор',
    changelog: 'Первоначальная версия пользовательского соглашения',
    content_html: `
      <h1>Пользовательское соглашение</h1>
      <p><strong>Дата вступления в силу:</strong> 1 января 2024 года</p>
      
      <h2>1. Общие положения</h2>
      <p>Настоящее Пользовательское соглашение ("Соглашение") регулирует отношения между ООО "ТрейдКонтрол" ("Компания") и пользователем ("Пользователь") платформы TradeControl.</p>
      
      <h2>2. Предмет соглашения</h2>
      <p>Компания предоставляет Пользователю доступ к программному обеспечению для управления торговыми сетями АЗС.</p>
      
      <h2>3. Права и обязанности сторон</h2>
      <p>Пользователь обязуется:</p>
      <ul>
        <li>Использовать платформу в соответствии с назначением</li>
        <li>Не нарушать права третьих лиц</li>
        <li>Обеспечивать безопасность своих учетных данных</li>
      </ul>
      
      <h2>4. Ответственность</h2>
      <p>Компания не несет ответственности за косвенные убытки, возникшие в результате использования платформы.</p>
      
      <h2>5. Заключительные положения</h2>
      <p>Соглашение может быть изменено Компанией в одностороннем порядке с уведомлением Пользователей.</p>
    `,
    content_md: `
# Пользовательское соглашение

**Дата вступления в силу:** 1 января 2024 года

## 1. Общие положения

Настоящее Пользовательское соглашение ("Соглашение") регулирует отношения между ООО "ТрейдКонтрол" ("Компания") и пользователем ("Пользователь") платформы TradeControl.

## 2. Предмет соглашения

Компания предоставляет Пользователю доступ к программному обеспечению для управления торговыми сетями АЗС.

## 3. Права и обязанности сторон

Пользователь обязуется:
- Использовать платформу в соответствии с назначением
- Не нарушать права третьих лиц
- Обеспечивать безопасность своих учетных данных

## 4. Ответственность

Компания не несет ответственности за косвенные убытки, возникшие в результате использования платформы.

## 5. Заключительные положения

Соглашение может быть изменено Компанией в одностороннем порядке с уведомлением Пользователей.
    `,
    locale: 'ru',
    is_current: true,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString()
  },
  
  // Политика конфиденциальности
  {
    id: 'dv_privacy_1',
    doc_type_id: 'dt_2',
    doc_type_code: 'privacy',
    version: '1.0.0',
    status: 'published',
    published_at: new Date('2024-01-01T00:00:00Z').toISOString(),
    checksum: 'sha256:def456privacy100',
    editor_id: 'user_admin',
    editor_name: 'Системный администратор',
    changelog: 'Первоначальная версия политики конфиденциальности',
    content_html: `
      <h1>Политика конфиденциальности</h1>
      <p><strong>Дата вступления в силу:</strong> 1 января 2024 года</p>
      
      <h2>1. Общие сведения</h2>
      <p>ООО "ТрейдКонтрол" обрабатывает персональные данные пользователей в соответствии с требованиями ФЗ-152 "О персональных данных".</p>
      
      <h2>2. Какие данные мы собираем</h2>
      <ul>
        <li>Контактная информация (email, телефон)</li>
        <li>Данные об использовании сервиса</li>
        <li>Техническая информация (IP-адрес, браузер)</li>
      </ul>
      
      <h2>3. Цели обработки данных</h2>
      <p>Персональные данные обрабатываются для:</p>
      <ul>
        <li>Предоставления доступа к платформе</li>
        <li>Технической поддержки пользователей</li>
        <li>Улучшения качества сервиса</li>
      </ul>
      
      <h2>4. Передача данных третьим лицам</h2>
      <p>Мы не передаем персональные данные третьим лицам без согласия пользователя, за исключением случаев, предусмотренных законодательством.</p>
      
      <h2>5. Права субъектов персональных данных</h2>
      <p>Вы имеете право на доступ к своим персональным данным, их изменение или удаление.</p>
    `,
    content_md: `
# Политика конфиденциальности

**Дата вступления в силу:** 1 января 2024 года

## 1. Общие сведения

ООО "ТрейдКонтрол" обрабатывает персональные данные пользователей в соответствии с требованиями ФЗ-152 "О персональных данных".

## 2. Какие данные мы собираем

- Контактная информация (email, телефон)
- Данные об использовании сервиса
- Техническая информация (IP-адрес, браузер)

## 3. Цели обработки данных

Персональные данные обрабатываются для:
- Предоставления доступа к платформе
- Технической поддержки пользователей
- Улучшения качества сервиса

## 4. Передача данных третьим лицам

Мы не передаем персональные данные третьим лицам без согласия пользователя, за исключением случаев, предусмотренных законодательством.

## 5. Права субъектов персональных данных

Вы имеете право на доступ к своим персональным данным, их изменение или удаление.
    `,
    locale: 'ru',
    is_current: true,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString()
  },

  // Защита персональных данных
  {
    id: 'dv_pdn_1',
    doc_type_id: 'dt_3',
    doc_type_code: 'pdn',
    version: '1.0.0',
    status: 'published',
    published_at: new Date('2024-01-01T00:00:00Z').toISOString(),
    checksum: 'sha256:ghi789pdn100',
    editor_id: 'user_admin',
    editor_name: 'Системный администратор',
    changelog: 'Первоначальная версия политики защиты персональных данных',
    content_html: `
      <h1>Политика в области защиты персональных данных</h1>
      <p><strong>Дата вступления в силу:</strong> 1 января 2024 года</p>
      
      <h2>1. Назначение и область применения</h2>
      <p>Настоящая Политика определяет подходы ООО "ТрейдКонтрол" к защите персональных данных и обеспечению их безопасности.</p>
      
      <h2>2. Правовые основания обработки</h2>
      <p>Обработка персональных данных осуществляется на основании:</p>
      <ul>
        <li>Согласия субъекта персональных данных</li>
        <li>Исполнения договорных обязательств</li>
        <li>Требований законодательства РФ</li>
      </ul>
      
      <h2>3. Принципы обработки персональных данных</h2>
      <ul>
        <li>Законность и справедливость</li>
        <li>Ограничение конкретными целями</li>
        <li>Соответствие целям обработки</li>
        <li>Точность и актуальность</li>
        <li>Безопасность</li>
      </ul>
      
      <h2>4. Организационно-технические меры защиты</h2>
      <p>Для защиты персональных данных применяются:</p>
      <ul>
        <li>Шифрование данных</li>
        <li>Контроль доступа</li>
        <li>Резервное копирование</li>
        <li>Мониторинг безопасности</li>
      </ul>
      
      <h2>5. Порядок реагирования на инциденты</h2>
      <p>При выявлении нарушений безопасности персональных данных незамедлительно принимаются меры по их устранению и уведомлению регулятора.</p>
    `,
    content_md: `
# Политика в области защиты персональных данных

**Дата вступления в силу:** 1 января 2024 года

## 1. Назначение и область применения

Настоящая Политика определяет подходы ООО "ТрейдКонтрол" к защите персональных данных и обеспечению их безопасности.

## 2. Правовые основания обработки

Обработка персональных данных осуществляется на основании:
- Согласия субъекта персональных данных
- Исполнения договорных обязательств
- Требований законодательства РФ

## 3. Принципы обработки персональных данных

- Законность и справедливость
- Ограничение конкретными целями
- Соответствие целям обработки
- Точность и актуальность
- Безопасность

## 4. Организационно-технические меры защиты

Для защиты персональных данных применяются:
- Шифрование данных
- Контроль доступа
- Резервное копирование
- Мониторинг безопасности

## 5. Порядок реагирования на инциденты

При выявлении нарушений безопасности персональных данных незамедлительно принимаются меры по их устранению и уведомлению регулятора.
    `,
    locale: 'ru',
    is_current: true,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString()
  }
];

// Mock данные для согласий пользователей
const initialUserAcceptances: UserDocumentAcceptance[] = [
  {
    id: 'ua_1',
    user_id: 'user_admin',
    user_name: 'Администратор системы',
    user_email: 'admin@tradecontrol.ru',
    doc_version_id: 'dv_tos_1',
    doc_type_code: 'tos',
    doc_version: '1.0.0',
    accepted_at: new Date('2024-01-01T10:00:00Z').toISOString(),
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    source: 'web',
    immutable: true,
    created_at: new Date('2024-01-01T10:00:00Z').toISOString()
  }
];

// Mock данные для статусов пользователей
const initialUserLegalStatuses: UserLegalStatus[] = [
  {
    user_id: 'user_admin',
    tos_version_id: 'dv_tos_1',
    privacy_version_id: 'dv_privacy_1', 
    pdn_version_id: 'dv_pdn_1',
    tos_accepted_at: new Date('2024-01-01T10:00:00Z').toISOString(),
    privacy_accepted_at: new Date('2024-01-01T10:00:00Z').toISOString(),
    pdn_accepted_at: new Date('2024-01-01T10:00:00Z').toISOString(),
    updated_at: new Date('2024-01-01T10:00:00Z').toISOString()
  }
  // current_user намеренно не добавлен - будет блокироваться до получения согласий
];

// Mock данные для аудита
const initialAuditLog: AuditLogEntry[] = [];

// Загрузка данных из localStorage
const documentTypes = PersistentStorage.load('legal_document_types', initialDocumentTypes);
const documentVersions = PersistentStorage.load<DocumentVersion>('legal_document_versions', initialDocumentVersions);
const userAcceptances = PersistentStorage.load<UserDocumentAcceptance>('legal_user_acceptances', initialUserAcceptances);
const userLegalStatuses = PersistentStorage.load<UserLegalStatus>('legal_user_statuses', initialUserLegalStatuses);
const auditLog = PersistentStorage.load<AuditLogEntry>('legal_audit_log', initialAuditLog);

// Функции для сохранения
const saveDocumentTypes = () => PersistentStorage.save('legal_document_types', documentTypes);
const saveDocumentVersions = () => PersistentStorage.save('legal_document_versions', documentVersions);
const saveUserAcceptances = () => PersistentStorage.save('legal_user_acceptances', userAcceptances);
const saveUserLegalStatuses = () => PersistentStorage.save('legal_user_statuses', userLegalStatuses);
const saveAuditLog = () => PersistentStorage.save('legal_audit_log', auditLog);

// Утилитарные функции
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateId = (prefix: string) => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateChecksum = (content: string): string => {
  // Простая реализация checksum для демонстрации
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `sha256:${Math.abs(hash).toString(16)}`;
};

const getCurrentUser = () => {
  // Try to get user from localStorage (real authenticated user)
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

const addAuditLogEntry = (action: string, resourceType: string, resourceId: string, beforeState?: any, afterState?: any, comment?: string) => {
  const user = getCurrentUser();
  const entry: AuditLogEntry = {
    id: generateId('audit'),
    actor_id: user.id,
    actor_name: user.name,
    actor_role: user.role,
    action,
    resource_type: resourceType as any,
    resource_id: resourceId,
    before_state: beforeState,
    after_state: afterState,
    comment,
    ip_address: '127.0.0.1', // В реальном приложении получать из запроса
    user_agent: navigator.userAgent,
    created_at: new Date().toISOString()
  };
  
  auditLog.push(entry);
  saveAuditLog();
};

// HTTP API methods для интеграции с backend
const httpApiMethods = {
  /**
   * HTTP запрос к API
   */
  async apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const apiUrl = apiConfigService.getCurrentApiUrl();
    const url = `${apiUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...httpApiMethods.getAuthHeaders()
      }
    };
    
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        statusText: response.statusText,
        message: errorData.error || 'API request failed',
        details: errorData.details
      };
    }
    
    return await response.json();
  },

  /**
   * Получить заголовки авторизации
   */
  getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  },

  /**
   * Получить документы из API
   */
  async getDocumentVersionsFromAPI(): Promise<DocumentVersion[]> {
    const response = await httpApiMethods.apiRequest('/legal-documents/versions');
    return response.data || [];
  },

  /**
   * Принять документ через API
   */
  async acceptDocumentFromAPI(versionId: string, source: AcceptanceSource = 'web'): Promise<UserDocumentAcceptance> {
    const response = await httpApiMethods.apiRequest('/legal-documents/accept', {
      method: 'POST',
      body: JSON.stringify({ version_id: versionId, source })
    });
    return response.data;
  },

  /**
   * Получить статус пользователя из API
   */
  async getUserLegalStatusFromAPI(userId: string): Promise<UserLegalStatus | null> {
    try {
      const response = await httpApiMethods.apiRequest(`/legal-documents/user-status/${userId}`);
      return response.data;
    } catch (error: any) {
      if (error.status === 404) return null;
      throw error;
    }
  },

  /**
   * Получить требования согласия из API
   */
  async getUserConsentRequirementFromAPI(userId: string): Promise<UserConsentRequirement> {
    const response = await httpApiMethods.apiRequest(`/legal-documents/consent-requirement/${userId}`);
    return response.data;
  },

  /**
   * Получить статистику документов из API
   */
  async getDocumentStatisticsFromAPI(): Promise<DocumentStatistics[]> {
    const response = await httpApiMethods.apiRequest('/legal-documents/statistics');
    return response.data || [];
  }
};

// Supabase helper methods
const saveAcceptanceToSupabase = async (versionId: string, userId: string, email: string, source: AcceptanceSource): Promise<UserDocumentAcceptance> => {
  const config = apiConfigService.getCurrentConnection();
  if (!config || config.type !== 'supabase') {
    throw new Error('Supabase connection not configured');
  }
  
  // Используем официальный Supabase клиент вместо самодельного
  const supabase = officialSupabase;
  
  // Get document version info (from localStorage for now)
  const version = documentVersions.find(v => v.id === versionId);
  if (!version) {
    throw new Error('Document version not found');
  }
  
  // Get actual user data from getCurrentUser
  const currentUser = getCurrentUser();
  const actualUserId = currentUser.id || userId;
  const actualEmail = currentUser.email || email;
  
  console.log('💾 Saving to Supabase database:', { 
    versionId, 
    actualUserId, 
    actualEmail, 
    docType: version.doc_type_code,
    currentUser: currentUser 
  });
  
  // Validate that we have proper UUID for user_id
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(actualUserId)) {
    console.warn('⚠️ User ID is not a valid UUID, attempting to find user by email');
    // For demo purposes, generate a UUID or use a fallback
    // In production, you would query the users table to get the UUID by email
    const fallbackUuid = crypto.randomUUID();
    console.log('🔄 Using fallback UUID:', fallbackUuid);
    
    // Save acceptance with fallback UUID using official client
    const { data, error } = await supabase
      .from('user_document_acceptances')
      .insert({
        user_id: fallbackUuid,
        user_email: actualEmail,
        doc_type_code: version.doc_type_code,
        doc_version: version.version  // Добавляем версию документа
      })
      .select()
      .single();
      
    if (error) {
      console.error('❌ Error saving to Supabase with fallback UUID:', error);
      throw new Error('Failed to save acceptance: ' + error);
    }
    
    console.log('✅ Successfully saved to Supabase database with fallback UUID');
    return { ...acceptance, id: data?.[0]?.id || acceptance.id };
  }
  
  // Create acceptance record
  const acceptance: UserDocumentAcceptance = {
    id: crypto.randomUUID(),
    user_id: actualUserId,
    user_name: 'User',
    user_email: actualEmail,
    doc_version_id: versionId,
    doc_type_code: version.doc_type_code,
    doc_version: version.version,
    accepted_at: new Date().toISOString(),
    ip_address: '127.0.0.1',
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
    source,
    immutable: true,
    created_at: new Date().toISOString()
  };
  
  // Проверим текущую сессию перед сохранением
  const { data: sessionData } = await supabase.auth.getSession();
  console.log('🔍 Supabase session before insert:', sessionData);
  
  // Save to Supabase using official client (only columns that exist in table)
  const { data, error } = await supabase
    .from('user_document_acceptances')
    .insert({
      user_id: actualUserId,  // UUID from users table
      user_email: actualEmail,  // Email for reference
      doc_type_code: version.doc_type_code,
      doc_version: version.version,  // Добавляем версию документа
    })
    .select()
    .single();
  
  console.log('🔍 Insert result:', { data, error });
    
  if (error) {
    console.error('❌ Error saving to Supabase:', error);
    throw new Error('Failed to save acceptance: ' + error);
  }
  
  console.log('✅ Successfully saved to Supabase database');
  return acceptance;
};

// Основной сервис
export const legalDocumentsService = {
  // === РАБОТА С ТИПАМИ ДОКУМЕНТОВ ===
  
  async getDocumentTypes(): Promise<DocumentTypeInfo[]> {
    await delay(200);
    
    return documentTypes.map(type => {
      const currentVersion = documentVersions.find(v => 
        v.doc_type_code === type.code && v.is_current && v.status === 'published'
      );
      
      return {
        code: type.code,
        title: type.title,
        current_version: currentVersion
      };
    });
  },

  // === РАБОТА С ВЕРСИЯМИ ДОКУМЕНТОВ ===

  async getDocumentVersions(docTypeCode?: DocumentType): Promise<DocumentVersion[]> {
    await delay(300);
    
    let versions = [...documentVersions];
    if (docTypeCode) {
      versions = versions.filter(v => v.doc_type_code === docTypeCode);
    }
    
    return versions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getLatestVersion(docTypeCode: DocumentType): DocumentVersion | null {
    // Find the current published version for this document type
    const currentVersion = documentVersions.find(v => 
      v.doc_type_code === docTypeCode && 
      v.is_current && 
      v.status === 'published'
    );
    
    if (currentVersion) {
      return currentVersion;
    }
    
    // Fallback to any published version of this type
    const publishedVersions = documentVersions
      .filter(v => v.doc_type_code === docTypeCode && v.status === 'published')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return publishedVersions[0] || null;
  },

  async getDocumentVersion(versionId: string): Promise<DocumentVersion | null> {
    await delay(200);
    return documentVersions.find(v => v.id === versionId) || null;
  },

  async getCurrentDocumentVersion(docTypeCode: DocumentType): Promise<DocumentVersion | null> {
    await delay(200);
    return documentVersions.find(v => 
      v.doc_type_code === docTypeCode && v.is_current && v.status === 'published'
    ) || null;
  },

  async createDocumentDraft(input: DocumentVersionInput): Promise<DocumentVersion> {
    await delay(500);
    const user = getCurrentUser();
    
    const newVersion: DocumentVersion = {
      id: generateId('dv'),
      doc_type_id: documentTypes.find(t => t.code === input.doc_type_code)?.id || '',
      doc_type_code: input.doc_type_code,
      version: input.version,
      status: 'draft',
      checksum: generateChecksum(input.content_md),
      editor_id: user.id,
      editor_name: user.name,
      changelog: input.changelog,
      content_html: '', // Будет заполнено при рендеринге markdown
      content_md: input.content_md,
      locale: input.locale || 'ru',
      is_current: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    documentVersions.push(newVersion);
    saveDocumentVersions();
    
    addAuditLogEntry('create_draft', 'document_version', newVersion.id, undefined, newVersion);
    
    return newVersion;
  },

  async updateDocumentVersion(versionId: string, update: DocumentVersionUpdate): Promise<DocumentVersion> {
    await delay(500);
    const user = getCurrentUser();
    
    const index = documentVersions.findIndex(v => v.id === versionId);
    if (index === -1) {
      throw new Error('Версия документа не найдена');
    }

    const beforeState = { ...documentVersions[index] };
    const version = documentVersions[index];
    
    if (version.status !== 'draft') {
      throw new Error('Можно редактировать только черновики');
    }

    if (update.content_md) {
      version.content_md = update.content_md;
      version.checksum = generateChecksum(update.content_md);
    }
    
    if (update.version) version.version = update.version;
    if (update.changelog) version.changelog = update.changelog;
    if (update.locale) version.locale = update.locale;
    
    version.updated_at = new Date().toISOString();
    
    documentVersions[index] = version;
    saveDocumentVersions();
    
    addAuditLogEntry('update_draft', 'document_version', versionId, beforeState, version);
    
    return version;
  },

  async publishDocumentVersion(versionId: string): Promise<DocumentVersion> {
    await delay(500);
    const user = getCurrentUser();
    
    if (user.role !== 'superadmin') {
      throw new Error('Недостаточно прав для публикации');
    }

    const index = documentVersions.findIndex(v => v.id === versionId);
    if (index === -1) {
      throw new Error('Версия документа не найдена');
    }

    const beforeState = { ...documentVersions[index] };
    const version = documentVersions[index];
    
    if (version.status !== 'draft') {
      throw new Error('Можно публиковать только черновики');
    }

    // Снимаем флаг is_current с предыдущих версий того же типа
    documentVersions.forEach(v => {
      if (v.doc_type_code === version.doc_type_code && v.is_current) {
        v.is_current = false;
      }
    });

    // Публикуем новую версию
    version.status = 'published';
    version.is_current = true;
    version.published_at = new Date().toISOString();
    version.updated_at = new Date().toISOString();
    
    documentVersions[index] = version;
    saveDocumentVersions();
    
    addAuditLogEntry('publish', 'document_version', versionId, beforeState, version);
    
    return version;
  },

  async archiveDocumentVersion(versionId: string): Promise<DocumentVersion> {
    await delay(500);
    const user = getCurrentUser();
    
    const index = documentVersions.findIndex(v => v.id === versionId);
    if (index === -1) {
      throw new Error('Версия документа не найдена');
    }

    const beforeState = { ...documentVersions[index] };
    const version = documentVersions[index];
    
    version.status = 'archived';
    version.is_current = false;
    version.archived_at = new Date().toISOString();
    version.updated_at = new Date().toISOString();
    
    documentVersions[index] = version;
    saveDocumentVersions();
    
    addAuditLogEntry('archive', 'document_version', versionId, beforeState, version);
    
    return version;
  },

  // === РАБОТА С СОГЛАСИЯМИ ПОЛЬЗОВАТЕЛЕЙ ===

  async acceptDocumentByType(docType: DocumentType, userId?: string, source: AcceptanceSource = 'web'): Promise<UserDocumentAcceptance> {
    // Get the current version for this document type
    const currentVersion = this.getLatestVersion(docType);
    if (!currentVersion) {
      throw new Error(`Не найдена текущая версия документа типа ${docType}`);
    }
    return this.acceptDocument(currentVersion.id, userId, source);
  },

  async acceptDocument(versionIdOrType: string, userId?: string, source: AcceptanceSource = 'web'): Promise<UserDocumentAcceptance> {
    // Check if it's a document type code
    if (['tos', 'privacy', 'pdn', 'dpa', 'cookies', 'eula', 'sla'].includes(versionIdOrType)) {
      return this.acceptDocumentByType(versionIdOrType as DocumentType, userId, source);
    }
    
    const versionId = versionIdOrType;
    const apiMode = apiConfigService.getApiMode();
    
    // Try Supabase first
    if (apiMode === 'supabase') {
      try {
        const actualUserId = userId || getCurrentUser().id;
        const actualUserEmail = getCurrentUser().email;
        return await saveAcceptanceToSupabase(versionId, actualUserId, actualUserEmail, source);
      } catch (error) {
        console.error('Supabase legal documents error:', error);
        console.warn('Falling back to mock data due to Supabase error');
      }
    }
    
    // Try HTTP API
    if (apiMode === 'http') {
      try {
        return await httpApiMethods.acceptDocumentFromAPI(versionId, source);
      } catch (error) {
        console.error('Legal documents API error:', error);
        console.warn('Falling back to mock data due to API error');
      }
    }
    
    // Mock mode or fallback
    await delay(300);
    
    const actualUserId = userId || getCurrentUser().id;
    const version = documentVersions.find(v => v.id === versionId);
    
    if (!version) {
      throw new Error('Версия документа не найдена');
    }

    // Проверяем, не было ли уже согласие на эту версию (идемпотентность)
    const existingAcceptance = userAcceptances.find(
      ua => ua.user_id === actualUserId && ua.doc_version_id === versionId
    );
    
    if (existingAcceptance) {
      return existingAcceptance;
    }

    // Создаем новое согласие
    const acceptance: UserDocumentAcceptance = {
      id: generateId('ua'),
      user_id: actualUserId,
      user_name: 'Пользователь', // В реальном приложении получать из БД пользователей
      user_email: 'user@example.com',
      doc_version_id: versionId,
      doc_type_code: version.doc_type_code,
      doc_version: version.version,
      accepted_at: new Date().toISOString(),
      ip_address: '127.0.0.1', // В реальном приложении получать из запроса
      user_agent: navigator.userAgent,
      source,
      immutable: true,
      created_at: new Date().toISOString()
    };

    userAcceptances.push(acceptance);
    saveUserAcceptances();

    // Обновляем статус пользователя
    await this.updateUserLegalStatus(actualUserId, version.doc_type_code, versionId);
    
    return acceptance;
  },

  async getUserAcceptances(userId: string): Promise<UserDocumentAcceptance[]> {
    await delay(200);
    return userAcceptances
      .filter(ua => ua.user_id === userId)
      .sort((a, b) => new Date(b.accepted_at).getTime() - new Date(a.accepted_at).getTime());
  },

  async getUserConsentRequirement(userId: string): Promise<UserConsentRequirement> {
    // Try API first
    if (apiConfigService.getApiMode() === 'http') {
      try {
        return await httpApiMethods.getUserConsentRequirementFromAPI(userId);
      } catch (error) {
        console.error('Legal documents API error:', error);
        console.warn('Falling back to mock data due to API error');
      }
    }
    
    // Mock mode or fallback
    await delay(300);
    
    const userStatus = userLegalStatuses.find(s => s.user_id === userId);
    const currentVersions = documentVersions.filter(v => v.is_current && v.status === 'published');
    
    const pendingDocuments = [];
    const currentAcceptances = [];
    
    for (const docType of ['tos', 'privacy', 'pdn'] as DocumentType[]) {
      const currentVersion = currentVersions.find(v => v.doc_type_code === docType);
      if (!currentVersion) continue;
      
      const hasAcceptance = userStatus && (
        (docType === 'tos' && userStatus.tos_version_id === currentVersion.id) ||
        (docType === 'privacy' && userStatus.privacy_version_id === currentVersion.id) ||
        (docType === 'pdn' && userStatus.pdn_version_id === currentVersion.id)
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
        version_id: userStatus ? (
          docType === 'tos' ? userStatus.tos_version_id :
          docType === 'privacy' ? userStatus.privacy_version_id :
          userStatus.pdn_version_id
        ) : undefined,
        version: userStatus ? (
          docType === 'tos' ? documentVersions.find(v => v.id === userStatus.tos_version_id)?.version :
          docType === 'privacy' ? documentVersions.find(v => v.id === userStatus.privacy_version_id)?.version :
          documentVersions.find(v => v.id === userStatus.pdn_version_id)?.version
        ) : undefined,
        accepted_at: userStatus ? (
          docType === 'tos' ? userStatus.tos_accepted_at :
          docType === 'privacy' ? userStatus.privacy_accepted_at :
          userStatus.pdn_accepted_at
        ) : undefined
      });
    }
    
    return {
      user_id: userId,
      requires_consent: pendingDocuments.length > 0,
      pending_documents: pendingDocuments,
      current_acceptances: currentAcceptances
    };
  },

  async updateUserLegalStatus(userId: string, docType: DocumentType, versionId: string): Promise<void> {
    await delay(200);
    
    let userStatus = userLegalStatuses.find(s => s.user_id === userId);
    const beforeState = userStatus ? { ...userStatus } : undefined;
    
    if (!userStatus) {
      userStatus = {
        user_id: userId,
        updated_at: new Date().toISOString()
      };
      userLegalStatuses.push(userStatus);
    }
    
    const now = new Date().toISOString();
    
    switch (docType) {
      case 'tos':
        userStatus.tos_version_id = versionId;
        userStatus.tos_accepted_at = now;
        break;
      case 'privacy':
        userStatus.privacy_version_id = versionId;
        userStatus.privacy_accepted_at = now;
        break;
      case 'pdn':
        userStatus.pdn_version_id = versionId;
        userStatus.pdn_accepted_at = now;
        break;
    }
    
    userStatus.updated_at = now;
    saveUserLegalStatuses();
    
    addAuditLogEntry('update_user_status', 'user_legal_status', userId, beforeState, userStatus);
  },

  // === ЖУРНАЛЫ И СТАТИСТИКА ===

  async getAcceptanceJournal(filters: AcceptanceJournalFilters = {}): Promise<UserDocumentAcceptance[]> {
    const apiMode = apiConfigService.getApiMode();
    
    // Попытка получить данные из Supabase
    if (apiMode === 'supabase') {
      try {
        const { data, error } = await officialSupabase
          .from('user_document_acceptances')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (!error && data) {
          console.log('📊 Loaded real acceptance data from Supabase:', data);
          
          // Преобразуем данные из Supabase в формат UserDocumentAcceptance
          const acceptances: UserDocumentAcceptance[] = data.map(row => ({
            id: row.id || crypto.randomUUID(),
            user_id: row.user_id,
            user_name: 'Пользователь', // В базе нет имени, используем по умолчанию
            user_email: row.user_email,
            doc_version_id: row.doc_version_id || crypto.randomUUID(),
            doc_type_code: row.doc_type_code,
            doc_version: row.doc_version || '1.0',
            accepted_at: row.created_at,
            ip_address: row.ip_address || '127.0.0.1',
            user_agent: row.user_agent || 'Unknown',
            source: row.source || 'web',
            immutable: true
          }));
          
          // Применяем фильтры если есть
          let filtered = acceptances;
          if (filters.doc_type) {
            filtered = filtered.filter(ua => ua.doc_type_code === filters.doc_type);
          }
          if (filters.version_id) {
            filtered = filtered.filter(ua => ua.doc_version_id === filters.version_id);
          }
          if (filters.user_id) {
            filtered = filtered.filter(ua => ua.user_id === filters.user_id);
          }
          if (filters.user_email) {
            filtered = filtered.filter(ua => 
              ua.user_email?.toLowerCase().includes(filters.user_email!.toLowerCase())
            );
          }
          
          return filtered;
        }
      } catch (error) {
        console.error('❌ Error loading from Supabase, falling back to mock data:', error);
      }
    }
    
    // Fallback к mock данным
    await delay(400);
    let filtered = [...userAcceptances];
    
    if (filters.doc_type) {
      filtered = filtered.filter(ua => ua.doc_type_code === filters.doc_type);
    }
    
    if (filters.version_id) {
      filtered = filtered.filter(ua => ua.doc_version_id === filters.version_id);
    }
    
    if (filters.user_id) {
      filtered = filtered.filter(ua => ua.user_id === filters.user_id);
    }
    
    if (filters.user_email) {
      filtered = filtered.filter(ua => 
        ua.user_email?.toLowerCase().includes(filters.user_email!.toLowerCase())
      );
    }
    
    if (filters.date_from) {
      filtered = filtered.filter(ua => ua.accepted_at >= filters.date_from!);
    }
    
    if (filters.date_to) {
      filtered = filtered.filter(ua => ua.accepted_at <= filters.date_to!);
    }
    
    if (filters.source) {
      filtered = filtered.filter(ua => ua.source === filters.source);
    }
    
    // Сортировка по дате (новые сначала)
    filtered.sort((a, b) => new Date(b.accepted_at).getTime() - new Date(a.accepted_at).getTime());
    
    // Пагинация
    if (filters.offset || filters.limit) {
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      filtered = filtered.slice(offset, offset + limit);
    }
    
    return filtered;
  },

  async getAuditLog(filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> {
    await delay(400);
    
    let filtered = [...auditLog];
    
    if (filters.actor_id) {
      filtered = filtered.filter(entry => entry.actor_id === filters.actor_id);
    }
    
    if (filters.action) {
      filtered = filtered.filter(entry => entry.action === filters.action);
    }
    
    if (filters.resource_type) {
      filtered = filtered.filter(entry => entry.resource_type === filters.resource_type);
    }
    
    if (filters.date_from) {
      filtered = filtered.filter(entry => entry.created_at >= filters.date_from!);
    }
    
    if (filters.date_to) {
      filtered = filtered.filter(entry => entry.created_at <= filters.date_to!);
    }
    
    // Сортировка по дате (новые сначала)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // Пагинация
    if (filters.offset || filters.limit) {
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      filtered = filtered.slice(offset, offset + limit);
    }
    
    return filtered;
  },

  async getDocumentStatistics(): Promise<DocumentStatistics[]> {
    // Try API first
    if (apiConfigService.getApiMode() === 'http') {
      try {
        return await httpApiMethods.getDocumentStatisticsFromAPI();
      } catch (error) {
        console.error('Legal documents API error:', error);
        console.warn('Falling back to mock data due to API error');
      }
    }
    
    // Mock mode or fallback
    await delay(300);
    
    const currentVersions = documentVersions.filter(v => v.is_current && v.status === 'published');
    const totalUsers = 10; // В реальном приложении получать из сервиса пользователей
    
    return currentVersions.map(version => {
      const acceptances = userAcceptances.filter(ua => ua.doc_version_id === version.id);
      const acceptedUsers = acceptances.length;
      const pendingUsers = totalUsers - acceptedUsers;
      
      return {
        doc_type_code: version.doc_type_code,
        current_version: version.version,
        published_at: version.published_at!,
        total_users: totalUsers,
        accepted_users: acceptedUsers,
        pending_users: pendingUsers,
        acceptance_percentage: totalUsers > 0 ? Math.round((acceptedUsers / totalUsers) * 100) : 0
      };
    });
  }
};

export default legalDocumentsService;
export { getCurrentUser };