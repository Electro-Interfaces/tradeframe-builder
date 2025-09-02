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

// Начальные данные операций
const initialOperations: Operation[] = [
  {
    id: "OP-001234",
    operationType: "sale",
    status: "completed",
    startTime: "2024-08-30T14:23:15Z",
    endTime: "2024-08-30T14:23:45Z",
    duration: 30,
    tradingPointId: "point1",
    tradingPointName: "АЗС №001 - Центральная",
    deviceId: "POS-001",
    transactionId: "TXN-789456",
    fuelType: "АИ-95",
    quantity: 45.2,
    price: 60.15,
    totalCost: 2718.78,
    paymentMethod: "bank_card",
    details: "Продажа топлива АИ-95, 45.2л по цене 60.15₽/л",
    progress: 100,
    lastUpdated: "2024-08-30T14:23:45Z",
    operatorName: "Иван Петров",
    customerId: "CUST-12345",
    vehicleNumber: "А123БВ777",
    createdAt: new Date('2024-08-30T14:23:15Z'),
    updatedAt: new Date('2024-08-30T14:23:45Z')
  },
  {
    id: "OP-001235",
    operationType: "cash_collection",
    status: "in_progress",
    startTime: "2024-08-30T15:00:00Z",
    tradingPointId: "point2",
    tradingPointName: "АЗС №002 - Северная",
    details: "Инкассация наличных средств",
    progress: 65,
    lastUpdated: "2024-08-30T15:15:00Z",
    operatorName: "Мария Сидорова",
    createdAt: new Date('2024-08-30T15:00:00Z'),
    updatedAt: new Date('2024-08-30T15:15:00Z')
  },
  {
    id: "OP-001236",
    operationType: "tank_loading",
    status: "completed",
    startTime: "2024-08-30T06:30:00Z",
    endTime: "2024-08-30T08:45:00Z",
    duration: 8100,
    tradingPointId: "point3",
    tradingPointName: "АЗС №003 - Южная",
    fuelType: "ДТ",
    quantity: 15000,
    details: "Загрузка дизельного топлива в резервуар №3",
    progress: 100,
    lastUpdated: "2024-08-30T08:45:00Z",
    operatorName: "Алексей Козлов",
    vehicleNumber: "В456ГД199",
    createdAt: new Date('2024-08-30T06:30:00Z'),
    updatedAt: new Date('2024-08-30T08:45:00Z')
  },
  {
    id: "OP-001237",
    operationType: "diagnostics",
    status: "failed",
    startTime: "2024-08-30T12:00:00Z",
    endTime: "2024-08-30T12:30:00Z",
    duration: 1800,
    tradingPointId: "point4",
    tradingPointName: "АЗС №004 - Московское шоссе",
    deviceId: "PUMP-004",
    details: "Диагностика топливораздаточной колонки №4 - обнаружены неисправности",
    progress: 100,
    lastUpdated: "2024-08-30T12:30:00Z",
    operatorName: "Сергей Волков",
    metadata: {
      errorCode: "ERR_PUMP_PRESSURE",
      errorDescription: "Низкое давление в системе подачи топлива"
    },
    createdAt: new Date('2024-08-30T12:00:00Z'),
    updatedAt: new Date('2024-08-30T12:30:00Z')
  },
  {
    id: "OP-001238",
    operationType: "refund",
    status: "completed",
    startTime: "2024-08-30T16:45:00Z",
    endTime: "2024-08-30T16:50:00Z",
    duration: 300,
    tradingPointId: "point1",
    tradingPointName: "АЗС №001 - Центральная",
    deviceId: "POS-001",
    transactionId: "TXN-789457",
    fuelType: "АИ-92",
    quantity: 25.0,
    price: 58.50,
    totalCost: 1462.50,
    paymentMethod: "bank_card",
    details: "Возврат средств за некачественное топливо",
    progress: 100,
    lastUpdated: "2024-08-30T16:50:00Z",
    operatorName: "Елена Морозова",
    customerId: "CUST-67890",
    createdAt: new Date('2024-08-30T16:45:00Z'),
    updatedAt: new Date('2024-08-30T16:50:00Z')
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