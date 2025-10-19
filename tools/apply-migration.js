/**
 * Скрипт для применения SQL миграций в Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Конфигурация Supabase
const SUPABASE_URL = 'https://ynwbmxvqucmvjhmsxtqh.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlud2JteHZxdWNtdmpobXN4dHFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjA2MTcxMCwiZXhwIjoyMDQxNjM3NzEwfQ.uXnaH2K6arna7f_gcUeiyLjwivD-P7NRLg5CtvPnB_g';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMigration(migrationFile) {
  console.log(`\n🔄 Применение миграции: ${migrationFile}\n`);

  try {
    // Читаем файл миграции
    const migrationPath = path.join(__dirname, '..', 'supabase-migrations', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Разбиваем на отдельные SQL команды
    // Убираем комментарии и пустые строки
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    console.log(`📋 Найдено SQL команд: ${statements.length}\n`);

    let successCount = 0;
    let errorCount = 0;

    // Выполняем каждую команду
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Пропускаем пустые команды и комментарии
      if (statement.trim().length <= 1) continue;

      // Показываем первые 100 символов команды
      const preview = statement.substring(0, 100).replace(/\s+/g, ' ');
      console.log(`[${i + 1}/${statements.length}] ${preview}...`);

      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

        if (error) {
          console.error(`❌ Ошибка:`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Успешно`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Ошибка выполнения:`, err.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Результаты:`);
    console.log(`   ✅ Успешно: ${successCount}`);
    console.log(`   ❌ Ошибок: ${errorCount}`);

    if (errorCount === 0) {
      console.log(`\n🎉 Миграция применена успешно!\n`);
    } else {
      console.log(`\n⚠️ Миграция применена с ошибками. Проверьте результаты выше.\n`);
    }

  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

// Получаем имя файла из аргументов
const migrationFile = process.argv[2] || '001_notifications_tables.sql';

applyMigration(migrationFile)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
