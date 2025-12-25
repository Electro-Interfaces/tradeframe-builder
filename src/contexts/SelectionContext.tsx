import React, { createContext, useContext, useEffect, useState } from "react";
import { networksService } from "@/services/networksService";
import { tradingPointsService } from "@/services/tradingPointsService";
import { Network } from "@/types/network";
import { TradingPoint } from "@/types/tradingpoint";
import { useNewAuth } from "@/contexts/NewAuthContext";

type SelectionContextValue = {
  selectedNetwork: Network | null;
  setSelectedNetwork: (networkId: string) => void;
  selectedTradingPoint: string;
  setSelectedTradingPoint: (v: string) => void;
  selectedStation: TradingPoint | null; // ✅ ДОБАВЛЕНО: Объект торговой точки
  isAllTradingPoints: boolean;
  isInitialized: boolean;
};

const SelectionContext = createContext<SelectionContextValue | undefined>(undefined);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  // ✅ ИСПРАВЛЕНИЕ: Инициализируем state из localStorage СРАЗУ (синхронно)
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>(() => {
    if (typeof window === 'undefined') return "";
    const saved = localStorage.getItem("tc:selectedNetwork") || "";
    // Проверяем что saved это UUID (формат: 8-4-4-4-12 символов с дефисами)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved);
    if (saved && !isUUID) {
      // Если в localStorage лежит не UUID (например старый external_id="15"), очищаем
      console.warn(`⚠️ Invalid network ID in localStorage: "${saved}", clearing...`);
      localStorage.removeItem("tc:selectedNetwork");
      return "";
    }
    return saved;
  });

  const [selectedTradingPoint, setSelectedTradingPoint] = useState<string>(() => {
    if (typeof window === 'undefined') return "";
    return localStorage.getItem("tc:selectedTradingPoint") || "";
  });

  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const { user } = useNewAuth();

  // Проверяем, имеет ли пользователь доступ к сохраненной в localStorage сети
  useEffect(() => {
    if (!selectedNetworkId || !user?.roles) return;

    // Собираем scopeValues из ролей пользователя
    const userScopeValues: string[] = [];
    user.roles.forEach(role => {
      if (role.scopeValues && role.scopeValues.length > 0) {
        userScopeValues.push(...role.scopeValues);
      }
    });

    // Если нет ограничений - ничего не делаем
    if (userScopeValues.length === 0) return;

    // Извлекаем разрешенные коды сетей
    const allowedNetworkCodes = new Set<string>();
    userScopeValues.forEach(scopeValue => {
      const parts = scopeValue.split('-azs-');
      if (parts.length === 2) {
        allowedNetworkCodes.add(parts[0]);
      }
    });

    // Проверяем, есть ли доступ к текущей сети
    networksService.getById(selectedNetworkId).then(network => {
      if (network && !allowedNetworkCodes.has(network.code)) {
        // Нет доступа - сбрасываем выбор сети
        localStorage.removeItem("tc:selectedNetwork");
        localStorage.removeItem("tc:selectedTradingPoint");
        setSelectedNetworkId("");
        setSelectedTradingPoint("");
      }
    }).catch(() => {
      // Сеть не найдена - сбрасываем
      setSelectedNetworkId("");
    });
  }, [user?.roles, selectedNetworkId]);

  // Получаем объект сети по ID
  const [selectedNetwork, setSelectedNetworkState] = useState<Network | null>(null);

  // ✅ ДОБАВЛЕНО: Получаем объект торговой точки по ID
  const [selectedStation, setSelectedStation] = useState<TradingPoint | null>(null);
  
  // Загружаем первую доступную сеть при старте
  useEffect(() => {
    if (!selectedNetworkId) {
      networksService.getAll().then(allNetworks => {
        if (allNetworks.length > 0) {
          // Собираем scopeValues из ролей пользователя для фильтрации сетей
          const userScopeValues: string[] = [];
          if (user?.roles) {
            user.roles.forEach(role => {
              if (role.scopeValues && role.scopeValues.length > 0) {
                userScopeValues.push(...role.scopeValues);
              }
            });
          }

          let availableNetworks = allNetworks;

          // Если есть ограничения по scope_values - фильтруем сети
          if (userScopeValues.length > 0) {
            const allowedNetworkCodes = new Set<string>();
            userScopeValues.forEach(scopeValue => {
              const parts = scopeValue.split('-azs-');
              if (parts.length === 2) {
                allowedNetworkCodes.add(parts[0]);
              }
            });
            availableNetworks = allNetworks.filter(n => allowedNetworkCodes.has(n.code));
          }

          if (availableNetworks.length > 0) {
            // По умолчанию выбираем сеть БТО (external_id === "15") если она доступна
            const defaultNetwork = availableNetworks.find(n => n.external_id === "15");
            if (defaultNetwork) {
              setSelectedNetworkId(defaultNetwork.id);
            } else {
              // Иначе первую доступную
              setSelectedNetworkId(availableNetworks[0].id);
            }
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

          // Автоматически выбираем торговую точку если localStorage пуст
          if (!selectedTradingPoint && typeof window !== 'undefined') {
            const savedTradingPoint = localStorage.getItem("tc:selectedTradingPoint");
            if (!savedTradingPoint || savedTradingPoint.trim() === '') {
              tradingPointsService.getByNetworkId(selectedNetworkId)
                .then(tradingPoints => {
                  // Собираем scopeValues из ролей пользователя для фильтрации
                  const userScopeValues: string[] = [];
                  if (user?.roles) {
                    user.roles.forEach(role => {
                      if (role.scopeValues && role.scopeValues.length > 0) {
                        userScopeValues.push(...role.scopeValues);
                      }
                    });
                  }

                  // Фильтруем торговые точки если есть ограничения
                  const availablePoints = userScopeValues.length > 0
                    ? tradingPoints.filter(p => userScopeValues.includes(p.id))
                    : tradingPoints;

                  // Ищем торговую точку "АЗС 4" среди доступных
                  const azs4Point = availablePoints.find(p =>
                    p.name && (
                      p.name.toLowerCase().includes('азс 4') ||
                      p.name.toLowerCase().includes('азс4') ||
                      p.name.toLowerCase() === 'азс 4'
                    )
                  );

                  if (azs4Point) {
                    setSelectedTradingPoint(azs4Point.id);
                  } else if (availablePoints.length > 0) {
                    // Если АЗС 4 не найдена, выбираем первую доступную
                    setSelectedTradingPoint(availablePoints[0].id);
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

  // ✅ ДОБАВЛЕНО: Загружаем объект торговой точки при изменении selectedTradingPoint
  useEffect(() => {
    if (selectedTradingPoint && selectedTradingPoint !== 'all') {
      tradingPointsService.getById(selectedTradingPoint)
        .then(station => {
          setSelectedStation(station);
        })
        .catch(error => {
          console.error('Failed to load trading point:', error);
          setSelectedStation(null);
        });
    } else {
      setSelectedStation(null);
    }
  }, [selectedTradingPoint]);

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

  // ✅ УДАЛЕНО: Hydrate from localStorage теперь происходит в useState(() => ...) выше

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
    selectedStation, // ✅ ДОБАВЛЕНО: Объект торговой точки
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

