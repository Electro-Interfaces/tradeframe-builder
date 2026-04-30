/**
 * Хук для определения правильного STS system ID (external_id) сети,
 * к которой принадлежит выбранная торговая точка.
 *
 * Сценарии:
 * 1. Alias-точка (например АКАЗС №2 БТО, показанная в сети ГИГ): backend
 *    кладёт в selectedStation.networkExternalId родной external_id физической
 *    сети (БТО=15) — используем его, чтобы STS получил правильный system.
 * 2. Мультиселект сетей: primary = ГИГ, а выбранная точка из БТО — ищем сеть
 *    точки в selectedNetworks по её networkId.
 * 3. Обычный кейс: одна выбранная сеть — fallback на её external_id.
 */

import { useMemo } from 'react';
import { useSelection } from '@/contexts/SelectionContext';
import { useSelectedNetworks } from '@/hooks/useSelectedNetworks';

export function useStationNetworkId(): string | undefined {
  const { selectedStation, selectedNetwork } = useSelection();
  const { selectedNetworks } = useSelectedNetworks();

  return useMemo(() => {
    // Приоритет 1: точка явно знает свой STS system (alias-точки + новые нативные)
    if (selectedStation?.networkExternalId) {
      return selectedStation.networkExternalId;
    }

    // Приоритет 2 (legacy): ищем сеть точки в выбранных сетях
    if (selectedStation?.networkId) {
      const stationNetwork = selectedNetworks.find(n => n.id === selectedStation.networkId);
      if (stationNetwork?.external_id) {
        return stationNetwork.external_id;
      }
    }

    // Fallback: используем primary сеть
    return selectedNetwork?.external_id;
  }, [
    selectedStation?.networkExternalId,
    selectedStation?.networkId,
    selectedNetworks,
    selectedNetwork?.external_id,
  ]);
}
