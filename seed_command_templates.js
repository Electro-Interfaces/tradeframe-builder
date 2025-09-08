/**
 * Заполнение базы данных начальными шаблонами команд
 */

import { createClient } from '@supabase/supabase-js';

// Конфигурация Supabase
const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Системные шаблоны команд
const systemTemplates = [
  {
    id: 'ct_system_backup_daily',
    name: 'system_backup_daily',
    display_name: 'Ежедневное резервное копирование',
    description: 'Создание ежедневной резервной копии данных системы',
    category: 'backup',
    status: 'active',
    is_system: true,
    version: '1.0.0',
    param_schema: {
      type: 'object',
      properties: {
        backup_type: {
          type: 'string',
          enum: ['full', 'incremental', 'differential'],
          default: 'incremental'
        },
        compression: {
          type: 'boolean',
          default: true
        }
      }
    },
    default_params: {
      backup_type: 'incremental',
      compression: true
    },
    required_params: [],
    allowed_targets: ['all_networks', 'specific_network'],
    execution_timeout: 3600,
    retry_count: 2,
    required_permissions: ['system_admin'],
    is_dangerous: false,
    requires_confirmation: false,
    supports_scheduling: true,
    supports_batch_execution: false,
    examples: []
  },
  {
    id: 'ct_fuel_price_update',
    name: 'fuel_price_update',
    display_name: 'Обновление цен на топливо',
    description: 'Массовое обновление цен на топливо для торговых точек',
    category: 'pricing',
    status: 'active',
    is_system: true,
    version: '1.2.0',
    param_schema: {
      type: 'object',
      properties: {
        fuel_type: {
          type: 'string',
          enum: ['AI-92', 'AI-95', 'AI-98', 'DT', 'gas']
        },
        price_change: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['absolute', 'percent'] },
            value: { type: 'number' }
          }
        },
        effective_date: {
          type: 'string',
          format: 'date-time'
        }
      },
      required: ['fuel_type', 'price_change']
    },
    default_params: {
      effective_date: null
    },
    required_params: ['fuel_type', 'price_change'],
    allowed_targets: ['all_trading_points', 'specific_trading_point', 'specific_network'],
    execution_timeout: 300,
    retry_count: 1,
    required_permissions: ['price_management'],
    is_dangerous: true,
    requires_confirmation: true,
    supports_scheduling: true,
    supports_batch_execution: true,
    examples: [
      {
        name: 'Increase AI-95 by 2 rubles',
        description: 'Увеличить цену АИ-95 на 2 рубля',
        params: {
          fuel_type: 'AI-95',
          price_change: { type: 'absolute', value: 2.00 }
        }
      }
    ]
  },
  {
    id: 'ct_equipment_restart',
    name: 'equipment_restart',
    display_name: 'Перезагрузка оборудования',
    description: 'Безопасная перезагрузка выбранного оборудования',
    category: 'equipment_control',
    status: 'active',
    is_system: true,
    version: '1.0.0',
    param_schema: {
      type: 'object',
      properties: {
        graceful: {
          type: 'boolean',
          default: true,
          description: 'Безопасная перезагрузка с сохранением данных'
        },
        delay_seconds: {
          type: 'integer',
          minimum: 0,
          maximum: 300,
          default: 30
        }
      }
    },
    default_params: {
      graceful: true,
      delay_seconds: 30
    },
    required_params: [],
    allowed_targets: ['specific_equipment', 'equipment_type'],
    execution_timeout: 600,
    retry_count: 0,
    required_permissions: ['equipment_control'],
    is_dangerous: true,
    requires_confirmation: true,
    supports_scheduling: true,
    supports_batch_execution: false,
    examples: []
  },
  {
    id: 'ct_shift_report_generate',
    name: 'shift_report_generate',
    display_name: 'Генерация отчета по смене',
    description: 'Создание автоматического отчета по завершенной смене',
    category: 'reporting',
    status: 'active',
    is_system: true,
    version: '1.1.0',
    param_schema: {
      type: 'object',
      properties: {
        shift_id: {
          type: 'string',
          description: 'ID смены для генерации отчета'
        },
        include_fuel_data: {
          type: 'boolean',
          default: true
        },
        include_pos_data: {
          type: 'boolean',
          default: true
        },
        format: {
          type: 'string',
          enum: ['pdf', 'excel', 'json'],
          default: 'pdf'
        }
      },
      required: ['shift_id']
    },
    default_params: {
      include_fuel_data: true,
      include_pos_data: true,
      format: 'pdf'
    },
    required_params: ['shift_id'],
    allowed_targets: ['specific_trading_point', 'all_trading_points'],
    execution_timeout: 180,
    retry_count: 1,
    required_permissions: ['report_generation'],
    is_dangerous: false,
    requires_confirmation: false,
    supports_scheduling: false,
    supports_batch_execution: true,
    examples: []
  },
  {
    id: 'ct_maintenance_check',
    name: 'maintenance_check',
    display_name: 'Проверка технического обслуживания',
    description: 'Запуск автоматической проверки необходимости ТО оборудования',
    category: 'maintenance',
    status: 'active',
    is_system: true,
    version: '1.0.0',
    param_schema: {
      type: 'object',
      properties: {
        check_type: {
          type: 'string',
          enum: ['routine', 'preventive', 'emergency'],
          default: 'routine'
        },
        equipment_age_threshold: {
          type: 'integer',
          minimum: 30,
          maximum: 365,
          default: 90,
          description: 'Возраст оборудования в днях для проверки'
        }
      }
    },
    default_params: {
      check_type: 'routine',
      equipment_age_threshold: 90
    },
    required_params: [],
    allowed_targets: ['all_networks', 'specific_network', 'equipment_type', 'specific_equipment'],
    execution_timeout: 300,
    retry_count: 1,
    required_permissions: ['maintenance_access'],
    is_dangerous: false,
    requires_confirmation: false,
    supports_scheduling: true,
    supports_batch_execution: true,
    examples: []
  }
];

async function seedCommandTemplates() {
  console.log('🌱 Заполнение базы данных шаблонами команд...');

  try {
    // Удаляем существующие системные шаблоны (для переустановки)
    console.log('🗑️ Удаление существующих системных шаблонов...');
    const { error: deleteError } = await supabase
      .from('command_templates')
      .delete()
      .eq('is_system', true);

    if (deleteError) {
      console.log('⚠️ Предупреждение при удалении:', deleteError.message);
    }

    // Вставляем новые системные шаблоны
    console.log('📝 Создание системных шаблонов...');
    const { data, error } = await supabase
      .from('command_templates')
      .insert(systemTemplates)
      .select();

    if (error) {
      console.error('❌ Ошибка создания шаблонов:', error);
      throw error;
    }

    console.log(`✅ Создано ${data.length} системных шаблонов команд:`);
    data.forEach(template => {
      console.log(`  - ${template.display_name} (${template.category})`);
    });

    // Проверяем общее количество шаблонов
    const { count, error: countError } = await supabase
      .from('command_templates')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log('⚠️ Не удалось получить общее количество:', countError.message);
    } else {
      console.log(`📊 Всего шаблонов в базе данных: ${count}`);
    }

    console.log('\n🎉 Заполнение завершено успешно!');

  } catch (error) {
    console.error('❌ Ошибка заполнения базы данных:', error);
    throw error;
  }
}

// Запуск
seedCommandTemplates().catch(console.error);