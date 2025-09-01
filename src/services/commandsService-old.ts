/**
 * Сервис для работы с командами и регламентами (workflows)
 * Включает персистентное хранение в localStorage
 */

import { PersistentStorage } from '@/utils/persistentStorage';

export type TargetType = 'trading_point' | 'equipment' | 'component';
export type AdapterType = 'http' | 'broker';
export type HttpMethod = 'GET' | 'POST' | 'PUT';
export type TriggerType = 'schedule' | 'event' | 'manual';
export type WorkflowStepType = 'command' | 'condition' | 'delay' | 'notification';
export type ExecutionStatus = 'success' | 'error' | 'running' | 'cancelled';

export interface Command {
  id: string;
  name: string;
  code: string;
  description?: string;
  targetType: TargetType;
  isActive: boolean;
  adapter: AdapterType;
  endpoint: string;
  httpMethod?: HttpMethod;
  httpHeaders?: string;
  timeout?: number;
  jsonSchema?: string;
  jsonTemplate?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommandInput {
  name: string;
  code: string;
  description?: string;
  targetType: TargetType;
  isActive?: boolean;
  adapter: AdapterType;
  endpoint: string;
  httpMethod?: HttpMethod;
  httpHeaders?: string;
  timeout?: number;
  jsonSchema?: string;
  jsonTemplate?: string;
}

export interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  name: string;
  commandId?: string;
  condition?: string;
  delayMs?: number;
  notificationText?: string;
  order: number;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: TriggerType;
  schedule?: string;
  eventTrigger?: string;
  steps: WorkflowStep[];
  lastRun?: {
    date: string;
    status: ExecutionStatus;
    message?: string;
    duration?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowInput {
  name: string;
  description?: string;
  isActive?: boolean;
  triggerType: TriggerType;
  schedule?: string;
  eventTrigger?: string;
  steps?: Omit<WorkflowStep, 'id'>[];
}

export interface CommandExecution {
  id: string;
  commandId: string;
  workflowId?: string;
  targetId?: string;
  status: ExecutionStatus;
  startTime: string;
  endTime?: string;
  duration?: number;
  request?: string;
  response?: string;
  error?: string;
  executedBy: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// Начальные данные команд
const initialCommands: Command[] = [
  {
    id: "CMD-001",
    name: "Перезагрузить устройство",
    code: "REBOOT_DEVICE",
    description: "Команда для перезагрузки оборудования",
    targetType: "equipment",
    isActive: true,
    adapter: "http",
    endpoint: "/api/v1/equipment/{id}/reboot",
    httpMethod: "POST",
    timeout: 30000,
    jsonTemplate: '{"action": "reboot", "force": false}',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: "CMD-002",
    name: "Установить цену топлива",
    code: "SET_FUEL_PRICE",
    description: "Обновление цены на определенный вид топлива",
    targetType: "trading_point",
    isActive: true,
    adapter: "broker",
    endpoint: "fuel.prices.update",
    jsonSchema: '{"type": "object", "properties": {"fuelType": {"type": "string"}, "price": {"type": "number"}}}',
    jsonTemplate: '{"fuelType": "АИ-95", "price": 60.50}',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01')
  },
  {
    id: "CMD-003",
    name: "Запуск диагностики",
    code: "RUN_DIAGNOSTICS",
    description: "Запуск полной диагностики оборудования",
    targetType: "equipment",
    isActive: true,
    adapter: "http",
    endpoint: "/api/v1/equipment/{id}/diagnostics",
    httpMethod: "POST",
    timeout: 120000,
    jsonTemplate: '{"type": "full", "includeComponents": true}',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: "CMD-004",
    name: "Обновить конфигурацию",
    code: "UPDATE_CONFIG",
    description: "Обновление конфигурации компонента",
    targetType: "component",
    isActive: true,
    adapter: "broker",
    endpoint: "components.config.update",
    jsonTemplate: '{"config": {}}',
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-01-25')
  },
  {
    id: "CMD-005",
    name: "Остановить продажи",
    code: "STOP_SALES",
    description: "Экстренная остановка всех продаж на точке",
    targetType: "trading_point",
    isActive: true,
    adapter: "http",
    endpoint: "/api/v1/trading-points/{id}/stop-sales",
    httpMethod: "POST",
    timeout: 5000,
    jsonTemplate: '{"reason": "emergency", "immediate": true}',
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-02-05')
  }
];

// Начальные данные регламентов
const initialWorkflows: Workflow[] = [
  {
    id: "WF-001",
    name: "Ежедневное закрытие смены",
    description: "Автоматическое закрытие смен на всех АЗС в конце дня",
    isActive: true,
    triggerType: "schedule",
    schedule: "0 55 23 * * *", // Каждый день в 23:55
    steps: [
      {
        id: "STEP-001",
        type: "command",
        name: "Получить список активных смен",
        commandId: "CMD-006",
        order: 1
      },
      {
        id: "STEP-002", 
        type: "command",
        name: "Закрыть смены",
        commandId: "CMD-007",
        order: 2
      },
      {
        id: "STEP-003",
        type: "notification",
        name: "Уведомить менеджеров",
        notificationText: "Смены закрыты автоматически",
        order: 3
      }
    ],
    lastRun: {
      date: "2024-08-29T23:55:00Z",
      status: "success",
      duration: 45000
    },
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-08-29')
  },
  {
    id: "WF-002",
    name: "Обновление цен на топливо",
    description: "Еженедельное обновление цен на топливо по понедельникам",
    isActive: true,
    triggerType: "schedule",
    schedule: "0 0 6 * * 1", // Каждый понедельник в 6:00
    steps: [
      {
        id: "STEP-004",
        type: "command",
        name: "Получить новые цены",
        commandId: "CMD-008",
        order: 1
      },
      {
        id: "STEP-005",
        type: "delay",
        name: "Пауза для синхронизации",
        delayMs: 30000,
        order: 2
      },
      {
        id: "STEP-006",
        type: "command",
        name: "Применить цены на всех АЗС",
        commandId: "CMD-002",
        order: 3
      }
    ],
    lastRun: {
      date: "2024-08-26T06:00:00Z",
      status: "success",
      duration: 120000
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-08-26')
  },
  {
    id: "WF-003",
    name: "Резервное копирование данных",
    description: "Ежедневное резервное копирование данных АЗС",
    isActive: true,
    triggerType: "schedule",
    schedule: "0 0 2 * * *", // Каждый день в 2:00
    steps: [
      {
        id: "STEP-007",
        type: "command",
        name: "Создать резервную копию БД",
        commandId: "CMD-009",
        order: 1
      },
      {
        id: "STEP-008",
        type: "command",
        name: "Загрузить копию в облако",
        commandId: "CMD-010",
        order: 2
      },
      {
        id: "STEP-009",
        type: "condition",
        name: "Проверить успешность копирования",
        condition: "backup_size > 0",
        order: 3
      }
    ],
    lastRun: {
      date: "2024-08-30T02:00:00Z",
      status: "success",
      duration: 180000
    },
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-08-30')
  }
];

// Загружаем данные из localStorage
let commandsData: Command[] = PersistentStorage.load<Command>('commands', initialCommands);
let workflowsData: Workflow[] = PersistentStorage.load<Workflow>('workflows', initialWorkflows);
let executionsData: CommandExecution[] = PersistentStorage.load<CommandExecution>('commandExecutions', []);

let nextCommandId = Math.max(...commandsData.map(cmd => parseInt(cmd.id.replace('CMD-', '')) || 0)) + 1;
let nextWorkflowId = Math.max(...workflowsData.map(wf => parseInt(wf.id.replace('WF-', '')) || 0)) + 1;
let nextExecutionId = 1;

// Функции для сохранения изменений
const saveCommands = () => {
  PersistentStorage.save('commands', commandsData);
};

const saveWorkflows = () => {
  PersistentStorage.save('workflows', workflowsData);
};

const saveExecutions = () => {
  PersistentStorage.save('commandExecutions', executionsData);
};

// API сервис команд с персистентным хранением
export const commandsService = {
  // КОМАНДЫ

  // Получить все команды
  async getAllCommands(): Promise<Command[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return [...commandsData].sort((a, b) => a.name.localeCompare(b.name));
  },

  // Получить команду по ID
  async getCommandById(id: string): Promise<Command | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return commandsData.find(cmd => cmd.id === id) || null;
  },

  // Создать команду
  async createCommand(input: CommandInput): Promise<Command> {
    await new Promise(resolve => setTimeout(resolve, 250));
    
    // Проверяем уникальность кода
    const existingCommand = commandsData.find(cmd => cmd.code === input.code);
    if (existingCommand) {
      throw new Error('Команда с таким кодом уже существует');
    }
    
    const newCommand: Command = {
      id: `CMD-${String(nextCommandId++).padStart(3, '0')}`,
      name: input.name,
      code: input.code,
      description: input.description,
      targetType: input.targetType,
      isActive: input.isActive ?? true,
      adapter: input.adapter,
      endpoint: input.endpoint,
      httpMethod: input.httpMethod,
      httpHeaders: input.httpHeaders,
      timeout: input.timeout,
      jsonSchema: input.jsonSchema,
      jsonTemplate: input.jsonTemplate,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    commandsData.push(newCommand);
    saveCommands();
    
    return newCommand;
  },

  // Обновить команду
  async updateCommand(id: string, updates: Partial<CommandInput>): Promise<Command | null> {
    await new Promise(resolve => setTimeout(resolve, 220));
    
    const index = commandsData.findIndex(cmd => cmd.id === id);
    if (index === -1) return null;
    
    // Проверяем уникальность кода при изменении
    if (updates.code) {
      const existingCommand = commandsData.find(cmd => cmd.id !== id && cmd.code === updates.code);
      if (existingCommand) {
        throw new Error('Команда с таким кодом уже существует');
      }
    }
    
    const updatedCommand: Command = {
      ...commandsData[index],
      name: updates.name ?? commandsData[index].name,
      code: updates.code ?? commandsData[index].code,
      description: updates.description !== undefined ? updates.description : commandsData[index].description,
      targetType: updates.targetType ?? commandsData[index].targetType,
      isActive: updates.isActive ?? commandsData[index].isActive,
      adapter: updates.adapter ?? commandsData[index].adapter,
      endpoint: updates.endpoint ?? commandsData[index].endpoint,
      httpMethod: updates.httpMethod !== undefined ? updates.httpMethod : commandsData[index].httpMethod,
      httpHeaders: updates.httpHeaders !== undefined ? updates.httpHeaders : commandsData[index].httpHeaders,
      timeout: updates.timeout !== undefined ? updates.timeout : commandsData[index].timeout,
      jsonSchema: updates.jsonSchema !== undefined ? updates.jsonSchema : commandsData[index].jsonSchema,
      jsonTemplate: updates.jsonTemplate !== undefined ? updates.jsonTemplate : commandsData[index].jsonTemplate,
      updatedAt: new Date()
    };

    commandsData[index] = updatedCommand;
    saveCommands();
    
    return updatedCommand;
  },

  // Удалить команду
  async deleteCommand(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 180));
    
    // Проверяем, не используется ли команда в регламентах
    const usedInWorkflows = workflowsData.some(wf => 
      wf.steps.some(step => step.commandId === id)
    );
    
    if (usedInWorkflows) {
      throw new Error('Команда используется в регламентах и не может быть удалена');
    }
    
    const index = commandsData.findIndex(cmd => cmd.id === id);
    if (index === -1) return false;
    
    commandsData.splice(index, 1);
    saveCommands();
    
    return true;
  },

  // Выполнить команду
  async executeCommand(id: string, targetId?: string, executedBy: string = 'system'): Promise<CommandExecution> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const command = commandsData.find(cmd => cmd.id === id);
    if (!command) {
      throw new Error('Команда не найдена');
    }
    
    if (!command.isActive) {
      throw new Error('Команда отключена');
    }
    
    const executionId = `EXEC-${String(nextExecutionId++).padStart(6, '0')}`;
    const startTime = new Date().toISOString();
    
    // Создаем запись о выполнении
    const execution: CommandExecution = {
      id: executionId,
      commandId: id,
      targetId,
      status: 'running',
      startTime,
      executedBy,
      createdAt: new Date()
    };
    
    executionsData.push(execution);
    saveExecutions();
    
    // Симуляция выполнения команды
    setTimeout(async () => {
      const duration = Math.random() * 10000 + 1000; // 1-11 секунд
      const success = Math.random() > 0.1; // 90% успешных выполнений
      
      execution.status = success ? 'success' : 'error';
      execution.endTime = new Date(Date.now() + duration).toISOString();
      execution.duration = Math.floor(duration);
      
      if (success) {
        execution.response = JSON.stringify({
          status: 'ok',
          message: `Команда ${command.name} выполнена успешно`,
          timestamp: execution.endTime
        });
      } else {
        execution.error = `Ошибка выполнения команды: ${command.name}`;
      }
      
      saveExecutions();
    }, 100);
    
    return execution;
  },

  // РЕГЛАМЕНТЫ (WORKFLOWS)

  // Получить все регламенты
  async getAllWorkflows(): Promise<Workflow[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return [...workflowsData].sort((a, b) => a.name.localeCompare(b.name));
  },

  // Получить регламент по ID
  async getWorkflowById(id: string): Promise<Workflow | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return workflowsData.find(wf => wf.id === id) || null;
  },

  // Создать регламент
  async createWorkflow(input: WorkflowInput): Promise<Workflow> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newWorkflow: Workflow = {
      id: `WF-${String(nextWorkflowId++).padStart(3, '0')}`,
      name: input.name,
      description: input.description,
      isActive: input.isActive ?? true,
      triggerType: input.triggerType,
      schedule: input.schedule,
      eventTrigger: input.eventTrigger,
      steps: input.steps?.map((step, index) => ({
        ...step,
        id: `STEP-${String(Date.now() + index).slice(-6)}`,
        order: step.order || index + 1
      })) || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    workflowsData.push(newWorkflow);
    saveWorkflows();
    
    return newWorkflow;
  },

  // Обновить регламент
  async updateWorkflow(id: string, updates: Partial<WorkflowInput>): Promise<Workflow | null> {
    await new Promise(resolve => setTimeout(resolve, 250));
    
    const index = workflowsData.findIndex(wf => wf.id === id);
    if (index === -1) return null;
    
    const workflow = workflowsData[index];
    
    const updatedWorkflow: Workflow = {
      ...workflow,
      name: updates.name ?? workflow.name,
      description: updates.description !== undefined ? updates.description : workflow.description,
      isActive: updates.isActive ?? workflow.isActive,
      triggerType: updates.triggerType ?? workflow.triggerType,
      schedule: updates.schedule !== undefined ? updates.schedule : workflow.schedule,
      eventTrigger: updates.eventTrigger !== undefined ? updates.eventTrigger : workflow.eventTrigger,
      steps: updates.steps ? updates.steps.map((step, index) => ({
        ...step,
        id: `STEP-${String(Date.now() + index).slice(-6)}`,
        order: step.order || index + 1
      })) : workflow.steps,
      updatedAt: new Date()
    };

    workflowsData[index] = updatedWorkflow;
    saveWorkflows();
    
    return updatedWorkflow;
  },

  // Удалить регламент
  async deleteWorkflow(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 180));
    
    const index = workflowsData.findIndex(wf => wf.id === id);
    if (index === -1) return false;
    
    workflowsData.splice(index, 1);
    saveWorkflows();
    
    return true;
  },

  // Выполнить регламент
  async executeWorkflow(id: string, executedBy: string = 'system'): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const workflow = workflowsData.find(wf => wf.id === id);
    if (!workflow) {
      throw new Error('Регламент не найден');
    }
    
    if (!workflow.isActive) {
      throw new Error('Регламент отключен');
    }
    
    // Обновляем статус последнего выполнения
    workflow.lastRun = {
      date: new Date().toISOString(),
      status: 'running'
    };
    
    saveWorkflows();
    
    // Симуляция выполнения регламента
    setTimeout(() => {
      const duration = Math.random() * 60000 + 5000; // 5-65 секунд
      const success = Math.random() > 0.05; // 95% успешных выполнений
      
      workflow.lastRun = {
        date: workflow.lastRun!.date,
        status: success ? 'success' : 'error',
        duration: Math.floor(duration),
        message: success ? 'Регламент выполнен успешно' : 'Ошибка при выполнении регламента'
      };
      
      saveWorkflows();
    }, 1000);
    
    return true;
  },

  // Получить историю выполнений
  async getExecutionHistory(filters?: {
    commandId?: string;
    workflowId?: string;
    status?: ExecutionStatus;
    limit?: number;
  }): Promise<CommandExecution[]> {
    await new Promise(resolve => setTimeout(resolve, 120));
    
    let filteredExecutions = executionsData;
    
    if (filters) {
      if (filters.commandId) {
        filteredExecutions = filteredExecutions.filter(ex => ex.commandId === filters.commandId);
      }
      if (filters.workflowId) {
        filteredExecutions = filteredExecutions.filter(ex => ex.workflowId === filters.workflowId);
      }
      if (filters.status) {
        filteredExecutions = filteredExecutions.filter(ex => ex.status === filters.status);
      }
    }
    
    const sorted = filteredExecutions.sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    
    return filters?.limit ? sorted.slice(0, filters.limit) : sorted;
  }
};

// Экспорт store для обратной совместимости
export const commandsStore = {
  getAllCommands: (): Command[] => [...commandsData],
  
  getCommandById: (id: string): Command | undefined => 
    commandsData.find(cmd => cmd.id === id),
    
  getAllWorkflows: (): Workflow[] => [...workflowsData],
  
  getWorkflowById: (id: string): Workflow | undefined =>
    workflowsData.find(wf => wf.id === id),
    
  getExecutionHistory: (): CommandExecution[] => [...executionsData],
    
  updateCommand: (id: string, updates: Partial<Command>): Command | null => {
    const index = commandsData.findIndex(cmd => cmd.id === id);
    if (index === -1) return null;
    
    commandsData[index] = {
      ...commandsData[index],
      ...updates,
      updatedAt: new Date()
    };
    
    saveCommands();
    return commandsData[index];
  }
};