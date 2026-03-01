import { describe, it, expect } from 'vitest';
import { toLocalDateString, todayString, daysAgoString, monthsAgoString } from '../dateUtils';

// =============================================================================
// toLocalDateString
// =============================================================================
describe('toLocalDateString', () => {
  it('форматирует дату с padding месяца и дня', () => {
    const date = new Date(2026, 0, 5); // 5 января 2026
    expect(toLocalDateString(date)).toBe('2026-01-05');
  });

  it('последний день года', () => {
    const date = new Date(2026, 11, 31); // 31 декабря 2026
    expect(toLocalDateString(date)).toBe('2026-12-31');
  });

  it('двузначный месяц и день', () => {
    const date = new Date(2026, 10, 15); // 15 ноября 2026
    expect(toLocalDateString(date)).toBe('2026-11-15');
  });

  it('первый день года', () => {
    const date = new Date(2026, 0, 1);
    expect(toLocalDateString(date)).toBe('2026-01-01');
  });

  it('без аргументов — возвращает сегодняшнюю дату', () => {
    const result = toLocalDateString();
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(result).toBe(expected);
  });
});

// =============================================================================
// todayString
// =============================================================================
describe('todayString', () => {
  it('совпадает с toLocalDateString(new Date())', () => {
    expect(todayString()).toBe(toLocalDateString(new Date()));
  });
});

// =============================================================================
// daysAgoString
// =============================================================================
describe('daysAgoString', () => {
  it('0 дней назад = сегодня', () => {
    expect(daysAgoString(0)).toBe(todayString());
  });

  it('1 день назад = вчера', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(daysAgoString(1)).toBe(toLocalDateString(yesterday));
  });

  it('7 дней назад', () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    expect(daysAgoString(7)).toBe(toLocalDateString(weekAgo));
  });
});

// =============================================================================
// monthsAgoString
// =============================================================================
describe('monthsAgoString', () => {
  it('0 месяцев = текущий месяц', () => {
    const now = new Date();
    const result = monthsAgoString(0);
    expect(result.startsWith(String(now.getFullYear()))).toBe(true);
  });

  it('1 месяц назад', () => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    expect(monthsAgoString(1)).toBe(toLocalDateString(oneMonthAgo));
  });

  it('12 месяцев назад ≈ год назад', () => {
    const yearAgo = new Date();
    yearAgo.setMonth(yearAgo.getMonth() - 12);
    expect(monthsAgoString(12)).toBe(toLocalDateString(yearAgo));
  });
});
