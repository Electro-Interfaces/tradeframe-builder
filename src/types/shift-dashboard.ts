/**
 * Типы для дашборда аналитики сменных отчетов
 * Агрегированные метрики, тренды и данные для визуализации
 */

import { ShiftDetails, FuelSalesItem, PaymentSalesItem, TankSnapshot } from './shift-reports-v2';

// ============================================
// Параметры периода
// ============================================

/**
 * Тип пресета периода
 */
export type PeriodPreset = 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'custom';

/**
 * Параметры выбора периода
 */
export interface PeriodSelection {
  /** Тип пресета */
  preset: PeriodPreset;

  /** Дата начала периода */
  dateFrom: string;

  /** Дата окончания периода */
  dateTo: string;

  /** Включить сравнение с предыдущим периодом */
  compareEnabled: boolean;

  /** Дата начала периода сравнения */
  compareDateFrom?: string;

  /** Дата окончания периода сравнения */
  compareDateTo?: string;
}

/**
 * Параметры запроса данных дашборда
 */
export interface DashboardParams {
  /** Код системы */
  system: number;

  /** Код торговой точки (опционально, если "все точки") */
  station?: number;

  /** Массив кодов торговых точек (для фильтрации нескольких) */
  stations?: number[];

  /** Маппинг кодов станций на их названия (stationCode -> stationName) */
  stationNames?: Record<number, string>;

  /** Выбранный период */
  period: PeriodSelection;
}

// ============================================
// KPI метрики
// ============================================

/**
 * Разбивка по топливу для способа оплаты
 */
export interface PaymentFuelBreakdown {
  /** Код топлива */
  fuelCode: number;
  /** Название топлива */
  fuelName: string;
  /** Выручка */
  revenue: number;
  /** Объем */
  volume: number;
  /** Цвет */
  color?: string;
}

/**
 * Детализация способа оплаты
 */
export interface PaymentMethodDetails {
  /** Общая выручка */
  revenue: number;
  /** Общий объем */
  volume: number;
  /** Разбивка по топливам */
  byFuel: PaymentFuelBreakdown[];
}

/**
 * Финансовые метрики
 */
export interface FinancialMetrics {
  /** Общая выручка (рубли) */
  totalRevenue: number;

  /** Средний чек (рубли) */
  averageCheck: number;

  /** Выручка наличными */
  cashRevenue: number;

  /** Выручка по картам */
  cardRevenue: number;

  /** Выручка СБП */
  sbpRevenue: number;

  /** Выручка по топливным картам */
  fuelCardRevenue: number;

  /** Выручка по корпоративным картам */
  corporateCardRevenue: number;

  /** Прочая выручка */
  otherRevenue: number;

  /** Детализация по способам оплаты с разбивкой по топливам */
  paymentDetails: {
    cash: PaymentMethodDetails;
    card: PaymentMethodDetails;
    online: PaymentMethodDetails;
    corporate: PaymentMethodDetails;
    coupon: PaymentMethodDetails;
  };
}

/**
 * Поступление по ТТН (детализация)
 */
export interface ReceiptTTNItem {
  /** Номер ТТН */
  ttn: string;
  /** Дата поступления */
  datetime: string;
  /** Номер резервуара */
  tankNumber: number;
  /** Код топлива */
  fuelCode: number;
  /** Название топлива */
  fuelName: string;
  /** Объем по документу (л) */
  docVolume: number;
  /** Масса по документу (кг) */
  docAmount: number;
  /** Плотность по документу */
  docDensity: number;
  /** Объем фактически (л) */
  factVolume: number;
  /** Масса фактически (кг) */
  factAmount: number;
  /** Плотность фактически */
  factDensity: number;
  /** Разница объема (л) */
  volumeDiff: number;
  /** Разница массы (кг) */
  amountDiff: number;
  /** Нефтебаза */
  baseName: string;
  /** Номер смены */
  shiftNumber: number;
  /** Код станции */
  stationCode?: number;
  /** Название станции */
  stationName?: string;
  /** Цвет топлива */
  color?: string;
}

/**
 * Агрегация поступлений по топливу
 */
export interface ReceiptsByFuel {
  /** Код топлива */
  fuelCode: number;
  /** Название топлива */
  fuelName: string;
  /** Объем по документу (л) */
  docVolume: number;
  /** Объем фактически (л) */
  factVolume: number;
  /** Разница (л) */
  volumeDiff: number;
  /** Количество ТТН */
  ttnCount: number;
  /** Цвет */
  color?: string;
}

/**
 * Метрики поступлений
 */
export interface ReceiptsMetrics {
  /** Общий объем поступлений по документу (л) */
  totalDocVolume: number;
  /** Общий объем поступлений фактически (л) */
  totalFactVolume: number;
  /** Общая разница (л) */
  totalDiff: number;
  /** Количество ТТН */
  ttnCount: number;
  /** По топливам */
  byFuel: ReceiptsByFuel[];
  /** Детализация по ТТН */
  details: ReceiptTTNItem[];
}

// ============================================
// Движение наличных
// ============================================

/**
 * Операция движения наличных
 */
export interface CashFlowItem {
  /** ID записи */
  id: string;
  /** Дата и время операции */
  datetime: string;
  /** Тип операции */
  operationType: 'income' | 'expense' | 'opening' | 'closing';
  /** Сумма (₽) */
  amount: number;
  /** Описание операции */
  description: string;
  /** Номер POS */
  posNumber?: number;
  /** Номер смены */
  shiftNumber?: number;
  /** Код станции */
  stationCode?: number;
}

/**
 * Метрики движения наличных
 */
export interface CashFlowMetrics {
  /** Остаток на начало периода (₽) */
  openingBalance: number;
  /** Приход наличных за период (₽) */
  totalIncome: number;
  /** Расход наличных за период (₽) */
  totalExpense: number;
  /** Остаток на конец периода (₽) */
  closingBalance: number;
  /** Расчетный остаток (открытие + приход - расход) (₽) */
  calculatedBalance: number;
  /** Разница (фактический - расчетный) (₽) */
  difference: number;
  /** Количество операций */
  operationsCount: number;
  /** Детализация операций */
  details: CashFlowItem[];
}

// ============================================
// Инкассация
// ============================================

/**
 * Запись инкассации для дашборда
 */
export interface CashoutItem {
  /** Номер смены */
  shiftNumber: number;
  /** Номер POS */
  posNumber: number;
  /** Номер инкассации в смене */
  cashoutNumber: number;
  /** Дата и время */
  datetime: string;
  /** Общая сумма (₽) */
  totalAmount: number;
  /** Сумма купюр (₽) */
  billAmount: number;
}

/**
 * Метрики инкассации
 */
export interface CashoutMetrics {
  /** Общая сумма инкассаций (₽) */
  totalAmount: number;
  /** Сумма купюр (₽) */
  totalBillAmount: number;
  /** Количество инкассаций */
  count: number;
  /** Детализация по инкассациям */
  details: CashoutItem[];
}

/**
 * Объемные метрики
 */
export interface VolumeMetrics {
  /** Общий объем (литры) */
  totalVolume: number;

  /** Объем по топливам */
  byFuel: FuelVolumeItem[];

  /** Поступления (литры) */
  totalReceipts: number;

  /** Расход резервуаров (литры) */
  tankDispensed: number;
}

/**
 * Операционные метрики
 */
export interface OperationalMetrics {
  /** Количество смен */
  shiftsCount: number;

  /** Количество транзакций */
  transactionCount: number;

  /** Средняя продолжительность смены (часы) */
  averageShiftDuration: number;

  /** Количество открытых смен */
  openShiftsCount: number;

  /** Количество смен с разницами в резервуарах */
  shiftsWithDiscrepancies: number;
}

/**
 * Полный набор KPI метрик
 */
export interface DashboardKPIs {
  financial: FinancialMetrics;
  volume: VolumeMetrics;
  operational: OperationalMetrics;
  receipts: ReceiptsMetrics;
  cashout: CashoutMetrics;
  cashFlow: CashFlowMetrics;
}

// ============================================
// Тренды
// ============================================

/**
 * Тренд метрики (изменение относительно предыдущего периода)
 */
export interface TrendValue {
  /** Значение текущего периода */
  current: number;

  /** Значение предыдущего периода */
  previous: number;

  /** Абсолютное изменение */
  delta: number;

  /** Процентное изменение */
  percentChange: number;

  /** Направление тренда */
  direction: 'up' | 'down' | 'neutral';
}

/**
 * Тренды основных метрик
 */
export interface DashboardTrends {
  /** Тренд выручки */
  revenue: TrendValue;

  /** Тренд объема */
  volume: TrendValue;

  /** Тренд количества смен */
  shifts: TrendValue;

  /** Тренд среднего чека */
  averageCheck: TrendValue;

  /** Тренд транзакций */
  transactions: TrendValue;
}

// ============================================
// Данные для графиков
// ============================================

/**
 * Данные по дням для графиков
 */
export interface DailyDataPoint {
  /** Дата (ISO 8601) */
  date: string;

  /** Выручка за день */
  revenue: number;

  /** Объем за день */
  volume: number;

  /** Количество смен */
  shiftsCount: number;

  /** Количество транзакций */
  transactionCount: number;

  /** Средний чек */
  averageCheck: number;

  /** Выручка по способам оплаты */
  cashRevenue: number;
  cardRevenue: number;
  sbpRevenue: number;
  fuelCardRevenue: number;
  corporateCardRevenue: number;
  otherRevenue: number;
}

/**
 * Элемент данных по топливу
 */
export interface FuelVolumeItem {
  /** Код топлива */
  fuelCode: number;

  /** Название топлива */
  fuelName: string;

  /** Объем (литры) */
  volume: number;

  /** Выручка (рубли) */
  revenue: number;

  /** Процент от общего объема */
  percentOfTotal: number;

  /** Цвет для графика */
  color?: string;
}

/**
 * Элемент данных по способу оплаты
 */
export interface PaymentMethodItem {
  /** ID типа оплаты */
  paymentTypeId: number;

  /** Название способа оплаты */
  paymentTypeName: string;

  /** Выручка (рубли) */
  revenue: number;

  /** Объем (литры) */
  volume: number;

  /** Процент от общей выручки */
  percentOfTotal: number;

  /** Цвет для графика */
  color?: string;
}

/**
 * Элемент данных по резервуару
 */
export interface TankUsageItem {
  /** Номер резервуара */
  tankNumber: number;

  /** Код топлива */
  fuelCode: number;

  /** Название топлива */
  fuelName: string;

  /** Начальный объем (литры) */
  volumeBegin: number;

  /** Конечный объем (литры) */
  volumeEnd: number;

  /** Отпущено (литры) */
  dispensed: number;

  /** Поступило (литры) */
  received: number;

  /** Разница (литры) */
  difference: number;

  /** Есть превышение допустимой разности */
  hasExcessError: boolean;
}

/**
 * Данные для всех графиков
 */
export interface ChartData {
  /** Данные по дням */
  daily: DailyDataPoint[];

  /** Данные по топливам */
  byFuel: FuelVolumeItem[];

  /** Данные по способам оплаты */
  byPayment: PaymentMethodItem[];

  /** Данные по резервуарам */
  byTank: TankUsageItem[];
}

// ============================================
// Агрегации для детализации
// ============================================

/**
 * Агрегация по торговой точке
 */
export interface PointAggregation {
  /** Код станции */
  stationCode: number;

  /** Название станции */
  stationName: string;

  /** Количество смен */
  shiftsCount: number;

  /** Общая выручка */
  totalRevenue: number;

  /** Общий объем */
  totalVolume: number;

  /** Количество транзакций */
  transactionCount: number;

  /** Средний чек */
  averageCheck: number;

  /** Процент от общей выручки */
  revenuePercent: number;

  /** Процент от общего объема */
  volumePercent: number;
}

/**
 * Агрегация по смене
 */
export interface ShiftAggregation {
  /** ID смены */
  shiftId: string;

  /** Номер смены */
  shiftNumber: number;

  /** Код станции */
  stationCode: number;

  /** Название станции */
  stationName?: string;

  /** Дата открытия */
  openedAt: string;

  /** Дата закрытия */
  closedAt: string | null;

  /** Оператор */
  operator: string;

  /** Выручка */
  revenue: number;

  /** Объем */
  volume: number;

  /** Количество транзакций */
  transactionCount: number;

  /** Средний чек */
  averageCheck: number;

  /** Есть расхождения */
  hasDiscrepancies: boolean;
}

/**
 * Агрегация по типу топлива
 */
export interface FuelAggregation {
  /** Код топлива */
  fuelCode: number;

  /** Название топлива */
  fuelName: string;

  /** Общий объем */
  totalVolume: number;

  /** Общая выручка */
  totalRevenue: number;

  /** Средняя цена за литр */
  averagePrice: number;

  /** Количество транзакций */
  transactionCount: number;

  /** Процент от общего объема */
  volumePercent: number;

  /** Процент от общей выручки */
  revenuePercent: number;
}

/**
 * Детализация для таблиц
 */
export interface DetailsData {
  /** По торговым точкам */
  byPoint: PointAggregation[];

  /** По сменам */
  byShift: ShiftAggregation[];

  /** По топливам */
  byFuel: FuelAggregation[];
}

// ============================================
// Итоговый тип данных дашборда
// ============================================

/**
 * Полные данные дашборда
 */
export interface DashboardData {
  /** KPI метрики */
  kpis: DashboardKPIs;

  /** Тренды (если включено сравнение) */
  trends?: DashboardTrends;

  /** Данные для графиков */
  charts: ChartData;

  /** Детализация */
  details: DetailsData;

  /** Исходные смены (для drill-down) */
  shifts: ShiftDetails[];

  /** Метаданные */
  meta: {
    /** Период */
    period: PeriodSelection;

    /** Количество загруженных смен */
    shiftsLoaded: number;

    /** Время генерации отчета */
    generatedAt: string;

    /** Выбранные станции */
    stations?: number[];
  };
}

// ============================================
// Конфигурация визуализации
// ============================================

/**
 * Цвета для топлив
 */
export const FUEL_COLORS: Record<number, string> = {
  1: '#ef4444', // АИ-92 - красный
  2: '#f97316', // АИ-95 - оранжевый
  3: '#eab308', // АИ-98 - желтый
  4: '#22c55e', // ДТ - зеленый
  5: '#3b82f6', // ДТ Зимнее - синий
  6: '#8b5cf6', // СУГ - фиолетовый
};

/**
 * Цвета для способов оплаты
 */
export const PAYMENT_COLORS: Record<number, string> = {
  1: '#22c55e', // Наличные - зеленый
  2: '#3b82f6', // Карта - синий
  3: '#8b5cf6', // СБП - фиолетовый
  4: '#f97316', // Топливная карта - оранжевый
  5: '#ef4444', // Корпоративная карта - красный
  99: '#64748b', // Прочее - серый
};

/**
 * Названия способов оплаты
 */
export const PAYMENT_NAMES: Record<number, string> = {
  1: 'Наличные',
  2: 'Банковская карта',
  3: 'СБП',
  4: 'Топливная карта',
  5: 'Корпоративная карта (КР)',
  99: 'Прочее',
};
