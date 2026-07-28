/**
 * Клиент серверной аналитики (/api/analytics) — готовые агрегаты и
 * пагинированный список операций из материализованной таблицы sts_transactions.
 * Браузер больше не тащит и не суммирует сотни тысяч сырых строк.
 */
import { getBackendOrigin } from '@/utils/backendUrl';
import { getToken } from '@/utils/authStorage';

export interface OverviewKpi { operations: number; volume: number; revenue: number; avgCheck: number; }
export interface OverviewFuel { fuel: string; fuelCode: number; operations: number; volume: number; revenue: number; }
export interface OverviewPayment { method: string; operations: number; volume: number; revenue: number; }
export interface OverviewDay { date: string; operations: number; volume: number; revenue: number; }
export interface OverviewHour { hour: number; operations: number; revenue: number; }
export interface OverviewStation { stationCode: number; operations: number; volume: number; revenue: number; }
/** Ячейка кросс-разреза «вид топлива × способ оплаты» за период */
export interface OverviewFuelPayment { fuel: string; method: string; operations: number; volume: number; revenue: number; }
export interface OverviewResponse {
  kpi: OverviewKpi;
  byFuel: OverviewFuel[];
  byPayment: OverviewPayment[];
  byDay: OverviewDay[];
  byHour: OverviewHour[];
  byStation: OverviewStation[];
  byDayFuel?: { date: string; fuel: string; operations: number; volume: number; revenue: number }[];
  byDayHour?: { date: string; hour: number; operations: number; revenue: number }[];
  byFuelPayment?: OverviewFuelPayment[];
}

export interface ServerOperationRow {
  stsId: number; dt: string; stationCode: number; receipt: number; shift: number;
  pos: number; nozzle: number; tank: number; fuelName: string; fuelCode: number;
  quantity: number; price: number; cost: number; mass: number | null;
  paymentMethod: string; payTypeName: string; card: string; status: string;
  orderQty: number | null; orderCost: number | null;
}
export interface OperationsResponse { total: number; page: number; pageSize: number; rows: ServerOperationRow[]; }

async function apiGet<T>(path: string, params: Record<string, any>): Promise<T> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    qs.set(k, Array.isArray(v) ? v.join(',') : String(v));
  });
  const token = getToken();
  const res = await fetch(`${getBackendOrigin()}/api/analytics/${path}?${qs.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Ошибка ${res.status}`);
  }
  return res.json();
}

export interface OverviewParams { networkIds: string[]; from: string; to: string; stations?: (string | number)[]; }
export function fetchOverview(p: OverviewParams): Promise<OverviewResponse> {
  return apiGet<OverviewResponse>('overview', { networkId: p.networkIds, from: p.from, to: p.to, stations: p.stations });
}

export interface DetailedAnalyticsResponse {
  byStationFuel: { stationCode: number; fuel: string; operations: number; volume: number; revenue: number }[];
  byStationDay: { stationCode: number; date: string; operations: number; volume: number; revenue: number }[];
  byDayPayment: { date: string; method: string; operations: number; revenue: number }[];
}
export function fetchDetailedAnalytics(p: OverviewParams): Promise<DetailedAnalyticsResponse> {
  return apiGet<DetailedAnalyticsResponse>('overview-detailed', { networkId: p.networkIds, from: p.from, to: p.to, stations: p.stations });
}

export interface OperationsParams {
  networkIds: string[]; from: string; to: string;
  fuels?: string[]; payments?: string[]; station?: string | number; stations?: (string | number)[];
  shift?: string | number; receipt?: string | number; pos?: string | number; card?: string;
  search?: string; page?: number; pageSize?: number;
}
export function fetchOperations(p: OperationsParams): Promise<OperationsResponse> {
  return apiGet<OperationsResponse>('operations', {
    networkId: p.networkIds, from: p.from, to: p.to,
    fuels: p.fuels, payments: p.payments, station: p.station, stations: p.stations,
    shift: p.shift, receipt: p.receipt, pos: p.pos, card: p.card,
    search: p.search, page: p.page, pageSize: p.pageSize,
  });
}

export function triggerSync(networkIds: string[]): Promise<{ ok: boolean; synced: number }> {
  const token = getToken();
  return fetch(`${getBackendOrigin()}/api/analytics/sync?networkId=${networkIds.join(',')}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).then(r => r.json());
}

/**
 * Серверная строка → формат, который ожидают таблица/модалка Операций.
 * Держим совместимость со старым STS-форматом (те же имена полей).
 */
export function mapServerRowToOperation(r: ServerOperationRow): any {
  const tsMs = new Date(r.dt).getTime();
  return {
    id: String(r.stsId),
    status: r.status || 'completed',
    toNumber: '4',
    stationNumber: String(r.stationCode ?? ''),
    stationName: undefined,
    startTime: r.dt,
    endTime: undefined,
    tsMs,
    fuelType: r.fuelName || '-',
    actualQuantity: r.quantity || 0,
    quantity: r.quantity || 0,
    price: r.price || 0,
    actualAmount: r.cost || 0,
    totalCost: r.cost || 0,
    paymentMethod: r.paymentMethod || '-',
    posNumber: r.pos != null ? String(r.pos) : '-',
    cardNumber: r.card || '-',
    orderedQuantity: r.orderQty ?? 0,
    orderedAmount: r.orderCost ?? 0,
    shiftNumber: r.shift != null ? String(r.shift) : '-',
    receiptNumber: r.receipt != null ? String(r.receipt) : '-',
    operatorName: '-',
    operationType: 'sale',
    pumpId: r.pos ?? r.nozzle,
    pumpName: `ТРК-${r.pos ?? r.nozzle ?? '?'}`,
    nozzleNumber: r.nozzle != null ? String(r.nozzle) : '-',
    tankNumber: r.tank != null ? String(r.tank) : '-',
    source: 'ANALYTICS_PG',
    isFromStsApi: true,
  };
}
