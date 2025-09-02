import { ComponentTemplate, ComponentTemplateId } from '@/types/componentTemplate';
import { PersistentStorage } from '@/utils/persistentStorage';

// Шаблоны компонентов для POS-терминалов согласно API торговой сети
const initialComponentTemplates: ComponentTemplate[] = [
  {
    id: "1",
    name: "Картридер топливных карт",
    code: "CMP_TSO_FUELCR",
    description: "Картридер для чтения топливных карт в POS-терминале",
    systemType: "PAYMENT",
    statusValues: ["OK", "CARD_ERROR", "READER_ERROR", "OFFLINE"],
    isActive: true,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString()
  },
  {
    id: "2",
    name: "Картридер банковских карт",
    code: "CMP_TSO_BANKCR",
    description: "Картридер для банковских карт с поддержкой NFC",
    systemType: "PAYMENT",
    statusValues: ["OK", "CARD_ERROR", "NFC_ERROR", "PIN_ERROR", "OFFLINE"],
    isActive: true,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString()
  },
  {
    id: "3",
    name: "Фискальный регистратор",
    code: "CMP_TSO_KKT",
    description: "Фискальный регистратор для печати чеков и отправки данных в ОФД",
    systemType: "FISCAL",
    statusValues: ["OK", "FISCAL_ERROR", "OFD_ERROR", "PAPER_ERROR", "OFFLINE"],
    isActive: true,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString()
  },
  {
    id: "4",
    name: "Купюроприёмник",
    code: "CMP_TSO_CASHIN",
    description: "Купюроприёмник для приёма наличных платежей",
    systemType: "PAYMENT",
    statusValues: ["OK", "CASH_ERROR", "JAM_ERROR", "FULL_ERROR", "OFFLINE"],
    isActive: true,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString()
  },
  {
    id: "5",
    name: "МПС-ридер",
    code: "CMP_TSO_MPSR",
    description: "Ридер мобильных платёжных систем (NFC, QR-код, Apple Pay, Google Pay)",
    systemType: "PAYMENT",
    statusValues: ["OK", "NFC_ERROR", "QR_ERROR", "CONNECTION_ERROR", "OFFLINE"],
    isActive: true,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString()
  }
];

// Загружаем данные из localStorage (используем новый ключ для принудительного обновления)
let componentTemplatesData: ComponentTemplate[] = PersistentStorage.load<ComponentTemplate>('component_templates_v2', initialComponentTemplates);

// Функция для сохранения изменений
const saveComponentTemplates = () => {
  PersistentStorage.save('component_templates_v2', componentTemplatesData);
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