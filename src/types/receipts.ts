/**
 * Типы для работы с поступлениями топлива
 * API: /v1/report/receipts
 */

/**
 * Информация о нефтебазе-поставщике
 */
export interface ReceiptBase {
  id: number;
  name: string;
}

/**
 * Документальные данные поступления
 */
export interface ReceiptDocData {
  volume: string;   // Объем в литрах
  amount: string;   // Масса в кг
  density: number;  // Плотность
  temp: number;     // Температура
}

/**
 * Фактические данные поступления
 */
export interface ReceiptFactData {
  volume: string;   // Объем в литрах
  amount: string;   // Масса в кг
  density: number;  // Плотность
  temp: number;     // Температура
}

/**
 * Информация о виде топлива
 */
export interface ReceiptService {
  service_code: number;
  service_name: string;
}

/**
 * Поступление топлива
 */
export interface Receipt {
  tank: number;                    // Номер резервуара
  ttn: string;                     // Номер ТТН (товарно-транспортная накладная)
  base: ReceiptBase;               // Нефтебаза-поставщик
  doc: ReceiptDocData;             // Документальные данные
  fact: ReceiptFactData;           // Фактические данные
  dt: string;                      // Дата и время поступления (ISO 8601)
  service: ReceiptService;         // Вид топлива
}

/**
 * Смена с поступлениями
 */
export interface ReceiptShift {
  number: number;           // Номер смены
  receipt: Receipt[];       // Массив поступлений в смене
}

/**
 * Данные по торговой точке
 */
export interface ReceiptStation {
  system: number;           // ID системы/сети
  number: number;           // Номер торговой точки
  shifts: ReceiptShift[];   // Массив смен
}

/**
 * Ответ API
 */
export type ReceiptsResponse = ReceiptStation[];

/**
 * Параметры запроса к API
 */
export interface ReceiptsQueryParams {
  system: number;           // ID торговой сети (обязательный)
  station?: number;         // Номер ТТ
  shift?: number;           // Номер смены
  dt_beg?: string;          // Дата начала периода (YYYY-MM-DD)
  dt_end?: string;          // Дата окончания периода (YYYY-MM-DD)
}

/**
 * Фильтры для UI
 */
export interface ReceiptsFilters {
  systemId: number | null;           // ID торговой сети
  stationIds: number[];              // Массив ID торговых точек
  fuelTypes: string[];               // Виды топлива (коды)
  dateFrom: Date | null;             // Дата начала
  dateTo: Date | null;               // Дата окончания
  shiftFrom: number | null;          // Смена от
  shiftTo: number | null;            // Смена до
  tankNumber: number | null;         // Номер резервуара
  baseId: number | null;             // ID нефтебазы
  ttnNumber: string;                 // Номер ТТН (с дебаунсом)
}

/**
 * Плоская структура поступления для таблицы
 */
export interface FlatReceipt extends Receipt {
  stationNumber: number;    // Номер ТТ
  shiftNumber: number;      // Номер смены
  volumeDiff: number;       // Разница по объему (факт - док)
  amountDiff: number;       // Разница по массе (факт - док)
  volumeDiffPercent: number; // % отклонения по объему
  amountDiffPercent: number; // % отклонения по массе
}

/**
 * Статистика по поступлениям
 */
export interface ReceiptsStats {
  totalReceipts: number;           // Всего поступлений
  totalVolume: number;             // Общий объем (литры)
  totalAmount: number;             // Общая масса (кг)
  avgVolumeDiff: number;           // Среднее отклонение по объему (%)
  avgAmountDiff: number;           // Среднее отклонение по массе (%)
  byFuelType: {                    // Статистика по видам топлива
    [key: string]: {
      count: number;
      volume: number;
      amount: number;
    };
  };
}
