/**
 * Workflows Service - Прямое подключение к Supabase
 * Замена localStorage + mock данных на работу напрямую с базой данных
 */

import { supabaseService } from './supabaseServiceClient';
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
  WorkflowType,
  DEFAULT_RETRY_POLICY,
  DEFAULT_NOTIFICATION_CONFIG
} from '@/types/workflows';

class WorkflowsSupabaseService {
  private workflowsTable = 'workflows';
  private executionsTable = 'workflow_executions';
  private logsTable = 'workflow_execution_logs';
  private runningExecutions = new Set<string>();

  /**
   * Получить список рабочих процессов
   */
  async listWorkflows(params: ListWorkflowsParams = {}): Promise<ListWorkflowsResponse> {
    try {
      let query = supabaseService
        .from(this.workflowsTable)
        .select('*', { count: 'exact' });

      // Применяем фильтры
      if (params.type) {
        query = query.eq('type', params.type);
      }
      if (params.status) {
        query = query.eq('status', params.status);
      }
      if (params.search) {
        query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);
      }
      if (params.tags?.length) {
        query = query.overlaps('tags', params.tags);
      }

      // Сортировка
      const sortBy = params.sort_by || 'created_at';
      const sortOrder = params.sort_order || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Пагинация
      const page = params.page || 1;
      const limit = params.limit || 20;
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Failed to fetch workflows:', error);
        throw new Error(`Failed to fetch workflows: ${error.message}`);
      }

      return {
        data: data || [],
        total: count || 0,
        page,
        limit,
        total_pages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      console.error('❌ Error in listWorkflows:', error);
      throw error;
    }
  }

  /**
   * Получить рабочий процесс по ID
   */
  async getWorkflow(id: string): Promise<Workflow | null> {
    try {
      const { data, error } = await supabaseService
        .from(this.workflowsTable)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        console.error('❌ Failed to fetch workflow:', error);
        throw new Error(`Failed to fetch workflow: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error in getWorkflow:', error);
      throw error;
    }
  }

  /**
   * Создать новый рабочий процесс
   */
  async createWorkflow(request: CreateWorkflowRequest): Promise<Workflow> {
    try {
      const newWorkflow = {
        ...request,
        id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: request.status || 'draft' as WorkflowStatus,
        retry_policy: request.retry_policy || DEFAULT_RETRY_POLICY,
        notification_config: request.notification_config || DEFAULT_NOTIFICATION_CONFIG,
        execution_count: 0,
        last_execution_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'current_user', // TODO: получать из контекста
        updated_by: 'current_user'
      };

      // Вычисляем следующее время выполнения
      if (newWorkflow.status === 'active') {
        newWorkflow.next_execution = this.calculateNextExecution(newWorkflow.schedule);
      }

      const { data, error } = await supabaseService
        .from(this.workflowsTable)
        .insert([newWorkflow])
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to create workflow:', error);
        throw new Error(`Failed to create workflow: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error creating workflow:', error);
      throw error;
    }
  }

  /**
   * Обновить рабочий процесс
   */
  async updateWorkflow(id: string, request: UpdateWorkflowRequest): Promise<Workflow | null> {
    try {
      const updateData = {
        ...request,
        updated_at: new Date().toISOString(),
        updated_by: 'current_user'
      };

      // Если изменилось расписание или статус, пересчитываем next_execution
      if (request.schedule || request.status) {
        const workflow = await this.getWorkflow(id);
        if (workflow && (request.status === 'active' || workflow.status === 'active')) {
          const schedule = request.schedule || workflow.schedule;
          updateData.next_execution = this.calculateNextExecution(schedule);
        }
      }

      const { data, error } = await supabaseService
        .from(this.workflowsTable)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to update workflow:', error);
        throw new Error(`Failed to update workflow: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error updating workflow:', error);
      throw error;
    }
  }

  /**
   * Удалить рабочий процесс
   */
  async deleteWorkflow(id: string): Promise<boolean> {
    try {
      // Проверяем, что нет активных выполнений
      const { data: activeExecutions } = await supabaseService
        .from(this.executionsTable)
        .select('id')
        .eq('workflow_id', id)
        .in('status', ['pending', 'running']);

      if (activeExecutions && activeExecutions.length > 0) {
        throw new Error('Cannot delete workflow with active executions');
      }

      const { error } = await supabaseService
        .from(this.workflowsTable)
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Failed to delete workflow:', error);
        throw new Error(`Failed to delete workflow: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('❌ Error deleting workflow:', error);
      throw error;
    }
  }

  /**
   * Клонировать рабочий процесс
   */
  async cloneWorkflow(id: string, newName: string): Promise<Workflow | null> {
    try {
      const original = await this.getWorkflow(id);
      if (!original) {
        return null;
      }

      // Создаем копию без системных полей
      const cloneData: CreateWorkflowRequest = {
        name: newName,
        description: `${original.description} (копия)`,
        type: original.type,
        status: 'draft',
        schedule: original.schedule,
        endpoints: original.endpoints,
        targets: original.targets,
        retry_policy: original.retry_policy,
        notification_config: original.notification_config,
        tags: original.tags,
        metadata: {
          ...original.metadata,
          cloned_from: id,
          cloned_at: new Date().toISOString()
        }
      };

      return await this.createWorkflow(cloneData);
    } catch (error) {
      console.error('❌ Error cloning workflow:', error);
      throw error;
    }
  }

  /**
   * Получить статистику
   */
  async getStatistics(): Promise<any> {
    try {
      const [workflowsData, executionsData, recentExecutions] = await Promise.all([
        supabaseService
          .from(this.workflowsTable)
          .select('status', { count: 'exact' }),
        supabaseService
          .from(this.executionsTable)
          .select('status', { count: 'exact' }),
        supabaseService
          .from(this.executionsTable)
          .select('*')
          .order('started_at', { ascending: false })
          .limit(20)
      ]);

      // Подсчитываем статистику по статусам
      const workflowsByStatus = (workflowsData.data || []).reduce((acc, w) => {
        acc[w.status] = (acc[w.status] || 0) + 1;
        return acc;
      }, {});

      const executionsByStatus = (executionsData.data || []).reduce((acc, e) => {
        acc[e.status] = (acc[e.status] || 0) + 1;
        return acc;
      }, {});

      return {
        workflows: {
          total: workflowsData.count || 0,
          active: workflowsByStatus.active || 0,
          inactive: workflowsByStatus.inactive || 0,
          draft: workflowsByStatus.draft || 0,
          error: workflowsByStatus.error || 0
        },
        executions: {
          total: executionsData.count || 0,
          completed: executionsByStatus.completed || 0,
          failed: executionsByStatus.failed || 0,
          running: executionsByStatus.running || 0,
          pending: executionsByStatus.pending || 0
        },
        recent_executions: recentExecutions.data || []
      };
    } catch (error) {
      console.error('❌ Error getting statistics:', error);
      throw error;
    }
  }

  /**
   * Получить последние выполнения
   */
  async getRecentExecutions(limit: number = 20): Promise<WorkflowExecution[]> {
    try {
      const { data, error } = await supabaseService
        .from(this.executionsTable)
        .select(`
          *,
          workflow:workflows(name, type)
        `)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Failed to fetch recent executions:', error);
        throw new Error(`Failed to fetch executions: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error getting recent executions:', error);
      throw error;
    }
  }

  /**
   * Получить тренды выполнений
   */
  async getExecutionTrends(timeRange: '24h' | '7d' | '30d'): Promise<any[]> {
    try {
      const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabaseService
        .from(this.executionsTable)
        .select('started_at, status')
        .gte('started_at', since)
        .order('started_at');

      if (error) {
        console.error('❌ Failed to fetch execution trends:', error);
        throw new Error(`Failed to fetch trends: ${error.message}`);
      }

      // Группируем по времени
      const trends = (data || []).reduce((acc, execution) => {
        const hour = new Date(execution.started_at).getHours();
        const key = `${hour}:00`;
        if (!acc[key]) {
          acc[key] = { time: key, completed: 0, failed: 0, total: 0 };
        }
        acc[key].total += 1;
        if (execution.status === 'completed') {
          acc[key].completed += 1;
        } else if (execution.status === 'failed') {
          acc[key].failed += 1;
        }
        return acc;
      }, {});

      return Object.values(trends);
    } catch (error) {
      console.error('❌ Error getting execution trends:', error);
      throw error;
    }
  }

  /**
   * Выполнить рабочий процесс
   */
  async executeWorkflow(request: ExecuteWorkflowRequest): Promise<WorkflowExecution> {
    try {
      const workflow = await this.getWorkflow(request.workflow_id);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      if (workflow.status !== 'active') {
        throw new Error('Workflow is not active');
      }

      const execution: WorkflowExecution = {
        id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        workflow_id: request.workflow_id,
        status: 'pending',
        triggered_by: request.triggered_by || 'manual',
        trigger_data: request.trigger_data || {},
        started_at: new Date().toISOString(),
        ended_at: null,
        duration_ms: 0,
        results: [],
        error_message: null,
        retry_count: 0,
        metadata: request.metadata || {}
      };

      const { data, error } = await supabaseService
        .from(this.executionsTable)
        .insert([execution])
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to create execution:', error);
        throw new Error(`Failed to create execution: ${error.message}`);
      }

      // Запускаем выполнение асинхронно
      this.performWorkflowExecution(data).catch(err => {
        console.error('❌ Workflow execution failed:', err);
      });

      return data;
    } catch (error) {
      console.error('❌ Error executing workflow:', error);
      throw error;
    }
  }

  /**
   * Выполнить рабочий процесс (внутренний метод)
   */
  private async performWorkflowExecution(execution: WorkflowExecution): Promise<void> {
    this.runningExecutions.add(execution.id);

    try {
      // Обновляем статус на "running"
      await this.updateExecutionStatus(execution.id, 'running');

      const workflow = await this.getWorkflow(execution.workflow_id);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const results = [];
      
      // Выполняем каждый эндпоинт по порядку приоритета
      const sortedEndpoints = [...workflow.endpoints].sort((a, b) => a.priority - b.priority);
      
      for (const endpoint of sortedEndpoints) {
        if (!endpoint.enabled) {
          continue;
        }

        try {
          // Здесь должна быть логика выполнения эндпоинта
          const result = await this.executeEndpoint(endpoint, workflow.targets, execution.trigger_data);
          results.push({
            endpoint_id: endpoint.template_id,
            status: 'success',
            data: result,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          results.push({
            endpoint_id: endpoint.template_id,
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
          });
          
          // Если критическая ошибка, прерываем выполнение
          if (endpoint.priority <= 3) {
            throw error;
          }
        }
      }

      // Обновляем статус на "completed"
      await this.updateExecutionResults(execution.id, 'completed', results);
      
    } catch (error) {
      await this.updateExecutionResults(execution.id, 'failed', [], error.message);
    } finally {
      this.runningExecutions.delete(execution.id);
      
      // Обновляем время последнего выполнения в workflow
      await supabaseService
        .from(this.workflowsTable)
        .update({ 
          last_execution_at: new Date().toISOString(),
          execution_count: supabaseService.raw('execution_count + 1')
        })
        .eq('id', execution.workflow_id);
    }
  }

  /**
   * Обновить статус выполнения
   */
  private async updateExecutionStatus(executionId: string, status: ExecutionStatus): Promise<void> {
    const updateData: any = { 
      status,
      updated_at: new Date().toISOString()
    };
    
    if (status === 'completed' || status === 'failed') {
      updateData.ended_at = new Date().toISOString();
    }

    await supabaseService
      .from(this.executionsTable)
      .update(updateData)
      .eq('id', executionId);
  }

  /**
   * Обновить результаты выполнения
   */
  private async updateExecutionResults(
    executionId: string, 
    status: ExecutionStatus, 
    results: any[] = [], 
    errorMessage?: string
  ): Promise<void> {
    const endTime = new Date();
    const { data: execution } = await supabaseService
      .from(this.executionsTable)
      .select('started_at')
      .eq('id', executionId)
      .single();

    const duration = execution 
      ? endTime.getTime() - new Date(execution.started_at).getTime()
      : 0;

    await supabaseService
      .from(this.executionsTable)
      .update({
        status,
        ended_at: endTime.toISOString(),
        duration_ms: duration,
        results,
        error_message: errorMessage || null,
        updated_at: endTime.toISOString()
      })
      .eq('id', executionId);
  }

  /**
   * Выполнить эндпоинт (заглушка)
   */
  private async executeEndpoint(endpoint: any, targets: any, triggerData: any): Promise<any> {
    // Имитация выполнения эндпоинта
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    return {
      endpoint_id: endpoint.template_id,
      processed_records: Math.floor(Math.random() * 100),
      success: true
    };
  }

  /**
   * Активировать рабочий процесс
   */
  async activateWorkflow(id: string): Promise<boolean> {
    try {
      const workflow = await this.updateWorkflow(id, { 
        status: 'active',
        next_execution: this.calculateNextExecution((await this.getWorkflow(id))?.schedule)
      });
      return !!workflow;
    } catch (error) {
      console.error('❌ Error activating workflow:', error);
      throw error;
    }
  }

  /**
   * Деактивировать рабочий процесс
   */
  async deactivateWorkflow(id: string): Promise<boolean> {
    try {
      const workflow = await this.updateWorkflow(id, { 
        status: 'inactive',
        next_execution: null
      });
      return !!workflow;
    } catch (error) {
      console.error('❌ Error deactivating workflow:', error);
      throw error;
    }
  }

  /**
   * Вычислить следующее время выполнения
   */
  private calculateNextExecution(schedule: any): string {
    const now = new Date();
    const next = new Date(now);
    
    switch (schedule.frequency) {
      case 'minutes':
        next.setMinutes(next.getMinutes() + schedule.interval);
        break;
      case 'hours':
        next.setHours(next.getHours() + schedule.interval);
        break;
      case 'days':
        next.setDate(next.getDate() + schedule.interval);
        break;
      case 'weeks':
        next.setDate(next.getDate() + (schedule.interval * 7));
        break;
      case 'months':
        next.setMonth(next.getMonth() + schedule.interval);
        break;
    }
    
    return next.toISOString();
  }

  /**
   * Валидация рабочего процесса
   */
  async validateWorkflow(workflow: Workflow): Promise<WorkflowValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Базовая валидация
    if (!workflow.name || workflow.name.trim().length === 0) {
      errors.push('Workflow name is required');
    }

    if (!workflow.endpoints || workflow.endpoints.length === 0) {
      errors.push('At least one endpoint is required');
    }

    if (!workflow.targets || (!workflow.targets.include_all && 
        !workflow.targets.network_ids?.length && 
        !workflow.targets.trading_point_ids?.length)) {
      warnings.push('No specific targets defined, workflow will apply to all entities');
    }

    // Валидация расписания
    if (workflow.schedule) {
      if (workflow.schedule.interval <= 0) {
        errors.push('Schedule interval must be greater than 0');
      }
      
      if (workflow.schedule.frequency === 'weeks' && !workflow.schedule.days_of_week?.length) {
        warnings.push('Weekly schedule should specify days of week');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Экспортируем singleton экземпляр сервиса
// Экспорт класса и экземпляра
export { WorkflowsSupabaseService };
export const workflowsSupabaseService = new WorkflowsSupabaseService();

// Экспорт для обратной совместимости
export const workflowsService = {
  listWorkflows: (params?: ListWorkflowsParams) => workflowsSupabaseService.listWorkflows(params),
  getWorkflow: (id: string) => workflowsSupabaseService.getWorkflow(id),
  createWorkflow: (request: CreateWorkflowRequest) => workflowsSupabaseService.createWorkflow(request),
  updateWorkflow: (id: string, request: UpdateWorkflowRequest) => 
    workflowsSupabaseService.updateWorkflow(id, request),
  deleteWorkflow: (id: string) => workflowsSupabaseService.deleteWorkflow(id),
  cloneWorkflow: (id: string, newName: string) => workflowsSupabaseService.cloneWorkflow(id, newName),
  getStatistics: () => workflowsSupabaseService.getStatistics(),
  getRecentExecutions: (limit?: number) => workflowsSupabaseService.getRecentExecutions(limit),
  getExecutionTrends: (timeRange: '24h' | '7d' | '30d') => 
    workflowsSupabaseService.getExecutionTrends(timeRange),
  executeWorkflow: (request: ExecuteWorkflowRequest) => workflowsSupabaseService.executeWorkflow(request),
  activateWorkflow: (id: string) => workflowsSupabaseService.activateWorkflow(id),
  deactivateWorkflow: (id: string) => workflowsSupabaseService.deactivateWorkflow(id),
  validateWorkflow: (workflow: Workflow) => workflowsSupabaseService.validateWorkflow(workflow)
};

export default workflowsService;