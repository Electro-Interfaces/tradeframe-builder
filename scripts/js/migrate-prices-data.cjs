// Скрипт для миграции данных цен из localStorage в Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tshglrthsmyxhlsrrsmt.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzaGdscnRoc215eGhsc3Jyc210Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDc4MzI5NywiZXhwIjoyMDQ2MzU5Mjk3fQ.NHXfz4p5SaYWwZdA4MxeKg6J4vRBfuBFhJx0N4Q5I_g';

const supabase = createClient(supabaseUrl, serviceKey);

// Mock данные для миграции (упрощенная версия)
const mockFuelTypes = [
  { 
    id: "ai95", 
    name: "АИ-95", 
    code: "AI95", 
    category: "gasoline",
    is_active: true
  },
  { 
    id: "ai92", 
    name: "АИ-92", 
    code: "AI92", 
    category: "gasoline",
    is_active: true
  },
  { 
    id: "dt", 
    name: "ДТ", 
    code: "DT", 
    category: "diesel",
    is_active: true
  },
  { 
    id: "ai98", 
    name: "АИ-98", 
    code: "AI98", 
    category: "gasoline",
    is_active: true
  },
  { 
    id: "ai100", 
    name: "АИ-100", 
    code: "AI100", 
    category: "gasoline",
    is_active: true
  }
];

const mockCurrentPrices = [
  // АЗС №001 - Центральная
  {
    id: "price_point1_ai95",
    trading_point_id: "550e8400-e29b-41d4-a716-446655440001", // point1
    fuel_type_id: "ai95",
    price_net: 5320,
    vat_rate: 20,
    price_gross: 6384,
    source: "manual",
    valid_from: "2024-12-07T08:00:00Z",
    is_active: true,
    created_by: "550e8400-e29b-41d4-a716-446655440000", // admin user
    reason: "Текущая цена на АИ-95"
  },
  {
    id: "price_point1_ai92",
    trading_point_id: "550e8400-e29b-41d4-a716-446655440001",
    fuel_type_id: "ai92",
    price_net: 5045,
    vat_rate: 20,
    price_gross: 6054,
    source: "manual",
    valid_from: "2024-12-07T08:00:00Z",
    is_active: true,
    created_by: "550e8400-e29b-41d4-a716-446655440000",
    reason: "Текущая цена на АИ-92"
  },
  {
    id: "price_point1_dt",
    trading_point_id: "550e8400-e29b-41d4-a716-446655440001",
    fuel_type_id: "dt",
    price_net: 5195,
    vat_rate: 20,
    price_gross: 6234,
    source: "manual",
    valid_from: "2024-12-06T14:30:00Z",
    is_active: true,
    created_by: "550e8400-e29b-41d4-a716-446655440000",
    reason: "Текущая цена на ДТ"
  }
];

async function migratePricesData() {
  console.log('🚀 Начинаем миграцию данных цен в Supabase...');

  try {
    // 1. Проверяем подключение
    console.log('\n🔍 Проверяем подключение к Supabase...');
    const { data: connectionTest } = await supabase
      .from('networks')
      .select('id')
      .limit(1);
    
    console.log('✅ Подключение успешно');

    // 2. Создаем типы топлива
    console.log('\n⛽ Создаем типы топлива...');
    
    let fuelTypesCreated = 0;
    for (const fuelType of mockFuelTypes) {
      try {
        const { data, error } = await supabase
          .from('fuel_types')
          .upsert({
            id: fuelType.id,
            name: fuelType.name,
            code: fuelType.code,
            category: fuelType.category,
            is_active: fuelType.is_active
          }, { onConflict: 'id' });
        
        if (error) {
          console.log(`❌ Ошибка создания топлива ${fuelType.name}: ${error.message}`);
        } else {
          console.log(`✅ Создан тип топлива: ${fuelType.name}`);
          fuelTypesCreated++;
        }
      } catch (err) {
        console.log(`❌ Исключение при создании топлива ${fuelType.name}: ${err.message}`);
      }
    }
    
    console.log(`📊 Создано типов топлива: ${fuelTypesCreated}/${mockFuelTypes.length}`);

    // 3. Получаем существующие торговые точки
    console.log('\n🏪 Получаем торговые точки...');
    const { data: tradingPoints, error: tpError } = await supabase
      .from('trading_points')
      .select('id, name');
    
    if (tpError) {
      throw new Error(`Ошибка получения торговых точек: ${tpError.message}`);
    }

    console.log(`✅ Найдено торговых точек: ${tradingPoints?.length || 0}`);

    // 4. Создаем цены (если есть торговые точки)
    if (tradingPoints && tradingPoints.length > 0) {
      console.log('\n💰 Создаем цены...');
      
      let pricesCreated = 0;
      for (const price of mockCurrentPrices) {
        try {
          // Используем первую доступную торговую точку
          const tradingPointId = tradingPoints[0].id;
          
          const { data, error } = await supabase
            .from('prices')
            .insert({
              trading_point_id: tradingPointId,
              fuel_type_id: price.fuel_type_id,
              price_net: price.price_net,
              vat_rate: price.vat_rate,
              price_gross: price.price_gross,
              source: price.source,
              valid_from: price.valid_from,
              is_active: price.is_active,
              created_by: price.created_by,
              reason: price.reason,
              metadata: {}
            });
          
          if (error) {
            console.log(`❌ Ошибка создания цены ${price.fuel_type_id}: ${error.message}`);
          } else {
            console.log(`✅ Создана цена на ${price.fuel_type_id} для ${tradingPoints[0].name}`);
            pricesCreated++;
          }
        } catch (err) {
          console.log(`❌ Исключение при создании цены ${price.fuel_type_id}: ${err.message}`);
        }
      }
      
      console.log(`📊 Создано цен: ${pricesCreated}/${mockCurrentPrices.length}`);
    }

    // 5. Проверяем результат миграции
    console.log('\n🔍 Проверяем результат миграции...');
    
    // Проверяем типы топлива
    const { data: fuelTypesCheck, error: ftError } = await supabase
      .from('fuel_types')
      .select('*', { count: 'exact' })
      .eq('is_active', true);
    
    if (!ftError) {
      console.log(`✅ Активных типов топлива в БД: ${fuelTypesCheck?.length || 0}`);
    }

    // Проверяем цены
    const { data: pricesCheck, error: pricesError } = await supabase
      .from('prices')
      .select('*, fuel_types(name), trading_points(name)', { count: 'exact' })
      .eq('is_active', true);
    
    if (!pricesError) {
      console.log(`✅ Активных цен в БД: ${pricesCheck?.length || 0}`);
      
      if (pricesCheck && pricesCheck.length > 0) {
        console.log('\n📋 Детали цен:');
        pricesCheck.forEach((price, i) => {
          console.log(`  ${i + 1}. ${price.fuel_types?.name} - ${(price.price_gross / 100).toFixed(2)} ₽ (${price.trading_points?.name})`);
        });
      }
    }

    console.log('\n🎉 Миграция завершена успешно!');

    // 6. Создаем тестовую запись истории
    console.log('\n📚 Создаем тестовую запись в истории цен...');
    
    if (tradingPoints && tradingPoints.length > 0) {
      try {
        const { data, error } = await supabase
          .from('price_history')
          .insert({
            trading_point_id: tradingPoints[0].id,
            fuel_type_id: 'ai95',
            old_price_net: 5200,
            old_price_gross: 6240,
            new_price_net: 5320,
            new_price_gross: 6384,
            vat_rate: 20,
            change_type: 'update',
            source: 'manual',
            reason: 'Миграция данных из localStorage',
            effective_date: new Date().toISOString(),
            changed_by: '550e8400-e29b-41d4-a716-446655440000',
            metadata: { migration: true }
          });
        
        if (error) {
          console.log(`❌ Ошибка создания записи истории: ${error.message}`);
        } else {
          console.log(`✅ Создана тестовая запись в истории цен`);
        }
      } catch (err) {
        console.log(`❌ Исключение при создании записи истории: ${err.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Критическая ошибка миграции:', error.message);
    process.exit(1);
  }
}

// Запускаем миграцию
migratePricesData();