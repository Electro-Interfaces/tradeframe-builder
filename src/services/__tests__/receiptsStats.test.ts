import { describe, it, expect } from 'vitest';
import { calculateReceiptsStats } from '../receiptsService';

// Итоги по видам — по документу (ТТН), как карточки страницы «Поступления», не по факту замера
describe('calculateReceiptsStats', () => {
  it('суммирует doc.volume, а не fact.volume', () => {
    const r = (doc: string, fact: string) => ({
      service: { service_name: 'ДТ' },
      doc: { volume: doc, amount: '0' },
      fact: { volume: fact, amount: '0' },
      volumeDiffPercent: 0,
      amountDiffPercent: 0,
    }) as any;
    const stats = calculateReceiptsStats([r('6000', '4100'), r('6226', '4400')]);
    expect(stats.byFuelType['ДТ']).toEqual({ count: 2, volume: 12226, amount: 0 });
    expect(stats.totalVolume).toBe(12226);
  });
});
