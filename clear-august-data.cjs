/**
 * Скрипт для очистки демо-данных операций за август 2025
 * Выполняется через Node.js с прямым подключением к Supabase
 */

const { operationsService } = require('./src/services/operationsSupabaseService');

async function clearAugustDemoData() {
  try {
    console.log('🚀 Запуск очистки демо-данных за август 2025...');
    console.log('ℹ️ Станция 4 работает только с 2 сентября 2025');
    console.log('ℹ️ Все операции до этой даты являются тестовыми данными\n');

    // Выполняем очистку
    const result = await operationsService.clearAugustDemoData();

    if (result.success) {
      console.log('\n✅ ОЧИСТКА ЗАВЕРШЕНА УСПЕШНО!');
      console.log(`📊 Удалено операций: ${result.deletedCount}`);
      
      if (result.deletedCount > 0) {
        console.log('\n🎉 Результат:');
        console.log('❌ Демо-данные за август удалены');
        console.log('✅ Реальные данные с 2 сентября сохранены');
        console.log('🔄 Теперь станция 4 показывает только актуальные данные');
      } else {
        console.log('\n✨ База данных уже была очищена от демо-данных');
      }

    } else {
      console.error('\n❌ ОШИБКА ПРИ ОЧИСТКЕ:');
      console.error(result.error);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА:');
    console.error(error.message);
    process.exit(1);
  }
}

// Запускаем скрипт
clearAugustDemoData();