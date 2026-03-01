import { describe, it, expect } from 'vitest';
import {
  cronToHumanReadable,
  isValidCron,
  getScheduleShortDescription,
} from '../scheduleFormatter';

// =============================================================================
// cronToHumanReadable
// =============================================================================
describe('cronToHumanReadable', () => {
  it('каждые 5 минут: "*/5 * * * *"', () => {
    expect(cronToHumanReadable('*/5 * * * *')).toBe('Каждые 5 минут');
  });

  it('каждую минуту: "*/1 * * * *"', () => {
    expect(cronToHumanReadable('*/1 * * * *')).toBe('Каждую минуту');
  });

  it('каждые 2 часа: "0 */2 * * *"', () => {
    expect(cronToHumanReadable('0 */2 * * *')).toBe('Каждые 2 часов');
  });

  it('каждый час: "0 */1 * * *"', () => {
    expect(cronToHumanReadable('0 */1 * * *')).toBe('Каждый час');
  });

  it('ежедневно в 09:30: "30 9 * * *"', () => {
    expect(cronToHumanReadable('30 9 * * *')).toBe('Ежедневно в 09:30');
  });

  it('ежедневно в 00:00: "0 0 * * *"', () => {
    expect(cronToHumanReadable('0 0 * * *')).toBe('Ежедневно в 00:00');
  });

  it('по понедельник: "0 10 * * 1"', () => {
    expect(cronToHumanReadable('0 10 * * 1')).toBe('По понедельник в 10:00');
  });

  it('по воскресенье: "0 8 * * 0"', () => {
    expect(cronToHumanReadable('0 8 * * 0')).toBe('По воскресенье в 08:00');
  });

  it('по субботу: "30 14 * * 6"', () => {
    expect(cronToHumanReadable('30 14 * * 6')).toBe('По субботу в 14:30');
  });

  it('ежемесячно 15-го: "0 12 15 * *"', () => {
    expect(cronToHumanReadable('0 12 15 * *')).toBe('15-го числа в 12:00');
  });

  it('диапазон часов: "0 9-17 * * *" → ежедневный формат (матчится первым)', () => {
    // Ежедневный шаблон (hour !== '*' && minute !== '*') матчится раньше диапазона
    expect(cronToHumanReadable('0 9-17 * * *')).toBe('Ежедневно в 9-17:00');
  });

  it('несколько часов: "0 9,18 * * *"', () => {
    expect(cronToHumanReadable('0 9,18 * * *')).toBe('В 09:00, 18:00');
  });

  it('пустая строка → "Не задано"', () => {
    expect(cronToHumanReadable('')).toBe('Не задано');
  });

  it('невалидный cron (3 поля) → возвращает как есть', () => {
    expect(cronToHumanReadable('* * *')).toBe('* * *');
  });
});

// =============================================================================
// isValidCron
// =============================================================================
describe('isValidCron', () => {
  it('валидный 5-полевой cron', () => {
    expect(isValidCron('0 12 * * *')).toBe(true);
  });

  it('*/N формат', () => {
    expect(isValidCron('*/5 * * * *')).toBe(true);
    expect(isValidCron('0 */2 * * *')).toBe(true);
  });

  it('все звёздочки', () => {
    expect(isValidCron('* * * * *')).toBe(true);
  });

  it('3 поля → false', () => {
    expect(isValidCron('* * *')).toBe(false);
  });

  it('пустая строка → false', () => {
    expect(isValidCron('')).toBe(false);
  });

  it('минуты out-of-range (60) → false', () => {
    expect(isValidCron('60 0 * * *')).toBe(false);
  });

  it('часы out-of-range (24) → false', () => {
    expect(isValidCron('0 24 * * *')).toBe(false);
  });

  it('день недели out-of-range (7) → false', () => {
    expect(isValidCron('0 0 * * 7')).toBe(false);
  });

  it('ranges: "0 9-17 * * *"', () => {
    expect(isValidCron('0 9-17 * * *')).toBe(true);
  });

  it('invalid range (start > end) → false', () => {
    expect(isValidCron('0 17-9 * * *')).toBe(false);
  });

  it('lists: "0 9,12,18 * * *"', () => {
    expect(isValidCron('0 9,12,18 * * *')).toBe(true);
  });

  it('list with out-of-range → false', () => {
    expect(isValidCron('0 9,25 * * *')).toBe(false);
  });

  it('день месяца 0 → false', () => {
    expect(isValidCron('0 0 0 * *')).toBe(false);
  });

  it('месяц 0 → false', () => {
    expect(isValidCron('0 0 1 0 *')).toBe(false);
  });

  it('месяц 13 → false', () => {
    expect(isValidCron('0 0 1 13 *')).toBe(false);
  });
});

// =============================================================================
// getScheduleShortDescription
// =============================================================================
describe('getScheduleShortDescription', () => {
  it('сокращает "Ежедневно в" → "Ежедн."', () => {
    const result = getScheduleShortDescription('30 9 * * *');
    expect(result).toContain('Ежедн.');
  });

  it('сокращает "часов" → "ч"', () => {
    const result = getScheduleShortDescription('0 */2 * * *');
    expect(result).toContain('ч');
    expect(result).not.toContain('часов');
  });

  it('сокращает "минут" → "мин"', () => {
    const result = getScheduleShortDescription('*/5 * * * *');
    expect(result).toContain('мин');
    expect(result).not.toContain('минут');
  });
});
