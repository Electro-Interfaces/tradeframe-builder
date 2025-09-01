export type ComponentId = string;
export type ComponentTemplateId = string;
export type ComponentStatus = 'online' | 'offline' | 'error' | 'disabled' | 'archived';

export interface ComponentTemplate {
  id: ComponentTemplateId;
  code: string;
  name: string;
  params_schema: Record<string, any>; // JSON schema для параметров
  defaults: Record<string, any>; // значения по умолчанию
  created_at: string;
  updated_at: string;
}

export interface Component {
  id: ComponentId;
  trading_point_id: string;
  equipment_id: string;
  template_id: ComponentTemplateId;
  display_name: string;
  serial_number?: string;
  params: Record<string, any>; // JSONB параметры
  status: ComponentStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  
  // Populated fields
  template?: ComponentTemplate;
}

export interface CreateComponentRequest {
  trading_point_id: string;
  equipment_id: string;
  template_id: ComponentTemplateId;
  overrides: {
    display_name: string;
    serial_number?: string;
    params?: Record<string, any>;
  };
}

export interface UpdateComponentRequest {
  display_name?: string;
  serial_number?: string;
  params?: Record<string, any>;
}

export interface ComponentFilters {
  equipment_id?: string;
  status?: ComponentStatus;
  template_id?: ComponentTemplateId;
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