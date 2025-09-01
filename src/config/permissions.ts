/**
 * Конфигурация разделов системы и разрешений
 * Определяет структуру разрешений для гранулярного контроля доступа
 */

export interface PermissionResource {
  code: string
  name: string
  description: string
}

export interface PermissionSection {
  code: string
  name: string
  description: string
  icon: string
  resources: Record<string, PermissionResource>
}

export const PERMISSION_SECTIONS: Record<string, PermissionSection> = {
  NETWORKS: {
    code: 'networks',
    name: 'Торговые сети',
    description: 'Управление торговыми сетями и точками',
    icon: 'Network',
    resources: {
      NETWORKS: { 
        code: 'networks', 
        name: 'Сети', 
        description: 'Управление торговыми сетями' 
      },
      TRADING_POINTS: { 
        code: 'trading_points', 
        name: 'Торговые точки', 
        description: 'Управление АЗС и торговыми точками' 
      },
      USERS: { 
        code: 'users', 
        name: 'Пользователи сети', 
        description: 'Управление пользователями в рамках сети' 
      },
      ANALYTICS: {
        code: 'analytics',
        name: 'Аналитика сети',
        description: 'Просмотр аналитики по сети'
      }
    }
  },

  OPERATIONS: {
    code: 'operations',
    name: 'Операции',
    description: 'Операционная деятельность на торговых точках',
    icon: 'Activity',
    resources: {
      TRANSACTIONS: { 
        code: 'transactions', 
        name: 'Транзакции', 
        description: 'Продажи топлива и товаров' 
      },
      SHIFTS: { 
        code: 'shifts', 
        name: 'Смены', 
        description: 'Управление сменами операторов' 
      },
      DELIVERIES: { 
        code: 'deliveries', 
        name: 'Доставки', 
        description: 'Приемка и слив топлива' 
      },
      REPORTS: { 
        code: 'reports', 
        name: 'Отчеты', 
        description: 'Операционные отчеты и сводки' 
      },
      RECONCILIATION: {
        code: 'reconciliation',
        name: 'Сверки',
        description: 'Сверка остатков и операций'
      }
    }
  },

  EQUIPMENT: {
    code: 'equipment',
    name: 'Оборудование',
    description: 'Управление оборудованием АЗС',
    icon: 'Settings',
    resources: {
      TANKS: { 
        code: 'tanks', 
        name: 'Резервуары', 
        description: 'Мониторинг и управление резервуарами' 
      },
      DISPENSERS: { 
        code: 'dispensers', 
        name: 'Колонки', 
        description: 'Топливораздаточные колонки' 
      },
      CALIBRATION: { 
        code: 'calibration', 
        name: 'Калибровка', 
        description: 'Калибровка измерительного оборудования' 
      },
      MAINTENANCE: { 
        code: 'maintenance', 
        name: 'Обслуживание', 
        description: 'Техническое обслуживание оборудования' 
      },
      SENSORS: {
        code: 'sensors',
        name: 'Датчики',
        description: 'Датчики уровня, температуры и давления'
      }
    }
  },

  FINANCE: {
    code: 'finance',
    name: 'Финансы',
    description: 'Финансовые операции и аналитика',
    icon: 'DollarSign',
    resources: {
      PRICES: { 
        code: 'prices', 
        name: 'Цены', 
        description: 'Управление ценами на топливо' 
      },
      ANALYTICS: { 
        code: 'analytics', 
        name: 'Аналитика', 
        description: 'Финансовая аналитика и KPI' 
      },
      RECONCILIATION: { 
        code: 'reconciliation', 
        name: 'Финансовые сверки', 
        description: 'Сверка касс и платежных систем' 
      },
      DISCOUNTS: {
        code: 'discounts',
        name: 'Скидки и акции',
        description: 'Управление скидками и акциями'
      },
      PAYMENTS: {
        code: 'payments',
        name: 'Платежи',
        description: 'Платежные системы и терминалы'
      }
    }
  },

  ADMIN: {
    code: 'admin',
    name: 'Администрирование',
    description: 'Системное администрирование',
    icon: 'Shield',
    resources: {
      ROLES: { 
        code: 'roles', 
        name: 'Роли', 
        description: 'Управление ролями и разрешениями' 
      },
      PERMISSIONS: { 
        code: 'permissions', 
        name: 'Разрешения', 
        description: 'Настройка разрешений системы' 
      },
      USERS: {
        code: 'users',
        name: 'Пользователи системы',
        description: 'Управление всеми пользователями системы'
      },
      AUDIT: { 
        code: 'audit', 
        name: 'Аудит', 
        description: 'Журнал действий пользователей' 
      },
      SYSTEM: { 
        code: 'system', 
        name: 'Система', 
        description: 'Системные настройки и диагностика' 
      },
      BACKUP: {
        code: 'backup',
        name: 'Резервное копирование',
        description: 'Создание и восстановление резервных копий'
      }
    }
  },

  SUPPORT: {
    code: 'support',
    name: 'Техподдержка',
    description: 'Техническая поддержка пользователей',
    icon: 'HeadphonesIcon',
    resources: {
      TICKETS: {
        code: 'tickets',
        name: 'Заявки',
        description: 'Обработка заявок в техподдержку'
      },
      DIAGNOSTICS: {
        code: 'diagnostics',
        name: 'Диагностика',
        description: 'Диагностика проблем системы'
      },
      REMOTE_ACCESS: {
        code: 'remote_access',
        name: 'Удаленный доступ',
        description: 'Удаленная помощь пользователям'
      }
    }
  }
} as const

// Специальные разрешения
export const SPECIAL_PERMISSIONS = {
  ALL: '*',  // все разрешения (только для super_admin)
  INHERIT: 'inherit'  // наследование от родительских ролей
} as const

// Действия по умолчанию для разных типов ресурсов
export const DEFAULT_ACTIONS = {
  DATA: ['read', 'write', 'delete'],
  OPERATIONAL: ['read', 'write'],
  ADMINISTRATIVE: ['read', 'write', 'delete', 'manage'],
  READ_ONLY: ['read']
} as const

// Помощники для работы с разрешениями
export const PermissionHelpers = {
  /**
   * Получить все доступные разделы
   */
  getAllSections(): PermissionSection[] {
    return Object.values(PERMISSION_SECTIONS)
  },

  /**
   * Получить раздел по коду
   */
  getSection(code: string): PermissionSection | undefined {
    return Object.values(PERMISSION_SECTIONS).find(section => section.code === code)
  },

  /**
   * Получить ресурс по коду раздела и ресурса
   */
  getResource(sectionCode: string, resourceCode: string): PermissionResource | undefined {
    const section = this.getSection(sectionCode)
    if (!section) return undefined
    
    return Object.values(section.resources).find(resource => resource.code === resourceCode)
  },

  /**
   * Получить все доступные ресурсы
   */
  getAllResources(): Array<{section: string, resource: PermissionResource}> {
    const result: Array<{section: string, resource: PermissionResource}> = []
    
    Object.values(PERMISSION_SECTIONS).forEach(section => {
      Object.values(section.resources).forEach(resource => {
        result.push({ section: section.code, resource })
      })
    })
    
    return result
  },

  /**
   * Создать permission строку
   */
  createPermissionString(section: string, resource: string, action: string): string {
    return `${section}.${resource}.${action}`
  },

  /**
   * Распарсить permission строку
   */
  parsePermissionString(permission: string): { section: string, resource: string, action: string } | null {
    const parts = permission.split('.')
    if (parts.length !== 3) return null
    
    return {
      section: parts[0],
      resource: parts[1], 
      action: parts[2]
    }
  }
}