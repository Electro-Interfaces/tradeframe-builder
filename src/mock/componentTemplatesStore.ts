import { ComponentTemplate, ComponentTemplateId, EquipmentComponentCompatibility } from '@/types/component';

// Шаблоны компонентов для POS-терминалов согласно API торговой сети
const componentTemplatesData: ComponentTemplate[] = [
  // Компоненты терминала самообслуживания (сохраняемые)
  {
    id: "comp_tso_fuelcr_1",
    code: "CMP_TSO_FUELCR",
    name: "Картридер топливных карт",
    params_schema: {
      type: "object",
      properties: {
        supported_cards: { type: "array", items: { type: "string" } },
        interface: { type: "string", enum: ["USB", "RS232", "Ethernet"] },
        encryption: { type: "boolean" }
      },
      required: ["interface"]
    },
    defaults: {
      supported_cards: ["Petrol Plus", "Shell Card", "BP Card"],
      interface: "USB",
      encryption: true
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_tso_bankcr_1",
    code: "CMP_TSO_BANKCR",
    name: "Картридер банковских карт",
    params_schema: {
      type: "object",
      properties: {
        payment_types: { type: "array", items: { type: "string" } },
        nfc_enabled: { type: "boolean" },
        pin_pad: { type: "boolean" }
      },
      required: ["payment_types"]
    },
    defaults: {
      payment_types: ["Visa", "Mastercard", "Мир"],
      nfc_enabled: true,
      pin_pad: true
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_tso_kkt_1",
    code: "CMP_TSO_KKT",
    name: "Фискальный регистратор",
    params_schema: {
      type: "object",
      properties: {
        model: { type: "string" },
        fiscal_memory: { type: "boolean" },
        ofd_connection: { type: "string" }
      },
      required: ["model"]
    },
    defaults: {
      model: "АТОЛ 91Ф",
      fiscal_memory: true,
      ofd_connection: "ethernet"
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_tso_cashin_1",
    code: "CMP_TSO_CASHIN",
    name: "Купюроприёмник",
    params_schema: {
      type: "object",
      properties: {
        currency: { type: "array", items: { type: "string" } },
        capacity: { type: "number" },
        recycling: { type: "boolean" }
      },
      required: ["currency", "capacity"]
    },
    defaults: {
      currency: ["RUB"],
      capacity: 600,
      recycling: false
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_tso_mpsr_1",
    code: "CMP_TSO_MPSR",
    name: "МПС-ридер",
    params_schema: {
      type: "object",
      properties: {
        supported_systems: { type: "array", items: { type: "string" } },
        connection_status: { type: "string", enum: ["connected", "disconnected", "error"] },
        protocol_version: { type: "string" }
      },
      required: ["supported_systems"]
    },
    defaults: {
      supported_systems: ["NFC", "QR-код", "Apple Pay", "Google Pay", "Samsung Pay"],
      connection_status: "connected",
      protocol_version: "2.0"
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Связи между шаблонами оборудования и компонентов
const compatibilityData: EquipmentComponentCompatibility[] = [
  // POS-терминал может содержать все компоненты TSO
  { equipment_template_id: "2", component_template_id: "comp_tso_fuelcr_1" },
  { equipment_template_id: "2", component_template_id: "comp_tso_bankcr_1" },
  { equipment_template_id: "2", component_template_id: "comp_tso_kkt_1" },
  { equipment_template_id: "2", component_template_id: "comp_tso_cashin_1" },
  { equipment_template_id: "2", component_template_id: "comp_tso_mpsr_1" },
];

export class ComponentTemplatesStore {
  private static templates: Map<ComponentTemplateId, ComponentTemplate> = new Map(
    componentTemplatesData.map(t => [t.id, t])
  );
  
  private static compatibilities: EquipmentComponentCompatibility[] = compatibilityData;

  static getAll(): ComponentTemplate[] {
    return Array.from(this.templates.values()).filter(t => !t.deleted_at);
  }

  static getById(id: ComponentTemplateId): ComponentTemplate | undefined {
    const template = this.templates.get(id);
    return template && !template.deleted_at ? template : undefined;
  }

  static getByCode(code: string): ComponentTemplate | undefined {
    return Array.from(this.templates.values()).find(t => t.code === code && !t.deleted_at);
  }

  static create(template: Omit<ComponentTemplate, 'id' | 'created_at' | 'updated_at'>): ComponentTemplate {
    const newTemplate: ComponentTemplate = {
      ...template,
      id: `comp_${Date.now()}` as ComponentTemplateId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.templates.set(newTemplate.id, newTemplate);
    return newTemplate;
  }

  static update(id: ComponentTemplateId, updates: Partial<ComponentTemplate>): ComponentTemplate | undefined {
    const template = this.templates.get(id);
    if (!template || template.deleted_at) return undefined;
    
    const updated = {
      ...template,
      ...updates,
      id,
      updated_at: new Date().toISOString()
    };
    this.templates.set(id, updated);
    return updated;
  }

  static delete(id: ComponentTemplateId): boolean {
    const template = this.templates.get(id);
    if (!template) return false;
    
    // Soft delete
    template.deleted_at = new Date().toISOString();
    this.templates.set(id, template);
    return true;
  }

  static getCompatibleTemplates(equipmentTemplateId: string): ComponentTemplate[] {
    const compatibleIds = this.compatibilities
      .filter(c => c.equipment_template_id === equipmentTemplateId)
      .map(c => c.component_template_id);
    
    return compatibleIds
      .map(id => this.getById(id as ComponentTemplateId))
      .filter((t): t is ComponentTemplate => t !== undefined);
  }

  static isCompatible(equipmentTemplateId: string, componentTemplateId: ComponentTemplateId): boolean {
    return this.compatibilities.some(
      c => c.equipment_template_id === equipmentTemplateId && 
           c.component_template_id === componentTemplateId
    );
  }
}

export const componentTemplatesStore = ComponentTemplatesStore;