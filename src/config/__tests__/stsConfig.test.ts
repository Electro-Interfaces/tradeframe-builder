import { describe, it, expect } from 'vitest';
import { getSystemId } from '@/config/stsConfig';

describe('getSystemId', () => {
  it('возвращает null, если сеть не выбрана', () => {
    expect(getSystemId(null)).toBeNull();
    expect(getSystemId(undefined)).toBeNull();
  });

  it('берёт external_id из колонки', () => {
    expect(getSystemId({ external_id: '15' })).toBe(15);
  });

  it('колонка external_id приоритетнее settings.external_id (кейс переезда ГИГ 65→15)', () => {
    // колонка обновлена миграцией на 15, в settings остался legacy 65 —
    // должен победить 15, иначе в STS уйдёт несуществующий system=65
    expect(getSystemId({ external_id: '15', settings: { external_id: '65' } })).toBe(15);
  });

  it('падает на settings.external_id как fallback, если колонка пуста', () => {
    expect(getSystemId({ settings: { external_id: '29' } })).toBe(29);
  });

  it('бросает ошибку, если external_id не задан нигде', () => {
    expect(() => getSystemId({})).toThrow();
    expect(() => getSystemId({ settings: {} })).toThrow();
  });
});
