import { describe, it, expect } from 'vitest';
import {
  calculateTankVolume,
  getSensorAccuracyDefaults,
  interpolateVolume,
} from '../calibrationHelpers';

/** Минимальный mock CalibrationSettings */
function makeSettings(overrides: Record<string, any> = {}) {
  return {
    tank_shape_type: 'horizontal_cylinder',
    tank_diameter_mm: 2800,
    tank_length_mm: 8500,
    tank_width_mm: 0,
    tank_height_mm: 0,
    ...overrides,
  } as any;
}

// =============================================================================
// calculateTankVolume
// =============================================================================
describe('calculateTankVolume', () => {
  it('horizontal_cylinder: π × r² × L / 1_000_000', () => {
    // d=2800, r=1400, L=8500
    // π × 1400² × 8500 / 1_000_000 = π × 1960000 × 8500 / 1_000_000
    const vol = calculateTankVolume(makeSettings({
      tank_shape_type: 'horizontal_cylinder',
      tank_diameter_mm: 2800,
      tank_length_mm: 8500,
    }));
    const expected = Math.PI * Math.pow(1400, 2) * 8500 / 1_000_000;
    expect(vol).toBeCloseTo(expected, 2);
  });

  it('vertical_cylinder: π × r² × H / 1_000_000', () => {
    const vol = calculateTankVolume(makeSettings({
      tank_shape_type: 'vertical_cylinder',
      tank_diameter_mm: 2000,
      tank_height_mm: 5000,
    }));
    const expected = Math.PI * Math.pow(1000, 2) * 5000 / 1_000_000;
    expect(vol).toBeCloseTo(expected, 2);
  });

  it('spherical: (4/3) × π × r³ / 1_000_000', () => {
    const vol = calculateTankVolume(makeSettings({
      tank_shape_type: 'spherical',
      tank_diameter_mm: 2000,
    }));
    const expected = (4 / 3) * Math.PI * Math.pow(1000, 3) / 1_000_000;
    expect(vol).toBeCloseTo(expected, 2);
  });

  it('rectangular: L × W × H / 1_000_000', () => {
    const vol = calculateTankVolume(makeSettings({
      tank_shape_type: 'rectangular',
      tank_length_mm: 3000,
      tank_width_mm: 2000,
      tank_height_mm: 1500,
    }));
    expect(vol).toBeCloseTo(3000 * 2000 * 1500 / 1_000_000, 2);
  });

  it('unknown shape → 0', () => {
    const vol = calculateTankVolume(makeSettings({
      tank_shape_type: 'hexagonal',
    }));
    expect(vol).toBe(0);
  });
});

// =============================================================================
// getSensorAccuracyDefaults
// =============================================================================
describe('getSensorAccuracyDefaults', () => {
  it('radar: 0.1% / 1мм', () => {
    const d = getSensorAccuracyDefaults('radar');
    expect(d.error_percent).toBe(0.1);
    expect(d.accuracy_mm).toBe(1);
  });

  it('float: 1.0% / 1мм', () => {
    const d = getSensorAccuracyDefaults('float');
    expect(d.error_percent).toBe(1.0);
    expect(d.accuracy_mm).toBe(1);
  });

  it('capacitive: 0.2% / 3мм', () => {
    const d = getSensorAccuracyDefaults('capacitive');
    expect(d.error_percent).toBe(0.2);
    expect(d.accuracy_mm).toBe(3);
  });

  it('hydrostatic: 0.5% / 3мм', () => {
    const d = getSensorAccuracyDefaults('hydrostatic');
    expect(d.error_percent).toBe(0.5);
    expect(d.accuracy_mm).toBe(3);
  });

  it('other: 0.5% / 3мм', () => {
    const d = getSensorAccuracyDefaults('other');
    expect(d.error_percent).toBe(0.5);
    expect(d.accuracy_mm).toBe(3);
  });
});

// =============================================================================
// interpolateVolume
// =============================================================================
describe('interpolateVolume', () => {
  it('exact key → возвращает точное значение', () => {
    const map = new Map([[100, 500], [200, 1000]]);
    expect(interpolateVolume(100, map)).toBe(500);
  });

  it('интерполяция между точками', () => {
    const map = new Map([[100, 500], [200, 1000]]);
    // 150 → 500 + 0.5 * (1000-500) = 750
    expect(interpolateVolume(150, map)).toBeCloseTo(750);
  });

  it('интерполяция на 25%', () => {
    const map = new Map([[0, 0], [100, 1000]]);
    expect(interpolateVolume(25, map)).toBeCloseTo(250);
  });

  it('вне диапазона (выше) → null', () => {
    const map = new Map([[100, 500], [200, 1000]]);
    expect(interpolateVolume(300, map)).toBeNull();
  });

  it('вне диапазона (ниже) → null', () => {
    const map = new Map([[100, 500], [200, 1000]]);
    expect(interpolateVolume(50, map)).toBeNull();
  });

  it('пустая Map → null', () => {
    expect(interpolateVolume(100, new Map())).toBeNull();
  });

  it('одна точка, не совпадает → null', () => {
    const map = new Map([[100, 500]]);
    expect(interpolateVolume(50, map)).toBeNull();
  });

  it('много точек — корректная интерполяция', () => {
    const map = new Map([[0, 0], [100, 1000], [200, 3000], [300, 6000]]);
    // Между 100 и 200: t = (150-100)/(200-100) = 0.5
    // vol = 1000 + 0.5 * (3000-1000) = 2000
    expect(interpolateVolume(150, map)).toBeCloseTo(2000);
  });
});
