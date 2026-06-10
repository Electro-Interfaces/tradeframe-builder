/**
 * Типы MSTO IntegratorService API
 *
 * Базовые типы данных MSTO (транзакции, станции, тарифы), используемые
 * клиентом mstoProxyClient и сервисом онлайн-заказов.
 */

// ============================================
// Типы транзакций MSTO
// ============================================

/**
 * Статус операции MSTO
 */
export type MSTOOperationResult = 'success' | 'wait' | 'error' | 'cancel';

/**
 * Транзакция MSTO IntegratorService
 */
export interface MSTOTransaction {
  id: number;
  externalId: string;           // ID заказа из агрегатора
  servicePointId: number;       // ID станции в MSTO
  servicePointName?: string;    // Название станции
  tariffId: number;             // ID тарифа (агрегатора)
  tariffName?: string;          // Название агрегатора (Яндекс, FuelUp и др.)
  fuelName: string;             // Название топлива
  orderDate: string;            // ISO datetime - дата заказа
  completedAt?: string;         // ISO datetime - дата завершения
  orderSum: number;             // Заказанная сумма (рубли)
  orderValue: number;           // Заказанный объем (литры)
  resultSum: number;            // Фактическая сумма (рубли)
  resultValue: number;          // Фактический объем (литры)
  operationResult: MSTOOperationResult; // Статус операции
  price: number;                // Цена за литр
  columnNumber?: number;        // Номер колонки
  nozzleNumber?: number;        // Номер пистолета
}

/**
 * Точка обслуживания MSTO (станция)
 */
export interface MSTOServicePoint {
  id: number;
  name: string;
  address?: string;
  externalId?: string;          // ID во внешней системе
  isActive: boolean;
}

/**
 * Тариф MSTO (агрегатор)
 */
export interface MSTOTariff {
  id: number;
  name: string;                 // Название агрегатора (Яндекс, FuelUp и др.)
  isActive: boolean;
}

// ============================================
// API ответы
// ============================================

/**
 * Ответ API MSTO - список транзакций
 */
export interface MSTOTransactionsResponse {
  success: boolean;
  count: number;
  transactions: MSTOTransaction[];
}

/**
 * Ответ API MSTO - список станций
 */
export interface MSTOServicePointsResponse {
  success: boolean;
  servicePoints: MSTOServicePoint[];
}

/**
 * Ответ API MSTO - список тарифов
 */
export interface MSTOTariffsResponse {
  success: boolean;
  tariffs: MSTOTariff[];
}
