import React, { createContext, useContext, useEffect, useState } from "react";
import { networksStore } from "@/mock/networksStore";
import { Network } from "@/types/network";

type SelectionContextValue = {
  selectedNetwork: Network | null;
  setSelectedNetwork: (networkId: string) => void;
  selectedTradingPoint: string;
  setSelectedTradingPoint: (v: string) => void;
};

const SelectionContext = createContext<SelectionContextValue | undefined>(undefined);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>("");
  const [selectedTradingPoint, setSelectedTradingPoint] = useState<string>("");

  // Получаем объект сети по ID
  const selectedNetwork = selectedNetworkId ? networksStore.getById(selectedNetworkId) || null : null;

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
        const n = localStorage.getItem("tc:selectedNetwork") || "1";
        const p = localStorage.getItem("tc:selectedTradingPoint") || "";
        setSelectedNetworkId(n);
        if (p) setSelectedTradingPoint(p);
      } catch (e) {
        console.warn('LocalStorage не доступен:', e);
        setSelectedNetworkId("1");
      }
    } else {
      // На сервере устанавливаем значения по умолчанию
      setSelectedNetworkId("1");
    }
  }, []);

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

