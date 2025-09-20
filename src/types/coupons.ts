/**
 * Типы данных для работы с купонами (сдача топливом)
 * API: /v1/coupons
 */

// Сервис (топливо) в купоне
export interface CouponService {
  service_code: number;     // Код продукта/услуги
  service_name: string;     // Наименование (АИ-92, АИ-95, АИ-98, ДТ и т.д.)
}

// Состояние купона
export interface CouponState {
  id: number;               // Идентификатор состояния (0 - Активный, 2 - Погашен и т.д.)
  name: string;             // Наименование состояния
}

// Основной интерфейс купона (по реальному API)
export interface Coupon {
  number: string;           // Номер купона
  dt: string;              // Дата создания (ISO 8601)
  pos: number;             // Рабочее место
  shift: number;           // Номер смены
  opernum: number;         // Порядковый номер в пределах смены
  summ_total: number;      // Сумма всего
  qty_total: number;       // Количество всего
  qty_used: number;        // Количество использовано
  summ_used: number;       // Сумма использовано
  price: number;           // Цена
  service: CouponService;  // Информация о продукте/топливе
  state: CouponState;      // Статус талона
  rest_summ: number;       // Остаток суммы
  rest_qty: number;        // Остаток количества
}

// Типы топлива (расширенный список)
export type FuelType = "АИ-92" | "АИ-95" | "АИ-98" | "ДТ" | "ДТ-З";

// Итоговые данные по станции
export interface CouponsTotal {
  active: number;           // Количество активных талонов
  redeem: number;           // Количество погашенных талонов
  expire: number;           // Количество просроченных талонов
}

// Ответ API для одной системы/станции (по реальному API)
export interface CouponSystemResponse {
  system: number;           // Код системы
  number: number;           // Номер торговой точки
  coupons: Coupon[];        // Массив купонов
  total: CouponsTotal;      // Итоговые данные
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
  isActive: boolean;        // Активен ли купон (state.id === 0)
  isRedeemed: boolean;      // Погашен ли купон (state.id === 2)
  isExpired: boolean;       // Истек ли купон
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
  // Новые поля для аналитики
  expiredCoupons: number;   // Просроченные купоны (>7 дней)
  expiredAmount: number;    // Сумма просроченных купонов
  totalFuelDelivered: number; // Общий объем выданного топлива (л)
  expiredFuelLoss: number;  // Потери топлива по просроченным купонам (л)
  utilizationRate: number;  // Процент использования купонов
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