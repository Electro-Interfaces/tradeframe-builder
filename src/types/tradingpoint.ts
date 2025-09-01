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