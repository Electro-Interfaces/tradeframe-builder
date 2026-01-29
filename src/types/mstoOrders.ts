/**
 * Типы для MSTO Orders API
 * API для детальной истории заказов с timeline
 */

/**
 * Статус заказа
 */
export interface MSTOOrderStatus {
  code: number;
  name: string;
  displayName: string;
}

/**
 * Детали заказа из JSON агента
 */
export interface MSTOOrderDetails {
  Status: string;
  Id: string;
  DateCreate: string;
  DateEnd?: string;
  OrderType: 'Money' | 'Liters';
  OrderVolume: number;
  StationId: string;
  StationExtendedId: string;
  ColumnId: number;
  FuelId: string;
  FuelMarka: string;
  PriceFuel: number;
  Sum: number;
  Litre: number;
  SumPaid: number;
  SumPaidCard: number;
  SumPaidCoupon: number;
  LitreCompleted?: number;
  SumPaidCompleted?: number;
  SumPaidCardCompleted?: number;
  SumPaidCouponCompleted?: number;
  UserEmail?: string;
  UserPhone?: string;
  ContractId?: string;
  // Причина ошибки/отмены
  Reason?: string;
  ReasonId?: string;
}

/**
 * Информация о заказе
 */
export interface MSTOOrderInfo {
  id: number;
  orderId: string;
  dateTime: number;           // timestamp ms
  status: number;
  statusName: string;
  error: string | null;
  errorCode: string | null;
  details: MSTOOrderDetails;
  agentName: string;
  stationName: string;
}

/**
 * Действие по заказу (этап обработки)
 */
export interface MSTOOrderAction {
  id: number;
  dateTime: number;           // timestamp ms
  requestType: number;        // 0=test, 1=live
  requestTypeName: string;    // "test" | "live"
  operationResult: number;    // 1=error, 2=success, 3=wait
  operationResultName: string;
  servicePointStatus: number;
  sum: number;
  quantity: number;
  price: number;
  errorCode: string | null;
}

/**
 * Финальный результат заказа
 */
export interface MSTOOrderFinish {
  id: number;
  dateTime: number;           // timestamp ms
  orderSum: number;
  resultSum: number;
  resultQuantity: number;
  refundSum: number;
  error: string | null;
}

/**
 * Событие timeline
 */
export interface MSTOTimelineEvent {
  time: number;               // timestamp ms
  event: string;              // order_created, action_test, action_live, finish
  label: string;              // Человекочитаемое название
  details: string | null;     // Дополнительные детали
  isError: boolean;
}

/**
 * Полный ответ /orders/details
 */
export interface MSTOOrderDetailsResponse {
  sessionId: string;
  order: MSTOOrderInfo;
  actions: MSTOOrderAction[];
  finish: MSTOOrderFinish | null;
  timeline: MSTOTimelineEvent[];
}

/**
 * Заказ в списке /orders/history
 */
export interface MSTOOrderHistoryItem {
  id: number;
  orderId: string;
  sessionId: string;
  status: string;
  statusName: string;
  dateTime: number;           // timestamp ms
  agentId: number;
  agentName: string;
  stationId: string;
  stationName: string;
  columnId: number;
  fuelMarka: string;
  litre: number;
  priceFuel: number;
  sum: number;
  userPhone: string;
  userEmail: string;
  contractId: string;
  error: string | null;
  isSentToAgent: boolean;
  json?: string;
}

/**
 * Ответ /orders/history с пагинацией
 */
export interface MSTOOrderHistoryResponse {
  content: MSTOOrderHistoryItem[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    offset: number;
  };
  totalPages: number;
  totalElements: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  size: number;
  number: number;
  empty: boolean;
}

/**
 * Параметры запроса /orders/history
 */
export interface MSTOOrderHistoryParams {
  page?: number;
  size?: number;
  dateFrom?: string;          // yyyy-MM-dd или yyyy-MM-dd HH:mm:ss
  dateTo?: string;
  status?: number;
  agentId?: number;
  servicePointId?: number;
  userPhone?: string;
  orderId?: string;
}
