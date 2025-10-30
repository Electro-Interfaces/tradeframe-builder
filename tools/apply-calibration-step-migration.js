/**
 * Применение SQL миграции: Добавление calibration_step_mm
 * 
 * Использование:
 * node tools/apply-calibration-step-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Загружаем переменные окружения из server/.env
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../server/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Ошибка: SUPABASE_URL или SUPABASE_SERVICE_KEY не найдены в server/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🔄 Применение миграции: add_calibration_step_mm_column.sql');
  console.log('='.repeat(70));

  try {
    // Читаем SQL файл
    const migrationPath = join(
      dirname(fileURLToPath(import.meta.url)), 
      '../database/migrations/add_calibration_step_mm_column.sql'
    );
    
    const sql = readFileSync(migrationPath, 'utf-8');
    console.log('📄 Миграция загружена из:', migrationPath);
    console.log('');
    console.log('📝 SQL скрипт:');
    console.log('-'.repeat(70));
    console.log(sql);
    console.log('-'.repeat(70));
    console.log('');

    // Применяем миграцию через RPC (если есть функция execute_sql) или напрямую через REST API
    // Supabase не поддерживает прямое выполнение DDL через JS клиент
    // Нужно выполнить в Supabase Dashboard -> SQL Editor
    
    console.log('⚠️  ВНИМАНИЕ: Supabase JS Client не поддерживает выполнение DDL команд (ALTER TABLE)');
    console.log('');
    console.log('📋 ИНСТРУКЦИЯ ПО ПРИМЕНЕНИЮ МИГРАЦИИ:');
    console.log('1. Откройте Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Перейдите в SQL Editor');
    console.log('3. Скопируйте и выполните SQL выше');
    console.log('');
    console.log('Или используйте команду:');
    console.log('');
    console.log(`  cat database/migrations/add_calibration_step_mm_column.sql`);
    console.log('');
    
    // Проверяем текущую структуру таблицы
    console.log('🔍 Проверка текущей структуры таблицы...');
    const { data, error } = await supabase
      .from('tank_calibration_settings')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Ошибка проверки:', error.message);
    } else {
      console.log('✅ Таблица доступна');
      if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        const hasColumn = columns.includes('calibration_step_mm');
        
        if (hasColumn) {
          console.log('✅ Колонка calibration_step_mm УЖЕ существует');
        } else {
          console.log('⚠️  Колонка calibration_step_mm ОТСУТСТВУЕТ - нужно применить миграцию');
          console.log('');
          console.log('Текущие колонки:', columns.join(', '));
        }
      }
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

applyMigration();
