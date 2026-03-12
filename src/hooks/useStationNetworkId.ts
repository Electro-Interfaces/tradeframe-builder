/**
 * Хук для определения правильного STS system ID (external_id) сети,
 * к которой принадлежит выбранная торговая точка.
 *
 * Проблема: при мультиселекте сетей selectedNetwork может не совпадать
 * с сетью выбранной точки. Например, primary = ГИГ (65), а точка из БТО (15).
 * Этот хук всегда возвращает external_id сети самой точки.
 */

import { useMemo } from 'react';
import { useSelection } from '@/contexts/SelectionContext';
import { useSelectedNetworks } from '@/hooks/useSelectedNetworks';

export function useStationNetworkId(): string | undefined {
  const { selectedStation, selectedNetwork } = useSelection();
  const { selectedNetworks } = useSelectedNetworks();

  return useMemo(() => {
    // Если у станции есть networkId — ищем её сеть среди выбранных
    if (selectedStation?.networkId) {
      const stationNetwork = selectedNetworks.find(n => n.id === selectedStation.networkId);
      if (stationNetwork?.external_id) {
        return stationNetwork.external_id;
      }
    }

    // Fallback: используем primary сеть
    return selectedNetwork?.external_id;
  }, [selectedStation?.networkId, selectedNetworks, selectedNetwork?.external_id]);
}
