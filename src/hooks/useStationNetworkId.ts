/**
 * Хук для определения правильного STS system ID (external_id) сети,
 * к которой принадлежит выбранная торговая точка.
 *
 * Для alias-точек backend подменяет networkId на целевую сеть (ГИГ),
 * поэтому здесь хук вернёт external_id целевой сети (65). Дальнейшую
 * подмену на физический system (БТО=15) делает stsProxyService прозрачно.
 *
 * При мультиселекте сетей: primary = одна сеть, выбранная точка — из другой.
 * Хук находит сеть точки среди выбранных, чтобы запрос ушёл с правильным system.
 */

import { useMemo } from 'react';
import { useSelection } from '@/contexts/SelectionContext';
import { useSelectedNetworks } from '@/hooks/useSelectedNetworks';

export function useStationNetworkId(): string | undefined {
  const { selectedStation, selectedNetwork } = useSelection();
  const { selectedNetworks } = useSelectedNetworks();

  return useMemo(() => {
    if (selectedStation?.networkId) {
      const stationNetwork = selectedNetworks.find(n => n.id === selectedStation.networkId);
      if (stationNetwork?.external_id) {
        return stationNetwork.external_id;
      }
    }

    return selectedNetwork?.external_id;
  }, [selectedStation?.networkId, selectedNetworks, selectedNetwork?.external_id]);
}
