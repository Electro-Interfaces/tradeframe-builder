const fs = require('fs');

console.log('📝 Создаем чистую структуру operationsService.ts...');

// Создаем минимальную структуру сервиса с базовыми операциями
const serviceContent = `/**
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

// Демо данные операций для сети АЗС (август 2025) - 243 операции
const initialOperations: Operation[] = [
  {
    "id": "TXN-2025-08-15-01-001",
    "operationType": "sale",
    "status": "completed",
    "startTime": "2025-08-15T10:30:00.000Z",
    "endTime": "2025-08-15T10:33:00.000Z",
    "duration": 3,
    "tradingPointId": "station_01",
    "tradingPointName": "АЗС №1 Центральная",
    "deviceId": "PUMP-001",
    "transactionId": "TXN-1723726200000-1",
    "fuelType": "АИ-95",
    "quantity": 45.50,
    "price": 63.8,
    "totalCost": 2902.9,
    "paymentMethod": "bank_card",
    "details": "Продажа топлива АИ-95",
    "progress": 100,
    "lastUpdated": "2025-08-15T10:33:00.000Z",
    "operatorName": "Иванов И.И.",
    "customerId": "CUST-12345",
    "vehicleNumber": "А123ВС777",
    "metadata": {},
    "createdAt": "2025-08-15T10:30:00.000Z",
    "updatedAt": "2025-08-15T10:33:00.000Z"
  }
];

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
  }
};`;

// Сохраняем файл
fs.writeFileSync('./src/services/operationsService.ts', serviceContent);

console.log('✅ Создан базовый operationsService.ts с правильной структурой');
console.log('📋 Теперь можно добавить 243 операции отдельным скриптом');