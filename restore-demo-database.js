/**
 * Скрипт для восстановления демо базы данных из файла august-2025-demo-data.json
 * Поддерживает различные форматы БД и предоставляет утилиты для загрузки данных
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Конфигурация базы данных
const DB_CONFIG = {
  // Поддерживаемые типы БД
  supportedTypes: ['postgresql', 'mysql', 'sqlite', 'mongodb', 'mock'],
  
  // Настройки подключения по умолчанию
  default: {
    type: 'mock',
    host: 'localhost',
    port: 5432,
    database: 'tradeframe_demo',
    username: 'demo_user',
    password: 'demo_pass'
  },

  // Таблицы для создания
  tables: {
    stations: {
      columns: [
        'id VARCHAR(50) PRIMARY KEY',
        'name VARCHAR(255) NOT NULL',
        'number INTEGER UNIQUE',
        'status VARCHAR(50) DEFAULT \'active\'',
        'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
        'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
      ]
    },
    operations: {
      columns: [
        'id VARCHAR(50) PRIMARY KEY',
        'operation_type VARCHAR(50) NOT NULL',
        'status VARCHAR(50) NOT NULL',
        'start_time TIMESTAMP NOT NULL',
        'end_time TIMESTAMP',
        'duration INTEGER',
        'trading_point_id VARCHAR(50)',
        'trading_point_name VARCHAR(255)',
        'device_id VARCHAR(50)',
        'transaction_id VARCHAR(50)',
        'fuel_type VARCHAR(50)',
        'quantity DECIMAL(10,3)',
        'price DECIMAL(10,2)',
        'total_cost DECIMAL(12,2)',
        'payment_method VARCHAR(50)',
        'details TEXT',
        'progress INTEGER DEFAULT 0',
        'last_updated TIMESTAMP',
        'operator_name VARCHAR(255)',
        'customer_id VARCHAR(50)',
        'vehicle_number VARCHAR(20)',
        'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
        'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
      ],
      indexes: [
        'CREATE INDEX idx_operations_start_time ON operations(start_time)',
        'CREATE INDEX idx_operations_trading_point ON operations(trading_point_id)',
        'CREATE INDEX idx_operations_status ON operations(status)',
        'CREATE INDEX idx_operations_fuel_type ON operations(fuel_type)',
        'CREATE INDEX idx_operations_operation_type ON operations(operation_type)'
      ]
    },
    fuel_movements: {
      columns: [
        'id SERIAL PRIMARY KEY',
        'operation_id VARCHAR(50) REFERENCES operations(id)',
        'station_id VARCHAR(50)',
        'fuel_type VARCHAR(50)',
        'movement_type VARCHAR(50)', // 'sale', 'delivery', 'loss', 'inventory_adjustment'
        'quantity DECIMAL(10,3)',
        'price_per_liter DECIMAL(10,2)',
        'total_amount DECIMAL(12,2)',
        'timestamp TIMESTAMP NOT NULL',
        'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
      ],
      indexes: [
        'CREATE INDEX idx_fuel_movements_station ON fuel_movements(station_id)',
        'CREATE INDEX idx_fuel_movements_fuel_type ON fuel_movements(fuel_type)',
        'CREATE INDEX idx_fuel_movements_timestamp ON fuel_movements(timestamp)'
      ]
    },
    inventory_snapshots: {
      columns: [
        'id SERIAL PRIMARY KEY',
        'station_id VARCHAR(50)',
        'fuel_type VARCHAR(50)',
        'current_level DECIMAL(10,3)',
        'capacity DECIMAL(10,3)',
        'last_delivery TIMESTAMP',
        'last_inventory_check TIMESTAMP',
        'status VARCHAR(50)',
        'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
        'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
      ],
      indexes: [
        'CREATE INDEX idx_inventory_station_fuel ON inventory_snapshots(station_id, fuel_type)'
      ]
    }
  }
};

// Класс для работы с демо данными
class DemoDataManager {
  constructor(dataFilePath) {
    this.dataFilePath = dataFilePath;
    this.data = null;
    this.loadData();
  }

  // Загрузка данных из файла
  loadData() {
    try {
      const rawData = fs.readFileSync(this.dataFilePath, 'utf8');
      this.data = JSON.parse(rawData);
      console.log(`✅ Загружены демо данные: ${this.data.operations.length} операций`);
    } catch (error) {
      console.error('❌ Ошибка загрузки демо данных:', error.message);
      throw error;
    }
  }

  // Получение всех станций
  getStations() {
    if (!this.data?.metadata?.stations) return [];
    
    return this.data.metadata.stations.map(station => ({
      id: station.id,
      name: station.name,
      number: station.number,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
  }

  // Получение операций
  getOperations() {
    if (!this.data?.operations) return [];
    
    return this.data.operations.map(op => ({
      id: op.id,
      operation_type: op.operationType,
      status: op.status,
      start_time: op.startTime,
      end_time: op.endTime,
      duration: op.duration,
      trading_point_id: op.tradingPointId,
      trading_point_name: op.tradingPointName,
      device_id: op.deviceId,
      transaction_id: op.transactionId,
      fuel_type: op.fuelType,
      quantity: op.quantity,
      price: op.price,
      total_cost: op.totalCost,
      payment_method: op.paymentMethod,
      details: op.details,
      progress: op.progress,
      last_updated: op.lastUpdated,
      operator_name: op.operatorName,
      customer_id: op.customerId,
      vehicle_number: op.vehicleNumber,
      created_at: op.createdAt,
      updated_at: op.updatedAt
    }));
  }

  // Генерация движений топлива на основе операций
  generateFuelMovements() {
    const movements = [];
    
    this.data.operations.forEach((op, index) => {
      if (op.operationType === 'sale' && op.status === 'completed' && op.quantity > 0) {
        movements.push({
          id: index + 1,
          operation_id: op.id,
          station_id: op.tradingPointId,
          fuel_type: op.fuelType,
          movement_type: 'sale',
          quantity: -op.quantity, // Отрицательное значение для расхода
          price_per_liter: op.price,
          total_amount: op.totalCost,
          timestamp: op.startTime,
          created_at: new Date().toISOString()
        });
      }

      if (op.operationType === 'refuel_truck' && op.status === 'completed' && op.quantity < 0) {
        movements.push({
          id: index + 1000,
          operation_id: op.id,
          station_id: op.tradingPointId,
          fuel_type: op.fuelType,
          movement_type: 'delivery',
          quantity: Math.abs(op.quantity), // Положительное значение для поставки
          price_per_liter: op.price,
          total_amount: Math.abs(op.totalCost),
          timestamp: op.startTime,
          created_at: new Date().toISOString()
        });
      }
    });

    return movements;
  }

  // Генерация снимков инвентаря
  generateInventorySnapshots() {
    const snapshots = [];
    const fuelTypes = ['АИ-92', 'АИ-95', 'АИ-98', 'ДТ', 'АИ-100'];
    const stations = this.getStations();

    stations.forEach((station, stationIndex) => {
      fuelTypes.forEach((fuelType, fuelIndex) => {
        // Симуляция текущего уровня в резервуаре (от 20% до 90% заполнения)
        const capacity = 15000 + Math.random() * 5000; // 15-20 тысяч литров емкость
        const currentLevel = capacity * (0.2 + Math.random() * 0.7);
        
        snapshots.push({
          id: stationIndex * fuelTypes.length + fuelIndex + 1,
          station_id: station.id,
          fuel_type: fuelType,
          current_level: Math.round(currentLevel * 10) / 10,
          capacity: Math.round(capacity * 10) / 10,
          last_delivery: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          last_inventory_check: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          status: Math.random() > 0.1 ? 'normal' : 'low_level',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      });
    });

    return snapshots;
  }

  // Экспорт в SQL формат
  exportToSQL(dbType = 'postgresql') {
    const sql = [];
    
    // Заголовок
    sql.push('-- Демо данные для сети АЗС (август 2025)');
    sql.push('-- Сгенерировано автоматически');
    sql.push(`-- Дата генерации: ${new Date().toISOString()}`);
    sql.push('-- Всего операций: ' + this.data.operations.length);
    sql.push('');

    // Создание таблиц
    Object.entries(DB_CONFIG.tables).forEach(([tableName, tableConfig]) => {
      sql.push(`-- Создание таблицы ${tableName}`);
      sql.push(`DROP TABLE IF EXISTS ${tableName} CASCADE;`);
      sql.push(`CREATE TABLE ${tableName} (`);
      sql.push(tableConfig.columns.map(col => '  ' + col).join(',\\n'));
      sql.push(');');
      sql.push('');

      // Индексы
      if (tableConfig.indexes) {
        tableConfig.indexes.forEach(indexSQL => {
          sql.push(indexSQL + ';');
        });
        sql.push('');
      }
    });

    // Вставка данных
    
    // Станции
    const stations = this.getStations();
    if (stations.length > 0) {
      sql.push('-- Вставка данных станций');
      sql.push('INSERT INTO stations (id, name, number, status, created_at, updated_at) VALUES');
      const stationValues = stations.map(s => 
        `('${s.id}', '${s.name}', ${s.number}, '${s.status}', '${s.created_at}', '${s.updated_at}')`
      );
      sql.push(stationValues.join(',\\n'));
      sql.push(';');
      sql.push('');
    }

    // Операции (по частям для больших объемов)
    const operations = this.getOperations();
    const batchSize = 100;
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      sql.push(`-- Операции ${i + 1}-${Math.min(i + batchSize, operations.length)}`);
      sql.push('INSERT INTO operations (id, operation_type, status, start_time, end_time, duration, trading_point_id, trading_point_name, device_id, transaction_id, fuel_type, quantity, price, total_cost, payment_method, details, progress, last_updated, operator_name, customer_id, vehicle_number, created_at, updated_at) VALUES');
      
      const operationValues = batch.map(op => {
        const values = [
          `'${op.id}'`,
          `'${op.operation_type}'`,
          `'${op.status}'`,
          `'${op.start_time}'`,
          op.end_time ? `'${op.end_time}'` : 'NULL',
          op.duration || 'NULL',
          op.trading_point_id ? `'${op.trading_point_id}'` : 'NULL',
          op.trading_point_name ? `'${op.trading_point_name.replace(/'/g, "''")}'` : 'NULL',
          op.device_id ? `'${op.device_id}'` : 'NULL',
          op.transaction_id ? `'${op.transaction_id}'` : 'NULL',
          op.fuel_type ? `'${op.fuel_type}'` : 'NULL',
          op.quantity || 'NULL',
          op.price || 'NULL',
          op.total_cost || 'NULL',
          op.payment_method ? `'${op.payment_method}'` : 'NULL',
          op.details ? `'${op.details.replace(/'/g, "''")}'` : 'NULL',
          op.progress || 0,
          op.last_updated ? `'${op.last_updated}'` : 'NULL',
          op.operator_name ? `'${op.operator_name}'` : 'NULL',
          op.customer_id ? `'${op.customer_id}'` : 'NULL',
          op.vehicle_number ? `'${op.vehicle_number}'` : 'NULL',
          `'${op.created_at}'`,
          `'${op.updated_at}'`
        ];
        return `(${values.join(', ')})`;
      });
      
      sql.push(operationValues.join(',\\n'));
      sql.push(';');
      sql.push('');
    }

    // Движения топлива
    const fuelMovements = this.generateFuelMovements();
    if (fuelMovements.length > 0) {
      sql.push('-- Движения топлива');
      sql.push('INSERT INTO fuel_movements (operation_id, station_id, fuel_type, movement_type, quantity, price_per_liter, total_amount, timestamp, created_at) VALUES');
      const movementValues = fuelMovements.slice(0, 200).map(m => // Ограничиваем для демо
        `('${m.operation_id}', '${m.station_id}', '${m.fuel_type}', '${m.movement_type}', ${m.quantity}, ${m.price_per_liter}, ${m.total_amount}, '${m.timestamp}', '${m.created_at}')`
      );
      sql.push(movementValues.join(',\\n'));
      sql.push(';');
      sql.push('');
    }

    // Снимки инвентаря
    const inventory = this.generateInventorySnapshots();
    if (inventory.length > 0) {
      sql.push('-- Снимки инвентаря');
      sql.push('INSERT INTO inventory_snapshots (station_id, fuel_type, current_level, capacity, last_delivery, last_inventory_check, status, created_at, updated_at) VALUES');
      const inventoryValues = inventory.map(inv => 
        `('${inv.station_id}', '${inv.fuel_type}', ${inv.current_level}, ${inv.capacity}, '${inv.last_delivery}', '${inv.last_inventory_check}', '${inv.status}', '${inv.created_at}', '${inv.updated_at}')`
      );
      sql.push(inventoryValues.join(',\\n'));
      sql.push(';');
      sql.push('');
    }

    sql.push('-- Конец демо данных');
    
    return sql.join('\\n');
  }

  // Экспорт в CSV
  exportToCSV() {
    const csvFiles = {};

    // Операции
    const operations = this.getOperations();
    if (operations.length > 0) {
      const headers = Object.keys(operations[0]);
      const csvRows = [
        headers.join(','),
        ...operations.map(op => 
          headers.map(h => {
            const value = op[h];
            if (value === null || value === undefined) return '';
            if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
            return value;
          }).join(',')
        )
      ];
      csvFiles['operations.csv'] = csvRows.join('\\n');
    }

    // Станции
    const stations = this.getStations();
    if (stations.length > 0) {
      const headers = Object.keys(stations[0]);
      const csvRows = [
        headers.join(','),
        ...stations.map(station => 
          headers.map(h => station[h] || '').join(',')
        )
      ];
      csvFiles['stations.csv'] = csvRows.join('\\n');
    }

    return csvFiles;
  }
}

// Функция восстановления базы данных
async function restoreDatabase(options = {}) {
  const {
    dataFile = 'august-2025-demo-data.json',
    outputFormat = 'sql',
    dbType = 'postgresql',
    outputDir = './demo-db-export'
  } = options;

  console.log('🗄️  Начинаем восстановление демо базы данных...');
  console.log(`📁 Файл данных: ${dataFile}`);
  console.log(`🎯 Формат вывода: ${outputFormat}`);

  try {
    const dataPath = path.join(__dirname, dataFile);
    const demoManager = new DemoDataManager(dataPath);

    // Создание директории для экспорта
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (outputFormat === 'sql') {
      console.log(`🔧 Генерация SQL для ${dbType}...`);
      const sqlContent = demoManager.exportToSQL(dbType);
      const sqlPath = path.join(outputDir, `demo-data-${dbType}.sql`);
      fs.writeFileSync(sqlPath, sqlContent);
      console.log(`💾 SQL файл сохранен: ${sqlPath}`);
      console.log(`📊 Размер: ${(fs.statSync(sqlPath).size / 1024).toFixed(1)} KB`);
    }

    if (outputFormat === 'csv' || outputFormat === 'all') {
      console.log('📊 Генерация CSV файлов...');
      const csvFiles = demoManager.exportToCSV();
      
      Object.entries(csvFiles).forEach(([filename, content]) => {
        const csvPath = path.join(outputDir, filename);
        fs.writeFileSync(csvPath, content);
        console.log(`💾 CSV файл сохранен: ${csvPath}`);
      });
    }

    // Статистика
    console.log('\\n📈 Статистика восстановления:');
    console.log(`- Станций: ${demoManager.getStations().length}`);
    console.log(`- Операций: ${demoManager.getOperations().length}`);
    console.log(`- Движений топлива: ${demoManager.generateFuelMovements().length}`);
    console.log(`- Инвентарных записей: ${demoManager.generateInventorySnapshots().length}`);

    console.log('\\n✅ Восстановление базы данных завершено успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка восстановления:', error.message);
    throw error;
  }
}

// Запуск скрипта
if (import.meta.url.includes('restore-demo-database.js')) {
  const args = process.argv.slice(2);
  const options = {};

  // Простой парсер аргументов
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];
    if (key && value) {
      options[key] = value;
    }
  }

  restoreDatabase(options).catch(err => {
    console.error('Критическая ошибка:', err);
    process.exit(1);
  });
}

export { DemoDataManager, restoreDatabase, DB_CONFIG };