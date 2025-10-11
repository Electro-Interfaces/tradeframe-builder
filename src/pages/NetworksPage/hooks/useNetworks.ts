import { useState, useEffect, useCallback } from 'react';
import { Network, NetworkInput } from '@/types/network';
import { networksService } from '@/services/networksService';
import { useToast } from '@/hooks/use-toast';

interface UseNetworksReturn {
  networks: Network[];
  loading: boolean;
  actionLoading: string | null;
  selectedNetworkId: string | null;
  selectedNetwork: Network | undefined;
  setSelectedNetworkId: (id: string | null) => void;
  loadNetworks: () => Promise<void>;
  createNetwork: (input: NetworkInput) => Promise<void>;
  updateNetwork: (id: string, input: NetworkInput) => Promise<void>;
  deleteNetwork: (id: string) => Promise<void>;
  searchNetworks: (query: string) => Network[];
}

export function useNetworks(): UseNetworksReturn {
  const { toast } = useToast();
  const [networks, setNetworks] = useState<Network[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedNetworkId, setSelectedNetworkId] = useState<string | null>(null);

  const loadNetworks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await networksService.getAll();
      setNetworks(data);

      // Автовыбор первой сети, если нет выбранной
      if (!selectedNetworkId && data.length > 0) {
        setSelectedNetworkId(data[0].id);
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить список сетей",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [selectedNetworkId, toast]);

  const createNetwork = useCallback(async (input: NetworkInput) => {
    setActionLoading('create');
    try {
      const created = await networksService.create(input);
      setNetworks(prev => [created, ...prev]);

      toast({
        title: "Успешно",
        description: "Сеть создана"
      });

      // Выбираем новую сеть
      setSelectedNetworkId(created.id);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать сеть",
        variant: "destructive"
      });
      throw error;
    } finally {
      setActionLoading(null);
    }
  }, [toast]);

  const updateNetwork = useCallback(async (id: string, input: NetworkInput) => {
    setActionLoading(`update-${id}`);
    try {
      const updated = await networksService.update(id, input);
      if (updated) {
        setNetworks(prev => prev.map(n => n.id === id ? updated : n));

        toast({
          title: "Успешно",
          description: "Сеть обновлена"
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить сеть",
        variant: "destructive"
      });
      throw error;
    } finally {
      setActionLoading(null);
    }
  }, [toast]);

  const deleteNetwork = useCallback(async (id: string) => {
    setActionLoading(`delete-${id}`);
    try {
      await networksService.delete(id);

      // Удаляем из списка
      setNetworks(prev => prev.filter(n => n.id !== id));

      // Сбрасываем выбор, если это была выбранная сеть
      if (selectedNetworkId === id) {
        const remainingNetworks = networks.filter(n => n.id !== id);
        setSelectedNetworkId(remainingNetworks.length > 0 ? remainingNetworks[0].id : null);
      }

      toast({
        title: "Успешно",
        description: "Сеть удалена"
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить сеть",
        variant: "destructive"
      });
      throw error;
    } finally {
      setActionLoading(null);
    }
  }, [selectedNetworkId, networks, toast]);

  const searchNetworks = useCallback((query: string): Network[] => {
    if (!query.trim()) {
      return networks;
    }

    const lowerQuery = query.toLowerCase();
    return networks.filter(network =>
      network.name.toLowerCase().includes(lowerQuery) ||
      network.description?.toLowerCase().includes(lowerQuery) ||
      network.external_id?.toLowerCase().includes(lowerQuery)
    );
  }, [networks]);

  // Загрузка при монтировании
  useEffect(() => {
    loadNetworks();
  }, [loadNetworks]);

  const selectedNetwork = networks.find(n => n.id === selectedNetworkId);

  return {
    networks,
    loading,
    actionLoading,
    selectedNetworkId,
    selectedNetwork,
    setSelectedNetworkId,
    loadNetworks,
    createNetwork,
    updateNetwork,
    deleteNetwork,
    searchNetworks
  };
}
