export type ComponentId = string;
export type ComponentTemplateId = string;
export type ComponentStatus = 'online' | 'offline' | 'error' | 'disabled' | 'archived';

// Шаблон компонента (изменяемый, хранится в базе)
export interface ComponentTemplate {
  id: ComponentTemplateId;
  code: string; // Уникальный код
  name: string; // Техническое название
  display_name: string; // Отображаемое название
  category: string; // Категория (sensor, actuator, controller, etc.)
  system_type: string; // Тип системы
  
  // Управление шаблоном
  status: boolean; // Активен/неактивен
  is_system: boolean; // Системный шаблон (нельзя удалить)
  description?: string;
  
  // Конфигурация по умолчанию
  defaults: Record<string, any>; // Параметры по умолчанию
  required_params: string[]; // Обязательные параметры
  params_schema?: Record<string, any>; // JSON Schema для валидации
  
  // Метаданные
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// Компонент (независимый экземпляр)
export interface Component {
  id: ComponentId;
  trading_point_id: string;
  equipment_id: string;
  
  // Основная информация (скопированная из шаблона при создании)
  name: string; // Техническое название из шаблона
  display_name: string; // Пользовательское название
  system_type: string; // Тип системы
  category: string; // Категория
  
  // Уникальные данные экземпляра
  serial_number?: string;
  status: ComponentStatus;
  
  // Параметры (скопированные и настроенные из шаблона)
  params: Record<string, any>; // Все параметры хранятся здесь
  
  // Метаданные
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_from_template?: string; // Только для истории создания
}

// DTO для создания компонента (создается из шаблона)
export interface CreateComponentRequest {
  trading_point_id: string;
  equipment_id: string;
  template_id: ComponentTemplateId; // Используется только для копирования данных
  
  // Обязательные поля экземпляра
  display_name: string;
  
  // Опциональные поля экземпляра
  serial_number?: string;
  
  // Кастомизированные параметры (объединятся с defaults шаблона)
  custom_params?: Record<string, any>;
}

export interface UpdateComponentRequest {
  display_name?: string;
  serial_number?: string;
  params?: Record<string, any>;
}

// CRUD операции для шаблонов компонентов
export interface CreateComponentTemplateRequest {
  code: string;
  name: string;
  display_name: string;
  category: string;
  system_type: string;
  description?: string;
  defaults: Record<string, any>;
  required_params: string[];
  params_schema?: Record<string, any>;
}

export interface UpdateComponentTemplateRequest {
  code?: string;
  name?: string;
  display_name?: string;
  category?: string;
  system_type?: string;
  description?: string;
  status?: boolean;
  defaults?: Record<string, any>;
  required_params?: string[];
  params_schema?: Record<string, any>;
}

export interface ComponentFilters {
  equipment_id?: string;
  status?: ComponentStatus;
  system_type?: string; // Фильтруем по типу системы
  category?: string; // Фильтруем по категории
  name?: string; // Фильтруем по техническому названию
  search?: string; // поиск по имени, серийному номеру
}

export interface ListComponentsParams extends ComponentFilters {
  page?: number;
  limit?: number;
  sort_by?: 'display_name' | 'status' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

export interface ListComponentsResponse {
  data: Component[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export type ComponentStatusAction = 'enable' | 'disable' | 'archive';

export interface ComponentEvent {
  id: string;
  component_id: ComponentId;
  event_type: 'created' | 'updated' | 'status_changed' | 'deleted';
  old_values?: Partial<Component>;
  new_values?: Partial<Component>;
  user_id: string;
  timestamp: string;
  correlation_id: string;
}

// Матрица совместимости оборудования и компонентов
export interface EquipmentComponentCompatibility {
  equipment_template_id: string;
  component_template_id: string;
}

export interface ComponentInput {
  display_name: string;
  serial_number?: string;
  params?: Record<string, any>;
}