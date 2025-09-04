/**
 * Экспорт всех mock данных в JSON файлы
 * Для АГЕНТА 2: Бизнес-логика
 */

import fs from 'fs';
import path from 'path';

// Import mock services
import { networksService } from '../src/services/networksService';
import { nomenclatureService } from '../src/services/nomenclatureService';
import { usersService } from '../src/services/usersService';
import { pricesService } from '../src/services/pricesService';

/**
 * Создает директорию для экспорта данных
 */
function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

/**
 * Сохраняет данные в JSON файл
 */
function saveToJson(filename: string, data: any) {
  const dataDir = ensureDataDirectory();
  const filePath = path.join(dataDir, filename);
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✅ Exported ${Array.isArray(data) ? data.length : 'data'} records to ${filename}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to export ${filename}:`, error);
    return false;
  }
}

/**
 * Экспорт сетей и торговых точек
 */
async function exportNetworks() {
  try {
    console.log('📊 Exporting networks...');
    const networks = await networksService.getNetworks();
    
    // Экспорт основных данных сетей
    const networksData = networks.map(network => ({
      id: network.id,
      name: network.name,
      code: network.code,
      description: network.description || '',
      status: network.status || 'active',
      settings: network.settings || {},
      tradingPointsCount: network.tradingPoints ? network.tradingPoints.length : 0,
      created_at: network.createdAt || new Date().toISOString(),
      updated_at: network.updatedAt || new Date().toISOString()
    }));
    
    saveToJson('networks.json', networksData);
    
    // Экспорт торговых точек отдельно
    const allTradingPoints: any[] = [];
    networks.forEach(network => {
      if (network.tradingPoints) {
        network.tradingPoints.forEach(tp => {
          allTradingPoints.push({
            id: tp.id,
            network_id: network.id,
            name: tp.name,
            code: tp.code,
            address: tp.address || '',
            location: tp.location || {},
            type: tp.type || 'station',
            status: tp.status || 'active',
            settings: tp.settings || {},
            metadata: tp.metadata || {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        });
      }
    });
    
    saveToJson('trading_points.json', allTradingPoints);
    
    return { networks: networksData.length, tradingPoints: allTradingPoints.length };
  } catch (error) {
    console.error('❌ Failed to export networks:', error);
    return { networks: 0, tradingPoints: 0 };
  }
}

/**
 * Экспорт типов топлива
 */
async function exportFuelTypes() {
  try {
    console.log('⛽ Exporting fuel types...');
    const fuelTypes = await nomenclatureService.getFuelTypes();
    
    const fuelTypesData = fuelTypes.map(ft => ({
      id: ft.id,
      name: ft.name,
      code: ft.code,
      category: ft.category || 'other',
      octane_number: ft.octaneNumber || null,
      density: ft.density || null,
      unit: ft.unit || 'L',
      is_active: ft.isActive !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    saveToJson('fuel_types.json', fuelTypesData);
    return fuelTypesData.length;
  } catch (error) {
    console.error('❌ Failed to export fuel types:', error);
    return 0;
  }
}

/**
 * Экспорт пользователей (без паролей)
 */
async function exportUsers() {
  try {
    console.log('👥 Exporting users...');
    const users = await usersService.getUsers();
    
    const usersData = users.map(user => ({
      id: user.id,
      email: user.email,
      username: user.username,
      // Пароль НЕ экспортируем из соображений безопасности
      first_name: user.firstName || '',
      last_name: user.lastName || '',
      phone: user.phone || '',
      status: user.status || 'active',
      email_verified: user.emailVerified || false,
      last_login: user.lastLogin || null,
      settings: user.settings || {},
      metadata: user.metadata || {},
      roles: user.roles || [],
      networks: user.networks || [],
      trading_points: user.tradingPoints || [],
      created_at: user.createdAt || new Date().toISOString(),
      updated_at: user.updatedAt || new Date().toISOString()
    }));
    
    saveToJson('users.json', usersData);
    
    // Создаем отдельный файл с примерами паролей для разработки
    const defaultPasswords = users.map(user => ({
      username: user.username,
      email: user.email,
      defaultPassword: 'password123' // Все тестовые пароли одинаковые
    }));
    
    saveToJson('users_default_passwords.json', defaultPasswords);
    console.log('ℹ️  Default passwords saved for development use');
    
    return usersData.length;
  } catch (error) {
    console.error('❌ Failed to export users:', error);
    return 0;
  }
}

/**
 * Экспорт цен (базовые данные)
 */
async function exportPrices() {
  try {
    console.log('💰 Exporting prices...');
    
    // Получаем текущие цены
    const currentPrices = await pricesService.getCurrentPrices();
    
    const pricesData = currentPrices.map(price => ({
      id: price.id || `price_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      trading_point_id: price.tradingPointId,
      fuel_type_id: price.fuelTypeId || price.fuelCode,
      price_net: price.priceNet,
      vat_rate: price.vatRate || 20,
      price_gross: price.priceGross,
      source: 'migration',
      valid_from: new Date().toISOString(),
      valid_to: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    saveToJson('prices.json', pricesData);
    return pricesData.length;
  } catch (error) {
    console.error('❌ Failed to export prices:', error);
    return 0;
  }
}

/**
 * Экспорт операций (ограниченно - только последние 100)
 */
async function exportOperations() {
  try {
    console.log('🔄 Exporting operations (sample)...');
    
    // Импортируем operationsService динамически, так как он большой
    const { operationsService } = await import('../src/services/operationsService');
    const allOperations = await operationsService.getOperations();
    
    // Экспортируем только последние 100 операций для тестирования
    const sampleOperations = allOperations.slice(0, 100).map(op => ({
      id: op.id,
      trading_point_id: op.tradingPointId,
      operation_type: op.operationType,
      status: op.status,
      start_time: op.startTime,
      end_time: op.endTime,
      duration: op.duration,
      device_id: op.deviceId,
      details: op.details,
      metadata: op.metadata || {},
      created_at: op.startTime,
      updated_at: op.lastUpdated || op.startTime
    }));
    
    saveToJson('operations_sample.json', sampleOperations);
    
    // Экспорт связанных транзакций
    const transactions = allOperations
      .filter(op => op.transactionId && op.operationType === 'sale')
      .slice(0, 50)
      .map(op => ({
        id: op.transactionId,
        operation_id: op.id,
        transaction_number: op.transactionId,
        fuel_type_id: op.fuelType,
        quantity: op.quantity || 0,
        price_per_unit: op.price || 0,
        total_amount: op.totalCost || 0,
        payment_method: op.paymentMethod,
        customer_id: null,
        vehicle_number: op.vehicleNumber,
        created_at: op.startTime
      }));
    
    saveToJson('transactions_sample.json', transactions);
    
    console.log(`ℹ️  Exported sample data: ${sampleOperations.length} operations, ${transactions.length} transactions`);
    console.log(`ℹ️  Total operations in system: ${allOperations.length} (export limited for migration testing)`);
    
    return { operations: sampleOperations.length, transactions: transactions.length };
  } catch (error) {
    console.error('❌ Failed to export operations:', error);
    return { operations: 0, transactions: 0 };
  }
}

/**
 * Главная функция экспорта
 */
export async function exportAllMockData() {
  const startTime = Date.now();
  console.log('🚀 Starting mock data export...\n');
  
  try {
    const results = {
      networks: 0,
      tradingPoints: 0,
      fuelTypes: 0,
      users: 0,
      prices: 0,
      operations: 0,
      transactions: 0
    };
    
    // Экспорт сетей и торговых точек
    const networkResults = await exportNetworks();
    results.networks = networkResults.networks;
    results.tradingPoints = networkResults.tradingPoints;
    
    // Экспорт типов топлива
    results.fuelTypes = await exportFuelTypes();
    
    // Экспорт пользователей
    results.users = await exportUsers();
    
    // Экспорт цен
    results.prices = await exportPrices();
    
    // Экспорт операций (образец)
    const operationResults = await exportOperations();
    results.operations = operationResults.operations;
    results.transactions = operationResults.transactions;
    
    // Сводка
    console.log('\n📋 Export Summary:');
    console.log(`  Networks: ${results.networks}`);
    console.log(`  Trading Points: ${results.tradingPoints}`);
    console.log(`  Fuel Types: ${results.fuelTypes}`);
    console.log(`  Users: ${results.users}`);
    console.log(`  Prices: ${results.prices}`);
    console.log(`  Operations (sample): ${results.operations}`);
    console.log(`  Transactions (sample): ${results.transactions}`);
    
    // Сохраняем сводку
    saveToJson('export_summary.json', {
      exportDate: new Date().toISOString(),
      results,
      duration: Date.now() - startTime,
      status: 'completed'
    });
    
    console.log(`\n✅ Export completed successfully in ${Date.now() - startTime}ms`);
    console.log(`📁 All files saved to ./data/ directory`);
    
    return results;
  } catch (error) {
    console.error('\n❌ Export failed:', error);
    
    // Сохраняем информацию об ошибке
    saveToJson('export_error.json', {
      exportDate: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: Date.now() - startTime,
      status: 'failed'
    });
    
    throw error;
  }
}

// Запуск экспорта, если файл выполняется напрямую
if (require.main === module) {
  exportAllMockData()
    .then(() => {
      console.log('🎉 Mock data export completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Export failed:', error);
      process.exit(1);
    });
}