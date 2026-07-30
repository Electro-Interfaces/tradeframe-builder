/**
 * Сборка дерева сводной из «листьев», которые отдал /api/analytics/pivot.
 *
 * Сервер группирует по выбранному НАБОРУ измерений, а иерархию и подытоги
 * собираем здесь — поэтому смена ПОРЯДКА группировок не требует запроса:
 * те же листья, другой порядок сборки.
 *
 * Доля (share) считается ОТ РОДИТЕЛЯ: внутри станции виды топлива дают 100 %,
 * внутри топлива — способы оплаты.
 */

export interface PivotLeaf {
  /** Значения измерений в порядке dims, пришедшем с сервера */
  keys: (string | number | null)[];
  ops: number;
  volume: number;
  revenue: number;
}

export type PivotSortBy = 'revenue' | 'volume' | 'ops';

export interface PivotNode {
  /** Ключ измерения этого уровня (station/fuel/...) */
  dim: string;
  /** Сырое значение измерения */
  value: string | number | null;
  /** Подпись для UI (имя станции вместо кода и т.п.) */
  label: string;
  ops: number;
  volume: number;
  revenue: number;
  /** Средняя цена по узлу, ₽/л (null — если литров нет) */
  avgPrice: number | null;
  /** Доля по revenue от родителя, 0..1 */
  share: number;
  level: number;
  /** Путь значений от корня — стабильный id строки для раскрытия */
  path: string;
  children: PivotNode[];
}

export interface PivotTotals {
  ops: number;
  volume: number;
  revenue: number;
}

export interface PivotTree {
  nodes: PivotNode[];
  totals: PivotTotals;
}

/** Подпись значения измерения. labeler — например код станции → её название. */
export type PivotLabeler = (dim: string, value: string | number | null) => string;

const defaultLabeler: PivotLabeler = (_dim, value) =>
  value == null || value === '' ? '— не указано —' : String(value);

function metric(node: PivotTotals, sortBy: PivotSortBy): number {
  return sortBy === 'volume' ? node.volume : sortBy === 'ops' ? node.ops : node.revenue;
}

/**
 * @param leaves       листья с сервера
 * @param serverDims   порядок измерений в leaf.keys (как отдал сервер)
 * @param displayDims  желаемый порядок уровней (подмножество serverDims той же длины)
 */
export function buildPivotTree(
  leaves: PivotLeaf[],
  serverDims: string[],
  displayDims: string[],
  sortBy: PivotSortBy = 'revenue',
  labeler: PivotLabeler = defaultLabeler
): PivotTree {
  // Индексы измерений отображения внутри keys. Неизвестное измерение отбрасываем,
  // чтобы рассинхрон фронта и сервера не рушил таблицу.
  const order = displayDims
    .map((dim) => ({ dim, idx: serverDims.indexOf(dim) }))
    .filter((d) => d.idx >= 0);

  const totals: PivotTotals = { ops: 0, volume: 0, revenue: 0 };
  const roots: PivotNode[] = [];
  const byPath = new Map<string, PivotNode>();

  for (const leaf of leaves) {
    totals.ops += leaf.ops;
    totals.volume += leaf.volume;
    totals.revenue += leaf.revenue;

    let siblings = roots;
    let path = '';
    for (let level = 0; level < order.length; level++) {
      const { dim, idx } = order[level];
      const value = leaf.keys[idx] ?? null;
      const segment = `${dim}=${value ?? ''}`;
      path = path ? `${path}|${segment}` : segment;

      let node = byPath.get(path);
      if (!node) {
        node = {
          dim, value, label: labeler(dim, value),
          ops: 0, volume: 0, revenue: 0, avgPrice: null, share: 0,
          level, path, children: [],
        };
        byPath.set(path, node);
        siblings.push(node);
      }
      node.ops += leaf.ops;
      node.volume += leaf.volume;
      node.revenue += leaf.revenue;
      siblings = node.children;
    }
  }

  const finalize = (nodes: PivotNode[], parentRevenue: number) => {
    nodes.sort((a, b) => metric(b, sortBy) - metric(a, sortBy));
    for (const node of nodes) {
      node.avgPrice = node.volume > 0 ? node.revenue / node.volume : null;
      node.share = parentRevenue > 0 ? node.revenue / parentRevenue : 0;
      finalize(node.children, node.revenue);
    }
  };
  finalize(roots, totals.revenue);

  return { nodes: roots, totals };
}

/** Плоский обход дерева с учётом раскрытых узлов — то, что рисует таблица. */
export function flattenVisible(nodes: PivotNode[], expanded: Set<string>): PivotNode[] {
  const out: PivotNode[] = [];
  const walk = (list: PivotNode[]) => {
    for (const node of list) {
      out.push(node);
      if (node.children.length && expanded.has(node.path)) walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

/**
 * Перестановка измерения из позиции from в позицию to (drag & drop порядка
 * группировки). Индексы вне диапазона возвращают исходный массив.
 */
export function reorderDims(dims: string[], from: number, to: number): string[] {
  if (from === to) return dims;
  if (from < 0 || from >= dims.length || to < 0 || to >= dims.length) return dims;
  const next = [...dims];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Все пути узлов, у которых есть дети — для кнопки «Развернуть всё». */
export function allExpandablePaths(nodes: PivotNode[]): string[] {
  const out: string[] = [];
  const walk = (list: PivotNode[]) => {
    for (const node of list) {
      if (node.children.length) { out.push(node.path); walk(node.children); }
    }
  };
  walk(nodes);
  return out;
}
