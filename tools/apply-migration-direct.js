/**
 * Прямое применение SQL миграции к базе данных Supabase через PostgreSQL
 * TradeFrame Builder v1.7.26
 */

import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase конфигурация из server/.env
const SUPABASE_URL = 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

// PostgreSQL connection string для Supabase
// Формат: postgresql://postgres:[YOUR-PASSWORD]@db.ssvazdgnmatbdynkhkqo.supabase.co:5432/postgres
const PG_CONNECTION_STRING = process.env.DATABASE_URL || 'postgresql://postgres.ssvazdgnmatbdynkhkqo:pPNBGsxwY6gE4xKo@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function applyMigration() {
  console.log('='.repeat(80));
  console.log('📊 ПРИМЕНЕНИЕ МИГРАЦИИ К БАЗЕ ДАННЫХ SUPABASE');
  console.log('='.repeat(80));

  // Читаем SQL миграцию
  const migrationPath = path.join(__dirname, '../database/migrations/add_calibration_step_mm_column.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Файл миграции не найден:', migrationPath);
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  
  console.log(`\n📄 Файл миграции: ${migrationPath}`);
  console.log(`\n📝 SQL команды:\n${migrationSQL}\n`);

  // Попробуем через Supabase REST API
  console.log('Попытка 1: Через Supabase REST API...');
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Supabase REST API не поддерживает DDL напрямую
    // Используем rpc для выполнения SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.log('⚠️  REST API не сработал:', error.message);
      console.log('Переход к методу 2...\n');
    } else {
      console.log('✅ Миграция применена через REST API!');
      return;
    }
  } catch (error) {
    console.log('⚠️  REST API не сработал:', error.message);
    console.log('Переход к методу 2...\n');
  }

  // Попробуем через прямое PostgreSQL подключение
  console.log('Попытка 2: Через прямое PostgreSQL подключение...');
  const client = new pg.Client({
    connectionString: PG_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Подключение к PostgreSQL установлено');

    // Выполняем миграцию
    console.log('\n🔄 Выполнение миграции...');
    const result = await client.query(migrationSQL);
    
    console.log('✅ Миграция успешно применена!');
    console.log('Результат:', result);

    // Проверяем, что колонка действительно добавлена
    console.log('\n🔍 Проверка структуры таблицы...');
    const checkQuery = `
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tank_calibration_settings'
      AND column_name = 'calibration_step_mm';
    `;
    
    const checkResult = await client.query(checkQuery);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Колонка calibration_step_mm успешно добавлена:');
      console.log(checkResult.rows[0]);
    } else {
      console.log('❌ Колонка не найдена после миграции!');
    }

  } catch (error) {
    console.error('❌ Ошибка при применении миграции:', error);
    throw error;
  } finally {
    await client.end();
    console.log('\n✅ Соединение закрыто');
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ МИГРАЦИЯ ЗАВЕРШЕНА');
  console.log('='.repeat(80));
}

// Запуск
applyMigration().catch(error => {
  console.error('Критическая ошибка:', error);
  process.exit(1);
});
