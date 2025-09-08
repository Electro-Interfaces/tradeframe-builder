/**
 * Тестирование новой системы пользовательских предпочтений
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, serviceKey);

async function testPreferencesSystem() {
  console.log('🧪 Тестируем систему пользовательских предпочтений...');
  
  const testUserId = '11111111-2222-3333-4444-555555555555';
  let testsPassed = 0;
  let totalTests = 0;
  
  try {
    // Тест 1: Создание предпочтения
    totalTests++;
    console.log('\n📝 Тест 1: Создание предпочтения selected_network');
    
    const { data: insertData, error: insertError } = await supabase
      .from('user_preferences')
      .insert({
        user_id: testUserId,
        preference_key: 'selected_network',
        preference_value: '15'
      })
      .select()
      .single();
    
    if (insertError) {
      console.log('❌ Ошибка создания:', insertError.message);
    } else {
      console.log('✅ Предпочтение создано:', insertData);
      testsPassed++;
    }
    
    // Тест 2: Чтение предпочтения
    totalTests++;
    console.log('\n📖 Тест 2: Чтение предпочтения');
    
    const { data: selectData, error: selectError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', testUserId)
      .eq('preference_key', 'selected_network')
      .single();
    
    if (selectError) {
      console.log('❌ Ошибка чтения:', selectError.message);
    } else {
      console.log('✅ Предпочтение прочитано:', selectData);
      if (selectData.preference_value === '15') {
        testsPassed++;
        console.log('✅ Значение корректное');
      } else {
        console.log('❌ Значение некорректное');
      }
    }
    
    // Тест 3: Обновление предпочтения
    totalTests++;
    console.log('\n🔄 Тест 3: Обновление предпочтения');
    
    const { data: updateData, error: updateError } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: testUserId,
        preference_key: 'selected_network',
        preference_value: 'net1'
      }, {
        onConflict: 'user_id,preference_key'
      })
      .select()
      .single();
    
    if (updateError) {
      console.log('❌ Ошибка обновления:', updateError.message);
    } else {
      console.log('✅ Предпочтение обновлено:', updateData);
      if (updateData.preference_value === 'net1') {
        testsPassed++;
        console.log('✅ Новое значение корректное');
      } else {
        console.log('❌ Новое значение некорректное');
      }
    }
    
    // Тест 4: Добавление второго предпочтения
    totalTests++;
    console.log('\n➕ Тест 4: Добавление selected_trading_point');
    
    const { data: insertData2, error: insertError2 } = await supabase
      .from('user_preferences')
      .insert({
        user_id: testUserId,
        preference_key: 'selected_trading_point',
        preference_value: 'all'
      })
      .select()
      .single();
    
    if (insertError2) {
      console.log('❌ Ошибка создания второго предпочтения:', insertError2.message);
    } else {
      console.log('✅ Второе предпочтение создано:', insertData2);
      testsPassed++;
    }
    
    // Тест 5: Получение всех предпочтений пользователя
    totalTests++;
    console.log('\n📋 Тест 5: Получение всех предпочтений пользователя');
    
    const { data: allPrefs, error: allPrefsError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', testUserId);
    
    if (allPrefsError) {
      console.log('❌ Ошибка получения всех предпочтений:', allPrefsError.message);
    } else {
      console.log('✅ Все предпочтения пользователя:', allPrefs);
      if (allPrefs.length >= 2) {
        testsPassed++;
        console.log('✅ Количество предпочтений корректное');
      } else {
        console.log('❌ Недостаточно предпочтений');
      }
    }
    
    // Тест 6: Проверка уникального ограничения
    totalTests++;
    console.log('\n🔒 Тест 6: Проверка уникального ограничения');
    
    const { data: duplicateData, error: duplicateError } = await supabase
      .from('user_preferences')
      .insert({
        user_id: testUserId,
        preference_key: 'selected_network', // Дубликат
        preference_value: 'duplicate_test'
      });
    
    if (duplicateError && duplicateError.code === '23505') {
      console.log('✅ Уникальное ограничение работает:', duplicateError.message);
      testsPassed++;
    } else if (duplicateError) {
      console.log('❌ Неожиданная ошибка:', duplicateError.message);
    } else {
      console.log('❌ Уникальное ограничение НЕ работает - создался дубликат');
    }
    
    // Очистка тестовых данных
    console.log('\n🧹 Очистка тестовых данных...');
    
    const { error: deleteError } = await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', testUserId);
    
    if (deleteError) {
      console.log('❌ Ошибка очистки:', deleteError.message);
    } else {
      console.log('✅ Тестовые данные удалены');
    }
    
    // Результаты
    console.log('\n📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:');
    console.log(`✅ Пройдено тестов: ${testsPassed}/${totalTests}`);
    console.log(`📈 Успешность: ${((testsPassed/totalTests)*100).toFixed(1)}%`);
    
    if (testsPassed === totalTests) {
      console.log('🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Система готова к использованию.');
    } else {
      console.log('⚠️  Некоторые тесты не прошли. Проверьте настройки таблицы.');
    }
    
  } catch (error) {
    console.log('💥 Критическая ошибка тестирования:', error);
  }
}

async function testRLSPolicies() {
  console.log('\n🔐 Тестируем политики RLS (Row Level Security)...');
  
  // Этот тест показывает как работают политики безопасности
  console.log('⚠️  Для полного тестирования RLS нужен реальный пользовательский токен');
  console.log('💡 В приложении политики будут автоматически ограничивать доступ по auth.uid()');
}

// Запуск тестов
async function runAllTests() {
  await testPreferencesSystem();
  await testRLSPolicies();
  
  console.log('\n🚀 Тестирование завершено!');
  console.log('📱 Теперь можно тестировать в приложении:');
  console.log('1. Выберите сеть в интерфейсе');
  console.log('2. Выберите торговую точку');
  console.log('3. Перезагрузите страницу');
  console.log('4. Проверьте что выбор сохранился');
}

runAllTests().catch(console.error);