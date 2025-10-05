/**
 * Типы для работы с поступлениями нефтепродуктов
 */

/**
 * Элемент списка поступлений
 */
export interface ReceiptItem {
  /** ID поступления */
  id: string;

  /** Дата и время поступления (ISO 8601) */
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

  /** Плотность по документу (г/см³) */
  density?: number;

  /** Температура по документу (°C) */
  temperature?: number;

  // ========== Фактически ==========

  /** Фактический объем (литры) */
  actualVolume?: number;

  /** Фактическая масса (кг) */
  actualAmount?: number;

  /** Фактическая плотность (г/см³) */
  actualDensity?: number;

  /** Фактическая температура (°C) */
  actualTemperature?: number;

  // ========== Метаданные ==========

  /** Номер документа */
  documentNumber?: string;

  /** Поставщик */
  supplier?: string;

  /** Разница между фактом и документом (л) */
  difference?: number;
}

/**
 * Параметры запроса списка поступлений
 */
export interface GetReceiptsParams {
  /** Код системы */
  system: number;

  /** Код торговой точки */
  station: number;

  /** Номер смены */
  shift: number;
}

/**
 * Фильтры для поступлений
 */
export interface ReceiptsFilters {
  /** Дата начала периода */
  dateFrom?: string;

  /** Дата окончания периода */
  dateTo?: string;

  /** Фильтр по топливу */
  fuelCode?: number;

  /** Фильтр по резервуару */
  tankNumber?: number;

  /** Фильтр по поставщику */
  supplier?: string;
}
