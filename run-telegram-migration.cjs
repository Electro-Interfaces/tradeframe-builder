#!/usr/bin/env node

/**
 * Скрипт для выполнения миграции Telegram верификации
 * Применяет SQL миграции к базе данных TradeFrame
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Получаем URL базы данных из переменных окружения
const DATABASE_URL = process.env.DATABASE_URL || 
                     process.env.SUPABASE_DB_URL ||
                     (process.env.SUPABASE_URL ? 
                       `postgresql://postgres:${process.env.SUPABASE_SERVICE_ROLE_KEY}@db.${process.env.SUPABASE_URL.split('//')[1].split('.')[0]}.supabase.co:5432/postgres` :
                       null);

// Проверяем наличие URL базы данных
if (!DATABASE_URL) {
  console.error('❌ Не найден DATABASE_URL в переменных окружения');
  console.log('Установите одну из переменных:');
  console.log('  - DATABASE_URL');
  console.log('  - SUPABASE_DB_URL');
  console.log('  - VITE_SUPABASE_URL (с паролем)');
  process.exit(1);
}

// Путь к файлу миграции
const migrationFile = path.join(__dirname, 'create-telegram-verification-tables.sql');

// Проверяем существование файла миграции
if (!fs.existsSync(migrationFile)) {
  console.error('❌ Файл миграции не найден:', migrationFile);
  process.exit(1);
}

console.log('🚀 Запуск миграции Telegram верификации...');
console.log('📄 Файл миграции:', migrationFile);
console.log('🔗 База данных:', DATABASE_URL.replace(/(:\/\/[^:]+:)[^@]+(@)/, '$1***$2'));

async function runMigration() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('supabase.co') ? { rejectUnauthorized: false } : false
  });

  try {
    // Подключение к базе данных
    console.log('🔌 Подключение к базе данных...');
    await client.connect();
    console.log('✅ Подключение установлено');

    // Чтение файла миграции
    console.log('📖 Чтение файла миграции...');
    const migrationSQL = fs.readFileSync(migrationFile, 'utf8');

    // Выполнение миграции
    console.log('⚡ Выполнение миграции...');
    const result = await client.query(migrationSQL);
    
    console.log('✅ Миграция выполнена успешно!');
    
    // Проверяем созданные таблицы
    console.log('🔍 Проверка созданных объектов...');
    
    const tablesQuery = `
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('telegram_verification_codes')
      ORDER BY table_name;
    `;
    
    const tables = await client.query(tablesQuery);
    console.log('📋 Созданные таблицы:');
    tables.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name} (${row.table_type})`);
    });
    
    // Проверяем созданные функции
    const functionsQuery = `
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name LIKE '%telegram%'
      ORDER BY routine_name;
    `;
    
    const functions = await client.query(functionsQuery);
    if (functions.rows.length > 0) {
      console.log('🔧 Созданные функции:');
      functions.rows.forEach(row => {
        console.log(`   ✓ ${row.routine_name}() (${row.routine_type})`);
      });
    }
    
    // Проверяем созданные индексы
    const indexesQuery = `
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND (indexname LIKE '%telegram%' OR tablename = 'telegram_verification_codes')
      ORDER BY tablename, indexname;
    `;
    
    const indexes = await client.query(indexesQuery);
    if (indexes.rows.length > 0) {
      console.log('📊 Созданные индексы:');
      indexes.rows.forEach(row => {
        console.log(`   ✓ ${row.indexname} на ${row.tablename}`);
      });
    }
    
    // Проверяем обновления таблицы users
    console.log('👥 Проверка обновлений таблицы users...');
    
    const userColumnsQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name LIKE 'telegram%'
      ORDER BY column_name;
    `;
    
    const userColumns = await client.query(userColumnsQuery);
    if (userColumns.rows.length > 0) {
      console.log('📋 Добавленные колонки в users:');
      userColumns.rows.forEach(row => {
        console.log(`   ✓ ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
      });
    } else {
      console.log('⚠️ Колонки Telegram не найдены в таблице users');
    }

    // Тестовая запись для проверки
    console.log('🧪 Тест создания верификационного кода...');
    
    try {
      const testResult = await client.query(
        'SELECT generate_verification_code($1) as code',
        ['00000000-0000-0000-0000-000000000000'] // Тестовый UUID
      );
      
      if (testResult.rows[0]?.code) {
        console.log(`✅ Тестовый код создан: ${testResult.rows[0].code}`);
        
        // Удаляем тестовый код
        await client.query(
          'DELETE FROM telegram_verification_codes WHERE verification_code = $1',
          [testResult.rows[0].code]
        );
        console.log('🧹 Тестовый код удален');
      }
    } catch (testError) {
      console.log('⚠️ Ошибка тестирования (возможно, user с таким ID не существует):', testError.message);
    }
    
    // Финальная статистика
    console.log('\n📊 Итоговая статистика:');
    
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM telegram_verification_codes) as verification_codes_count,
        (SELECT COUNT(*) FROM users WHERE telegram_chat_id IS NOT NULL) as users_with_telegram,
        (SELECT COUNT(*) FROM users WHERE telegram_notifications_enabled = true) as users_notifications_enabled
    `;
    
    const stats = await client.query(statsQuery);
    const stat = stats.rows[0];
    
    console.log(`   • Кодов верификации в БД: ${stat.verification_codes_count}`);
    console.log(`   • Пользователей с Telegram: ${stat.users_with_telegram}`);  
    console.log(`   • Пользователей с включенными уведомлениями: ${stat.users_notifications_enabled}`);
    
    console.log('\n🎉 Миграция завершена успешно!');
    console.log('\n📝 Следующие шаги:');
    console.log('   1. Настройте Telegram бота (см. telegram-bot-setup.md)');
    console.log('   2. Обновите системные настройки в веб-интерфейсе');
    console.log('   3. Протестируйте полный цикл верификации');

  } catch (error) {
    console.error('❌ Ошибка выполнения миграции:', error);
    
    // Дополнительная диагностика
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Возможные причины:');
      console.log('   • База данных недоступна');
      console.log('   • Неверный DATABASE_URL');
      console.log('   • Проблемы с сетевым подключением');
    } else if (error.code === '28000') {
      console.log('\n💡 Проблемы с аутентификацией:');
      console.log('   • Проверьте логин и пароль в DATABASE_URL');
      console.log('   • Убедитесь, что пользователь имеет права на создание таблиц');
    } else if (error.code === '42P01') {
      console.log('\n💡 Отсутствует таблица:');
      console.log('   • Убедитесь, что таблица users существует');
      console.log('   • Проверьте правильность схемы базы данных');
    }
    
    process.exit(1);
    
  } finally {
    await client.end();
    console.log('🔌 Соединение с базой данных закрыто');
  }
}

// Запуск миграции
runMigration().catch(console.error);

console.log('🔧 Конфигурация:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`   DATABASE_URL: ${DATABASE_URL ? '✅ Установлен' : '❌ Отсутствует'}`);
console.log('');