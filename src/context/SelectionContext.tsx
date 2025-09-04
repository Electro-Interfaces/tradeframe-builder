import React, { createContext, useContext, useEffect, useState } from "react";
import { networksService } from "@/services/networksService";
import { Network } from "@/types/network";

type SelectionContextValue = {
  selectedNetwork: Network | null;
  setSelectedNetwork: (networkId: string) => void;
  selectedTradingPoint: string;
  setSelectedTradingPoint: (v: string) => void;
  isAllTradingPoints: boolean;
};

const SelectionContext = createContext<SelectionContextValue | undefined>(undefined);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>("");
  const [selectedTradingPoint, setSelectedTradingPoint] = useState<string>("");

  // Получаем объект сети по ID
  const [selectedNetwork, setSelectedNetworkState] = useState<Network | null>(null);
  
  // Загружаем первую доступную сеть при старте
  useEffect(() => {
    if (!selectedNetworkId) {
      networksService.getAll().then(networks => {
        if (networks.length > 0) {
          // Пытаемся найти сеть с external_id = "1", иначе берем первую
          const demoNetwork = networks.find(n => n.external_id === "1");
          const networkToSelect = demoNetwork || networks[0];
          console.log('🎯 Выбираем сеть при старте:', networkToSelect);
          setSelectedNetworkId(networkToSelect.id);
        }
      }).catch(error => {
        console.error('❌ Ошибка загрузки сетей при старте:', error);
      });
    }
  }, []);
  
  useEffect(() => {
    if (selectedNetworkId) {
      networksService.getById(selectedNetworkId)
        .then(network => {
          setSelectedNetworkState(network);
          console.log('✅ Загружена сеть:', network);
        })
        .catch(error => {
          console.error('❌ Ошибка при загрузке сети:', error);
          setSelectedNetworkState(null);
          // Если сеть не найдена, сбрасываем выбор на первую доступную
          networksService.getAll().then(networks => {
            if (networks.length > 0) {
              console.log('🔄 Переключаем на первую доступную сеть:', networks[0]);
              setSelectedNetworkId(networks[0].id);
            }
          });
        });
    } else {
      setSelectedNetworkState(null);
    }
  }, [selectedNetworkId]);

  // Обертка для setSelectedNetwork, которая сбрасывает торговую точку при смене сети
  const handleSetSelectedNetwork = (networkId: string) => {
    setSelectedNetworkId(networkId);
    // Сбрасываем торговую точку при смене сети
    if (selectedTradingPoint) {
      setSelectedTradingPoint("");
    }
  };

  // Hydrate from localStorage on first mount
  useEffect(() => {
    // Проверяем, что мы в браузере
    if (typeof window !== 'undefined') {
      try {
        const savedNetwork = localStorage.getItem("tc:selectedNetwork");
        const savedTradingPoint = localStorage.getItem("tc:selectedTradingPoint");
        
        // Если есть сохраненная сеть, используем её
        if (savedNetwork && savedNetwork.trim()) {
          console.log('🔄 Восстанавливаем сеть из localStorage:', savedNetwork);
          setSelectedNetworkId(savedNetwork);
        }
        
        // Если есть сохраненная торговая точка, используем её
        if (savedTradingPoint) {
          setSelectedTradingPoint(savedTradingPoint);
        }
      } catch (e) {
        console.warn('⚠️ LocalStorage не доступен:', e);
      }
    }
  }, []); // Убираем зависимость selectedNetworkId

  // Persist to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem("tc:selectedNetwork", selectedNetworkId || "");
      } catch (e) {
        console.warn('Не удалось сохранить в localStorage:', e);
      }
    }
  }, [selectedNetworkId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem("tc:selectedTradingPoint", selectedTradingPoint || "");
      } catch (e) {
        console.warn('Не удалось сохранить в localStorage:', e);
      }
    }
  }, [selectedTradingPoint]);

  const isAllTradingPoints = selectedTradingPoint === "all";

  const value: SelectionContextValue = {
    selectedNetwork,
    setSelectedNetwork: handleSetSelectedNetwork,
    selectedTradingPoint,
    setSelectedTradingPoint,
    isAllTradingPoints,
  };

  return (
    <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
  );
}

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection must be used within SelectionProvider");
  return ctx;
}

