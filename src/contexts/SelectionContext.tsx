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
  selectedStation: TradingPoint | null;
  isAllTradingPoints: boolean;
  isInitialized: boolean;
};

const SelectionContext = createContext<SelectionContextValue | undefined>(undefined);

/**
 * Вспомогательная функция для извлечения разрешенных сетей из ролей пользователя
 * Учитывает два формата scope_values:
 * 1. scope='network': UUID сетей напрямую
 * 2. scope='trading_point'/'assigned': ID точек в формате {networkCode}-azs-{stationCode}
 */
function getAccessibleNetworks(
  roles: Array<{ scope?: string; scopeValues?: string[] }> | undefined,
  allNetworks: Network[]
): { networkIds: Set<string>; networkCodes: Set<string>; hasRestrictions: boolean } {
  const networkIds = new Set<string>(); // UUID сетей для scope='network'
  const networkCodes = new Set<string>(); // Коды сетей из торговых точек

  if (!roles) {
    return { networkIds, networkCodes, hasRestrictions: false };
  }

  let hasRestrictions = false;

  roles.forEach(role => {
    if (role.scopeValues && role.scopeValues.length > 0) {
      hasRestrictions = true;
      if (role.scope === 'network') {
        // Для scope='network' scopeValues содержат UUID сетей
        role.scopeValues.forEach(id => networkIds.add(id));
      } else if (role.scope === 'trading_point' || role.scope === 'assigned') {
        // Для trading_point/assigned scopeValues содержат ID точек
        role.scopeValues.forEach(scopeValue => {
          const parts = scopeValue.split('-azs-');
          if (parts.length === 2) {
            networkCodes.add(parts[0]);
          }
        });
      }
    }
  });

  return { networkIds, networkCodes, hasRestrictions };
}

/**
 * Проверяет, есть ли доступ к сети
 * Проверяет network.id, network.code И network.external_id,
 * т.к. scopeValues могут использовать любой из этих идентификаторов
 */
function hasNetworkAccess(
  network: Network,
  networkIds: Set<string>,
  networkCodes: Set<string>,
  hasRestrictions: boolean
): boolean {
  if (!hasRestrictions) return true;
  return networkIds.has(network.id) ||
         networkCodes.has(network.code) ||
         networkCodes.has(network.external_id);
}

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>(() => {
    if (typeof window === 'undefined') return "";
    const saved = localStorage.getItem("tc:selectedNetwork") || "";
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved);
    if (saved && !isUUID) {
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

    const { networkIds, networkCodes, hasRestrictions } = getAccessibleNetworks(user.roles, []);

    // Если нет ограничений - ничего не делаем
    if (!hasRestrictions) return;

    // Проверяем, есть ли доступ к текущей сети
    networksService.getById(selectedNetworkId).then(network => {
      if (!network) {
        setSelectedNetworkId("");
        return;
      }

      if (!hasNetworkAccess(network, networkIds, networkCodes, hasRestrictions)) {
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

  // Получаем объект торговой точки по ID
  const [selectedStation, setSelectedStation] = useState<TradingPoint | null>(null);

  // Загружаем первую доступную сеть при старте
  useEffect(() => {
    if (!selectedNetworkId) {
      networksService.getAll().then(allNetworks => {
        if (allNetworks.length > 0) {
          const { networkIds, networkCodes, hasRestrictions } = getAccessibleNetworks(user?.roles, allNetworks);

          // Фильтруем сети по доступу
          const availableNetworks = hasRestrictions
            ? allNetworks.filter(n => hasNetworkAccess(n, networkIds, networkCodes, hasRestrictions))
            : allNetworks;

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
                  // Собираем scopeValues из ролей пользователя для фильтрации точек
                  // Для scope='network' - все точки сети доступны
                  // Для scope='trading_point' - только конкретные точки
                  const pointScopeValues: string[] = [];
                  const hasNetworkScope = user?.roles?.some(role =>
                    role.scope === 'network' && role.scopeValues?.includes(network?.id || '')
                  );

                  if (!hasNetworkScope && user?.roles) {
                    user.roles.forEach(role => {
                      if ((role.scope === 'trading_point' || role.scope === 'assigned') &&
                          role.scopeValues && role.scopeValues.length > 0) {
                        pointScopeValues.push(...role.scopeValues);
                      }
                    });
                  }

                  // Фильтруем торговые точки если есть ограничения по точкам (не по сетям)
                  const availablePoints = pointScopeValues.length > 0
                    ? tradingPoints.filter(p => pointScopeValues.includes(p.id))
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

  // Загружаем объект торговой точки при изменении selectedTradingPoint
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
    // Проверяем, есть ли у пользователя ограничения по сетям (через scope)
    const hasNetworkRestrictions = user?.roles?.some(role =>
      role.scope === 'network' && role.scopeValues && role.scopeValues.length > 0
    );

    if (user && hasNetworkRestrictions) {
      // Собираем все разрешенные сети из всех ролей
      const allowedNetworkIds = new Set<string>();
      user.roles?.forEach(role => {
        if (role.scope === 'network' && role.scopeValues) {
          role.scopeValues.forEach(id => allowedNetworkIds.add(id));
        }
      });

      // Проверяем, разрешена ли выбранная сеть
      if (allowedNetworkIds.has(networkId)) {
        setSelectedNetworkId(networkId);
        if (selectedTradingPoint) {
          setSelectedTradingPoint("");
        }
      } else {
        // Не меняем сеть, остаемся на текущей
      }
    } else {
      // Для пользователей без ограничений - обычная логика
      setSelectedNetworkId(networkId);
      // Сбрасываем торговую точку при смене сети
      if (selectedTradingPoint) {
        setSelectedTradingPoint("");
      }
    }
  };

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
    selectedStation,
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
