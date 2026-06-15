/**
 * Типы раздела «Ведомости» — корпоративные клиенты и корпоративные онлайн-заказы ГИГ.
 */

export interface CorporateClient {
  id: string;
  networkId: string;
  networkName?: string;
  name: string;
  inn?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CorporateClientInput {
  networkId: string;
  name: string;
  inn?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  description?: string;
  isActive?: boolean;
}

export type CorporateOrderMode = 'liters' | 'rubles';
export type CorporateOrderStatus =
  | 'draft'
  | 'sent'
  | 'fulfilled'
  | 'partial'
  | 'cancelled'
  | 'failed';

export interface CorporateOrder {
  id: string;
  corporateClientId: string;
  corporateClientName: string;
  networkId: string;
  tradingPointId: string | null;
  stationCode: string;
  stationName?: string;
  fuelCode: number | null;
  fuelName?: string;
  columnNumber: number | null;
  mode: CorporateOrderMode;
  orderedVolume: number;
  orderedAmount: number;
  price: number | null;
  status: CorporateOrderStatus;
  mstoOrderId: string | null;
  mstoSessionId: string | null;
  actualVolume: number;
  actualAmount: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  fulfilledAt: string | null;
  createdBy?: string;
}

export interface CorporateOrderInput {
  corporateClientId: string;
  networkId: string;
  tradingPointId?: string | null;
  stationCode: string;
  stationName?: string;
  fuelCode: number;
  fuelName?: string;
  columnNumber?: number | null;
  mode: CorporateOrderMode;
  quantity: number;
  price?: number | null;
  comment?: string;
}

/** Стандартные виды топлива (service_code STS). Используются в форме заказа. */
export const FUEL_OPTIONS: { code: number; label: string }[] = [
  { code: 2, label: 'АИ-92' },
  { code: 3, label: 'АИ-95' },
  { code: 4, label: 'АИ-98' },
  { code: 5, label: 'ДТ' },
];

export const ORDER_STATUS_LABELS: Record<CorporateOrderStatus, string> = {
  draft: 'Оформлен',
  sent: 'Отправлен',
  fulfilled: 'Исполнен',
  partial: 'Частично',
  cancelled: 'Отменён',
  failed: 'Ошибка',
};
