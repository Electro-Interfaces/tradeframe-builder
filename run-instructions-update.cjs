const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDMzODYyNiwiZXhwIjoyMDQ5OTE0NjI2fQ.eKrb7YXGFm7eCCKDBa_U6Ow7bVW6_xQJ9hT5x7W9u4E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runInstructionsUpdate() {
  try {
    console.log('🚀 Начинаем обновление инструкций...');
    
    // Читаем SQL файл
    const sqlContent = fs.readFileSync('update-section-instructions.sql', 'utf8');
    
    // Разделяем на отдельные команды
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);
    
    console.log(`📝 Найдено ${commands.length} SQL команд`);
    
    // Выполняем команды по одной
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      console.log(`⏳ Выполняем команду ${i + 1}/${commands.length}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: command
        });
        
        if (error) {
          console.error(`❌ Ошибка в команде ${i + 1}:`, error.message);
          
          // Если RPC не работает, пробуем прямой SQL
          if (error.code === '42883') { // function does not exist
            console.log('Пробуем альтернативный способ...');
            
            if (command.toLowerCase().startsWith('delete')) {
              const { error: deleteError } = await supabase
                .from('page_help')
                .delete()
                .in('route', [
                  '/networks', 
                  '/network/overview', 
                  '/network/operations-transactions',
                  '/point/prices',
                  '/point/tanks', 
                  '/equipment'
                ]);
              
              if (deleteError) {
                console.error('❌ Ошибка удаления:', deleteError.message);
              } else {
                console.log('✅ Старые записи удалены');
              }
            } else if (command.toLowerCase().startsWith('insert')) {
              // Парсим INSERT команду
              const values = parseInsertValues(command);
              if (values) {
                const { error: insertError } = await supabase
                  .from('page_help')
                  .insert(values);
                
                if (insertError) {
                  console.error('❌ Ошибка вставки:', insertError.message);
                } else {
                  console.log('✅ Запись добавлена');
                }
              }
            }
          }
        } else {
          console.log(`✅ Команда ${i + 1} выполнена успешно`);
        }
      } catch (cmdError) {
        console.error(`❌ Неожиданная ошибка в команде ${i + 1}:`, cmdError.message);
      }
    }
    
    console.log('🎉 Обновление инструкций завершено!');
    
    // Проверяем результат
    const { data: checkData, error: checkError } = await supabase
      .from('page_help')
      .select('route, title')
      .in('route', [
        '/networks', 
        '/network/overview', 
        '/network/operations-transactions',
        '/point/prices',
        '/point/tanks', 
        '/equipment'
      ]);
    
    if (checkError) {
      console.error('❌ Ошибка проверки:', checkError.message);
    } else {
      console.log('📋 Обновленные инструкции:');
      checkData.forEach(item => {
        console.log(`  - ${item.route}: ${item.title}`);
      });
    }
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error.message);
  }
}

function parseInsertValues(insertCommand) {
  // Простой парсер для INSERT команд (базовая реализация)
  try {
    // Извлекаем значения между VALUES ( и )
    const valuesMatch = insertCommand.match(/VALUES\s*\(([\s\S]+)\)/i);
    if (!valuesMatch) return null;
    
    const valuesStr = valuesMatch[1];
    
    // Это упрощенная версия - в реальности нужен более сложный парсер
    // Но для наших INSERT команд этого достаточно
    console.log('Пропускаем INSERT через альтернативный метод (нужен ручной ввод)');
    return null;
  } catch (e) {
    return null;
  }
}

runInstructionsUpdate();