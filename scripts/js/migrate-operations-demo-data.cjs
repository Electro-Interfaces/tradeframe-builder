/**
 * Миграция демо-данных операций в Supabase
 * Загружает данные из realistic-operations-august-2025.json
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Список разрешенных способов оплаты (исключаем нежелательные)
const ALLOWED_PAYMENT_METHODS = ['cash', 'bank_card', 'fuel_card', 'online_order'];

async function migrateOperationsData() {
  try {
    console.log('🔄 Starting operations migration...');

    // 1. Очищаем существующие данные
    console.log('🗑️ Clearing existing operations...');
    const { error: deleteError } = await supabase
      .from('operations')
      .delete()
      .neq('id', ''); // Удаляем все записи

    if (deleteError) {
      console.warn('⚠️ Error clearing operations (may be empty):', deleteError.message);
    } else {
      console.log('✅ Existing operations cleared');
    }

    // 2. Загружаем данные из файла
    console.log('📁 Loading demo data from file...');
    let operations;
    
    if (fs.existsSync('./realistic-operations-august-2025.json')) {
      operations = JSON.parse(fs.readFileSync('./realistic-operations-august-2025.json', 'utf8'));
    } else if (fs.existsSync('./august-operations-data.json')) {
      const data = JSON.parse(fs.readFileSync('./august-operations-data.json', 'utf8'));
      operations = data.operations || data;
    } else if (fs.existsSync('./src/data/operationsDemoData.json')) {
      operations = JSON.parse(fs.readFileSync('./src/data/operationsDemoData.json', 'utf8'));
    } else {
      throw new Error('No operations demo data file found');
    }

    if (!Array.isArray(operations)) {
      throw new Error('Operations data is not an array');
    }

    console.log(`📊 Found ${operations.length} operations to migrate`);

    // 3. Преобразуем данные для Supabase
    console.log('🔄 Converting data format...');
    const supabaseOperations = operations
      .filter(op => {
        // Фильтруем операции с разрешенными способами оплаты
        if (op.paymentMethod && !ALLOWED_PAYMENT_METHODS.includes(op.paymentMethod)) {
          console.log(`⏭️ Skipping operation ${op.id} with payment method: ${op.paymentMethod}`);
          return false;
        }
        return true;
      })
      .slice(0, 100) // Берем только первые 100 операций для демо
      .map(op => ({
        id: op.id,
        operation_type: op.operationType,
        status: op.status,
        start_time: new Date(op.startTime).toISOString(),
        end_time: op.endTime ? new Date(op.endTime).toISOString() : null,
        duration: op.duration || null,
        trading_point_id: op.tradingPointId,
        trading_point_name: op.tradingPointName,
        device_id: op.deviceId,
        transaction_id: op.transactionId,
        fuel_type: op.fuelType,
        quantity: op.quantity || null,
        price: op.price || null,
        total_cost: op.totalCost || null,
        payment_method: op.paymentMethod || null,
        details: op.details || 'Демо операция',
        progress: op.progress || (op.status === 'completed' ? 100 : 0),
        operator_name: op.operatorName || 'Демо оператор',
        customer_id: op.customerId || null,
        vehicle_number: op.vehicleNumber || null,
        metadata: op.metadata || {},
        created_at: new Date(op.createdAt || op.startTime).toISOString(),
        updated_at: new Date(op.updatedAt || op.endTime || op.startTime).toISOString()
      }));

    console.log(`✅ Converted ${supabaseOperations.length} operations for insertion`);

    // 4. Вставляем данные батчами
    const batchSize = 20;
    let inserted = 0;

    for (let i = 0; i < supabaseOperations.length; i += batchSize) {
      const batch = supabaseOperations.slice(i, i + batchSize);
      
      console.log(`📤 Inserting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(supabaseOperations.length/batchSize)} (${batch.length} operations)`);
      
      const { data, error } = await supabase
        .from('operations')
        .insert(batch);

      if (error) {
        console.error(`❌ Error inserting batch at index ${i}:`, error);
        console.error('📋 Problematic data sample:', JSON.stringify(batch[0], null, 2));
        
        // Попробуем вставить по одной записи, чтобы найти проблемную
        for (let j = 0; j < batch.length; j++) {
          try {
            const { error: singleError } = await supabase
              .from('operations')
              .insert([batch[j]]);
              
            if (singleError) {
              console.error(`❌ Failed to insert operation ${batch[j].id}:`, singleError.message);
            } else {
              inserted++;
              console.log(`✅ Inserted operation ${batch[j].id}`);
            }
          } catch (singleInsertError) {
            console.error(`❌ Exception inserting operation ${batch[j].id}:`, singleInsertError.message);
          }
        }
      } else {
        inserted += batch.length;
        console.log(`✅ Batch inserted successfully`);
      }
    }

    // 5. Проверяем результат
    console.log('🔍 Verifying insertion...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('operations')
      .select('id, operation_type, status, trading_point_name, fuel_type')
      .limit(10);

    if (verifyError) {
      console.error('❌ Error verifying data:', verifyError);
    } else {
      console.log('✅ Sample of inserted operations:');
      verifyData.forEach(op => {
        console.log(`  - ${op.id}: ${op.operation_type} (${op.status}) - ${op.fuel_type} at ${op.trading_point_name}`);
      });
    }

    // 6. Финальная статистика
    const { data: countData, error: countError } = await supabase
      .from('operations')
      .select('*', { count: 'exact', head: true });

    if (!countError && countData) {
      console.log(`🎉 Migration completed! Total operations in database: ${countData.length || 'unknown'}`);
    }

    console.log(`📊 Successfully migrated ${inserted} operations`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Запуск миграции
if (require.main === module) {
  migrateOperationsData()
    .then(() => {
      console.log('🏁 Migration script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateOperationsData };