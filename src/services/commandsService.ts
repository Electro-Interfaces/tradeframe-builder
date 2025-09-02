import { 
  Command, 
  CommandTemplate,
  CreateCommandRequest, 
  UpdateCommandRequest,
  CommandFilters,
  ListCommandsParams,
  ListCommandsResponse,
  CommandStatusAction,
  CommandExecution,
  ExecuteCommandRequest,
  Workflow
} from '@/types/command';
import { PersistentStorage } from '@/utils/persistentStorage';

// Шаблоны команд для АЗС
const initialCommandTemplates: CommandTemplate[] = [
  {
    id: "cmd_tpl_001",
    code: "REBOOT_DEVICE",
    name: "Перезагрузка устройства",
    display_name: "Перезагрузить оборудование",
    category: "system",
    target_type: "equipment",
    status: true,
    is_system: false,
    description: "Выполняет перезагрузку выбранного оборудования",
    defaults: {
      adapter: "http",
      endpoint: "/api/v1/equipment/{id}/reboot",
      http_method: "POST",
      timeout: 30000,
      json_template: '{"action": "reboot", "force": false}'
    },
    required_params: ["equipment_id"],
    params_schema: {
      type: "object",
      properties: {
        force: { type: "boolean", description: "Принудительная перезагрузка" }
      }
    },
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-01-15').toISOString()
  },
  {
    id: "cmd_tpl_002", 
    code: "SET_FUEL_PRICE",
    name: "Установка цены топлива",
    display_name: "Обновить цены на топливо", 
    category: "control",
    target_type: "trading_point",
    status: true,
    is_system: false,
    description: "Устанавливает новые цены на топливо на торговой точке",
    defaults: {
      adapter: "broker",
      endpoint: "fuel.prices.update",
      json_template: '{"fuel_type": "АИ-95", "price": 60.50}',
      parameters: {
        fuel_types: ["АИ-92", "АИ-95", "ДТ"],
        currency: "RUB"
      }
    },
    required_params: ["fuel_type", "price"],
    params_schema: {
      type: "object",
      properties: {
        fuel_type: { type: "string", enum: ["АИ-92", "АИ-95", "ДТ"] },
        price: { type: "number", minimum: 0 }
      }
    },
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-02-01').toISOString()
  },
  {
    id: "cmd_tpl_003",
    code: "RUN_DIAGNOSTICS", 
    name: "Диагностика оборудования",
    display_name: "Запустить диагностику",
    category: "diagnostic",
    target_type: "equipment",
    status: true,
    is_system: false,
    description: "Запускает полную диагностику выбранного оборудования",
    defaults: {
      adapter: "http",
      endpoint: "/api/v1/equipment/{id}/diagnostics",
      http_method: "POST",
      timeout: 120000,
      json_template: '{"type": "full", "include_components": true}'
    },
    required_params: ["equipment_id"],
    params_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["quick", "full"] },
        include_components: { type: "boolean" }
      }
    },
    created_at: new Date('2024-01-20').toISOString(),
    updated_at: new Date('2024-01-20').toISOString()
  },
  {
    id: "cmd_tpl_004",
    code: "UPDATE_COMPONENT_CONFIG",
    name: "Обновление конфигурации компонента", 
    display_name: "Изменить настройки компонента",
    category: "control",
    target_type: "component",
    status: true,
    is_system: false,
    description: "Обновляет конфигурационные параметры компонента",
    defaults: {
      adapter: "broker",
      endpoint: "components.config.update",
      json_template: '{"config": {}, "restart_required": false}'
    },
    required_params: ["component_id", "config"],
    params_schema: {
      type: "object",
      properties: {
        config: { type: "object" },
        restart_required: { type: "boolean" }
      }
    },
    created_at: new Date('2024-01-25').toISOString(),
    updated_at: new Date('2024-01-25').toISOString()
  },
  {
    id: "cmd_tpl_005",
    code: "EMERGENCY_STOP",
    name: "Экстренная остановка",
    display_name: "Остановить продажи",
    category: "system", 
    target_type: "trading_point",
    status: true,
    is_system: true, // Системная команда
    description: "Экстренная остановка всех продаж на торговой точке",
    defaults: {
      adapter: "http",
      endpoint: "/api/v1/trading-points/{id}/emergency-stop",
      http_method: "POST",
      timeout: 5000,
      json_template: '{"reason": "emergency", "immediate": true}'
    },
    required_params: ["trading_point_id", "reason"],
    params_schema: {
      type: "object",
      properties: {
        reason: { type: "string" },
        immediate: { type: "boolean" }
      }
    },
    created_at: new Date('2024-02-05').toISOString(),
    updated_at: new Date('2024-02-05').toISOString()
  }
];

// Независимые экземпляры команд, созданные из шаблонов
const initialCommands: Command[] = [
  {
    id: "cmd_001",
    trading_point_id: "point1",
    name: "Перезагрузка устройства",
    display_name: "Перезагрузить резервуар №1",
    category: "system", 
    target_type: "equipment",
    status: "active",
    adapter: "http",
    endpoint: "/api/v1/equipment/eq_1/reboot",
    http_method: "POST",
    timeout: 30000,
    json_template: '{"action": "reboot", "force": false}',
    parameters: {
      equipment_id: "eq_1",
      force: false
    },
    created_at: new Date('2024-08-15').toISOString(),
    updated_at: new Date('2024-08-15').toISOString(),
    created_from_template: "cmd_tpl_001"
  },
  {
    id: "cmd_002",
    trading_point_id: "point1", 
    name: "Установка цены топлива",
    display_name: "Обновить цену АИ-95",
    category: "control",
    target_type: "trading_point",
    status: "active",
    adapter: "broker",
    endpoint: "fuel.prices.update",
    json_template: '{"fuel_type": "АИ-95", "price": 62.30}',
    parameters: {
      fuel_type: "АИ-95",
      price: 62.30,
      currency: "RUB"
    },
    created_at: new Date('2024-08-20').toISOString(),
    updated_at: new Date('2024-08-25').toISOString(),
    created_from_template: "cmd_tpl_002"
  },
  {
    id: "cmd_003",
    trading_point_id: "point1",
    name: "Диагностика оборудования", 
    display_name: "Диагностика ТРК №1",
    category: "diagnostic",
    target_type: "equipment", 
    status: "active",
    adapter: "http",
    endpoint: "/api/v1/equipment/eq_4/diagnostics",
    http_method: "POST",
    timeout: 120000,
    json_template: '{"type": "full", "include_components": true}',
    parameters: {
      equipment_id: "eq_4",
      type: "full",
      include_components: true
    },
    created_at: new Date('2024-08-22').toISOString(),
    updated_at: new Date('2024-08-22').toISOString(),
    created_from_template: "cmd_tpl_003"
  }
];

// Загружаем данные из localStorage
let commandTemplates: CommandTemplate[] = PersistentStorage.load<CommandTemplate>('command_templates', initialCommandTemplates);
let commands: Command[] = PersistentStorage.load<Command>('commands_v2', initialCommands);
let executions: CommandExecution[] = PersistentStorage.load<CommandExecution>('command_executions', []);

// Функции для сохранения изменений
const saveCommandTemplates = () => {
  PersistentStorage.save('command_templates', commandTemplates);
};

const saveCommands = () => {
  PersistentStorage.save('commands_v2', commands);
};

const saveExecutions = () => {
  PersistentStorage.save('command_executions', executions);
};

// Store для работы с шаблонами команд
export const commandTemplatesStore = {
  getAll: (): CommandTemplate[] => [...commandTemplates],
  
  getById: (id: string): CommandTemplate | undefined => 
    commandTemplates.find(tpl => tpl.id === id),
    
  getByCategory: (category: string): CommandTemplate[] =>
    commandTemplates.filter(tpl => tpl.category === category),
    
  getActive: (): CommandTemplate[] =>
    commandTemplates.filter(tpl => tpl.status),
    
  create: (template: Omit<CommandTemplate, 'id' | 'created_at' | 'updated_at'>): CommandTemplate => {
    const newTemplate: CommandTemplate = {
      ...template,
      id: `cmd_tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    commandTemplates.push(newTemplate);
    saveCommandTemplates();
    return newTemplate;
  },
  
  update: (id: string, updates: Partial<CommandTemplate>): CommandTemplate | null => {
    const index = commandTemplates.findIndex(tpl => tpl.id === id);
    if (index === -1) return null;
    
    commandTemplates[index] = {
      ...commandTemplates[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    saveCommandTemplates();
    return commandTemplates[index];
  },
  
  delete: (id: string): boolean => {
    // Проверяем, не используется ли шаблон
    const usedInCommands = commands.some(cmd => cmd.created_from_template === id);
    if (usedInCommands) return false;
    
    const index = commandTemplates.findIndex(tpl => tpl.id === id);
    if (index === -1) return false;
    
    commandTemplates.splice(index, 1);
    saveCommandTemplates();
    return true;
  }
};

// API для работы с командами (независимые экземпляры)
export const commandsAPI = {
  async list(params: ListCommandsParams = {}): Promise<ListCommandsResponse> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let filteredCommands = [...commands];
    
    // Фильтрация
    if (params.trading_point_id) {
      filteredCommands = filteredCommands.filter(cmd => cmd.trading_point_id === params.trading_point_id);
    }
    
    if (params.status) {
      filteredCommands = filteredCommands.filter(cmd => cmd.status === params.status);
    }
    
    if (params.category) {
      filteredCommands = filteredCommands.filter(cmd => cmd.category === params.category);
    }
    
    if (params.target_type) {
      filteredCommands = filteredCommands.filter(cmd => cmd.target_type === params.target_type);
    }
    
    if (params.name) {
      filteredCommands = filteredCommands.filter(cmd => cmd.name === params.name);
    }
    
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredCommands = filteredCommands.filter(cmd =>
        cmd.display_name.toLowerCase().includes(searchLower) ||
        cmd.name.toLowerCase().includes(searchLower)
      );
    }
    
    // Сортировка
    if (params.sort_by) {
      const sortBy = params.sort_by;
      const sortOrder = params.sort_order || 'asc';
      
      filteredCommands.sort((a, b) => {
        let valueA, valueB;
        
        switch (sortBy) {
          case 'display_name':
            valueA = a.display_name;
            valueB = b.display_name;
            break;
          case 'status':
            valueA = a.status;
            valueB = b.status;
            break;
          case 'created_at':
            valueA = a.created_at;
            valueB = b.created_at;
            break;
          case 'updated_at':
            valueA = a.updated_at;
            valueB = b.updated_at;
            break;
          default:
            return 0;
        }
        
        if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    // Пагинация
    const page = params.page || 1;
    const limit = params.limit || 20;
    const total = filteredCommands.length;
    const total_pages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const pageCommands = filteredCommands.slice(startIndex, endIndex);
    
    return {
      data: pageCommands,
      total,
      page,
      limit,
      total_pages
    };
  },

  async get(id: string): Promise<Command | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return commands.find(cmd => cmd.id === id) || null;
  },

  async create(data: CreateCommandRequest): Promise<Command> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Получаем шаблон для копирования данных
    const template = commandTemplatesStore.getById(data.template_id);
    if (!template) {
      throw new Error('Command template not found');
    }
    
    // Создаем независимый экземпляр команды
    const newCommand: Command = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      trading_point_id: data.trading_point_id,
      
      // Копируем базовые данные из шаблона
      name: template.name,
      display_name: data.display_name,
      category: template.category,
      target_type: template.target_type,
      
      // Статус по умолчанию
      status: 'active',
      
      // Объединяем параметры выполнения по умолчанию с кастомными
      adapter: data.custom_params?.endpoint ? data.custom_params.endpoint.includes('http') ? 'http' : template.defaults.adapter : template.defaults.adapter,
      endpoint: data.custom_params?.endpoint || template.defaults.endpoint,
      http_method: data.custom_params?.http_method || template.defaults.http_method,
      http_headers: data.custom_params?.http_headers || template.defaults.http_headers,
      timeout: data.custom_params?.timeout || template.defaults.timeout,
      json_template: data.custom_params?.json_template || template.defaults.json_template,
      parameters: {
        ...template.defaults.parameters,
        ...(data.custom_params?.parameters || {})
      },
      
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_from_template: template.id // Только для истории
    };
    
    // Сохраняем новую команду в localStorage
    commands.push(newCommand);
    saveCommands();
    
    return newCommand;
  },

  async update(id: string, data: UpdateCommandRequest): Promise<Command | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const commandIndex = commands.findIndex(cmd => cmd.id === id);
    if (commandIndex === -1) {
      return null;
    }
    
    const updatedCommand = {
      ...commands[commandIndex],
      ...data,
      updated_at: new Date().toISOString()
    };
    
    // Обновляем данные и сохраняем в localStorage
    commands[commandIndex] = updatedCommand;
    saveCommands();
    
    return updatedCommand;
  },

  async updateStatus(id: string, action: CommandStatusAction): Promise<Command | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const commandIndex = commands.findIndex(cmd => cmd.id === id);
    if (commandIndex === -1) {
      return null;
    }
    
    // Изменяем статус и сохраняем в localStorage
    let newStatus: 'active' | 'inactive' | 'archived';
    switch (action) {
      case 'activate':
        newStatus = 'active';
        break;
      case 'deactivate':
        newStatus = 'inactive';
        break;
      case 'archive':
        newStatus = 'archived';
        break;
      default:
        throw new Error('Invalid status action');
    }
    
    const updatedCommand = {
      ...commands[commandIndex],
      status: newStatus,
      updated_at: new Date().toISOString()
    };
    
    // Сохраняем изменения в localStorage
    commands[commandIndex] = updatedCommand;
    saveCommands();
    
    return updatedCommand;
  },

  async execute(request: ExecuteCommandRequest): Promise<CommandExecution> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const command = commands.find(cmd => cmd.id === request.command_id);
    if (!command) {
      throw new Error('Command not found');
    }
    
    if (command.status !== 'active') {
      throw new Error('Command is not active');
    }
    
    // Создаем запись о выполнении
    const execution: CommandExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      command_id: request.command_id,
      target_id: request.target_id,
      status: 'running',
      start_time: new Date().toISOString(),
      executed_by: 'system', // TODO: получать из контекста пользователя
      metadata: request.parameters,
      created_at: new Date().toISOString()
    };
    
    executions.push(execution);
    saveExecutions();
    
    // Симуляция выполнения команды
    setTimeout(() => {
      const duration = Math.random() * 10000 + 1000; // 1-11 секунд
      const success = Math.random() > 0.1; // 90% успешных выполнений
      
      execution.status = success ? 'success' : 'error';
      execution.end_time = new Date(Date.now() + duration).toISOString();
      execution.duration = Math.floor(duration);
      
      if (success) {
        execution.response = JSON.stringify({
          status: 'ok',
          message: `Команда ${command.display_name} выполнена успешно`,
          timestamp: execution.end_time
        });
      } else {
        execution.error = `Ошибка выполнения команды: ${command.display_name}`;
      }
      
      saveExecutions();
    }, 100);
    
    return execution;
  },

  async getExecutions(commandId?: string): Promise<CommandExecution[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    let filteredExecutions = executions;
    
    if (commandId) {
      filteredExecutions = executions.filter(exec => exec.command_id === commandId);
    }
    
    return filteredExecutions.sort((a, b) => 
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );
  },

  // Новые методы для поддержки команд уровня оборудования/компонентов
  async create(request: import('@/types/commandTemplate').CreateCommandInstanceRequest): Promise<import('@/types/commandTemplate').CommandInstance> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const instance: import('@/types/commandTemplate').CommandInstance = {
      id: `cmd_inst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Command ${request.templateId}`,
      template_name: `Template ${request.templateId}`,
      category: 'system' as any,
      templateId: request.templateId,
      targetType: request.targetType,
      targetId: request.targetId,
      parameters: request.parameters || {},
      priority: request.priority || 'normal',
      scheduledFor: request.scheduledFor || new Date().toISOString(),
      status: 'pending',
      params: request.parameters || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Симуляция выполнения команды
    setTimeout(() => {
      instance.status = 'running';
      setTimeout(() => {
        const success = Math.random() > 0.1; // 90% успеха
        instance.status = success ? 'completed' : 'failed';
        if (!success) {
          instance.error_message = 'Simulation error';
        }
        instance.completed_at = new Date().toISOString();
      }, 2000 + Math.random() * 3000);
    }, 500);

    return instance;
  },

  async getHistory(params: {
    targetType: 'equipment' | 'component';
    targetId: string;
    limit?: number;
  }): Promise<import('@/types/commandTemplate').CommandInstance[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Симуляция истории команд
    const mockHistory: import('@/types/commandTemplate').CommandInstance[] = [];
    const limit = params.limit || 10;
    
    for (let i = 0; i < Math.min(limit, 5); i++) {
      const statuses = ['completed', 'failed', 'running'] as const;
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      mockHistory.push({
        id: `hist_${params.targetId}_${i}`,
        name: `History Command ${i + 1}`,
        template_name: `Template Command ${i + 1}`,
        category: 'system' as any,
        templateId: `tpl_${i}`,
        targetType: params.targetType,
        targetId: params.targetId,
        parameters: {},
        status,
        params: {},
        created_at: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
        updated_at: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
      });
    }
    
    return mockHistory;
  }
};

// Экспорт основного API
export const currentCommandsAPI = commandsAPI;