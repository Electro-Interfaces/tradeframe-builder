/**
 * Скрипт для проверки и создания записей в таблице networks
 */

// Это нужно выполнить в консоли браузера на странице приложения
console.log('🔧 Скрипт настройки таблицы networks');

async function setupNetworksTable() {
  try {
    // Импортируем модули
    const { supabase } = await import('./src/api/database/supabase.ts');
    
    console.log('1️⃣ Проверяем текущее содержимое таблицы networks...');
    
    // Получаем текущие данные
    const { data: existingNetworks, error: selectError } = await supabase
      .from('networks')
      .select('*');
    
    if (selectError) {
      console.error('❌ Ошибка при чтении таблицы networks:', selectError);
      return;
    }
    
    console.log(`📊 Найдено записей в таблице: ${existingNetworks?.length || 0}`);
    
    if (existingNetworks && existingNetworks.length > 0) {
      console.log('📋 Существующие записи:');
      existingNetworks.forEach(network => {
        console.log(`  - ${network.name} (ID: ${network.id}, code: ${network.code})`);
      });
    } else {
      console.log('📭 Таблица пуста, создаем начальные записи...');
    }
    
    // Записи для создания
    const networksToCreate = [
      {
        name: 'Демо сеть АЗС',
        code: 'demo_azs',
        description: 'Демонстрационная сеть заправочных станций',
        status: 'active'
      },
      {
        name: 'БТО',
        code: 'bto',
        description: 'Сеть АЗС БТО',
        status: 'active'
      }
    ];
    
    console.log('2️⃣ Создаем записи...');
    
    for (const networkData of networksToCreate) {
      // Проверяем, существует ли уже такая запись
      const exists = existingNetworks?.some(n => 
        n.code === networkData.code || n.name === networkData.name
      );
      
      if (exists) {
        console.log(`⏭️ Пропускаем "${networkData.name}" - уже существует`);
        continue;
      }
      
      // Создаем запись
      const { data: newNetwork, error: insertError } = await supabase
        .from('networks')
        .insert(networkData)
        .select()
        .single();
      
      if (insertError) {
        console.error(`❌ Ошибка создания "${networkData.name}":`, insertError);
      } else {
        console.log(`✅ Создана сеть "${networkData.name}" с ID: ${newNetwork.id}`);
      }
    }
    
    console.log('3️⃣ Проверяем финальное состояние таблицы...');
    
    // Получаем финальные данные
    const { data: finalNetworks, error: finalError } = await supabase
      .from('networks')
      .select('*')
      .order('created_at');
    
    if (finalError) {
      console.error('❌ Ошибка финальной проверки:', finalError);
      return;
    }
    
    console.log(`✅ Итого записей в таблице: ${finalNetworks?.length || 0}`);
    console.log('📋 Финальный список:');
    finalNetworks?.forEach((network, index) => {
      console.log(`${index + 1}. ${network.name}`);
      console.log(`   ID: ${network.id}, Code: ${network.code}`);
      console.log(`   Status: ${network.status}, Created: ${new Date(network.created_at).toLocaleString()}`);
      console.log('');
    });
    
    return finalNetworks;
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    throw error;
  }
}

// Функция для быстрой очистки таблицы (только для отладки)
async function clearNetworksTable() {
  try {
    const { supabase } = await import('./src/api/database/supabase.ts');
    
    console.log('🗑️ ВНИМАНИЕ: Очищаем таблицу networks...');
    const { error } = await supabase
      .from('networks')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Удаляем все записи
    
    if (error) {
      console.error('❌ Ошибка очистки:', error);
    } else {
      console.log('✅ Таблица очищена');
    }
  } catch (error) {
    console.error('❌ Ошибка очистки:', error);
  }
}

// Делаем функции доступными в консоли
window.setupNetworksTable = setupNetworksTable;
window.clearNetworksTable = clearNetworksTable;

console.log(`
🚀 Команды для работы с таблицей networks:

📌 setupNetworksTable() - проверить и создать записи
📌 clearNetworksTable() - очистить таблицу (для отладки)

Выполните в консоли:
> setupNetworksTable()
`);

export { setupNetworksTable, clearNetworksTable };