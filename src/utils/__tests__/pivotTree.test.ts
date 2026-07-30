import { describe, it, expect } from 'vitest';
import { buildPivotTree, flattenVisible, allExpandablePaths, reorderDims, type PivotLeaf } from '../pivotTree';

// Листья в формате /api/analytics/pivot?dims=station,fuel,payment
const DIMS = ['station', 'fuel', 'payment'];
const LEAVES: PivotLeaf[] = [
  { keys: [210, 'ДТ', 'Банковские'], ops: 301, volume: 10122, revenue: 953210 },
  { keys: [210, 'ДТ', 'Наличные'], ops: 78, volume: 2214, revenue: 208100 },
  { keys: [210, 'АИ-92', 'Банковские'], ops: 514, volume: 9698, revenue: 924741 },
  { keys: [208, 'ДТ', 'БАЛТОП'], ops: 11, volume: 2295, revenue: 215560 },
  { keys: [208, 'АИ-95', null], ops: 4, volume: 0, revenue: 0 },
];

const total = LEAVES.reduce((a, l) => a + l.revenue, 0);

describe('buildPivotTree', () => {
  it('подытоги узлов сходятся с общим итогом', () => {
    const { nodes, totals } = buildPivotTree(LEAVES, DIMS, DIMS);
    expect(totals.ops).toBe(908);
    expect(totals.revenue).toBe(total);
    expect(nodes.reduce((a, n) => a + n.revenue, 0)).toBe(total);
    // каждый уровень тоже сходится со своим родителем
    for (const station of nodes) {
      expect(station.children.reduce((a, n) => a + n.revenue, 0)).toBe(station.revenue);
      for (const fuel of station.children) {
        expect(fuel.children.reduce((a, n) => a + n.revenue, 0)).toBe(fuel.revenue);
      }
    }
  });

  it('доли считаются от родителя и дают 100% на каждом уровне', () => {
    const { nodes } = buildPivotTree(LEAVES, DIMS, DIMS);
    expect(nodes.reduce((a, n) => a + n.share, 0)).toBeCloseTo(1, 10);
    const azs210 = nodes.find((n) => n.value === 210)!;
    expect(azs210.children.reduce((a, n) => a + n.share, 0)).toBeCloseTo(1, 10);
    const dt = azs210.children.find((n) => n.value === 'ДТ')!;
    // 1 161 310 из 2 086 051 по АЗС 210
    expect(dt.share).toBeCloseTo(dt.revenue / azs210.revenue, 10);
    expect(dt.children.reduce((a, n) => a + n.share, 0)).toBeCloseTo(1, 10);
  });

  it('перестановка порядка измерений не меняет итог', () => {
    const direct = buildPivotTree(LEAVES, DIMS, ['station', 'fuel', 'payment']).totals;
    const reordered = buildPivotTree(LEAVES, DIMS, ['payment', 'fuel', 'station']).totals;
    expect(reordered).toEqual(direct);
  });

  it('порядок уровней соответствует displayDims', () => {
    const { nodes } = buildPivotTree(LEAVES, DIMS, ['fuel', 'station']);
    expect(nodes.every((n) => n.dim === 'fuel')).toBe(true);
    expect(nodes[0].children.every((n) => n.dim === 'station')).toBe(true);
  });

  it('сортировка по выбранной метрике, по убыванию', () => {
    const byOps = buildPivotTree(LEAVES, DIMS, DIMS, 'ops').nodes;
    expect(byOps[0].ops).toBeGreaterThanOrEqual(byOps[1].ops);
    const byVolume = buildPivotTree(LEAVES, DIMS, DIMS, 'volume').nodes;
    expect(byVolume[0].volume).toBeGreaterThanOrEqual(byVolume[1].volume);
  });

  it('средняя цена — выручка на литр, без литров null', () => {
    const { nodes } = buildPivotTree(LEAVES, DIMS, DIMS);
    const azs208 = nodes.find((n) => n.value === 208)!;
    const ai95 = azs208.children.find((n) => n.value === 'АИ-95')!;
    expect(ai95.avgPrice).toBeNull();
    const dt = azs208.children.find((n) => n.value === 'ДТ')!;
    expect(dt.avgPrice).toBeCloseTo(215560 / 2295, 6);
  });

  it('пустое значение измерения получает читаемую подпись', () => {
    const { nodes } = buildPivotTree(LEAVES, DIMS, ['payment']);
    expect(nodes.some((n) => n.label === '— не указано —')).toBe(true);
  });

  it('подписи берутся из labeler (код станции → название)', () => {
    const { nodes } = buildPivotTree(LEAVES, DIMS, ['station'], 'revenue',
      (dim, v) => (dim === 'station' ? `АЗС №${v}` : String(v)));
    expect(nodes.map((n) => n.label).sort()).toEqual(['АЗС №208', 'АЗС №210']);
  });

  it('неизвестное измерение отбрасывается, а не рушит дерево', () => {
    const { nodes, totals } = buildPivotTree(LEAVES, DIMS, ['station', 'unknownDim']);
    expect(totals.revenue).toBe(total);
    expect(nodes[0].children).toEqual([]);
  });

  it('reorderDims переставляет уровни как перетаскивание мышью', () => {
    const dims = ['station', 'fuel', 'payment'];
    // тащим «Оплата» (индекс 2) на первое место
    expect(reorderDims(dims, 2, 0)).toEqual(['payment', 'station', 'fuel']);
    // тащим «Станция» в конец
    expect(reorderDims(dims, 0, 2)).toEqual(['fuel', 'payment', 'station']);
    // бросили туда же / вне диапазона — массив не меняется
    expect(reorderDims(dims, 1, 1)).toBe(dims);
    expect(reorderDims(dims, -1, 1)).toBe(dims);
    expect(reorderDims(dims, 0, 5)).toBe(dims);
    // исходный массив не мутируется
    expect(dims).toEqual(['station', 'fuel', 'payment']);
  });

  it('flattenVisible показывает только раскрытые ветки', () => {
    const { nodes } = buildPivotTree(LEAVES, DIMS, DIMS);
    expect(flattenVisible(nodes, new Set())).toHaveLength(2); // только станции
    const first = nodes[0];
    expect(flattenVisible(nodes, new Set([first.path])).length)
      .toBe(2 + first.children.length);
    const all = allExpandablePaths(nodes);
    expect(flattenVisible(nodes, new Set(all)).length).toBe(2 + 4 + 5); // станции + топливо + оплаты
  });
});
