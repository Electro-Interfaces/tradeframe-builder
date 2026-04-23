/**
 * Вкладка «Маржа» — расчёт маржи топлива по методу FIFO
 *
 * Таблица поступлений с вводом закупочных цен + KPI + график
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, DollarSign, Percent, Package, AlertTriangle, Info } from 'lucide-react';
import type {
  Tank,
  ReceiptItem,
  ReceiptResponse,
  TransactionV2Response,
  ReceiptCostEntry,
} from '@/types/tanks';
import {
  makeReceiptCostKey,
  getReceiptCostsForTank,
  saveReceiptCost,
  recalculateCosts,
} from '@/services/receiptCostService';
import {
  buildFifoQueue,
  calculateFifoMargin,
  buildMarginChartData,
} from '@/services/marginFifoCalculations';

// ── Props ────────────────────────────────────────────────────

export interface MarginTabProps {
  tank: Tank;
  receipts: ReceiptResponse | null;
  transactions: TransactionV2Response | null;
  fuelCode: number;
  tankNumber: number;
  system: number;
  station: number;
  periodDates: { dt_beg: string; dt_end: string } | null;
  initialVolume: number;
  chartHeight: number;
}

// ── Helpers ──────────────────────────────────────────────────

function toNum(v: string | number | undefined): number {
  if (v === undefined || v === null) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isNaN(n) ? 0 : n;
}

function fmtNum(v: number, decimals = 2): string {
  return v.toLocaleString('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtCurrency(v: number): string {
  return v.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// ── Row для таблицы поступлений ─────────────────────────────

interface ReceiptRowData {
  key: string;
  ttn: string;
  dt: string;
  supplier: string;
  volumeLiters: number;
  density: number;
  fuelCode: number;
  docCostTotal: number; // из STS — общая стоимость
}

function collectReceiptRows(
  receipts: ReceiptResponse | null,
  tankNumber: number,
  dtBeg: string,
  dtEnd: string,
  system: number,
  station: number
): ReceiptRowData[] {
  if (!receipts?.shifts) return [];

  const rows: ReceiptRowData[] = [];

  for (const shift of receipts.shifts) {
    for (const r of shift.receipt) {
      if (r.tank !== tankNumber) continue;
      if (r.dt < dtBeg || r.dt > dtEnd) continue;

      const volume = toNum(r.fact.volume) || toNum(r.doc.volume);
      if (volume <= 0) continue;

      const density = r.fact.density ?? r.doc.density ?? 0;
      const docCost = toNum(r.fact.cost) || toNum(r.doc.cost);

      rows.push({
        key: makeReceiptCostKey(system, station, tankNumber, r.ttn, r.dt),
        ttn: r.ttn,
        dt: r.dt,
        supplier: r.base?.name ?? '',
        volumeLiters: volume,
        density,
        fuelCode: r.fuel ?? r.service?.service_code ?? 0,
        docCostTotal: docCost,
      });
    }
  }

  rows.sort((a, b) => a.dt.localeCompare(b.dt));
  return rows;
}

// ── Компонент ────────────────────────────────────────────────

export function MarginTab({
  tank,
  receipts,
  transactions,
  fuelCode,
  tankNumber,
  system,
  station,
  periodDates,
  initialVolume,
  chartHeight,
}: MarginTabProps) {
  // Единица ввода: литр / кг (общая для всех строк)
  const [inputUnit, setInputUnit] = useState<'liter' | 'kg'>('liter');

  // Закупочные цены из localStorage
  const [savedCosts, setSavedCosts] = useState<ReceiptCostEntry[]>([]);

  // Загрузка цен при монтировании / смене резервуара
  useEffect(() => {
    setSavedCosts(getReceiptCostsForTank(system, station, tankNumber));
  }, [system, station, tankNumber]);

  // Строки таблицы поступлений
  const receiptRows = useMemo(
    () =>
      collectReceiptRows(
        receipts,
        tankNumber,
        periodDates?.dt_beg ?? '',
        periodDates?.dt_end ?? '',
        system,
        station
      ),
    [receipts, tankNumber, periodDates, system, station]
  );

  // Индекс цен для быстрого доступа
  const costIndex = useMemo(() => {
    const map = new Map<string, ReceiptCostEntry>();
    for (const c of savedCosts) map.set(c.key, c);
    return map;
  }, [savedCosts]);

  // Debounced save
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const handleCostChange = useCallback(
    (row: ReceiptRowData, rawValue: string) => {
      const value = parseFloat(rawValue);
      if (isNaN(value) || value < 0) return;

      const density = row.density || tank.density || 750;
      const { costPerLiter, costPerKg } = recalculateCosts(value, inputUnit, density);

      const entry: ReceiptCostEntry = {
        key: row.key,
        system,
        station,
        tank: tankNumber,
        ttn: row.ttn,
        dt: row.dt,
        costPerLiter,
        costPerKg,
        inputUnit,
        density,
        factVolumeLiters: row.volumeLiters,
        totalCost: costPerLiter * row.volumeLiters,
        fuelCode: row.fuelCode || fuelCode,
        supplier: row.supplier,
        updatedAt: new Date().toISOString(),
      };

      // Обновляем state сразу (optimistic)
      setSavedCosts(prev => {
        const idx = prev.findIndex(e => e.key === row.key);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = entry;
          return next;
        }
        return [...prev, entry];
      });

      // Debounced persist
      const existingTimer = saveTimers.current.get(row.key);
      if (existingTimer) clearTimeout(existingTimer);
      saveTimers.current.set(
        row.key,
        setTimeout(() => {
          saveReceiptCost(entry);
          saveTimers.current.delete(row.key);
        }, 500)
      );
    },
    [inputUnit, system, station, tankNumber, fuelCode, tank.density]
  );

  // FIFO расчёт
  const fifoResult = useMemo(() => {
    if (!periodDates) return null;

    const { lots, warnings: buildWarnings } = buildFifoQueue({
      receipts,
      costs: savedCosts,
      tankNumber,
      dtBeg: periodDates.dt_beg,
      dtEnd: periodDates.dt_end,
      initialVolume,
    });

    const summary = calculateFifoMargin(
      lots,
      transactions,
      fuelCode,
      periodDates.dt_beg,
      periodDates.dt_end
    );

    summary.warnings = [...buildWarnings, ...summary.warnings];
    return summary;
  }, [receipts, savedCosts, transactions, tankNumber, fuelCode, periodDates, initialVolume]);

  const chartData = useMemo(
    () => (fifoResult?.sales ? buildMarginChartData(fifoResult.sales) : []),
    [fifoResult?.sales]
  );

  // Есть ли хотя бы одна цена?
  const hasCosts = savedCosts.some(c => c.costPerLiter > 0);

  // ── Рендер ─────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Баннер если нет цен */}
      {!hasCosts && receiptRows.length > 0 && (
        <div className="flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-amber-800 dark:text-amber-200">
            <span className="font-medium">Введите закупочные цены</span> для расчёта маржи.
            Укажите стоимость ₽/л или ₽/кг в таблице поступлений ниже.
          </div>
        </div>
      )}

      {/* Предупреждения FIFO */}
      {fifoResult && fifoResult.warnings.length > 0 && hasCosts && (
        <div className="flex items-start gap-2 p-2.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
          <div className="text-[11px] text-orange-800 dark:text-orange-200 space-y-0.5">
            {fifoResult.warnings.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </div>
        </div>
      )}

      {/* KPI-карточки */}
      {fifoResult && hasCosts && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <KpiCard
            label="Средняя маржа"
            value={`${fmtNum(fifoResult.avgMarginPerLiter)} ₽/л`}
            icon={<TrendingUp className="w-3.5 h-3.5" />}
            color={marginColor(fifoResult.avgMarginPercent)}
          />
          <KpiCard
            label="Маржинальность"
            value={`${fmtNum(fifoResult.avgMarginPercent, 1)}%`}
            icon={<Percent className="w-3.5 h-3.5" />}
            color={marginColor(fifoResult.avgMarginPercent)}
          />
          <KpiCard
            label="Прибыль"
            value={`${fmtCurrency(fifoResult.totalProfit)} ₽`}
            icon={<DollarSign className="w-3.5 h-3.5" />}
            color={fifoResult.totalProfit >= 0 ? 'green' : 'red'}
          />
          <KpiCard
            label="Стоимость остатка"
            value={`${fmtCurrency(fifoResult.remainingInventoryValue)} ₽`}
            subtitle={`${fmtCurrency(fifoResult.remainingInventoryVolume)} л`}
            icon={<Package className="w-3.5 h-3.5" />}
            color="blue"
          />
        </div>
      )}

      {/* Таблица поступлений */}
      {receiptRows.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="bg-secondary px-2.5 py-1.5 border-b border-border flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">
              Поступления ({receiptRows.length})
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Ввод:</span>
              <button
                className={`text-[10px] px-1.5 py-0.5 rounded ${inputUnit === 'liter' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                onClick={() => setInputUnit('liter')}
              >
                ₽/л
              </button>
              <button
                className={`text-[10px] px-1.5 py-0.5 rounded ${inputUnit === 'kg' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                onClick={() => setInputUnit('kg')}
              >
                ₽/кг
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-1 px-2 font-medium text-muted-foreground">Дата</th>
                  <th className="text-left py-1 px-2 font-medium text-muted-foreground">ТТН</th>
                  <th className="text-left py-1 px-2 font-medium text-muted-foreground hidden md:table-cell">Поставщик</th>
                  <th className="text-right py-1 px-2 font-medium text-muted-foreground">Объём, л</th>
                  <th className="text-right py-1 px-2 font-medium text-muted-foreground hidden md:table-cell">Плотность</th>
                  <th className="text-right py-1 px-2 font-medium text-muted-foreground w-24">
                    {inputUnit === 'liter' ? '₽/л' : '₽/кг'}
                  </th>
                  <th className="text-right py-1 px-2 font-medium text-muted-foreground">Итого ₽</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {receiptRows.map(row => {
                  const saved = costIndex.get(row.key);
                  const displayValue =
                    saved
                      ? inputUnit === 'liter'
                        ? saved.costPerLiter
                        : saved.costPerKg ?? 0
                      : '';
                  const totalCost = saved ? saved.costPerLiter * row.volumeLiters : 0;

                  return (
                    <tr key={row.key} className="hover:bg-muted/30">
                      <td className="py-1 px-2 whitespace-nowrap">
                        {new Date(row.dt).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-1 px-2 font-mono">{row.ttn}</td>
                      <td className="py-1 px-2 hidden md:table-cell truncate max-w-[120px]">{row.supplier}</td>
                      <td className="py-1 px-2 text-right">{fmtNum(row.volumeLiters, 0)}</td>
                      <td className="py-1 px-2 text-right hidden md:table-cell">{row.density > 0 ? fmtNum(row.density, 1) : '—'}</td>
                      <td className="py-0.5 px-1">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="h-6 text-[11px] text-right w-full px-1.5"
                          defaultValue={displayValue !== '' ? String(displayValue.toFixed(2)) : ''}
                          onChange={e => handleCostChange(row, e.target.value)}
                        />
                      </td>
                      <td className="py-1 px-2 text-right font-medium">
                        {totalCost > 0 ? fmtCurrency(totalCost) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {receiptRows.length === 0 && (
        <div className="text-center py-6 text-muted-foreground text-[11px]">
          Нет поступлений за выбранный период
        </div>
      )}

      {/* График маржи */}
      {chartData.length > 1 && hasCosts && (
        <div>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="marginFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis
                dataKey="time"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                label={{
                  value: '₽/литр',
                  angle: -90,
                  position: 'insideLeft',
                  fill: 'hsl(var(--muted-foreground))',
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                  fontSize: 11,
                }}
                formatter={(value: number, name: string) => {
                  const label =
                    name === 'retailPrice'
                      ? 'Розница'
                      : name === 'avgCostPerLiter'
                        ? 'Себестоимость'
                        : 'Маржа';
                  return [`${value.toFixed(2)} ₽/л`, label];
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '4px', fontSize: '11px' }}
                formatter={(value: string) => {
                  const labels: Record<string, string> = {
                    retailPrice: 'Розничная цена',
                    avgCostPerLiter: 'Себестоимость (FIFO)',
                    marginPerLiter: 'Маржа',
                  };
                  return labels[value] ?? value;
                }}
              />
              <Line
                type="monotone"
                dataKey="retailPrice"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="avgCostPerLiter"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 3"
              />
              <Area
                type="monotone"
                dataKey="marginPerLiter"
                stroke="#22c55e"
                fill="url(#marginFill)"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── KPI карточка ─────────────────────────────────────────────

function KpiCard({
  label,
  value,
  subtitle,
  icon,
  color,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'green' | 'yellow' | 'red' | 'blue';
}) {
  const colorMap = {
    green: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    yellow: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    red: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    blue: 'text-primary dark:text-primary/70 bg-primary/5 dark:bg-blue-900/20 border-primary/20 dark:border-primary',
  };

  return (
    <div className={`rounded-lg border p-2 ${colorMap[color]}`}>
      <div className="flex items-center gap-1 mb-1">
        {icon}
        <span className="text-[10px] font-medium opacity-80">{label}</span>
      </div>
      <div className="text-sm font-bold truncate">{value}</div>
      {subtitle && <div className="text-[10px] opacity-70">{subtitle}</div>}
    </div>
  );
}

function marginColor(percent: number): 'green' | 'yellow' | 'red' {
  if (percent >= 15) return 'green';
  if (percent >= 5) return 'yellow';
  return 'red';
}
