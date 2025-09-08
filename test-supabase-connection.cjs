#!/usr/bin/env node

/**
 * Тест подключения к Supabase через клиент JavaScript
 */

require('dotenv').config();

// Проверим доступность Supabase через HTTP API
async function testSupabaseConnection() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Отсутствуют переменные SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY');
    return;
  }
  
  console.log('🔗 Тестирование подключения к Supabase...');
  console.log(`📡 URL: ${supabaseUrl}`);
  
  try {
    // Попробуем выполнить простой REST запрос
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    });
    
    console.log(`✅ HTTP статус: ${response.status}`);
    
    if (response.ok) {
      console.log('✅ Supabase REST API доступно');
      
      // Попробуем получить список таблиц
      const tablesResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`
        }
      });
      
      console.log(`✅ Tables endpoint статус: ${tablesResponse.status}`);
      
      // Попробуем выполнить SQL через RPC (если доступно)
      const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      console.log(`📝 RPC endpoint статус: ${rpcResponse.status}`);
      
      return true;
      
    } else {
      console.error('❌ Ошибка подключения к Supabase:', response.statusText);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
    return false;
  }
}

// Запуск теста
testSupabaseConnection().then(success => {
  if (success) {
    console.log('\n🎉 Supabase доступен! Можно выполнять миграции через UI или REST API');
    console.log('💡 Рекомендуется:');
    console.log('   1. Открыть Supabase Dashboard: https://app.supabase.com/');
    console.log('   2. Перейти в SQL Editor');
    console.log('   3. Выполнить содержимое create-telegram-verification-tables.sql');
  } else {
    console.log('\n❌ Проблемы с подключением к Supabase');
    console.log('💡 Проверьте:');
    console.log('   1. Правильность SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY');
    console.log('   2. Доступность интернет подключения');
    console.log('   3. Статус проекта в Supabase Dashboard');
  }
});