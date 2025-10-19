/**
 * Конфигурация Pull-to-Refresh
 */

export const PULL_TO_REFRESH_CONFIG = {
  /** Порог для активации обновления (в пикселях) */
  PULL_THRESHOLD: 80,
  
  /** Максимальное расстояние для pull (в пикселях) */
  MAX_PULL_DISTANCE: 120,
  
  /** Порог появления индикатора (в пикселях) */
  INDICATOR_APPEAR_THRESHOLD: 30,
  
  /** Минимальное расстояние для начала pull (в пикселях) */
  MIN_PULL_START: 20,
  
  /** Длительность вибрации при активации (в миллисекундах) */
  HAPTIC_DURATION: 50,
  
  /** Задержка обновления данных после перезагрузки терминала (в миллисекундах) */
  TERMINAL_RESTART_DELAY: 3000
} as const;
