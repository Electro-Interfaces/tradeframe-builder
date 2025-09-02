/**
 * Mock data store for Workflows (Регламенты)
 * Provides realistic test data for automated synchronization system
 */

import {
  Workflow,
  WorkflowExecution,
  WorkflowType,
  WorkflowStatus,
  ExecutionStatus,
  ScheduleConfig,
  WorkflowTarget,
  WorkflowEndpoint,
  ExecutionSummary,
  DEFAULT_RETRY_POLICY,
  DEFAULT_NOTIFICATION_CONFIG,
  WORKFLOW_TYPE_CONFIGS
} from '@/types/workflows';

// Helper to generate UUIDv7-like IDs
const generateId = () => `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateExecutionId = () => `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper to generate realistic timestamps
const getRandomPastDate = (daysBack: number) => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  return date.toISOString();
};

const getFutureDate = (minutesAhead: number) => {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutesAhead);
  return date.toISOString();
};

// Sample workflow endpoints configurations
const PRICE_SYNC_ENDPOINTS: WorkflowEndpoint[] = [
  {
    template_id: 'autooplata_get_prices',
    template_version: '1.0.0',
    enabled: true,
    priority: 1,
    parameters: { system: 15 }
  },
  {
    template_id: 'autooplata_set_prices',
    template_version: '1.0.0', 
    enabled: false, // Usually disabled for read-only sync
    priority: 2,
    parameters: { system: 15 }
  }
];

const EQUIPMENT_MONITOR_ENDPOINTS: WorkflowEndpoint[] = [
  {
    template_id: 'autooplata_equipment_status',
    template_version: '1.0.0',
    enabled: true,
    priority: 1,
    parameters: { system: 15 }
  },
  {
    template_id: 'autooplata_equipment_status_extended',
    template_version: '1.0.0',
    enabled: true,
    priority: 2,
    parameters: { system: 15 }
  }
];

const INVENTORY_SYNC_ENDPOINTS: WorkflowEndpoint[] = [
  {
    template_id: 'autooplata_get_services',
    template_version: '1.0.0',
    enabled: true,
    priority: 1,
    parameters: { system: 15 }
  }
];

const FULL_SYNC_ENDPOINTS: WorkflowEndpoint[] = [
  ...PRICE_SYNC_ENDPOINTS,
  ...EQUIPMENT_MONITOR_ENDPOINTS,
  ...INVENTORY_SYNC_ENDPOINTS
];

// Sample execution summaries
const createExecutionSummary = (success: boolean): ExecutionSummary => ({
  total_api_calls: success ? Math.floor(Math.random() * 50) + 10 : Math.floor(Math.random() * 20) + 5,
  successful_api_calls: success ? Math.floor(Math.random() * 45) + 40 : Math.floor(Math.random() * 10) + 2,
  failed_api_calls: success ? Math.floor(Math.random() * 5) : Math.floor(Math.random() * 15) + 5,
  total_records_processed: success ? Math.floor(Math.random() * 500) + 100 : Math.floor(Math.random() * 100) + 20,
  records_updated: success ? Math.floor(Math.random() * 300) + 50 : Math.floor(Math.random() * 50) + 10,
  records_created: success ? Math.floor(Math.random() * 50) + 10 : Math.floor(Math.random() * 10) + 2,
  records_deleted: Math.floor(Math.random() * 10),
  average_response_time_ms: success ? Math.floor(Math.random() * 500) + 200 : Math.floor(Math.random() * 2000) + 1000,
  total_data_transferred_mb: Number((Math.random() * 10 + 1).toFixed(2)),
  error_breakdown: success 
    ? { 'timeout': 1, 'rate_limit': 2 }
    : { 'connection_error': 5, 'authentication_failed': 3, 'timeout': 7 }
});

// Mock workflows data
const workflowsData: Workflow[] = [
  {
    id: generateId(),
    name: 'Синхронизация цен АЗС сети Autooplata',
    description: 'Автоматическое обновление цен на топливо каждые 15 минут с АЗС сети Autooplata TMS',
    type: 'price_sync',
    status: 'active',
    
    schedule: {
      frequency: 'minutes',
      interval: 15,
      timezone: 'Europe/Moscow'
    },
    next_execution: getFutureDate(Math.floor(Math.random() * 15) + 1),
    
    endpoints: PRICE_SYNC_ENDPOINTS,
    targets: {
      scope: 'trading_point',
      network_ids: ['net_autooplata_001'],
      include_all: false,
      trading_point_ids: ['tp_001', 'tp_002', 'tp_003', 'tp_004']
    },
    
    retry_policy: DEFAULT_RETRY_POLICY,
    timeout_ms: 30000,
    max_concurrent_executions: 5,
    
    notifications: {
      ...DEFAULT_NOTIFICATION_CONFIG,
      email_recipients: ['ops@company.com']
    },
    
    created_at: getRandomPastDate(30),
    updated_at: getRandomPastDate(7),
    created_by: 'admin',
    updated_by: 'integration_manager',
    version: 3,
    tags: ['autooplata', 'prices', 'critical'],
    
    success_rate: 94.2,
    average_duration_ms: 12500
  },
  
  {
    id: generateId(),
    name: 'Мониторинг состояния оборудования',
    description: 'Проверка статусов всех устройств на АЗС каждые 5 минут для раннего обнаружения неисправностей',
    type: 'equipment_monitor',
    status: 'active',
    
    schedule: {
      frequency: 'minutes',
      interval: 5,
      timezone: 'Europe/Moscow'
    },
    next_execution: getFutureDate(Math.floor(Math.random() * 5) + 1),
    
    endpoints: EQUIPMENT_MONITOR_ENDPOINTS,
    targets: {
      scope: 'equipment',
      network_ids: ['net_autooplata_001'],
      include_all: true
    },
    
    retry_policy: {
      ...DEFAULT_RETRY_POLICY,
      max_attempts: 2, // Quick retries for monitoring
      max_delay_ms: 10000
    },
    timeout_ms: 15000,
    max_concurrent_executions: 10,
    
    notifications: {
      ...DEFAULT_NOTIFICATION_CONFIG,
      on_success: false,
      on_failure: true,
      email_recipients: ['maintenance@company.com', 'ops@company.com']
    },
    
    created_at: getRandomPastDate(60),
    updated_at: getRandomPastDate(1),
    created_by: 'system',
    updated_by: 'maintenance_lead',
    version: 7,
    tags: ['autooplata', 'equipment', 'monitoring', 'critical'],
    
    success_rate: 98.7,
    average_duration_ms: 8200
  },
  
  {
    id: generateId(),
    name: 'Обновление справочника услуг',
    description: 'Синхронизация номенклатуры топливных услуг каждые 6 часов',
    type: 'inventory_sync',
    status: 'active',
    
    schedule: {
      frequency: 'hours',
      interval: 6,
      start_time: '02:00',
      timezone: 'Europe/Moscow'
    },
    next_execution: getFutureDate(Math.floor(Math.random() * 360) + 60),
    
    endpoints: INVENTORY_SYNC_ENDPOINTS,
    targets: {
      scope: 'network',
      network_ids: ['net_autooplata_001'],
      include_all: false
    },
    
    retry_policy: DEFAULT_RETRY_POLICY,
    timeout_ms: 20000,
    max_concurrent_executions: 3,
    
    notifications: DEFAULT_NOTIFICATION_CONFIG,
    
    created_at: getRandomPastDate(90),
    updated_at: getRandomPastDate(14),
    created_by: 'data_manager',
    updated_by: 'data_manager',
    version: 2,
    tags: ['autooplata', 'inventory', 'services'],
    
    success_rate: 99.1,
    average_duration_ms: 5800
  },
  
  {
    id: generateId(),
    name: 'Полная синхронизация данных',
    description: 'Комплексное обновление всех данных сети в нерабочее время',
    type: 'full_sync',
    status: 'active',
    
    schedule: {
      frequency: 'hours',
      interval: 24,
      start_time: '01:30',
      timezone: 'Europe/Moscow'
    },
    next_execution: getFutureDate(Math.floor(Math.random() * 1440) + 60),
    
    endpoints: FULL_SYNC_ENDPOINTS.map(ep => ({ ...ep, priority: ep.priority + 10 })),
    targets: {
      scope: 'network',
      include_all: true
    },
    
    retry_policy: {
      ...DEFAULT_RETRY_POLICY,
      max_attempts: 5, // More retries for comprehensive sync
      max_delay_ms: 60000
    },
    timeout_ms: 120000, // 2 minutes timeout for full sync
    max_concurrent_executions: 2,
    
    notifications: {
      ...DEFAULT_NOTIFICATION_CONFIG,
      on_success: true, // Notify on successful full sync
      email_recipients: ['ops@company.com', 'data_manager@company.com']
    },
    
    created_at: getRandomPastDate(120),
    updated_at: getRandomPastDate(3),
    created_by: 'admin',
    updated_by: 'ops_manager',
    version: 4,
    tags: ['autooplata', 'full_sync', 'daily'],
    
    success_rate: 87.5,
    average_duration_ms: 45000
  },
  
  {
    id: generateId(),
    name: 'Тестовый регламент (отключен)',
    description: 'Тестовая конфигурация для отладки новых endpoints',
    type: 'custom',
    status: 'inactive',
    
    schedule: {
      frequency: 'minutes',
      interval: 30,
      timezone: 'Europe/Moscow'
    },
    
    endpoints: [
      {
        template_id: 'autooplata_login',
        template_version: '1.0.0',
        enabled: true,
        priority: 1
      }
    ],
    targets: {
      scope: 'trading_point',
      trading_point_ids: ['tp_test_001'],
      include_all: false
    },
    
    retry_policy: DEFAULT_RETRY_POLICY,
    timeout_ms: 10000,
    max_concurrent_executions: 1,
    
    notifications: {
      enabled: false,
      on_failure: false,
      on_critical_failure: false
    },
    
    created_at: getRandomPastDate(5),
    updated_at: getRandomPastDate(2),
    created_by: 'developer',
    updated_by: 'developer',
    version: 1,
    tags: ['test', 'development'],
    
    success_rate: 75.0,
    average_duration_ms: 3200
  },
  
  {
    id: generateId(),
    name: 'Аварийная синхронизация цен',
    description: 'Регламент для экстренного обновления цен при сбоях основной системы',
    type: 'price_sync',
    status: 'error',
    
    schedule: {
      frequency: 'minutes',
      interval: 60,
      timezone: 'Europe/Moscow'
    },
    
    endpoints: PRICE_SYNC_ENDPOINTS,
    targets: {
      scope: 'trading_point',
      network_ids: ['net_autooplata_001'],
      trading_point_ids: ['tp_005', 'tp_006'],
      include_all: false
    },
    
    retry_policy: DEFAULT_RETRY_POLICY,
    timeout_ms: 25000,
    max_concurrent_executions: 2,
    
    notifications: {
      ...DEFAULT_NOTIFICATION_CONFIG,
      on_critical_failure: true,
      email_recipients: ['emergency@company.com', 'ops@company.com']
    },
    
    created_at: getRandomPastDate(10),
    updated_at: getRandomPastDate(1),
    created_by: 'ops_manager',
    updated_by: 'ops_manager',
    version: 2,
    tags: ['autooplata', 'emergency', 'prices'],
    
    success_rate: 34.2,
    average_duration_ms: 18500
  }
];

// Generate recent executions for workflows
const generateExecutionsForWorkflow = (workflow: Workflow, count: number): WorkflowExecution[] => {
  const executions: WorkflowExecution[] = [];
  
  for (let i = 0; i < count; i++) {
    const isSuccess = workflow.success_rate ? Math.random() * 100 < workflow.success_rate : false;
    const status: ExecutionStatus = isSuccess ? 'completed' : 'failed';
    const startedAt = getRandomPastDate(7);
    const duration = Math.floor(Math.random() * 30000) + 5000;
    const completedAt = new Date(new Date(startedAt).getTime() + duration).toISOString();
    
    executions.push({
      id: generateExecutionId(),
      workflow_id: workflow.id,
      status,
      started_at: startedAt,
      completed_at: completedAt,
      duration_ms: duration,
      
      endpoints_executed: workflow.endpoints.map(endpoint => ({
        template_id: endpoint.template_id,
        template_version: endpoint.template_version,
        status: isSuccess ? 'completed' : (Math.random() > 0.5 ? 'failed' : 'completed'),
        started_at: startedAt,
        completed_at: completedAt,
        duration_ms: Math.floor(duration / workflow.endpoints.length),
        target_results: [],
        retry_attempts: isSuccess ? 0 : Math.floor(Math.random() * 3)
      })),
      
      targets_processed: workflow.targets.include_all ? Math.floor(Math.random() * 20) + 5 : 
                        (workflow.targets.trading_point_ids?.length || 1),
      targets_successful: isSuccess ? Math.floor(Math.random() * 15) + 10 : Math.floor(Math.random() * 5) + 1,
      targets_failed: isSuccess ? Math.floor(Math.random() * 3) : Math.floor(Math.random() * 10) + 5,
      
      error_message: isSuccess ? undefined : 'Connection timeout to Autooplata TMS API',
      
      triggered_by: i === 0 ? 'manual' : 'schedule',
      triggered_by_user: i === 0 ? 'ops_manager' : undefined,
      
      summary: createExecutionSummary(isSuccess)
    });
  }
  
  return executions.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
};

// Generate executions for all workflows
const executionsData: WorkflowExecution[] = workflowsData.flatMap(workflow => 
  generateExecutionsForWorkflow(workflow, Math.floor(Math.random() * 10) + 5)
);

// Update workflows with last execution info
workflowsData.forEach(workflow => {
  const lastExecution = executionsData
    .filter(ex => ex.workflow_id === workflow.id)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0];
  
  if (lastExecution) {
    workflow.last_execution = lastExecution;
  }
});

// Store interface
export const workflowsStore = {
  // Get all workflows
  getAll(): Workflow[] {
    return [...workflowsData];
  },
  
  // Get workflow by ID
  getById(id: string): Workflow | undefined {
    return workflowsData.find(w => w.id === id);
  },
  
  // Get workflows by type
  getByType(type: WorkflowType): Workflow[] {
    return workflowsData.filter(w => w.type === type);
  },
  
  // Get workflows by status
  getByStatus(status: WorkflowStatus): Workflow[] {
    return workflowsData.filter(w => w.status === status);
  },
  
  // Get active workflows
  getActive(): Workflow[] {
    return workflowsData.filter(w => w.status === 'active');
  },
  
  // Search workflows
  search(query: string): Workflow[] {
    const searchTerm = query.toLowerCase();
    return workflowsData.filter(w =>
      w.name.toLowerCase().includes(searchTerm) ||
      w.description.toLowerCase().includes(searchTerm) ||
      w.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  },
  
  // Get workflows with pagination and filtering
  getFiltered(params: {
    type?: WorkflowType;
    status?: WorkflowStatus;
    search?: string;
    tags?: string[];
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }) {
    let filtered = [...workflowsData];
    
    // Apply filters
    if (params.type) {
      filtered = filtered.filter(w => w.type === params.type);
    }
    
    if (params.status) {
      filtered = filtered.filter(w => w.status === params.status);
    }
    
    if (params.search) {
      const searchTerm = params.search.toLowerCase();
      filtered = filtered.filter(w =>
        w.name.toLowerCase().includes(searchTerm) ||
        w.description.toLowerCase().includes(searchTerm) ||
        w.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }
    
    if (params.tags && params.tags.length > 0) {
      filtered = filtered.filter(w =>
        params.tags!.some(tag => w.tags?.includes(tag))
      );
    }
    
    // Apply sorting
    if (params.sort_by) {
      filtered.sort((a, b) => {
        const aVal = (a as any)[params.sort_by!];
        const bVal = (b as any)[params.sort_by!];
        
        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        else if (aVal > bVal) comparison = 1;
        
        return params.sort_order === 'desc' ? -comparison : comparison;
      });
    }
    
    // Apply pagination
    const page = params.page || 1;
    const limit = params.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filtered.slice(startIndex, endIndex);
    
    return {
      data: paginatedData,
      total: filtered.length,
      page,
      limit,
      total_pages: Math.ceil(filtered.length / limit)
    };
  },
  
  // Get all executions
  getAllExecutions(): WorkflowExecution[] {
    return [...executionsData];
  },
  
  // Get executions by workflow ID
  getExecutionsByWorkflowId(workflowId: string): WorkflowExecution[] {
    return executionsData
      .filter(ex => ex.workflow_id === workflowId)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  },
  
  // Get recent executions
  getRecentExecutions(limit: number = 10): WorkflowExecution[] {
    return [...executionsData]
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .slice(0, limit);
  },
  
  // Get workflow statistics
  getWorkflowStats(workflowId: string) {
    const workflow = this.getById(workflowId);
    const executions = this.getExecutionsByWorkflowId(workflowId);
    
    if (!workflow || executions.length === 0) {
      return null;
    }
    
    const successfulExecutions = executions.filter(ex => ex.status === 'completed');
    const failedExecutions = executions.filter(ex => ex.status === 'failed');
    
    return {
      workflow_id: workflowId,
      total_executions: executions.length,
      successful_executions: successfulExecutions.length,
      failed_executions: failedExecutions.length,
      success_rate: (successfulExecutions.length / executions.length) * 100,
      
      average_duration_ms: executions
        .filter(ex => ex.duration_ms)
        .reduce((sum, ex) => sum + (ex.duration_ms || 0), 0) / executions.length,
      
      last_execution_at: executions[0]?.started_at,
      next_execution_at: workflow.next_execution,
      
      total_records_processed: executions
        .reduce((sum, ex) => sum + ex.summary.total_records_processed, 0),
      
      total_api_calls: executions
        .reduce((sum, ex) => sum + ex.summary.total_api_calls, 0),
      
      most_common_errors: [
        { error_type: 'Connection timeout', count: 15, percentage: 45.5 },
        { error_type: 'Authentication failed', count: 8, percentage: 24.2 },
        { error_type: 'Rate limit exceeded', count: 6, percentage: 18.2 },
        { error_type: 'Invalid response', count: 4, percentage: 12.1 }
      ],
      
      stats_period_start: executions[executions.length - 1]?.started_at,
      stats_period_end: executions[0]?.started_at
    };
  }
};

// Export available workflow types and their configurations
export { WORKFLOW_TYPE_CONFIGS };

// Export default configurations
export const DEFAULT_WORKFLOW_CONFIG = {
  retry_policy: DEFAULT_RETRY_POLICY,
  notifications: DEFAULT_NOTIFICATION_CONFIG,
  timeout_ms: 30000,
  max_concurrent_executions: 3
};