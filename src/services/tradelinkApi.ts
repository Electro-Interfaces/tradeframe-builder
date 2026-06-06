/**
 * API-клиент карточки «Связь» (IT-состояние станции через TradeLink Hub).
 * Ходит в backend /api/tradelink/* (backend сам проксирует TradeLink Hub).
 */

import { getToken } from '@/utils/authStorage';
import type { StationStatusDetail } from '@/types/stationStatus';

const API_BASE_URL = '/api/tradelink';

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseError(response: Response): Promise<Error> {
  try {
    const payload = await response.json();
    return new Error(payload?.error || payload?.message || response.statusText || 'Request failed');
  } catch {
    return new Error(response.statusText || 'Request failed');
  }
}

/**
 * Состояние одной станции по коду (для карточки «Связь» на странице оборудования).
 * Возвращает null, если у станции нет сопоставленной ноды TradeLink.
 */
export async function getStationConnectivity(
  networkExternalId: string,
  stationCode: string,
  signal?: AbortSignal
): Promise<StationStatusDetail | null> {
  const response = await fetch(
    `${API_BASE_URL}/station-status?networkId=${encodeURIComponent(networkExternalId)}&station=${encodeURIComponent(stationCode)}`,
    { headers: authHeaders(), signal }
  );
  if (!response.ok) throw await parseError(response);
  return response.json();
}
