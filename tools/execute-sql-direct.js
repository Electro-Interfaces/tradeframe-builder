/**
 * Прямое выполнение SQL в Supabase через pg
 * 
 * Использование:
 * node tools/execute-sql-direct.js database/migrations/add_calibration_step_mm_column.sql
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../server/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePassword = process.env.SUPABASE_DB_PASSWORD || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL не найден в server/.env');
  process.exit(1);
}

// Извлекаем данные для подключения из URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1];

if (!projectRef) {
  console.error('❌ Не удалось извлечь project ref из SUPABASE_URL');
  process.exit(1);
}

const connectionString = `postgresql://postgres.${projectRef}:${supabasePassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

async function executeSql() {
  const sqlFile = process.argv[2];
  
  if (!sqlFile) {
    console.error('❌ Укажите путь к SQL файлу');
    console.error('Использование: node tools/execute-sql-direct.js <путь к файлу.sql>');
    process.exit(1);
  }

  console.log('🔄 Выполнение SQL через прямое подключение к PostgreSQL');
  console.log('='.repeat(70));

  try {
    // Читаем SQL
    const sql = readFileSync(sqlFile, 'utf-8');
    console.log('📄 SQL файл:', sqlFile);
    console.log('📝 Содержимое:');
    console.log('-'.repeat(70));
    console.log(sql);
    console.log('-'.repeat(70));
    console.log('');

    // Подключаемся к БД
    console.log('🔗 Подключение к Supabase PostgreSQL...');
    const client = new pg.Client({ connectionString });
    
    await client.connect();
    console.log('✅ Подключение установлено');
    console.log('');

    // Выполняем SQL
    console.log('⚡ Выполнение SQL...');
    const result = await client.query(sql);
    
    console.log('✅ SQL выполнен успешно!');
    console.log('📊 Результат:', result);
    console.log('');

    await client.end();
    console.log('✅ Миграция применена успешно!');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error('');
    console.error('💡 Возможные причины:');
    console.error('   1. Не установлен пакет pg: npm install --save-dev pg');
    console.error('   2. Неверный пароль БД в SUPABASE_DB_PASSWORD');
    console.error('   3. Firewall блокирует подключение к PostgreSQL');
    console.error('');
    console.error('🔧 Альтернатива:');
    console.error('   Выполните SQL вручную в Supabase Dashboard → SQL Editor');
    process.exit(1);
  }
}

executeSql();
