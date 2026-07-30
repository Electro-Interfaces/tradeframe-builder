import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, ChevronDown, AlertTriangle, Loader2, X, GripVertical } from "lucide-react";
import {
  buildPivotTree, flattenVisible, allExpandablePaths, reorderDims,
  type PivotLeaf, type PivotNode, type PivotSortBy, type PivotLabeler,
} from "@/utils/pivotTree";

export interface PivotDimension { key: string; label: string }

/** Измерения «Операций». Ключи = server/services/analytics/pivotDims.js */
export const PIVOT_DIMENSIONS: PivotDimension[] = [
  { key: 'station', label: 'Станция' },
  { key: 'fuel', label: 'Вид топлива' },
  { key: 'payment', label: 'Способ оплаты' },
  { key: 'payType', label: 'Тип оплаты' },
  { key: 'day', label: 'День' },
  { key: 'month', label: 'Месяц' },
  { key: 'hour', label: 'Час' },
  { key: 'shift', label: 'Смена' },
  { key: 'pos', label: 'ПОС' },
  { key: 'nozzle', label: 'Пистолет' },
  { key: 'tank', label: 'Резервуар' },
];

export const MAX_PIVOT_DIMS = 5;

interface PivotTableProps {
  leaves: PivotLeaf[];
  /** Порядок измерений в leaves[].keys — как отдал источник данных */
  serverDims: string[];
  /** Доступные измерения. По умолчанию — измерения «Операций» */
  availableDims?: PivotDimension[];
  /** Показывать колонку «Операции» (в сменных отчётах счётчика чеков нет) */
  showOps?: boolean;
  /** Выбранные измерения в порядке отображения */
  dims: string[];
  onDimsChange: (dims: string[]) => void;
  /** Сортировка живёт на странице — чтобы выгрузка в Excel совпадала с экраном */
  sortBy: PivotSortBy;
  onSortByChange: (sortBy: PivotSortBy) => void;
  /** Подпись значения измерения (код станции → название точки) */
  labeler?: PivotLabeler;
  loading?: boolean;
  truncated?: boolean;
  error?: string | null;
  isMobile?: boolean;
}

const fmt2 = (v: number) => v.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (v: number) => v.toLocaleString('ru-RU');

export default function PivotTable({
  leaves, serverDims, dims, onDimsChange, availableDims = PIVOT_DIMENSIONS, showOps = true,
  sortBy, onSortByChange, labeler, loading, truncated, error, isMobile,
}: PivotTableProps) {
  const opsColumn = showOps && !isMobile;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Перетаскивание уровней группировки (HTML5 DnD; на тач-устройствах порядок
  // задаётся снятием/добавлением измерений в палитре)
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const { nodes, totals } = useMemo(
    () => buildPivotTree(leaves, serverDims, dims, sortBy, labeler),
    [leaves, serverDims, dims, sortBy, labeler]
  );

  // Верхний уровень раскрыт по умолчанию — иначе экран выглядит пустым
  useEffect(() => {
    setExpanded(new Set(nodes.filter((n) => n.children.length).map((n) => n.path)));
  }, [nodes]);

  const expandablePaths = useMemo(() => allExpandablePaths(nodes), [nodes]);
  const allExpanded = expandablePaths.length > 0 && expandablePaths.every((p) => expanded.has(p));
  const visible = useMemo(() => flattenVisible(nodes, expanded), [nodes, expanded]);

  const toggle = (node: PivotNode) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(node.path)) next.delete(node.path); else next.add(node.path);
      return next;
    });
  };

  const toggleDim = (key: string) => {
    if (dims.includes(key)) onDimsChange(dims.filter((d) => d !== key));
    else if (dims.length < MAX_PIVOT_DIMS) onDimsChange([...dims, key]);
  };

  return (
    <div className="space-y-4 min-w-0">
      {/* Конструктор группировок: порядок = порядок нажатия */}
      <div className="rounded-lg border border-border bg-card p-4 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="text-sm text-muted-foreground">
            Группировка <span className="text-xs">(перетащите уровни мышью или добавьте новые; до {MAX_PIVOT_DIMS} уровней)</span>
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(v) => onSortByChange(v as PivotSortBy)}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Сортировка: сумма</SelectItem>
                <SelectItem value="volume">Сортировка: литры</SelectItem>
                <SelectItem value="ops">Сортировка: операции</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpanded(allExpanded ? new Set() : new Set(expandablePaths))}
              disabled={!expandablePaths.length}
            >
              {allExpanded ? 'Свернуть всё' : 'Развернуть всё'}
            </Button>
          </div>
        </div>

        {/* Уровни группировки: порядок меняется перетаскиванием мышью либо
            снятием/повторным выбором в палитре ниже. */}
        <div className="flex flex-wrap items-center gap-2">
          {dims.length === 0 && (
            <span className="text-xs text-muted-foreground">Ничего не выбрано — добавьте измерение ниже</span>
          )}
          {dims.map((key, index) => {
            const label = availableDims.find((d) => d.key === key)?.label || key;
            const isDragged = dragIndex === index;
            const isOver = overIndex === index && dragIndex !== null && dragIndex !== index;
            return (
              <div
                key={key}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragEnter={() => setOverIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex !== null) onDimsChange(reorderDims(dims, dragIndex, index));
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                title="Перетащите, чтобы изменить порядок группировки"
                className={`inline-flex cursor-grab items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors active:cursor-grabbing ${
                  isDragged ? 'opacity-40' : ''
                } ${isOver ? 'border-primary ring-2 ring-primary/40' : 'border-primary'} bg-primary/10 text-foreground`}
              >
                <GripVertical className="h-3.5 w-3.5 opacity-50" />
                <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-primary/20 font-medium">
                  {index + 1}
                </span>
                {label}
                <button
                  type="button"
                  onClick={() => toggleDim(key)}
                  className="ml-0.5 opacity-60 hover:opacity-100"
                  aria-label={`Убрать ${label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Палитра: измерения, которых ещё нет в группировке */}
        {dims.length < availableDims.length && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
            <span className="text-xs text-muted-foreground self-center mr-1">Добавить:</span>
            {availableDims.filter((d) => !dims.includes(d.key)).map((d) => {
              const disabled = dims.length >= MAX_PIVOT_DIMS;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => toggleDim(d.key)}
                  disabled={disabled}
                  className={`inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs transition-colors ${
                    disabled ? 'text-muted-foreground/50 cursor-not-allowed' : 'text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm text-foreground">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          {error}
        </div>
      )}

      {truncated && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          Показаны первые 20 000 комбинаций — уточните период или уберите одно измерение.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card min-w-0">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Считаем сводную…
          </div>
        ) : !dims.length ? (
          <div className="p-10 text-center text-muted-foreground">Выберите хотя бы одно измерение</div>
        ) : !visible.length ? (
          <div className="p-10 text-center text-muted-foreground">Нет данных за период с этими фильтрами</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Группировка</TableHead>
                  {opsColumn && <TableHead className="text-muted-foreground text-right">Операции</TableHead>}
                  <TableHead className="text-muted-foreground text-right">Литры</TableHead>
                  <TableHead className="text-muted-foreground text-right">Сумма</TableHead>
                  {!isMobile && <TableHead className="text-muted-foreground text-right">Ср. цена</TableHead>}
                  <TableHead className="text-muted-foreground text-right">Доля</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((node) => {
                  const hasChildren = node.children.length > 0;
                  const isOpen = expanded.has(node.path);
                  return (
                    <TableRow
                      key={node.path}
                      className={`border-border ${hasChildren ? 'cursor-pointer hover:bg-secondary' : ''} ${node.level === 0 ? 'bg-secondary/30' : ''}`}
                      onClick={hasChildren ? () => toggle(node) : undefined}
                    >
                      <TableCell className="min-w-0">
                        <div className="flex items-center gap-1.5" style={{ paddingLeft: `${node.level * (isMobile ? 12 : 20)}px` }}>
                          {hasChildren ? (
                            isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                   : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <span className="w-4 shrink-0" />
                          )}
                          <span className={`truncate ${node.level === 0 ? 'font-medium text-foreground' : 'text-foreground/80'}`}>
                            {node.label}
                          </span>
                          {isMobile && showOps && (
                            <Badge variant="outline" className="ml-1 shrink-0 text-[10px]">{fmtInt(node.ops)}</Badge>
                          )}
                        </div>
                      </TableCell>
                      {opsColumn && <TableCell className="text-right font-mono text-foreground/80">{fmtInt(node.ops)}</TableCell>}
                      <TableCell className="text-right font-mono text-foreground/80 whitespace-nowrap">{fmt2(node.volume)} л</TableCell>
                      <TableCell className="text-right font-medium text-foreground whitespace-nowrap">{fmt2(node.revenue)} ₽</TableCell>
                      {!isMobile && (
                        <TableCell className="text-right text-foreground/80 whitespace-nowrap">
                          {node.avgPrice != null ? `${fmt2(node.avgPrice)} ₽` : '—'}
                        </TableCell>
                      )}
                      <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                        {(node.share * 100).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="border-border bg-secondary/50 font-medium">
                  <TableCell className="text-foreground">Итого</TableCell>
                  {opsColumn && <TableCell className="text-right font-mono text-foreground">{fmtInt(totals.ops)}</TableCell>}
                  <TableCell className="text-right font-mono text-foreground whitespace-nowrap">{fmt2(totals.volume)} л</TableCell>
                  <TableCell className="text-right text-foreground whitespace-nowrap">{fmt2(totals.revenue)} ₽</TableCell>
                  {!isMobile && (
                    <TableCell className="text-right text-foreground whitespace-nowrap">
                      {totals.volume > 0 ? `${fmt2(totals.revenue / totals.volume)} ₽` : '—'}
                    </TableCell>
                  )}
                  <TableCell className="text-right text-muted-foreground">100,0%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
