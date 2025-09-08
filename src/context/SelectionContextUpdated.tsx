import React, { createContext, useContext, useEffect, useState } from "react";
import { networksService } from "@/services/networksService";
import { userPreferencesService } from "@/services/userPreferencesService";
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
  
  // Загружаем предпочтения пользователя из базы данных
  useEffect(() => {
    async function loadUserPreferences() {
      try {
        setIsLoading(true);
        console.log('🔄 Загружаем предпочтения пользователя из базы данных...');
        
        // Пробуем загрузить из базы данных
        const savedNetwork = await userPreferencesService.getSelectedNetwork();
        const savedTradingPoint = await userPreferencesService.getSelectedTradingPoint();
        
        if (savedNetwork) {
          console.log('✅ Восстановлена сеть из базы данных:', savedNetwork);
          setSelectedNetworkId(savedNetwork);
        } else {
          console.log('⚠️ Сохраненная сеть не найдена в базе, проверяем localStorage...');
          
          // Fallback на localStorage для миграции старых данных
          const localNetwork = localStorage.getItem("tc:selectedNetwork");
          if (localNetwork && localNetwork.trim()) {
            console.log('🔄 Мигрируем сеть из localStorage в базу данных:', localNetwork);
            setSelectedNetworkId(localNetwork);
            
            // Сохраняем в базу данных для будущего использования
            await userPreferencesService.setSelectedNetwork(localNetwork);
          }
        }
        
        if (savedTradingPoint) {
          console.log('✅ Восстановлена торговая точка из базы данных:', savedTradingPoint);
          setSelectedTradingPoint(savedTradingPoint);
        } else {
          // Fallback на localStorage для миграции
          const localTradingPoint = localStorage.getItem("tc:selectedTradingPoint");
          if (localTradingPoint) {
            console.log('🔄 Мигрируем торговую точку из localStorage:', localTradingPoint);
            setSelectedTradingPoint(localTradingPoint);
            
            // Сохраняем в базу данных
            await userPreferencesService.setSelectedTradingPoint(localTradingPoint);
          } else {
            setSelectedTradingPoint("all");
          }
        }
        
        setPreferencesLoaded(true);
        
      } catch (error) {
        console.error('❌ Ошибка при загрузке предпочтений из базы данных:', error);
        console.log('🔄 Fallback на localStorage...');
        
        // При ошибке базы данных используем localStorage
        try {
          const localNetwork = localStorage.getItem("tc:selectedNetwork");
          const localTradingPoint = localStorage.getItem("tc:selectedTradingPoint");
          
          if (localNetwork && localNetwork.trim()) {
            setSelectedNetworkId(localNetwork);
          }
          
          if (localTradingPoint) {
            setSelectedTradingPoint(localTradingPoint);
          } else {
            setSelectedTradingPoint("all");
          }
          
          setPreferencesLoaded(true);
          
        } catch (localError) {
          console.error('❌ Ошибка при работе с localStorage:', localError);
          setPreferencesLoaded(true);
        }
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
          }
        } catch (error) {
          console.error('❌ Ошибка загрузки сетей по умолчанию:', error);
        }
      }
    }

    loadDefaultNetwork();
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

  // Обертка для setSelectedNetwork, которая сохраняет в базу данных и сбрасывает торговую точку
  const handleSetSelectedNetwork = async (networkId: string) => {
    try {
      setSelectedNetworkId(networkId);
      setSelectedTradingPoint("all");
      
      // Сохраняем в базу данных
      await userPreferencesService.setNetworkSelection(networkId, "all");
      console.log('✅ Выбор сети сохранен в базу данных:', networkId);
      
      // Fallback сохранение в localStorage
      localStorage.setItem("tc:selectedNetwork", networkId);
      localStorage.setItem("tc:selectedTradingPoint", "all");
      
    } catch (error) {
      console.error('❌ Ошибка при сохранении выбора сети:', error);
      
      // При ошибке базы данных сохраняем только в localStorage
      try {
        localStorage.setItem("tc:selectedNetwork", networkId);
        localStorage.setItem("tc:selectedTradingPoint", "all");
        console.log('⚠️ Выбор сети сохранен только в localStorage');
      } catch (localError) {
        console.error('❌ Критическая ошибка при сохранении:', localError);
      }
    }
  };

  // Обертка для setSelectedTradingPoint, которая сохраняет в базу данных
  const handleSetSelectedTradingPoint = async (tradingPointId: string) => {
    try {
      setSelectedTradingPoint(tradingPointId);
      
      // Сохраняем в базу данных
      await userPreferencesService.setSelectedTradingPoint(tradingPointId);
      console.log('✅ Выбор торговой точки сохранен в базу данных:', tradingPointId);
      
      // Fallback сохранение в localStorage
      localStorage.setItem("tc:selectedTradingPoint", tradingPointId);
      
    } catch (error) {
      console.error('❌ Ошибка при сохранении выбора торговой точки:', error);
      
      // При ошибке базы данных сохраняем только в localStorage
      try {
        localStorage.setItem("tc:selectedTradingPoint", tradingPointId);
        console.log('⚠️ Выбор торговой точки сохранен только в localStorage');
      } catch (localError) {
        console.error('❌ Критическая ошибка при сохранении:', localError);
      }
    }
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