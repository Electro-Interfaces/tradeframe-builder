import { describe, it, expect } from 'vitest';
import {
  normalizePaymentMethod,
  getPaymentTypeDisplayName,
  classifyPayment,
  isCashOrCard,
} from '../paymentUtils';

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

describe('classifyPayment', () => {
  it('наличные → cash', () => {
    expect(classifyPayment('Наличные')).toBe('cash');
    expect(classifyPayment('cash')).toBe('cash');
    expect(classifyPayment('наличн.')).toBe('cash');
  });

  it('банковские карты (СберБанк, СБП, VISA) → card', () => {
    expect(classifyPayment('СберБанк')).toBe('card');
    expect(classifyPayment('СБП')).toBe('card');
    expect(classifyPayment('Visa')).toBe('card');
    expect(classifyPayment('MasterCard')).toBe('card');
    expect(classifyPayment('bank_card')).toBe('card');
    expect(classifyPayment('Банковская карта')).toBe('card');
    expect(classifyPayment('Эквайринг')).toBe('card');
  });

  it('безнал и безнал.электрон → card', () => {
    expect(classifyPayment('Безнал')).toBe('card');
    expect(classifyPayment('Безнал.')).toBe('card');
    expect(classifyPayment('Безнал.электрон')).toBe('card');
  });

  it('купоны/талоны → coupon', () => {
    expect(classifyPayment('Талоны')).toBe('coupon');
    expect(classifyPayment('Купон на сдачу')).toBe('coupon');
    expect(classifyPayment('coupon')).toBe('coupon');
  });

  it('БАЛТОП/Инфорком/VIAcard → corporate (реальные типы с АЗС 209)', () => {
    expect(classifyPayment('БАЛТОП')).toBe('corporate');
    expect(classifyPayment('Инфорком')).toBe('corporate');
    expect(classifyPayment('VIAcard')).toBe('corporate');
    expect(classifyPayment('Виакард')).toBe('corporate');
  });

  it('КР / Корп.карты → corporate', () => {
    expect(classifyPayment('КР')).toBe('corporate');
    expect(classifyPayment('Корпоративные')).toBe('corporate');
    expect(classifyPayment('Корп.карты')).toBe('corporate');
    expect(classifyPayment('Корп карты')).toBe('corporate');
    expect(classifyPayment('Ведомость')).toBe('corporate');
  });

  it('МобилПр. → online (ПЕРЕД общим «мобил»)', () => {
    expect(classifyPayment('МобилПр.')).toBe('online');
    expect(classifyPayment('Мобильное приложение')).toBe('online');
    expect(classifyPayment('Онлайн')).toBe('online');
    expect(classifyPayment('online_order')).toBe('online');
    expect(classifyPayment('QR')).toBe('online');
  });

  it('топливные карты → fuel_card (ПЕРЕД корпоративными)', () => {
    expect(classifyPayment('Топливные карты')).toBe('fuel_card');
    expect(classifyPayment('Топл. карты')).toBe('fuel_card');
    expect(classifyPayment('НКТ')).toBe('fuel_card');
    expect(classifyPayment('fuel_card')).toBe('fuel_card');
  });

  it('пустая строка или неизвестный тип → other', () => {
    expect(classifyPayment('')).toBe('other');
    expect(classifyPayment('Криптовалюта')).toBe('other');
  });

  it('регистронезависимый, обрезает пробелы', () => {
    expect(classifyPayment('  НАЛИЧНЫЕ  ')).toBe('cash');
    expect(classifyPayment('балтоп')).toBe('corporate');
  });
});

describe('isCashOrCard', () => {
  it('возвращает true только для cash и card', () => {
    expect(isCashOrCard('Наличные')).toBe(true);
    expect(isCashOrCard('СберБанк')).toBe(true);
    expect(isCashOrCard('Безнал.')).toBe(true);
  });

  it('возвращает false для безналичных типов (Талоны / БАЛТОП / VIAcard / МобилПр.)', () => {
    expect(isCashOrCard('Талоны')).toBe(false);
    expect(isCashOrCard('БАЛТОП')).toBe(false);
    expect(isCashOrCard('Инфорком')).toBe(false);
    expect(isCashOrCard('VIAcard')).toBe(false);
    expect(isCashOrCard('МобилПр.')).toBe(false);
    expect(isCashOrCard('Топливные карты')).toBe(false);
  });
});
