/**
 * Типы данных для работы со сменами и отчетностью
 * Соответствует API endpoints:
 * - /v1/shifts
 * - /v1/report/receipts
 * - /v1/report/shift_report
 *
 * @see https://pos.autooplata.ru/tms/docs - Swagger документация
 */

// ============================================
// Базовые типы для смен
// ============================================

/**
 * Информация о смене
 */
export interface Shift {
  /** Номер смены */
  number: number;
  /** Состояние смены (0 - закрыта, 1 - открыта) */
  state: number;
  /** Дата и время открытия смены */
  dt_open?: string;
  /** Дата и время закрытия смены */
  dt_close?: string;
}

/**
 * Информация о рабочем месте (ПСМ - пост смены менеджера)
 */
export interface PosInfo {
  /** Номер рабочего места */
  number: number;
  /** Информация о смене */
  shift: Shift;
  /** Список устройств */
  devices?: Device[];
  /** Дата последнего обновления информации */
  dt_info?: string;
  /** Время работы системы */
  uptime?: string;
}

/**
 * Устройство на рабочем месте
 */
export interface Device {
  /** Тип устройства */
  type: number;
  /** Название устройства */
  name: string;
  /** Параметры устройства */
  params: DeviceParam[];
}

/**
 * Параметр устройства
 */
export interface DeviceParam {
  /** Тип параметра */
  type: number;
  /** Название параметра */
  name: string;
  /** Значение параметра */
  value: string;
  /** Тип значения */
  value_type?: number;
}

// ============================================
// Данные по резервуарам
// ============================================

/**
 * Информация о резервуаре
 */
export interface TankInfo {
  /** Номер резервуара */
  number: number;
  /** Код топлива */
  fuel: number;
  /** Наименование топлива */
  fuel_name?: string;
  /** Состояние резервуара */
  state?: number;
  /** Объем на начало смены (литры) */
  volume_begin?: string;
  /** Объем на конец смены (литры) */
  volume_end?: string;
  /** Максимальный объем (литры) */
  volume_max?: string;
  /** Свободный объем (литры) */
  volume_free?: string;
  /** Текущий объем (литры) */
  volume?: string;
  /** Масса на начало смены (кг) */
  amount_begin?: string;
  /** Масса на конец смены (кг) */
  amount_end?: string;
  /** Уровень топлива */
  level?: string;
  /** Вода в резервуаре */
  water?: WaterInfo;
  /** Температура (°C) */
  temperature?: string;
  /** Плотность (г/см³) */
  density?: string;
  /** Реализация (продажи) */
  release?: ReleaseInfo;
  /** Дата замера */
  dt?: string;
}

/**
 * Информация о воде в резервуаре
 */
export interface WaterInfo {
  /** Объем воды (литры) */
  volume?: string;
  /** Масса воды (кг) */
  amount?: string;
  /** Уровень воды */
  level?: string;
}

/**
 * Информация о реализации (продажах)
 */
export interface ReleaseInfo {
  /** Объем реализованного топлива (литры) */
  volume?: string;
  /** Масса реализованного топлива (кг) */
  amount?: string;
}

// ============================================
// Поступления нефтепродуктов
// ============================================

/**
 * Поступление нефтепродукта
 */
export interface FuelReceipt {
  /** Дата и время поступления */
  dt: string;
  /** Номер резервуара */
  tank_number: number;
  /** Код топлива */
  fuel_code: number;
  /** Наименование топлива */
  fuel_name: string;
  /** Объем поступления (литры) */
  volume: number;
  /** Масса поступления (кг) */
  amount?: number;
  /** Документ поступления */
  document?: string;
  /** Поставщик */
  supplier?: string;
}

/**
 * Ответ API на запрос поступлений
 */
export interface ReceiptsResponse {
  /** Код системы */
  system: number;
  /** Идентификатор торговой точки */
  station?: number;
  /** Список поступлений */
  receipts: FuelReceipt[];
}

// ============================================
// Продажи
// ============================================

/**
 * Информация о продажах
 */
export interface SalesInfo {
  /** Количество (литры) */
  quantity: number;
  /** Стоимость (рубли) */
  cost: number;
  /** Масса (кг) */
  amount?: number;
}

/**
 * Итого по топливу
 */
export interface FuelTotal {
  /** Код топлива */
  service_code: number;
  /** Наименование топлива */
  service_name: string;
  /** Реализация (продажи) */
  release: SalesInfo;
}

/**
 * Итого по типу оплаты
 */
export interface PayTypeTotal {
  /** Идентификатор типа оплаты */
  id: number;
  /** Название способа оплаты */
  name?: string;
  /** Реализация (продажи) */
  release: SalesInfo;
}

// ============================================
// Движение наличных
// ============================================

/**
 * Движение наличных денежных средств
 */
export interface CashMovement {
  /** Дата и время операции */
  dt: string;
  /** Тип операции (приход/расход) */
  operation_type: 'income' | 'expense';
  /** Сумма (рубли) */
  amount: number;
  /** Описание операции */
  description?: string;
  /** Номер рабочего места */
  pos?: number;
  /** Номер смены */
  shift?: number;
}

// ============================================
// Сменный отчет (полный)
// ============================================

/**
 * Полный сменный отчет
 * Endpoint: /v1/report/shift_report
 */
export interface ShiftReport {
  /** Код системы */
  system: number;
  /** Идентификатор торговой точки */
  station: number;
  /** Информация о смене */
  shift: Shift;
  /** Информация по рабочим местам (ПСМ) */
  pos_info: PosInfo[];
  /** Данные по резервуарам на конец смены */
  tanks: TankInfo[];
  /** Поступления нефтепродуктов за смену */
  receipts: FuelReceipt[];
  /** Итого по топливу */
  fuel_totals: FuelTotal[];
  /** Итого по типам оплаты */
  payment_totals: PayTypeTotal[];
  /** Движение наличных за смену */
  cash_movements?: CashMovement[];
  /** Дата создания отчета */
  report_date: string;
}

/**
 * Список смен
 * Endpoint: /v1/shifts
 */
export interface ShiftsListResponse {
  /** Код системы */
  system: number;
  /** Идентификатор торговой точки */
  station?: number;
  /** Список смен */
  shifts: Shift[];
}

// ============================================
// Запросы к API
// ============================================

/**
 * Параметры запроса списка смен
 */
export interface ShiftsRequestParams {
  /** Код системы */
  system: number;
  /** Идентификатор торговой точки (опционально) */
  station?: number;
  /** Начальная дата */
  dt_beg?: string;
  /** Конечная дата */
  dt_end?: string;
}

/**
 * Параметры запроса поступлений
 */
export interface ReceiptsRequestParams {
  /** Код системы */
  system: number;
  /** Идентификатор торговой точки */
  station: number;
  /** Начальная дата */
  dt_beg?: string;
  /** Конечная дата */
  dt_end?: string;
}

/**
 * Параметры запроса сменного отчета
 */
export interface ShiftReportRequestParams {
  /** Код системы */
  system: number;
  /** Идентификатор торговой точки */
  station: number;
  /** Номер смены */
  shift_number: number;
}
