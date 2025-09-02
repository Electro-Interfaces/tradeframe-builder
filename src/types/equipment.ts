import { TradingPointId } from './tradingpoint';

export type EquipmentId = string;
export type EquipmentTemplateId = string;

// Статусы оборудования согласно API спецификации
export type EquipmentStatus = 'online' | 'offline' | 'error' | 'disabled' | 'archived';

// Основной интерфейс Equipment (независимый экземпляр)
export interface Equipment {
  id: EquipmentId;
  trading_point_id: TradingPointId;
  
  // Основная информация (скопированная из шаблона при создании)
  name: string; // Техническое название из шаблона
  display_name: string; // Пользовательское название 
  system_type: string; // Тип системы (fuel_tank, dispenser, etc.)
  
  // Уникальные данные экземпляра
  serial_number?: string;
  external_id?: string;
  status: EquipmentStatus;
  installation_date?: string; // ISO 8601
  
  // Параметры (скопированные и настроенные из шаблона)
  params: Record<string, any>; // Все параметры хранятся здесь
  bindings?: EquipmentBindings;
  
  // Доступные команды для данного оборудования
  availableCommandIds?: string[];
  
  // Метаданные
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  deleted_at?: string; // ISO 8601 для soft-delete
  created_from_template?: string; // Только для истории создания
  
  // Расширенные поля для UI
  components?: EquipmentComponent[];
  componentsCount?: number;
}

// Шаблон оборудования (изменяемый, хранится в базе)
export interface EquipmentTemplate {
  id: EquipmentTemplateId;
  name: string; // Техническое название
  display_name: string; // Отображаемое название
  technical_code: string; // Уникальный код
  system_type: string; // Тип системы (fuel_tank, dispenser, etc.)
  category: string; // Категория (storage, fuel_dispensing, control, etc.)
  
  // Управление шаблоном
  status: boolean; // Активен/неактивен
  is_system: boolean; // Системный шаблон (нельзя удалить)
  description?: string;
  
  // Конфигурация по умолчанию
  default_params: Record<string, any>; // Параметры по умолчанию
  required_params: string[]; // Обязательные параметры
  param_schema?: Record<string, any>; // JSON Schema для валидации
  
  // Связи
  allow_component_template_ids?: string[];
  available_command_ids?: string[]; // Доступные команды для оборудования данного типа
  
  // Метаданные
  created_at: string;
  updated_at: string;
  created_by?: string; // ID пользователя
  updated_by?: string; // ID пользователя
}

// CRUD операции для шаблонов
export interface CreateEquipmentTemplateRequest {
  name: string;
  display_name: string;
  technical_code: string;
  system_type: string;
  category: string;
  description?: string;
  default_params: Record<string, any>;
  required_params: string[];
  param_schema?: Record<string, any>;
  allow_component_template_ids?: string[];
}

export interface UpdateEquipmentTemplateRequest {
  name?: string;
  display_name?: string;
  technical_code?: string;
  system_type?: string;
  category?: string;
  description?: string;
  status?: boolean;
  default_params?: Record<string, any>;
  required_params?: string[];
  param_schema?: Record<string, any>;
  allow_component_template_ids?: string[];
}

// Привязки оборудования к другим системам
export interface EquipmentBindings {
  column_id?: string;
  tank_id?: string;
  controller_id?: string;
  pos_terminal_id?: string;
}

// Компонент оборудования (заглушка для Шага 2)
export interface EquipmentComponent {
  id: string;
  equipment_id: EquipmentId;
  template_id: string;
  display_name: string;
  serial_number?: string;
  status: EquipmentStatus;
  created_at: string;
  updated_at: string;
}

// DTO для создания оборудования (создается из шаблона)
export interface CreateEquipmentRequest {
  trading_point_id: TradingPointId;
  template_id: EquipmentTemplateId; // Используется только для копирования данных
  
  // Обязательные поля экземпляра
  display_name: string;
  
  // Опциональные поля экземпляра  
  serial_number?: string;
  external_id?: string;
  installation_date?: string;
  bindings?: EquipmentBindings;
  
  // Кастомизированные параметры (объединятся с default_params шаблона)
  custom_params?: Record<string, any>;
}

// DTO для обновления оборудования
export interface UpdateEquipmentRequest {
  display_name?: string;
  serial_number?: string;
  external_id?: string;
  bindings?: EquipmentBindings;
  params?: Record<string, any>;
  installation_date?: string;
}

// Фильтры для списка оборудования
export interface EquipmentFilters {
  search?: string;
  status?: EquipmentStatus;
  system_type?: string; // Фильтруем по типу системы
  name?: string; // Фильтруем по техническому названию
}

// Параметры запроса списка
export interface ListEquipmentParams extends EquipmentFilters {
  trading_point_id: TradingPointId;
  page?: number;
  limit?: number;
}

// Ответ API со списком
export interface ListEquipmentResponse {
  data: Equipment[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// Операции со статусами
export type EquipmentStatusAction = 'enable' | 'disable' | 'archive';

// Журнал событий оборудования
export interface EquipmentEvent {
  id: string;
  equipment_id: EquipmentId;
  event_type: 'created' | 'updated' | 'status_changed' | 'command_executed';
  user_id: string;
  user_name: string;
  timestamp: string;
  details: Record<string, any>;
  correlation_id?: string;
}