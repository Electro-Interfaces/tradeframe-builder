import { describe, it, expect } from 'vitest';
import { getFuelPriority, sortFuelTypes } from '../fuelPriority';

describe('getFuelPriority', () => {
  it('АИ-98 имеет наивысший приоритет среди бензинов', () => {
    expect(getFuelPriority('АИ-98')).toBe(1);
  });

  it('АИ-95 приоритетнее АИ-92', () => {
    expect(getFuelPriority('АИ-95')).toBeLessThan(getFuelPriority('АИ-92'));
  });

  it('бензины приоритетнее дизеля', () => {
    expect(getFuelPriority('АИ-92')).toBeLessThan(getFuelPriority('ДТ'));
  });

  it('дизель приоритетнее газа', () => {
    expect(getFuelPriority('ДТ')).toBeLessThan(getFuelPriority('Газ'));
  });

  it('неизвестное топливо получает приоритет 99', () => {
    expect(getFuelPriority('Что-то неизвестное')).toBe(99);
  });

  it('распознаёт числовые обозначения бензинов', () => {
    expect(getFuelPriority('95')).toBe(2);
    expect(getFuelPriority('92')).toBe(3);
  });

  it('распознаёт дизельные виды: зимний, летний, арктический', () => {
    const winter = getFuelPriority('ДТ зимний');
    const summer = getFuelPriority('ДТ летний');
    const arctic = getFuelPriority('ДТ арктический');
    expect(winter).toBe(11);
    expect(summer).toBe(12);
    expect(arctic).toBe(13);
  });

  it('распознаёт "Диз. топливо" как дизель', () => {
    expect(getFuelPriority('Диз. топливо')).toBe(10);
  });

  it('регистронезависимый поиск', () => {
    expect(getFuelPriority('аи-95')).toBe(getFuelPriority('АИ-95'));
  });
});

describe('sortFuelTypes', () => {
  it('сортирует топлива по приоритету', () => {
    const input = ['Газ', 'АИ-92', 'ДТ', 'АИ-95', 'АИ-98'];
    const result = sortFuelTypes(input);
    expect(result).toEqual(['АИ-98', 'АИ-95', 'АИ-92', 'ДТ', 'Газ']);
  });

  it('не мутирует исходный массив', () => {
    const input = ['Газ', 'АИ-92'];
    const original = [...input];
    sortFuelTypes(input);
    expect(input).toEqual(original);
  });

  it('одинаковые приоритеты сортируются по алфавиту (ru)', () => {
    const input = ['Неизвестное Б', 'Неизвестное А'];
    const result = sortFuelTypes(input);
    expect(result).toEqual(['Неизвестное А', 'Неизвестное Б']);
  });

  it('пустой массив возвращает пустой массив', () => {
    expect(sortFuelTypes([])).toEqual([]);
  });
});
