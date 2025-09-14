const fs = require('fs');

// Создаем чистый operationsService.ts с 243 операциями
console.log('📝 Создаем чистый operationsService.ts...');

// Загружаем 243 операции которые мы создали ранее
const operations = JSON.parse(fs.readFileSync('create-243-operations.json', 'utf8').trim());

console.log('Loaded 243 operations from file');

const serviceTemplate = `/**
 * Сервис для работы с операциями и транзакциями торговых точек
 * Включает персистентное хранение в localStorage и поддержку частичной миграции
 */

import { PersistentStorage } from '@/utils/persistentStorage';
import { getApiBaseUrl } from '@/services/apiConfigService';

export type OperationType = 'sale' | 'refund' | 'correction' | 'maintenance' | 'tank_loading' | 'diagnostics' | 'sensor_calibration';
export type OperationStatus = 'completed' | 'in_progress' | 'failed' | 'pending' | 'cancelled';
export type PaymentMethod = 'bank_card' | 'cash' | 'corporate_card' | 'fuel_card' | 'online_order';

export interface Operation {
  id: string;
  operationType: OperationType;
  status: OperationStatus;
  startTime: string;
  endTime?: string;
  duration?: number;
  tradingPointId?: string;
  tradingPointName?: string;
  deviceId?: string;
  transactionId?: string;
  fuelType?: string;
  quantity?: number;
  price?: number;
  totalCost?: number;
  paymentMethod?: PaymentMethod;
  details: string;
  progress?: number;
  lastUpdated: string;
  operatorName?: string;
  customerId?: string;
  vehicleNumber?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface OperationInput {
  operationType: OperationType;
  tradingPointId?: string;
  tradingPointName?: string;
  deviceId?: string;
  fuelType?: string;
  quantity?: number;
  price?: number;
  paymentMethod?: PaymentMethod;
  details: string;
  operatorName?: string;
  customerId?: string;
  vehicleNumber?: string;
  metadata?: Record<string, any>;
}

// Демо данные операций для сети АЗС (август 2025) - 243 операции
const initialOperations: Operation[] = ${JSON.stringify(operations, null, 2)};

// Загружаем данные из localStorage
let operationsData: Operation[] = [];
try {
  operationsData = PersistentStorage.load<Operation>('operations', initialOperations);
  console.log('Загружено операций из PersistentStorage:', operationsData.length);
} catch (error) {
  console.error('Ошибка загрузки операций из localStorage:', error);
  operationsData = initialOperations;
}

// Функция для сохранения изменений
const saveOperations = () => {
  PersistentStorage.save('operations', operationsData);
  console.log('Операции сохранены в PersistentStorage:', operationsData.length);
};

// Перезаписываем данные при изменении
const forceUpdateOperations = () => {
  console.log('🔄 Принудительное обновление операций...');
  operationsData = [...initialOperations];
  saveOperations();
  return operationsData;
};

export const operationsService = {
  // Получение всех операций
  async getAll(): Promise<Operation[]> {
    const sortedData = [...operationsData].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    return sortedData;
  },

  // Принудительная перезагрузка данных
  async forceReload(): Promise<void> {
    console.log('🔄 Принудительная перезагрузка операций...');
    operationsData = [...initialOperations];
    saveOperations();
  },

  // Получение операции по ID
  async getById(id: string): Promise<Operation | null> {
    return operationsData.find(op => op.id === id) || null;
  },

  // Создание новой операции
  async create(operation: OperationInput): Promise<Operation> {
    const now = new Date();
    const newOperation: Operation = {
      id: \`OP-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`,
      ...operation,
      status: 'pending',
      progress: 0,
      lastUpdated: now.toISOString(),
      createdAt: now,
      updatedAt: now
    };
    operationsData.unshift(newOperation);
    saveOperations();
    return newOperation;
  },

  // Обновление операции
  async update(id: string, updates: Partial<Operation>): Promise<Operation | null> {
    const index = operationsData.findIndex(op => op.id === id);
    if (index === -1) return null;
    
    operationsData[index] = {
      ...operationsData[index],
      ...updates,
      id: operationsData[index].id, // Не позволяем изменить ID
      updatedAt: new Date()
    };
    saveOperations();
    return operationsData[index];
  },

  // Удаление операции
  async delete(id: string): Promise<boolean> {
    const index = operationsData.findIndex(op => op.id === id);
    if (index === -1) return false;
    
    operationsData.splice(index, 1);
    saveOperations();
    return true;
  }
};`;

// Сохраняем в файл
fs.writeFileSync('./src/services/operationsService.ts', serviceTemplate);

console.log('✅ Создан чистый operationsService.ts');
console.log(\`📊 Включено операций: \${operations.length}\`);

// Статистика
const stats = { byStatus: {} };
operations.forEach(op => {
  stats.byStatus[op.status] = (stats.byStatus[op.status] || 0) + 1;
});

console.log('📈 Статистика по статусам:', stats.byStatus);

const total = operations.length;
Object.entries(stats.byStatus).forEach(([status, count]) => {
  const percentage = ((count / total) * 100).toFixed(1);
  console.log(\`   \${status}: \${count} (\${percentage}%)\`);
});`;

fs.writeFileSync('./create-clean-operations-service.cjs', serviceTemplate);