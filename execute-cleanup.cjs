const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function executeCleanup() {
  try {
    console.log('🚀 Начинаем очистку демо-операций за август...');
    
    // Получаем конфигурацию Supabase из настроек приложения
    let supabaseUrl, supabaseKey;
    
    // Пробуем загрузить из конфигурации
    try {
      // Сначала проверим переменные окружения
      if (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) {
        supabaseUrl = process.env.VITE_SUPABASE_URL;
        supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
        console.log('✅ Используем конфигурацию из переменных окружения');
      } else {
        // Используем стандартные настройки для демо
        supabaseUrl = 'https://vxlswbjgsjdvsgwojlka.supabase.co';
        supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4bHN3Ympnc2pkdnNnd29qbGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM3MzI3MTYsImV4cCI6MjA0OTMwODcxNn0.aDGa_3JoNDJaQg5fUECqjqUBBVa9lLCxzWLdBVzN6Ws';
        console.log('ℹ️ Используем стандартную конфигурацию Supabase');
      }
      
    } catch (error) {
      console.error('❌ Ошибка загрузки конфигурации:', error.message);
      process.exit(1);
    }
    
    // Создаем клиент Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('🔗 Подключение к Supabase установлено');
    
    // Сначала проверяем, сколько операций будет удалено
    console.log('🔍 Проверяем операции за август...');
    const { data: operationsToCheck, error: checkError } = await supabase
      .from('operations')
      .select('id, start_time, trading_point_id, operation_type')
      .lt('start_time', '2025-09-02T00:00:00Z')
      .order('start_time');
    
    if (checkError) {
      console.error('❌ Ошибка при проверке операций:', checkError);
      process.exit(1);
    }
    
    const countToDelete = operationsToCheck?.length || 0;
    console.log(`📊 Найдено операций для удаления: ${countToDelete}`);
    
    if (countToDelete === 0) {
      console.log('✅ Операций за август не найдено, база уже чистая');
      return;
    }
    
    // Показываем статистику по торговым точкам
    const byTradingPoint = {};
    operationsToCheck.forEach(op => {
      const tpId = op.trading_point_id || 'unknown';
      if (!byTradingPoint[tpId]) {
        byTradingPoint[tpId] = 0;
      }
      byTradingPoint[tpId]++;
    });
    
    console.log('\n📍 Статистика по торговым точкам:');
    Object.entries(byTradingPoint).forEach(([tpId, count]) => {
      console.log(`   ${tpId}: ${count} операций`);
    });
    
    // Показываем диапазон дат
    if (operationsToCheck.length > 0) {
      const firstOp = operationsToCheck[0];
      const lastOp = operationsToCheck[operationsToCheck.length - 1];
      console.log(`\n📅 Диапазон дат: ${firstOp.start_time} - ${lastOp.start_time}`);
    }
    
    console.log('\n⚠️ Станция 4 работает только с 2 сентября 2025');
    console.log('ℹ️ Все операции до этой даты являются тестовыми данными');
    
    // Выполняем удаление
    console.log('\n🗑️ Удаляем операции за август...');
    const { data: deletedOps, error: deleteError } = await supabase
      .from('operations')
      .delete()
      .lt('start_time', '2025-09-02T00:00:00Z')
      .select('id');
    
    if (deleteError) {
      console.error('❌ Ошибка при удалении операций:', deleteError);
      process.exit(1);
    }
    
    const deletedCount = deletedOps?.length || 0;
    console.log(`✅ Успешно удалено операций: ${deletedCount}`);
    
    // Проверяем результат
    console.log('\n🔍 Проверяем результат очистки...');
    const { data: remainingAugustOps, error: verifyError } = await supabase
      .from('operations')
      .select('id')
      .lt('start_time', '2025-09-02T00:00:00Z');
    
    if (verifyError) {
      console.error('❌ Ошибка при проверке результата:', verifyError);
    } else {
      const remainingCount = remainingAugustOps?.length || 0;
      if (remainingCount === 0) {
        console.log('✅ Проверка пройдена: операций за август не осталось');
      } else {
        console.log(`⚠️ Внимание: осталось ${remainingCount} операций за август`);
      }
    }
    
    // Проверяем операции с 2 сентября
    const { data: septemberOps, error: septError } = await supabase
      .from('operations')
      .select('id')
      .gte('start_time', '2025-09-02T00:00:00Z');
    
    if (septError) {
      console.error('❌ Ошибка при проверке сентябрьских операций:', septError);
    } else {
      const septemberCount = septemberOps?.length || 0;
      console.log(`✅ Операций с 2 сентября сохранено: ${septemberCount}`);
    }
    
    console.log('\n🎉 ОЧИСТКА ЗАВЕРШЕНА УСПЕШНО!');
    console.log('❌ Демо-данные за август удалены');
    console.log('✅ Реальные данные с 2 сентября сохранены');
    console.log('🔄 Теперь станция 4 показывает только актуальные данные');
    
  } catch (error) {
    console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА:');
    console.error(error.message);
    process.exit(1);
  }
}

// Запускаем очистку
executeCleanup();