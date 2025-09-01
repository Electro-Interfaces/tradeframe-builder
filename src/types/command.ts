export type CommandId = string;
export type CommandTemplateId = string;
export type CommandStatus = 'active' | 'inactive' | 'archived';
export type TargetType = 'trading_point' | 'equipment' | 'component';
export type AdapterType = 'http' | 'broker';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Шаблон команды (изменяемый, хранится в базе)
export interface CommandTemplate {
  id: CommandTemplateId;
  code: string; // Уникальный код шаблона
  name: string; // Техническое название
  display_name: string; // Отображаемое название
  category: string; // Категория (system, control, diagnostic, maintenance)
  target_type: TargetType; // Тип цели
  
  // Управление шаблоном
  status: boolean; // Активен/неактивен
  is_system: boolean; // Системный шаблон (нельзя удалить)
  description?: string;
  
  // Конфигурация по умолчанию
  defaults: {
    adapter: AdapterType;
    endpoint: string;
    http_method?: HttpMethod;
    http_headers?: Record<string, string>;
    timeout?: number;
    json_schema?: string;
    json_template?: string;
    parameters?: Record<string, any>;
  };
  required_params: string[]; // Обязательные параметры
  params_schema?: Record<string, any>; // JSON Schema для валидации
  
  // Метаданные
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// Команда (независимый экземпляр)
export interface Command {
  id: CommandId;
  trading_point_id?: string; // Если команда привязана к конкретной точке
  
  // Основная информация (скопированная из шаблона при создании)
  name: string; // Техническое название из шаблона
  display_name: string; // Пользовательское название
  category: string; // Категория
  target_type: TargetType; // Тип цели
  
  // Уникальные данные экземпляра
  status: CommandStatus;
  
  // Параметры выполнения (скопированные и настроенные из шаблона)
  adapter: AdapterType;
  endpoint: string;
  http_method?: HttpMethod;
  http_headers?: Record<string, string>;
  timeout?: number;
  json_schema?: string;
  json_template?: string;
  parameters?: Record<string, any>; // Все дополнительные параметры
  
  // Метаданные
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_from_template?: string; // Только для истории создания
}

// DTO для создания команды (создается из шаблона)
export interface CreateCommandRequest {
  template_id: CommandTemplateId; // Используется только для копирования данных
  trading_point_id?: string; // Привязка к торговой точке (опционально)
  
  // Обязательные поля экземпляра
  display_name: string;
  
  // Кастомизированные параметры выполнения (объединятся с defaults шаблона)
  custom_params?: {
    endpoint?: string;
    http_method?: HttpMethod;
    http_headers?: Record<string, string>;
    timeout?: number;
    json_template?: string;
    parameters?: Record<string, any>;
  };
}

export interface UpdateCommandRequest {
  display_name?: string;
  status?: CommandStatus;
  endpoint?: string;
  http_method?: HttpMethod;
  http_headers?: Record<string, string>;
  timeout?: number;
  json_template?: string;
  parameters?: Record<string, any>;
}

// CRUD операции для шаблонов команд
export interface CreateCommandTemplateRequest {
  code: string;
  name: string;
  display_name: string;
  category: string;
  target_type: TargetType;
  description?: string;
  defaults: {
    adapter: AdapterType;
    endpoint: string;
    http_method?: HttpMethod;
    http_headers?: Record<string, string>;
    timeout?: number;
    json_schema?: string;
    json_template?: string;
    parameters?: Record<string, any>;
  };
  required_params: string[];
  params_schema?: Record<string, any>;
}

export interface UpdateCommandTemplateRequest {
  code?: string;
  name?: string;
  display_name?: string;
  category?: string;
  target_type?: TargetType;
  description?: string;
  status?: boolean;
  defaults?: {
    adapter?: AdapterType;
    endpoint?: string;
    http_method?: HttpMethod;
    http_headers?: Record<string, string>;
    timeout?: number;
    json_schema?: string;
    json_template?: string;
    parameters?: Record<string, any>;
  };
  required_params?: string[];
  params_schema?: Record<string, any>;
}

export interface CommandFilters {
  trading_point_id?: string;
  status?: CommandStatus;
  category?: string; // Фильтруем по категории
  target_type?: TargetType; // Фильтруем по типу цели
  name?: string; // Фильтруем по техническому названию
  search?: string; // поиск по имени, описанию
}

export interface ListCommandsParams extends CommandFilters {
  page?: number;
  limit?: number;
  sort_by?: 'display_name' | 'status' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

export interface ListCommandsResponse {
  data: Command[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export type CommandStatusAction = 'activate' | 'deactivate' | 'archive';

// Выполнение команды
export type ExecutionStatus = 'pending' | 'running' | 'success' | 'error' | 'cancelled';

export interface CommandExecution {
  id: string;
  command_id: CommandId;
  target_id?: string; // ID цели (торговая точка, оборудование, компонент)
  status: ExecutionStatus;
  start_time: string;
  end_time?: string;
  duration?: number; // в миллисекундах
  request?: string; // JSON запроса
  response?: string; // JSON ответа
  error?: string; // Текст ошибки
  executed_by: string; // ID пользователя
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ExecuteCommandRequest {
  command_id: CommandId;
  target_id?: string;
  parameters?: Record<string, any>; // Дополнительные параметры для выполнения
}

// Регламенты (Workflows) остаются как есть - это отдельная система планирования
export type TriggerType = 'schedule' | 'event' | 'manual';
export type WorkflowStepType = 'command' | 'condition' | 'delay' | 'notification';

export interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  name: string;
  command_id?: CommandId; // Теперь ссылается на экземпляр команды, не шаблон
  condition?: string;
  delay_ms?: number;
  notification_text?: string;
  order: number;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  trigger_type: TriggerType;
  schedule?: string; // Cron выражение
  event_trigger?: string; // Событие для trigger_type='event'
  steps: WorkflowStep[];
  last_run?: {
    date: string;
    status: ExecutionStatus;
    message?: string;
    duration?: number;
  };
  created_at: string;
  updated_at: string;
}