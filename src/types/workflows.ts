/**
 * Types for workflow automation system
 * Handles automated data synchronization from trading APIs
 */

import { NewCommandTemplate, TemplateScope } from './connections';

// Base types for scheduling
export type ScheduleFrequency = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

export interface ScheduleConfig {
  frequency: ScheduleFrequency;
  interval: number; // every N frequency units
  start_time?: string; // HH:MM format for daily/weekly schedules
  days_of_week?: number[]; // 0-6, Sunday=0, for weekly schedules
  day_of_month?: number; // 1-31 for monthly schedules
  timezone?: string; // IANA timezone, default: system timezone
}

// Workflow execution status
export type WorkflowStatus = 'active' | 'inactive' | 'error' | 'draft';
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

// Notification settings
export interface NotificationConfig {
  enabled: boolean;
  on_success?: boolean;
  on_failure: boolean;
  on_critical_failure: boolean;
  email_recipients?: string[];
  webhook_url?: string;
}

// Retry policy for workflow execution
export interface WorkflowRetryPolicy {
  max_attempts: number;
  backoff: 'fixed' | 'exponential';
  initial_delay_ms: number;
  max_delay_ms: number;
  retry_on_status_codes?: number[];
}

// Endpoint selection for workflow
export interface WorkflowEndpoint {
  template_id: string;
  template_version: string;
  enabled: boolean;
  priority: number; // 1-10, execution order
  parameters?: Record<string, any>; // override template parameters
  conditions?: ExecutionCondition[]; // when to execute this endpoint
}

// Conditions for endpoint execution
export interface ExecutionCondition {
  type: 'time_range' | 'day_of_week' | 'parameter_check' | 'dependency';
  condition: string; // JSON expression or simple condition
  enabled: boolean;
}

// Target scope for workflow execution
export interface WorkflowTarget {
  scope: TemplateScope;
  network_ids?: string[];
  trading_point_ids?: string[];
  equipment_ids?: string[];
  component_ids?: string[];
  include_all?: boolean; // if true, applies to all entities of the scope
}

// Main workflow configuration
export interface Workflow {
  id: string;
  name: string;
  description: string;
  type: WorkflowType;
  status: WorkflowStatus;
  
  // Scheduling
  schedule: ScheduleConfig;
  next_execution?: string; // ISO timestamp
  
  // Endpoints and targets
  endpoints: WorkflowEndpoint[];
  targets: WorkflowTarget;
  
  // Execution settings
  retry_policy: WorkflowRetryPolicy;
  timeout_ms: number;
  max_concurrent_executions: number;
  
  // Notifications
  notifications: NotificationConfig;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  version: number;
  tags?: string[];
  
  // Statistics
  last_execution?: WorkflowExecution;
  success_rate?: number; // 0-100
  average_duration_ms?: number;
}

// Workflow types/categories
export type WorkflowType = 
  | 'price_sync'           // Price synchronization
  | 'equipment_monitor'    // Equipment status monitoring  
  | 'inventory_sync'       // Inventory and services sync
  | 'full_sync'           // Complete data synchronization
  | 'custom';             // Custom user-defined workflow

// Workflow execution record
export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: ExecutionStatus;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  
  // Execution details
  endpoints_executed: EndpointExecution[];
  targets_processed: number;
  targets_successful: number;
  targets_failed: number;
  
  // Error information
  error_message?: string;
  error_details?: Record<string, any>;
  
  // Execution context
  triggered_by: 'schedule' | 'manual' | 'api' | 'webhook';
  triggered_by_user?: string;
  execution_node?: string; // for distributed execution
  
  // Results summary
  summary: ExecutionSummary;
}

// Individual endpoint execution within workflow
export interface EndpointExecution {
  template_id: string;
  template_version: string;
  status: ExecutionStatus;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  
  // Target-specific results
  target_results: TargetResult[];
  
  // Endpoint-level errors
  error_message?: string;
  retry_attempts: number;
}

// Result for each target (network/point/equipment/component)
export interface TargetResult {
  target_id: string;
  target_type: TemplateScope;
  target_name: string;
  status: ExecutionStatus;
  
  // API call results
  request_data?: Record<string, any>;
  response_data?: Record<string, any>;
  response_time_ms?: number;
  http_status?: number;
  
  // Data synchronization results
  records_updated?: number;
  records_created?: number;
  records_deleted?: number;
  
  // Error details
  error_message?: string;
  error_code?: string;
}

// Execution summary for reporting
export interface ExecutionSummary {
  total_api_calls: number;
  successful_api_calls: number;
  failed_api_calls: number;
  total_records_processed: number;
  records_updated: number;
  records_created: number;
  records_deleted: number;
  
  // Performance metrics
  average_response_time_ms: number;
  total_data_transferred_mb: number;
  
  // Error breakdown
  error_breakdown: Record<string, number>; // error_type -> count
}

// Request/Response types for API
export interface CreateWorkflowRequest {
  name: string;
  description: string;
  type: WorkflowType;
  schedule: ScheduleConfig;
  endpoints: Omit<WorkflowEndpoint, 'template_version'>[]; // version resolved automatically
  targets: WorkflowTarget;
  retry_policy?: Partial<WorkflowRetryPolicy>;
  timeout_ms?: number;
  max_concurrent_executions?: number;
  notifications?: Partial<NotificationConfig>;
  tags?: string[];
}

export interface UpdateWorkflowRequest extends Partial<CreateWorkflowRequest> {
  version: number; // for optimistic locking
  status?: WorkflowStatus;
}

export interface ListWorkflowsParams {
  type?: WorkflowType;
  status?: WorkflowStatus;
  scope?: TemplateScope;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ListWorkflowsResponse {
  data: Workflow[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ListExecutionsParams {
  workflow_id?: string;
  status?: ExecutionStatus;
  triggered_by?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ListExecutionsResponse {
  data: WorkflowExecution[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Manual execution request
export interface ExecuteWorkflowRequest {
  workflow_id: string;
  override_schedule?: boolean;
  custom_parameters?: Record<string, any>;
  target_override?: Partial<WorkflowTarget>;
}

// Workflow validation result
export interface WorkflowValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

// Statistics and monitoring
export interface WorkflowStats {
  workflow_id: string;
  
  // Execution statistics
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  success_rate: number;
  
  // Performance metrics
  average_duration_ms: number;
  min_duration_ms: number;
  max_duration_ms: number;
  
  // Recent activity
  last_execution_at?: string;
  next_execution_at?: string;
  
  // Data processing stats
  total_records_processed: number;
  total_api_calls: number;
  average_records_per_execution: number;
  
  // Error analysis
  most_common_errors: Array<{
    error_type: string;
    count: number;
    percentage: number;
  }>;
  
  // Time period for statistics
  stats_period_start: string;
  stats_period_end: string;
}

// Export utility types
export type WorkflowId = string;
export type ExecutionId = string;

// Default configurations
export const DEFAULT_RETRY_POLICY: WorkflowRetryPolicy = {
  max_attempts: 3,
  backoff: 'exponential',
  initial_delay_ms: 1000,
  max_delay_ms: 30000,
  retry_on_status_codes: [408, 429, 500, 502, 503, 504]
};

export const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  enabled: true,
  on_success: false,
  on_failure: true,
  on_critical_failure: true
};

// Workflow type configurations
export const WORKFLOW_TYPE_CONFIGS = {
  price_sync: {
    name: 'Синхронизация цен',
    description: 'Автоматическое обновление цен с торговых точек',
    icon: '💰',
    default_endpoints: ['autooplata_get_prices', 'autooplata_set_prices'],
    default_schedule: { frequency: 'minutes' as const, interval: 15 }
  },
  equipment_monitor: {
    name: 'Мониторинг оборудования',
    description: 'Отслеживание статусов оборудования и компонентов',
    icon: '⚙️',
    default_endpoints: ['autooplata_equipment_status', 'autooplata_equipment_status_extended'],
    default_schedule: { frequency: 'minutes' as const, interval: 5 }
  },
  inventory_sync: {
    name: 'Синхронизация товаров',
    description: 'Обновление справочников услуг и номенклатуры',
    icon: '📦',
    default_endpoints: ['autooplata_get_services'],
    default_schedule: { frequency: 'hours' as const, interval: 6 }
  },
  full_sync: {
    name: 'Полная синхронизация',
    description: 'Комплексное обновление всех данных',
    icon: '🔄',
    default_endpoints: ['autooplata_get_prices', 'autooplata_get_services', 'autooplata_equipment_status'],
    default_schedule: { frequency: 'hours' as const, interval: 1 }
  },
  custom: {
    name: 'Произвольный',
    description: 'Настраиваемый регламент с выбранными endpoints',
    icon: '🔧',
    default_endpoints: [],
    default_schedule: { frequency: 'hours' as const, interval: 1 }
  }
} as const;