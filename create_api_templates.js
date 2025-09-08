/**
 * Создание шаблонов API команд для новых эндпоинтов торговой сети
 */

import { createClient } from '@supabase/supabase-js';

// Конфигурация Supabase
const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Системные шаблоны API команд
const apiTemplates = [
  {
    id: 'api_tanks_info',
    name: 'tanks_info_api',
    description: 'Получение информации по резервуарам с API торговой сети',
    scope: 'trading_point',
    mode: 'sync',
    status: 'active',
    http_method: 'GET',
    url_template: 'https://pos.autooplata.ru/tms/v1/tanks?system={system_id}&station={station_id}',
    api_schema: {
      type: 'object',
      properties: {
        parameters: {
          type: 'object',
          properties: {
            system_id: {
              type: 'string',
              description: 'ID системы торговой сети',
              required: true
            },
            station_id: {
              type: 'string', 
              description: 'ID торговой точки',
              required: true
            }
          },
          required: ['system_id', 'station_id']
        },
        response: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              number: { type: 'integer', description: 'Номер резервуара' },
              fuel: { type: 'integer', description: 'ID типа топлива' },
              fuel_name: { type: 'string', description: 'Название топлива' },
              state: { type: 'integer', description: 'Состояние резервуара' },
              volume_begin: { type: ['string', 'null'], description: 'Начальный объем' },
              volume_end: { type: 'string', description: 'Конечный объем' },
              volume_max: { type: 'string', description: 'Максимальный объем' },
              volume_free: { type: 'string', description: 'Свободный объем' },
              volume: { type: 'string', description: 'Текущий объем' },
              amount_begin: { type: ['string', 'null'], description: 'Начальное количество' },
              amount_end: { type: 'string', description: 'Конечное количество' },
              level: { type: 'string', description: 'Уровень топлива (%)' },
              water: {
                type: 'object',
                properties: {
                  volume: { type: 'string', description: 'Объем воды' },
                  amount: { type: 'string', description: 'Количество воды' },
                  level: { type: 'string', description: 'Уровень воды' }
                }
              },
              temperature: { type: 'string', description: 'Температура (°C)' },
              density: { type: 'string', description: 'Плотность топлива' },
              release: {
                type: 'object',
                properties: {
                  volume: { type: 'string', description: 'Объем отпуска' },
                  amount: { type: 'string', description: 'Количество отпуска' }
                }
              },
              dt: { type: 'string', format: 'date-time', description: 'Время измерения' }
            }
          }
        }
      }
    },
    default_headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    timeout_ms: 30000,
    retry_policy: {
      max_attempts: 3,
      delay_ms: 1000,
      backoff_multiplier: 2
    },
    examples: [
      {
        name: 'Получить данные резервуаров торговой точки',
        description: 'Запрос информации по всем резервуарам конкретной станции',
        parameters: {
          system_id: '15',
          station_id: '77'
        },
        expected_response: 'Массив объектов с данными по резервуарам'
      }
    ],
    tags: ['tanks', 'fuel', 'monitoring', 'real-time'],
    is_system: true,
    version: '1.0.0'
  },
  {
    id: 'api_transactions_history',
    name: 'transactions_history_api',
    description: 'Получение истории транзакций с API торговой сети',
    scope: 'trading_point',
    mode: 'sync',
    status: 'active',
    http_method: 'GET',
    url_template: 'https://pos.autooplata.ru/tms/v1/transactions?system={system_id}&station={station_id}&dt_beg={date_from}&dt_end={date_to}&shift={shift_number}',
    api_schema: {
      type: 'object',
      properties: {
        parameters: {
          type: 'object',
          properties: {
            system_id: {
              type: 'string',
              description: 'ID системы торговой сети',
              required: true
            },
            station_id: {
              type: 'string',
              description: 'ID торговой точки', 
              required: true
            },
            date_from: {
              type: 'string',
              format: 'date-time',
              description: 'Начало периода (ISO 8601)',
              required: false
            },
            date_to: {
              type: 'string',
              format: 'date-time',
              description: 'Конец периода (ISO 8601)',
              required: false
            },
            shift_number: {
              type: 'integer',
              description: 'Номер смены для фильтрации',
              required: false
            }
          },
          required: ['system_id', 'station_id']
        },
        response: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer', description: 'ID транзакции' },
              pos: { type: 'integer', description: 'Номер POS терминала' },
              shift: { type: 'integer', description: 'Номер смены' },
              number: { type: 'integer', description: 'Номер транзакции в смене' },
              dt: { type: 'string', format: 'date-time', description: 'Время транзакции' },
              tank: { type: 'integer', description: 'Номер резервуара' },
              nozzle: { type: 'integer', description: 'Номер пистолета' },
              fuel: { type: 'integer', description: 'ID типа топлива' },
              fuel_name: { type: 'string', description: 'Название топлива' },
              card: { type: 'string', description: 'Номер карты (замаскированный)' },
              order: { type: 'string', description: 'Заказанное количество' },
              quantity: { type: 'string', description: 'Фактическое количество' },
              cost: { type: 'string', description: 'Стоимость' },
              price: { type: 'string', description: 'Цена за литр' },
              pay_type: {
                type: 'object',
                properties: {
                  id: { type: 'integer', description: 'ID способа оплаты' },
                  name: { type: 'string', description: 'Название способа оплаты' }
                }
              }
            }
          }
        }
      }
    },
    default_headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    timeout_ms: 45000,
    retry_policy: {
      max_attempts: 3,
      delay_ms: 1500,
      backoff_multiplier: 2
    },
    examples: [
      {
        name: 'Получить все транзакции торговой точки',
        description: 'Запрос всех транзакций без фильтрации по периоду',
        parameters: {
          system_id: '15',
          station_id: '77'
        },
        expected_response: 'Массив всех транзакций торговой точки'
      },
      {
        name: 'Получить транзакции за конкретную смену',
        description: 'Запрос транзакций конкретной смены',
        parameters: {
          system_id: '15',
          station_id: '77',
          shift_number: 6
        },
        expected_response: 'Массив транзакций указанной смены'
      },
      {
        name: 'Получить транзакции за период',
        description: 'Запрос транзакций в заданном временном диапазоне',
        parameters: {
          system_id: '15',
          station_id: '77',
          date_from: '2025-09-03T00:00:00',
          date_to: '2025-09-03T23:59:59'
        },
        expected_response: 'Массив транзакций за указанный день'
      }
    ],
    tags: ['transactions', 'sales', 'pos', 'history', 'reporting'],
    is_system: true,
    version: '1.0.0'
  },
  {
    id: 'api_realtime_tanks_monitor',
    name: 'realtime_tanks_monitor',
    description: 'Мониторинг резервуаров в реальном времени с автообновлением',
    scope: 'network',
    mode: 'async',
    status: 'active',
    http_method: 'GET',
    url_template: 'https://pos.autooplata.ru/tms/v1/tanks?system={system_id}&station={station_id}',
    api_schema: {
      type: 'object',
      properties: {
        parameters: {
          type: 'object',
          properties: {
            system_id: {
              type: 'string',
              description: 'ID системы торговой сети',
              required: true
            },
            station_id: {
              type: 'string',
              description: 'ID торговой точки или "all" для всех точек',
              required: true
            },
            refresh_interval: {
              type: 'integer',
              description: 'Интервал обновления в секундах',
              minimum: 30,
              maximum: 300,
              default: 60
            },
            alert_thresholds: {
              type: 'object',
              properties: {
                low_level: { type: 'number', description: 'Порог низкого уровня (%)', default: 20 },
                high_temperature: { type: 'number', description: 'Порог высокой температуры (°C)', default: 25 },
                water_level: { type: 'number', description: 'Порог уровня воды', default: 5 }
              }
            }
          },
          required: ['system_id', 'station_id']
        }
      }
    },
    default_headers: {
      'Accept': 'application/json'
    },
    timeout_ms: 60000,
    retry_policy: {
      max_attempts: 5,
      delay_ms: 2000,
      backoff_multiplier: 1.5
    },
    examples: [
      {
        name: 'Мониторинг всех точек сети',
        description: 'Непрерывный мониторинг резервуаров всех торговых точек',
        parameters: {
          system_id: '15',
          station_id: 'all',
          refresh_interval: 60,
          alert_thresholds: {
            low_level: 15,
            high_temperature: 30,
            water_level: 3
          }
        }
      }
    ],
    tags: ['monitoring', 'realtime', 'alerts', 'tanks', 'automation'],
    is_system: true,
    version: '1.0.0'
  },
  {
    id: 'api_shift_report_generator',
    name: 'shift_report_generator',
    description: 'Автогенерация отчета по смене на основе данных транзакций',
    scope: 'trading_point',
    mode: 'async',
    status: 'active',
    http_method: 'GET',
    url_template: 'https://pos.autooplata.ru/tms/v1/transactions?system={system_id}&station={station_id}&shift={shift_number}',
    api_schema: {
      type: 'object',
      properties: {
        parameters: {
          type: 'object',
          properties: {
            system_id: {
              type: 'string',
              description: 'ID системы торговой сети',
              required: true
            },
            station_id: {
              type: 'string',
              description: 'ID торговой точки',
              required: true
            },
            shift_number: {
              type: 'integer',
              description: 'Номер смены',
              required: true
            },
            report_format: {
              type: 'string',
              enum: ['pdf', 'excel', 'json'],
              default: 'json',
              description: 'Формат отчета'
            },
            include_details: {
              type: 'boolean',
              default: true,
              description: 'Включать детализацию по транзакциям'
            }
          },
          required: ['system_id', 'station_id', 'shift_number']
        },
        processing: {
          type: 'object',
          properties: {
            aggregate_by_fuel: { type: 'boolean', default: true },
            calculate_totals: { type: 'boolean', default: true },
            include_payment_methods: { type: 'boolean', default: true },
            generate_charts: { type: 'boolean', default: false }
          }
        }
      }
    },
    default_headers: {
      'Accept': 'application/json'
    },
    timeout_ms: 120000,
    retry_policy: {
      max_attempts: 2,
      delay_ms: 3000,
      backoff_multiplier: 2
    },
    examples: [
      {
        name: 'Создать отчет по смене',
        description: 'Генерация подробного отчета по завершенной смене',
        parameters: {
          system_id: '15',
          station_id: '77',
          shift_number: 6,
          report_format: 'json',
          include_details: true
        }
      }
    ],
    tags: ['reporting', 'shift', 'automation', 'analytics'],
    is_system: true,
    version: '1.0.0'
  }
];

// Также создадим обычные шаблоны команд для интеграции с этими API
const commandTemplates = [
  {
    id: 'cmd_sync_tanks_data',
    name: 'sync_tanks_data',
    display_name: 'Синхронизация данных резервуаров',
    description: 'Получение и сохранение актуальных данных по резервуарам из внешней системы',
    category: 'fuel_operations',
    status: 'active',
    is_system: true,
    version: '1.0.0',
    param_schema: {
      type: 'object',
      properties: {
        system_id: {
          type: 'string',
          description: 'ID системы торговой сети'
        },
        station_id: {
          type: 'string',
          description: 'ID торговой точки'
        },
        update_interval: {
          type: 'integer',
          minimum: 60,
          maximum: 3600,
          default: 300,
          description: 'Интервал обновления в секундах'
        }
      },
      required: ['system_id', 'station_id']
    },
    default_params: {
      update_interval: 300
    },
    required_params: ['system_id', 'station_id'],
    allowed_targets: ['specific_trading_point', 'all_trading_points'],
    execution_timeout: 60,
    retry_count: 2,
    required_permissions: ['fuel_data_access'],
    is_dangerous: false,
    requires_confirmation: false,
    supports_scheduling: true,
    supports_batch_execution: true,
    examples: [
      {
        name: 'Синхронизировать данные конкретной точки',
        description: 'Обновить данные резервуаров для торговой точки №77',
        params: {
          system_id: '15',
          station_id: '77',
          update_interval: 300
        }
      }
    ]
  },
  {
    id: 'cmd_generate_sales_report',
    name: 'generate_sales_report',
    display_name: 'Генерация отчета по продажам',
    description: 'Создание отчета по продажам на основе данных транзакций',
    category: 'reporting',
    status: 'active',
    is_system: true,
    version: '1.0.0',
    param_schema: {
      type: 'object',
      properties: {
        system_id: {
          type: 'string',
          description: 'ID системы торговой сети'
        },
        station_id: {
          type: 'string',
          description: 'ID торговой точки'
        },
        period_type: {
          type: 'string',
          enum: ['shift', 'day', 'week', 'month', 'custom'],
          default: 'day',
          description: 'Тип периода отчета'
        },
        date_from: {
          type: 'string',
          format: 'date',
          description: 'Начальная дата (для custom периода)'
        },
        date_to: {
          type: 'string',
          format: 'date',
          description: 'Конечная дата (для custom периода)'
        },
        shift_number: {
          type: 'integer',
          description: 'Номер смены (для shift периода)'
        },
        report_format: {
          type: 'string',
          enum: ['pdf', 'excel', 'json'],
          default: 'pdf'
        }
      },
      required: ['system_id', 'station_id', 'period_type']
    },
    default_params: {
      period_type: 'day',
      report_format: 'pdf'
    },
    required_params: ['system_id', 'station_id', 'period_type'],
    allowed_targets: ['specific_trading_point', 'all_trading_points'],
    execution_timeout: 180,
    retry_count: 1,
    required_permissions: ['report_generation'],
    is_dangerous: false,
    requires_confirmation: false,
    supports_scheduling: true,
    supports_batch_execution: true,
    examples: [
      {
        name: 'Отчет по смене',
        description: 'Создать отчет по конкретной смене',
        params: {
          system_id: '15',
          station_id: '77',
          period_type: 'shift',
          shift_number: 6,
          report_format: 'pdf'
        }
      }
    ]
  }
];

async function createAPITemplates() {
  console.log('🚀 Создание шаблонов API команд...');

  try {
    // Создаем API шаблоны
    console.log('📝 Создание API шаблонов...');
    const { data: apiData, error: apiError } = await supabase
      .from('api_templates')
      .insert(apiTemplates)
      .select();

    if (apiError) {
      console.log('⚠️ Таблица api_templates не найдена, создаем только command_templates');
    } else {
      console.log(`✅ Создано ${apiData.length} API шаблонов:`);
      apiData.forEach(template => {
        console.log(`  - ${template.name} (${template.scope})`);
      });
    }

    // Создаем обычные шаблоны команд
    console.log('📝 Создание шаблонов команд...');
    const { data: cmdData, error: cmdError } = await supabase
      .from('command_templates')
      .insert(commandTemplates)
      .select();

    if (cmdError) {
      console.error('❌ Ошибка создания шаблонов команд:', cmdError);
      throw cmdError;
    }

    console.log(`✅ Создано ${cmdData.length} шаблонов команд:`);
    cmdData.forEach(template => {
      console.log(`  - ${template.display_name} (${template.category})`);
    });

    // Проверяем общее количество
    const { count, error: countError } = await supabase
      .from('command_templates')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`📊 Всего шаблонов команд в базе: ${count}`);
    }

    console.log('\n🎉 Создание API шаблонов завершено!');

  } catch (error) {
    console.error('❌ Ошибка создания API шаблонов:', error);
    throw error;
  }
}

// Запуск
createAPITemplates().catch(console.error);