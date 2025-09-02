export interface Connection {
  id: string;
  name: string;
  type: 'API_DB' | 'API_NETWORK';
  connectionType: '1C' | 'ERP' | 'BI' | 'OTHER';
  purpose: string;
  baseUrl: string;
  transport: 'HTTPS' | 'SFTP' | 'WEBHOOK';
  format: 'JSON' | 'XML' | 'CSV';
  auth: {
    type: 'NONE' | 'API_KEY' | 'BASIC' | 'OAUTH2_CC' | 'MTLS';
    apiKey?: string;
    username?: string;
    password?: string;
    clientId?: string;
    clientSecret?: string;
    tokenUrl?: string;
    certPath?: string;
    keyPath?: string;
    caPath?: string;
  };
  exchangeParams: {
    endpoints: string[];
    headers: Record<string, string>;
    schedule?: string; // CRON format
    retries: number;
    rateLimit: number;
  };
  security: {
    signingSecret?: string;
    ipAllowlist: string[];
  };
  isEnabled: boolean;
  tags: string[];
  responsible?: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConnectionRequest {
  name: string;
  connectionType: '1C' | 'ERP' | 'BI' | 'OTHER';
  purpose: string;
  baseUrl: string;
  transport: 'HTTPS' | 'SFTP' | 'WEBHOOK';
  format: 'JSON' | 'XML' | 'CSV';
  auth: Connection['auth'];
  exchangeParams: Connection['exchangeParams'];
  security: Connection['security'];
  isEnabled?: boolean;
  tags?: string[];
  responsible?: string;
}

export interface UpdateConnectionRequest {
  name?: string;
  connectionType?: '1C' | 'ERP' | 'BI' | 'OTHER';
  purpose?: string;
  baseUrl?: string;
  transport?: 'HTTPS' | 'SFTP' | 'WEBHOOK';
  format?: 'JSON' | 'XML' | 'CSV';
  auth?: Connection['auth'];
  exchangeParams?: Connection['exchangeParams'];
  security?: Connection['security'];
  isEnabled?: boolean;
  tags?: string[];
  responsible?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  ping?: number;
  error?: string;
}

export interface ConnectionsApiResponse {
  connections: Connection[];
  total: number;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

// ===============================================
// NEW TYPES FOR TEMPLATES & CONNECTIONS SYSTEM
// ===============================================

// Base types for new system
export type NewConnectionId = string; // UUIDv7
export type NewTemplateId = string; // UUIDv7
export type ProviderId = string;
export type SecretsRef = string; // Reference to external secrets store

// Authentication types
export type AuthType = 'api_key' | 'bearer' | 'none';
export type AuthLocation = 'header' | 'query';

// Template scope and operations
export type TemplateScope = 'network' | 'trading_point' | 'equipment' | 'component';
export type TemplateMode = 'pull' | 'push';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Status types
export type ConnectionStatus = 'active' | 'inactive' | 'error' | 'testing';
export type TemplateStatus = 'active' | 'inactive' | 'deprecated' | 'draft';

// New Connection Settings Interface
export interface ConnectionSettings {
  id: NewConnectionId;
  provider_id: ProviderId;
  base_url: string;
  auth: {
    type: AuthType;
    location?: AuthLocation;
    name?: string; // Header name or query parameter name
  };
  secrets_ref?: SecretsRef;
  timeout_ms: number;
  rate_limit?: number; // requests per minute
  status: ConnectionStatus;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  version: number; // For optimistic locking
}

// Retry policy configuration
export interface RetryPolicy {
  max_attempts: number;
  backoff: 'linear' | 'exponential' | 'fixed';
  initial_delay_ms: number;
  max_delay_ms: number;
  retry_on_status_codes: number[];
}

// JSON Schema for API contract validation
export interface ApiSchema {
  path_params?: Record<string, any>; // JSON Schema
  query_params?: Record<string, any>; // JSON Schema
  headers?: Record<string, any>; // JSON Schema
  request_body?: Record<string, any>; // JSON Schema
  response_body?: Record<string, any>; // JSON Schema
}

// New Command Template Interface
export interface NewCommandTemplate {
  id: NewTemplateId;
  template_id: string; // Human-readable identifier
  version: string; // SemVer format
  provider_ref: NewConnectionId;
  scope: TemplateScope;
  mode: TemplateMode;
  
  // API Definition
  method: HttpMethod;
  endpoint: string; // URL path template with variables
  
  // Validation schemas
  schemas: ApiSchema;
  
  // Execution settings
  retry_policy: RetryPolicy;
  timeout_ms: number;
  idempotency: {
    enabled: boolean;
    key_header?: string;
  };
  
  // Metadata
  name: string;
  description: string;
  documentation_url?: string;
  examples?: Array<{
    name: string;
    description: string;
    request: any;
    response: any;
  }>;
  
  // Status and lifecycle
  status: TemplateStatus;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  version_notes?: string;
}

// API Request/Response types for new system
export interface CreateConnectionSettingsRequest {
  provider_id: ProviderId;
  base_url: string;
  auth: {
    type: AuthType;
    location?: AuthLocation;
    name?: string;
  };
  secrets_ref?: SecretsRef;
  timeout_ms: number;
  rate_limit?: number;
}

export interface UpdateConnectionSettingsRequest extends Partial<CreateConnectionSettingsRequest> {
  version: number; // For optimistic locking
}

export interface CreateNewTemplateRequest {
  template_id: string;
  version: string;
  provider_ref: NewConnectionId;
  scope: TemplateScope;
  mode: TemplateMode;
  method: HttpMethod;
  endpoint: string;
  schemas: ApiSchema;
  retry_policy: RetryPolicy;
  timeout_ms: number;
  idempotency: {
    enabled: boolean;
    key_header?: string;
  };
  name: string;
  description: string;
  documentation_url?: string;
  examples?: Array<{
    name: string;
    description: string;
    request: any;
    response: any;
  }>;
  version_notes?: string;
}

export interface UpdateNewTemplateRequest extends Partial<CreateNewTemplateRequest> {
  status?: TemplateStatus;
}

export interface CloneTemplateRequest {
  new_template_id: string;
  new_version: string;
  version_notes?: string;
}

// List/Filter types for new system
export interface ListConnectionSettingsParams {
  provider_id?: ProviderId;
  status?: ConnectionStatus;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: 'provider_id' | 'base_url' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

export interface ListNewTemplatesParams {
  template_id?: string;
  provider_ref?: NewConnectionId;
  scope?: TemplateScope;
  mode?: TemplateMode;
  status?: TemplateStatus;
  is_system?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: 'template_id' | 'version' | 'scope' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

// Response types for new system
export interface ListConnectionSettingsResponse {
  data: ConnectionSettings[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ListNewTemplatesResponse {
  data: NewCommandTemplate[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Permission-related types for new system
export interface ConnectionSettingsPermissions {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_test: boolean;
}

export interface NewTemplatePermissions {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_clone: boolean;
  can_version: boolean;
  can_delete: boolean;
  can_execute: boolean;
}

// Error handling for new system (RFC 7807)
export interface NewApiError {
  type: string; // RFC 7807 problem type
  title: string;
  status: number;
  detail: string;
  instance?: string;
  trace_id?: string;
  validation_errors?: Record<string, string[]>;
}

// Testing and health check for new system
export interface NewConnectionTestResult {
  success: boolean;
  response_time_ms?: number;
  status_code?: number;
  error_message?: string;
  tested_at: string;
}

export interface TemplateTestResult {
  success: boolean;
  validation_errors?: Record<string, string[]>;
  test_execution?: {
    request: any;
    response: any;
    execution_time_ms: number;
  };
  tested_at: string;
}