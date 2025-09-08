/**
 * Скрипт для исправления ограничения payment_method
 * Добавляет поддержку online_order
 */

const { Client } = require('pg');

// Параметры подключения к Supabase PostgreSQL  
const client = new Client({
  host: 'aws-0-eu-central-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.tohtryzyffcebtyvkxwh',
  password: 'tradeframe2024',
  ssl: { 
    rejectUnauthorized: false
  }
});

async function fixPaymentMethodConstraint() {
  try {
    console.log('🔌 Подключаемся к базе данных Supabase...');
    await client.connect();
    console.log('✅ Подключение установлено');

    // Проверяем текущее ограничение
    console.log('🔍 Проверяем текущее ограничение...');
    const currentConstraint = await client.query(`
      SELECT conname, consrc 
      FROM pg_constraint 
      WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'operations') 
      AND conname = 'operations_payment_method_check'
    `);
    
    if (currentConstraint.rows.length > 0) {
      console.log('📋 Текущее ограничение:', currentConstraint.rows[0].consrc);
    }

    // Удаляем старое ограничение
    console.log('🧹 Удаляем старое ограничение...');
    await client.query('ALTER TABLE operations DROP CONSTRAINT IF EXISTS operations_payment_method_check');
    console.log('✅ Старое ограничение удалено');

    // Добавляем новое ограничение с online_order
    console.log('➕ Добавляем новое ограничение с online_order...');
    await client.query(`
      ALTER TABLE operations 
      ADD CONSTRAINT operations_payment_method_check 
      CHECK (payment_method IN ('cash', 'bank_card', 'fuel_card', 'online_order'))
    `);
    console.log('✅ Новое ограничение добавлено');

    // Проверяем новое ограничение
    const newConstraint = await client.query(`
      SELECT conname, consrc 
      FROM pg_constraint 
      WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'operations') 
      AND conname = 'operations_payment_method_check'
    `);
    
    if (newConstraint.rows.length > 0) {
      console.log('🎉 Новое ограничение:', newConstraint.rows[0].consrc);
    }

    // Тестируем добавление записи с online_order
    console.log('🧪 Тестируем добавление записи с online_order...');
    const testResult = await client.query(`
      INSERT INTO operations (
        id, operation_type, status, start_time, payment_method, details, created_at, updated_at
      ) VALUES (
        'TEST-ONLINE-SUCCESS', 'sale', 'completed', '2025-08-31T12:00:00Z', 
        'online_order', 'Test successful online order', '2025-08-31T12:00:00Z', '2025-08-31T12:00:00Z'
      ) RETURNING id
    `);
    
    console.log('✅ Тест прошел успешно! ID:', testResult.rows[0].id);

    // Удаляем тестовую запись
    await client.query("DELETE FROM operations WHERE id = 'TEST-ONLINE-SUCCESS'");
    console.log('🧹 Тестовая запись удалена');

    console.log('🎉 Ограничение payment_method успешно обновлено!');
    console.log('💳 Теперь поддерживаются: cash, bank_card, fuel_card, online_order');

  } catch (error) {
    console.error('❌ Ошибка при обновлении ограничения:', error.message);
    console.error('🔧 Детали:', error.detail || error.hint || 'Нет дополнительной информации');
  } finally {
    await client.end();
    console.log('🔌 Подключение закрыто');
  }
}

// Запуск
fixPaymentMethodConstraint().then(() => {
  console.log('✅ Скрипт завершен');
  process.exit(0);
}).catch(err => {
  console.error('💥 Критическая ошибка:', err);
  process.exit(1);
});