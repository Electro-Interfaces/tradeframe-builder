/**
 * API services for the new Templates & Connections system
 * Handles connection settings and command templates with mock implementation
 */

import {
  ConnectionSettings,
  NewCommandTemplate,
  CreateConnectionSettingsRequest,
  UpdateConnectionSettingsRequest,
  CreateNewTemplateRequest,
  UpdateNewTemplateRequest,
  CloneTemplateRequest,
  ListConnectionSettingsParams,
  ListConnectionSettingsResponse,
  ListNewTemplatesParams,
  ListNewTemplatesResponse,
  NewConnectionTestResult,
  TemplateTestResult,
  NewApiError,
  NewConnectionId,
  NewTemplateId
} from '@/types/connections';

import { connectionSettingsStore } from '@/mock/connectionSettingsStore';
import { newCommandTemplatesStore } from '@/mock/newCommandTemplatesStore';
import { PersistentStorage } from '@/utils/persistentStorage';

// Base URL for API
import { getApiBaseUrl, isApiMockMode } from '@/services/apiConfigService';
const API_BASE_URL = getApiBaseUrl();

// Utility for HTTP requests with tracing
class ApiClient {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/problem+json',
      'X-Trace-Id': this.generateTraceId(),
      ...options.headers,
    };

    // Add Idempotency-Key for mutating operations
    if (['POST', 'PUT', 'PATCH'].includes(options.method || 'GET')) {
      headers['Idempotency-Key'] = this.generateIdempotencyKey();
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new NewApiError({
        type: 'https://api.company.com/problems/api-error',
        title: 'API Error',
        status: response.status,
        detail: await response.text(),
        trace_id: headers['X-Trace-Id']
      });
    }

    return response.json();
  }

  private generateTraceId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private generateIdempotencyKey(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Custom error class for new system
class NewApiError extends Error implements NewApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  trace_id?: string;
  validation_errors?: Record<string, string[]>;

  constructor(error: Partial<NewApiError>) {
    super(error.detail || error.title);
    this.name = 'NewApiError';
    this.type = error.type || 'about:blank';
    this.title = error.title || 'Unknown Error';
    this.status = error.status || 500;
    this.detail = error.detail || '';
    this.instance = error.instance;
    this.trace_id = error.trace_id;
    this.validation_errors = error.validation_errors;
  }
}

const apiClient = new ApiClient();

// Connection Settings stored in localStorage
let connectionSettingsData: ConnectionSettings[] = PersistentStorage.load<ConnectionSettings>('connection_settings_v1', []);

// User templates stored in localStorage (system templates come from store)
const userTemplatesData: NewCommandTemplate[] = PersistentStorage.load<NewCommandTemplate>('new_templates_v1', []);

// Get all templates (system + user)
const getAllTemplates = (): NewCommandTemplate[] => {
  const systemTemplates = newCommandTemplatesStore.getSystem();
  return [...systemTemplates, ...userTemplatesData];
};

// Save user data to localStorage
const saveConnectionSettings = () => {
  PersistentStorage.save('connection_settings_v1', connectionSettingsData);
};

const saveUserTemplates = () => {
  PersistentStorage.save('new_templates_v1', userTemplatesData);
};

// Initialize with some demo data if empty
if (connectionSettingsData.length === 0) {
  connectionSettingsData = connectionSettingsStore.getAll();
  saveConnectionSettings();
}

// Mock API for Connection Settings
export const connectionSettingsAPI = {
  // List connection settings
  async list(params: ListConnectionSettingsParams = {}): Promise<ListConnectionSettingsResponse> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let filtered = [...connectionSettingsData];
    
    // Apply filters
    if (params.provider_id) {
      filtered = filtered.filter(cs => cs.provider_id.includes(params.provider_id!));
    }
    
    if (params.status) {
      filtered = filtered.filter(cs => cs.status === params.status);
    }
    
    if (params.search) {
      const searchTerm = params.search.toLowerCase();
      filtered = filtered.filter(cs =>
        cs.provider_id.toLowerCase().includes(searchTerm) ||
        cs.base_url.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply sorting
    const sortBy = params.sort_by || 'created_at';
    const sortOrder = params.sort_order || 'desc';
    
    filtered.sort((a, b) => {
      const aVal = (a as any)[sortBy];
      const bVal = (b as any)[sortBy];
      
      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      else if (aVal > bVal) comparison = 1;
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    // Apply pagination
    const page = params.page || 1;
    const limit = params.limit || 50;
    const total = filtered.length;
    const total_pages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const pageData = filtered.slice(startIndex, endIndex);
    
    return {
      data: pageData,
      total,
      page,
      limit,
      total_pages
    };
  },

  // Get connection settings by ID
  async get(id: NewConnectionId): Promise<ConnectionSettings> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const connection = connectionSettingsData.find(cs => cs.id === id);
    if (!connection) {
      throw new NewApiError({
        type: 'https://api.company.com/problems/not-found',
        title: 'Connection Not Found',
        status: 404,
        detail: `Connection with ID ${id} not found`
      });
    }
    
    return connection;
  },

  // Create connection settings
  async create(data: CreateConnectionSettingsRequest): Promise<ConnectionSettings> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Validate URL format
    try {
      new URL(data.base_url);
    } catch {
      throw new NewApiError({
        type: 'https://api.company.com/problems/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: 'Invalid URL format',
        validation_errors: {
          'base_url': ['Must be a valid URL']
        }
      });
    }

    // Check for duplicate provider_id
    const existing = connectionSettingsData.find(cs => cs.provider_id === data.provider_id);
    if (existing) {
      throw new NewApiError({
        type: 'https://api.company.com/problems/conflict',
        title: 'Conflict',
        status: 409,
        detail: 'Provider ID already exists',
        validation_errors: {
          'provider_id': ['Provider ID must be unique']
        }
      });
    }
    
    const newConnection: ConnectionSettings = {
      id: `cs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider_id: data.provider_id,
      base_url: data.base_url,
      auth: data.auth,
      secrets_ref: data.secrets_ref,
      timeout_ms: data.timeout_ms,
      rate_limit: data.rate_limit,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'current_user',
      updated_by: 'current_user',
      version: 1
    };
    
    connectionSettingsData.push(newConnection);
    saveConnectionSettings();
    
    return newConnection;
  },

  // Update connection settings
  async update(id: NewConnectionId, data: UpdateConnectionSettingsRequest): Promise<ConnectionSettings> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const index = connectionSettingsData.findIndex(cs => cs.id === id);
    if (index === -1) {
      throw new NewApiError({
        type: 'https://api.company.com/problems/not-found',
        title: 'Connection Not Found',
        status: 404,
        detail: `Connection with ID ${id} not found`
      });
    }
    
    const existing = connectionSettingsData[index];
    
    // Optimistic locking check
    if (existing.version !== data.version) {
      throw new NewApiError({
        type: 'https://api.company.com/problems/conflict',
        title: 'Version Conflict',
        status: 409,
        detail: 'Connection was modified by another user'
      });
    }
    
    // Validate URL if provided
    if (data.base_url) {
      try {
        new URL(data.base_url);
      } catch {
        throw new NewApiError({
          type: 'https://api.company.com/problems/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid URL format',
          validation_errors: {
            'base_url': ['Must be a valid URL']
          }
        });
      }
    }
    
    const updatedConnection = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
      updated_by: 'current_user',
      version: existing.version + 1
    };
    
    connectionSettingsData[index] = updatedConnection;
    saveConnectionSettings();
    
    return updatedConnection;
  },

  // Delete connection settings
  async delete(id: NewConnectionId): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const index = connectionSettingsData.findIndex(cs => cs.id === id);
    if (index === -1) {
      throw new NewApiError({
        type: 'https://api.company.com/problems/not-found',
        title: 'Connection Not Found',
        status: 404,
        detail: `Connection with ID ${id} not found`
      });
    }
    
    connectionSettingsData.splice(index, 1);
    saveConnectionSettings();
  },

  // Test connection
  async test(id: NewConnectionId): Promise<NewConnectionTestResult> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const connection = connectionSettingsData.find(cs => cs.id === id);
    if (!connection) {
      throw new NewApiError({
        type: 'https://api.company.com/problems/not-found',
        title: 'Connection Not Found',
        status: 404,
        detail: `Connection with ID ${id} not found`
      });
    }
    
    // Simulate test result based on connection status
    const success = connection.status === 'active' && !connection.base_url.includes('error');
    
    return {
      success,
      response_time_ms: success ? Math.floor(Math.random() * 1000) + 100 : undefined,
      status_code: success ? 200 : 500,
      error_message: success ? undefined : 'Connection timeout or authentication failed',
      tested_at: new Date().toISOString()
    };
  }
};

// Mock API for Command Templates
export const newTemplatesAPI = {
  // List templates
  async list(params: ListNewTemplatesParams = {}): Promise<ListNewTemplatesResponse> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const allTemplates = getAllTemplates();
    let filtered = [...allTemplates];
    
    // Apply filters
    if (params.template_id) {
      filtered = filtered.filter(t => t.template_id.includes(params.template_id!));
    }
    
    if (params.provider_ref) {
      filtered = filtered.filter(t => t.provider_ref === params.provider_ref);
    }
    
    if (params.scope) {
      filtered = filtered.filter(t => t.scope === params.scope);
    }
    
    if (params.mode) {
      filtered = filtered.filter(t => t.mode === params.mode);
    }
    
    if (params.status) {
      filtered = filtered.filter(t => t.status === params.status);
    }
    
    if (params.is_system !== undefined) {
      filtered = filtered.filter(t => t.is_system === params.is_system);
    }
    
    if (params.search) {
      const searchTerm = params.search.toLowerCase();
      filtered = filtered.filter(t =>
        t.template_id.toLowerCase().includes(searchTerm) ||
        t.name.toLowerCase().includes(searchTerm) ||
        t.description.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply sorting
    const sortBy = params.sort_by || 'created_at';
    const sortOrder = params.sort_order || 'desc';
    
    filtered.sort((a, b) => {
      const aVal = (a as any)[sortBy];
      const bVal = (b as any)[sortBy];
      
      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      else if (aVal > bVal) comparison = 1;
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    // Apply pagination
    const page = params.page || 1;
    const limit = params.limit || 50;
    const total = filtered.length;
    const total_pages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const pageData = filtered.slice(startIndex, endIndex);
    
    return {
      data: pageData,
      total,
      page,
      limit,
      total_pages
    };
  },

  // Get template by ID
  async get(id: NewTemplateId): Promise<NewCommandTemplate> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const allTemplates = getAllTemplates();
    const template = allTemplates.find(t => t.id === id);
    if (!template) {
      throw new NewApiError({
        type: 'https://api.company.com/problems/not-found',
        title: 'Template Not Found',
        status: 404,
        detail: `Template with ID ${id} not found`
      });
    }
    
    return template;
  },

  // Create template
  async create(data: CreateNewTemplateRequest): Promise<NewCommandTemplate> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Validate semantic version format
    const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)))*(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    if (!semverRegex.test(data.version)) {
      throw new NewApiError({
        type: 'https://api.company.com/problems/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: 'Invalid semantic version format',
        validation_errors: {
          'version': ['Must be a valid semantic version (e.g., 1.0.0)']
        }
      });
    }
    
    // Check for duplicate template_id + version combination
    const allTemplates = getAllTemplates();
    const existing = allTemplates.find(t => t.template_id === data.template_id && t.version === data.version);
    if (existing) {
      throw new NewApiError({
        type: 'https://api.company.com/problems/conflict',
        title: 'Conflict',
        status: 409,
        detail: 'Template with this ID and version already exists',
        validation_errors: {
          'template_id': ['Template ID and version combination must be unique'],
          'version': ['Template ID and version combination must be unique']
        }
      });
    }
    
    const newTemplate: NewCommandTemplate = {
      id: `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      template_id: data.template_id,
      version: data.version,
      provider_ref: data.provider_ref,
      scope: data.scope,
      mode: data.mode,
      method: data.method,
      endpoint: data.endpoint,
      schemas: data.schemas,
      retry_policy: data.retry_policy,
      timeout_ms: data.timeout_ms,
      idempotency: data.idempotency,
      name: data.name,
      description: data.description,
      documentation_url: data.documentation_url,
      examples: data.examples,
      status: 'draft', // New templates start as drafts
      is_system: false, // User templates are never system
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'current_user',
      updated_by: 'current_user',
      version_notes: data.version_notes
    };
    
    userTemplatesData.push(newTemplate);
    saveUserTemplates();
    
    return newTemplate;
  },

  // Update template
  async update(id: NewTemplateId, data: UpdateNewTemplateRequest): Promise<NewCommandTemplate> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const index = userTemplatesData.findIndex(t => t.id === id);
    if (index === -1) {
      throw new NewApiError({
        type: 'https://api.company.com/problems/not-found',
        title: 'Template Not Found',
        status: 404,
        detail: `Template with ID ${id} not found or is a system template`
      });
    }
    
    const existing = userTemplatesData[index];
    
    const updatedTemplate = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
      updated_by: 'current_user'
    };
    
    userTemplatesData[index] = updatedTemplate;
    saveUserTemplates();
    
    return updatedTemplate;
  },

  // Clone template
  async clone(id: NewTemplateId, data: CloneTemplateRequest): Promise<NewCommandTemplate> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const allTemplates = getAllTemplates();
    const original = allTemplates.find(t => t.id === id);
    if (!original) {
      throw new NewApiError({
        type: 'https://api.company.com/problems/not-found',
        title: 'Template Not Found',
        status: 404,
        detail: `Template with ID ${id} not found`
      });
    }
    
    // Validate new semantic version
    const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)))*(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    if (!semverRegex.test(data.new_version)) {
      throw new NewApiError({
        type: 'https://api.company.com/problems/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: 'Invalid semantic version format',
        validation_errors: {
          'new_version': ['Must be a valid semantic version (e.g., 1.0.0)']
        }
      });
    }
    
    // Check for duplicate
    const existing = allTemplates.find(t => t.template_id === data.new_template_id && t.version === data.new_version);
    if (existing) {
      throw new NewApiError({
        type: 'https://api.company.com/problems/conflict',
        title: 'Conflict',
        status: 409,
        detail: 'Template with this ID and version already exists'
      });
    }
    
    const clonedTemplate: NewCommandTemplate = {
      ...original,
      id: `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      template_id: data.new_template_id,
      version: data.new_version,
      status: 'draft', // Clones start as drafts
      is_system: false, // Clones are always user templates
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'current_user',
      updated_by: 'current_user',
      version_notes: data.version_notes || `Cloned from ${original.template_id} v${original.version}`
    };
    
    userTemplatesData.push(clonedTemplate);
    saveUserTemplates();
    
    return clonedTemplate;
  },

  // Delete template
  async delete(id: NewTemplateId): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const index = userTemplatesData.findIndex(t => t.id === id);
    if (index === -1) {
      throw new NewApiError({
        type: 'https://api.company.com/problems/not-found',
        title: 'Template Not Found',
        status: 404,
        detail: `Template with ID ${id} not found or cannot be deleted (system template)`
      });
    }
    
    userTemplatesData.splice(index, 1);
    saveUserTemplates();
  },

  // Test template
  async test(id: NewTemplateId): Promise<TemplateTestResult> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const allTemplates = getAllTemplates();
    const template = allTemplates.find(t => t.id === id);
    if (!template) {
      throw new NewApiError({
        type: 'https://api.company.com/problems/not-found',
        title: 'Template Not Found',
        status: 404,
        detail: `Template with ID ${id} not found`
      });
    }
    
    // Simulate validation and test execution
    const hasValidSchemas = template.schemas && Object.keys(template.schemas).length > 0;
    const success = template.status === 'active' && hasValidSchemas;
    
    return {
      success,
      validation_errors: success ? undefined : {
        'schemas': ['Template schemas are required for testing']
      },
      test_execution: success ? {
        request: { test: 'data' },
        response: { success: true, test_result: 'ok' },
        execution_time_ms: Math.floor(Math.random() * 500) + 100
      } : undefined,
      tested_at: new Date().toISOString()
    };
  }
};

// Export current APIs
export const currentConnectionSettingsAPI = connectionSettingsAPI;
export const currentNewTemplatesAPI = newTemplatesAPI;