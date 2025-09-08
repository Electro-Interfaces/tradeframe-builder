/**
 * Trading Transactions Sync Service
 * Сервис синхронизации транзакций между торговым API и приложением
 * 
 * ОБНОВЛЕН для работы с сетью 15:
 * - Динамическое получение торговых точек сети 15 из Supabase
 * - Использование реальной конфигурации из раздела "Обмен данными"
 * - Последовательная загрузка транзакций по всем точкам сети
 * - Правильный маппинг данных из API в формат operations
 */

import { supabaseClientBrowser } from './supabaseClientBrowser';
import { tradingNetworkConfigService } from './tradingNetworkConfigService';
import { operationsSupabaseService } from './operationsSupabaseService';
import { tradingNetworkAPI, newTradingNetworkAPI } from './tradingNetworkAPI';
import { Operation, OperationType, OperationStatus, PaymentMethod } from './operationsTypes';
import { httpClient } from './universalHttpClient';

// Интерфейс транзакции из торгового API
interface TradingTransaction {
  id: string;
  station_id: number;
  pos_id?: string;
  shift_id?: string;
  transaction_type: string;
  fuel_type: string;
  amount: number; // Сумма в рублях
  quantity: number; // Количество в литрах
  price_per_liter: number; // Цена за литр
  payment_method: string;
  timestamp: string;
  status: string;
  operator_id?: string;
  customer_info?: any;
  receipt_number?: string;
  [key: string]: any; // Для дополнительных полей
}

// Маппинг типов операций
const TRANSACTION_TYPE_MAPPING: Record<string, OperationType> = {
  'sale': 'sale',
  'refund': 'refund',
  'correction': 'correction',
  'fuel_sale': 'sale',
  'fuel_refund': 'refund',
  'maintenance': 'maintenance',
  'calibration': 'sensor_calibration',
  'diagnostics': 'diagnostics'
};

// Маппинг статусов
const STATUS_MAPPING: Record<string, OperationStatus> = {
  'completed': 'completed',
  'success': 'completed',
  'failed': 'failed',
  'error': 'failed',
  'pending': 'pending',
  'in_progress': 'in_progress',
  'cancelled': 'cancelled',
  'refunded': 'completed'
};

// Маппинг способов оплаты
const PAYMENT_METHOD_MAPPING: Record<string, PaymentMethod> = {
  'cash': 'cash',
  'card': 'bank_card',
  'bank_card': 'bank_card',
  'fuel_card': 'fuel_card',
  'online': 'online_order',
  'online_order': 'online_order'
};

// Кэш для маппинга external_id -> UUID торговых точек
let stationMappingCache: Record<string, {id: string, name: string}> = {};
let mappingCacheExpiry = 0;

/**
 * Получить маппинг станций из базы данных
 * Использует external_id торговых точек для соответствия с номерами станций из API
 */
async function getStationMappingFromDatabase(): Promise<Record<string, {id: string, name: string}>> {
  // Проверяем кэш (действует 5 минут)
  if (Date.now() < mappingCacheExpiry && Object.keys(stationMappingCache).length > 0) {
    return stationMappingCache;
  }

  try {
    console.log('🔄 Загружаем маппинг станций из базы данных...');
    
    // Используем универсальный HTTP клиент для получения торговых точек
    const response = await httpClient.get('/rest/v1/trading_points', {
      destination: 'supabase',
      queryParams: {
        select: 'id,name,external_id'
      }
    });
    
    if (!response.success || !response.data) {
      console.error('❌ Не удалось загрузить торговые точки для маппинга');
      return stationMappingCache; // Возвращаем старый кэш
    }
    
    const tradingPoints = response.data;
    
    const mapping: Record<string, {id: string, name: string}> = {};
    tradingPoints?.forEach(tp => {
      if (tp.external_id) {
        mapping[tp.external_id] = {
          id: tp.id,
          name: tp.name
        };
      }
    });
    
    // Добавляем статический маппинг для станции 4 (АЗС №004 - Московское шоссе)
    mapping['4'] = {
      id: '6969b08d-1cbe-45c2-ae9c-8002c7022b59',
      name: 'АЗС №004 - Московское шоссе'
    };
    
    stationMappingCache = mapping;
    mappingCacheExpiry = Date.now() + (5 * 60 * 1000); // 5 минут
    
    console.log('✅ Загружено маппинг станций:', Object.keys(mapping).length, 'станций');
    console.log('🔍 Маппинг:', mapping);
    
    return mapping;
  } catch (error) {
    console.error('💥 Критическая ошибка загрузки маппинга станций:', error);
    return stationMappingCache;
  }
}

/**
 * Получить UUID торговой точки по номеру станции
 */
async function getTradingPointByStationNumber(stationNumber: number): Promise<{id: string, name: string} | null> {
  const mapping = await getStationMappingFromDatabase();
  const stationKey = stationNumber.toString();
  
  if (mapping[stationKey]) {
    return mapping[stationKey];
  }
  
  console.warn(`⚠️ Не найден маппинг для станции ${stationNumber}`);
  return null;
}

export interface SyncResult {
  success: boolean;
  syncedTransactions: number;
  skippedTransactions: number;
  errors: string[];
  lastSyncTime: string;
  totalFromAPI?: number; // Общее количество транзакций получено с API
}

export interface SyncOptions {
  systemId?: number;
  stationNumber?: number;
  startDate?: string;
  endDate?: string;
  forceSync?: boolean; // Пересинхронизировать даже существующие
}

class TradingTransactionsSyncService {
  private isRunning = false;
  private lastSyncTime?: string;

  /**
   * Основной метод синхронизации транзакций
   */
  async syncTransactions(options: SyncOptions = {}): Promise<SyncResult> {
    console.log('🚀🚀🚀 [SYNC-ENTRY] syncTransactions функция вызвана!', options);
    console.log('🚀🚀🚀 [SYNC-ENTRY] this.isRunning:', this.isRunning);
    
    if (this.isRunning) {
      console.log('⚠️ [SYNC-ENTRY] Синхронизация уже выполняется, выбрасываем ошибку');
      throw new Error('Синхронизация уже выполняется');
    }

    this.isRunning = true;
    const startTime = new Date().toISOString();
    
    // 🚀 АВТОМАТИЧЕСКАЯ ФИЛЬТРАЦИЯ: Если не указаны даты - устанавливаем последние 7 дней
    if (!options.startDate && !options.endDate) {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      
      options.endDate = now.toISOString();
      options.startDate = sevenDaysAgo.toISOString();
      
      console.log('📅 [SYNC] Автоматически установлены даты фильтрации (последние 7 дней):', {
        startDate: options.startDate,
        endDate: options.endDate
      });
    }
    
    console.log('🔄 [SYNC] Начало синхронизации транзакций с торговым API');
    console.log('🔄 [SYNC] Параметры:', options);

    const result: SyncResult = {
      success: false,
      syncedTransactions: 0,
      skippedTransactions: 0,
      errors: [],
      lastSyncTime: startTime
    };

    try {
      // 1. Получаем транзакции из торгового API
      console.log('📥 [SYNC] Получение транзакций из торгового API...');
      console.log('🔧 [SYNC] Вызываем newTradingNetworkAPI.getOperations с параметрами:', {
        systemId: (options.systemId || 15).toString(),
        stationNumber: options.stationNumber?.toString() || '4',
        startDate: options.startDate,
        endDate: options.endDate
      });
      
      const transactions = await newTradingNetworkAPI.getOperations(
        (options.systemId || 15).toString(),
        options.stationNumber?.toString() || '4',
        {
          startDate: options.startDate,
          endDate: options.endDate
        }
      );

      console.log(`📥 [SYNC] Получено ${transactions.length} транзакций из торгового API`);
      
      // 🚀 УВЕЛИЧЕННЫЙ ЛИМИТ: обрабатываем больше транзакций за раз для показа всех новых данных
      const MAX_TRANSACTIONS_PER_BATCH = 500; // Увеличено с 100 до 500
      
      console.log(`📊 [SYNC] Получено ${transactions.length} транзакций из API. Будем обрабатывать пакетами по ${MAX_TRANSACTIONS_PER_BATCH}`);
      
      // Если транзакций больше лимита - обрабатываем пакетами
      const allTransactions = transactions; // Сохраняем все транзакции
      let processedCount = 0;

      if (allTransactions.length === 0) {
        console.log('ℹ️ [SYNC] Нет новых транзакций для синхронизации');
        result.success = true;
        return result;
      }

      // 2. Получаем существующие операции для дедупликации (только один раз)
      console.log('🔄 [SYNC] Получение существующих операций для дедупликации...');
      const existingOperationIds = new Set<string>();

      if (!options.forceSync) {
        try {
          // Получаем операции только для нужной торговой точки, если указана станция
          const filters: any = {};
          if (options.stationNumber) {
            const stationTradingPointId = STATION_TO_TRADING_POINT_MAPPING[options.stationNumber];
            if (stationTradingPointId) {
              filters.tradingPointId = stationTradingPointId;
            }
          }
          
          const existingOperations = await operationsSupabaseService.getOperations(filters);
          existingOperations.forEach(op => {
            // Используем transaction_id как ключ для дедупликации
            if (op.transactionId) {
              existingOperationIds.add(op.transactionId.toString());
            }
          });
          console.log(`📋 [SYNC] Найдено ${existingOperationIds.size} существующих операций с transactionId`);
        } catch (error) {
          console.warn('⚠️ [SYNC] Не удалось получить существующие операции:', error);
        }
      }

      // 3. 🚀 ПАКЕТНАЯ ОБРАБОТКА ВСЕХ ТРАНЗАКЦИЙ
      console.log(`🔄 [SYNC] Начинаем пакетную обработку ${allTransactions.length} транзакций пакетами по ${MAX_TRANSACTIONS_PER_BATCH}`);
      
      for (let i = 0; i < allTransactions.length; i += MAX_TRANSACTIONS_PER_BATCH) {
        const batch = allTransactions.slice(i, i + MAX_TRANSACTIONS_PER_BATCH);
        console.log(`📦 [SYNC] Обрабатываем пакет ${Math.floor(i / MAX_TRANSACTIONS_PER_BATCH) + 1}: транзакции ${i + 1}-${Math.min(i + MAX_TRANSACTIONS_PER_BATCH, allTransactions.length)} из ${allTransactions.length}`);
        
        // Преобразуем транзакции пакета в операции
        const batchOperations: Operation[] = [];
        
        for (const transaction of batch) {
          try {
            // Получаем ID транзакции с учетом альтернативных полей
            const transactionId = transaction.id || transaction.transaction_id || transaction.trans_id;
            
            // Проверяем, не существует ли уже операция с таким transaction_id
            if (!options.forceSync && transactionId && existingOperationIds.has(transactionId.toString())) {
              result.skippedTransactions++;
              continue;
            }

            const operation = await this.transformTransactionToOperation(transaction, options.stationNumber);
            if (operation) {
              batchOperations.push(operation);
              // Добавляем в Set чтобы избежать дубликатов в следующих пакетах
              if (operation.transactionId) {
                existingOperationIds.add(operation.transactionId);
              }
            }
          } catch (error) {
            const errorMsg = `Ошибка преобразования транзакции ${transaction.id}: ${error.message}`;
            result.errors.push(errorMsg);
            console.error('❌ [SYNC]', errorMsg);
          }
        }
        
        // 4. Сохраняем пакет операций в Supabase
        if (batchOperations.length > 0) {
          console.log(`💾 [SYNC] Пакетное сохранение ${batchOperations.length} операций в базу данных...`);
          
          try {
            // Пакетная вставка через Supabase (используем правильную схему базы данных)
            const { data, error } = await supabaseClientBrowser
              .from('operations')
              .upsert(batchOperations.map(op => ({
                id: op.id,
                operation_type: op.operationType,
                status: op.status,
                start_time: op.startTime,
                end_time: op.endTime,
                duration: op.duration,
                trading_point_id: op.tradingPointId,
                trading_point_name: op.tradingPointName,
                device_id: op.deviceId,
                transaction_id: op.transactionId, // Важно для дедупликации
                fuel_type: op.fuelType,
                quantity: op.quantity,
                price: op.price,
                total_cost: op.totalCost,
                payment_method: op.paymentMethod,
                details: op.details,
                progress: op.progress,
                operator_name: op.operatorName,
                customer_id: op.customerId,
                vehicle_number: op.vehicleNumber,
                metadata: op.metadata,
                created_at: op.createdAt,
                updated_at: op.updatedAt
              })), {
                onConflict: 'id',
                ignoreDuplicates: false
              })
              .select();

            if (error) {
              throw error;
            }

            result.syncedTransactions += batchOperations.length;
            processedCount += batchOperations.length;
            console.log(`✅ [SYNC] Пакет сохранен: ${batchOperations.length} операций. Всего обработано: ${processedCount}/${allTransactions.length}`);
            
          } catch (error) {
            const errorMsg = `Ошибка пакетного сохранения пакета: ${error.message}`;
            result.errors.push(errorMsg);
            console.error('❌ [SYNC]', errorMsg, error);
            
            // Если пакетное сохранение не удалось, попробуем по одной (для всех операций)
            console.log(`🔄 [SYNC] Попытка сохранения по одной операции для пакета (${batchOperations.length} операций)...`);
            for (const operation of batchOperations) { // ИСПРАВЛЕНО: убрано ограничение .slice(0, 10)
              try {
                await operationsSupabaseService.createOperation(operation);
                result.syncedTransactions++;
                processedCount++;
              } catch (singleError) {
                const singleErrorMsg = `Ошибка сохранения операции ${operation.id}: ${singleError.message}`;
                result.errors.push(singleErrorMsg);
                console.error('❌ [SYNC]', singleErrorMsg);
              }
            }
          }
        }
        
        // Небольшая пауза между пакетами для снижения нагрузки на базу данных
        if (i + MAX_TRANSACTIONS_PER_BATCH < allTransactions.length) {
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms пауза
        }
      }

      // 5. Обновляем время последней синхронизации и финальная статистика
      this.lastSyncTime = startTime;
      result.success = result.errors.length === 0 || result.syncedTransactions > 0;
      result.totalFromAPI = allTransactions.length; // Добавляем количество полученных транзакций

      console.log('✅ [SYNC] Пакетная синхронизация завершена:', {
        totalFromAPI: allTransactions.length,
        processedTransactions: processedCount,
        existingInDB: existingOperationIds.size - processedCount, // Исходное количество без новых
        synced: result.syncedTransactions,
        skipped: result.skippedTransactions,
        errors: result.errors.length,
        batchSize: MAX_TRANSACTIONS_PER_BATCH,
        forceSync: options.forceSync || false
      });

    } catch (error) {
      const errorMsg = `Критическая ошибка синхронизации: ${error.message}`;
      result.errors.push(errorMsg);
      console.error('❌ [SYNC]', errorMsg);
    } finally {
      this.isRunning = false;
    }

    return result;
  }

  /**
   * Преобразование транзакции торгового API в операцию приложения
   */
  private async transformTransactionToOperation(transaction: TradingTransaction, requestedStationId?: number): Promise<Operation | null> {
    try {
      // Проверяем наличие обязательных полей
      if (!transaction || !transaction.id) {
        console.warn('⚠️ [SYNC] Пропускаем транзакцию без ID:', transaction);
        return null;
      }

      // Определяем торговую точку динамически из базы данных
      // ИСПРАВЛЕНО: используем requestedStationId из параметра запроса, а не transaction.station_id
      const stationId = requestedStationId || transaction.station_id || 0;
      const tradingPointInfo = await getTradingPointByStationNumber(stationId);
      
      if (!tradingPointInfo) {
        console.warn(`⚠️ [SYNC] Пропускаем транзакцию - не найдена торговая точка для станции ${stationId}`);
        return null;
      }
      
      const tradingPointId = tradingPointInfo.id;
      const tradingPointName = tradingPointInfo.name;
      
      console.log(`🏪 [SYNC] Маппинг станции: requested=${requestedStationId}, transaction.station_id=${transaction.station_id}, final=${stationId} -> ${tradingPointId}`);

      // Мапим типы и статусы
      const operationType = TRANSACTION_TYPE_MAPPING[transaction.transaction_type] || 'sale';
      const status = STATUS_MAPPING[transaction.status] || 'completed';
      
      // Исправленный маппинг способа оплаты из объекта pay_type
      let paymentMethod: PaymentMethod = 'cash';
      if (transaction.pay_type?.name) {
        const payTypeName = transaction.pay_type.name.toLowerCase();
        if (payTypeName.includes('наличные')) {
          paymentMethod = 'cash';
        } else if (payTypeName.includes('сбербанк') || payTypeName.includes('карт')) {
          paymentMethod = 'bank_card';
        } else if (payTypeName.includes('мобил') || payTypeName.includes('топлив')) {
          paymentMethod = 'fuel_card';
        } else {
          paymentMethod = 'bank_card'; // по умолчанию для банковских систем
        }
      }

      // Создаем уникальный ID операции
      const operationId = `op_${transaction.id}_${Date.now()}`;

      // ОТЛАДКА: проверяем что приходит от API  
      console.log('🔍 ОТЛАДКА RAW transaction от API:', JSON.stringify(transaction, null, 2));
      console.log('🔍 ОТЛАДКА ключи transaction:', Object.keys(transaction));
      console.log('🔍 ОТЛАДКА конкретные поля:', {
        id: transaction.id,
        timestamp: transaction.timestamp,
        fuel_type: transaction.fuel_type,
        quantity: transaction.quantity,
        amount: transaction.amount,
        price_per_liter: transaction.price_per_liter,
        station_id: transaction.station_id
      });

      // Исправленный маппинг полей на основе реальных данных от API
      let startTime = transaction.dt || transaction.timestamp || transaction.date || transaction.datetime || transaction.created_at || transaction.transaction_date;
      
      // Обеспечиваем корректный формат времени (добавляем часовой пояс если отсутствует)
      if (startTime && typeof startTime === 'string') {
        // Если время не содержит информацию о часовом поясе, добавляем +03:00 (Москва)
        if (!startTime.includes('Z') && !startTime.includes('+') && !startTime.includes('-', 10)) {
          startTime = startTime + '+03:00';
        }
      }
      // ВАЖНО: используем строковое название топлива (fuel_name), а НЕ числовой код (fuel)
      const fuelType = transaction.fuel_name || transaction.fuel_type || transaction.product_name || transaction.product_type;
      
      // Преобразуем строковые значения в числа
      const quantity = parseFloat(transaction.quantity || transaction.volume || transaction.liters || '0');
      const price = parseFloat(transaction.price || transaction.price_per_liter || transaction.unit_price || transaction.liter_price || '0');
      const totalCost = parseFloat(transaction.cost || transaction.amount || transaction.sum || transaction.total || transaction.total_amount || '0');

      const operation: Operation = {
        id: operationId,
        operationType,
        status,
        startTime: startTime,
        endTime: status === 'completed' ? startTime : undefined,
        duration: status === 'completed' ? 2 : undefined, // Условная длительность
        tradingPointId,
        tradingPointName,
        deviceId: transaction.pos_id || transaction.terminal_id || transaction.device_id || `POS-${stationId}`,
        transactionId: (transaction.id || transaction.transaction_id || transaction.trans_id)?.toString(), // Важно для дедупликации - приводим к строке
        fuelType: fuelType,
        quantity: quantity,
        price: price,
        totalCost: totalCost,
        paymentMethod,
        details: `Импорт из торгового API. Чек: ${transaction.receipt_number || 'N/A'}`,
        progress: status === 'completed' ? 100 : status === 'in_progress' ? 50 : 0,
        lastUpdated: new Date().toISOString(),
        operatorName: transaction.operator_id || 'Оператор',
        customerId: transaction.customer_info?.id || undefined,
        vehicleNumber: transaction.customer_info?.vehicle_number || undefined,
        metadata: {
          source: 'trading_api_sync',
          shift_id: transaction.shift_id,
          receipt_number: transaction.receipt_number,
          original_transaction: transaction
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // ОТЛАДКА: показываем какие поля были найдены и преобразованы
      console.log('🔍 ОТЛАДКА найденные поля (ПОСЛЕ ПРЕОБРАЗОВАНИЯ):', {
        startTime: { original: transaction.dt, converted: startTime },
        fuelType: { original: transaction.fuel_name, number_fuel: transaction.fuel, converted: fuelType },
        quantity: { original: transaction.quantity, converted: quantity, type: typeof quantity },
        price: { original: transaction.price, converted: price, type: typeof price },
        totalCost: { original: transaction.cost, converted: totalCost, type: typeof totalCost }
      });

      // ОТЛАДКА: показываем созданную операцию
      console.log('🔍 ОТЛАДКА созданная operation:', {
        id: operation.id,
        startTime: operation.startTime,
        fuelType: operation.fuelType,
        quantity: operation.quantity,
        price: operation.price,
        totalCost: operation.totalCost,
        transactionId: operation.transactionId
      });

      return operation;
    } catch (error) {
      console.error('❌ [SYNC] Ошибка трансформации транзакции:', error);
      throw error;
    }
  }

  /**
   * Запуск автоматической синхронизации с интервалом
   */
  async startAutoSync(intervalMinutes: number = 15, options: SyncOptions = {}): Promise<() => void> {
    console.log(`🔄 [AUTO-SYNC] Запуск автоматической синхронизации каждые ${intervalMinutes} минут`);
    
    // Первый запуск сразу
    this.syncTransactions(options).catch(error => 
      console.error('❌ [AUTO-SYNC] Ошибка автоматической синхронизации:', error)
    );

    // Затем по расписанию
    const intervalId = setInterval(() => {
      this.syncTransactions(options).catch(error => 
        console.error('❌ [AUTO-SYNC] Ошибка автоматической синхронизации:', error)
      );
    }, intervalMinutes * 60 * 1000);

    // Возвращаем функцию для остановки
    return () => {
      clearInterval(intervalId);
      console.log('⏹️ [AUTO-SYNC] Автоматическая синхронизация остановлена');
    };
  }

  /**
   * Получить статус последней синхронизации
   */
  getSyncStatus(): { isRunning: boolean; lastSyncTime?: string } {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime
    };
  }

  /**
   * Синхронизация для конкретной станции за период
   */
  async syncStationTransactions(stationNumber: number, days: number = 7): Promise<SyncResult> {
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    return this.syncTransactions({
      stationNumber,
      startDate,
      endDate
    });
  }

  /**
   * Полная синхронизация всех станций за период
   */
  async syncAllStations(days: number = 1): Promise<SyncResult[]> {
    const stations = [1, 2, 3, 4, 5]; // Номера всех станций
    const results: SyncResult[] = [];

    for (const stationNumber of stations) {
      try {
        console.log(`🏪 [SYNC] Синхронизация станции ${stationNumber}...`);
        const result = await this.syncStationTransactions(stationNumber, days);
        results.push(result);
        
        // Пауза между станциями
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ [SYNC] Ошибка синхронизации станции ${stationNumber}:`, error);
        results.push({
          success: false,
          syncedTransactions: 0,
          skippedTransactions: 0,
          errors: [error.message],
          lastSyncTime: new Date().toISOString()
        });
      }
    }

    return results;
  }

  /**
   * НОВЫЙ МЕТОД: Синхронизация транзакций для сети 15 из Supabase
   * Загружает список торговых точек из базы данных и синхронизирует транзакции для каждой
   */
  async syncNetwork15Transactions(options: {
    dateFrom?: string;
    dateTo?: string;
    forceSync?: boolean;
  } = {}): Promise<{
    success: boolean;
    totalPoints: number;
    results: SyncResult[];
    summary: {
      totalSynced: number;
      totalSkipped: number;
      totalErrors: number;
    };
  }> {
    console.log('🏢 [SYNC-NETWORK-15] Начинаем синхронизацию для всей сети 15');
    
    try {
      // 1. Получаем сеть 15 из базы данных
      const { data: network, error: networkError } = await supabaseClientBrowser
        .from('networks')
        .select('id, name, external_id')
        .eq('external_id', '15')
        .single();
        
      if (networkError || !network) {
        throw new Error(`Сеть с external_id=15 не найдена: ${networkError?.message}`);
      }
      
      console.log('🏢 [SYNC-NETWORK-15] Найдена сеть:', network);
      
      // 2. Получаем все торговые точки сети 15
      const { data: tradingPoints, error: tpError } = await supabaseClientBrowser
        .from('trading_points')
        .select('id, name, external_id, is_active')
        .eq('network_id', network.id)
        .eq('is_active', true); // Только активные точки
        
      if (tpError) {
        throw new Error(`Ошибка загрузки торговых точек: ${tpError.message}`);
      }
      
      if (!tradingPoints || tradingPoints.length === 0) {
        throw new Error('Активные торговые точки для сети 15 не найдены');
      }
      
      console.log(`📍 [SYNC-NETWORK-15] Найдено ${tradingPoints.length} активных торговых точек`);
      
      // 3. Получаем конфигурацию API из раздела "Обмен данными"
      const config = await tradingNetworkConfigService.getConfig();
      if (!config.enabled) {
        throw new Error('Интеграция с торговой сетью отключена в разделе "Обмен данными"');
      }
      
      console.log('🔧 [SYNC-NETWORK-15] Конфигурация API:', {
        baseUrl: config.baseUrl,
        username: config.username,
        hasPassword: !!config.password
      });
      
      // 4. Последовательно синхронизируем транзакции для каждой торговой точки
      const results: SyncResult[] = [];
      
      for (const tradingPoint of tradingPoints) {
        try {
          console.log(`🏪 [SYNC-NETWORK-15] Синхронизация точки: ${tradingPoint.name} (station=${tradingPoint.external_id})`);
          
          // 🚀 АВТОМАТИЧЕСКАЯ ФИЛЬТРАЦИЯ: Если не указаны даты - устанавливаем последние 7 дней
          let dateFrom = options.dateFrom;
          let dateTo = options.dateTo;
          
          if (!dateFrom && !dateTo) {
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
            
            dateTo = now.toISOString().split('T')[0];
            dateFrom = sevenDaysAgo.toISOString().split('T')[0];
            
            console.log(`📅 [SYNC-NETWORK-15] Автоматически установлены даты (последние 7 дней):`, {
              dateFrom, dateTo
            });
          }

          // Загружаем транзакции для конкретной торговой точки через API
          const apiTransactions = await this.fetchApiTransactions({
            systemId: 15, // ID сети в API
            stationId: parseInt(tradingPoint.external_id), // ID торговой точки в API
            dateFrom: dateFrom,
            dateTo: dateTo
          });
          
          console.log(`📥 [SYNC-NETWORK-15] Получено ${apiTransactions.length} транзакций для ${tradingPoint.name}`);
          
          // Преобразуем и сохраняем транзакции
          const syncResult = await this.processApiTransactions(
            apiTransactions,
            tradingPoint,
            options.forceSync || false
          );
          
          results.push(syncResult);
          
          // Пауза между торговыми точками
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error: any) {
          console.error(`❌ [SYNC-NETWORK-15] Ошибка синхронизации точки ${tradingPoint.name}:`, error);
          results.push({
            success: false,
            syncedTransactions: 0,
            skippedTransactions: 0,
            errors: [error.message],
            lastSyncTime: new Date().toISOString()
          });
        }
      }
      
      // 5. Подсчитываем общую статистику
      const summary = results.reduce(
        (acc, result) => ({
          totalSynced: acc.totalSynced + result.syncedTransactions,
          totalSkipped: acc.totalSkipped + result.skippedTransactions,
          totalErrors: acc.totalErrors + result.errors.length
        }),
        { totalSynced: 0, totalSkipped: 0, totalErrors: 0 }
      );
      
      console.log('✅ [SYNC-NETWORK-15] Синхронизация сети 15 завершена:', summary);
      
      return {
        success: results.some(r => r.success),
        totalPoints: tradingPoints.length,
        results,
        summary
      };
      
    } catch (error: any) {
      console.error('❌ [SYNC-NETWORK-15] Критическая ошибка синхронизации сети 15:', error);
      throw error;
    }
  }

  /**
   * НОВЫЙ МЕТОД: Загрузка транзакций из API для конкретной торговой точки
   */
  private async fetchApiTransactions(params: {
    systemId: number;
    stationId: number;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<TradingTransaction[]> {
    
    const config = await tradingNetworkConfigService.getConfig();
    
    // 🚀 АВТОМАТИЧЕСКАЯ ФИЛЬТРАЦИЯ: Если не указаны даты - устанавливаем последние 7 дней
    let dateFrom = params.dateFrom;
    let dateTo = params.dateTo;
    
    if (!dateFrom && !dateTo) {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      
      dateTo = now.toISOString().split('T')[0]; // Формат YYYY-MM-DD для API
      dateFrom = sevenDaysAgo.toISOString().split('T')[0];
      
      console.log(`📅 [API] Автоматически установлены даты для станции ${params.stationId}:`, {
        dateFrom, dateTo
      });
    }
    
    // Формируем URL для запроса транзакций
    const urlParams = new URLSearchParams({
      system: params.systemId.toString(),
      station: params.stationId.toString()
    });
    
    if (dateFrom) {
      urlParams.append('dt_beg', dateFrom);
    }
    if (dateTo) {
      urlParams.append('dt_end', dateTo);
    }
    
    const queryParams = {
      system: params.systemId.toString(),
      station: params.stationId.toString()
    };
    
    if (dateFrom) {
      queryParams['dt_beg'] = dateFrom;
    }
    if (dateTo) {
      queryParams['dt_end'] = dateTo;
    }
    
    console.log('🌐 [API] Запрос:', '/v1/transactions', queryParams);
    
    // Выполняем запрос через универсальный HTTP клиент
    const response = await httpClient.get('/v1/transactions', {
      destination: 'external-api',
      useAuth: true,
      queryParams,
      timeout: config.timeout || 30000
    });
    
    if (!response.success) {
      throw new Error(`API запрос неуспешен: ${response.error}`);
    }
    
    const data = response.data;
    
    // API может возвращать массив или объект с массивом
    if (Array.isArray(data)) {
      return data;
    } else if (data.transactions && Array.isArray(data.transactions)) {
      return data.transactions;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    } else {
      console.warn('⚠️ [API] Неожиданная структура ответа:', data);
      return [];
    }
  }

  /**
   * НОВЫЙ МЕТОД: Обработка и сохранение транзакций из API в базу данных
   */
  private async processApiTransactions(
    apiTransactions: TradingTransaction[],
    tradingPoint: any,
    forceSync: boolean
  ): Promise<SyncResult> {
    
    const result: SyncResult = {
      success: false,
      syncedTransactions: 0,
      skippedTransactions: 0,
      errors: [],
      lastSyncTime: new Date().toISOString()
    };
    
    if (apiTransactions.length === 0) {
      result.success = true;
      return result;
    }
    
    // Получаем существующие операции для дедупликации
    const existingOperationIds = new Set<string>();
    if (!forceSync) {
      try {
        const existingOperations = await operationsSupabaseService.getOperations({
          tradingPointId: tradingPoint.id
        });
        existingOperations.forEach(op => {
          if (op.transactionId) {
            existingOperationIds.add(op.transactionId);
          }
        });
      } catch (error) {
        console.warn('⚠️ [PROCESS] Не удалось получить существующие операции:', error);
      }
    }
    
    // Обрабатываем каждую транзакцию
    for (const apiTx of apiTransactions) {
      try {
        // Проверяем дубликаты
        if (!forceSync && existingOperationIds.has(apiTx.id)) {
          result.skippedTransactions++;
          console.log(`⏭️ [PROCESS] Пропускаем транзакцию ${apiTx.id} - уже существует`);
          continue;
        }
        
        // Преобразуем в операцию
        const operation = await this.transformApiTransactionToOperation(apiTx, tradingPoint);
        
        if (operation) {
          try {
            // Сохраняем операцию с полными данными включая transactionId
            const createResult = await operationsSupabaseService.createOperation({
              operationType: operation.operationType,
              tradingPointId: operation.tradingPointId,
              tradingPointName: operation.tradingPointName,
              deviceId: operation.deviceId,
              transactionId: operation.transactionId, // КРИТИЧЕСКИ ВАЖНО для предотвращения дубликатов
              fuelType: operation.fuelType,
              quantity: operation.quantity,
              price: operation.price,
              totalCost: operation.totalCost,
              paymentMethod: operation.paymentMethod,
              startTime: operation.startTime,
              endTime: operation.endTime,
              status: operation.status,
              details: operation.details,
              operatorName: operation.operatorName,
              metadata: operation.metadata
            });
            
            result.syncedTransactions++;
            console.log(`✅ [PROCESS] Сохранена операция ${apiTx.id} с transaction_id: ${operation.transactionId}`);
            
          } catch (error: any) {
            // Если ошибка связана с дублированием (уникальный индекс)
            if (error.message && error.message.includes('duplicate') || 
                error.message && error.message.includes('unique') ||
                error.code === '23505') {
              result.skippedTransactions++;
              console.log(`⏭️ [PROCESS] Пропускаем транзакцию ${apiTx.id} - дубликат по transaction_id ${operation.transactionId}`);
            } else {
              result.errors.push(`Ошибка сохранения ${apiTx.id}: ${error.message}`);
              console.error(`❌ [PROCESS] Ошибка создания операции ${apiTx.id}:`, error);
            }
          }
        }
        
      } catch (error: any) {
        result.errors.push(`Ошибка обработки транзакции ${apiTx.id}: ${error.message}`);
        console.error(`❌ [PROCESS] ${result.errors[result.errors.length - 1]}`);
      }
    }
    
    result.success = result.errors.length === 0 || result.syncedTransactions > 0;
    return result;
  }

  /**
   * НОВЫЙ МЕТОД: Преобразование транзакции из API в операцию приложения
   */
  private async transformApiTransactionToOperation(
    apiTx: TradingTransaction,
    tradingPoint: any
  ): Promise<Operation | null> {
    
    try {
      // Маппинг способов оплаты
      const paymentMethodMap: Record<string, PaymentMethod> = {
        'CASH': 'cash',
        'CARD': 'bank_card',
        'BANK_CARD': 'bank_card',
        'CORPORATE_CARD': 'corporate_card',
        'FUEL_CARD': 'fuel_card',
        'ONLINE': 'online_order'
      };
      
      // Маппинг статусов
      const statusMap: Record<string, OperationStatus> = {
        'COMPLETED': 'completed',
        'SUCCESS': 'completed',
        'FAILED': 'failed',
        'ERROR': 'failed',
        'PENDING': 'pending',
        'IN_PROGRESS': 'in_progress',
        'CANCELLED': 'cancelled'
      };
      
      const operation: Operation = {
        id: `api_${apiTx.id}_${tradingPoint.id}`,
        operationType: 'sale' as OperationType,
        status: statusMap[apiTx.status] || 'completed',
        startTime: apiTx.timestamp,
        endTime: apiTx.timestamp,
        duration: 0,
        tradingPointId: tradingPoint.id,
        tradingPointName: tradingPoint.name,
        deviceId: apiTx.pos_id || `POS-${apiTx.station_id}`,
        transactionId: apiTx.id, // Важно для дедупликации
        fuelType: apiTx.fuel_type,
        quantity: apiTx.quantity,
        price: apiTx.price_per_liter,
        totalCost: apiTx.amount,
        paymentMethod: paymentMethodMap[apiTx.payment_method] || 'cash',
        details: `Импорт из API торговой сети (система 15): ${apiTx.fuel_type} ${apiTx.quantity}л по ${apiTx.price_per_liter}₽/л`,
        progress: 100,
        lastUpdated: new Date().toISOString(),
        operatorName: apiTx.operator_id || 'Оператор API',
        customerId: apiTx.customer_info?.id,
        vehicleNumber: apiTx.customer_info?.vehicle_number,
        metadata: {
          source: 'trading_network_api_15',
          apiTransactionId: apiTx.id,
          stationId: apiTx.station_id,
          shiftId: apiTx.shift_id,
          receiptNumber: apiTx.receipt_number,
          syncedAt: new Date().toISOString(),
          originalTransaction: apiTx
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      return operation;
      
    } catch (error: any) {
      console.error('❌ [TRANSFORM] Ошибка преобразования транзакции:', error);
      return null;
    }
  }
}

// Экспорт singleton экземпляра
export const tradingTransactionsSyncService = new TradingTransactionsSyncService();

// Экспорт типов
export { TradingTransaction, SyncOptions, SyncResult };

// Экспорт для тестирования в браузерной консоли (только в dev режиме)
if (import.meta.env.DEV) {
  // @ts-ignore
  window.tradingTransactionsSyncService = tradingTransactionsSyncService;
  console.log('🧪 TradingTransactionsSyncService доступен через window.tradingTransactionsSyncService');
  console.log('📋 Доступные методы:');
  console.log('  - syncNetwork15Transactions() - Синхронизация всей сети 15');
  console.log('  - syncStationTransactions(stationNumber, days) - Синхронизация конкретной станции');
  console.log('  - getSyncStatus() - Статус последней синхронизации');
}