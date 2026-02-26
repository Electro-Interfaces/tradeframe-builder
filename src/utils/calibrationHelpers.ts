/**
 * Утилиты для калибровки резервуаров
 * Извлечено из TankCalibrationSettings.tsx
 */

import type {
  CalibrationFuelType,
  LevelSensorType,
  CalibrationSettings
} from '@/types/tanks';

/**
 * Расчет объема резервуара по геометрическим размерам (литры)
 */
export function calculateTankVolume(settings: CalibrationSettings): number {
  const shape = settings.tank_shape_type;
  const diameter = settings.tank_diameter_mm;
  const length = settings.tank_length_mm;
  const width = settings.tank_width_mm;
  const height = settings.tank_height_mm;

  switch (shape) {
    case 'horizontal_cylinder':
      return Math.PI * Math.pow(diameter / 2, 2) * length / 1_000_000;
    case 'vertical_cylinder':
      return Math.PI * Math.pow(diameter / 2, 2) * height / 1_000_000;
    case 'spherical':
      return (4 / 3) * Math.PI * Math.pow(diameter / 2, 3) / 1_000_000;
    case 'rectangular':
      return length * width * height / 1_000_000;
    default:
      return 0;
  }
}

/**
 * Рекомендуемые значения погрешностей для типа датчика
 * Данные по ГОСТ и производителям
 */
export function getSensorAccuracyDefaults(sensorType: LevelSensorType) {
  const defaults = {
    radar: { error_percent: 0.1, accuracy_mm: 1 },
    float: { error_percent: 1.0, accuracy_mm: 1 },
    capacitive: { error_percent: 0.2, accuracy_mm: 3 },
    hydrostatic: { error_percent: 0.5, accuracy_mm: 3 },
    other: { error_percent: 0.5, accuracy_mm: 3 }
  };
  return defaults[sensorType];
}

/**
 * Пояснение для текущего типа датчика
 */
export function getSensorAccuracyHint(sensorType: LevelSensorType): string {
  switch (sensorType) {
    case 'radar':
      return 'Радарный: +/-0.1% объема, +/-1-2мм уровня (БАРС351И, Rosemount 5300)';
    case 'float':
      return 'Поплавковый: +/-1% объема, +/-1мм уровня (ГОСТ 8.247)';
    case 'capacitive':
      return 'Емкостной: +/-0.1-0.2% объема, +/-3мм (требует стабильной среды)';
    case 'hydrostatic':
      return 'Гидростатический: +/-0.1-1% объема, +/-3мм (зависит от модели)';
    default:
      return 'Усредненные значения для неопределенного типа датчика';
  }
}

/**
 * Пояснение для ТРК в зависимости от типа топлива
 */
export function getDispenserAccuracyHint(fuelType: CalibrationFuelType): string {
  if (fuelType === 'lpg') {
    return 'СУГ (пропан-бутан): +/-0.25-0.4% (ГОСТ 9018-89)';
  }
  return 'Бензин/ДТ: +/-0.25% коммерческие АЗС (ГОСТ 9018-89, с 2024г обязательно)';
}

/**
 * Коэффициенты по типу топлива
 * Приказ Минэнерго N 281 от 16.04.2018
 */
export const FUEL_COEFFICIENTS: Record<string, { thermal: number; summer_loss: number; winter_loss: number }> = {
  gasoline: { thermal: 0.00083, summer_loss: 0.08, winter_loss: 0.03 },
  diesel: { thermal: 0.00074, summer_loss: 0.05, winter_loss: 0.02 },
  propane: { thermal: 0.003, summer_loss: 0.12, winter_loss: 0.74 },
  gas: { thermal: 0.001, summer_loss: 0.1, winter_loss: 0.05 }
};

/**
 * Интерполяция объема по уровню через калибровочную карту
 */
export function interpolateVolume(
  levelMm: number,
  calibrationMap: Map<number, number>
): number | null {
  if (calibrationMap.has(levelMm)) {
    return calibrationMap.get(levelMm)!;
  }

  const levels = Array.from(calibrationMap.keys()).sort((a, b) => a - b);

  for (let i = 0; i < levels.length - 1; i++) {
    const level1 = levels[i];
    const level2 = levels[i + 1];

    if (levelMm >= level1 && levelMm <= level2) {
      const vol1 = calibrationMap.get(level1)!;
      const vol2 = calibrationMap.get(level2)!;
      const t = (levelMm - level1) / (level2 - level1);
      return vol1 + t * (vol2 - vol1);
    }
  }

  return null;
}
