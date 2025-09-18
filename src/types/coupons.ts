/**
 * Типы данных для работы с купонами (сдача топливом)
 * API: /v1/coupons
 */

// Основной интерфейс купона
export interface Coupon {
  number: string;          // Номер купона (для поиска клиентом)
  dt_beg: string;         // Дата/время выдачи купона (ISO 8601)
  pos: number;            // Номер POS терминала
  shift: number;          // Номер смены (когда выдан)
  opernum: number;        // Номер операции выдачи
  summ_total: number;     // Первоначальная сумма купона (сдача)
  summ_used: number;      // Уже использованная сумма
  dt_end: string | null;  // Дата полного погашения (если есть)
  state: CouponState;     // Текущий статус купона
  rest: number;           // Остаток к использованию

  // Новые поля для топливных купонов (опциональные для совместимости)
  fuel_type?: FuelType;     // Тип топлива
  fuel_price?: number;      // Цена за литр на момент выдачи
  fuel_amount?: number;     // Первоначальное количество литров
  fuel_used?: number;       // Использованное количество литров
  fuel_rest?: number;       // Остаток в литрах
  can_change_fuel?: boolean; // Можно ли поменять тип топлива
  is_unused?: boolean;      // Спец отметка - не было ни одного литра использовано
  expires_at?: string;      // Дата истечения (30 дней с момента выдачи)
}

// Статусы купонов
export type CouponState = "Активен" | "Погашен";

// Типы топлива
export type FuelType = "АИ-92" | "АИ-95" | "АИ-98" | "ДТ" | "ДТ-З";

// Ответ API для одной системы/станции
export interface CouponSystemResponse {
  system: number;           // ID системы (торговой сети)
  number: number;          // ID станции
  coupons: Coupon[];       // Массив купонов
}

// Полный ответ API (массив систем/станций)
export type CouponsApiResponse = CouponSystemResponse[];

// Параметры запроса к API
export interface CouponsApiParams {
  system: number;           // ID системы (обязательно)
  station?: number;         // ID торговой точки (опционально)
  dt_beg?: string;         // Дата начала (ISO 8601, опционально)
  dt_end?: string;         // Дата окончания (ISO 8601, опционально)
}

// Расширенный купон с расчетными полями
export interface CouponWithAge extends Coupon {
  ageInDays: number;        // Возраст купона в днях
  ageInHours: number;       // Возраст купона в часах
  isOld: boolean;           // Старше 7 дней
  isCritical: boolean;      // Старше 30 дней
  priority: CouponPriority; // Приоритет внимания
}

// Приоритеты купонов для мониторинга
export type CouponPriority = 'normal' | 'attention' | 'critical';

// Группа купонов по станции с расчетными данными
export interface CouponsStationGroup {
  systemId: number;         // ID системы
  stationId: number;        // ID станции
  stationName?: string;     // Название станции (если доступно)
  totalDebt: number;        // Общая сумма долга по станции
  activeCouponsCount: number; // Количество активных купонов
  totalCouponsCount: number;  // Общее количество купонов
  oldCouponsCount: number;    // Количество старых купонов (>7 дней)
  criticalCouponsCount: number; // Количество критических (>30 дней)
  coupons: CouponWithAge[]; // Купоны с расчетными данными
}

// Общая статистика по купонам (для карточек)
export interface CouponsStats {
  totalCoupons: number;     // Всего купонов
  activeCoupons: number;    // Активных купонов
  redeemedCoupons: number;  // Погашенных купонов
  totalDebt: number;        // Общая задолженность (остатки)
  totalAmount: number;      // Общая сумма всех купонов
  usedAmount: number;       // Использованная сумма
  averageRest: number;      // Средний остаток на купон
  oldCouponsCount: number;  // Купоны старше 7 дней
  criticalCouponsCount: number; // Купоны старше 30 дней
}

// Фильтры для поиска и фильтрации купонов
export interface CouponsFilter {
  system: number;           // Система (обязательно)
  station?: number;         // Станция (опционально)
  state?: CouponState;      // Статус купона
  dateFrom?: string;        // Дата создания от (ISO 8601)
  dateTo?: string;          // Дата создания до (ISO 8601)
  search?: string;          // Поиск по номеру купона
  minAmount?: number;       // Минимальная сумма остатка
  maxAmount?: number;       // Максимальная сумма остатка
  ageFilter?: 'all' | 'today' | 'week' | 'month' | 'old'; // Фильтр по возрасту
}

// Результат поиска с метаданными
export interface CouponsSearchResult {
  groups: CouponsStationGroup[]; // Группы купонов по станциям
  stats: CouponsStats;           // Общая статистика
  totalFound: number;            // Количество найденных купонов
  appliedFilters: CouponsFilter; // Примененные фильтры
}

// Алерты о проблемных купонах
export interface CouponsAlert {
  type: 'old' | 'critical' | 'large_amount'; // Тип проблемы
  severity: 'warning' | 'error';              // Серьезность
  title: string;                              // Заголовок алерта
  description: string;                        // Описание проблемы
  count: number;                              // Количество проблемных купонов
  totalAmount: number;                        // Общая сумма проблемных купонов
  coupons: CouponWithAge[];                  // Список проблемных купонов
}

// Настройки мониторинга купонов
export interface CouponsMonitoringSettings {
  oldCouponThresholdDays: number;    // Порог "старого" купона (по умолчанию 7)
  criticalCouponThresholdDays: number; // Порог "критического" купона (по умолчанию 30)
  largeAmountThreshold: number;       // Порог "крупной суммы" (по умолчанию 1000)
  enableNotifications: boolean;       // Включить уведомления
}

// Ошибки API
export interface CouponsApiError {
  code: string;
  message: string;
  details?: any;
}

// Состояние загрузки данных
export interface CouponsLoadingState {
  isLoading: boolean;
  error: CouponsApiError | null;
  lastUpdated: string | null;
}