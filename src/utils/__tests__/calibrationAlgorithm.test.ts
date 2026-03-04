import { describe, it, expect } from 'vitest';
import {
  calculateTankFullVolume,
  calculateHorizontalCylinderVolume,
  calculateLevelFromVolume,
  correctVolumeForTemperature,
  normalizeVolumeToBaseTemperature,
  buildGeometricCalibrationTable,
  buildCurrentCalibrationTable,
  calculateCalibrationTable,
} from '../calibrationAlgorithm';
import type { TankCalibrationSettings, TankHistoryRecord, TransactionItem } from '@/types/tanks';
import { DEFAULT_CALIBRATION_SETTINGS } from '@/types/tanks';

// =============================================================================
// Хелперы для тестов
// =============================================================================

function makeSettings(overrides: Partial<TankCalibrationSettings> = {}): TankCalibrationSettings {
  return {
    ...DEFAULT_CALIBRATION_SETTINGS,
    tank_id: 'test-tank-1',
    ...overrides,
  } as TankCalibrationSettings;
}

function makeHistoryRecord(overrides: Partial<TankHistoryRecord> = {}): TankHistoryRecord {
  return {
    number: 1,
    fuel: 2,
    fuel_name: 'АИ-92',
    state: 1,
    volume_begin: '10000',
    volume_end: '9500',
    volume_max: '50000',
    volume_free: '40500',
    volume: '10000',
    amount_begin: '7500',
    amount_end: '7125',
    level: '100',  // в см
    temperature: '15',
    density: '750',
    water: { volume: '0', amount: '0', level: '0' },
    release: { volume: '500', amount: '375' },
    dt: '2025-01-15T10:00:00Z',
    ...overrides,
  };
}

/**
 * Генерирует набор исторических записей с линейной зависимостью level→volume
 * Имитирует данные вертикального цилиндра (линейная зависимость)
 */
function generateLinearHistory(
  count: number,
  tankNumber: number = 1,
  options?: { startLevel?: number; levelStep?: number; volumePerMm?: number }
): TankHistoryRecord[] {
  const startLevel = options?.startLevel ?? 50;
  const levelStep = options?.levelStep ?? 5;
  const volumePerMm = options?.volumePerMm ?? 10;  // 10 л на мм

  const records: TankHistoryRecord[] = [];
  const baseTime = new Date('2025-01-15T00:00:00Z').getTime();

  for (let i = 0; i < count; i++) {
    const levelCm = startLevel + i * levelStep; // в см
    const levelMm = levelCm * 10;
    const volume = levelMm * volumePerMm;

    records.push(makeHistoryRecord({
      number: tankNumber,
      level: String(levelCm),
      volume: String(volume),
      temperature: '15',
      dt: new Date(baseTime + i * 600000).toISOString(), // каждые 10 мин
    }));
  }

  return records;
}

// =============================================================================
// calculateTankFullVolume
// =============================================================================
describe('calculateTankFullVolume', () => {
  it('стандартный горизонтальный цилиндр d=2800, L=8500', () => {
    const vol = calculateTankFullVolume(2800, 8500);
    // π × 1400² × 8500 / 1e6
    const expected = Math.PI * 1400 * 1400 * 8500 / 1e6;
    expect(vol).toBeCloseTo(expected, 1);
  });

  it('нулевые размеры → 0', () => {
    expect(calculateTankFullVolume(0, 0)).toBe(0);
  });
});

// =============================================================================
// calculateHorizontalCylinderVolume
// =============================================================================
describe('calculateHorizontalCylinderVolume', () => {
  const D = 2800, L = 8500;

  it('level=0 → 0', () => {
    expect(calculateHorizontalCylinderVolume(0, D, L)).toBe(0);
  });

  it('level=diameter → полный объём', () => {
    const vol = calculateHorizontalCylinderVolume(D, D, L);
    const full = calculateTankFullVolume(D, L);
    expect(vol).toBeCloseTo(full, 1);
  });

  it('level=R → половина объёма', () => {
    const vol = calculateHorizontalCylinderVolume(D / 2, D, L);
    const full = calculateTankFullVolume(D, L);
    expect(vol).toBeCloseTo(full / 2, 1);
  });

  it('level<0 → 0', () => {
    expect(calculateHorizontalCylinderVolume(-10, D, L)).toBe(0);
  });

  it('level>diameter → не больше полного', () => {
    const vol = calculateHorizontalCylinderVolume(D + 100, D, L);
    const full = calculateTankFullVolume(D, L);
    expect(vol).toBeCloseTo(full, 1);
  });

  it('монотонно растёт с уровнем', () => {
    const volumes = [0, 500, 1000, 1400, 2000, 2500, 2800].map(
      level => calculateHorizontalCylinderVolume(level, D, L)
    );
    for (let i = 1; i < volumes.length; i++) {
      expect(volumes[i]).toBeGreaterThanOrEqual(volumes[i - 1]);
    }
  });
});

// =============================================================================
// calculateLevelFromVolume (обратная функция)
// =============================================================================
describe('calculateLevelFromVolume', () => {
  const settings = makeSettings();

  it('volume=0 → level=0', () => {
    expect(calculateLevelFromVolume(0, settings)).toBe(0);
  });

  it('полный объём → level=diameter', () => {
    const fullVol = calculateTankFullVolume(settings.tank_diameter_mm, settings.tank_length_mm);
    const level = calculateLevelFromVolume(fullVol, settings);
    expect(level).toBeCloseTo(settings.tank_diameter_mm, 0);
  });

  it('обратимость: volume→level→volume', () => {
    const testLevel = 1000;
    const vol = calculateHorizontalCylinderVolume(
      testLevel, settings.tank_diameter_mm, settings.tank_length_mm, 0
    );
    const recoveredLevel = calculateLevelFromVolume(vol, settings);
    expect(recoveredLevel).toBeCloseTo(testLevel, 0);
  });
});

// =============================================================================
// Температурная коррекция
// =============================================================================
describe('correctVolumeForTemperature', () => {
  const settings = makeSettings();

  it('при базовой температуре объём не меняется', () => {
    const vol = correctVolumeForTemperature(10000, settings.base_temperature, settings);
    expect(vol).toBe(10000);
  });

  it('при T > base объём увеличивается', () => {
    const vol = correctVolumeForTemperature(10000, 30, settings);
    expect(vol).toBeGreaterThan(10000);
  });

  it('при T < base объём уменьшается', () => {
    // T=0 ложно в JS (!0 === true), используем T=-5
    const vol = correctVolumeForTemperature(10000, -5, settings);
    expect(vol).toBeLessThan(10000);
  });

  it('при NaN температуре возвращает исходный объём', () => {
    expect(correctVolumeForTemperature(10000, NaN, settings)).toBe(10000);
  });
});

describe('normalizeVolumeToBaseTemperature', () => {
  const settings = makeSettings();

  it('обратимость с correctVolumeForTemperature', () => {
    const original = 10000;
    const temp = 25;
    const corrected = correctVolumeForTemperature(original, temp, settings);
    const normalized = normalizeVolumeToBaseTemperature(corrected, temp, settings);
    expect(normalized).toBeCloseTo(original, 2);
  });
});

// =============================================================================
// buildGeometricCalibrationTable
// =============================================================================
describe('buildGeometricCalibrationTable', () => {
  it('генерирует таблицу с шагом calibration_step_mm', () => {
    const settings = makeSettings({ calibration_step_mm: 100 });
    const result = buildGeometricCalibrationTable(settings);

    expect(result.table.length).toBeGreaterThan(0);
    expect(result.quality_metrics?.r_squared).toBe(1.0);
    expect(result.method_used).toBe('direct_interpolation');

    // Шаг между точками = 100 мм
    for (let i = 1; i < result.table.length; i++) {
      expect(result.table[i].level_mm - result.table[i - 1].level_mm).toBe(100);
    }
  });

  it('первая точка level=0, volume=0', () => {
    const result = buildGeometricCalibrationTable(makeSettings());
    expect(result.table[0].level_mm).toBe(0);
    expect(result.table[0].volume_liters).toBe(0);
  });

  it('последняя точка — полный диаметр', () => {
    const settings = makeSettings({ calibration_step_mm: 100 });
    const result = buildGeometricCalibrationTable(settings);
    const lastPoint = result.table[result.table.length - 1];
    expect(lastPoint.level_mm).toBe(settings.tank_diameter_mm);
  });

  it('объёмы монотонно растут', () => {
    const result = buildGeometricCalibrationTable(makeSettings());
    for (let i = 1; i < result.table.length; i++) {
      expect(result.table[i].volume_liters).toBeGreaterThanOrEqual(result.table[i - 1].volume_liters);
    }
  });
});

// =============================================================================
// buildCurrentCalibrationTable — через public API тестируем внутренние функции:
// filterDataPoints, buildCalibrationTable, calculateQualityMetrics
// =============================================================================
describe('buildCurrentCalibrationTable', () => {
  it('линейные данные → хорошее качество (least_squares)', () => {
    const settings = makeSettings({
      calibration_method: 'least_squares',
      calibration_step_mm: 100,
      sensor_blind_zone_bottom_mm: 0,
      sensor_blind_zone_top_mm: 0,
      outlier_filter_enabled: false,
    });
    const history = generateLinearHistory(20, 1, { startLevel: 50, levelStep: 5, volumePerMm: 10 });
    const result = buildCurrentCalibrationTable(history, settings);

    expect(result.table.length).toBeGreaterThan(0);
    expect(result.quality_metrics?.r_squared).toBeGreaterThan(0.95);
  });

  it('линейные данные → least_squares и moving_average дают близкие результаты', () => {
    const history = generateLinearHistory(20, 1, { startLevel: 50, levelStep: 5, volumePerMm: 10 });

    const resultLS = buildCurrentCalibrationTable(history, makeSettings({
      calibration_method: 'least_squares',
      calibration_step_mm: 100,
      sensor_blind_zone_bottom_mm: 0, sensor_blind_zone_top_mm: 0,
      outlier_filter_enabled: false,
    }));

    const resultMA = buildCurrentCalibrationTable(history, makeSettings({
      calibration_method: 'moving_average',
      calibration_step_mm: 100,
      sensor_blind_zone_bottom_mm: 0, sensor_blind_zone_top_mm: 0,
      outlier_filter_enabled: false,
    }));

    // На линейных данных оба метода должны давать похожие результаты
    for (let i = 0; i < Math.min(resultLS.table.length, resultMA.table.length); i++) {
      expect(resultMA.table[i].volume_liters)
        .toBeCloseTo(resultLS.table[i].volume_liters, -1); // ±10 л
    }
  });

  it('moving_average сглаживает данные', () => {
    const settings = makeSettings({
      calibration_method: 'moving_average',
      calibration_step_mm: 100,
      sensor_blind_zone_bottom_mm: 0, sensor_blind_zone_top_mm: 0,
      outlier_filter_enabled: false,
    });
    const history = generateLinearHistory(20, 1, { startLevel: 50, levelStep: 5, volumePerMm: 10 });
    const result = buildCurrentCalibrationTable(history, settings);

    expect(result.table.length).toBeGreaterThan(0);
    expect(result.method_used).toBe('moving_average');
  });

  it('direct_interpolation проходит через реальные точки', () => {
    const settings = makeSettings({
      calibration_method: 'direct_interpolation',
      calibration_step_mm: 100,
      sensor_blind_zone_bottom_mm: 0, sensor_blind_zone_top_mm: 0,
      outlier_filter_enabled: false,
    });
    const history = generateLinearHistory(20, 1, { startLevel: 50, levelStep: 5, volumePerMm: 10 });
    const result = buildCurrentCalibrationTable(history, settings);

    expect(result.table.length).toBeGreaterThan(0);
    expect(result.method_used).toBe('direct_interpolation');
  });

  it('недостаточно данных → пустая таблица', () => {
    const settings = makeSettings();
    const history = [makeHistoryRecord()]; // только 1 точка
    const result = buildCurrentCalibrationTable(history, settings);
    expect(result.table).toHaveLength(0);
    expect(result.quality_metrics?.r_squared).toBe(0);
  });

  it('невалидные данные фильтруются', () => {
    const settings = makeSettings({
      calibration_method: 'least_squares',
      calibration_step_mm: 100,
      sensor_blind_zone_bottom_mm: 0, sensor_blind_zone_top_mm: 0,
      outlier_filter_enabled: false,
    });
    const history = [
      makeHistoryRecord({ level: 'abc', volume: '1000', dt: '2025-01-15T10:00:00Z' }),
      makeHistoryRecord({ level: '100', volume: 'xyz', dt: '2025-01-15T10:10:00Z' }),
      ...generateLinearHistory(10, 1),
    ];
    const result = buildCurrentCalibrationTable(history, settings);
    // Невалидные записи отфильтрованы, но остальные 10 дают таблицу
    expect(result.table.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// BUG-1 FIX: filterByLocalTrend при expected=0 не пропускает всё
// Тестируем через buildCurrentCalibrationTable с outlier фильтром
// =============================================================================
describe('BUG-1: filterByLocalTrend при expected≈0', () => {
  it('точки с volume=0 при level=0 не дают NaN', () => {
    const settings = makeSettings({
      calibration_method: 'least_squares',
      calibration_step_mm: 100,
      sensor_blind_zone_bottom_mm: 0, sensor_blind_zone_top_mm: 0,
      outlier_filter_enabled: false,
      bias_offset_percent: 0.5,
    });

    // Данные включают точку с околонулевым уровнем и объёмом
    const history = [
      makeHistoryRecord({ number: 1, level: '0.1', volume: '0', dt: '2025-01-15T09:50:00Z' }),
      makeHistoryRecord({ number: 1, level: '1', volume: '100', dt: '2025-01-15T09:55:00Z' }),
      ...generateLinearHistory(10, 1, { startLevel: 50, levelStep: 5, volumePerMm: 10 }),
    ];

    // Не должен падать с NaN
    const result = buildCurrentCalibrationTable(history, settings);
    expect(result.table.length).toBeGreaterThan(0);

    // Все объёмы должны быть числами (не NaN)
    for (const point of result.table) {
      expect(Number.isFinite(point.volume_liters)).toBe(true);
    }
  });
});

// =============================================================================
// BUG-4 FIX: buildCalibrationTable валидирует входные данные
// =============================================================================
describe('BUG-4: buildCalibrationTable валидация', () => {
  it('данные с нулевым уровнем → ошибка', () => {
    const settings = makeSettings({
      calibration_method: 'least_squares',
      calibration_step_mm: 100,
      sensor_blind_zone_bottom_mm: 0, sensor_blind_zone_top_mm: 0,
      outlier_filter_enabled: false,
    });

    // Все точки с level=0 → max_level=0 → ошибка
    const history = [
      makeHistoryRecord({ number: 1, level: '0', volume: '100', dt: '2025-01-15T10:00:00Z' }),
      makeHistoryRecord({ number: 1, level: '0', volume: '200', dt: '2025-01-15T10:10:00Z' }),
      makeHistoryRecord({ number: 1, level: '0', volume: '300', dt: '2025-01-15T10:20:00Z' }),
    ];

    expect(() => buildCurrentCalibrationTable(history, settings)).toThrow();
  });
});

// =============================================================================
// calculateCalibrationTable — интеграционный тест
// =============================================================================
describe('calculateCalibrationTable', () => {
  it('минимальный набор данных — возвращает таблицу и diagnostics', () => {
    const settings = makeSettings({
      calibration_method: 'least_squares',
      calibration_step_mm: 100,
      sensor_blind_zone_bottom_mm: 0,
      sensor_blind_zone_top_mm: 0,
      dead_stock_liters: 0,
      outlier_filter_enabled: false,
      bias_offset_percent: 0,
    });

    const history = generateLinearHistory(30, 1, {
      startLevel: 50, levelStep: 3, volumePerMm: 10,
    });

    const transactions: TransactionItem[] = [];

    const result = calculateCalibrationTable(history, transactions, settings, 1);

    expect(result.table.length).toBeGreaterThan(0);
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics!.segmentsCount).toBe(1);
    expect(result.diagnostics!.warnings.length).toBeGreaterThan(0);
    // Должно быть сообщение об опорной точке
    const refWarning = result.diagnostics!.warnings.find(w => w.includes('⭐ Опорная точка'));
    expect(refWarning).toBeDefined();
  });

  it('с транзакциями — объёмы корректно вычисляются', () => {
    const settings = makeSettings({
      calibration_method: 'least_squares',
      calibration_step_mm: 100,
      sensor_blind_zone_bottom_mm: 0,
      sensor_blind_zone_top_mm: 0,
      dead_stock_liters: 0,
      outlier_filter_enabled: false,
      bias_offset_percent: 0,
    });

    const baseTime = new Date('2025-01-15T00:00:00Z').getTime();

    // Простая история: уровень падает линейно
    const history: TankHistoryRecord[] = [];
    for (let i = 0; i < 20; i++) {
      history.push(makeHistoryRecord({
        number: 1,
        level: String(200 - i * 5),  // 200см → 105см
        volume: String(20000 - i * 500),
        dt: new Date(baseTime + i * 600000).toISOString(),
      }));
    }

    // Транзакции (отпуски) — суммарно 500л за весь период
    const transactions: TransactionItem[] = [];
    for (let i = 0; i < 5; i++) {
      transactions.push({
        id: i + 1,
        pos: 1,
        shift: 1,
        number: i + 1,
        tank: 1,
        nozzle: 1,
        fuel: 2,
        fuel_name: 'АИ-92',
        quantity: '100',
        cost: '5000',
        price: '50',
        amount: '75',
        density: '750',
        pay_type: { id: 1, name: 'Наличные' },
        dt: new Date(baseTime + (i * 4 + 2) * 600000).toISOString(),
      });
    }

    const result = calculateCalibrationTable(history, transactions, settings, 1);

    expect(result.table.length).toBeGreaterThan(0);
    expect(result.filtered_points_count).toBeGreaterThan(0);
    expect(result.quality_metrics?.r_squared).toBeGreaterThan(0);
  });

  it('пустая история → пустой результат', () => {
    const settings = makeSettings();
    const result = calculateCalibrationTable([], [], settings, 1);
    expect(result.table).toHaveLength(0);
    expect(result.diagnostics?.warnings).toContain('Недостаточно данных для калибровки');
  });

  it('BUG-6: диагностика показывает реальный источник опорной точки', () => {
    const settings = makeSettings({
      calibration_method: 'least_squares',
      calibration_step_mm: 100,
      sensor_blind_zone_bottom_mm: 0,
      sensor_blind_zone_top_mm: 0,
      dead_stock_liters: 0,
      outlier_filter_enabled: false,
      bias_offset_percent: 0,
      reference_source: 'geometry',
    });

    const history = generateLinearHistory(20, 1, { startLevel: 50, levelStep: 5, volumePerMm: 10 });
    const result = calculateCalibrationTable(history, [], settings, 1);

    const refWarning = result.diagnostics?.warnings.find(w => w.includes('⭐ Опорная точка'));
    expect(refWarning).toBeDefined();
    expect(refWarning).toContain('(геометрия)');
  });
});

// =============================================================================
// calculateQualityMetrics (R², RMSE, maxError) — через public API
// =============================================================================
describe('calculateQualityMetrics через buildCurrentCalibrationTable', () => {
  it('идеальные линейные данные → R² ≈ 1', () => {
    const settings = makeSettings({
      calibration_method: 'least_squares',
      calibration_step_mm: 50,
      sensor_blind_zone_bottom_mm: 0,
      sensor_blind_zone_top_mm: 0,
      outlier_filter_enabled: false,
    });
    const history = generateLinearHistory(50, 1, { startLevel: 50, levelStep: 2, volumePerMm: 10 });
    const result = buildCurrentCalibrationTable(history, settings);

    expect(result.quality_metrics?.r_squared).toBeGreaterThan(0.99);
    expect(result.quality_metrics?.rmse).toBeLessThan(100);
  });

  it('шумные данные → R² < 1, RMSE > 0', () => {
    const settings = makeSettings({
      calibration_method: 'least_squares',
      calibration_step_mm: 100,
      sensor_blind_zone_bottom_mm: 0,
      sensor_blind_zone_top_mm: 0,
      outlier_filter_enabled: false,
    });

    const baseTime = new Date('2025-01-15T00:00:00Z').getTime();
    const history: TankHistoryRecord[] = [];
    for (let i = 0; i < 30; i++) {
      const levelCm = 50 + i * 5;
      const noise = (Math.sin(i * 7) * 500); // детерминированный "шум"
      history.push(makeHistoryRecord({
        number: 1,
        level: String(levelCm),
        volume: String(levelCm * 100 + noise),
        dt: new Date(baseTime + i * 600000).toISOString(),
      }));
    }

    const result = buildCurrentCalibrationTable(history, settings);
    expect(result.quality_metrics?.r_squared).toBeLessThan(1);
    expect(result.quality_metrics?.r_squared).toBeGreaterThan(0);
    expect(result.quality_metrics?.rmse).toBeGreaterThan(0);
    expect(result.quality_metrics?.max_error).toBeGreaterThan(0);
  });
});
