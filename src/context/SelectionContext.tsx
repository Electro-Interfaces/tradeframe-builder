import React, { createContext, useContext, useEffect, useState } from "react";
import { networksService } from "@/services/networksService";
import { userPreferencesService } from "@/services/userPreferencesService";
import { AuthService } from "@/services/authService";
import { Network } from "@/types/network";

type SelectionContextValue = {
  selectedNetwork: Network | null;
  setSelectedNetwork: (networkId: string) => void;
  selectedTradingPoint: string;
  setSelectedTradingPoint: (v: string) => void;
  isAllTradingPoints: boolean;
  isLoading: boolean;
};

const SelectionContext = createContext<SelectionContextValue | undefined>(undefined);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>("");
  const [selectedTradingPoint, setSelectedTradingPoint] = useState<string>("all");
  const [selectedNetwork, setSelectedNetworkState] = useState<Network | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  
  // Загружаем предпочтения пользователя из localStorage (упрощенная версия)
  useEffect(() => {
    async function loadUserPreferences() {
      try {
        setIsLoading(true);
        console.log('🔄 Загружаем предпочтения пользователя из localStorage...');
        
        // Добавляем таймаут, чтобы избежать зависания
        const timeoutId = setTimeout(() => {
          console.warn('⚠️ Таймаут загрузки предпочтений, переходим в упрощенный режим');
          setPreferencesLoaded(true);
          setIsLoading(false);
        }, 3000);
        
        const savedNetwork = localStorage.getItem('selectedNetworkId');
        const savedTradingPoint = localStorage.getItem('selectedTradingPoint');
        
        if (savedNetwork) {
          console.log('✅ Восстановлена сеть из localStorage:', savedNetwork);
          setSelectedNetworkId(savedNetwork);
        }
        
        if (savedTradingPoint) {
          console.log('✅ Восстановлена торговая точка из localStorage:', savedTradingPoint);
          setSelectedTradingPoint(savedTradingPoint);
        } else {
          setSelectedTradingPoint("all");
        }
        
        setPreferencesLoaded(true);
        clearTimeout(timeoutId);
        
      } catch (error) {
        console.error('❌ Ошибка при загрузке предпочтений из localStorage:', error);
        console.error('⚠️ Не удается загрузить предпочтения пользователя - проверьте базу данных!');
        setPreferencesLoaded(true);
        clearTimeout(timeoutId);
      } finally {
        setIsLoading(false);
      }
    }

    loadUserPreferences();
  }, []);
  
  // Загружаем первую доступную сеть если нет сохраненной
  useEffect(() => {
    async function loadDefaultNetwork() {
      if (!selectedNetworkId && preferencesLoaded) {
        try {
          console.log('🔄 Загружаем сети для автовыбора...');
          const networks = await networksService.getAll();
          
          if (networks.length > 0) {
            // Пытаемся найти сеть с external_id = "1", иначе берем первую
            const demoNetwork = networks.find(n => n.external_id === "1");
            const networkToSelect = demoNetwork || networks[0];
            console.log('🎯 Выбираем сеть по умолчанию:', networkToSelect);
            
            setSelectedNetworkId(networkToSelect.id);
            setSelectedTradingPoint("all");
            
            // Сохраняем в базу данных
            await userPreferencesService.setNetworkSelection(networkToSelect.id, "all");
          } else {
            console.warn('⚠️ Не найдено ни одной сети в базе данных');
          }
        } catch (error) {
          console.error('❌ Ошибка загрузки сетей по умолчанию:', error);
        }
      }
    }

    // Добавляем небольшую задержку чтобы дать время preferencesLoaded установиться
    const timer = setTimeout(() => {
      loadDefaultNetwork();
    }, 100);

    return () => clearTimeout(timer);
  }, [selectedNetworkId, preferencesLoaded]);
  
  // Загружаем объект сети по ID
  useEffect(() => {
    async function loadNetworkById() {
      if (selectedNetworkId) {
        try {
          const network = await networksService.getById(selectedNetworkId);
          if (network) {
            setSelectedNetworkState(network);
            console.log('✅ Загружена сеть:', network);
          } else {
            console.warn('⚠️ Сеть не найдена:', selectedNetworkId);
            setSelectedNetworkState(null);
            
            // Если сеть не найдена, загружаем первую доступную
            const networks = await networksService.getAll();
            if (networks.length > 0) {
              console.log('🔄 Переключаем на первую доступную сеть:', networks[0]);
              setSelectedNetworkId(networks[0].id);
            }
          }
        } catch (error) {
          console.error('❌ Ошибка при загрузке сети:', error);
          setSelectedNetworkState(null);
        }
      } else {
        setSelectedNetworkState(null);
      }
    }

    if (preferencesLoaded) {
      loadNetworkById();
    }
  }, [selectedNetworkId, preferencesLoaded]);

  // Упрощенная версия - сохраняем только в localStorage
  const handleSetSelectedNetwork = async (networkId: string) => {
    setSelectedNetworkId(networkId);
    setSelectedTradingPoint("all");
    
    // Сохраняем в localStorage
    localStorage.setItem('selectedNetworkId', networkId);
    localStorage.setItem('selectedTradingPoint', "all");
    console.log('✅ Выбор сети сохранен в localStorage:', networkId);
  };

  // Упрощенная версия - сохраняем только в localStorage
  const handleSetSelectedTradingPoint = async (tradingPointId: string) => {
    setSelectedTradingPoint(tradingPointId);
    
    // Сохраняем в localStorage
    localStorage.setItem('selectedTradingPoint', tradingPointId);
    console.log('✅ Выбор торговой точки сохранен в localStorage:', tradingPointId);
  };

  const isAllTradingPoints = selectedTradingPoint === "all";

  const value: SelectionContextValue = {
    selectedNetwork,
    setSelectedNetwork: handleSetSelectedNetwork,
    selectedTradingPoint,
    setSelectedTradingPoint: handleSetSelectedTradingPoint,
    isAllTradingPoints,
    isLoading,
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

