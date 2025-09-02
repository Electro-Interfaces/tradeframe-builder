import { 
  CommandTemplate,
  CommandTemplateId,
  CreateCommandTemplateRequest,
  UpdateCommandTemplateRequest,
  ListCommandTemplatesParams,
  ListCommandTemplatesResponse
} from '@/types/commandTemplate';
import { commandTemplatesStore } from '@/mock/commandTemplatesStore';
import { PersistentStorage } from '@/utils/persistentStorage';

// Базовый URL для API
import { getApiBaseUrl, isApiMockMode } from '@/services/apiConfigService';
const API_BASE_URL = getApiBaseUrl();

// Утилита для HTTP запросов с трейсингом
class ApiClient {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/problem+json',
      'X-Trace-Id': this.generateTraceId(),
      ...options.headers,
    };

    // Добавляем Idempotency-Key для мутирующих операций
    if (['POST', 'PUT', 'PATCH'].includes(options.method || 'GET')) {
      headers['Idempotency-Key'] = this.generateIdempotencyKey();
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }

    return response.json();
  }

  private generateTraceId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private generateIdempotencyKey(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

class ApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`API Error ${status}: ${body}`);
    this.name = 'ApiError';
  }
}

const apiClient = new ApiClient();

// Получаем системные шаблоны
const initialTemplates: CommandTemplate[] = commandTemplatesStore.getAll();

// Загружаем пользовательские шаблоны из localStorage
let userTemplates: CommandTemplate[] = PersistentStorage.load<CommandTemplate>('command_templates_v1', []);

// Объединяем системные и пользовательские шаблоны
let allTemplates: CommandTemplate[] = [...initialTemplates, ...userTemplates];

// Функция для сохранения пользовательских шаблонов
const saveUserTemplates = () => {
  const userOnly = allTemplates.filter(t => !t.is_system);
  PersistentStorage.save('command_templates_v1', userOnly);
};

// Mock API для шаблонов команд с персистентным хранением
export const mockCommandTemplatesAPI = {
  async list(params: ListCommandTemplatesParams = {}): Promise<ListCommandTemplatesResponse> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let filteredTemplates = [...allTemplates];
    
    // Фильтрация по поиску
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredTemplates = filteredTemplates.filter(template =>
        template.name.toLowerCase().includes(searchLower) ||
        template.display_name.toLowerCase().includes(searchLower) ||
        template.description.toLowerCase().includes(searchLower)
      );
    }
    
    // Фильтрация по категории
    if (params.category) {
      filteredTemplates = filteredTemplates.filter(template => template.category === params.category);
    }
    
    // Фильтрация по статусу
    if (params.status) {
      filteredTemplates = filteredTemplates.filter(template => template.status === params.status);
    }
    
    // Фильтрация по системным/пользовательским
    if (params.is_system !== undefined) {
      filteredTemplates = filteredTemplates.filter(template => template.is_system === params.is_system);
    }
    
    // Фильтрация по поддержке планирования
    if (params.supports_scheduling !== undefined) {
      filteredTemplates = filteredTemplates.filter(template => template.supports_scheduling === params.supports_scheduling);
    }
    
    // Сортировка
    const sortBy = params.sort_by || 'display_name';
    const sortOrder = params.sort_order || 'asc';
    
    filteredTemplates.sort((a, b) => {
      let valueA: any, valueB: any;
      
      switch (sortBy) {
        case 'name':
          valueA = a.name;
          valueB = b.name;
          break;
        case 'display_name':
          valueA = a.display_name;
          valueB = b.display_name;
          break;
        case 'category':
          valueA = a.category;
          valueB = b.category;
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
    
    // Пагинация
    const page = params.page || 1;
    const limit = params.limit || 50;
    const total = filteredTemplates.length;
    const total_pages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const pageTemplates = filteredTemplates.slice(startIndex, endIndex);
    
    return {
      data: pageTemplates,
      total,
      page,
      limit,
      total_pages
    };
  },

  async get(id: CommandTemplateId): Promise<CommandTemplate> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const template = allTemplates.find(t => t.id === id);
    if (!template) {
      throw new ApiError(404, 'Command template not found');
    }
    
    return template;
  },

  async create(data: CreateCommandTemplateRequest): Promise<CommandTemplate> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Проверяем уникальность технического названия
    const existingTemplate = allTemplates.find(t => t.name === data.name);
    if (existingTemplate) {
      throw new ApiError(400, 'Template with this technical name already exists');
    }
    
    const newTemplate: CommandTemplate = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      display_name: data.display_name,
      description: data.description,
      category: data.category,
      status: 'active',
      is_system: false, // Пользовательские шаблоны всегда не системные
      version: '1.0.0',
      param_schema: data.param_schema,
      default_params: data.default_params,
      required_params: data.required_params,
      allowed_targets: data.allowed_targets,
      default_target: data.default_target,
      execution_timeout: data.execution_timeout,
      retry_count: data.retry_count,
      required_permissions: data.required_permissions,
      is_dangerous: data.is_dangerous || false,
      requires_confirmation: data.requires_confirmation || false,
      supports_scheduling: data.supports_scheduling ?? true,
      supports_batch_execution: data.supports_batch_execution || false,
      documentation_url: data.documentation_url,
      examples: data.examples,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Добавляем в список всех шаблонов
    allTemplates.push(newTemplate);
    saveUserTemplates();
    
    return newTemplate;
  },

  async update(id: CommandTemplateId, data: UpdateCommandTemplateRequest): Promise<CommandTemplate> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const templateIndex = allTemplates.findIndex(t => t.id === id);
    if (templateIndex === -1) {
      throw new ApiError(404, 'Command template not found');
    }
    
    const existingTemplate = allTemplates[templateIndex];
    
    // Нельзя редактировать системные шаблоны
    if (existingTemplate.is_system) {
      throw new ApiError(403, 'Cannot modify system templates');
    }
    
    const updatedTemplate = {
      ...existingTemplate,
      ...data,
      updated_at: new Date().toISOString()
    };
    
    // Обновляем в списке
    allTemplates[templateIndex] = updatedTemplate;
    saveUserTemplates();
    
    return updatedTemplate;
  },

  async updateStatus(id: CommandTemplateId, status: 'active' | 'inactive' | 'deprecated'): Promise<CommandTemplate> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const templateIndex = allTemplates.findIndex(t => t.id === id);
    if (templateIndex === -1) {
      throw new ApiError(404, 'Command template not found');
    }
    
    const updatedTemplate = {
      ...allTemplates[templateIndex],
      status,
      updated_at: new Date().toISOString()
    };
    
    // Если это пользовательский шаблон, сохраняем изменения
    if (!updatedTemplate.is_system) {
      allTemplates[templateIndex] = updatedTemplate;
      saveUserTemplates();
    } else {
      // Для системных шаблонов только имитируем изменение
      allTemplates[templateIndex] = updatedTemplate;
    }
    
    return updatedTemplate;
  },

  async delete(id: CommandTemplateId): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const templateIndex = allTemplates.findIndex(t => t.id === id);
    if (templateIndex === -1) {
      throw new ApiError(404, 'Command template not found');
    }
    
    const template = allTemplates[templateIndex];
    
    // Нельзя удалить системные шаблоны
    if (template.is_system) {
      throw new ApiError(403, 'Cannot delete system templates');
    }
    
    // Удаляем из списка
    allTemplates.splice(templateIndex, 1);
    saveUserTemplates();
  },

  async duplicate(id: CommandTemplateId): Promise<CommandTemplate> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const originalTemplate = allTemplates.find(t => t.id === id);
    if (!originalTemplate) {
      throw new ApiError(404, 'Command template not found');
    }
    
    const duplicatedTemplate: CommandTemplate = {
      ...originalTemplate,
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${originalTemplate.name}_copy`,
      display_name: `${originalTemplate.display_name} (копия)`,
      is_system: false, // Копии всегда пользовательские
      status: 'active',
      version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Добавляем копию
    allTemplates.push(duplicatedTemplate);
    saveUserTemplates();
    
    return duplicatedTemplate;
  }
};

// Экспорт API для шаблонов команд
export const currentCommandTemplatesAPI = mockCommandTemplatesAPI;

// 🔄 ДЛЯ PRODUCTION: Заменить на импорт из apiSwitch.ts: