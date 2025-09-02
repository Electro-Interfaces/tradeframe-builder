import { ComponentTemplate, ComponentTemplateId } from '@/types/componentTemplate';
import { PersistentStorage } from '@/utils/persistentStorage';

// Начальные данные шаблонов компонентов
const initialComponentTemplates: ComponentTemplate[] = [
  // Компоненты резервуара
  {
    id: "1",
    name: "Датчик уровня",
    code: "CMP_RES_LEVEL",
    description: "Датчик измерения уровня топлива в резервуаре",
    systemType: "SENSOR",
    statusValues: ["OK", "WARNING", "ERROR", "OFFLINE"],
    isActive: true,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString()
  },
  {
    id: "2",
    name: "Датчик температуры",
    code: "CMP_RES_TEMP", 
    description: "Датчик измерения температуры топлива в резервуаре",
    systemType: "SENSOR",
    statusValues: ["OK", "WARNING", "ERROR", "OFFLINE"],
    isActive: true,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString()
  },
  {
    id: "3",
    name: "Датчик товарной воды",
    code: "CMP_RES_WATER",
    description: "Датчик контроля наличия воды в топливе",
    systemType: "SENSOR",
    statusValues: ["OK", "WARNING", "ERROR", "OFFLINE"],
    isActive: true,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString()
  },
  {
    id: "4",
    name: "Датчик утечки",
    code: "CMP_RES_LEAK",
    description: "Датчик обнаружения утечки топлива из резервуара",
    systemType: "SENSOR", 
    statusValues: ["OK", "LEAK_DETECTED", "ERROR", "OFFLINE"],
    isActive: true,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString()
  },
  // Компоненты терминала самообслуживания
  {
    id: "5",
    name: "Сенсорный экран",
    code: "CMP_SELFSERV_SCREEN",
    description: "Сенсорный экран терминала самообслуживания",
    systemType: "INTERFACE",
    statusValues: ["OK", "TOUCH_ERROR", "DISPLAY_ERROR", "OFFLINE"],
    isActive: true,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString()
  },
  {
    id: "6",
    name: "Терминал оплаты",
    code: "CMP_SELFSERV_PAYMENT",
    description: "Терминал оплаты картами и наличными",
    systemType: "PAYMENT",
    statusValues: ["OK", "CARD_ERROR", "CASH_ERROR", "OFFLINE"],
    isActive: true,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString()
  }
];

// Загружаем данные из localStorage
let componentTemplatesData: ComponentTemplate[] = PersistentStorage.load<ComponentTemplate>('component_templates', initialComponentTemplates);

// Функция для сохранения изменений
const saveComponentTemplates = () => {
  PersistentStorage.save('component_templates', componentTemplatesData);
};

// API для работы с шаблонами компонентов
export const componentTemplatesAPI = {
  // Получить все шаблоны
  async list(): Promise<ComponentTemplate[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return [...componentTemplatesData].sort((a, b) => a.name.localeCompare(b.name));
  },

  // Получить шаблон по ID
  async get(id: ComponentTemplateId): Promise<ComponentTemplate | null> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return componentTemplatesData.find(template => template.id === id) || null;
  },

  // Создать новый шаблон
  async create(data: Omit<ComponentTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<ComponentTemplate> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Проверяем уникальность кода
    const existingTemplate = componentTemplatesData.find(t => t.code === data.code);
    if (existingTemplate) {
      throw new Error('Component template with this code already exists');
    }

    const newTemplate: ComponentTemplate = {
      ...data,
      id: `comp_template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    componentTemplatesData.push(newTemplate);
    saveComponentTemplates();
    
    return newTemplate;
  },

  // Обновить шаблон
  async update(id: ComponentTemplateId, data: Partial<Omit<ComponentTemplate, 'id' | 'created_at'>>): Promise<ComponentTemplate | null> {
    await new Promise(resolve => setTimeout(resolve, 250));
    
    const templateIndex = componentTemplatesData.findIndex(t => t.id === id);
    if (templateIndex === -1) {
      return null;
    }

    // Проверяем уникальность кода при обновлении
    if (data.code) {
      const existingTemplate = componentTemplatesData.find(t => t.code === data.code && t.id !== id);
      if (existingTemplate) {
        throw new Error('Component template with this code already exists');
      }
    }

    const updatedTemplate: ComponentTemplate = {
      ...componentTemplatesData[templateIndex],
      ...data,
      updated_at: new Date().toISOString()
    };

    componentTemplatesData[templateIndex] = updatedTemplate;
    saveComponentTemplates();
    
    return updatedTemplate;
  },

  // Удалить шаблон
  async delete(id: ComponentTemplateId): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const templateIndex = componentTemplatesData.findIndex(t => t.id === id);
    if (templateIndex === -1) {
      return false;
    }

    componentTemplatesData.splice(templateIndex, 1);
    saveComponentTemplates();
    
    return true;
  },

  // Получить активные шаблоны
  async getActive(): Promise<ComponentTemplate[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return componentTemplatesData.filter(template => template.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  // Поиск шаблонов
  async search(query: string): Promise<ComponentTemplate[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (!query.trim()) {
      return this.list();
    }
    
    const searchLower = query.toLowerCase();
    return componentTemplatesData.filter(template =>
      template.name.toLowerCase().includes(searchLower) ||
      template.code.toLowerCase().includes(searchLower) ||
      template.description.toLowerCase().includes(searchLower)
    ).sort((a, b) => a.name.localeCompare(b.name));
  }
};

// Экспорт основного API
export const currentComponentTemplatesAPI = componentTemplatesAPI;