/**
 * Применение миграции для таблиц цен к Supabase
 */

import { readFileSync } from 'fs';

const config = {
  url: 'https://tohtryzyffcebtyvkxwh.supabase.co',
  apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NzU0NDgsImV4cCI6MjA3MjQ1MTQ0OH0.NMpuTp08vLuxhRLxbI9lOAo6JI22-8eDcMRylE3MoqI',
  schema: 'public'
};

async function applyMigration() {
  console.log('🚀 Применение миграции для таблиц цен');
  console.log('=' .repeat(50));
  
  try {
    // Читаем SQL миграцию
    console.log('📖 Чтение миграционного файла...');
    const migrationSQL = readFileSync('./migrations/008_prices_schema.sql', 'utf8');
    
    console.log(`📄 Размер файла: ${migrationSQL.length} символов`);
    
    // Разделяем SQL на отдельные команды
    const sqlCommands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('/*'))
      .filter(cmd => !cmd.match(/^(COMMENT|DO \$\$|BEGIN|END|RAISE)/));
    
    console.log(`🔧 Найдено ${sqlCommands.length} SQL команд для выполнения`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Выполняем каждую команду по отдельности
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      if (command.length < 10) continue; // Пропускаем очень короткие команды
      
      console.log(`\n[${i + 1}/${sqlCommands.length}] Выполнение команды...`);
      console.log(`📝 ${command.substring(0, 80)}${command.length > 80 ? '...' : ''}`);
      
      try {
        // Используем SQL Editor API для выполнения команды
        const response = await fetch(`${config.url}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': config.apiKey,
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sql: command + ';'
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Успешно выполнено`);
          successCount++;
        } else {
          const errorText = await response.text();
          console.log(`❌ Ошибка ${response.status}: ${errorText}`);
          
          // Если это ошибка "уже существует", считаем это нормальным
          if (errorText.includes('already exists') || errorText.includes('duplicate')) {
            console.log(`ℹ️ Объект уже существует - пропускаем`);
            successCount++;
          } else {
            errorCount++;
            
            // Для критических ошибок останавливаемся
            if (errorText.includes('syntax error') || response.status === 500) {
              console.log(`🛑 Критическая ошибка, останавливаем миграцию`);
              break;
            }
          }
        }
        
        // Небольшая пауза между командами
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`❌ Исключение: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('📊 ИТОГИ МИГРАЦИИ:');
    console.log(`✅ Успешно выполнено: ${successCount} команд`);
    console.log(`❌ Ошибок: ${errorCount} команд`);
    
    if (errorCount === 0) {
      console.log('🎉 Миграция завершена успешно!');
    } else if (successCount > errorCount) {
      console.log('⚠️ Миграция завершена с предупреждениями');
    } else {
      console.log('💥 Миграция завершена с ошибками');
    }
    
    // Проверяем результат
    console.log('\n🔍 Проверка созданных таблиц...');
    
    const tablesToCheck = ['prices', 'price_packages'];
    
    for (const tableName of tablesToCheck) {
      try {
        const response = await fetch(`${config.url}/rest/v1/${tableName}?limit=1`, {
          method: 'GET',
          headers: {
            'apikey': config.apiKey,
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          console.log(`✅ ${tableName}: Таблица создана и доступна`);
        } else if (response.status === 404) {
          console.log(`❌ ${tableName}: Таблица НЕ создана`);
        } else {
          console.log(`⚠️ ${tableName}: Статус ${response.status} - возможны проблемы доступа`);
        }
      } catch (error) {
        console.log(`❌ ${tableName}: Ошибка проверки - ${error.message}`);
      }
    }
    
    // Проверяем связь nomenclature -> fuel_types
    console.log('\n🔗 Проверка связи nomenclature -> fuel_types...');
    try {
      const response = await fetch(`${config.url}/rest/v1/nomenclature?limit=1&select=id,fuel_type_id`, {
        method: 'GET',
        headers: {
          'apikey': config.apiKey,
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0 && 'fuel_type_id' in data[0]) {
          console.log(`✅ Поле fuel_type_id добавлено в nomenclature`);
        } else {
          console.log(`❌ Поле fuel_type_id НЕ найдено в nomenclature`);
        }
      }
    } catch (error) {
      console.log(`❌ Ошибка проверки связи: ${error.message}`);
    }
    
    console.log('\n🏁 Применение миграции завершено!');
    
  } catch (error) {
    console.log('❌ Общая ошибка при применении миграции:', error.message);
  }
}

// Запускаем применение миграции
applyMigration().catch(console.error);