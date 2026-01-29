/**
 * Конфигурация маппингов внешних кодов (external codes)
 * 
 * Используется для связи внутренних сущностей (АЗС, топливо) с внешними системами:
 * - MSTO (агрегатор онлайн-заказов)
 * - FuelUp, Яндекс Заправки и другие агрегаторы
 * - STS API (внутренняя система управления АЗС)
 * - 1C, CRM и другие учётные системы
 * 
 * Для добавления новых маппингов:
 * 1. Добавьте систему в EXTERNAL_SYSTEMS если её нет
 * 2. Добавьте маппинги в STATION_MAPPINGS или FUEL_MAPPINGS
 * 3. Запустите скрипт: npx ts-node scripts/seedExternalCodes.ts
 */

// ============================================================================
// ОПРЕДЕЛЕНИЕ ВНЕШНИХ СИСТЕМ
// ============================================================================

/**
 * Справочник внешних систем
 * Ключ - уникальный код системы (используется в БД)
 */
export const EXTERNAL_SYSTEMS = {
  // Внутренние системы
  sts: {
    name: 'STS API',
    description: 'Внутренняя система управления АЗС (терминалы, резервуары)',
    category: 'internal'
  },
  
  // Агрегаторы онлайн-заказов
  msto: {
    name: 'MSTO',
    description: 'Агрегатор онлайн-заказов топлива (Яндекс, FuelUp и др.)',
    category: 'aggregator'
  },
  fuelup: {
    name: 'FuelUp',
    description: 'Мобильное приложение для заправки',
    category: 'aggregator'
  },
  yandex: {
    name: 'Яндекс Заправки',
    description: 'Сервис Яндекс Заправки',
    category: 'aggregator'
  },
  benzuber: {
    name: 'Benzuber',
    description: 'Сервис Benzuber',
    category: 'aggregator'
  },
  
  // Учётные системы
  '1c': {
    name: '1C',
    description: 'Система 1C:Предприятие',
    category: 'accounting'
  },
  crm: {
    name: 'CRM',
    description: 'CRM система',
    category: 'accounting'
  },
  
  // Процессинговые системы
  processing: {
    name: 'Процессинг',
    description: 'Процессинговая система для карт лояльности',
    category: 'processing'
  }
} as const;

export type ExternalSystemCode = keyof typeof EXTERNAL_SYSTEMS;

// ============================================================================
// МАППИНГИ ДЛЯ ТОРГОВЫХ ТОЧЕК (АЗС)
// ============================================================================

/**
 * Интерфейс маппинга торговой точки
 */
export interface StationMapping {
  /** Код сети (например: 'bto') */
  networkCode: string;
  /** Код станции в STS (external_id торговой точки) */
  stationCode: string;
  /** Название станции (для информации) */
  stationName: string;
  /** Маппинги с внешними системами */
  codes: {
    /** Код системы */
    system: ExternalSystemCode;
    /** Код станции во внешней системе */
    code: string;
    /** Описание (опционально) */
    description?: string;
  }[];
}

/**
 * Маппинги торговых точек с внешними системами
 * 
 * Структура:
 * - networkCode: код сети (из tenant.code)
 * - stationCode: код станции в STS API (external_id)
 * - codes: массив кодов для разных систем
 */
export const STATION_MAPPINGS: StationMapping[] = [
  // ========== БТО (Балтийская Топливная Оптимизация) ==========
  {
    networkCode: 'bto',
    stationCode: '1',
    stationName: 'АКАЗС №1 Непокоренных',
    codes: [
      { system: 'msto', code: '212', description: 'MSTO servicePointId' },
      { system: 'sts', code: '1', description: 'ID станции в STS API' },
      // Добавьте другие системы по необходимости:
      // { system: 'fuelup', code: 'FU-001', description: 'FuelUp ID' },
      // { system: 'yandex', code: 'YA-SPB-001', description: 'Яндекс ID' },
    ]
  },
  {
    networkCode: 'bto',
    stationCode: '2',
    stationName: 'АКАЗС №2 Выборг',
    codes: [
      { system: 'msto', code: '238', description: 'MSTO servicePointId' },
      { system: 'sts', code: '2', description: 'ID станции в STS API' },
    ]
  },
  {
    networkCode: 'bto',
    stationCode: '3',
    stationName: 'АКАЗС №3 Кудрово',
    codes: [
      { system: 'msto', code: '245', description: 'MSTO servicePointId' },
      { system: 'sts', code: '3', description: 'ID станции в STS API' },
    ]
  },
  {
    networkCode: 'bto',
    stationCode: '4',
    stationName: 'АКАЗС №4 Первомайское',
    codes: [
      { system: 'msto', code: '251', description: 'MSTO servicePointId' },
      { system: 'sts', code: '4', description: 'ID станции в STS API' },
    ]
  },
  
  // ========== Пример: другая сеть ==========
  // {
  //   networkCode: 'altra',
  //   stationCode: '101',
  //   stationName: 'АЗС Altra №101',
  //   codes: [
  //     { system: 'msto', code: '300', description: 'MSTO servicePointId' },
  //     { system: '1c', code: 'АЗС-101', description: 'Код в 1C' },
  //   ]
  // },
];

// ============================================================================
// МАППИНГИ ДЛЯ НОМЕНКЛАТУРЫ (ВИДЫ ТОПЛИВА)
// ============================================================================

/**
 * Интерфейс маппинга топлива
 */
export interface FuelMapping {
  /** Код сети */
  networkCode: string;
  /** Внутренний код топлива (internalCode в FuelNomenclature) */
  internalCode: string;
  /** Название топлива (для информации) */
  fuelName: string;
  /** Маппинги с внешними системами */
  codes: {
    /** Код системы */
    system: ExternalSystemCode;
    /** Код топлива во внешней системе */
    code: string;
    /** Описание (опционально) */
    description?: string;
  }[];
}

/**
 * Маппинги видов топлива с внешними системами
 * 
 * Используется для сопоставления:
 * - Кодов топлива в MSTO с внутренними кодами
 * - Кодов в 1C с внутренними кодами
 * - И других систем
 */
export const FUEL_MAPPINGS: FuelMapping[] = [
  // ========== БТО - Виды топлива ==========
  {
    networkCode: 'bto',
    internalCode: 'DT',
    fuelName: 'Дизельное топливо',
    codes: [
      { system: 'msto', code: '1', description: 'Код ДТ в MSTO' },
      { system: 'sts', code: 'DT', description: 'Код ДТ в STS API' },
      { system: '1c', code: '000000001', description: 'Код ДТ в 1C' },
    ]
  },
  {
    networkCode: 'bto',
    internalCode: 'AI92',
    fuelName: 'АИ-92',
    codes: [
      { system: 'msto', code: '2', description: 'Код АИ-92 в MSTO' },
      { system: 'sts', code: 'AI92', description: 'Код АИ-92 в STS API' },
      { system: '1c', code: '000000002', description: 'Код АИ-92 в 1C' },
    ]
  },
  {
    networkCode: 'bto',
    internalCode: 'AI95',
    fuelName: 'АИ-95',
    codes: [
      { system: 'msto', code: '3', description: 'Код АИ-95 в MSTO' },
      { system: 'sts', code: 'AI95', description: 'Код АИ-95 в STS API' },
      { system: '1c', code: '000000003', description: 'Код АИ-95 в 1C' },
    ]
  },
  {
    networkCode: 'bto',
    internalCode: 'AI98',
    fuelName: 'АИ-98',
    codes: [
      { system: 'msto', code: '4', description: 'Код АИ-98 в MSTO' },
      { system: 'sts', code: 'AI98', description: 'Код АИ-98 в STS API' },
      { system: '1c', code: '000000004', description: 'Код АИ-98 в 1C' },
    ]
  },
  {
    networkCode: 'bto',
    internalCode: 'GAS',
    fuelName: 'Газ (пропан)',
    codes: [
      { system: 'msto', code: '5', description: 'Код газа в MSTO' },
      { system: 'sts', code: 'GAS', description: 'Код газа в STS API' },
      { system: '1c', code: '000000005', description: 'Код газа в 1C' },
    ]
  },
  
  // ========== Пример: другая сеть с другими кодами ==========
  // {
  //   networkCode: 'altra',
  //   internalCode: 'DT-WINTER',
  //   fuelName: 'ДТ Зимнее',
  //   codes: [
  //     { system: 'msto', code: '101', description: 'Код зимнего ДТ в MSTO' },
  //     { system: '1c', code: 'FUEL-DT-W', description: 'Код в 1C' },
  //   ]
  // },
];

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

/**
 * Получить все маппинги для конкретной сети
 */
export function getStationMappingsByNetwork(networkCode: string): StationMapping[] {
  return STATION_MAPPINGS.filter(m => m.networkCode === networkCode);
}

/**
 * Получить все маппинги топлива для конкретной сети
 */
export function getFuelMappingsByNetwork(networkCode: string): FuelMapping[] {
  return FUEL_MAPPINGS.filter(m => m.networkCode === networkCode);
}

/**
 * Получить маппинг конкретной станции
 */
export function getStationMapping(networkCode: string, stationCode: string): StationMapping | undefined {
  return STATION_MAPPINGS.find(
    m => m.networkCode === networkCode && m.stationCode === stationCode
  );
}

/**
 * Получить маппинг конкретного вида топлива
 */
export function getFuelMapping(networkCode: string, internalCode: string): FuelMapping | undefined {
  return FUEL_MAPPINGS.find(
    m => m.networkCode === networkCode && m.internalCode === internalCode
  );
}

/**
 * Получить все уникальные коды сетей из маппингов
 */
export function getAllNetworkCodes(): string[] {
  const stationNetworks = STATION_MAPPINGS.map(m => m.networkCode);
  const fuelNetworks = FUEL_MAPPINGS.map(m => m.networkCode);
  return [...new Set([...stationNetworks, ...fuelNetworks])];
}

/**
 * Статистика по маппингам
 */
export function getMappingsStats() {
  const networks = getAllNetworkCodes();
  const systems = new Set<string>();
  
  STATION_MAPPINGS.forEach(m => m.codes.forEach(c => systems.add(c.system)));
  FUEL_MAPPINGS.forEach(m => m.codes.forEach(c => systems.add(c.system)));
  
  return {
    totalNetworks: networks.length,
    totalStations: STATION_MAPPINGS.length,
    totalFuels: FUEL_MAPPINGS.length,
    totalSystems: systems.size,
    networks,
    systems: Array.from(systems)
  };
}
