/**
 * Импорт экспортированных данных в Supabase
 * Для АГЕНТА 2: Бизнес-логика
 */

import fs from 'fs';
import path from 'path';
import { supabase } from '../src/api/database/supabase';
import { JWTService } from '../src/api/auth/jwt';

interface ImportStats {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

/**
 * Читает JSON файл из директории data
 */
function readJsonFile<T>(filename: string): T | null {
  const filePath = path.join(process.cwd(), 'data', filename);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filename}`);
      return null;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`❌ Failed to read ${filename}:`, error);
    return null;
  }
}

/**
 * Импорт сетей
 */
async function importNetworks(): Promise<ImportStats> {
  console.log('📊 Importing networks...');
  
  const networks = readJsonFile<any[]>('networks.json');
  if (!networks) {
    return { total: 0, success: 0, failed: 0, errors: ['Networks file not found'] };
  }
  
  const stats: ImportStats = {
    total: networks.length,
    success: 0,
    failed: 0,
    errors: []
  };
  
  for (const network of networks) {
    try {
      const { data, error } = await supabase
        .from('networks')
        .upsert({
          id: network.id,
          name: network.name,
          code: network.code,
          description: network.description,
          status: network.status,
          settings: network.settings,
          created_at: network.created_at,
          updated_at: network.updated_at
        })
        .select();
      
      if (error) {
        throw error;
      }
      
      stats.success++;
      console.log(`  ✅ Network imported: ${network.name}`);
    } catch (error: any) {
      stats.failed++;
      const errorMsg = `Network ${network.name}: ${error.message}`;
      stats.errors.push(errorMsg);
      console.error(`  ❌ ${errorMsg}`);
    }
  }
  
  return stats;
}

/**
 * Импорт торговых точек
 */
async function importTradingPoints(): Promise<ImportStats> {
  console.log('🏪 Importing trading points...');
  
  const tradingPoints = readJsonFile<any[]>('trading_points.json');
  if (!tradingPoints) {
    return { total: 0, success: 0, failed: 0, errors: ['Trading points file not found'] };
  }
  
  const stats: ImportStats = {
    total: tradingPoints.length,
    success: 0,
    failed: 0,
    errors: []
  };
  
  for (const tp of tradingPoints) {
    try {
      const { data, error } = await supabase
        .from('trading_points')
        .upsert({
          id: tp.id,
          network_id: tp.network_id,
          name: tp.name,
          code: tp.code,
          address: tp.address,
          location: tp.location,
          type: tp.type,
          status: tp.status,
          settings: tp.settings,
          metadata: tp.metadata,
          created_at: tp.created_at,
          updated_at: tp.updated_at
        })
        .select();
      
      if (error) {
        throw error;
      }
      
      stats.success++;
      console.log(`  ✅ Trading point imported: ${tp.name}`);
    } catch (error: any) {
      stats.failed++;
      const errorMsg = `Trading point ${tp.name}: ${error.message}`;
      stats.errors.push(errorMsg);
      console.error(`  ❌ ${errorMsg}`);
    }
  }
  
  return stats;
}

/**
 * Импорт типов топлива
 */
async function importFuelTypes(): Promise<ImportStats> {
  console.log('⛽ Importing fuel types...');
  
  const fuelTypes = readJsonFile<any[]>('fuel_types.json');
  if (!fuelTypes) {
    return { total: 0, success: 0, failed: 0, errors: ['Fuel types file not found'] };
  }
  
  const stats: ImportStats = {
    total: fuelTypes.length,
    success: 0,
    failed: 0,
    errors: []
  };
  
  for (const ft of fuelTypes) {
    try {
      const { data, error } = await supabase
        .from('fuel_types')
        .upsert({
          id: ft.id,
          name: ft.name,
          code: ft.code,
          category: ft.category,
          octane_number: ft.octane_number,
          density: ft.density,
          unit: ft.unit,
          is_active: ft.is_active,
          created_at: ft.created_at,
          updated_at: ft.updated_at
        })
        .select();
      
      if (error) {
        throw error;
      }
      
      stats.success++;
      console.log(`  ✅ Fuel type imported: ${ft.name} (${ft.code})`);
    } catch (error: any) {
      stats.failed++;
      const errorMsg = `Fuel type ${ft.name}: ${error.message}`;
      stats.errors.push(errorMsg);
      console.error(`  ❌ ${errorMsg}`);
    }
  }
  
  return stats;
}

/**
 * Импорт пользователей
 */
async function importUsers(): Promise<ImportStats> {
  console.log('👥 Importing users...');
  
  const users = readJsonFile<any[]>('users.json');
  const passwords = readJsonFile<any[]>('users_default_passwords.json');
  
  if (!users) {
    return { total: 0, success: 0, failed: 0, errors: ['Users file not found'] };
  }
  
  const stats: ImportStats = {
    total: users.length,
    success: 0,
    failed: 0,
    errors: []
  };
  
  // Создаем мапу паролей по умолчанию
  const passwordMap = new Map();
  if (passwords) {
    passwords.forEach(p => {
      passwordMap.set(p.username, p.defaultPassword);
    });
  }
  
  for (const user of users) {
    try {
      // Хешируем пароль по умолчанию
      const defaultPassword = passwordMap.get(user.username) || 'password123';
      const hashedPassword = await JWTService.hashPassword(defaultPassword);
      
      const { data, error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          username: user.username,
          password_hash: hashedPassword,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          status: user.status,
          email_verified: user.email_verified,
          last_login: user.last_login,
          settings: user.settings,
          metadata: {
            ...user.metadata,
            migratedRoles: user.roles,
            migratedNetworks: user.networks,
            migratedTradingPoints: user.trading_points,
            migrationSource: 'mock_data'
          },
          created_at: user.created_at,
          updated_at: user.updated_at
        })
        .select();
      
      if (error) {
        throw error;
      }
      
      stats.success++;
      console.log(`  ✅ User imported: ${user.username} (${user.email})`);
    } catch (error: any) {
      stats.failed++;
      const errorMsg = `User ${user.username}: ${error.message}`;
      stats.errors.push(errorMsg);
      console.error(`  ❌ ${errorMsg}`);
    }
  }
  
  // Создаем информационное сообщение о паролях
  console.log(`ℹ️  All imported users have default password: password123`);
  console.log(`ℹ️  Please change passwords after first login`);
  
  return stats;
}

/**
 * Импорт цен
 */
async function importPrices(): Promise<ImportStats> {
  console.log('💰 Importing prices...');
  
  const prices = readJsonFile<any[]>('prices.json');
  if (!prices) {
    return { total: 0, success: 0, failed: 0, errors: ['Prices file not found'] };
  }
  
  const stats: ImportStats = {
    total: prices.length,
    success: 0,
    failed: 0,
    errors: []
  };
  
  for (const price of prices) {
    try {
      const { data, error } = await supabase
        .from('prices')
        .upsert({
          id: price.id,
          trading_point_id: price.trading_point_id,
          fuel_type_id: price.fuel_type_id,
          price_net: price.price_net,
          vat_rate: price.vat_rate,
          price_gross: price.price_gross,
          source: price.source,
          valid_from: price.valid_from,
          valid_to: price.valid_to,
          created_at: price.created_at,
          updated_at: price.updated_at
        })
        .select();
      
      if (error) {
        throw error;
      }
      
      stats.success++;
      console.log(`  ✅ Price imported for trading point: ${price.trading_point_id}`);
    } catch (error: any) {
      stats.failed++;
      const errorMsg = `Price ${price.id}: ${error.message}`;
      stats.errors.push(errorMsg);
      console.error(`  ❌ ${errorMsg}`);
    }
  }
  
  return stats;
}

/**
 * Импорт операций (образцы)
 */
async function importOperations(): Promise<{ operations: ImportStats; transactions: ImportStats }> {
  console.log('🔄 Importing operations...');
  
  const operations = readJsonFile<any[]>('operations_sample.json');
  const transactions = readJsonFile<any[]>('transactions_sample.json');
  
  const operationsStats: ImportStats = {
    total: operations?.length || 0,
    success: 0,
    failed: 0,
    errors: []
  };
  
  const transactionsStats: ImportStats = {
    total: transactions?.length || 0,
    success: 0,
    failed: 0,
    errors: []
  };
  
  // Импорт операций
  if (operations) {
    for (const op of operations) {
      try {
        const { data, error } = await supabase
          .from('operations')
          .upsert({
            id: op.id,
            trading_point_id: op.trading_point_id,
            operation_type: op.operation_type,
            status: op.status,
            start_time: op.start_time,
            end_time: op.end_time,
            duration: op.duration,
            device_id: op.device_id,
            details: op.details,
            metadata: op.metadata,
            created_at: op.created_at,
            updated_at: op.updated_at
          })
          .select();
        
        if (error) {
          throw error;
        }
        
        operationsStats.success++;
        console.log(`  ✅ Operation imported: ${op.id}`);
      } catch (error: any) {
        operationsStats.failed++;
        const errorMsg = `Operation ${op.id}: ${error.message}`;
        operationsStats.errors.push(errorMsg);
        console.error(`  ❌ ${errorMsg}`);
      }
    }
  }
  
  // Импорт транзакций
  if (transactions) {
    for (const tx of transactions) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .upsert({
            id: tx.id,
            operation_id: tx.operation_id,
            transaction_number: tx.transaction_number,
            fuel_type_id: tx.fuel_type_id,
            quantity: tx.quantity,
            price_per_unit: tx.price_per_unit,
            total_amount: tx.total_amount,
            payment_method: tx.payment_method,
            customer_id: tx.customer_id,
            vehicle_number: tx.vehicle_number,
            created_at: tx.created_at
          })
          .select();
        
        if (error) {
          throw error;
        }
        
        transactionsStats.success++;
        console.log(`  ✅ Transaction imported: ${tx.transaction_number}`);
      } catch (error: any) {
        transactionsStats.failed++;
        const errorMsg = `Transaction ${tx.transaction_number}: ${error.message}`;
        transactionsStats.errors.push(errorMsg);
        console.error(`  ❌ ${errorMsg}`);
      }
    }
  }
  
  return { operations: operationsStats, transactions: transactionsStats };
}

/**
 * Проверка подключения к БД перед импортом
 */
async function checkDatabaseConnection(): Promise<boolean> {
  try {
    console.log('🔍 Checking database connection...');
    
    const { data, error } = await supabase
      .from('networks')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error);
    return false;
  }
}

/**
 * Главная функция импорта
 */
export async function importAllDataToSupabase() {
  const startTime = Date.now();
  console.log('🚀 Starting data import to Supabase...\n');
  
  try {
    // Проверяем подключение к БД
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection failed. Please check your Supabase configuration.');
    }
    
    const allStats: Record<string, ImportStats> = {};
    
    // Импорт в правильном порядке (с учетом зависимостей)
    console.log('\n=== Phase 1: Master Data ===');
    allStats.networks = await importNetworks();
    allStats.fuelTypes = await importFuelTypes();
    
    console.log('\n=== Phase 2: Dependent Data ===');
    allStats.tradingPoints = await importTradingPoints();
    allStats.users = await importUsers();
    
    console.log('\n=== Phase 3: Business Data ===');
    allStats.prices = await importPrices();
    
    console.log('\n=== Phase 4: Operational Data ===');
    const operationResults = await importOperations();
    allStats.operations = operationResults.operations;
    allStats.transactions = operationResults.transactions;
    
    // Подсчет общей статистики
    const totalStats = Object.values(allStats).reduce(
      (acc, stats) => ({
        total: acc.total + stats.total,
        success: acc.success + stats.success,
        failed: acc.failed + stats.failed,
        errors: [...acc.errors, ...stats.errors]
      }),
      { total: 0, success: 0, failed: 0, errors: [] as string[] }
    );
    
    // Выводим итоговую статистику
    console.log('\n📋 Import Summary:');
    console.log(`  Networks: ${allStats.networks.success}/${allStats.networks.total}`);
    console.log(`  Trading Points: ${allStats.tradingPoints.success}/${allStats.tradingPoints.total}`);
    console.log(`  Fuel Types: ${allStats.fuelTypes.success}/${allStats.fuelTypes.total}`);
    console.log(`  Users: ${allStats.users.success}/${allStats.users.total}`);
    console.log(`  Prices: ${allStats.prices.success}/${allStats.prices.total}`);
    console.log(`  Operations: ${allStats.operations.success}/${allStats.operations.total}`);
    console.log(`  Transactions: ${allStats.transactions.success}/${allStats.transactions.total}`);
    
    console.log(`\n📊 Total: ${totalStats.success}/${totalStats.total} records imported successfully`);
    
    if (totalStats.failed > 0) {
      console.log(`⚠️  ${totalStats.failed} records failed to import`);
      console.log('Errors:');
      totalStats.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    // Сохраняем результат импорта
    const importResult = {
      importDate: new Date().toISOString(),
      duration: Date.now() - startTime,
      totalRecords: totalStats.total,
      successfulRecords: totalStats.success,
      failedRecords: totalStats.failed,
      detailedStats: allStats,
      errors: totalStats.errors,
      status: totalStats.failed === 0 ? 'completed' : 'completed_with_errors'
    };
    
    const resultsPath = path.join(process.cwd(), 'data', 'import_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(importResult, null, 2));
    
    console.log(`\n✅ Import completed in ${Date.now() - startTime}ms`);
    console.log(`📁 Results saved to: ${resultsPath}`);
    
    if (totalStats.success > 0) {
      console.log('\n🎉 Data is ready for testing in Supabase!');
      console.log('💡 You can now switch your frontend to use the real API');
    }
    
    return importResult;
  } catch (error) {
    const errorResult = {
      importDate: new Date().toISOString(),
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      status: 'failed'
    };
    
    const errorPath = path.join(process.cwd(), 'data', 'import_error.json');
    fs.writeFileSync(errorPath, JSON.stringify(errorResult, null, 2));
    
    console.error('\n💥 Import failed:', error);
    console.log(`📁 Error details saved to: ${errorPath}`);
    
    throw error;
  }
}

// Запуск импорта, если файл выполняется напрямую
if (require.main === module) {
  importAllDataToSupabase()
    .then(() => {
      console.log('🎉 Data import to Supabase completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Import failed:', error);
      process.exit(1);
    });
}