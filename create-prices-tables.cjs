// Скрипт для создания таблиц цен в Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://tshglrthsmyxhlsrrsmt.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzaGdscnRoc215eGhsc3Jyc210Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDc4MzI5NywiZXhwIjoyMDQ2MzU5Mjk3fQ.NHXfz4p5SaYWwZdA4MxeKg6J4vRBfuBFhJx0N4Q5I_g';

const supabase = createClient(supabaseUrl, serviceKey);

async function createPricesTables() {
  console.log('🔧 Создание таблиц цен в Supabase...');

  try {
    // Читаем SQL файл
    const sqlContent = fs.readFileSync(path.join(__dirname, 'database/prices_schema.sql'), 'utf8');
    
    // Разбиваем на отдельные команды
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--'));

    console.log(`📝 Найдено ${commands.length} SQL команд`);

    let successCount = 0;
    let errorCount = 0;

    // Выполняем команды по одной
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i].trim();
      if (!command) continue;

      try {
        console.log(`\n➤ Команда ${i + 1}/${commands.length}:`);
        console.log(command.substring(0, 100) + (command.length > 100 ? '...' : ''));
        
        const { data, error } = await supabase.rpc('execute_sql', { query: command });
        
        if (error) {
          console.log('❌ Ошибка:', error.message);
          errorCount++;
        } else {
          console.log('✅ Выполнено успешно');
          successCount++;
        }
        
        // Небольшая пауза между командами
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.log('❌ Исключение:', err.message);
        errorCount++;
      }
    }

    console.log(`\n🎉 Завершено: ${successCount} успешно, ${errorCount} ошибок`);

    // Проверяем созданные таблицы
    console.log('\n🔍 Проверяем созданные таблицы...');
    
    const tables = ['prices', 'price_packages', 'price_package_lines', 'price_history'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ Таблица ${table}: ${error.message}`);
        } else {
          console.log(`✅ Таблица ${table}: создана успешно`);
        }
      } catch (err) {
        console.log(`❌ Таблица ${table}: ${err.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
  }
}

// Запускаем скрипт
createPricesTables();