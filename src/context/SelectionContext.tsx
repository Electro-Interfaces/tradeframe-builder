import React, { createContext, useContext, useEffect, useState } from "react";
import { networksService } from "@/services/networksService";
import { Network } from "@/types/network";

type SelectionContextValue = {
  selectedNetwork: Network | null;
  setSelectedNetwork: (networkId: string) => void;
  selectedTradingPoint: string;
  setSelectedTradingPoint: (v: string) => void;
};

const SelectionContext = createContext<SelectionContextValue | undefined>(undefined);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>("1");
  const [selectedTradingPoint, setSelectedTradingPoint] = useState<string>("");

  // Получаем объект сети по ID
  const [selectedNetwork, setSelectedNetworkState] = useState<Network | null>(null);
  
  useEffect(() => {
    if (selectedNetworkId) {
      networksService.getById(selectedNetworkId)
        .then(network => {
          setSelectedNetworkState(network);
        })
        .catch(error => {
          console.error('Ошибка при загрузке сети:', error);
          setSelectedNetworkState(null);
          // Если сеть не найдена, сбрасываем выбор на первую доступную
          networksService.getAll().then(networks => {
            if (networks.length > 0) {
              console.log('Переключаем на первую доступную сеть:', networks[0]);
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
        
        // Если есть сохраненная сеть, используем её, иначе оставляем "1"
        if (savedNetwork && savedNetwork !== selectedNetworkId) {
          setSelectedNetworkId(savedNetwork);
        }
        
        // Если есть сохраненная торговая точка, используем её
        if (savedTradingPoint) {
          setSelectedTradingPoint(savedTradingPoint);
        }
      } catch (e) {
        console.warn('LocalStorage не доступен:', e);
        // Начальное значение уже "1", ничего менять не нужно
      }
    }
    // На сервере начальное значение уже "1", ничего менять не нужно
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

  const value: SelectionContextValue = {
    selectedNetwork,
    setSelectedNetwork: handleSetSelectedNetwork,
    selectedTradingPoint,
    setSelectedTradingPoint,
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

