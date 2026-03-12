import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { networksService } from "@/services/networksService";
import { tradingPointsService } from "@/services/tradingPointsService";
import { Network } from "@/types/network";
import { TradingPoint } from "@/types/tradingpoint";
import { useNewAuth } from "@/contexts/NewAuthContext";

type SelectionContextValue = {
  selectedNetwork: Network | null;
  setSelectedNetwork: (networkId: string) => void;
  // Мультиселект сетей (бренд = несколько компаний)
  selectedNetworkIds: string[];
  setSelectedNetworkIds: (ids: string[]) => void;
  selectedTradingPoint: string;
  setSelectedTradingPoint: (v: string) => void;
  selectedStation: TradingPoint | null;
  isAllTradingPoints: boolean;
  isInitialized: boolean;
  // Мультиселект торговых точек
  selectedTradingPoints: string[];
  setSelectedTradingPoints: (ids: string[]) => void;
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
      // Invalid network ID in localStorage, clearing
      localStorage.removeItem("tc:selectedNetwork");
      return "";
    }
    return saved;
  });

  // Мультиселект сетей (бренд = несколько юрлиц)
  const [selectedNetworkIdsRaw, setSelectedNetworkIdsState] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem("tc:selectedNetworkIds");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* ignore */ }
    }
    return [];
  });

  const [selectedTradingPoint, setSelectedTradingPointRaw] = useState<string>(() => {
    if (typeof window === 'undefined') return "";
    return localStorage.getItem("tc:selectedTradingPoint") || "";
  });

  // Мультиселект: массив ID выбранных торговых точек
  const [selectedTradingPoints, setSelectedTradingPointsRaw] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem("tc:selectedTradingPoints");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* ignore */ }
    }
    // Миграция из старого формата
    const old = localStorage.getItem("tc:selectedTradingPoint") || "";
    if (old && old !== "all") return [old];
    return [];
  });

  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const { user } = useNewAuth();
  // Стабильный ID пользователя для перезапуска эффектов после логина
  const userId = user?.id;

  // Проверяем, имеет ли пользователь доступ к сохраненной в localStorage сети
  // И автоматически выбираем доступную сеть если текущая недоступна
  useEffect(() => {
    if (!user?.roles) return;

    const { networkIds, networkCodes, hasRestrictions } = getAccessibleNetworks(user.roles, []);

    // Функция для выбора первой доступной сети
    const selectFirstAvailableNetwork = async () => {
      const allNetworks = await networksService.getAll();
      const availableNetworks = hasRestrictions
        ? allNetworks.filter(n => hasNetworkAccess(n, networkIds, networkCodes, hasRestrictions))
        : allNetworks;

      if (availableNetworks.length > 0) {
        setSelectedNetworkId(availableNetworks[0].id);
      } else {
        // Сетей нет совсем — отмечаем инициализацию чтобы не зависнуть
        setIsInitialized(true);
      }
    };

    // Если нет выбранной сети — выбираем первую доступную (для всех пользователей)
    if (!selectedNetworkId) {
      selectFirstAvailableNetwork();
      return;
    }

    // Если нет ограничений и сеть уже выбрана - ничего не делаем
    if (!hasRestrictions) return;

    // Проверяем, есть ли доступ к текущей сети
    networksService.getById(selectedNetworkId).then(network => {
      if (!network || !hasNetworkAccess(network, networkIds, networkCodes, hasRestrictions)) {
        // Нет доступа - выбираем первую доступную сеть
        localStorage.removeItem("tc:selectedNetwork");
        localStorage.removeItem("tc:selectedTradingPoint");
        setSelectedTradingPoint("");
        selectFirstAvailableNetwork();
      }
    }).catch(() => {
      // Сеть не найдена - выбираем первую доступную
      selectFirstAvailableNetwork();
    });
  }, [user?.roles, selectedNetworkId]);

  // Получаем объект сети по ID
  const [selectedNetwork, setSelectedNetworkState] = useState<Network | null>(null);

  // Получаем объект торговой точки по ID
  const [selectedStation, setSelectedStation] = useState<TradingPoint | null>(null);

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

                  // По умолчанию выбираем все доступные станции (мультиселект)
                  if (availablePoints.length > 0) {
                    setSelectedTradingPoints(availablePoints.map(p => p.id));
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
      // Если пользователь залогинен но сеть не выбрана — НЕ отмечаем инициализацию,
      // т.к. эффект автовыбора сети (выше) сейчас загружает первую доступную сеть
      // и потом этот эффект перезапустится с selectedNetworkId
      if (!userId) {
        setIsInitialized(true);
      }
    }
  }, [selectedNetworkId, userId]);
  // ↑ userId в зависимостях: после логина (null→user) эффект перезапускается,
  //   т.к. до логина API-вызовы фейлятся из-за отсутствия токена авторизации

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

  // Обёртка setSelectedTradingPoint — синхронизирует оба состояния
  const setSelectedTradingPoint = useCallback((v: string) => {
    setSelectedTradingPointRaw(v);
    // Синхронизируем массив мультиселекта
    if (v === "all") {
      // "all" из legacy-кода → selectedTradingPoints не меняем,
      // он будет обновлён PointSelect при рендере
    } else if (v) {
      setSelectedTradingPointsRaw([v]);
    } else {
      setSelectedTradingPointsRaw([]);
    }
  }, []);

  // Установка мультиселекта — обновляет и legacy selectedTradingPoint
  const setSelectedTradingPoints = useCallback((ids: string[]) => {
    setSelectedTradingPointsRaw(ids);
    if (ids.length === 0) {
      setSelectedTradingPointRaw("");
    } else if (ids.length === 1) {
      setSelectedTradingPointRaw(ids[0]);
    } else {
      setSelectedTradingPointRaw("all");
    }
  }, []);

  // Мультиселект сетей: объединяем основную сеть + дополнительные
  const selectedNetworkIds = useMemo(() => {
    const ids = new Set<string>(selectedNetworkIdsRaw);
    if (selectedNetworkId) ids.add(selectedNetworkId);
    return Array.from(ids);
  }, [selectedNetworkId, selectedNetworkIdsRaw]);

  const setSelectedNetworkIds = useCallback((ids: string[]) => {
    setSelectedNetworkIdsState(ids);
    // Основная сеть (selectedNetwork) = первая из списка
    if (ids.length > 0 && !ids.includes(selectedNetworkId)) {
      setSelectedNetworkId(ids[0]);
    }
    // Сброс точек при смене набора сетей
    setSelectedTradingPointRaw("");
    setSelectedTradingPointsRaw([]);
  }, [selectedNetworkId]);

  const handleSetSelectedNetwork = useCallback((networkId: string) => {
    const hasNetworkRestrictions = user?.roles?.some(role =>
      role.scope === 'network' && role.scopeValues && role.scopeValues.length > 0
    );

    if (user && hasNetworkRestrictions) {
      const allowedNetworkIds = new Set<string>();
      user.roles?.forEach(role => {
        if (role.scope === 'network' && role.scopeValues) {
          role.scopeValues.forEach(id => allowedNetworkIds.add(id));
        }
      });

      if (allowedNetworkIds.has(networkId)) {
        setSelectedNetworkId(networkId);
        // Сбрасываем точки только если это смена единственной сети (не мультиселект)
        if (selectedNetworkIdsRaw.length === 0) {
          setSelectedTradingPointRaw("");
          setSelectedTradingPointsRaw([]);
        }
      }
    } else {
      setSelectedNetworkId(networkId);
      if (selectedNetworkIdsRaw.length === 0) {
        setSelectedTradingPointRaw("");
        setSelectedTradingPointsRaw([]);
      }
    }
  }, [user, selectedNetworkIdsRaw]);

  // Persist to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem("tc:selectedNetwork", selectedNetworkId || "");
      } catch (e) {
        // Failed to save to localStorage
      }
    }
  }, [selectedNetworkId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem("tc:selectedTradingPoint", selectedTradingPoint || "");
      } catch (e) {
        // Failed to save to localStorage
      }
    }
  }, [selectedTradingPoint]);

  // Persist мультиселекта точек
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem("tc:selectedTradingPoints", JSON.stringify(selectedTradingPoints));
      } catch (e) {
        // Failed to save to localStorage
      }
    }
  }, [selectedTradingPoints]);

  // Persist мультиселекта сетей
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem("tc:selectedNetworkIds", JSON.stringify(selectedNetworkIdsRaw));
      } catch (e) {
        // Failed to save to localStorage
      }
    }
  }, [selectedNetworkIdsRaw]);

  const value = useMemo<SelectionContextValue>(() => ({
    selectedNetwork,
    setSelectedNetwork: handleSetSelectedNetwork,
    selectedNetworkIds,
    setSelectedNetworkIds,
    selectedTradingPoint,
    setSelectedTradingPoint,
    selectedStation,
    isAllTradingPoints: selectedTradingPoint === "all",
    isInitialized,
    selectedTradingPoints,
    setSelectedTradingPoints,
  }), [selectedNetwork, handleSetSelectedNetwork, selectedNetworkIds, setSelectedNetworkIds, selectedTradingPoint, setSelectedTradingPoint, selectedStation, isInitialized, selectedTradingPoints, setSelectedTradingPoints]);

  return (
    <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
  );
}

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection must be used within SelectionProvider");
  return ctx;
}
