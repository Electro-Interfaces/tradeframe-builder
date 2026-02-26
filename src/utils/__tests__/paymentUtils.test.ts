import { describe, it, expect } from 'vitest';
import { normalizePaymentMethod, getPaymentTypeDisplayName } from '../paymentUtils';

describe('normalizePaymentMethod', () => {
  it('нормализует наличные', () => {
    expect(normalizePaymentMethod('cash')).toBe('Наличные');
    expect(normalizePaymentMethod('наличные')).toBe('Наличные');
    expect(normalizePaymentMethod('Наличн.')).toBe('Наличные');
  });

  it('нормализует банковские карты', () => {
    expect(normalizePaymentMethod('bank_card')).toBe('Банковские');
    expect(normalizePaymentMethod('карта')).toBe('Банковские');
    expect(normalizePaymentMethod('Банковские карты')).toBe('Банковские');
  });

  it('различает безнал и безнал.электрон', () => {
    expect(normalizePaymentMethod('Безнал')).toBe('Безнал');
    expect(normalizePaymentMethod('Безнал.электрон')).toBe('Безнал.электрон');
  });

  it('нормализует талоны', () => {
    expect(normalizePaymentMethod('Талоны на бензин')).toBe('Талоны');
  });

  it('пустая строка возвращает "-"', () => {
    expect(normalizePaymentMethod('')).toBe('-');
  });

  it('неизвестный метод возвращается как есть', () => {
    expect(normalizePaymentMethod('Криптовалюта')).toBe('Криптовалюта');
  });

  it('обрезает пробелы', () => {
    expect(normalizePaymentMethod('  cash  ')).toBe('Наличные');
  });
});

describe('getPaymentTypeDisplayName', () => {
  it('переводит API ключи в русские названия', () => {
    expect(getPaymentTypeDisplayName('cash')).toBe('Наличные');
    expect(getPaymentTypeDisplayName('bank_card')).toBe('Банковская карта');
    expect(getPaymentTypeDisplayName('fuel_card')).toBe('Топливная карта');
  });

  it('undefined возвращает "Неизвестно"', () => {
    expect(getPaymentTypeDisplayName(undefined)).toBe('Неизвестно');
  });

  it('неизвестный ключ возвращается как есть', () => {
    expect(getPaymentTypeDisplayName('bitcoin')).toBe('bitcoin');
  });

  it('регистронезависимый', () => {
    expect(getPaymentTypeDisplayName('Cash')).toBe('Наличные');
    expect(getPaymentTypeDisplayName('CASH')).toBe('Наличные');
  });
});
