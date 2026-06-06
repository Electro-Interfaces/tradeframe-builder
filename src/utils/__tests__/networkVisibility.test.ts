import { describe, it, expect } from 'vitest';
import { isOperationalNetwork } from '../networkVisibility';

describe('isOperationalNetwork', () => {
  it('скрывает сеть с 0 точек (БТО после переезда всех станций в ГИГ)', () => {
    expect(isOperationalNetwork({ pointsCount: 0 })).toBe(false);
  });

  it('показывает рабочую сеть со станциями (ГИГ)', () => {
    expect(isOperationalNetwork({ pointsCount: 9 })).toBe(true);
  });

  it('показывает сеть даже с одной точкой', () => {
    expect(isOperationalNetwork({ pointsCount: 1 })).toBe(true);
  });

  it('трактует отсутствующий pointsCount как 0 (скрыта)', () => {
    expect(isOperationalNetwork({} as { pointsCount?: number } as { pointsCount: number })).toBe(false);
  });
});
