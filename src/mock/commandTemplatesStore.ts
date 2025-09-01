import { 
  CommandTemplate, 
  CommandTemplateId, 
  CommandCategory,
  TargetType 
} from '@/types/commandTemplate';

// Моковые данные шаблонов команд
const commandTemplatesData: CommandTemplate[] = [
  // === SHIFT OPERATIONS ===
  {
    id: 'cmd_shift_open',
    name: 'shift_open',
    display_name: 'Открыть смену',
    description: 'Открывает новую смену на указанных торговых точках или оборудовании',
    category: 'shift_operations',
    status: 'active',
    is_system: true,
    version: '1.0.0',
    param_schema: {
      type: 'object',
      properties: {
        shift_type: {
          type: 'string',
          title: 'Тип смены',
          enum: ['day', 'night', 'extended'],
          enumNames: ['Дневная', 'Ночная', 'Суточная'],
          default: 'day'
        },
        operator_id: {
          type: 'string',
          title: 'ID оператора',
          description: 'Уникальный идентификатор оператора смены'
        },
        initial_cash: {
          type: 'number',
          title: 'Начальная касса',
          minimum: 0,
          default: 0,
          description: 'Сумма наличных в кассе на начало смены'
        }
      },
      required: ['shift_type', 'operator_id']
    },
    default_params: {
      shift_type: 'day',
      initial_cash: 0
    },
    required_params: ['shift_type', 'operator_id'],
    allowed_targets: ['all_trading_points', 'specific_trading_point', 'specific_equipment'],
    default_target: {
      type: 'all_trading_points',
      description: 'Все торговые точки'
    },
    execution_timeout: 30,
    retry_count: 2,
    required_permissions: ['shift_management'],
    is_dangerous: false,
    requires_confirmation: false,
    supports_scheduling: true,
    supports_batch_execution: true,
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-08-15T14:30:00Z',
    examples: [
      {
        name: 'Открытие дневной смены',
        description: 'Стандартное открытие дневной смены на всех АЗС',
        params: {
          shift_type: 'day',
          operator_id: 'OP001',
          initial_cash: 5000
        },
        target: {
          type: 'all_trading_points',
          description: 'Все торговые точки'
        }
      }
    ]
  },
  
  {
    id: 'cmd_shift_close',
    name: 'shift_close',
    display_name: 'Закрыть смену',
    description: 'Завершает текущую смену с формированием отчета',
    category: 'shift_operations',
    status: 'active',
    is_system: true,
    version: '1.2.0',
    param_schema: {
      type: 'object',
      properties: {
        force_close: {
          type: 'boolean',
          title: 'Принудительное закрытие',
          default: false,
          description: 'Закрыть смену даже при наличии незавершенных операций'
        },
        generate_report: {
          type: 'boolean',
          title: 'Создать отчет',
          default: true,
          description: 'Автоматически создать отчет о смене'
        },
        email_report: {
          type: 'string',
          title: 'Email для отчета',
          format: 'email',
          description: 'Отправить отчет на указанный email'
        }
      },
      required: []
    },
    default_params: {
      force_close: false,
      generate_report: true
    },
    required_params: [],
    allowed_targets: ['all_trading_points', 'specific_trading_point', 'specific_equipment'],
    execution_timeout: 120,
    retry_count: 1,
    required_permissions: ['shift_management'],
    is_dangerous: false,
    requires_confirmation: true,
    supports_scheduling: true,
    supports_batch_execution: true,
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-08-20T09:15:00Z'
  },

  // === PRICING ===
  {
    id: 'cmd_price_update',
    name: 'price_update',
    display_name: 'Обновить цены на топливо',
    description: 'Устанавливает новые цены на топливо для указанного оборудования',
    category: 'pricing',
    status: 'active',
    is_system: true,
    version: '2.1.0',
    param_schema: {
      type: 'object',
      properties: {
        fuel_type: {
          type: 'string',
          title: 'Тип топлива',
          enum: ['ai92', 'ai95', 'ai98', 'dt', 'gas'],
          enumNames: ['АИ-92', 'АИ-95', 'АИ-98', 'ДТ', 'Газ'],
          description: 'Тип топлива для изменения цены'
        },
        new_price: {
          type: 'number',
          title: 'Новая цена',
          minimum: 0,
          maximum: 1000,
          multipleOf: 0.01,
          description: 'Цена в рублях за литр'
        },
        effective_date: {
          type: 'string',
          title: 'Дата вступления в силу',
          format: 'date-time',
          description: 'Когда начнет действовать новая цена (по умолчанию - немедленно)'
        },
        price_change_reason: {
          type: 'string',
          title: 'Причина изменения',
          enum: ['market_conditions', 'supplier_change', 'government_regulation', 'promotion', 'other'],
          enumNames: ['Рыночные условия', 'Смена поставщика', 'Государственное регулирование', 'Акция', 'Другое']
        }
      },
      required: ['fuel_type', 'new_price']
    },
    default_params: {},
    required_params: ['fuel_type', 'new_price'],
    allowed_targets: ['all_trading_points', 'specific_trading_point', 'equipment_type', 'specific_equipment'],
    default_target: {
      type: 'equipment_type',
      value: 'dispenser',
      description: 'Все топливораздаточные колонки'
    },
    execution_timeout: 60,
    retry_count: 3,
    required_permissions: ['pricing_management'],
    is_dangerous: true,
    requires_confirmation: true,
    supports_scheduling: true,
    supports_batch_execution: true,
    created_at: '2024-01-05T12:00:00Z',
    updated_at: '2024-08-25T16:45:00Z',
    examples: [
      {
        name: 'Обновление цены АИ-95',
        description: 'Установка новой цены на АИ-95 на всех ТРК',
        params: {
          fuel_type: 'ai95',
          new_price: 54.30,
          price_change_reason: 'market_conditions'
        },
        target: {
          type: 'equipment_type',
          value: 'dispenser',
          description: 'Все топливораздаточные колонки'
        }
      }
    ]
  },

  // === REPORTING ===
  {
    id: 'cmd_report_generate',
    name: 'report_generate',
    display_name: 'Сформировать отчет',
    description: 'Создает различные типы отчетов за указанный период',
    category: 'reporting',
    status: 'active',
    is_system: true,
    version: '1.5.0',
    param_schema: {
      type: 'object',
      properties: {
        report_type: {
          type: 'string',
          title: 'Тип отчета',
          enum: ['sales_summary', 'fuel_inventory', 'shift_report', 'financial', 'equipment_status', 'custom'],
          enumNames: ['Сводка продаж', 'Остатки топлива', 'Отчет смены', 'Финансовый', 'Статус оборудования', 'Пользовательский']
        },
        date_from: {
          type: 'string',
          title: 'Дата начала',
          format: 'date',
          description: 'Начальная дата периода отчета'
        },
        date_to: {
          type: 'string',
          title: 'Дата окончания',
          format: 'date',
          description: 'Конечная дата периода отчета'
        },
        format: {
          type: 'string',
          title: 'Формат отчета',
          enum: ['pdf', 'excel', 'csv', 'json'],
          enumNames: ['PDF', 'Excel', 'CSV', 'JSON'],
          default: 'pdf'
        },
        email_to: {
          type: 'array',
          title: 'Отправить на email',
          items: {
            type: 'string',
            format: 'email'
          },
          description: 'Список email адресов для отправки отчета'
        },
        include_charts: {
          type: 'boolean',
          title: 'Включить графики',
          default: true,
          description: 'Добавить графики и диаграммы в отчет'
        }
      },
      required: ['report_type', 'date_from', 'date_to']
    },
    default_params: {
      format: 'pdf',
      include_charts: true
    },
    required_params: ['report_type', 'date_from', 'date_to'],
    allowed_targets: ['all_networks', 'specific_network', 'all_trading_points', 'specific_trading_point'],
    execution_timeout: 300,
    retry_count: 2,
    required_permissions: ['reporting'],
    is_dangerous: false,
    requires_confirmation: false,
    supports_scheduling: true,
    supports_batch_execution: false,
    created_at: '2024-01-08T14:00:00Z',
    updated_at: '2024-08-22T11:20:00Z'
  },

  // === MAINTENANCE ===
  {
    id: 'cmd_equipment_restart',
    name: 'equipment_restart',
    display_name: 'Перезапустить оборудование',
    description: 'Выполняет безопасный перезапуск указанного оборудования',
    category: 'maintenance',
    status: 'active',
    is_system: true,
    version: '1.0.5',
    param_schema: {
      type: 'object',
      properties: {
        restart_type: {
          type: 'string',
          title: 'Тип перезапуска',
          enum: ['soft', 'hard', 'service_only'],
          enumNames: ['Мягкий', 'Жесткий', 'Только сервисы'],
          default: 'soft',
          description: 'Способ перезапуска оборудования'
        },
        wait_timeout: {
          type: 'integer',
          title: 'Таймаут ожидания (сек)',
          minimum: 30,
          maximum: 600,
          default: 120,
          description: 'Время ожидания завершения перезапуска'
        },
        send_notification: {
          type: 'boolean',
          title: 'Отправить уведомление',
          default: true,
          description: 'Уведомить администраторов о перезапуске'
        }
      },
      required: ['restart_type']
    },
    default_params: {
      restart_type: 'soft',
      wait_timeout: 120,
      send_notification: true
    },
    required_params: ['restart_type'],
    allowed_targets: ['specific_equipment', 'equipment_type'],
    execution_timeout: 900,
    retry_count: 1,
    required_permissions: ['equipment_maintenance'],
    is_dangerous: true,
    requires_confirmation: true,
    supports_scheduling: true,
    supports_batch_execution: true,
    created_at: '2024-01-12T16:30:00Z',
    updated_at: '2024-08-18T13:45:00Z'
  },

  // === BACKUP ===
  {
    id: 'cmd_backup_create',
    name: 'backup_create',
    display_name: 'Создать резервную копию',
    description: 'Создает резервную копию данных системы',
    category: 'backup',
    status: 'active',
    is_system: true,
    version: '2.0.0',
    param_schema: {
      type: 'object',
      properties: {
        backup_type: {
          type: 'string',
          title: 'Тип резервной копии',
          enum: ['full', 'incremental', 'differential', 'database_only', 'config_only'],
          enumNames: ['Полная', 'Инкрементальная', 'Дифференциальная', 'Только БД', 'Только конфигурация'],
          default: 'full'
        },
        compression_level: {
          type: 'integer',
          title: 'Уровень сжатия',
          minimum: 0,
          maximum: 9,
          default: 6,
          description: '0 - без сжатия, 9 - максимальное сжатие'
        },
        encryption_enabled: {
          type: 'boolean',
          title: 'Включить шифрование',
          default: true,
          description: 'Шифровать резервную копию'
        },
        storage_location: {
          type: 'string',
          title: 'Место хранения',
          enum: ['local', 'cloud', 'network_share'],
          enumNames: ['Локальное хранилище', 'Облако', 'Сетевое хранилище'],
          default: 'local'
        },
        retention_days: {
          type: 'integer',
          title: 'Срок хранения (дни)',
          minimum: 1,
          maximum: 365,
          default: 30,
          description: 'Количество дней для хранения резервной копии'
        }
      },
      required: ['backup_type']
    },
    default_params: {
      backup_type: 'full',
      compression_level: 6,
      encryption_enabled: true,
      storage_location: 'local',
      retention_days: 30
    },
    required_params: ['backup_type'],
    allowed_targets: ['all_networks', 'specific_network', 'all_trading_points', 'specific_trading_point'],
    execution_timeout: 3600,
    retry_count: 2,
    required_permissions: ['backup_management'],
    is_dangerous: false,
    requires_confirmation: false,
    supports_scheduling: true,
    supports_batch_execution: false,
    created_at: '2024-01-15T08:00:00Z',
    updated_at: '2024-08-28T10:30:00Z'
  },

  // === FUEL OPERATIONS ===
  {
    id: 'cmd_fuel_measurement',
    name: 'fuel_measurement',
    display_name: 'Измерить остатки топлива',
    description: 'Запускает процедуру измерения топлива в резервуарах',
    category: 'fuel_operations',
    status: 'active',
    is_system: false,
    version: '1.1.0',
    param_schema: {
      type: 'object',
      properties: {
        measurement_type: {
          type: 'string',
          title: 'Тип измерения',
          enum: ['volume', 'mass', 'both'],
          enumNames: ['Объем', 'Масса', 'Объем и масса'],
          default: 'volume'
        },
        temperature_compensation: {
          type: 'boolean',
          title: 'Температурная компенсация',
          default: true,
          description: 'Учитывать температуру при расчете объема'
        },
        save_to_history: {
          type: 'boolean',
          title: 'Сохранить в историю',
          default: true,
          description: 'Сохранить результаты измерения в базу данных'
        }
      },
      required: ['measurement_type']
    },
    default_params: {
      measurement_type: 'volume',
      temperature_compensation: true,
      save_to_history: true
    },
    required_params: ['measurement_type'],
    allowed_targets: ['equipment_type', 'specific_equipment'],
    default_target: {
      type: 'equipment_type',
      value: 'fuel_tank',
      description: 'Все топливные резервуары'
    },
    execution_timeout: 180,
    retry_count: 2,
    required_permissions: ['fuel_operations'],
    is_dangerous: false,
    requires_confirmation: false,
    supports_scheduling: true,
    supports_batch_execution: true,
    created_at: '2024-02-01T12:00:00Z',
    updated_at: '2024-08-20T14:15:00Z'
  },

  // === SYSTEM ===
  {
    id: 'cmd_system_health_check',
    name: 'system_health_check',
    display_name: 'Проверка работоспособности системы',
    description: 'Выполняет комплексную проверку состояния всех компонентов системы',
    category: 'system',
    status: 'active',
    is_system: true,
    version: '1.3.0',
    param_schema: {
      type: 'object',
      properties: {
        check_depth: {
          type: 'string',
          title: 'Глубина проверки',
          enum: ['basic', 'extended', 'full'],
          enumNames: ['Базовая', 'Расширенная', 'Полная'],
          default: 'basic'
        },
        include_performance: {
          type: 'boolean',
          title: 'Включить тесты производительности',
          default: false,
          description: 'Выполнить дополнительные тесты производительности'
        },
        generate_recommendations: {
          type: 'boolean',
          title: 'Создать рекомендации',
          default: true,
          description: 'Сформировать рекомендации по оптимизации'
        }
      },
      required: ['check_depth']
    },
    default_params: {
      check_depth: 'basic',
      include_performance: false,
      generate_recommendations: true
    },
    required_params: ['check_depth'],
    allowed_targets: ['all_networks', 'specific_network', 'all_trading_points', 'specific_trading_point'],
    execution_timeout: 600,
    retry_count: 1,
    required_permissions: ['system_monitoring'],
    is_dangerous: false,
    requires_confirmation: false,
    supports_scheduling: true,
    supports_batch_execution: false,
    created_at: '2024-01-20T09:00:00Z',
    updated_at: '2024-08-30T16:00:00Z'
  }
];

// Категории для группировки в UI
export const COMMAND_CATEGORIES = {
  shift_operations: {
    name: 'Операции со сменами',
    icon: '🕒',
    description: 'Открытие и закрытие смен, управление операторами'
  },
  pricing: {
    name: 'Ценовые операции',
    icon: '💰',
    description: 'Управление ценами на топливо и услуги'
  },
  reporting: {
    name: 'Отчетность',
    icon: '📊',
    description: 'Создание различных отчетов и статистики'
  },
  maintenance: {
    name: 'Обслуживание',
    icon: '🔧',
    description: 'Техническое обслуживание и диагностика оборудования'
  },
  backup: {
    name: 'Резервное копирование',
    icon: '💾',
    description: 'Создание и восстановление резервных копий'
  },
  system: {
    name: 'Системные операции',
    icon: '⚙️',
    description: 'Системная диагностика и мониторинг'
  },
  fuel_operations: {
    name: 'Операции с топливом',
    icon: '⛽',
    description: 'Измерение остатков, контроль качества топлива'
  },
  equipment_control: {
    name: 'Управление оборудованием',
    icon: '🏭',
    description: 'Контроль состояния и настройки оборудования'
  },
  pos_operations: {
    name: 'POS операции',
    icon: '💳',
    description: 'Операции с кассовыми системами'
  },
  security: {
    name: 'Безопасность',
    icon: '🔐',
    description: 'Операции обеспечения безопасности системы'
  },
  custom: {
    name: 'Пользовательские',
    icon: '🎯',
    description: 'Пользовательские команды и сценарии'
  }
} as const;

// Store для работы с шаблонами команд
export const commandTemplatesStore = {
  // Получить все шаблоны
  getAll(): CommandTemplate[] {
    return [...commandTemplatesData];
  },

  // Получить шаблон по ID
  getById(id: CommandTemplateId): CommandTemplate | undefined {
    return commandTemplatesData.find(template => template.id === id);
  },

  // Получить шаблоны по категории
  getByCategory(category: CommandCategory): CommandTemplate[] {
    return commandTemplatesData.filter(template => template.category === category);
  },

  // Получить активные шаблоны
  getActive(): CommandTemplate[] {
    return commandTemplatesData.filter(template => template.status === 'active');
  },

  // Получить системные шаблоны
  getSystem(): CommandTemplate[] {
    return commandTemplatesData.filter(template => template.is_system);
  },

  // Получить шаблоны, поддерживающие планирование
  getSchedulable(): CommandTemplate[] {
    return commandTemplatesData.filter(template => template.supports_scheduling);
  },

  // Получить шаблоны по типу цели
  getByTargetType(targetType: TargetType): CommandTemplate[] {
    return commandTemplatesData.filter(template => 
      template.allowed_targets.includes(targetType)
    );
  },

  // Поиск шаблонов
  search(query: string): CommandTemplate[] {
    if (!query.trim()) return this.getAll();
    
    const lowercaseQuery = query.toLowerCase();
    return commandTemplatesData.filter(template =>
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.display_name.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery)
    );
  },

  // Получить категории с количеством шаблонов
  getCategoriesWithCounts(): Array<{category: CommandCategory; count: number; info: any}> {
    const counts = commandTemplatesData.reduce((acc, template) => {
      acc[template.category] = (acc[template.category] || 0) + 1;
      return acc;
    }, {} as Record<CommandCategory, number>);

    return Object.entries(COMMAND_CATEGORIES).map(([key, info]) => ({
      category: key as CommandCategory,
      count: counts[key as CommandCategory] || 0,
      info
    }));
  },

  // Получить статистику использования (mock данные)
  getUsageStats(): Array<{templateId: CommandTemplateId; executions: number; success_rate: number}> {
    return commandTemplatesData.map(template => ({
      templateId: template.id,
      executions: Math.floor(Math.random() * 1000) + 10,
      success_rate: Math.round((Math.random() * 15 + 85) * 100) / 100 // 85-100%
    }));
  }
};