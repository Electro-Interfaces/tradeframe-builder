import { TradingPointId } from './tradingpoint';

export type EquipmentId = string;
export type EquipmentTemplateId = string;

// Статусы оборудования согласно API спецификации
export type EquipmentStatus = 'online' | 'offline' | 'error' | 'disabled' | 'archived';

// Основной интерфейс Equipment (обновленный под API v1)
export interface Equipment {
  id: EquipmentId;
  trading_point_id: TradingPointId;
  template_id: EquipmentTemplateId;
  display_name: string;
  serial_number?: string;
  external_id?: string;
  status: EquipmentStatus;
  installation_date?: string; // ISO 8601
  bindings?: EquipmentBindings;
  params?: Record<string, any>;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  deleted_at?: string; // ISO 8601 для soft-delete
  
  // Расширенные поля для UI
  template?: EquipmentTemplate;
  components?: EquipmentComponent[];
}

// Шаблон оборудования
export interface EquipmentTemplate {
  id: EquipmentTemplateId;
  name: string;
  technical_code: string;
  system_type: string;
  status: boolean;
  description?: string;
  default_params?: Record<string, any>;
  // Подготовка к Шагу 2
  allow_component_template_ids?: string[];
  created_at: string;
  updated_at: string;
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

// DTO для создания оборудования
export interface CreateEquipmentRequest {
  trading_point_id: TradingPointId;
  template_id: EquipmentTemplateId;
  overrides: {
    display_name: string;
    serial_number?: string;
    external_id?: string;
    bindings?: EquipmentBindings;
    params?: Record<string, any>;
    installation_date?: string;
  };
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
  template_id?: EquipmentTemplateId;
  status?: EquipmentStatus;
  system_type?: string;
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