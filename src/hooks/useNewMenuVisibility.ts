/**
 * Новый хук для видимости меню
 * Использует новую систему авторизации и разрешений
 */

import { useMemo } from 'react';
import { useNewAuth } from '../contexts/NewAuthContext';

// Расширенная конфигурация видимости меню
export interface NewMenuVisibilityConfig {
  // Основные разделы
  networks: boolean;
  tradingPoint: boolean;
  admin: boolean;
  settings: boolean;
  reports: boolean;

  // Подразделы (для детального контроля)
  prices: boolean;
  tanks: boolean;
  equipment: boolean;
  analytics: boolean;
  misc: boolean;
}

export function useNewMenuVisibility(): NewMenuVisibilityConfig {
  const { user, getMenuVisibility, hasPermission } = useNewAuth();

  return useMemo(() => {

    if (!user) {
      // Неавторизованный пользователь не видит ничего
      const emptyConfig = {
        networks: false,
        tradingPoint: false,
        admin: false,
        settings: false,
        reports: false,
        prices: false,
        tanks: false,
        equipment: false,
        analytics: false,
        misc: false
      };

      return emptyConfig;
    }

    // Получаем основную видимость от сервиса разрешений
    const baseVisibility = getMenuVisibility();

    // Расширенная конфигурация с детальным контролем
    const config: NewMenuVisibilityConfig = {
      // Основные разделы
      networks: baseVisibility.networks,
      tradingPoint: baseVisibility.tradingPoint,
      admin: baseVisibility.admin,
      settings: baseVisibility.settings,
      reports: baseVisibility.reports,

      // Подразделы торговой точки
      prices: hasPermission('prices.view') || baseVisibility.tradingPoint,
      tanks: hasPermission('tanks.view') || baseVisibility.tradingPoint,
      equipment: hasPermission('equipment.view') || baseVisibility.tradingPoint,

      // Дополнительные разделы
      analytics: baseVisibility.reports,
      misc: baseVisibility.admin // Разное показываем только админам
    };


    const visibleCount = Object.values(config).filter(visible => visible).length;

    return config;
  }, [user, getMenuVisibility, hasPermission]);
}

/**
 * Хук для проверки конкретного разрешения на видимость меню
 */
export function useHasNewMenuPermission(permission: string): boolean {
  const { hasPermission } = useNewAuth();

  return useMemo(() => {
    return hasPermission(permission);
  }, [hasPermission, permission]);
}