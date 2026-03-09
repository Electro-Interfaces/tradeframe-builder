import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelection } from "@/contexts/SelectionContext";
import { networksService } from "@/services/networksService";
import type { Network } from "@/types/network";

/**
 * Хук для получения Network-объектов всех выбранных сетей.
 * Возвращает массив Network[] и массив external_id для STS API.
 */
export function useSelectedNetworks() {
  const { selectedNetwork, selectedNetworkIds } = useSelection();

  const { data: allNetworks = [] } = useQuery({
    queryKey: ['networks'],
    queryFn: () => networksService.getAll(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const selectedNetworks: Network[] = useMemo(() => {
    if (selectedNetworkIds.length === 0 && selectedNetwork) {
      return [selectedNetwork];
    }
    return allNetworks.filter(n => selectedNetworkIds.includes(n.id));
  }, [allNetworks, selectedNetworkIds, selectedNetwork]);

  const selectedExternalIds: string[] = useMemo(() => {
    return selectedNetworks
      .map(n => n.external_id)
      .filter((id): id is string => Boolean(id));
  }, [selectedNetworks]);

  const isMultiNetwork = selectedNetworkIds.length > 1;

  return { selectedNetworks, selectedExternalIds, isMultiNetwork };
}
