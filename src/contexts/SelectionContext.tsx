import React, { createContext, useContext, useEffect, useState } from "react";
import { networksService } from "@/services/networksService";
import { tradingPointsService } from "@/services/tradingPointsService";
import { Network } from "@/types/network";
import { useNewAuth } from "@/contexts/NewAuthContext";

type SelectionContextValue = {
  selectedNetwork: Network | null;
  setSelectedNetwork: (networkId: string) => void;
  selectedTradingPoint: string;
  setSelectedTradingPoint: (v: string) => void;
  isAllTradingPoints: boolean;
  isInitialized: boolean;
};

const SelectionContext = createContext<SelectionContextValue | undefined>(undefined);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>("");
  const [selectedTradingPoint, setSelectedTradingPoint] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const { user } = useNewAuth();

  // Получаем объект сети по ID
  const [selectedNetwork, setSelectedNetworkState] = useState<Network | null>(null);
  
  // Загружаем первую доступную сеть при старте
  useEffect(() => {
    if (!selectedNetworkId) {
      networksService.getAll().then(networks => {
        if (networks.length > 0) {
          // По умолчанию для ВСЕХ пользователей выбираем сеть с external_id === "15" (БТО)
          const defaultNetwork = networks.find(n => n.external_id === "15");

          if (defaultNetwork) {
            setSelectedNetworkId(defaultNetwork.id);
            console.log('✅ Default network selected: БТО (external_id: 15)');
          } else {
            // Если сеть 15 не найдена, fallback на первую доступную
            console.warn('⚠️ Network with external_id=15 not found, selecting first available');
            setSelectedNetworkId(networks[0].id);
          }
        }
      }).catch(error => {
        console.error('Failed to load networks at startup:', error);
      });
    }
  }, [user]);
  
  useEffect(() => {
    if (selectedNetworkId) {
      networksService.getById(selectedNetworkId)
        .then(network => {
          setSelectedNetworkState(network);

          // Автоматически выбираем торговую точку "АЗС 4" если её нет и если localStorage пуст
          if (!selectedTradingPoint && typeof window !== 'undefined') {
            const savedTradingPoint = localStorage.getItem("tc:selectedTradingPoint");
            if (!savedTradingPoint || savedTradingPoint.trim() === '') {
              tradingPointsService.getByNetworkId(selectedNetworkId)
                .then(tradingPoints => {
                  // Ищем торговую точку "АЗС 4" или с похожим названием
                  const azs4Point = tradingPoints.find(p =>
                    p.name && (
                      p.name.toLowerCase().includes('азс 4') ||
                      p.name.toLowerCase().includes('азс4') ||
                      p.name.toLowerCase() === 'азс 4'
                    )
                  );

                  if (azs4Point) {
                    setSelectedTradingPoint(azs4Point.id);
                  } else if (tradingPoints.length > 0) {
                    // Если АЗС 4 не найдена, выбираем первую доступную
                    setSelectedTradingPoint(tradingPoints[0].id);
                  }

                  // Отмечаем инициализацию как завершенную
                  setIsInitialized(true);
                })
                .catch(error => {
                  console.error('Failed to load trading points:', error);
                  // Даже при ошибке отмечаем инициализацию как завершенную
                  setIsInitialized(true);
                });
            } else {
              // Если торговая точка уже выбрана из localStorage
              setIsInitialized(true);
            }
          } else {
            // Если торговая точка уже выбрана
            setIsInitialized(true);
          }
        })
        .catch(error => {
          console.error('Failed to load network:', error);
          setSelectedNetworkState(null);
          // Если сеть не найдена, сбрасываем выбор на первую доступную
          networksService.getAll().then(networks => {
            if (networks.length > 0) {
              setSelectedNetworkId(networks[0].id);
            }
            // Отмечаем инициализацию как завершенную даже при ошибке
            setIsInitialized(true);
          }).catch(() => {
            // Даже при полном провале отмечаем инициализацию
            setIsInitialized(true);
          });
        });
    } else {
      setSelectedNetworkState(null);
      // Если нет выбранной сети, всё равно отмечаем инициализацию
      setIsInitialized(true);
    }
  }, [selectedNetworkId]);

  // Обертка для setSelectedNetwork, которая сбрасывает торговую точку при смене сети
  const handleSetSelectedNetwork = (networkId: string) => {
    // Для МенеджерБТО разрешаем менять сеть только на БТО
    if (user && user.role === 'bto_manager') {
      // Проверяем, что новая сеть - это БТО
      networksService.getById(networkId).then(network => {
        if (network && (network.external_id === "15" || network.name?.toLowerCase().includes('бто'))) {
          setSelectedNetworkId(networkId);
          if (selectedTradingPoint) {
            setSelectedTradingPoint("");
          }
        } else {
          console.warn('BTO manager access denied for network:', network?.name);
          // Не меняем сеть, остаемся на БТО
        }
      }).catch(error => {
        console.error('Network validation error:', error);
      });
    } else {
      // Для остальных ролей - обычная логика
      setSelectedNetworkId(networkId);
      // Сбрасываем торговую точку при смене сети
      if (selectedTradingPoint) {
        setSelectedTradingPoint("");
      }
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
          setSelectedNetworkId(savedNetwork);
        }
        
        // Если есть сохраненная торговая точка, используем её
        if (savedTradingPoint) {
          setSelectedTradingPoint(savedTradingPoint);
        }
      } catch (e) {
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
    isInitialized,
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

