/**
 * Создание таблиц для шаблонов команд через Supabase клиент
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Конфигурация Supabase
const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

// Создаем Supabase клиент с service role
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function createCommandTemplatesTables() {
  console.log('🚀 Создание таблиц для шаблонов команд через Supabase...');

  // SQL для создания основной таблицы command_templates
  const createCommandTemplatesSQL = `
    CREATE TABLE IF NOT EXISTS command_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      display_name VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(50) NOT NULL CHECK (category IN (
        'shift_operations', 'pricing', 'reporting', 'maintenance', 
        'backup', 'system', 'fuel_operations', 'equipment_control', 
        'pos_operations', 'security', 'custom'
      )),
      status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deprecated')),
      is_system BOOLEAN NOT NULL DEFAULT false,
      version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
      param_schema JSONB NOT NULL DEFAULT '{}',
      default_params JSONB DEFAULT '{}',
      required_params TEXT[] DEFAULT '{}',
      allowed_targets TEXT[] NOT NULL DEFAULT '{}',
      default_target VARCHAR(100),
      execution_timeout INTEGER NOT NULL DEFAULT 30000,
      retry_count INTEGER NOT NULL DEFAULT 0,
      required_permissions TEXT[] DEFAULT '{}',
      is_dangerous BOOLEAN NOT NULL DEFAULT false,
      requires_confirmation BOOLEAN NOT NULL DEFAULT false,
      supports_scheduling BOOLEAN NOT NULL DEFAULT true,
      supports_batch_execution BOOLEAN NOT NULL DEFAULT false,
      documentation_url VARCHAR(500),
      examples JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // SQL для создания таблицы api_templates
  const createApiTemplatesSQL = `
    CREATE TABLE IF NOT EXISTS api_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      scope VARCHAR(50) NOT NULL CHECK (scope IN ('global', 'network', 'trading_point', 'equipment', 'component')),
      mode VARCHAR(20) NOT NULL DEFAULT 'sync' CHECK (mode IN ('sync', 'async', 'batch')),
      status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'inactive', 'deprecated', 'draft')),
      http_method VARCHAR(10) NOT NULL CHECK (http_method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
      url_template VARCHAR(2000) NOT NULL,
      api_schema JSONB NOT NULL DEFAULT '{}',
      default_headers JSONB DEFAULT '{}',
      timeout_ms INTEGER NOT NULL DEFAULT 30000 CHECK (timeout_ms BETWEEN 1000 AND 300000),
      retry_policy JSONB,
      examples JSONB DEFAULT '[]',
      tags TEXT[] DEFAULT '{}',
      version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
      is_system BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // SQL для создания таблицы command_executions
  const createCommandExecutionsSQL = `
    CREATE TABLE IF NOT EXISTS command_executions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id UUID,
      template_type VARCHAR(20) NOT NULL CHECK (template_type IN ('command', 'api')),
      target_type VARCHAR(50) NOT NULL,
      target_id UUID,
      parameters JSONB NOT NULL DEFAULT '{}',
      status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      result JSONB,
      error_message TEXT,
      execution_time_ms INTEGER,
      retry_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  try {
    // Создаем таблицы по очереди
    console.log('📝 Создание таблицы command_templates...');
    const { error: error1 } = await supabase.rpc('execute_sql', { 
      sql: createCommandTemplatesSQL 
    });
    
    if (error1) {
      console.log('⚡ Пробуем через SQL Editor...');
      // Альтернативный способ - создаем прямой запрос
      await createTableDirect('command_templates', createCommandTemplatesSQL);
    } else {
      console.log('✅ Таблица command_templates создана');
    }

    console.log('📝 Создание таблицы api_templates...');
    const { error: error2 } = await supabase.rpc('execute_sql', { 
      sql: createApiTemplatesSQL 
    });
    
    if (error2) {
      await createTableDirect('api_templates', createApiTemplatesSQL);
    } else {
      console.log('✅ Таблица api_templates создана');
    }

    console.log('📝 Создание таблицы command_executions...');
    const { error: error3 } = await supabase.rpc('execute_sql', { 
      sql: createCommandExecutionsSQL 
    });
    
    if (error3) {
      await createTableDirect('command_executions', createCommandExecutionsSQL);
    } else {
      console.log('✅ Таблица command_executions создана');
    }

    // Проверяем созданные таблицы
    await testTables();

    console.log('\n🎉 Миграция завершена успешно!');

  } catch (error) {
    console.error('❌ Ошибка создания таблиц:', error);
  }
}

async function createTableDirect(tableName, sql) {
  console.log(`⚡ Создание таблицы ${tableName} прямым запросом...`);
  
  try {
    // Пробуем создать таблицу через прямое обращение к PostgREST
    const response = await fetch(`${SUPABASE_URL}/rest/v1/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: sql })
    });

    if (response.ok) {
      console.log(`✅ Таблица ${tableName} создана прямым запросом`);
    } else {
      const errorText = await response.text();
      console.log(`⚠️ Не удалось создать ${tableName} прямым запросом:`, errorText);
      
      // Попробуем вставить тестовую запись для проверки существования
      await testTableExists(tableName);
    }
  } catch (error) {
    console.log(`⚠️ Ошибка прямого создания ${tableName}:`, error.message);
    await testTableExists(tableName);
  }
}

async function testTableExists(tableName) {
  console.log(`🔍 Проверка существования таблицы ${tableName}...`);
  
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ Таблица ${tableName} не существует:`, error.message);
    } else {
      console.log(`✅ Таблица ${tableName} уже существует`);
    }
  } catch (error) {
    console.log(`❌ Ошибка проверки ${tableName}:`, error.message);
  }
}

async function testTables() {
  console.log('\n🔍 Проверка созданных таблиц...');
  
  const tables = ['command_templates', 'api_templates', 'command_executions'];
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ Таблица ${table}: ${error.message}`);
      } else {
        console.log(`✅ Таблица ${table}: готова (записей: ${count || 0})`);
      }
    } catch (error) {
      console.log(`❌ Таблица ${table}: ошибка проверки - ${error.message}`);
    }
  }
}

// Запуск
createCommandTemplatesTables().catch(console.error);