// Создание таблиц цен через прямые SQL запросы
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tshglrthsmyxhlsrrsmt.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzaGdscnRoc215eGhsc3Jyc210Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDc4MzI5NywiZXhwIjoyMDQ2MzU5Mjk3fQ.NHXfz4p5SaYWwZdA4MxeKg6J4vRBfuBFhJx0N4Q5I_g';

const supabase = createClient(supabaseUrl, serviceKey);

// SQL команды для создания таблиц
const sqlCommands = [
  // Таблица цен
  `
  CREATE TABLE IF NOT EXISTS prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trading_point_id UUID NOT NULL,
    fuel_type_id UUID NOT NULL,
    nomenclature_id UUID,
    
    price_net INTEGER NOT NULL CHECK (price_net >= 0),
    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    price_gross INTEGER NOT NULL CHECK (price_gross >= 0),
    
    source VARCHAR(20) NOT NULL DEFAULT 'manual',
    currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
    unit VARCHAR(10) NOT NULL DEFAULT 'L',
    
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_to TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    created_by UUID,
    reason TEXT,
    package_id UUID,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // Таблица пакетов цен
  `
  CREATE TABLE IF NOT EXISTS price_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID NOT NULL,
    
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    
    trading_point_ids UUID[] NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ,
    
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    
    created_by UUID NOT NULL,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // Таблица строк пакета цен
  `
  CREATE TABLE IF NOT EXISTS price_package_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL,
    fuel_type_id UUID NOT NULL,
    
    price_net INTEGER NOT NULL CHECK (price_net >= 0),
    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    price_gross INTEGER NOT NULL CHECK (price_gross >= 0),
    
    unit VARCHAR(10) NOT NULL DEFAULT 'L',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // Таблица истории цен
  `
  CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trading_point_id UUID NOT NULL,
    fuel_type_id UUID NOT NULL,
    
    old_price_net INTEGER,
    old_price_gross INTEGER,
    new_price_net INTEGER NOT NULL,
    new_price_gross INTEGER NOT NULL,
    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    
    change_type VARCHAR(20) NOT NULL DEFAULT 'update',
    source VARCHAR(20) NOT NULL DEFAULT 'manual',
    reason TEXT,
    package_id UUID,
    
    effective_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    changed_by UUID,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // Индексы для оптимизации
  `CREATE INDEX IF NOT EXISTS idx_prices_active_lookup ON prices (trading_point_id, fuel_type_id, is_active, valid_from DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_prices_nomenclature ON prices (nomenclature_id) WHERE nomenclature_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_price_packages_network_status ON price_packages (network_id, status, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_price_history_trading_point_date ON price_history (trading_point_id, effective_date DESC)`,
  
  // RLS политики (Row Level Security)
  `ALTER TABLE prices ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE price_packages ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE price_package_lines ENABLE ROW LEVEL SECURITY`, 
  `ALTER TABLE price_history ENABLE ROW LEVEL SECURITY`,

  // Политики доступа
  `DROP POLICY IF EXISTS "prices_select_policy" ON prices`,
  `CREATE POLICY "prices_select_policy" ON prices FOR SELECT USING (true)`,
  
  `DROP POLICY IF EXISTS "prices_insert_policy" ON prices`,
  `CREATE POLICY "prices_insert_policy" ON prices FOR INSERT WITH CHECK (true)`,
  
  `DROP POLICY IF EXISTS "prices_update_policy" ON prices`,
  `CREATE POLICY "prices_update_policy" ON prices FOR UPDATE USING (true)`,
  
  `DROP POLICY IF EXISTS "price_history_select_policy" ON price_history`,
  `CREATE POLICY "price_history_select_policy" ON price_history FOR SELECT USING (true)`,
  
  `DROP POLICY IF EXISTS "price_history_insert_policy" ON price_history`,
  `CREATE POLICY "price_history_insert_policy" ON price_history FOR INSERT WITH CHECK (true)`
];

async function createPricesTables() {
  console.log('🏗️  Создание таблиц цен в Supabase...');

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < sqlCommands.length; i++) {
    const sql = sqlCommands[i].trim();
    if (!sql) continue;

    try {
      console.log(`\n➤ Команда ${i + 1}/${sqlCommands.length}:`);
      console.log(sql.substring(0, 60).replace(/\s+/g, ' ') + '...');
      
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: sql 
      });
      
      if (error) {
        console.log(`❌ ${error.message}`);
        errorCount++;
      } else {
        console.log(`✅ Выполнено`);
        successCount++;
      }
      
      // Пауза между командами
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (err) {
      console.log(`❌ Исключение: ${err.message}`);
      errorCount++;
    }
  }

  console.log(`\n📊 Результат: ${successCount} успешно, ${errorCount} ошибок`);

  // Проверим созданные таблицы
  console.log('\n🔍 Проверка созданных таблиц...');
  
  const tables = ['prices', 'price_packages', 'price_package_lines', 'price_history'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ Таблица ${table}: ${error.message}`);
      } else {
        console.log(`✅ Таблица ${table}: создана и доступна`);
      }
    } catch (err) {
      console.log(`❌ Таблица ${table}: ${err.message}`);
    }
  }

  if (successCount > 0) {
    console.log('\n🎉 Таблицы цен успешно созданы!');
  } else {
    console.log('\n⚠️  Не удалось создать таблицы. Проверьте соединение.');
  }
}

createPricesTables();