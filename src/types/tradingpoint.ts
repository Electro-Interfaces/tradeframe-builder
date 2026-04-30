export type TradingPointId = string;
export type NetworkId = string;

export interface TradingPointGeolocation {
  latitude: number;
  longitude: number;
  region?: string;
  city?: string;
  address?: string;
}

export interface TradingPointSchedule {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
  isAlwaysOpen?: boolean;
  specialScheduleNote?: string;
}

export interface TradingPointServices {
  selfServiceTerminal?: boolean;
  airPump?: boolean;
  waterService?: boolean;
  lubricants?: boolean;
  carWash?: boolean;
  shop?: boolean;
  cafe?: boolean;
  gasBottleExchange?: boolean;
  electricCharging?: boolean;
  truckParking?: boolean;
  other?: string[];
}

/**
 * Пороговые значения для купюроприемника
 * Используются для предупреждений о необходимости инкассации
 */
export interface BillAcceptorThresholds {
  /** Порог количества купюр (шт.) для предупреждения */
  billCountWarning?: number;
  /** Порог количества купюр (шт.) для критического предупреждения */
  billCountCritical?: number;
  /** Порог суммы денег (руб.) для предупреждения */
  cashAmountWarning?: number;
  /** Порог суммы денег (руб.) для критического предупреждения */
  cashAmountCritical?: number;
}

/**
 * Пороговые значения уровня топлива для одного вида топлива
 * Указываются в процентах от объема резервуара
 */
export interface FuelLevelThreshold {
  /** Название вида топлива (ДТ, АИ-92, АИ-95 и т.д.) */
  fuelType: string;
  /** Порог уровня топлива (%) для предупреждения */
  levelWarning?: number;
  /** Порог уровня топлива (%) для критического предупреждения */
  levelCritical?: number;
}

/**
 * Пороговые значения для всех резервуаров станции
 */
export interface FuelLevelThresholds {
  /** Массив порогов по видам топлива */
  thresholds: FuelLevelThreshold[];
}

export interface TradingPointExternalCode {
  id: string;
  system: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface TradingPoint {
  id: TradingPointId;
  external_id?: string; // ID для синхронизации с торговым API
  networkId: NetworkId;
  networkName?: string;       // имя видимой сети (для alias-точек — целевой)
  networkCode?: string;       // код видимой сети
  networkExternalId?: string; // external_id физической сети (= STS system); для alias-точек остаётся родным
  isAlias?: boolean;          // true, если точка показана через network_trading_point_aliases
  name: string;
  description?: string;
  geolocation: TradingPointGeolocation;
  phone?: string;
  email?: string;
  website?: string;
  isBlocked: boolean;
  blockReason?: string;
  schedule?: TradingPointSchedule;
  services?: TradingPointServices;
  billAcceptorThresholds?: BillAcceptorThresholds; // Пороговые значения для купюроприемника
  fuelLevelThresholds?: FuelLevelThresholds; // Пороговые значения для резервуаров
  externalCodes: TradingPointExternalCode[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface TradingPointInput {
  networkId: NetworkId;
  code?: string;
  externalId?: string;
  name: string;
  description?: string;
  geolocation: TradingPointGeolocation;
  phone?: string;
  email?: string;
  website?: string;
  isBlocked?: boolean;
  schedule?: TradingPointSchedule;
  services?: TradingPointServices;
}

/**
 * Тип для обновления торговой точки
 * networkId опционален, т.к. точка уже существует
 */
export interface TradingPointUpdateInput {
  networkId?: NetworkId;
  external_id?: string;
  name: string;
  description?: string;
  geolocation?: Partial<TradingPointGeolocation>;
  phone?: string;
  email?: string;
  website?: string;
  isBlocked?: boolean;
  blockReason?: string;
  schedule?: TradingPointSchedule;
  services?: TradingPointServices;
}

export type TradingPointWithNetwork = TradingPoint & {
  networkName: string;
};