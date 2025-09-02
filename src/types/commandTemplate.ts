export type CommandTemplateId = string;

// Статус шаблона команды
export type CommandTemplateStatus = 'active' | 'inactive' | 'deprecated';

// Категории команд для группировки
export type CommandCategory = 
  | 'shift_operations'    // Операции со сменами
  | 'pricing'            // Ценовые операции
  | 'reporting'          // Отчетность
  | 'maintenance'        // Обслуживание
  | 'backup'            // Резервное копирование
  | 'system'            // Системные операции
  | 'fuel_operations'   // Операции с топливом
  | 'equipment_control' // Управление оборудованием
  | 'pos_operations'    // POS операции
  | 'security'          // Безопасность
  | 'custom';           // Пользовательские

// Типы целей для выполнения команд
export type TargetType = 
  | 'all_networks' 
  | 'specific_network' 
  | 'all_trading_points' 
  | 'specific_trading_point' 
  | 'equipment_type' 
  | 'specific_equipment'
  | 'component_type'
  | 'specific_component';

// Конфигурация цели команды
export interface CommandTarget {
  type: TargetType;
  value?: string;
  description: string;
  // Дополнительные ограничения
  constraints?: {
    network_types?: string[];
    equipment_statuses?: string[];
    component_categories?: string[];
  };
}

// Шаблон команды (аналогично Equipment/Component Templates)
export interface CommandTemplate {
  id: CommandTemplateId;
  
  // Основная информация
  name: string; // Техническое название
  display_name: string; // Отображаемое название
  description: string;
  category: CommandCategory;
  
  // Управление шаблоном
  status: CommandTemplateStatus; // Активен/неактивен/устарел
  is_system: boolean; // Системный шаблон (нельзя удалить)
  version: string; // Версия шаблона для обратной совместимости
  
  // JSON Schema для параметров команды
  param_schema: Record<string, any>; // Валидация параметров
  default_params: Record<string, any>; // Параметры по умолчанию
  required_params: string[]; // Обязательные параметры
  
  // Конфигурация выполнения
  allowed_targets: TargetType[]; // Допустимые типы целей
  default_target?: CommandTarget; // Цель по умолчанию
  execution_timeout?: number; // Таймаут выполнения в секундах
  retry_count?: number; // Количество повторов при ошибке
  
  // Безопасность и права доступа
  required_permissions: string[]; // Необходимые права
  is_dangerous: boolean; // Потенциально опасная команда
  requires_confirmation: boolean; // Требует подтверждения
  
  // Планирование
  supports_scheduling: boolean; // Поддержка расписания
  supports_batch_execution: boolean; // Поддержка пакетного выполнения
  
  // Метаданные
  created_at: string;
  updated_at: string;
  created_by?: string; // ID пользователя
  updated_by?: string; // ID пользователя
  deprecated_since?: string; // Дата устаревания
  replacement_template_id?: CommandTemplateId; // ID заменяющего шаблона
  
  // Дополнительная информация
  documentation_url?: string; // Ссылка на документацию
  examples?: Array<{
    name: string;
    description: string;
    params: Record<string, any>;
    target: CommandTarget;
  }>;
}

// CRUD операции для шаблонов команд
export interface CreateCommandTemplateRequest {
  name: string;
  display_name: string;
  description: string;
  category: CommandCategory;
  param_schema: Record<string, any>;
  default_params: Record<string, any>;
  required_params: string[];
  allowed_targets: TargetType[];
  default_target?: CommandTarget;
  execution_timeout?: number;
  retry_count?: number;
  required_permissions: string[];
  is_dangerous?: boolean;
  requires_confirmation?: boolean;
  supports_scheduling?: boolean;
  supports_batch_execution?: boolean;
  documentation_url?: string;
  examples?: Array<{
    name: string;
    description: string;
    params: Record<string, any>;
    target: CommandTarget;
  }>;
}

export interface UpdateCommandTemplateRequest {
  display_name?: string;
  description?: string;
  category?: CommandCategory;
  status?: CommandTemplateStatus;
  param_schema?: Record<string, any>;
  default_params?: Record<string, any>;
  required_params?: string[];
  allowed_targets?: TargetType[];
  default_target?: CommandTarget;
  execution_timeout?: number;
  retry_count?: number;
  required_permissions?: string[];
  is_dangerous?: boolean;
  requires_confirmation?: boolean;
  supports_scheduling?: boolean;
  supports_batch_execution?: boolean;
  documentation_url?: string;
  examples?: Array<{
    name: string;
    description: string;
    params: Record<string, any>;
    target: CommandTarget;
  }>;
}

// Фильтры для списка шаблонов команд
export interface CommandTemplateFilters {
  search?: string;
  category?: CommandCategory;
  status?: CommandTemplateStatus;
  is_system?: boolean;
  supports_scheduling?: boolean;
  target_type?: TargetType;
}

// Параметры запроса списка шаблонов
export interface ListCommandTemplatesParams extends CommandTemplateFilters {
  page?: number;
  limit?: number;
  sort_by?: 'name' | 'display_name' | 'category' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

// Ответ API со списком шаблонов
export interface ListCommandTemplatesResponse {
  data: CommandTemplate[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Экземпляр команды (создается из шаблона, используется в Workflow)
export interface CommandInstance {
  id: string;
  workflow_id?: string; // Если команда является частью workflow
  
  // Основная информация (скопированная из шаблона)
  name: string;
  display_name: string;
  category: CommandCategory;
  
  // Данные экземпляра
  params: Record<string, any>; // Конкретные параметры
  target: CommandTarget; // Конкретная цель выполнения
  
  // Статус выполнения
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  execution_log?: Array<{
    timestamp: string;
    level: 'info' | 'warning' | 'error';
    message: string;
    details?: Record<string, any>;
  }>;
  
  // Результаты выполнения
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  result?: Record<string, any>;
  error_message?: string;
  
  // Метаданные
  created_at: string;
  updated_at: string;
  created_from_template: CommandTemplateId; // Ссылка на исходный шаблон
  executed_by?: string; // ID пользователя или системы
}

// DTO для создания экземпляра команды
export interface CreateCommandInstanceRequest {
  template_id: CommandTemplateId;
  workflow_id?: string;
  
  // Кастомизация экземпляра
  display_name?: string; // Переопределить отображаемое название
  custom_params?: Record<string, any>; // Дополнить/переопределить параметры
  target: CommandTarget; // Обязательная цель выполнения
  
  // Опции выполнения
  execution_timeout?: number; // Переопределить таймаут
  retry_count?: number; // Переопределить количество повторов
}

// Статистика использования шаблонов команд
export interface CommandTemplateUsageStats {
  template_id: CommandTemplateId;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  average_duration_ms: number;
  last_execution_at?: string;
  most_common_targets: Array<{
    target: CommandTarget;
    count: number;
  }>;
  error_rate: number; // Процент ошибок
}