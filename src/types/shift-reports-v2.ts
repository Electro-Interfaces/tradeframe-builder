/**
 * UI типы для страницы "Сменные отчеты 2"
 * Оптимизированы для отображения в интерфейсе
 */

// ============================================
// Базовые типы
// ============================================

/**
 * Статус смены
 */
export type ShiftStatus = 'open' | 'closed' | 'synchronized';

/**
 * Элемент списка смен (для таблицы/журнала)
 */
export interface ShiftListItem {
  /** Уникальный ID смены */
  id: string;

  /** Номер смены */
  shiftNumber: number;

  /** Дата и время открытия смены (ISO 8601) */
  openedAt: string;

  /** Дата и время закрытия смены (ISO 8601), null если смена открыта */
  closedAt: string | null;

  /** Статус смены */
  status: ShiftStatus;

  /** ФИО оператора */
  operator: string;

  /** Номер рабочего места (POS) */
  posNumber: number;

  /** Номер смены (для группировки) */
  shift: number;

  /** Название станции (торговой точки) */
  stationName?: string;

  /** Номер станции в STS API */
  station?: number;

  // ========== Итоговые показатели ==========

  /** Общая выручка (рубли) */
  totalRevenue: number;

  /** Общий отпуск топлива (литры) */
  totalVolume: number;

  /** Количество транзакций (чеков) */
  transactionCount: number;

  // ========== Разбивка по способам оплаты ==========

  /** Выручка наличными (рубли) */
  cashRevenue: number;

  /** Выручка по картам (рубли) */
  cardRevenue: number;

  /** Выручка через СБП (рубли) */
  sbpRevenue: number;

  /** Выручка по топливным картам (рубли) */
  fuelCardRevenue: number;

  /** Выручка по корпоративным картам - КР (рубли) */
  corporateCardRevenue: number;

  /** Прочие способы оплаты (рубли) */
  otherRevenue: number;

  // ========== Флаги и метаданные ==========

  /** Есть разности в резервуарах */
  hasDiscrepancies: boolean;

  /** Средний чек (рубли) */
  averageCheck: number;

  /** Код торговой точки */
  stationCode: number;

  /** Название торговой точки */
  stationName?: string;
}

// ============================================
// Детальная информация о смене
// ============================================

/**
 * Показания счетного механизма (ТРК)
 */
export interface NozzleReading {
  /** Номер ТРК */
  pumpNumber: number;

  /** Номер пистолета (например "1-2") */
  nozzle: string;

  /** Показания на начало смены */
  startCounter: number;

  /** Показания на конец смены */
  endCounter: number;

  /** Расход (литры) */
  volume: number;

  /** Расход (кг) */
  amount: number;

  /** Цена за литр */
  price: number;

  /** Стоимость */
  cost: number;

  /** Код топлива */
  fuelCode: number;

  /** Название топлива */
  fuelName: string;

  /** Номер резервуара */
  tankNumber: number;

  /** Плотность */
  density: number;
}

/**
 * Продажи по топливу
 */
export interface FuelSalesItem {
  /** Код топлива */
  fuelCode: number;

  /** Название топлива */
  fuelName: string;

  /** Количество (литры) */
  quantity: number;

  /** Стоимость (рубли) */
  cost: number;

  /** Масса (кг) */
  amount?: number;
}

/**
 * Продажи по способам оплаты
 */
export interface PaymentSalesItem {
  /** ID типа оплаты */
  paymentTypeId: number;

  /** Название способа оплаты */
  paymentTypeName: string;

  /** Количество (литры) */
  quantity: number;

  /** Стоимость (рубли) */
  cost: number;

  /** Масса (кг) */
  amount?: number;
}

/**
 * Детализированные продажи по топливу и способам оплаты
 * Для таблицы "Расшифровка реализации"
 */
export interface FuelSalesBreakdown {
  /** Код топлива */
  fuelCode: number;

  /** Название топлива */
  fuelName: string;

  /** Прокачка (литры) */
  pumpVolume: number;

  /** По картам (литры) */
  cardVolume: number;

  /** По картам (рубли) */
  cardCost: number;

  /** Скидка (рубли) */
  discountCost: number;

  /** За наличные (литры) */
  cashVolume: number;

  /** За наличные (рубли) */
  cashCost: number;

  /** Безналичные (литры) */
  nonCashVolume: number;

  /** Всего (литры) */
  totalVolume: number;

  /** Разница (литры) */
  difference: number;

  /** Корпоративные (литры) — БАЛТОП, Инфорком, VIAcard, топливные карты */
  corporateVolume?: number;

  /** Корпоративные (рубли) */
  corporateCost?: number;

  /**
   * Детализация по каждому уникальному типу оплаты (ключ — нормализованное название).
   * Используется для построения колонок «БАЛТОП», «Инфорком», «VIAcard», «Мобил.Пр.» и т.д.
   * как на бумажной распечатке АЗС.
   */
  byPayType?: Record<string, {
    displayName: string;
    category: 'cash' | 'card' | 'fuel_card' | 'corporate' | 'online' | 'coupon' | 'other';
    volume: number;
    cost: number;
    discount: number;
  }>;
}

/**
 * Снимок состояния резервуара
 */
export interface TankSnapshot {
  /** Номер резервуара */
  tankNumber: number;

  /** Код топлива */
  fuelCode: number;

  /** Название топлива */
  fuelName: string;

  /** Объем на начало смены (литры) */
  volumeBegin: number;

  /** Объем на конец смены (литры) */
  volumeEnd: number;

  /** Отпуск по ТРК (литры) */
  volumeDispensed: number;

  /** Поступило (литры) */
  volumeReceived: number;

  /** Расчетный остаток (литры) */
  volumeCalculated: number;

  /** Разница (литры) */
  volumeDifference: number;

  /** Есть превышение допустимой разности */
  hasExcessError: boolean;

  /** Уровень (мм) */
  level?: number;

  /** Температура (°C) */
  temperature?: number;

  /** Плотность (г/см³) */
  density?: number;

  /** Уровень воды (см) */
  waterLevel?: number;

  /** Объем воды (литры) */
  waterVolume?: number;
}

/**
 * Поступление нефтепродукта
 */
export interface ReceiptItem {
  /** ID поступления */
  id: string;

  /** Дата и время поступления */
  datetime: string;

  /** Номер резервуара */
  tankNumber: number;

  /** Код топлива */
  fuelCode: number;

  /** Название топлива */
  fuelName: string;

  // ========== По документу ==========

  /** Объем по документу (литры) */
  volume: number;

  /** Масса по документу (кг) */
  amount?: number;

  /** Плотность по документу (г/см3) */
  density?: number;

  /** Температура по документу (°C) */
  temperature?: number;

  // ========== Фактически ==========

  /** Фактический объем (литры) */
  actualVolume?: number;

  /** Фактическая масса (кг) */
  actualAmount?: number;

  /** Фактическая плотность (г/см3) */
  actualDensity?: number;

  /** Фактическая температура (°C) */
  actualTemperature?: number;

  // ========== Метаданные ==========

  /** Номер документа */
  documentNumber?: string;

  /** Поставщик */
  supplier?: string;
}

/**
 * Движение наличных денежных средств
 */
export interface CashMovementItem {
  /** ID записи */
  id: string;

  /** Дата и время операции */
  datetime: string;

  /** Тип операции */
  operationType: 'income' | 'expense' | 'opening' | 'closing';

  /** Сумма (рубли) */
  amount: number;

  /** Описание операции */
  description: string;

  /** Номер POS */
  posNumber?: number;
}

/**
 * Информация о рабочем месте (ПСМ)
 */
export interface PosInfoItem {
  /** Номер рабочего места */
  posNumber: number;

  /** Номер смены */
  shiftNumber: number;

  /** Статус смены */
  shiftStatus: number;

  /** Дата открытия смены */
  shiftOpenedAt?: string;

  /** Дата закрытия смены */
  shiftClosedAt?: string;

  /** Оператор */
  operator?: string;

  /** Время работы системы */
  uptime?: string;

  /** Последнее обновление информации */
  lastUpdate?: string;
}

/**
 * Детальная информация о смене
 */
export interface ShiftDetails extends ShiftListItem {
  // ========== Данные по ПСМ ==========

  /** Информация по рабочим местам */
  posInfo: PosInfoItem[];

  // ========== Показания счетных механизмов (ТРК) ==========

  /** Показания счетных механизмов по пистолетам */
  nozzleReadings: NozzleReading[];

  // ========== Резервуары ==========

  /** Снимки состояния резервуаров */
  tanks: TankSnapshot[];

  // ========== Поступления ==========

  /** Поступления нефтепродуктов */
  receipts: ReceiptItem[];

  // ========== Продажи ==========

  /** Продажи по видам топлива */
  fuelSales: FuelSalesItem[];

  /** Продажи по способам оплаты */
  paymentSales: PaymentSalesItem[];

  /** Детализированные продажи (для расшифровки реализации) */
  salesBreakdown: FuelSalesBreakdown[];

  // ========== Движение наличных ==========

  /** Движение наличных денежных средств */
  cashMovements: CashMovementItem[];

  // ========== Метаданные ==========

  /** Дата создания отчета */
  reportCreatedAt: string;
}

// ============================================
// Фильтры
// ============================================

/**
 * Фильтры для журнала смен
 */
export interface ShiftFilters {
  /** Период: дата начала */
  dateFrom: string;

  /** Период: дата окончания */
  dateTo: string;

  /** Статус смены */
  status: 'all' | ShiftStatus;

  /** ФИО оператора (частичное совпадение) */
  operator?: string;

  /** Номер смены */
  shiftNumber?: number;

  /** Номер POS */
  posNumber?: number;

  /** Код торговой точки */
  stationCode?: number;
}

// ============================================
// KPI метрики
// ============================================

/**
 * KPI показатели по сменам
 */
export interface ShiftKPIMetrics {
  /** Общая выручка по всем сменам (рубли) */
  totalRevenue: number;

  /** Общий отпуск топлива (литры) */
  totalVolume: number;

  /** Количество смен */
  shiftsCount: number;

  /** Средний чек (рубли) */
  averageCheck: number;

  /** Количество транзакций */
  totalTransactions: number;

  /** Средняя выручка на смену (рубли) */
  averageRevenuePerShift: number;

  /** Процент изменения относительно предыдущего периода */
  revenueTrend?: number;

  /** Процент изменения объема относительно предыдущего периода */
  volumeTrend?: number;
}

// ============================================
// Параметры запросов
// ============================================

/**
 * Параметры для получения списка смен
 */
export interface GetShiftsParams {
  /** Код системы */
  system: number;

  /** Код торговой точки (опционально) */
  station?: number;

  /** Дата начала периода */
  dt_beg?: string;

  /** Дата окончания периода */
  dt_end?: string;
}

/**
 * Параметры для получения детальной информации о смене
 */
export interface GetShiftDetailsParams {
  /** Код системы */
  system: number;

  /** Код торговой точки */
  station: number;

  /** Номер смены */
  shift: number;
}
