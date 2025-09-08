/**
 * Константы категорий команд для использования вместо mock данных
 */

export const COMMAND_CATEGORIES = {
  shift_operations: {
    name: 'Операции со сменами',
    icon: '🕒',
    description: 'Открытие и закрытие смен, управление операторами'
  },
  pricing: {
    name: 'Ценовые операции',
    icon: '💰',
    description: 'Управление ценами на топливо и услуги'
  },
  reporting: {
    name: 'Отчетность',
    icon: '📊',
    description: 'Создание различных отчетов и статистики'
  },
  maintenance: {
    name: 'Обслуживание',
    icon: '🔧',
    description: 'Техническое обслуживание и диагностика оборудования'
  },
  backup: {
    name: 'Резервное копирование',
    icon: '💾',
    description: 'Создание и восстановление резервных копий'
  },
  system: {
    name: 'Системные операции',
    icon: '⚙️',
    description: 'Системная диагностика и мониторинг'
  },
  fuel_operations: {
    name: 'Операции с топливом',
    icon: '⛽',
    description: 'Измерение остатков, контроль качества топлива'
  },
  equipment_control: {
    name: 'Управление оборудованием',
    icon: '🏭',
    description: 'Контроль состояния и настройки оборудования'
  },
  pos_operations: {
    name: 'POS операции',
    icon: '💳',
    description: 'Операции с кассовыми системами'
  },
  security: {
    name: 'Безопасность',
    icon: '🔐',
    description: 'Операции обеспечения безопасности системы'
  },
  custom: {
    name: 'Пользовательские',
    icon: '🎯',
    description: 'Пользовательские команды и сценарии'
  }
} as const;