/**
 * Хук для проверки видимости элементов меню на основе разрешений пользователя
 * РЕФАКТОРИНГ: Используем permissionService вместо жёстких проверок по названию роли
 */

import { useMemo } from 'react'
import { useNewAuth } from '@/contexts/NewAuthContext'
import { permissionService } from '@/services/auth/permissionService'


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
  misc: boolean
}

export function useMenuVisibility(): MenuVisibilityConfig {
  const { user } = useNewAuth()

  return useMemo(() => {

    if (!user) {
      // Неавторизованные пользователи не видят меню
      return {
        networks: false,
        tradingPoint: false,
        admin: false,
        settings: false,
        prices: false,
        tanks: false,
        equipment: false,
        reports: false,
        analytics: false,
        misc: false
      }
    }

    // Суперадмины видят всё
    if (permissionService.isSuperAdmin(user)) {
      return {
        networks: true,
        tradingPoint: true,
        admin: true,
        settings: true,
        prices: true,
        tanks: true,
        equipment: true,
        reports: true,
        analytics: true,
        misc: true
      }
    }

    // Функция для проверки разрешения на видимость меню
    const hasMenuPermission = (menuResource: string): boolean => {
      return permissionService.hasMenuAccess(user, menuResource.replace('_menu', ''))
    }

    // Функция проверки разрешений на чтение ресурса
    const canReadResource = (section: string, resource: string): boolean => {
      return permissionService.hasPermission(user, { section, resource, action: 'read' })
    }

    // Основные проверки через permissionService
    const isAdmin = permissionService.isAdmin(user)

    // Формируем конфиг видимости меню
    const menuConfig: MenuVisibilityConfig = {
      // Торговые сети: видимость меню ИЛИ разрешение на чтение сетей/точек
      networks: hasMenuPermission('networks_menu') ||
                canReadResource('networks', 'networks') ||
                canReadResource('networks', 'trading_points'),

      // Торговая точка: видимость меню ИЛИ разрешение на чтение оборудования/цен
      tradingPoint: hasMenuPermission('trading_point_menu') ||
                    canReadResource('equipment', 'tanks') ||
                    canReadResource('finance', 'prices') ||
                    canReadResource('equipment', 'dispensers'),

      // Администрирование: видимость меню ИЛИ isAdmin
      admin: hasMenuPermission('admin_menu') || isAdmin,

      // Настройки: видимость меню ИЛИ isAdmin
      settings: hasMenuPermission('settings_menu') || isAdmin,

      // Цены: подменю
      prices: hasMenuPermission('prices_menu') || canReadResource('finance', 'prices'),

      // Резервуары: подменю
      tanks: hasMenuPermission('tanks_menu') || canReadResource('equipment', 'tanks'),

      // Оборудование: подменю
      equipment: hasMenuPermission('equipment_menu') ||
                 canReadResource('equipment', 'dispensers') ||
                 canReadResource('equipment', 'sensors'),

      // Отчёты: подменю
      reports: hasMenuPermission('reports_menu') ||
               canReadResource('operations', 'reports') ||
               canReadResource('operations', 'shifts'),

      // Аналитика: подменю
      analytics: hasMenuPermission('analytics_menu') ||
                 canReadResource('networks', 'analytics') ||
                 canReadResource('finance', 'analytics'),

      // Разное
      misc: hasMenuPermission('misc_menu')
    }

    // Подсчитываем видимые разделы
    const visibleCount = Object.values(menuConfig).filter(v => v).length

    // Если ни один раздел не видим, но у пользователя есть какие-то разрешения -
    // показываем базовые разделы
    if (visibleCount === 0 && user.permissions && user.permissions.length > 0) {
      return {
        networks: true,      // Базовый доступ
        tradingPoint: true,  // Базовый доступ
        admin: false,
        settings: false,
        prices: false,
        tanks: false,
        equipment: false,
        reports: false,
        analytics: false,
        misc: false
      }
    }

    // Если вообще нет разрешений - минимальный fallback
    if (visibleCount === 0) {
      return {
        networks: true,      // Всегда показываем торговые сети
        tradingPoint: true,  // Всегда показываем торговую точку
        admin: false,
        settings: false,
        prices: false,
        tanks: false,
        equipment: false,
        reports: false,
        analytics: false,
        misc: false
      }
    }

    return menuConfig

  }, [user])
}

/**
 * Хук для проверки конкретного разрешения на видимость меню
 */
export function useHasMenuPermission(menuResource: string): boolean {
  const { user } = useNewAuth()

  return useMemo(() => {
    if (!user) {
      return false
    }

    return permissionService.hasMenuAccess(user, menuResource)
  }, [user, menuResource])
}
