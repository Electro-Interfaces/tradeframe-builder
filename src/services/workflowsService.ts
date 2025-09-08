/**
 * Service for managing workflow automation
 * ОБНОВЛЕН: Интегрирован с централизованной конфигурацией  
 * Поддерживает переключение между localStorage и Supabase
 */

import { 
  Workflow, 
  WorkflowExecution, 
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  ListWorkflowsParams,
  ListWorkflowsResponse,
  ListExecutionsParams,
  ListExecutionsResponse,
  ExecuteWorkflowRequest,
  WorkflowValidationResult,
  WorkflowStats,
  WorkflowStatus,
  ExecutionStatus,
  DEFAULT_RETRY_POLICY,
  DEFAULT_NOTIFICATION_CONFIG
} from '@/types/workflows';

// Mock данные удалены, используется localStorage или Supabase
import { apiConfigServiceDB } from './apiConfigServiceDB';
import { WorkflowsSupabaseService } from './workflowsSupabaseService';

class WorkflowsService {
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private runningExecutions: Set<string> = new Set();
  private workflowsSupabaseService: WorkflowsSupabaseService = new WorkflowsSupabaseService();

  constructor() {
    // Данные загружаются по требованию из localStorage или Supabase
  }

  async initialize(): Promise<void> {
    try {
      await apiConfigServiceDB.initialize();
      console.log('✅ WorkflowsService инициализирован');
    } catch (error) {
      console.warn('⚠️ Ошибка инициализации WorkflowsService:', error);
    }
  }

  async isMockMode(): Promise<boolean> {
    try {
      return await apiConfigServiceDB.isMockMode();
    } catch (error) {
      return true;
    }
  }

  // Mock данные удалены - используется Supabase или localStorage

  private generateId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // CRUD Operations
  async listWorkflows(params: ListWorkflowsParams = {}): Promise<ListWorkflowsResponse> {
    try {
      const isMock = await this.isMockMode();
      
      if (isMock) {
        console.log('🔄 WorkflowsService.listWorkflows: Используется localStorage режим');
        return this.processLocalStorageWorkflows(params);
      } else {
        console.log('🔄 WorkflowsService.listWorkflows: Используется Supabase режим');
        try {
          return await this.workflowsSupabaseService.listWorkflows(params);
        } catch (error) {
          console.warn('⚠️ Fallback на localStorage:', error);
          return this.processLocalStorageWorkflows(params);
        }
      }
    } catch (error) {
      console.error('❌ Ошибка получения списка workflow:', error);
      return this.processLocalStorageWorkflows(params);
    }
  }

  private processLocalStorageWorkflows(params: ListWorkflowsParams): ListWorkflowsResponse {
    let workflows = Array.from(this.workflows.values());

    // Apply filters
    if (params.type) {
      workflows = workflows.filter(w => w.type === params.type);
    }
    if (params.status) {
      workflows = workflows.filter(w => w.status === params.status);
    }
    if (params.search) {
      const search = params.search.toLowerCase();
      workflows = workflows.filter(w => 
        w.name.toLowerCase().includes(search) ||
        w.description.toLowerCase().includes(search)
      );
    }
    if (params.tags?.length) {
      workflows = workflows.filter(w => 
        params.tags!.some(tag => w.tags?.includes(tag))
      );
    }

    // Apply sorting
    const sortBy = params.sort_by || 'created_at';
    const sortOrder = params.sort_order || 'desc';
    workflows.sort((a, b) => {
      const aVal = (a as any)[sortBy];
      const bVal = (b as any)[sortBy];
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Apply pagination
    const page = params.page || 1;
    const limit = params.limit || 20;
    const total = workflows.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedWorkflows = workflows.slice(startIndex, endIndex);

    return {
      data: paginatedWorkflows,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit)
    };
  }

  async getWorkflow(id: string): Promise<Workflow | null> {
    try {
      const isMock = await this.isMockMode();
      
      if (isMock) {
        console.log(`🔄 WorkflowsService.getWorkflow(${id}): Используется localStorage режим`);
        return this.workflows.get(id) || null;
      } else {
        console.log(`🔄 WorkflowsService.getWorkflow(${id}): Используется Supabase режим`);
        try {
          return await this.workflowsSupabaseService.getWorkflow(id);
        } catch (error) {
          console.warn('⚠️ Fallback на localStorage:', error);
          return this.workflows.get(id) || null;
        }
      }
    } catch (error) {
      console.error(`❌ Ошибка получения workflow ${id}:`, error);
      return this.workflows.get(id) || null;
    }
  }

  async createWorkflow(request: CreateWorkflowRequest): Promise<Workflow> {
    const now = new Date().toISOString();
    const workflow: Workflow = {
      id: this.generateId(),
      ...request,
      status: 'draft' as WorkflowStatus,
      retry_policy: { ...DEFAULT_RETRY_POLICY, ...request.retry_policy },
      timeout_ms: request.timeout_ms || 30000,
      max_concurrent_executions: request.max_concurrent_executions || 1,
      notifications: { ...DEFAULT_NOTIFICATION_CONFIG, ...request.notifications },
      created_at: now,
      updated_at: now,
      created_by: 'current_user', // TODO: get from auth context
      updated_by: 'current_user',
      version: 1,
      endpoints: request.endpoints.map(ep => ({
        ...ep,
        template_version: '1.0.0' // TODO: resolve from templates service
      }))
    };

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  async updateWorkflow(id: string, request: UpdateWorkflowRequest): Promise<Workflow | null> {
    const existing = this.workflows.get(id);
    if (!existing) {
      return null;
    }

    // Optimistic locking check
    if (request.version !== existing.version) {
      throw new Error('Workflow was modified by another user. Please refresh and try again.');
    }

    const updated: Workflow = {
      ...existing,
      ...request,
      id,
      updated_at: new Date().toISOString(),
      updated_by: 'current_user',
      version: existing.version + 1,
      endpoints: request.endpoints ? request.endpoints.map(ep => ({
        ...ep,
        template_version: ep.template_version || '1.0.0'
      })) : existing.endpoints
    };

    this.workflows.set(id, updated);
    return updated;
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      return false;
    }

    // Prevent deletion of active workflows
    if (workflow.status === 'active') {
      throw new Error('Cannot delete active workflow. Deactivate it first.');
    }

    this.workflows.delete(id);
    return true;
  }

  async cloneWorkflow(id: string, newName: string): Promise<Workflow | null> {
    const original = this.workflows.get(id);
    if (!original) {
      return null;
    }

    const cloned = await this.createWorkflow({
      ...original,
      name: newName,
      description: `${original.description} (копия)`
    });

    return cloned;
  }

  // Execution Management
  // Statistics and Monitoring
  async getStatistics(): Promise<any> {
    const workflows = Array.from(this.workflows.values());
    const executions = Array.from(this.executions.values());
    
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const executionsLast24h = executions.filter(e => new Date(e.started_at) >= last24h);
    
    const successful = executions.filter(e => e.status === 'completed');
    const failed = executions.filter(e => e.status === 'failed');
    
    const avgExecutionTime = executions.length > 0 
      ? executions
          .filter(e => e.duration_ms)
          .reduce((sum, e) => sum + (e.duration_ms || 0), 0) / executions.filter(e => e.duration_ms).length
      : 0;

    return {
      total_workflows: workflows.length,
      active_workflows: workflows.filter(w => w.status === 'active').length,
      total_executions: executions.length,
      successful_executions: successful.length,
      failed_executions: failed.length,
      avg_execution_time: avgExecutionTime,
      executions_last_24h: executionsLast24h.length,
      success_rate: executions.length > 0 ? (successful.length / executions.length) * 100 : 0
    };
  }

  async getRecentExecutions(limit: number = 20): Promise<WorkflowExecution[]> {
    const executions = Array.from(this.executions.values());
    return executions
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .slice(0, limit);
  }

  async getExecutionTrends(timeRange: '24h' | '7d' | '30d'): Promise<any[]> {
    // Mock implementation - in real app would calculate actual trends
    const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
    const trends = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        successful: Math.floor(Math.random() * 20) + 5,
        failed: Math.floor(Math.random() * 5),
        total: Math.floor(Math.random() * 25) + 10
      });
    }
    
    return trends;
  }

  async listExecutions(params: ListExecutionsParams = {}): Promise<ListExecutionsResponse> {
    let executions = Array.from(this.executions.values());

    // Apply filters
    if (params.workflow_id) {
      executions = executions.filter(e => e.workflow_id === params.workflow_id);
    }
    if (params.status) {
      executions = executions.filter(e => e.status === params.status);
    }
    if (params.triggered_by) {
      executions = executions.filter(e => e.triggered_by === params.triggered_by);
    }
    if (params.date_from) {
      executions = executions.filter(e => e.started_at >= params.date_from!);
    }
    if (params.date_to) {
      executions = executions.filter(e => e.started_at <= params.date_to!);
    }

    // Apply sorting
    const sortBy = params.sort_by || 'started_at';
    const sortOrder = params.sort_order || 'desc';
    executions.sort((a, b) => {
      const aVal = (a as any)[sortBy];
      const bVal = (b as any)[sortBy];
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Apply pagination
    const page = params.page || 1;
    const limit = params.limit || 50;
    const total = executions.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedExecutions = executions.slice(startIndex, endIndex);

    return {
      data: paginatedExecutions,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit)
    };
  }

  async getExecution(id: string): Promise<WorkflowExecution | null> {
    return this.executions.get(id) || null;
  }

  async executeWorkflow(request: ExecuteWorkflowRequest): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(request.workflow_id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (workflow.status !== 'active' && !request.override_schedule) {
      throw new Error('Workflow is not active');
    }

    // Check concurrent execution limit
    const runningCount = Array.from(this.runningExecutions).filter(execId => {
      const exec = this.executions.get(execId);
      return exec?.workflow_id === request.workflow_id && exec.status === 'running';
    }).length;

    if (runningCount >= workflow.max_concurrent_executions) {
      throw new Error('Maximum concurrent executions reached');
    }

    const execution: WorkflowExecution = {
      id: this.generateExecutionId(),
      workflow_id: request.workflow_id,
      status: 'pending',
      started_at: new Date().toISOString(),
      triggered_by: 'manual',
      triggered_by_user: 'current_user',
      endpoints_executed: [],
      targets_processed: 0,
      targets_successful: 0,
      targets_failed: 0,
      summary: {
        total_api_calls: 0,
        successful_api_calls: 0,
        failed_api_calls: 0,
        total_records_processed: 0,
        records_updated: 0,
        records_created: 0,
        records_deleted: 0,
        average_response_time_ms: 0,
        total_data_transferred_mb: 0,
        error_breakdown: {}
      }
    };

    this.executions.set(execution.id, execution);
    this.runningExecutions.add(execution.id);

    // Start execution asynchronously
    this.performWorkflowExecution(execution);

    return execution;
  }

  private async performWorkflowExecution(execution: WorkflowExecution): Promise<void> {
    try {
      const workflow = this.workflows.get(execution.workflow_id)!;
      execution.status = 'running';
      
      // Simulate execution time
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

      // Update execution results (mock)
      execution.status = Math.random() > 0.2 ? 'completed' : 'failed';
      execution.completed_at = new Date().toISOString();
      execution.duration_ms = Date.parse(execution.completed_at) - Date.parse(execution.started_at);
      
      if (execution.status === 'completed') {
        execution.targets_processed = Math.floor(Math.random() * 5) + 1;
        execution.targets_successful = execution.targets_processed;
        execution.summary.successful_api_calls = execution.targets_processed * workflow.endpoints.length;
        execution.summary.total_api_calls = execution.summary.successful_api_calls;
        execution.summary.records_updated = Math.floor(Math.random() * 100) + 10;
      } else {
        execution.error_message = 'API connection timeout';
        execution.targets_processed = 1;
        execution.targets_failed = 1;
        execution.summary.failed_api_calls = 1;
        execution.summary.total_api_calls = 1;
        execution.summary.error_breakdown['timeout'] = 1;
      }

      // Update workflow statistics
      workflow.last_execution = execution;
      this.updateWorkflowStatistics(workflow);

    } catch (error) {
      execution.status = 'failed';
      execution.error_message = error instanceof Error ? error.message : 'Unknown error';
      execution.completed_at = new Date().toISOString();
    } finally {
      this.runningExecutions.delete(execution.id);
    }
  }

  private updateWorkflowStatistics(workflow: Workflow): void {
    const executions = Array.from(this.executions.values())
      .filter(e => e.workflow_id === workflow.id && e.status !== 'running');
    
    if (executions.length === 0) return;

    const successful = executions.filter(e => e.status === 'completed').length;
    workflow.success_rate = Math.round((successful / executions.length) * 100);
    
    const durations = executions
      .filter(e => e.duration_ms)
      .map(e => e.duration_ms!);
    
    if (durations.length > 0) {
      workflow.average_duration_ms = Math.round(
        durations.reduce((sum, d) => sum + d, 0) / durations.length
      );
    }
  }

  async stopExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') {
      return false;
    }

    execution.status = 'failed';
    execution.error_message = 'Execution stopped by user';
    execution.completed_at = new Date().toISOString();
    execution.duration_ms = Date.parse(execution.completed_at) - Date.parse(execution.started_at);
    
    this.runningExecutions.delete(executionId);
    return true;
  }

  // Validation and Statistics
  async validateWorkflow(workflow: Workflow): Promise<WorkflowValidationResult> {
    const errors = [];
    const warnings = [];

    // Basic validation
    if (!workflow.name.trim()) {
      errors.push({ field: 'name', message: 'Название обязательно', code: 'required' });
    }
    if (workflow.endpoints.length === 0) {
      errors.push({ field: 'endpoints', message: 'Должен быть выбран хотя бы один endpoint', code: 'required' });
    }
    if (workflow.schedule.interval <= 0) {
      errors.push({ field: 'schedule.interval', message: 'Интервал должен быть больше 0', code: 'invalid' });
    }

    // Warning for high frequency schedules
    if (workflow.schedule.frequency === 'minutes' && workflow.schedule.interval < 5) {
      warnings.push({ 
        field: 'schedule', 
        message: 'Частое выполнение может создать нагрузку на систему', 
        code: 'performance' 
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  async getWorkflowStats(workflowId: string, periodDays: number = 30): Promise<WorkflowStats | null> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return null;
    }

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);
    
    const executions = Array.from(this.executions.values()).filter(e => 
      e.workflow_id === workflowId &&
      new Date(e.started_at) >= periodStart
    );

    const successful = executions.filter(e => e.status === 'completed');
    const failed = executions.filter(e => e.status === 'failed');
    
    const durations = executions
      .filter(e => e.duration_ms)
      .map(e => e.duration_ms!);

    // Error analysis
    const errorCounts: Record<string, number> = {};
    failed.forEach(exec => {
      if (exec.error_message) {
        const errorType = exec.error_message.includes('timeout') ? 'timeout' :
                         exec.error_message.includes('connection') ? 'connection' :
                         exec.error_message.includes('auth') ? 'authentication' : 'other';
        errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
      }
    });

    const mostCommonErrors = Object.entries(errorCounts)
      .map(([type, count]) => ({
        error_type: type,
        count,
        percentage: Math.round((count / failed.length) * 100) || 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      workflow_id: workflowId,
      total_executions: executions.length,
      successful_executions: successful.length,
      failed_executions: failed.length,
      success_rate: executions.length > 0 ? Math.round((successful.length / executions.length) * 100) : 0,
      average_duration_ms: durations.length > 0 ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length) : 0,
      min_duration_ms: durations.length > 0 ? Math.min(...durations) : 0,
      max_duration_ms: durations.length > 0 ? Math.max(...durations) : 0,
      last_execution_at: workflow.last_execution?.started_at,
      next_execution_at: workflow.next_execution,
      total_records_processed: executions.reduce((sum, e) => sum + (e.summary.total_records_processed || 0), 0),
      total_api_calls: executions.reduce((sum, e) => sum + (e.summary.total_api_calls || 0), 0),
      average_records_per_execution: executions.length > 0 
        ? Math.round(executions.reduce((sum, e) => sum + (e.summary.total_records_processed || 0), 0) / executions.length)
        : 0,
      most_common_errors: mostCommonErrors,
      stats_period_start: periodStart.toISOString(),
      stats_period_end: new Date().toISOString()
    };
  }

  // Utility methods
  async activateWorkflow(id: string): Promise<boolean> {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      return false;
    }

    const validation = await this.validateWorkflow(workflow);
    if (!validation.valid) {
      throw new Error(`Cannot activate workflow: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    workflow.status = 'active';
    workflow.updated_at = new Date().toISOString();
    
    // Calculate next execution time
    workflow.next_execution = this.calculateNextExecution(workflow.schedule);
    
    return true;
  }

  async deactivateWorkflow(id: string): Promise<boolean> {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      return false;
    }

    workflow.status = 'inactive';
    workflow.updated_at = new Date().toISOString();
    workflow.next_execution = undefined;
    
    return true;
  }

  private calculateNextExecution(schedule: any): string {
    const now = new Date();
    const next = new Date(now);

    switch (schedule.frequency) {
      case 'minutes':
        next.setMinutes(now.getMinutes() + schedule.interval);
        break;
      case 'hours':
        next.setHours(now.getHours() + schedule.interval);
        break;
      case 'days':
        next.setDate(now.getDate() + schedule.interval);
        break;
      case 'weeks':
        next.setDate(now.getDate() + (schedule.interval * 7));
        break;
      case 'months':
        next.setMonth(now.getMonth() + schedule.interval);
        break;
    }

    return next.toISOString();
  }
}

// Export singleton instance
export const workflowsService = new WorkflowsService();
export default workflowsService;