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
  externalCodes: TradingPointExternalCode[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface TradingPointInput {
  networkId: NetworkId;
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

export interface TradingPointUpdateInput extends TradingPointInput {
  isBlocked?: boolean;
  blockReason?: string;
}

export type TradingPointWithNetwork = TradingPoint & {
  networkName: string;
};