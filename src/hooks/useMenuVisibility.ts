/**
 * Хук для проверки видимости элементов меню на основе разрешений пользователя
 */

import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export interface MenuVisibilityConfig {
  networks: boolean
  tradingPoint: boolean
  admin: boolean
  settings: boolean
  prices: boolean
  tanks: boolean
  equipment: boolean
  reports: boolean
  analytics: boolean
}

export function useMenuVisibility(): MenuVisibilityConfig {
  const { user } = useAuth()

  return useMemo(() => {
    // Временно показываем все меню для всех пользователей
    return {
      networks: true,
      tradingPoint: true,
      admin: true,
      settings: true,
      prices: true,
      tanks: true,
      equipment: true,
      reports: true,
      analytics: true
    }

    // Оригинальная логика (закомментирована)
    /*
    if (!user || !user.permissions) {
      return {
        networks: false,
        tradingPoint: false,
        admin: false,
        settings: false,
        prices: false,
        tanks: false,
        equipment: false,
        reports: false,
        analytics: false
      }
    }

    const hasMenuPermission = (menuResource: string): boolean => {
      return user.permissions.includes(`menu_visibility.${menuResource}.view_menu`)
    }

    return {
      networks: hasMenuPermission('networks_menu'),
      tradingPoint: hasMenuPermission('trading_point_menu'),
      admin: hasMenuPermission('admin_menu'),
      settings: hasMenuPermission('settings_menu'),
      prices: hasMenuPermission('prices_menu'),
      tanks: hasMenuPermission('tanks_menu'),
      equipment: hasMenuPermission('equipment_menu'),
      reports: hasMenuPermission('reports_menu'),
      analytics: hasMenuPermission('analytics_menu')
    }
    */
  }, [user])
}

/**
 * Хук для проверки конкретного разрешения на видимость меню
 */
export function useHasMenuPermission(menuResource: string): boolean {
  const { user } = useAuth()

  return useMemo(() => {
    if (!user || !user.permissions) {
      return false
    }

    return user.permissions.includes(`menu_visibility.${menuResource}.view_menu`)
  }, [user, menuResource])
}