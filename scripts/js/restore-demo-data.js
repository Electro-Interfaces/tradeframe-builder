/**
 * Скрипт для восстановления всех демо данных приложения TradeControl Builder
 */

// Импорт демо данных августа 2025
const augustDemoData = require('./august-2025-demo-data.json');

// Восстановление данных операций
if (augustDemoData.operations) {
  localStorage.setItem('tradeframe_operations', JSON.stringify(augustDemoData.operations));
  console.log('✅ Восстановлены данные операций:', augustDemoData.operations.length, 'записей');
}

// Восстановление данных остатков топлива
if (augustDemoData.fuelStocks) {
  localStorage.setItem('tradeframe_fuel_stocks', JSON.stringify(augustDemoData.fuelStocks));
  console.log('✅ Восстановлены данные остатков топлива:', augustDemoData.fuelStocks.length, 'записей');
}

// Восстановление данных резервуаров
if (augustDemoData.tanks) {
  localStorage.setItem('tradeframe_tanks', JSON.stringify(augustDemoData.tanks));
  console.log('✅ Восстановлены данные резервуаров:', augustDemoData.tanks.length, 'записей');
}

// Восстановление данных оборудования
if (augustDemoData.equipment) {
  localStorage.setItem('tradeframe_equipment', JSON.stringify(augustDemoData.equipment));
  console.log('✅ Восстановлены данные оборудования:', augustDemoData.equipment.length, 'записей');
}

// Восстановление данных сетей
if (augustDemoData.networks) {
  localStorage.setItem('tradeframe_networks', JSON.stringify(augustDemoData.networks));
  console.log('✅ Восстановлены данные сетей:', augustDemoData.networks.length, 'записей');
}

// Восстановление данных торговых точек
if (augustDemoData.tradingPoints) {
  localStorage.setItem('tradeframe_trading_points', JSON.stringify(augustDemoData.tradingPoints));
  console.log('✅ Восстановлены данные торговых точек:', augustDemoData.tradingPoints.length, 'записей');
}

console.log('🎉 Все демо данные успешно восстановлены!');
console.log('🔄 Перезагрузите страницу для применения изменений.');