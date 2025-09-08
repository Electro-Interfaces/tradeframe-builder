// Скрипт для автоматического сбора UUID всех АЗС
// Запустите в консоли браузера на любой странице приложения

function collectAllAZSUuids() {
  console.log('🔍 Сбор UUID всех АЗС...');
  
  try {
    // Получаем данные из localStorage
    const tradingPointsData = localStorage.getItem('trading_points');
    
    if (!tradingPointsData) {
      console.error('❌ Данные о торговых точках не найдены в localStorage');
      return null;
    }
    
    const tradingPoints = JSON.parse(tradingPointsData);
    console.log(`📦 Найдено ${tradingPoints.length} торговых точек`);
    
    // Фильтруем и сортируем АЗС
    const azsPoints = tradingPoints
      .filter(tp => tp.name && (tp.name.includes('АЗС') || tp.name.includes('№')))
      .sort((a, b) => {
        // Извлекаем номер из названия для правильной сортировки
        const numA = parseInt(a.name.match(/№(\d+)/)?.[1] || '0');
        const numB = parseInt(b.name.match(/№(\d+)/)?.[1] || '0');
        return numA - numB;
      });
    
    console.log(`🏪 Найдено ${azsPoints.length} АЗС:`);
    
    // Выводим информацию о каждой АЗС
    azsPoints.forEach((azs, i) => {
      console.log(`${i+1}. ${azs.name} - UUID: ${azs.id}`);
    });
    
    // Генерируем код маппинга
    console.log('\n🔧 КОД ДЛЯ tradingNetworkAPI.ts:');
    console.log('const stationToUuidMapping: Record<number, string> = {');
    azsPoints.forEach((azs, i) => {
      const stationNumber = i + 1;
      console.log(`  ${stationNumber}: '${azs.id}',   // ${azs.name}`);
    });
    console.log('};');
    
    console.log('\n🔧 КОД ДЛЯ pricesCache.ts:');
    console.log('const uuidToStationMapping: Record<string, number> = {');
    azsPoints.forEach((azs, i) => {
      const stationNumber = i + 1;
      console.log(`  '${azs.id}': ${stationNumber},   // ${azs.name}`);
    });
    console.log('};');
    
    return azsPoints;
    
  } catch (error) {
    console.error('❌ Ошибка сбора UUID:', error);
    return null;
  }
}

// Запуск функции
const result = collectAllAZSUuids();

if (result && result.length > 0) {
  console.log(`\n✅ Найдено ${result.length} АЗС. Скопируйте код маппинга выше.`);
  
  // Также сохраняем в глобальную переменную для удобства
  window.foundAZSList = result;
  console.log('💾 Результаты также сохранены в window.foundAZSList');
} else {
  console.log('❌ АЗС не найдены. Убедитесь что вы находитесь на странице приложения.');
}