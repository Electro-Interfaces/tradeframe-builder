#!/usr/bin/env node

/**
 * Утилита для выполнения SQL-файлов в Supabase
 * Использование: node tools/run-sql-file.js <path-to-sql-file>
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Загружаем переменные окружения из .env
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Ошибка: не найдены переменные окружения VITE_SUPABASE_URL или VITE_SUPABASE_SERVICE_ROLE_KEY');
  console.error('💡 Убедитесь, что файл .env существует и содержит необходимые переменные');
  process.exit(1);
}

// Получаем путь к SQL-файлу из аргументов
const sqlFilePath = process.argv[2];

if (!sqlFilePath) {
  console.error('❌ Ошибка: не указан путь к SQL-файлу');
  console.error('📝 Использование: node tools/run-sql-file.js <path-to-sql-file>');
  console.error('📝 Пример: node tools/run-sql-file.js create-networks-and-points-tables.sql');
  process.exit(1);
}

// Проверяем существование файла
const fullPath = path.resolve(process.cwd(), sqlFilePath);
if (!fs.existsSync(fullPath)) {
  console.error(`❌ Ошибка: файл не найден: ${fullPath}`);
  process.exit(1);
}

console.log(`📂 Чтение SQL-файла: ${fullPath}`);

// Читаем содержимое файла
const sqlContent = fs.readFileSync(fullPath, 'utf8');

console.log(`📊 Размер файла: ${sqlContent.length} символов`);
console.log(`🔄 Выполнение SQL-скрипта...`);
console.log('');

// Разбиваем SQL на отдельные команды
// Убираем комментарии и пустые строки
const sqlStatements = sqlContent
  .split('\n')
  .filter(line => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith('--');
  })
  .join('\n')
  .split(';')
  .map(stmt => stmt.trim())
  .filter(stmt => stmt.length > 0);

console.log(`📝 Найдено ${sqlStatements.length} SQL-команд`);
console.log('');

// Выполняем команды последовательно
async function executeSQLStatements() {
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < sqlStatements.length; i++) {
    const statement = sqlStatements[i];
    const preview = statement.substring(0, 60).replace(/\s+/g, ' ');

    console.log(`[${i + 1}/${sqlStatements.length}] Выполнение: ${preview}...`);

    try {
      // Используем PostgREST RPC для выполнения произвольного SQL
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          sql: statement
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log(`   ✅ Успешно`);
      successCount++;
    } catch (error) {
      console.log(`   ❌ Ошибка: ${error.message}`);
      errorCount++;
      errors.push({
        statement: i + 1,
        preview,
        error: error.message
      });
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📊 Результаты выполнения:`);
  console.log(`   ✅ Успешно: ${successCount}`);
  console.log(`   ❌ Ошибок: ${errorCount}`);
  console.log('═══════════════════════════════════════════════════════════');

  if (errors.length > 0) {
    console.log('');
    console.log('❌ Детали ошибок:');
    errors.forEach(err => {
      console.log(`   [${err.statement}] ${err.preview}...`);
      console.log(`       ${err.error}`);
    });
  }

  if (errorCount === 0) {
    console.log('');
    console.log('🎉 Все команды выполнены успешно!');
    process.exit(0);
  } else {
    console.log('');
    console.log('⚠️  Выполнение завершено с ошибками');
    process.exit(1);
  }
}

// Альтернативный способ - через прямое подключение к PostgreSQL
// (если RPC не доступен)
async function executeSQLDirect() {
  console.log('⚠️  RPC метод недоступен, используем прямое выполнение...');
  console.log('');

  // Объединяем все команды обратно в один большой SQL
  const fullSQL = sqlStatements.join(';\n') + ';';

  try {
    // Пытаемся выполнить через SQL Editor API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Profile': 'public'
      },
      body: fullSQL
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Ошибка выполнения SQL: HTTP ${response.status}`);
      console.error(errorText);

      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('💡 Рекомендация:');
      console.log('   Supabase REST API не поддерживает выполнение произвольного SQL.');
      console.log('   Пожалуйста, выполните SQL-файл вручную:');
      console.log('');
      console.log('   1. Откройте Supabase Dashboard');
      console.log('   2. Перейдите в SQL Editor');
      console.log('   3. Скопируйте содержимое файла:');
      console.log(`      ${fullPath}`);
      console.log('   4. Вставьте в редактор и выполните');
      console.log('═══════════════════════════════════════════════════════════');

      process.exit(1);
    }

    console.log('✅ SQL выполнен успешно!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('💡 Инструкция для ручного выполнения:');
    console.log('');
    console.log('   1. Откройте Supabase Dashboard:');
    console.log(`      ${SUPABASE_URL.replace('/rest/v1', '')}`);
    console.log('');
    console.log('   2. Перейдите: SQL Editor → New Query');
    console.log('');
    console.log('   3. Скопируйте и вставьте содержимое файла:');
    console.log(`      ${fullPath}`);
    console.log('');
    console.log('   4. Нажмите RUN или Ctrl+Enter');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('📋 Содержимое SQL-файла также выведено ниже:');
    console.log('');
    console.log(sqlContent);

    process.exit(1);
  }
}

// Запускаем выполнение
executeSQLDirect();
