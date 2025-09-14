// Создание таблицы цен и заполнение демо-данными для существующих АЗС
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tshglrthsmyxhlsrrsmt.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzaGdscnRoc215eGhsc3Jyc210Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDc4MzI5NywiZXhwIjoyMDQ2MzU5Mjk3fQ.NHXfz4p5SaYWwZdA4MxeKg6J4vRBfuBFhJx0N4Q5I_g';

const supabase = createClient(supabaseUrl, serviceKey);

async function createDemoPricesSetup() {
  console.log('🏗️ Создание системы цен для демо АЗС...');

  try {
    // 1. Сначала попробуем создать таблицу prices
    console.log('\n📋 Шаг 1: Создание таблицы prices...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS prices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trading_point_id UUID NOT NULL,
        fuel_type_id UUID NOT NULL,
        
        price_net INTEGER NOT NULL CHECK (price_net >= 0),
        vat_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
        price_gross INTEGER NOT NULL CHECK (price_gross >= 0),
        
        source VARCHAR(20) NOT NULL DEFAULT 'manual',
        unit VARCHAR(10) NOT NULL DEFAULT 'L',
        
        valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_active BOOLEAN NOT NULL DEFAULT true,
        
        created_by TEXT DEFAULT 'demo-user',
        reason TEXT,
        
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "prices_public_policy" ON prices;
      CREATE POLICY "prices_public_policy" ON prices FOR ALL USING (true);
    `;

    // Выполняем создание таблицы через прямой запрос
    const { error: createError } = await supabase
      .from('_supabase_empty_table_hack')
      .select()
      .limit(0);
    
    // Проверяем существует ли таблица prices
    const { data: existingPrices, error: checkError } = await supabase
      .from('prices')
      .select('id')
      .limit(1);
    
    if (checkError && checkError.code === 'PGRST116') {
      console.log('❌ Таблица prices не существует. Создайте её вручную в Supabase SQL Editor:');
      console.log('\n' + createTableSQL);
      console.log('\n⚠️  Создайте таблицу и перезапустите скрипт.');
      return;
    } else if (checkError) {
      console.log('❌ Ошибка проверки таблицы:', checkError.message);
      return;
    } else {
      console.log('✅ Таблица prices существует');
    }

    // 2. Получаем существующие данные
    console.log('\n📊 Шаг 2: Получение данных из БД...');
    
    const [tpResult, ftResult] = await Promise.all([
      supabase
        .from('trading_points')
        .select('id, name, external_id')
        .eq('network_id', 'f5f5961a-4ae0-409f-b4ba-1f630a329434') // Демо сеть
        .order('name'),
      supabase
        .from('fuel_types')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name')
        .limit(5)
    ]);
    
    if (tpResult.error || ftResult.error) {
      console.error('❌ Ошибка получения данных:', tpResult.error || ftResult.error);
      return;
    }
    
    const tradingPoints = tpResult.data || [];
    const fuelTypes = ftResult.data || [];
    
    console.log(`✅ Найдено торговых точек: ${tradingPoints.length}`);
    console.log(`✅ Найдено видов топлива: ${fuelTypes.length}`);

    // 3. Очищаем старые цены
    console.log('\n🧹 Шаг 3: Очистка старых демо-цен...');
    
    const { error: deleteError } = await supabase
      .from('prices')
      .delete()
      .eq('created_by', 'demo-user');
    
    if (deleteError) {
      console.log('⚠️ Ошибка очистки старых цен:', deleteError.message);
    } else {
      console.log('✅ Старые демо-цены удалены');
    }

    // 4. Создаем новые демо-цены
    console.log('\n💰 Шаг 4: Создание демо-цен...');
    
    const demoPrices = [];
    const baseDate = new Date();
    
    // Базовые цены по типам топлива (в копейках)
    const basePrices = {
      'AI92': 5000,     // 50.00 руб
      'AI95': 5300,     // 53.00 руб 
      'AI98': 5800,     // 58.00 руб
      'DT_SUMMER': 5200, // 52.00 руб
      'DT_WINTER': 5250, // 52.50 руб
      'DT_ARCTIC': 5300, // 53.00 руб
      'PROPANE': 2800,   // 28.00 руб
      'BUTANE': 3200     // 32.00 руб
    };
    
    // Коэффициенты для разных АЗС
    const stationModifiers = {
      'АЗС №001 - Центральная': 1.0,    // Центр - базовые цены
      'АЗС №002 - Северная': 0.98,      // Север - немного дешевле
      'АЗС №003 - Южная': 1.02,         // Юг - немного дороже
      'АЗС №005 - Промзона': 0.95,      // Промзона - дешевле для клиентов
      'АЗС №006 - Окружная': 1.05       // Трасса - дороже
    };
    
    for (const tp of tradingPoints) {
      const modifier = stationModifiers[tp.name] || 1.0;
      
      for (const ft of fuelTypes.slice(0, 4)) { // Первые 4 вида топлива для каждой АЗС
        const basePrice = basePrices[ft.code] || 5000;
        const adjustedPrice = Math.round(basePrice * modifier);
        const grossPrice = Math.round(adjustedPrice * 1.2); // +20% НДС
        
        demoPrices.push({
          trading_point_id: tp.id,
          fuel_type_id: ft.id,
          price_net: adjustedPrice,
          vat_rate: 20.00,
          price_gross: grossPrice,
          source: 'manual',
          unit: 'L',
          valid_from: baseDate.toISOString(),
          is_active: true,
          created_by: 'demo-user',
          reason: `Демо-цена на ${ft.name} для ${tp.name}`,
          created_at: baseDate.toISOString(),
          updated_at: baseDate.toISOString()
        });
      }
    }
    
    console.log(`📝 Подготовлено ${demoPrices.length} демо-цен`);

    // 5. Вставляем демо-цены пакетами
    const BATCH_SIZE = 10;
    let insertedCount = 0;
    
    for (let i = 0; i < demoPrices.length; i += BATCH_SIZE) {
      const batch = demoPrices.slice(i, i + BATCH_SIZE);
      
      const { data, error } = await supabase
        .from('prices')
        .insert(batch);
      
      if (error) {
        console.error(`❌ Ошибка вставки пакета ${Math.floor(i/BATCH_SIZE) + 1}:`, error.message);
      } else {
        insertedCount += batch.length;
        console.log(`✅ Вставлено цен: ${insertedCount}/${demoPrices.length}`);
      }
      
      // Пауза между пакетами
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 6. Проверяем результат
    console.log('\n🔍 Шаг 5: Проверка созданных цен...');
    
    const { data: createdPrices, error: checkPricesError } = await supabase
      .from('prices')
      .select(`
        *,
        fuel_types(name, code),
        trading_points(name)
      `)
      .eq('created_by', 'demo-user')
      .eq('is_active', true);
    
    if (checkPricesError) {
      console.error('❌ Ошибка проверки цен:', checkPricesError.message);
    } else {
      console.log(`✅ Создано активных цен: ${createdPrices?.length || 0}`);
      
      // Группируем по АЗС для наглядности
      const pricesByStation = {};
      (createdPrices || []).forEach(price => {
        const stationName = price.trading_points?.name || 'Unknown';
        if (!pricesByStation[stationName]) {
          pricesByStation[stationName] = [];
        }
        pricesByStation[stationName].push(price);
      });
      
      console.log('\n📊 Цены по АЗС:');
      Object.entries(pricesByStation).forEach(([station, prices]) => {
        console.log(`\n  🏪 ${station}:`);
        prices.forEach(price => {
          const priceRub = (price.price_gross / 100).toFixed(2);
          console.log(`    • ${price.fuel_types?.name}: ${priceRub} ₽/л`);
        });
      });
    }

    console.log('\n🎉 Демо-цены успешно созданы!');
    console.log('🚀 Теперь можно тестировать раздел цен в приложении.');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
  }
}

// Запускаем создание демо-цен
createDemoPricesSetup();