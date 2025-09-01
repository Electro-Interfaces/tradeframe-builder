import { ComponentTemplate, ComponentTemplateId, EquipmentComponentCompatibility } from '@/types/component';

// Полный набор шаблонов компонентов согласно системным требованиям
const componentTemplatesData: ComponentTemplate[] = [
  // Компоненты резервуаров
  {
    id: "comp_sensor_level_1",
    code: "CMP_RES_LEVEL",
    name: "Датчик уровня",
    params_schema: {
      type: "object",
      properties: {
        accuracy: { type: "number", minimum: 0.1, maximum: 5.0 },
        range_min: { type: "number", minimum: 0 },
        range_max: { type: "number", minimum: 100 },
        calibration_factor: { type: "number", minimum: 0.1, maximum: 2.0 }
      },
      required: ["accuracy", "range_max"]
    },
    defaults: {
      accuracy: 2.0,
      range_min: 0,
      range_max: 50000,
      calibration_factor: 1.0
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_sensor_temp_1",
    code: "CMP_RES_TEMP",
    name: "Датчик температуры",
    params_schema: {
      type: "object",
      properties: {
        accuracy: { type: "number", minimum: 0.1, maximum: 2.0 },
        range_min: { type: "number", minimum: -50 },
        range_max: { type: "number", minimum: 50, maximum: 150 },
        alarm_threshold: { type: "number" }
      },
      required: ["accuracy", "range_min", "range_max"]
    },
    defaults: {
      accuracy: 0.5,
      range_min: -40,
      range_max: 80,
      alarm_threshold: 45
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_sensor_water_1",
    code: "CMP_RES_WATER",
    name: "Датчик товарной воды",
    params_schema: {
      type: "object",
      properties: {
        sensitivity: { type: "number", minimum: 0.1, maximum: 5.0 },
        detection_level_mm: { type: "number", minimum: 0, maximum: 100 },
        alarm_enabled: { type: "boolean" }
      },
      required: ["sensitivity", "detection_level_mm"]
    },
    defaults: {
      sensitivity: 1.0,
      detection_level_mm: 10,
      alarm_enabled: true
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_sensor_leak_1",
    code: "CMP_RES_LEAK",
    name: "Датчик утечки",
    params_schema: {
      type: "object",
      properties: {
        sensitivity: { type: "number", minimum: 0.01, maximum: 1.0 },
        response_time: { type: "number", minimum: 1, maximum: 60 },
        auto_shutdown: { type: "boolean" }
      },
      required: ["sensitivity", "response_time"]
    },
    defaults: {
      sensitivity: 0.1,
      response_time: 5,
      auto_shutdown: true
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  // Компоненты терминала самообслуживания
  {
    id: "comp_tso_display_1",
    code: "CMP_TSO_DISPLAY",
    name: "Дисплей",
    params_schema: {
      type: "object",
      properties: {
        resolution: { type: "string" },
        brightness: { type: "number", minimum: 0, maximum: 100 },
        touchscreen: { type: "boolean" },
        size_inch: { type: "number" }
      },
      required: ["resolution"]
    },
    defaults: {
      resolution: "1920x1080",
      brightness: 75,
      touchscreen: true,
      size_inch: 21.5
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_tso_sw_1",
    code: "CMP_TSO_SW",
    name: "Программный модуль",
    params_schema: {
      type: "object",
      properties: {
        version: { type: "string" },
        license_type: { type: "string" },
        modules: { type: "array", items: { type: "string" } }
      },
      required: ["version"]
    },
    defaults: {
      version: "2.5.0",
      license_type: "commercial",
      modules: ["payment", "loyalty", "reporting"]
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_tso_fuelcr_1",
    code: "CMP_TSO_FUELCR",
    name: "Картридер топливных карт",
    params_schema: {
      type: "object",
      properties: {
        card_types: { type: "array", items: { type: "string" } },
        encryption: { type: "string" },
        connection_type: { type: "string" }
      },
      required: ["card_types"]
    },
    defaults: {
      card_types: ["mifare", "em-marine"],
      encryption: "AES256",
      connection_type: "USB"
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
        card_types: { type: "array", items: { type: "string" } },
        contactless: { type: "boolean" },
        pci_compliant: { type: "boolean" }
      },
      required: ["card_types"]
    },
    defaults: {
      card_types: ["visa", "mastercard", "mir"],
      contactless: true,
      pci_compliant: true
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_tso_kkt_1",
    code: "CMP_TSO_KKT",
    name: "ККТ",
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
    id: "comp_tso_butrk_1",
    code: "CMP_TSO_BUTRK",
    name: "БУТРК",
    params_schema: {
      type: "object",
      properties: {
        channels: { type: "number" },
        protocol: { type: "string" },
        max_flow_rate: { type: "number" }
      },
      required: ["channels"]
    },
    defaults: {
      channels: 8,
      protocol: "IFSF",
      max_flow_rate: 130
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  // Компоненты системы управления
  {
    id: "comp_sys_display_1",
    code: "CMP_SYS_DISPLAY",
    name: "Дисплей системы управления",
    params_schema: {
      type: "object",
      properties: {
        resolution: { type: "string" },
        multi_touch: { type: "boolean" },
        size_inch: { type: "number" }
      },
      required: ["resolution"]
    },
    defaults: {
      resolution: "1920x1080",
      multi_touch: true,
      size_inch: 24
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_sys_sw_1",
    code: "CMP_SYS_SW",
    name: "Программный модуль системы управления",
    params_schema: {
      type: "object",
      properties: {
        version: { type: "string" },
        database: { type: "string" },
        max_users: { type: "number" }
      },
      required: ["version"]
    },
    defaults: {
      version: "3.0.0",
      database: "PostgreSQL",
      max_users: 50
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_sys_fuelcr_1",
    code: "CMP_SYS_FUELCR",
    name: "Картридер топливных карт системы управления",
    params_schema: {
      type: "object",
      properties: {
        card_types: { type: "array", items: { type: "string" } },
        encryption: { type: "string" }
      },
      required: ["card_types"]
    },
    defaults: {
      card_types: ["mifare", "em-marine"],
      encryption: "AES256"
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_sys_bankcr_1",
    code: "CMP_SYS_BANKCR",
    name: "Картридер банковских карт системы управления",
    params_schema: {
      type: "object",
      properties: {
        card_types: { type: "array", items: { type: "string" } },
        contactless: { type: "boolean" }
      },
      required: ["card_types"]
    },
    defaults: {
      card_types: ["visa", "mastercard", "mir"],
      contactless: true
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_sys_kkt_1",
    code: "CMP_SYS_KKT",
    name: "ККТ системы управления",
    params_schema: {
      type: "object",
      properties: {
        model: { type: "string" },
        fiscal_memory: { type: "boolean" }
      },
      required: ["model"]
    },
    defaults: {
      model: "Эвотор 7.3",
      fiscal_memory: true
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_sys_cashin_1",
    code: "CMP_SYS_CASHIN",
    name: "Купюроприёмник системы управления",
    params_schema: {
      type: "object",
      properties: {
        currency: { type: "array", items: { type: "string" } },
        capacity: { type: "number" }
      },
      required: ["currency"]
    },
    defaults: {
      currency: ["RUB"],
      capacity: 1000
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_sys_butrk_1",
    code: "CMP_SYS_BUTRK",
    name: "БУТРК системы управления",
    params_schema: {
      type: "object",
      properties: {
        channels: { type: "number" },
        protocol: { type: "string" }
      },
      required: ["channels"]
    },
    defaults: {
      channels: 16,
      protocol: "IFSF"
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  // Компоненты табло цен
  {
    id: "comp_price_ctrl_1",
    code: "CMP_PRICE_CTRL",
    name: "Контроллер табло цен",
    params_schema: {
      type: "object",
      properties: {
        channels: { type: "number" },
        protocol: { type: "string" },
        update_interval: { type: "number" }
      },
      required: ["channels"]
    },
    defaults: {
      channels: 4,
      protocol: "RS485",
      update_interval: 60
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_price_panel_1",
    code: "CMP_PRICE_PANEL",
    name: "Панель отображения",
    params_schema: {
      type: "object",
      properties: {
        brightness: { type: "number" },
        digits: { type: "number" },
        color: { type: "string" }
      },
      required: ["brightness", "digits"]
    },
    defaults: {
      brightness: 5000,
      digits: 4,
      color: "red"
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  // Компоненты видеонаблюдения
  {
    id: "comp_cam_camera_1",
    code: "CMP_CAM_CAMERA",
    name: "Камера видеонаблюдения",
    params_schema: {
      type: "object",
      properties: {
        resolution: { type: "string" },
        fps: { type: "number" },
        night_vision: { type: "boolean" },
        ptz: { type: "boolean" }
      },
      required: ["resolution", "fps"]
    },
    defaults: {
      resolution: "4K",
      fps: 30,
      night_vision: true,
      ptz: false
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_cam_ctrl_1",
    code: "CMP_CAM_CTRL",
    name: "Контроллер видеонаблюдения",
    params_schema: {
      type: "object",
      properties: {
        channels: { type: "number" },
        storage_tb: { type: "number" },
        retention_days: { type: "number" }
      },
      required: ["channels"]
    },
    defaults: {
      channels: 16,
      storage_tb: 8,
      retention_days: 30
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  // Компоненты звукового сопровождения
  {
    id: "comp_sound_ctrl_1",
    code: "CMP_SOUND_CTRL",
    name: "Контроллер звукового сопровождения",
    params_schema: {
      type: "object",
      properties: {
        channels: { type: "number" },
        power_watts: { type: "number" },
        zones: { type: "number" }
      },
      required: ["channels"]
    },
    defaults: {
      channels: 4,
      power_watts: 100,
      zones: 3
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  // Оставляем старые для совместимости
  {
    id: "comp_printer_1",
    code: "PRINTER_THERMAL_58",
    name: "Термопринтер чеков 58мм",
    params_schema: {
      type: "object",
      properties: {
        paper_width: { type: "integer", enum: [58, 80] },
        print_speed: { type: "integer", minimum: 100, maximum: 300 },
        auto_cut: { type: "boolean" },
        encoding: { type: "string", enum: ["UTF-8", "CP866", "CP1251"] }
      },
      required: ["paper_width", "encoding"]
    },
    defaults: {
      paper_width: 58,
      print_speed: 150,
      auto_cut: true,
      encoding: "UTF-8"
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_pinpad_1",
    code: "PINPAD_VERIFONE_V200C",
    name: "Пинпад VeriFone V200c",
    params_schema: {
      type: "object",
      properties: {
        connection_type: { type: "string", enum: ["USB", "RS232", "Ethernet"] },
        encryption_level: { type: "string", enum: ["TDES", "AES128", "AES256"] },
        timeout_seconds: { type: "integer", minimum: 30, maximum: 300 }
      },
      required: ["connection_type", "encryption_level"]
    },
    defaults: {
      connection_type: "USB",
      encryption_level: "AES256",
      timeout_seconds: 60
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_server_1",
    code: "SERVER_INDUSTRIAL",
    name: "Промышленный сервер",
    params_schema: {
      type: "object",
      properties: {
        cpu_cores: { type: "integer", minimum: 2, maximum: 64 },
        ram_gb: { type: "integer", minimum: 4, maximum: 128 },
        storage_gb: { type: "integer", minimum: 120, maximum: 4000 },
        redundancy_level: { type: "integer", minimum: 0, maximum: 2 }
      },
      required: ["cpu_cores", "ram_gb", "storage_gb"]
    },
    defaults: {
      cpu_cores: 4,
      ram_gb: 8,
      storage_gb: 500,
      redundancy_level: 1
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_ups_1",
    code: "UPS_1500VA",
    name: "ИБП 1500VA",
    params_schema: {
      type: "object",
      properties: {
        capacity_va: { type: "integer", minimum: 500, maximum: 5000 },
        battery_backup_min: { type: "integer", minimum: 5, maximum: 120 },
        input_voltage: { type: "integer", enum: [110, 220, 240] },
        auto_test_enabled: { type: "boolean" }
      },
      required: ["capacity_va", "input_voltage"]
    },
    defaults: {
      capacity_va: 1500,
      battery_backup_min: 15,
      input_voltage: 220,
      auto_test_enabled: true
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_led_1",
    code: "LED_DISPLAY_7SEG",
    name: "7-сегментный LED дисплей",
    params_schema: {
      type: "object",
      properties: {
        digits_count: { type: "integer", minimum: 2, maximum: 8 },
        digit_height_mm: { type: "integer", minimum: 50, maximum: 300 },
        brightness_levels: { type: "integer", minimum: 1, maximum: 16 },
        color: { type: "string", enum: ["red", "green", "blue", "amber", "white"] }
      },
      required: ["digits_count", "color"]
    },
    defaults: {
      digits_count: 4,
      digit_height_mm: 100,
      brightness_levels: 8,
      color: "red"
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_camera_1",
    code: "IP_CAMERA_4MP",
    name: "IP-камера 4MP",
    params_schema: {
      type: "object",
      properties: {
        resolution: { type: "string", enum: ["1080p", "4MP", "4K"] },
        fps: { type: "integer", minimum: 15, maximum: 60 },
        night_vision: { type: "boolean" },
        ptz_enabled: { type: "boolean" },
        storage_days: { type: "integer", minimum: 7, maximum: 90 }
      },
      required: ["resolution", "fps"]
    },
    defaults: {
      resolution: "4MP",
      fps: 25,
      night_vision: true,
      ptz_enabled: false,
      storage_days: 30
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_dvr_1",
    code: "DVR_16CH_4TB",
    name: "Видеорегистратор 16-канальный",
    params_schema: {
      type: "object",
      properties: {
        channels_count: { type: "integer", minimum: 4, maximum: 64 },
        storage_tb: { type: "number", minimum: 1, maximum: 32 },
        compression: { type: "string", enum: ["H.264", "H.265", "MJPEG"] },
        remote_access: { type: "boolean" }
      },
      required: ["channels_count", "storage_tb", "compression"]
    },
    defaults: {
      channels_count: 16,
      storage_tb: 4,
      compression: "H.265",
      remote_access: true
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_speaker_1",
    code: "SPEAKER_CEILING_20W",
    name: "Потолочный громкоговоритель 20Вт",
    params_schema: {
      type: "object",
      properties: {
        power_watts: { type: "integer", minimum: 5, maximum: 100 },
        frequency_range_hz: { type: "string" },
        impedance_ohm: { type: "integer", enum: [4, 8, 16] },
        mounting_type: { type: "string", enum: ["ceiling", "wall", "pole"] }
      },
      required: ["power_watts", "impedance_ohm", "mounting_type"]
    },
    defaults: {
      power_watts: 20,
      frequency_range_hz: "80-20000",
      impedance_ohm: 8,
      mounting_type: "ceiling"
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "comp_amplifier_1",
    code: "AMPLIFIER_MIXER_240W",
    name: "Усилитель-смеситель 240Вт",
    params_schema: {
      type: "object",
      properties: {
        power_watts: { type: "integer", minimum: 50, maximum: 1000 },
        input_channels: { type: "integer", minimum: 2, maximum: 16 },
        zones_count: { type: "integer", minimum: 1, maximum: 8 },
        phantom_power: { type: "boolean" }
      },
      required: ["power_watts", "input_channels", "zones_count"]
    },
    defaults: {
      power_watts: 240,
      input_channels: 4,
      zones_count: 3,
      phantom_power: true
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Матрица совместимости оборудования и компонентов
const compatibilityMatrix: EquipmentComponentCompatibility[] = [
  // Резервуар - датчики уровня
  { equipment_template_id: "1", component_template_id: "comp_sensor_level_1" },
  
  // Терминал самообслуживания - принтер, пинпад
  { equipment_template_id: "2", component_template_id: "comp_printer_1" },
  { equipment_template_id: "2", component_template_id: "comp_pinpad_1" },
  
  // Система управления - сервер, ИБП
  { equipment_template_id: "3", component_template_id: "comp_server_1" },
  { equipment_template_id: "3", component_template_id: "comp_ups_1" },
  
  // Табло цен - LED дисплей
  { equipment_template_id: "4", component_template_id: "comp_led_1" },
  
  // Видеонаблюдение - камеры, видеорегистратор
  { equipment_template_id: "5", component_template_id: "comp_camera_1" },
  { equipment_template_id: "5", component_template_id: "comp_dvr_1" },
  
  // Звуковое сопровождение - громкоговорители, усилитель
  { equipment_template_id: "6", component_template_id: "comp_speaker_1" },
  { equipment_template_id: "6", component_template_id: "comp_amplifier_1" },
];

export const componentTemplatesStore = {
  // Получить все шаблоны компонентов
  getAll(): ComponentTemplate[] {
    return [...componentTemplatesData];
  },

  // Получить шаблон по ID
  getById(id: ComponentTemplateId): ComponentTemplate | null {
    return componentTemplatesData.find(template => template.id === id) || null;
  },

  // Получить совместимые шаблоны для типа оборудования
  getCompatibleTemplates(equipmentTemplateId: string): ComponentTemplate[] {
    const compatibleIds = compatibilityMatrix
      .filter(compat => compat.equipment_template_id === equipmentTemplateId)
      .map(compat => compat.component_template_id);
    
    return componentTemplatesData.filter(template => compatibleIds.includes(template.id));
  },

  // Проверить совместимость
  isCompatible(equipmentTemplateId: string, componentTemplateId: ComponentTemplateId): boolean {
    return compatibilityMatrix.some(compat => 
      compat.equipment_template_id === equipmentTemplateId && 
      compat.component_template_id === componentTemplateId
    );
  },

  // Получить шаблоны по коду
  getByCode(code: string): ComponentTemplate | null {
    return componentTemplatesData.find(template => template.code === code) || null;
  },

  // Поиск шаблонов
  search(query: string): ComponentTemplate[] {
    const lowerQuery = query.toLowerCase();
    return componentTemplatesData.filter(template =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.code.toLowerCase().includes(lowerQuery)
    );
  }
};