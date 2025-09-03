/**
 * Типы данных для операций и транзакций
 * Извлечены из operationsService.ts для упрощения миграции
 */

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
  
  // Дополнительные поля для транзакций
  shiftNumber?: string;      // номер смены
  toNumber?: string;         // номер ТО (торговый объект) 
  posNumber?: string;        // номер POS
  cardNumber?: string;       // номер карты
  orderedQuantity?: number;  // заказанное количество литров
  orderedAmount?: number;    // заказанная сумма
  actualQuantity?: number;   // фактический отпуск литров
  actualAmount?: number;     // фактический отпуск сумма
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

export interface OperationFilters {
  status?: OperationStatus;
  operationType?: OperationType;
  tradingPointId?: string;
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: PaymentMethod;
  search?: string;
}

export interface OperationStatistics {
  total: number;
  byStatus: Record<OperationStatus, number>;
  byType: Record<OperationType, number>;
  totalRevenue: number;
  averageAmount: number;
  todayOperations: number;
}

export interface CreateOperationResponse {
  operation: Operation;
  success: boolean;
  error?: string;
}

export interface UpdateOperationResponse {
  operation: Operation | null;
  success: boolean;
  error?: string;
}