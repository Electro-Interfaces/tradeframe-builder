import { describe, it, expect } from 'vitest';
import {
  checkBillAcceptorThresholds,
  getThresholdColor,
  getThresholdBgColor,
  getThresholdBorderColor,
} from '../billAcceptorThresholds';

// =============================================================================
// checkBillAcceptorThresholds
// =============================================================================
describe('checkBillAcceptorThresholds', () => {
  it('без порогов → normal', () => {
    const result = checkBillAcceptorThresholds(100, 5000);
    expect(result.level).toBe('normal');
    expect(result.billCountExceeded).toBe(false);
    expect(result.cashAmountExceeded).toBe(false);
  });

  it('undefined thresholds → normal', () => {
    const result = checkBillAcceptorThresholds(100, 5000, undefined);
    expect(result.level).toBe('normal');
  });

  it('warning по billCount', () => {
    const result = checkBillAcceptorThresholds(200, 0, {
      billCountWarning: 150,
      billCountCritical: 300,
    });
    expect(result.level).toBe('warning');
    expect(result.billCountExceeded).toBe(true);
    expect(result.message).toContain('Предупреждение');
    expect(result.message).toContain('200');
  });

  it('warning по cashAmount', () => {
    const result = checkBillAcceptorThresholds(0, 50000, {
      cashAmountWarning: 40000,
      cashAmountCritical: 80000,
    });
    expect(result.level).toBe('warning');
    expect(result.cashAmountExceeded).toBe(true);
  });

  it('critical overrides warning', () => {
    const result = checkBillAcceptorThresholds(350, 90000, {
      billCountWarning: 150,
      billCountCritical: 300,
      cashAmountWarning: 40000,
      cashAmountCritical: 80000,
    });
    expect(result.level).toBe('critical');
  });

  it('critical по billCount', () => {
    const result = checkBillAcceptorThresholds(300, 0, {
      billCountWarning: 150,
      billCountCritical: 300,
    });
    expect(result.level).toBe('critical');
    expect(result.billCountExceeded).toBe(true);
    expect(result.message).toContain('Критический');
  });

  it('critical по cashAmount', () => {
    const result = checkBillAcceptorThresholds(0, 80000, {
      cashAmountWarning: 40000,
      cashAmountCritical: 80000,
    });
    expect(result.level).toBe('critical');
    expect(result.cashAmountExceeded).toBe(true);
  });

  it('оба превышены → сообщение содержит обе причины', () => {
    const result = checkBillAcceptorThresholds(350, 90000, {
      billCountWarning: 150,
      billCountCritical: 300,
      cashAmountWarning: 40000,
      cashAmountCritical: 80000,
    });
    expect(result.billCountExceeded).toBe(true);
    expect(result.cashAmountExceeded).toBe(true);
    expect(result.message).toContain('купюр');
    expect(result.message).toContain('₽');
  });

  it('exact threshold value (>=)', () => {
    const result = checkBillAcceptorThresholds(150, 0, {
      billCountWarning: 150,
      billCountCritical: 300,
    });
    expect(result.level).toBe('warning');
    expect(result.billCountExceeded).toBe(true);
  });

  it('ниже порога → normal', () => {
    const result = checkBillAcceptorThresholds(100, 30000, {
      billCountWarning: 150,
      billCountCritical: 300,
      cashAmountWarning: 40000,
      cashAmountCritical: 80000,
    });
    expect(result.level).toBe('normal');
    expect(result.message).toBeUndefined();
  });
});

// =============================================================================
// getThresholdColor / BgColor / BorderColor
// =============================================================================
describe('getThresholdColor', () => {
  it('normal → text-green-400', () => {
    expect(getThresholdColor('normal')).toBe('text-green-400');
  });

  it('warning → text-yellow-500', () => {
    expect(getThresholdColor('warning')).toBe('text-yellow-500');
  });

  it('critical → text-red-500', () => {
    expect(getThresholdColor('critical')).toBe('text-red-500');
  });
});

describe('getThresholdBgColor', () => {
  it('normal → bg-secondary', () => {
    expect(getThresholdBgColor('normal')).toBe('bg-secondary');
  });

  it('warning → bg-yellow-500/20', () => {
    expect(getThresholdBgColor('warning')).toBe('bg-yellow-500/20');
  });

  it('critical → bg-red-500/20', () => {
    expect(getThresholdBgColor('critical')).toBe('bg-red-500/20');
  });
});

describe('getThresholdBorderColor', () => {
  it('normal → border-border', () => {
    expect(getThresholdBorderColor('normal')).toBe('border-border');
  });

  it('warning → border-yellow-500', () => {
    expect(getThresholdBorderColor('warning')).toBe('border-yellow-500');
  });

  it('critical → border-red-500', () => {
    expect(getThresholdBorderColor('critical')).toBe('border-red-500');
  });
});
