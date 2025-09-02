export type ComponentTemplateId = string;

// Шаблон компонента
export interface ComponentTemplate {
  id: ComponentTemplateId;
  name: string;
  code: string; // Технический код компонента (например, "CMP_RES_LEVEL")
  description: string;
  systemType: string; // Системный тип (SENSOR, CONTROLLER, INTERFACE, etc.)
  statusValues: string[]; // Возможные значения статуса
  isActive: boolean;
  created_at: string;
  updated_at: string;
}

// DTO для создания шаблона компонента
export interface CreateComponentTemplateRequest {
  name: string;
  code: string;
  description: string;
  systemType: string;
  statusValues: string[];
  isActive?: boolean;
}

// DTO для обновления шаблона компонента
export interface UpdateComponentTemplateRequest {
  name?: string;
  code?: string;
  description?: string;
  systemType?: string;
  statusValues?: string[];
  isActive?: boolean;
}

// Фильтры для поиска шаблонов компонентов
export interface ComponentTemplateFilters {
  search?: string;
  systemType?: string;
  isActive?: boolean;
}

// Параметры запроса списка шаблонов
export interface ListComponentTemplatesParams extends ComponentTemplateFilters {
  page?: number;
  limit?: number;
  sort_by?: 'name' | 'code' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

// Ответ API со списком шаблонов
export interface ListComponentTemplatesResponse {
  data: ComponentTemplate[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}