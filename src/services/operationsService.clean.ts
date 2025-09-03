/**
 * Сервис для работы с операциями и транзакциями торговых точек
 * Рефакторинг: извлечена бизнес-логика и демо-данные для упрощения миграции
 */

import { PersistentStorage } from '@/utils/persistentStorage';
import { getApiBaseUrl } from '@/services/apiConfigService';
import { OperationsBusinessLogic } from './operationsBusinessLogic';
import { 
  Operation, 
  OperationType, 
  OperationStatus, 
  PaymentMethod, 
  OperationInput,
  OperationFilters,
  OperationStatistics,
  CreateOperationResponse,
  UpdateOperationResponse
} from './operationsTypes';

// Импорт демо-данных из отдельного файла
// В production эти данные будут загружаться из БД
let demoDataOperations: Operation[] = [];

// Попытка загрузки демо-данных
try {
  // В production это будет заменено на вызов API
  demoDataOperations = require('../data/operationsDemoData.json');
  console.log('✅ Загружены демо-данные операций:', demoDataOperations.length);
} catch (error) {
  console.warn('⚠️ Не удалось загрузить демо-данные операций:', error);
  demoDataOperations = [];
}

// Рабочие данные операций
let operationsData: Operation[] = [];

// Очистка кэша операций для загрузки новых демо-данных
console.log('🧹 Очищаем кэш операций для загрузки новых демо транзакций...');
PersistentStorage.remove('operations');

// Загружаем операции из localStorage или используем демо-данные
try {
  operationsData = PersistentStorage.load<Operation>('operations', demoDataOperations);
  console.log('✅ Загружено операций из PersistentStorage:', operationsData.length);
} catch (error) {
  console.error('❌ Ошибка загрузки операций из localStorage:', error);
  operationsData = demoDataOperations;
}

// Функция для сохранения изменений
const saveOperations = () => {
  PersistentStorage.save('operations', operationsData);
};

/**
 * Сервис операций - чистая версия без встроенных данных
 */
export const operationsService = {
  // === ПОЛУЧЕНИЕ ДАННЫХ ===
  
  /**
   * Получение всех операций с сортировкой по дате
   */
  async getAll(): Promise<Operation[]> {
    return OperationsBusinessLogic.sortOperations(operationsData);
  },

  /**
   * Получение операций с фильтрацией
   */
  async getFiltered(filters: OperationFilters): Promise<Operation[]> {
    const filtered = OperationsBusinessLogic.filterOperations(operationsData, filters);
    return OperationsBusinessLogic.sortOperations(filtered);
  },

  /**
   * Получение операции по ID
   */
  async getById(id: string): Promise<Operation | null> {
    return operationsData.find(op => op.id === id) || null;
  },

  /**
   * Получение статистики операций
   */
  async getStatistics(): Promise<OperationStatistics> {
    return OperationsBusinessLogic.calculateOperationsStatistics(operationsData);
  },

  /**
   * Группировка операций по дате
   */
  async getGroupedByDate(): Promise<Record<string, Operation[]>> {
    return OperationsBusinessLogic.groupOperationsByDate(operationsData);
  },

  // === СОЗДАНИЕ И ИЗМЕНЕНИЕ ===

  /**
   * Создание новой операции
   */
  async create(input: OperationInput): Promise<CreateOperationResponse> {
    try {
      const newOperation = OperationsBusinessLogic.createOperation(input);
      operationsData.unshift(newOperation);
      saveOperations();
      
      return {
        operation: newOperation,
        success: true
      };
    } catch (error) {
      return {
        operation: {} as Operation,
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  },

  /**
   * Обновление операции
   */
  async update(id: string, updates: Partial<Operation>): Promise<UpdateOperationResponse> {
    const index = operationsData.findIndex(op => op.id === id);
    if (index === -1) {
      return {
        operation: null,
        success: false,
        error: 'Операция не найдена'
      };
    }
    
    const updatedOperation = {
      ...operationsData[index],
      ...updates,
      id: operationsData[index].id, // Сохраняем исходный ID
      updatedAt: new Date()
    };

    operationsData[index] = updatedOperation;
    saveOperations();
    
    return {
      operation: updatedOperation,
      success: true
    };
  },

  /**
   * Обновление статуса операции
   */
  async updateStatus(id: string, status: OperationStatus, progress?: number): Promise<UpdateOperationResponse> {
    const index = operationsData.findIndex(op => op.id === id);
    if (index === -1) {
      return {
        operation: null,
        success: false,
        error: 'Операция не найдена'
      };
    }

    const updatedOperation = OperationsBusinessLogic.updateOperationStatus(
      operationsData[index], 
      status, 
      progress
    );

    operationsData[index] = updatedOperation;
    saveOperations();
    
    return {
      operation: updatedOperation,
      success: true
    };
  },

  /**
   * Отмена операции
   */
  async cancel(id: string): Promise<UpdateOperationResponse> {
    const operation = operationsData.find(op => op.id === id);
    if (!operation) {
      return {
        operation: null,
        success: false,
        error: 'Операция не найдена'
      };
    }

    if (!OperationsBusinessLogic.canCancelOperation(operation)) {
      return {
        operation: null,
        success: false,
        error: 'Операцию нельзя отменить в текущем статусе'
      };
    }

    return this.updateStatus(id, 'cancelled');
  },

  /**
   * Удаление операции
   */
  async delete(id: string): Promise<boolean> {
    const index = operationsData.findIndex(op => op.id === id);
    if (index === -1) return false;
    
    operationsData.splice(index, 1);
    saveOperations();
    return true;
  },

  // === УТИЛИТЫ ===

  /**
   * Принудительная перезагрузка данных
   */
  async forceReload(): Promise<void> {
    console.log('🔄 Принудительная перезагрузка операций...');
    operationsData = [...demoDataOperations];
    saveOperations();
  },

  /**
   * Получение доступных методов оплаты для типа операции
   */
  getAvailablePaymentMethods(operationType: OperationType): PaymentMethod[] {
    return OperationsBusinessLogic.getAvailablePaymentMethods(operationType);
  },

  /**
   * Форматирование операции для отображения
   */
  formatForDisplay(operation: Operation) {
    return OperationsBusinessLogic.formatOperationForDisplay(operation);
  },

  /**
   * Валидация входных данных
   */
  validateInput(input: OperationInput) {
    return OperationsBusinessLogic.validateOperationInput(input);
  },

  // === МИГРАЦИЯ ===

  /**
   * Экспорт данных для миграции
   */
  async exportForMigration(): Promise<{
    operations: Operation[];
    count: number;
    exportDate: string;
  }> {
    return {
      operations: operationsData,
      count: operationsData.length,
      exportDate: new Date().toISOString()
    };
  },

  /**
   * Импорт данных после миграции
   */
  async importFromMigration(operations: Operation[]): Promise<boolean> {
    try {
      operationsData = operations;
      saveOperations();
      console.log(`✅ Импортировано ${operations.length} операций после миграции`);
      return true;
    } catch (error) {
      console.error('❌ Ошибка импорта операций:', error);
      return false;
    }
  },

  /**
   * Очистка локальных данных (для перехода на БД)
   */
  async clearLocalData(): Promise<void> {
    operationsData = [];
    PersistentStorage.remove('operations');
    console.log('🧹 Локальные данные операций очищены');
  }
};