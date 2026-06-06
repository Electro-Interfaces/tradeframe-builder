/**
 * Хук состояния связи/систем одной станции (карточка «Связь» на оборудовании).
 * React Query: кэш + автообновление. null = у станции нет ноды TradeLink.
 */

import { useQuery } from '@tanstack/react-query';
import { getStationConnectivity } from '@/services/tradelinkApi';
import type { StationStatusDetail } from '@/types/stationStatus';

interface UseStationConnectivityOptions {
  enabled?: boolean;
}

export function useStationConnectivity(
  networkExternalId: string | null | undefined,
  stationCode: string | null | undefined,
  options: UseStationConnectivityOptions = {}
) {
  const enabled =
    Boolean(networkExternalId) && Boolean(stationCode) && stationCode !== 'all' && (options.enabled ?? true);

  const query = useQuery({
    queryKey: ['tradelink-station-conn', networkExternalId, stationCode],
    queryFn: ({ signal }) =>
      getStationConnectivity(String(networkExternalId), String(stationCode), signal),
    enabled,
    retry: 1,
    retryDelay: 1000,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  return {
    station: (query.data ?? null) as StationStatusDetail | null,
    loading: query.isLoading,
    isFetching: query.isFetching,
    error: (query.error as Error) ?? null,
    refresh: query.refetch,
  };
}
