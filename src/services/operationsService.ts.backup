/**
 * Сервис для работы с операциями и транзакциями торговых точек
 * Включает персистентное хранение в localStorage и поддержку частичной миграции
 */

import { PersistentStorage } from '@/utils/persistentStorage';
import { getApiBaseUrl } from '@/services/apiConfigService';

export type OperationType = 'sale' | 'refund' | 'correction' | 'maintenance' | 'fuel_loading' | 'cash_collection' | 'tank_loading' | 'diagnostics' | 'sensor_calibration';
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

// Начальные данные операций для демо сети "АЗС Торговая сеть"
const initialOperations: Operation[] = [
  {
    id: "TXN-001234",
    operationType: "sale",
    status: "completed",
    startTime: "2025-01-15T14:23:15Z",
    endTime: "2025-01-15T14:23:45Z",
    duration: 30,
    tradingPointId: "station_01",
    tradingPointName: "АЗС №1 Центральная",
    deviceId: "PUMP-001",
    transactionId: "TXN-001234",
    fuelType: "АИ-95",
    quantity: 45.2,
    price: 62.50,
    totalCost: 2825.00,
    paymentMethod: "bank_card",
    details: "Продажа топлива АИ-95",
    progress: 100,
    lastUpdated: "2025-01-15T14:23:45Z",
    operatorName: "Иванов И.П.",
    customerId: "CUST-12345",
    vehicleNumber: "А123БВ777",
    createdAt: new Date('2025-01-15T14:23:15Z'),
    updatedAt: new Date('2025-01-15T14:23:45Z')
  },
  {
    id: "TXN-001235", 
    operationType: "sale",
    status: "completed",
    startTime: "2025-01-15T15:10:22Z",
    endTime: "2025-01-15T15:11:05Z",
    duration: 43,
    tradingPointId: "station_02",
    tradingPointName: "АЗС №2 Северная",
    deviceId: "PUMP-003",
    transactionId: "TXN-001235",
    fuelType: "ДТ",
    quantity: 38.7,
    price: 58.20,
    totalCost: 2252.34,
    paymentMethod: "cash",
    details: "Продажа дизельного топлива",
    progress: 100,
    lastUpdated: "2025-01-15T15:11:05Z",
    operatorName: "Петров П.С.",
    customerId: "CUST-67890",
    vehicleNumber: "В456ГД199",
    createdAt: new Date('2025-01-15T15:10:22Z'),
    updatedAt: new Date('2025-01-15T15:11:05Z')
  },
  {
    id: "OP-001236",
    operationType: "cash_collection",
    status: "in_progress",
    startTime: "2025-01-15T16:00:00Z",
    tradingPointId: "station_01",
    tradingPointName: "АЗС №1 Центральная",
    details: "Инкассация наличных средств",
    progress: 65,
    lastUpdated: "2025-01-15T16:15:00Z",
    operatorName: "Сидоров С.А.",
    createdAt: new Date('2025-01-15T16:00:00Z'),
    updatedAt: new Date('2025-01-15T16:15:00Z')
  },
  {
    id: "TXN-001237",
    operationType: "sale",
    status: "completed", 
    startTime: "2025-01-15T12:45:10Z",
    endTime: "2025-01-15T12:46:15Z",
    duration: 65,
    tradingPointId: "station_03",
    tradingPointName: "АЗС №3 Южная",
    deviceId: "PUMP-005",
    transactionId: "TXN-001237",
    fuelType: "АИ-92",
    quantity: 52.1,
    price: 59.80,
    totalCost: 3115.58,
    paymentMethod: "fuel_card",
    details: "Продажа топлива АИ-92",
    progress: 100,
    lastUpdated: "2025-01-15T12:46:15Z",
    operatorName: "Козлова А.В.",
    customerId: "CUST-33456",
    vehicleNumber: "С789ЕЖ123",
    createdAt: new Date('2025-01-15T12:45:10Z'),
    updatedAt: new Date('2025-01-15T12:46:15Z')
  },
  {
    id: "OP-001238",
    operationType: "diagnostics",
    status: "failed",
    startTime: "2025-01-15T11:30:00Z",
    endTime: "2025-01-15T12:00:00Z",
    duration: 1800,
    tradingPointId: "station_02",
    tradingPointName: "АЗС №2 Северная",
    deviceId: "PUMP-004",
    details: "Диагностика ТРК №4 - обнаружены неисправности системы подачи",
    progress: 100,
    lastUpdated: "2025-01-15T12:00:00Z",
    operatorName: "Волков В.И.",
    metadata: {
      errorCode: "ERR_PUMP_PRESSURE",
      errorDescription: "Низкое давление в системе подачи топлива"
    },
    createdAt: new Date('2025-01-15T11:30:00Z'),
    updatedAt: new Date('2025-01-15T12:00:00Z')
  },
  {
    id: "TXN-001239",
    operationType: "refund",
    status: "completed",
    startTime: "2025-01-15T17:20:00Z", 
    endTime: "2025-01-15T17:25:00Z",
    duration: 300,
    tradingPointId: "station_01",
    tradingPointName: "АЗС №1 Центральная",
    deviceId: "POS-001",
    transactionId: "TXN-001239",
    fuelType: "АИ-95",
    quantity: 25.0,
    price: 62.50,
    totalCost: 1562.50,
    paymentMethod: "bank_card",
    details: "Возврат средств за некачественное топливо",
    progress: 100,
    lastUpdated: "2025-01-15T17:25:00Z",
    operatorName: "Морозова Е.Н.",
    customerId: "CUST-78901",
    createdAt: new Date('2025-01-15T17:20:00Z'),
    updatedAt: new Date('2025-01-15T17:25:00Z')
  }
];

// Загружаем данные из localStorage
let operationsData: Operation[] = PersistentStorage.load<Operation>('operations', initialOperations);
let nextId = Math.max(...operationsData.map(op => parseInt(op.id.replace('OP-', '')) || 0)) + 1;

// API Base URL для централизованного управления
const getApiUrl = () => getApiBaseUrl();

// Функция для сохранения изменений
const saveOperations = () => {
  PersistentStorage.save('operations', operationsData);
};

// API сервис с персистентным хранением
export const operationsService = {
  // Получить все операции
  async getAll(): Promise<Operation[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return [...operationsData].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  },

  // Получить операцию по ID
  async getById(id: string): Promise<Operation | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return operationsData.find(op => op.id === id) || null;
  },

  // Получить операции по торговой точке
  async getByTradingPoint(tradingPointId: string): Promise<Operation[]> {
    await new Promise(resolve => setTimeout(resolve, 120));
    return operationsData
      .filter(op => op.tradingPointId === tradingPointId)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  },

  // Получить операции по статусу
  async getByStatus(status: OperationStatus): Promise<Operation[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return operationsData
      .filter(op => op.status === status)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  },

  // Создать новую операцию
  async create(input: OperationInput): Promise<Operation> {
    await new Promise(resolve => setTimeout(resolve, 250));
    
    const newOperation: Operation = {
      id: `OP-${String(nextId++).padStart(6, '0')}`,
      operationType: input.operationType,
      status: 'pending',
      startTime: new Date().toISOString(),
      tradingPointId: input.tradingPointId,
      tradingPointName: input.tradingPointName,
      deviceId: input.deviceId,
      fuelType: input.fuelType,
      quantity: input.quantity,
      price: input.price,
      totalCost: input.quantity && input.price ? input.quantity * input.price : undefined,
      paymentMethod: input.paymentMethod,
      details: input.details,
      progress: 0,
      lastUpdated: new Date().toISOString(),
      operatorName: input.operatorName,
      customerId: input.customerId,
      vehicleNumber: input.vehicleNumber,
      metadata: input.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    operationsData.push(newOperation);
    saveOperations();
    
    return newOperation;
  },

  // Обновить операцию
  async update(id: string, updates: Partial<Operation>): Promise<Operation | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const index = operationsData.findIndex(op => op.id === id);
    if (index === -1) return null;
    
    const updated: Operation = {
      ...operationsData[index],
      ...updates,
      lastUpdated: new Date().toISOString(),
      updatedAt: new Date()
    };

    operationsData[index] = updated;
    saveOperations();
    
    return updated;
  },

  // Завершить операцию
  async complete(id: string, result?: { success: boolean; message?: string }): Promise<Operation | null> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const operation = operationsData.find(op => op.id === id);
    if (!operation) return null;
    
    const now = new Date().toISOString();
    const startTime = new Date(operation.startTime);
    const endTime = new Date(now);
    
    operation.status = result?.success !== false ? 'completed' : 'failed';
    operation.endTime = now;
    operation.duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    operation.progress = 100;
    operation.lastUpdated = now;
    operation.updatedAt = new Date();
    
    if (result?.message) {
      operation.details += ` | ${result.message}`;
    }
    
    saveOperations();
    
    return operation;
  },

  // Отменить операцию
  async cancel(id: string, reason?: string): Promise<Operation | null> {
    await new Promise(resolve => setTimeout(resolve, 120));
    
    const operation = operationsData.find(op => op.id === id);
    if (!operation) return null;
    
    const now = new Date().toISOString();
    
    operation.status = 'cancelled';
    operation.endTime = now;
    operation.lastUpdated = now;
    operation.updatedAt = new Date();
    
    if (reason) {
      operation.details += ` | Отменено: ${reason}`;
    }
    
    saveOperations();
    
    return operation;
  },

  // Поиск операций
  async search(query: string, filters?: {
    status?: OperationStatus;
    operationType?: OperationType;
    tradingPointId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Operation[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    let filteredOperations = operationsData;
    
    // Фильтры
    if (filters) {
      if (filters.status) {
        filteredOperations = filteredOperations.filter(op => op.status === filters.status);
      }
      if (filters.operationType) {
        filteredOperations = filteredOperations.filter(op => op.operationType === filters.operationType);
      }
      if (filters.tradingPointId) {
        filteredOperations = filteredOperations.filter(op => op.tradingPointId === filters.tradingPointId);
      }
      if (filters.dateFrom) {
        filteredOperations = filteredOperations.filter(op => op.startTime >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        filteredOperations = filteredOperations.filter(op => op.startTime <= filters.dateTo!);
      }
    }
    
    // Поиск по запросу
    if (query.trim()) {
      const searchLower = query.toLowerCase();
      filteredOperations = filteredOperations.filter(op => 
        op.id.toLowerCase().includes(searchLower) ||
        op.details.toLowerCase().includes(searchLower) ||
        op.operatorName?.toLowerCase().includes(searchLower) ||
        op.tradingPointName?.toLowerCase().includes(searchLower) ||
        op.customerId?.toLowerCase().includes(searchLower) ||
        op.vehicleNumber?.toLowerCase().includes(searchLower) ||
        op.fuelType?.toLowerCase().includes(searchLower)
      );
    }
    
    return filteredOperations.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  },

  // Получить статистику по операциям
  async getStatistics(period?: { from: string; to: string }): Promise<{
    totalOperations: number;
    operationsByStatus: Record<OperationStatus, number>;
    operationsByType: Record<OperationType, number>;
    totalRevenue: number;
    totalFuelSold: number;
    averageOperationTime: number;
    topTradingPoints: Array<{ id: string; name: string; count: number }>;
  }> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    let operations = operationsData;
    
    // Фильтр по периоду
    if (period) {
      operations = operations.filter(op => 
        op.startTime >= period.from && op.startTime <= period.to
      );
    }
    
    const totalOperations = operations.length;
    
    // Статистика по статусам
    const operationsByStatus = operations.reduce((acc, op) => {
      acc[op.status] = (acc[op.status] || 0) + 1;
      return acc;
    }, {} as Record<OperationStatus, number>);
    
    // Статистика по типам
    const operationsByType = operations.reduce((acc, op) => {
      acc[op.operationType] = (acc[op.operationType] || 0) + 1;
      return acc;
    }, {} as Record<OperationType, number>);
    
    // Общая выручка
    const totalRevenue = operations
      .filter(op => op.totalCost && op.status === 'completed')
      .reduce((sum, op) => sum + (op.totalCost || 0), 0);
    
    // Общий объем проданного топлива
    const totalFuelSold = operations
      .filter(op => op.operationType === 'sale' && op.quantity && op.status === 'completed')
      .reduce((sum, op) => sum + (op.quantity || 0), 0);
    
    // Среднее время операции
    const completedOperations = operations.filter(op => op.duration);
    const averageOperationTime = completedOperations.length > 0
      ? completedOperations.reduce((sum, op) => sum + (op.duration || 0), 0) / completedOperations.length
      : 0;
    
    // Топ торговых точек
    const tradingPointsCount = operations.reduce((acc, op) => {
      if (op.tradingPointId && op.tradingPointName) {
        const key = op.tradingPointId;
        if (!acc[key]) {
          acc[key] = { id: op.tradingPointId, name: op.tradingPointName, count: 0 };
        }
        acc[key].count++;
      }
      return acc;
    }, {} as Record<string, { id: string; name: string; count: number }>);
    
    const topTradingPoints = Object.values(tradingPointsCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      totalOperations,
      operationsByStatus,
      operationsByType,
      totalRevenue,
      totalFuelSold,
      averageOperationTime,
      topTradingPoints
    };
  }
};

// Экспорт store для обратной совместимости с существующим кодом
export const operationsStore = {
  getAll: (): Operation[] => [...operationsData],
  
  getById: (id: string): Operation | undefined => 
    operationsData.find(op => op.id === id),
    
  getByStatus: (status: OperationStatus): Operation[] =>
    operationsData.filter(op => op.status === status),
    
  create: (input: OperationInput): Operation => {
    const operation: Operation = {
      id: `OP-${String(nextId++).padStart(6, '0')}`,
      operationType: input.operationType,
      status: 'pending',
      startTime: new Date().toISOString(),
      tradingPointId: input.tradingPointId,
      tradingPointName: input.tradingPointName,
      deviceId: input.deviceId,
      fuelType: input.fuelType,
      quantity: input.quantity,
      price: input.price,
      totalCost: input.quantity && input.price ? input.quantity * input.price : undefined,
      paymentMethod: input.paymentMethod,
      details: input.details,
      progress: 0,
      lastUpdated: new Date().toISOString(),
      operatorName: input.operatorName,
      customerId: input.customerId,
      vehicleNumber: input.vehicleNumber,
      metadata: input.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    operationsData.push(operation);
    saveOperations();
    return operation;
  },
  
  update: (id: string, updates: Partial<Operation>): Operation | null => {
    const index = operationsData.findIndex(op => op.id === id);
    if (index === -1) return null;
    
    operationsData[index] = {
      ...operationsData[index],
      ...updates,
      lastUpdated: new Date().toISOString(),
      updatedAt: new Date()
    };
    
    saveOperations();
    return operationsData[index];
  },
  
  remove: (id: string): boolean => {
    const index = operationsData.findIndex(op => op.id === id);
    if (index === -1) return false;
    
    operationsData.splice(index, 1);
    saveOperations();
    return true;
  }
};