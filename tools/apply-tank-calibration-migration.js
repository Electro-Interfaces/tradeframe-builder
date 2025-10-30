/**
 * Скрипт для применения миграции tank_calibration_settings к Supabase БД
 *
 * Использование:
 *   node tools/apply-tank-calibration-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase конфигурация
const SUPABASE_URL = 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Выполнить SQL запрос через Supabase REST API
 */
async function executeSQL(sql) {
  try {
    // Разбиваем SQL на отдельные команды (по точке с запятой)
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📊 Найдено команд SQL: ${commands.length}`);

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];

      // Пропускаем комментарии и SELECT проверки
      if (command.startsWith('COMMENT') || command.startsWith('SELECT')) {
        console.log(`⏭️  Пропущено: ${command.substring(0, 50)}...`);
        continue;
      }

      console.log(`\n🔄 Выполнение команды ${i + 1}/${commands.length}:`);
      console.log(`   ${command.substring(0, 80)}...`);

      try {
        // Supabase REST API не поддерживает прямое выполнение SQL
        // Используем PostgreSQL функцию через RPC
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: command + ';'
        });

        if (error) {
          // Если RPC функция не существует, пробуем альтернативный метод
          if (error.code === '42883') {
            console.log('⚠️  RPC функция exec_sql не найдена');
            console.log('ℹ️  Пожалуйста, примените миграцию вручную через Supabase Dashboard:');
            console.log('   1. Откройте https://supabase.com/dashboard/project/ssvazdgnmatbdynkhkqo/editor/sql');
            console.log('   2. Скопируйте содержимое файла:');
            console.log('      database/migrations/alter_tank_calibration_settings_add_missing_fields.sql');
            console.log('   3. Вставьте в SQL Editor и выполните');
            process.exit(1);
          }
          throw error;
        }

        console.log('✅ Команда выполнена успешно');
      } catch (cmdError) {
        // Игнорируем ошибки "уже существует"
        if (cmdError.message.includes('already exists') ||
            cmdError.message.includes('IF NOT EXISTS')) {
          console.log('⚠️  Команда пропущена (объект уже существует)');
        } else {
          console.error('❌ Ошибка выполнения команды:', cmdError.message);
          throw cmdError;
        }
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Ошибка выполнения SQL:', error);
    throw error;
  }
}

/**
 * Проверить текущую структуру таблицы
 */
async function checkTableStructure() {
  console.log('\n📋 Проверка текущей структуры таблицы tank_calibration_settings...\n');

  try {
    // Получаем одну запись для проверки структуры
    const { data, error } = await supabase
      .from('tank_calibration_settings')
      .select('*')
      .limit(1);

    if (error) {
      if (error.code === 'PGRST204') {
        console.log('⚠️  Таблица tank_calibration_settings не найдена');
        console.log('ℹ️  Сначала примените создание таблицы:');
        console.log('   database/migrations/create_tank_calibration_settings.sql');
        return false;
      }
      throw error;
    }

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log(`✅ Таблица существует, найдено колонок: ${columns.length}`);
      console.log('📊 Список колонок:', columns.slice(0, 10).join(', '), '...');
    } else {
      console.log('✅ Таблица существует (пустая)');
    }

    return true;
  } catch (error) {
    console.error('❌ Ошибка проверки структуры:', error.message);
    return false;
  }
}

/**
 * Главная функция
 */
async function main() {
  console.log('🚀 Применение миграции tank_calibration_settings к Supabase БД');
  console.log('=' .repeat(70));

  // Проверяем текущую структуру
  const tableExists = await checkTableStructure();

  if (!tableExists) {
    console.log('\n❌ Невозможно продолжить: таблица не найдена');
    process.exit(1);
  }

  // Читаем файл миграции
  const migrationPath = join(__dirname, '..', 'database', 'migrations', 'alter_tank_calibration_settings_add_missing_fields.sql');

  console.log(`\n📄 Чтение файла миграции: ${migrationPath}`);

  let migrationSQL;
  try {
    migrationSQL = readFileSync(migrationPath, 'utf-8');
    console.log(`✅ Файл миграции прочитан (${migrationSQL.length} символов)`);
  } catch (error) {
    console.error('❌ Ошибка чтения файла миграции:', error.message);
    process.exit(1);
  }

  // ВАЖНОЕ ПРЕДУПРЕЖДЕНИЕ
  console.log('\n⚠️  ВНИМАНИЕ: Миграция изменит структуру таблицы tank_calibration_settings');
  console.log('⚠️  Рекомендуется сделать резервную копию данных перед применением!');
  console.log('\n📝 Что будет изменено:');
  console.log('   ✅ Добавлены новые поля (tank_shape_type, tank_location_type, и т.д.)');
  console.log('   ✅ Добавлены CHECK constraints для валидации');
  console.log('   ✅ Добавлены индексы для производительности');
  console.log('   ✅ Добавлено JSONB поле custom_params для расширений');
  console.log('\n🔧 Для применения миграции вручную:');
  console.log('   1. Откройте Supabase Dashboard SQL Editor');
  console.log('   2. Откройте файл: database/migrations/alter_tank_calibration_settings_add_missing_fields.sql');
  console.log('   3. Скопируйте содержимое в SQL Editor');
  console.log('   4. Выполните запрос');
  console.log('\n   URL: https://supabase.com/dashboard/project/ssvazdgnmatbdynkhkqo/editor/sql');

  console.log('\n✅ Миграция подготовлена к применению');
  console.log('ℹ️  Примените миграцию вручную через Supabase Dashboard (см. инструкцию выше)');
}

// Запуск
main().catch(error => {
  console.error('\n💥 Критическая ошибка:', error);
  process.exit(1);
});
