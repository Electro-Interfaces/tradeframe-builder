/**
 * Mock data store for New Command Templates
 * Provides realistic test data for the Templates & Connections system
 */

import { 
  NewCommandTemplate, 
  TemplateStatus, 
  TemplateScope, 
  TemplateMode, 
  HttpMethod,
  RetryPolicy,
  ApiSchema 
} from '@/types/connections';

// Helper to generate UUIDv7-like IDs
const generateId = () => `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Common retry policy configurations
const DEFAULT_RETRY_POLICY: RetryPolicy = {
  max_attempts: 3,
  backoff: 'exponential',
  initial_delay_ms: 1000,
  max_delay_ms: 10000,
  retry_on_status_codes: [408, 429, 500, 502, 503, 504]
};

// Autooplata TMS API schemas based on real specification
const AUTH_LOGIN_SCHEMA: ApiSchema = {
  request_body: {
    type: 'object',
    properties: {
      username: { type: 'string', description: 'Имя пользователя', example: 'UserTest' },
      password: { type: 'string', description: 'Пароль пользователя', example: 'sys5tem6' }
    },
    required: ['username', 'password']
  },
  response_body: {
    type: 'string',
    description: 'JWT токен для авторизации',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }
};

const GET_PRICES_SCHEMA: ApiSchema = {
  path_params: {
    type: 'object',
    properties: {
      station_number: { type: 'string', description: 'Номер АЗС' }
    },
    required: ['station_number']
  },
  query_params: {
    type: 'object',
    properties: {
      system: { type: 'integer', description: 'Номер системы' },
      date: { type: 'string', format: 'date-time', description: 'Дата запроса цен' }
    },
    required: ['system']
  },
  response_body: {
    type: 'object',
    properties: {
      prices: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            service_code: { type: 'integer', description: 'Код услуги' },
            service_name: { type: 'string', description: 'Наименование услуги' },
            price: { type: 'number', description: 'Цена за литр' }
          }
        }
      }
    }
  }
};

const SET_PRICES_SCHEMA: ApiSchema = {
  query_params: {
    type: 'object',
    properties: {
      system: { type: 'integer', description: 'Номер системы' },
      station: { type: 'integer', description: 'Номер АЗС' }
    },
    required: ['system', 'station']
  },
  request_body: {
    type: 'object',
    properties: {
      prices: { 
        type: 'object',
        description: 'Объект с ценами, где ключ - код услуги, значение - цена',
        patternProperties: {
          '^[0-9]+$': { type: 'number' }
        },
        example: { '2': 45.8, '3': 98.7 }
      },
      effective_date: { 
        type: 'string', 
        format: 'date-time', 
        description: 'Дата с которой цены начинают действовать' 
      }
    },
    required: ['prices', 'effective_date']
  }
};

const GET_SERVICES_SCHEMA: ApiSchema = {
  query_params: {
    type: 'object',
    properties: {
      system: { type: 'integer', description: 'Номер системы' }
    },
    required: ['system']
  },
  response_body: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        service_code: { type: 'integer', description: 'Код услуги' },
        service_name: { type: 'string', description: 'Наименование услуги' }
      }
    }
  }
};

const GET_EQUIPMENT_STATUS_SCHEMA: ApiSchema = {
  query_params: {
    type: 'object',
    properties: {
      system: { type: 'integer', description: 'Номер системы' },
      station: { type: 'integer', description: 'Номер АЗС' }
    },
    required: ['system', 'station']
  },
  response_body: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        system: { type: 'integer' },
        station: { type: 'integer' },
        shift: {
          type: 'object',
          properties: {
            number: { type: 'integer', description: 'Номер смены' },
            state: { type: 'string', description: 'Состояние смены' }
          }
        },
        pos: {
          type: 'array',
          description: 'Рабочие места',
          items: {
            type: 'object',
            properties: {
              number: { type: 'integer', description: 'Номер рабочего места' },
              dt_info: { type: 'string', format: 'date-time', description: 'Дата выгрузки статусов' },
              uptime: { type: 'string', format: 'date-time', description: 'Дата загрузки терминала' },
              shift: {
                type: 'object',
                properties: {
                  number: { type: 'integer' },
                  state: { type: 'string' },
                  dt_open: { type: 'string', format: 'date-time' },
                  dt_close: { type: 'string', format: 'date-time' }
                }
              },
              devices: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer', description: 'ID устройства' },
                    name: { type: 'string', description: 'Название устройства' },
                    state: { type: 'string', description: 'Состояние устройства' },
                    params: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          value: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

const RESTART_TERMINAL_SCHEMA: ApiSchema = {
  query_params: {
    type: 'object',
    properties: {
      system: { type: 'integer', description: 'Номер системы' },
      station: { type: 'integer', description: 'Номер АЗС' }
    },
    required: ['system', 'station']
  }
};

const EQUIPMENT_STATUS_SCHEMA: ApiSchema = {
  path_params: {
    type: 'object',
    properties: {
      equipment_id: { type: 'string', description: 'ID оборудования' }
    },
    required: ['equipment_id']
  },
  request_body: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['active', 'maintenance', 'offline'] },
      notes: { type: 'string' }
    },
    required: ['status']
  },
  response_body: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      updated_at: { type: 'string', format: 'date-time' }
    }
  }
};

const NETWORK_REPORT_SCHEMA: ApiSchema = {
  path_params: {
    type: 'object',
    properties: {
      network_id: { type: 'string', description: 'ID сети' }
    },
    required: ['network_id']
  },
  query_params: {
    type: 'object',
    properties: {
      report_type: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
      date: { type: 'string', format: 'date' },
      include_details: { type: 'boolean', default: false }
    },
    required: ['report_type', 'date']
  },
  response_body: {
    type: 'object',
    properties: {
      report_id: { type: 'string' },
      data: {
        type: 'object',
        properties: {
          sales_total: { type: 'number' },
          fuel_sold: { type: 'number' },
          transactions_count: { type: 'integer' }
        }
      }
    }
  }
};

// Mock command templates data based on real Autooplata TMS API
const newCommandTemplatesData: NewCommandTemplate[] = [
  {
    id: generateId(),
    template_id: 'autooplata_login',
    version: '1.0.0',
    provider_ref: 'cs_autooplata_tms_001',
    scope: 'network',
    mode: 'push',
    method: 'POST',
    endpoint: '/v1/login',
    schemas: AUTH_LOGIN_SCHEMA,
    retry_policy: DEFAULT_RETRY_POLICY,
    timeout_ms: 10000,
    idempotency: {
      enabled: false
    },
    name: 'Авторизация в Autooplata TMS',
    description: 'Получение JWT токена для авторизации в системе управления терминалами',
    documentation_url: 'https://pos.autooplata.ru/tms/docs',
    examples: [
      {
        name: 'Авторизация тестового пользователя',
        description: 'Получение токена для тестового доступа к API',
        request: {
          username: 'UserTest',
          password: 'sys5tem6'
        },
        response: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2dpbiI6eyJpZCI6IkFDQ0FFNDA4LTYzMzItNDI0NS04NUIxLTI1RjkxNEYzQkQ2NCIsIm5hbWUiOiJVc2VyVGVzdCIsInJvbGUiOm51bGx9LCJ1c2VyIjp7ImlkIjoiQUNDQUU0MDgtNjMzMi00MjQ1LTg1QjEtMjVGOTE0RjNCRDY0IiwibmFtZSI6IlVzZXJUZXN0In0sImV4cCI6MTc1NjgzMjA0OH0.vcl8_bvjhFvWySQ9V44A25PmBbAmQXieNg8_OCOGofI'
      }
    ],
    status: 'active',
    is_system: true,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-02-20T14:15:00Z',
    created_by: 'system',
    updated_by: 'admin',
    version_notes: 'Шаблон для авторизации в TMS Autooplata'
  },
  {
    id: generateId(),
    template_id: 'autooplata_get_prices',
    version: '1.0.0',
    provider_ref: 'cs_autooplata_tms_001',
    scope: 'trading_point',
    mode: 'pull',
    method: 'GET',
    endpoint: '/v1/pos/prices/{station_number}',
    schemas: GET_PRICES_SCHEMA,
    retry_policy: DEFAULT_RETRY_POLICY,
    timeout_ms: 8000,
    idempotency: {
      enabled: true,
      key_header: 'X-Request-ID'
    },
    name: 'Получение цен с АЗС',
    description: 'Получение актуальных цен на топливо с конкретной АЗС через TMS Autooplata',
    documentation_url: 'https://pos.autooplata.ru/tms/docs',
    examples: [
      {
        name: 'Получение цен с АЗС №77',
        description: 'Запрос цен на 1 сентября 2025 года с АЗС №77 системы №15',
        request: {
          station_number: '77',
          system: 15,
          date: '2025-09-01T17:25:58'
        },
        response: {
          prices: [
            { service_code: 2, service_name: 'АИ-92', price: 58.2 },
            { service_code: 3, service_name: 'АИ-95', price: 62.9 }
          ]
        }
      }
    ],
    status: 'active',
    is_system: true,
    created_at: '2024-01-20T09:00:00Z',
    updated_at: '2024-02-28T11:45:00Z',
    created_by: 'system',
    updated_by: 'admin',
    version_notes: 'Интеграция с реальным API Autooplata'
  },
  {
    id: generateId(),
    template_id: 'autooplata_set_prices',
    version: '1.0.0',
    provider_ref: 'cs_autooplata_tms_001',
    scope: 'trading_point',
    mode: 'push',
    method: 'POST',
    endpoint: '/v1/prices',
    schemas: SET_PRICES_SCHEMA,
    retry_policy: DEFAULT_RETRY_POLICY,
    timeout_ms: 10000,
    idempotency: {
      enabled: true,
      key_header: 'X-Request-ID'
    },
    name: 'Установка цен на АЗС',
    description: 'Установка новых цен на топливо через TMS Autooplata',
    documentation_url: 'https://pos.autooplata.ru/tms/docs',
    examples: [
      {
        name: 'Установка цен на АИ-92 и АИ-95',
        description: 'Установка цен на топливо с датой начала действия',
        request: {
          system: 15,
          station: 45,
          prices: {
            "2": 45.8,
            "3": 98.7
          },
          effective_date: "2025-09-01T09:50:34"
        }
      }
    ],
    status: 'active',
    is_system: true,
    created_at: '2024-01-25T12:00:00Z',
    updated_at: '2024-02-28T16:30:00Z',
    created_by: 'system',
    updated_by: 'admin',
    version_notes: 'Интеграция с реальным API Autooplata'
  },
  {
    id: generateId(),
    template_id: 'autooplata_get_services',
    version: '1.0.0',
    provider_ref: 'cs_autooplata_tms_001',
    scope: 'network',
    mode: 'pull',
    method: 'GET',
    endpoint: '/v1/services',
    schemas: GET_SERVICES_SCHEMA,
    retry_policy: DEFAULT_RETRY_POLICY,
    timeout_ms: 6000,
    idempotency: {
      enabled: false
    },
    name: 'Справочник услуг',
    description: 'Получение справочника услуг (топлива) из TMS Autooplata',
    documentation_url: 'https://pos.autooplata.ru/tms/docs',
    examples: [
      {
        name: 'Получение списка услуг системы 15',
        description: 'Запрос справочника услуг для системы номер 15',
        request: {
          system: 15
        },
        response: [
          { service_code: 1, service_name: "АИ-100" },
          { service_code: 2, service_name: "АИ-92" },
          { service_code: 3, service_name: "АИ-95" }
        ]
      }
    ],
    status: 'active',
    is_system: true,
    created_at: '2024-01-30T10:15:00Z',
    updated_at: '2024-02-28T14:45:00Z',
    created_by: 'system',
    updated_by: 'admin',
    version_notes: 'Интеграция с реальным API Autooplata'
  },
  {
    id: generateId(),
    template_id: 'autooplata_equipment_status',
    version: '1.0.0',
    provider_ref: 'cs_autooplata_tms_001',
    scope: 'trading_point',
    mode: 'pull',
    method: 'GET',
    endpoint: '/v1/info',
    schemas: GET_EQUIPMENT_STATUS_SCHEMA,
    retry_policy: DEFAULT_RETRY_POLICY,
    timeout_ms: 8000,
    idempotency: {
      enabled: false
    },
    name: 'Статусы оборудования (базовый)',
    description: 'Получение сокращенной информации о статусах оборудования АЗС',
    documentation_url: 'https://pos.autooplata.ru/tms/docs',
    examples: [
      {
        name: 'Статус оборудования АЗС 77',
        description: 'Получение статусов оборудования для АЗС 77 системы 15',
        request: {
          system: 15,
          station: 77
        }
      }
    ],
    status: 'active',
    is_system: true,
    created_at: '2024-02-05T09:30:00Z',
    updated_at: '2024-02-28T15:20:00Z',
    created_by: 'system',
    updated_by: 'admin',
    version_notes: 'Интеграция с реальным API Autooplata'
  },
  {
    id: generateId(),
    template_id: 'autooplata_equipment_status_extended',
    version: '1.0.0',
    provider_ref: 'cs_autooplata_tms_001',
    scope: 'trading_point',
    mode: 'pull',
    method: 'GET',
    endpoint: '/v2/info',
    schemas: GET_EQUIPMENT_STATUS_SCHEMA,
    retry_policy: DEFAULT_RETRY_POLICY,
    timeout_ms: 10000,
    idempotency: {
      enabled: false
    },
    name: 'Статусы оборудования (расширенный)',
    description: 'Получение расширенной информации о статусах оборудования АЗС с параметрами устройств',
    documentation_url: 'https://pos.autooplata.ru/tms/docs',
    examples: [
      {
        name: 'Расширенный статус оборудования АЗС 77',
        description: 'Получение подробных статусов с параметрами устройств для АЗС 77 системы 15',
        request: {
          system: 15,
          station: 77
        }
      }
    ],
    status: 'active',
    is_system: true,
    created_at: '2024-02-05T09:35:00Z',
    updated_at: '2024-02-28T15:25:00Z',
    created_by: 'system',
    updated_by: 'admin',
    version_notes: 'Интеграция с реальным API Autooplata'
  },
  {
    id: generateId(),
    template_id: 'autooplata_restart_terminal',
    version: '1.0.0',
    provider_ref: 'cs_autooplata_tms_001',
    scope: 'trading_point',
    mode: 'push',
    method: 'POST',
    endpoint: '/v1/control/restart',
    schemas: RESTART_TERMINAL_SCHEMA,
    retry_policy: {
      ...DEFAULT_RETRY_POLICY,
      max_attempts: 1
    },
    timeout_ms: 15000,
    idempotency: {
      enabled: false
    },
    name: 'Перезагрузка терминала',
    description: 'Удаленная перезагрузка терминала на АЗС через TMS Autooplata',
    documentation_url: 'https://pos.autooplata.ru/tms/docs',
    examples: [
      {
        name: 'Перезагрузка терминала АЗС 77',
        description: 'Принудительная перезагрузка терминала для АЗС 77 системы 15',
        request: {
          system: 15,
          station: 77
        }
      }
    ],
    status: 'active',
    is_system: true,
    created_at: '2024-02-10T11:00:00Z',
    updated_at: '2024-02-28T16:00:00Z',
    created_by: 'system',
    updated_by: 'admin',
    version_notes: 'Интеграция с реальным API Autooplata'
  },
  {
    id: generateId(),
    template_id: 'network_daily_report',
    version: '1.0.0',
    provider_ref: 'cs_analytics_platform_003',
    scope: 'network',
    mode: 'pull',
    method: 'GET',
    endpoint: '/reports/{network_id}/daily',
    schemas: NETWORK_REPORT_SCHEMA,
    retry_policy: DEFAULT_RETRY_POLICY,
    timeout_ms: 8000,
    idempotency: {
      enabled: false
    },
    name: 'Ежедневный отчет по сети',
    description: 'Получение ежедневного отчета по продажам и операциям в торговой сети',
    documentation_url: 'https://docs.company.com/templates/network-report',
    examples: [
      {
        name: 'Отчет за вчера с деталями',
        description: 'Получение детального отчета за предыдущий день',
        request: {
          network_id: 'net_001',
          report_type: 'daily',
          date: '2024-02-29',
          include_details: true
        },
        response: {
          report_id: 'rpt_20240229_net001',
          data: {
            sales_total: 1250000.50,
            fuel_sold: 15000.75,
            transactions_count: 342
          }
        }
      }
    ],
    status: 'active',
    is_system: false,
    created_at: '2024-02-01T08:45:00Z',
    updated_at: '2024-02-01T08:45:00Z',
    created_by: 'admin',
    updated_by: 'admin',
    version_notes: 'Начальная версия шаблона'
  },
  {
    id: generateId(),
    template_id: 'trading_point_sync',
    version: '1.5.2',
    provider_ref: 'cs_crm_system_004',
    scope: 'trading_point',
    mode: 'push',
    method: 'POST',
    endpoint: '/trading-points/{point_id}/sync',
    schemas: {
      path_params: {
        type: 'object',
        properties: {
          point_id: { type: 'string', description: 'ID торговой точки' }
        },
        required: ['point_id']
      },
      request_body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          address: { type: 'string' },
          contact_info: {
            type: 'object',
            properties: {
              phone: { type: 'string' },
              email: { type: 'string', format: 'email' }
            }
          },
          working_hours: { type: 'string' }
        },
        required: ['name', 'address']
      }
    },
    retry_policy: {
      ...DEFAULT_RETRY_POLICY,
      max_attempts: 5
    },
    timeout_ms: 6000,
    idempotency: {
      enabled: true,
      key_header: 'X-Request-ID'
    },
    name: 'Синхронизация данных торговой точки',
    description: 'Отправка обновленных данных торговой точки в CRM систему',
    status: 'inactive',
    is_system: false,
    created_at: '2024-01-25T11:30:00Z',
    updated_at: '2024-02-15T16:20:00Z',
    created_by: 'admin',
    updated_by: 'admin',
    version_notes: 'Исправлены проблемы с таймаутами'
  },
  {
    id: generateId(),
    template_id: 'component_diagnostics',
    version: '0.9.0-beta',
    provider_ref: 'cs_diagnostics_service_005',
    scope: 'component',
    mode: 'pull',
    method: 'GET',
    endpoint: '/diagnostics/component/{component_id}',
    schemas: {
      path_params: {
        type: 'object',
        properties: {
          component_id: { type: 'string', description: 'ID компонента' }
        },
        required: ['component_id']
      },
      query_params: {
        type: 'object',
        properties: {
          test_level: { type: 'string', enum: ['basic', 'extended', 'full'] },
          include_history: { type: 'boolean', default: false }
        }
      }
    },
    retry_policy: {
      ...DEFAULT_RETRY_POLICY,
      max_attempts: 1
    },
    timeout_ms: 15000,
    idempotency: {
      enabled: false
    },
    name: 'Диагностика компонентов',
    description: 'Получение диагностической информации о состоянии компонентов оборудования',
    status: 'draft',
    is_system: false,
    created_at: '2024-02-25T14:00:00Z',
    updated_at: '2024-02-28T10:30:00Z',
    created_by: 'developer',
    updated_by: 'developer',
    version_notes: 'Бета версия для тестирования'
  },
  {
    id: generateId(),
    template_id: 'payment_notification',
    version: '2.0.0',
    provider_ref: 'cs_payment_gateway_006',
    scope: 'trading_point',
    mode: 'push',
    method: 'POST',
    endpoint: '/payments/notify',
    schemas: {
      request_body: {
        type: 'object',
        properties: {
          transaction_id: { type: 'string' },
          amount: { type: 'number', minimum: 0 },
          currency: { type: 'string', enum: ['RUB', 'USD', 'EUR'] },
          payment_method: { type: 'string' },
          customer_info: {
            type: 'object',
            properties: {
              card_mask: { type: 'string' },
              receipt_email: { type: 'string', format: 'email' }
            }
          }
        },
        required: ['transaction_id', 'amount', 'currency', 'payment_method']
      }
    },
    retry_policy: {
      ...DEFAULT_RETRY_POLICY,
      max_attempts: 7,
      retry_on_status_codes: [408, 429, 500, 502, 503, 504, 520, 522]
    },
    timeout_ms: 4000,
    idempotency: {
      enabled: true,
      key_header: 'Idempotency-Key'
    },
    name: 'Уведомление о платеже',
    description: 'Отправка уведомления о совершенном платеже в платежную систему',
    status: 'deprecated',
    is_system: true,
    created_at: '2023-12-10T12:00:00Z',
    updated_at: '2024-01-15T09:30:00Z',
    created_by: 'system',
    updated_by: 'admin',
    version_notes: 'Заменен новой версией API'
  }
];

// Store interface
export const newCommandTemplatesStore = {
  // Get all templates
  getAll(): NewCommandTemplate[] {
    return [...newCommandTemplatesData];
  },

  // Get template by ID
  getById(id: string): NewCommandTemplate | undefined {
    return newCommandTemplatesData.find(t => t.id === id);
  },

  // Get templates by template_id (all versions)
  getByTemplateId(templateId: string): NewCommandTemplate[] {
    return newCommandTemplatesData.filter(t => t.template_id === templateId);
  },

  // Get latest version of a template
  getLatestVersion(templateId: string): NewCommandTemplate | undefined {
    const versions = this.getByTemplateId(templateId);
    if (versions.length === 0) return undefined;
    
    return versions.sort((a, b) => {
      // Simple semantic version comparison
      const aVersion = a.version.split('.').map(Number);
      const bVersion = b.version.split('.').map(Number);
      
      for (let i = 0; i < Math.max(aVersion.length, bVersion.length); i++) {
        const aPart = aVersion[i] || 0;
        const bPart = bVersion[i] || 0;
        
        if (aPart !== bPart) {
          return bPart - aPart; // Descending order
        }
      }
      return 0;
    })[0];
  },

  // Get templates by scope
  getByScope(scope: TemplateScope): NewCommandTemplate[] {
    return newCommandTemplatesData.filter(t => t.scope === scope);
  },

  // Get templates by status
  getByStatus(status: TemplateStatus): NewCommandTemplate[] {
    return newCommandTemplatesData.filter(t => t.status === status);
  },

  // Get active templates only
  getActive(): NewCommandTemplate[] {
    return newCommandTemplatesData.filter(t => t.status === 'active');
  },

  // Get system templates
  getSystem(): NewCommandTemplate[] {
    return newCommandTemplatesData.filter(t => t.is_system);
  },

  // Get user templates
  getUser(): NewCommandTemplate[] {
    return newCommandTemplatesData.filter(t => !t.is_system);
  },

  // Search templates
  search(query: string): NewCommandTemplate[] {
    const searchTerm = query.toLowerCase();
    return newCommandTemplatesData.filter(t =>
      t.template_id.toLowerCase().includes(searchTerm) ||
      t.name.toLowerCase().includes(searchTerm) ||
      t.description.toLowerCase().includes(searchTerm) ||
      t.version.toLowerCase().includes(searchTerm)
    );
  },

  // Get templates with pagination and filtering
  getFiltered(params: {
    template_id?: string;
    provider_ref?: string;
    scope?: TemplateScope;
    mode?: TemplateMode;
    status?: TemplateStatus;
    is_system?: boolean;
    search?: string;
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }) {
    let filtered = [...newCommandTemplatesData];

    // Apply filters
    if (params.template_id) {
      filtered = filtered.filter(t => t.template_id.includes(params.template_id!));
    }

    if (params.provider_ref) {
      filtered = filtered.filter(t => t.provider_ref === params.provider_ref);
    }

    if (params.scope) {
      filtered = filtered.filter(t => t.scope === params.scope);
    }

    if (params.mode) {
      filtered = filtered.filter(t => t.mode === params.mode);
    }

    if (params.status) {
      filtered = filtered.filter(t => t.status === params.status);
    }

    if (params.is_system !== undefined) {
      filtered = filtered.filter(t => t.is_system === params.is_system);
    }

    if (params.search) {
      const searchTerm = params.search.toLowerCase();
      filtered = filtered.filter(t =>
        t.template_id.toLowerCase().includes(searchTerm) ||
        t.name.toLowerCase().includes(searchTerm) ||
        t.description.toLowerCase().includes(searchTerm) ||
        t.version.toLowerCase().includes(searchTerm)
      );
    }

    // Apply sorting
    if (params.sort_by) {
      filtered.sort((a, b) => {
        const aVal = (a as any)[params.sort_by!];
        const bVal = (b as any)[params.sort_by!];
        
        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        else if (aVal > bVal) comparison = 1;
        
        return params.sort_order === 'desc' ? -comparison : comparison;
      });
    }

    // Apply pagination
    const page = params.page || 1;
    const limit = params.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filtered.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      total: filtered.length,
      page,
      limit,
      total_pages: Math.ceil(filtered.length / limit)
    };
  }
};

// Configuration constants
export const TEMPLATE_SCOPE_OPTIONS = [
  { value: 'network', label: 'Сеть', description: 'Шаблоны для работы с торговыми сетями' },
  { value: 'trading_point', label: 'Торговая точка', description: 'Шаблоны для работы с АЗС' },
  { value: 'equipment', label: 'Оборудование', description: 'Шаблоны для работы с оборудованием' },
  { value: 'component', label: 'Компонент', description: 'Шаблоны для работы с компонентами' }
];

export const TEMPLATE_MODE_OPTIONS = [
  { value: 'pull', label: 'Pull', description: 'Получение данных от внешнего API' },
  { value: 'push', label: 'Push', description: 'Отправка данных во внешний API' }
];

export const HTTP_METHOD_OPTIONS = [
  { value: 'GET', label: 'GET', description: 'Получение данных' },
  { value: 'POST', label: 'POST', description: 'Создание новых данных' },
  { value: 'PUT', label: 'PUT', description: 'Полное обновление данных' },
  { value: 'PATCH', label: 'PATCH', description: 'Частичное обновление данных' },
  { value: 'DELETE', label: 'DELETE', description: 'Удаление данных' }
];

export const TEMPLATE_STATUS_OPTIONS = [
  { value: 'active', label: 'Активный', description: 'Шаблон готов к использованию' },
  { value: 'inactive', label: 'Неактивный', description: 'Шаблон временно отключен' },
  { value: 'deprecated', label: 'Устарел', description: 'Шаблон устарел, рекомендуется замена' },
  { value: 'draft', label: 'Черновик', description: 'Шаблон в разработке' }
];

// Export for easy access to all templates
export const mockNewCommandTemplates = newCommandTemplatesStore.getAll();