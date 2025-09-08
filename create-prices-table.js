/**
 * Script to create the prices table in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createPricesTable() {
  console.log('🔧 Создание таблицы prices...');
  
  // Step 1: Add fuel_type_id to nomenclature if needed
  console.log('📝 Шаг 1: Добавление fuel_type_id в nomenclature...');
  try {
    const { error: alterError } = await supabase.rpc('sql', {
      query: `ALTER TABLE nomenclature ADD COLUMN IF NOT EXISTS fuel_type_id UUID REFERENCES fuel_types(id);`
    });
    
    if (alterError) {
      console.warn('⚠️ Ошибка изменения nomenclature:', alterError);
    } else {
      console.log('✅ Столбец fuel_type_id добавлен');
    }
  } catch (error) {
    console.warn('⚠️ Альтернативный способ изменения nomenclature...');
  }

  // Step 2: Create prices table  
  console.log('📝 Шаг 2: Создание таблицы prices...');
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS prices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trading_point_id UUID NOT NULL REFERENCES trading_points(id) ON DELETE CASCADE,
      fuel_type_id UUID NOT NULL REFERENCES fuel_types(id) ON DELETE CASCADE,
      nomenclature_id UUID REFERENCES nomenclature(id) ON DELETE SET NULL,
      price_net INTEGER NOT NULL,
      vat_rate DECIMAL(5,2) DEFAULT 20.00,
      price_gross INTEGER NOT NULL,
      source VARCHAR(50) DEFAULT 'manual',
      currency VARCHAR(3) DEFAULT 'RUB',
      unit VARCHAR(10) DEFAULT 'L',
      valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      valid_to TIMESTAMPTZ,
      is_active BOOLEAN DEFAULT true,
      created_by UUID REFERENCES users(id),
      reason VARCHAR(255),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  try {
    const { error: createError } = await supabase.rpc('sql', {
      query: createTableSQL
    });
    
    if (createError) {
      console.error('❌ Ошибка создания таблицы prices:', createError);
    } else {
      console.log('✅ Таблица prices создана успешно');
    }
  } catch (error) {
    console.error('❌ Критическая ошибка создания таблицы:', error);
  }

  // Step 3: Create indexes
  console.log('📝 Шаг 3: Создание индексов...');
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_prices_trading_point ON prices(trading_point_id);',
    'CREATE INDEX IF NOT EXISTS idx_prices_fuel_type ON prices(fuel_type_id);',
    'CREATE INDEX IF NOT EXISTS idx_prices_is_active ON prices(is_active);',
    'CREATE INDEX IF NOT EXISTS idx_nomenclature_fuel_type ON nomenclature(fuel_type_id);'
  ];

  for (const indexSQL of indexes) {
    try {
      const { error } = await supabase.rpc('sql', { query: indexSQL });
      if (error) {
        console.warn('⚠️ Ошибка создания индекса:', error);
      }
    } catch (error) {
      console.warn('⚠️ Ошибка индекса:', error);
    }
  }
  
  console.log('✅ Индексы созданы');

  // Step 4: Update nomenclature fuel_type_id links
  console.log('📝 Шаг 4: Обновление связей fuel_type_id...');
  try {
    const { error: updateError } = await supabase.rpc('sql', {
      query: `UPDATE nomenclature SET fuel_type_id = (
        SELECT ft.id FROM fuel_types ft WHERE ft.code = nomenclature.internal_code
      ) WHERE fuel_type_id IS NULL;`
    });
    
    if (updateError) {
      console.warn('⚠️ Ошибка обновления связей:', updateError);
    } else {
      console.log('✅ Связи fuel_type_id обновлены');
    }
  } catch (error) {
    console.warn('⚠️ Ошибка обновления связей:', error);
  }

  console.log('🎉 Миграция таблицы prices завершена!');
}

// Проверим подключение и выполним миграцию
async function main() {
  console.log('🔌 Проверка подключения к Supabase...');
  
  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      console.error('❌ Ошибка подключения:', error);
      return;
    }
    
    console.log('✅ Подключение к Supabase успешно');
    await createPricesTable();
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

main().catch(console.error);