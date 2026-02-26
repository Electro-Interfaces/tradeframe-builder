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

  /** Детализация по способам оплаты с разбивкой по топливам (динамический — ключ = тип оплаты из API) */
  paymentDetails: Record<string, PaymentMethodDetails>;
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
 * Определяет цвет топлива по названию (паттерн-матчинг)
 * Работает с любыми названиями: "АИ-92", "Бензин АИ-95", "Диз. топливо", "ДТ зимнее" и т.д.
 */
export function getFuelColor(fuelName: string): string {
  const fuel = fuelName.toLowerCase();

  // АИ-92
  if (fuel.includes('92')) return '#ef4444'; // красный
  // АИ-95
  if (fuel.includes('95')) return '#f97316'; // оранжевый
  // АИ-98
  if (fuel.includes('98')) return '#eab308'; // жёлтый
  // АИ-100
  if (fuel.includes('100')) return '#f59e0b'; // amber
  // ДТ зимнее / Диз. топливо зимн
  if ((fuel.includes('дт') || fuel.includes('диз')) && (fuel.includes('зимн') || fuel.includes('аркт'))) return '#3b82f6'; // синий
  // ДТ летнее / Диз. топливо летн
  if ((fuel.includes('дт') || fuel.includes('диз')) && fuel.includes('летн')) return '#22c55e'; // зелёный
  // ДТ / Дизель / Диз. топливо (общий)
  if (fuel.includes('дт') || fuel.includes('дизель') || fuel.includes('диз') || fuel.includes('diesel')) return '#10b981'; // emerald
  // СУГ / Газ
  if (fuel.includes('суг') || fuel.includes('газ') || fuel.includes('gas') || fuel.includes('lpg')) return '#8b5cf6'; // фиолетовый
  // Бензин (общий, без марки)
  if (fuel.includes('бензин') || fuel.includes('petrol') || fuel.includes('gasoline')) return '#f472b6'; // pink

  // Fallback: генерация стабильного цвета из хеша имени
  return hashColor(fuelName);
}

/**
 * Генерирует стабильный цвет из строки (для неизвестных типов)
 */
function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

/**
 * Определяет цвет способа оплаты по названию (паттерн-матчинг)
 */
export function getPaymentColor(paymentName: string): string {
  const name = paymentName.toLowerCase();

  // Наличные
  if (name.includes('наличн') || name === 'cash') return '#22c55e'; // зелёный
  // Банковские карты / Безнал.электрон
  if (name.includes('безнал') && name.includes('электрон')) return '#3b82f6'; // синий
  // Безнал (обычный)
  if (name === 'безнал' || name === 'безнал.') return '#60a5fa'; // light blue
  // Банковские карты
  if (name.includes('карт') && !name.includes('корп') && !name.includes('топлив')) return '#3b82f6'; // синий
  // СБП
  if (name.includes('сбп') || name === 'sbp') return '#a855f7'; // фиолетовый
  // Топливные карты / НКТ
  if (name.includes('топливн') || name.includes('нкт') || name.includes('fleet')) return '#f97316'; // оранжевый
  // Талоны
  if (name.includes('талон')) return '#f59e0b'; // amber
  // БАЛТОП
  if (name.includes('балтоп')) return '#14b8a6'; // teal
  // Инфорком
  if (name.includes('инфорком')) return '#06b6d4'; // cyan
  // VIAcard / ВИАкард
  if (name.includes('viacard') || name.includes('виакард')) return '#8b5cf6'; // violet
  // МобилПр. / Мобильная оплата
  if (name.includes('мобил')) return '#ec4899'; // pink
  // Корпоративные карты / КР
  if (name === 'кр' || name.includes('корпоратив') || name.includes('корп')) return '#ef4444'; // красный
  // Купоны
  if (name.includes('купон') || name === 'coupon') return '#d97706'; // amber-600
  // Онлайн
  if (name.includes('онлайн') || name.includes('online')) return '#ec4899'; // pink

  // Fallback
  return hashColor(paymentName);
}

/**
 * Названия способов оплаты (legacy)
 * @deprecated Используй paymentTypeName из API напрямую
 */
export const PAYMENT_NAMES: Record<number, string> = {
  1: 'Наличные',
  2: 'Банковская карта',
  3: 'СБП',
  4: 'Топливная карта',
  5: 'Корпоративная карта (КР)',
  99: 'Прочее',
};
