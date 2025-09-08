/**
 * Прямое подключение к PostgreSQL для удаления constraint
 */

const { Client } = require('pg');

// Разные варианты подключения к Supabase
const connectionConfigs = [
  {
    name: 'Pooler Connection',
    config: {
      host: 'aws-0-eu-central-1.pooler.supabase.com',
      port: 6543,
      database: 'postgres',
      user: 'postgres.tohtryzyffcebtyvkxwh',
      password: 'tradeframe2024',
      ssl: { rejectUnauthorized: false }
    }
  },
  {
    name: 'Direct Connection',
    config: {
      host: 'tohtryzyffcebtyvkxwh.supabase.co',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: 'tradeframe2024',
      ssl: { rejectUnauthorized: false }
    }
  },
  {
    name: 'Session Mode',
    config: {
      host: 'aws-0-eu-central-1.pooler.supabase.com',
      port: 5432,
      database: 'postgres',
      user: 'postgres.tohtryzyffcebtyvkxwh',
      password: 'tradeframe2024',
      ssl: { rejectUnauthorized: false }
    }
  }
];

async function testConnection(configName, config) {
  console.log(`\n🔄 Тестируем ${configName}...`);
  const client = new Client(config);
  
  try {
    console.log('🔌 Подключаемся...');
    await client.connect();
    console.log('✅ Подключение установлено');

    // Простой тест
    const result = await client.query('SELECT version()');
    console.log('📋 PostgreSQL версия:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);

    // Проверяем доступ к таблице operations
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'operations'
    `);
    
    if (tables.rows.length > 0) {
      console.log('✅ Таблица operations найдена');
      
      // Проверяем текущий constraint
      const constraint = await client.query(`
        SELECT conname, consrc 
        FROM pg_constraint 
        WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'operations') 
        AND conname = 'operations_payment_method_check'
      `);
      
      if (constraint.rows.length > 0) {
        console.log('📋 Текущий constraint:', constraint.rows[0].consrc);
        return { success: true, client, hasConstraint: true };
      } else {
        console.log('⚠️ Constraint не найден');
        return { success: true, client, hasConstraint: false };
      }
    } else {
      console.log('❌ Таблица operations не найдена');
      await client.end();
      return { success: false };
    }
    
  } catch (error) {
    console.log('❌ Ошибка:', error.message);
    try {
      await client.end();
    } catch (e) {}
    return { success: false };
  }
}

async function removeConstraint(client) {
  try {
    console.log('\n🧹 Удаляем ограничение payment_method...');
    
    await client.query('ALTER TABLE operations DROP CONSTRAINT IF EXISTS operations_payment_method_check');
    console.log('✅ Ограничение удалено');

    // Тестируем что constraint удален
    console.log('🧪 Тестируем добавление online_order...');
    
    await client.query(`
      INSERT INTO operations (
        id, operation_type, status, start_time, payment_method, details, created_at, updated_at
      ) VALUES (
        'TEST-ONLINE-${Date.now()}', 'sale', 'completed', NOW(), 
        'online_order', 'Test online order', NOW(), NOW()
      )
    `);
    
    console.log('✅ Тест прошел! online_order теперь разрешен');

    // Удаляем тестовую запись
    await client.query(`DELETE FROM operations WHERE id LIKE 'TEST-ONLINE-%'`);
    console.log('🧹 Тестовые записи удалены');
    
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка при удалении constraint:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Поиск рабочего подключения к PostgreSQL...');
  
  for (const { name, config } of connectionConfigs) {
    const result = await testConnection(name, config);
    
    if (result.success) {
      console.log(`🎯 Найдено рабочее подключение: ${name}`);
      
      if (result.hasConstraint) {
        const success = await removeConstraint(result.client);
        await result.client.end();
        
        if (success) {
          console.log('\n🎉 УСПЕШНО! Ограничение payment_method удалено');
          console.log('✅ Теперь можно использовать online_order в операциях');
          return true;
        }
      } else {
        await result.client.end();
        console.log('\n✅ Ограничение уже отсутствует, online_order уже можно использовать');
        return true;
      }
      
      break;
    }
  }
  
  console.log('\n❌ Не удалось найти рабочее подключение к PostgreSQL');
  console.log('🔧 Возможные причины:');
  console.log('   - Неправильные параметры подключения');
  console.log('   - Firewall блокирует подключение');
  console.log('   - Нужны другие права доступа');
  
  return false;
}

main().then((success) => {
  if (success) {
    console.log('\n🎉 Задача выполнена успешно!');
  } else {
    console.log('\n⚠️ Требуется альтернативное решение');
  }
  process.exit(0);
}).catch(err => {
  console.error('\n💥 Критическая ошибка:', err);
  process.exit(1);
});