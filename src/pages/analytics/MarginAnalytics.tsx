/**
 * Страница "Маркетинг-аналитика / Маржинальность"
 * Агрегированный анализ маржи по видам топлива, способам оплаты и станциям.
 * Включает ввод себестоимости: поштучная расценка ТТН + массовая по виду топлива.
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSelection } from '@/contexts/SelectionContext';
import { useSelectedNetworks } from '@/hooks/useSelectedNetworks';
import { tradingPointsService } from '@/services/tradingPointsService';
import { extractStationNumber } from '@/utils/tradingPointUtils';
import { todayString } from '@/utils/dateUtils';
import { stsProxyClient } from '@/services/stsProxyClient';
import { useReceipts } from '@/hooks/useReceipts';
import { flattenReceipts } from '@/services/receiptsService';
import {
  fetchReceiptCosts,
  makeReceiptCostKey,
  recalculateCosts,
  upsertReceiptCost,
  bulkUpsertReceiptCosts,
  buildCostIndex,
  type ReceiptCostRecord,
  type UpsertReceiptCostData,
} from '@/services/receiptCostApiService';
import type { TransactionV2Response, TransactionItem } from '@/types/tanks';
import type { FlatReceipt } from '@/types/receipts';
import { normalizePaymentMethod, classifyPayment } from '@/utils/paymentUtils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Percent,
  Package,
  RefreshCw,
  BarChart3,
  Layers,
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

function fmtNum(v: number, decimals = 2): string {
  return v.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtCurrency(v: number): string {
  return v.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

function marginColor(pct: number): string {
  if (pct >= 15) return 'text-green-600 dark:text-green-400';
  if (pct >= 5) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function toNum(v: string | number | undefined): number {
  if (v === undefined || v === null) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isNaN(n) ? 0 : n;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export default function MarginAnalytics() {
  const { selectedNetwork, selectedTradingPoint: selectedTradingPointId, isAllTradingPoints } = useSelection();
  const { selectedExternalIds } = useSelectedNetworks();
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState<string>(() => todayString());

  // STS system/station
  const systemIds = useMemo(() =>
    selectedExternalIds.map(id => parseInt(id)).filter(n => !isNaN(n)),
    [selectedExternalIds]
  );
  const systemId = systemIds[0] || (selectedNetwork?.external_id ? parseInt(selectedNetwork.external_id) : null);

  const [stationNumber, setStationNumber] = useState<number | null>(null);

  useEffect(() => {
    if (isAllTradingPoints) {
      setStationNumber(null);
    } else if (selectedTradingPointId && selectedNetwork?.id) {
      tradingPointsService.getById(selectedTradingPointId, selectedNetwork.id)
        .then(tp => setStationNumber(extractStationNumber(tp) || null))
        .catch(() => setStationNumber(null));
    }
  }, [selectedTradingPointId, selectedNetwork, isAllTradingPoints]);

  // ── Данные аналитики ──────────────────────────────────────
  type TxWithStation = TransactionItem & { _stationNumber: number };
  const [costs, setCosts] = useState<ReceiptCostRecord[]>([]);
  const [transactions, setTransactions] = useState<TxWithStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reportCostActionError = useCallback((title: string, fallback: string, reason: unknown) => {
    const description = getErrorMessage(reason, fallback);
    setError(description);
    toast({
      title,
      description,
      variant: 'destructive',
    });
  }, []);

  const loadData = useCallback(async () => {
    if (!systemId) return;
    setLoading(true);
    setError(null);

    try {
      // Для FIFO нужны ВСЕ партии от начала (партия января расходуется в марте),
      // поэтому dtBeg не передаём — только dtEnd
      const costsData = await fetchReceiptCosts({
        systemId,
        stationNumber: stationNumber ?? undefined,
        dtEnd: dateTo,
      });
      setCosts(costsData);

      // Загружаем транзакции через STS прокси
      const txParams: Record<string, string> = {
        system: String(systemId),
        dt_beg: dateFrom,
        dt_end: dateTo,
      };
      if (stationNumber) txParams.station = String(stationNumber);

      const txData = await stsProxyClient.get<TransactionV2Response[]>('/v2/transactions', txParams);
      const allItems: TxWithStation[] = Array.isArray(txData)
        ? txData.flatMap(station =>
            (station.items || []).map(item => ({ ...item, _stationNumber: station.number }))
          )
        : [];
      setTransactions(allItems);
    } catch (reason) {
      setError(getErrorMessage(reason, 'Ошибка загрузки данных'));
    } finally {
      setLoading(false);
    }
  }, [systemId, stationNumber, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Перезагрузка только себестоимости (после inline/bulk правок)
  const reloadCosts = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!systemId) return;
    try {
      const costsData = await fetchReceiptCosts({ systemId, stationNumber: stationNumber ?? undefined, dtEnd: dateTo });
      setCosts(costsData);
      setError(null);
      return true;
    } catch (reason) {
      if (!silent) {
        reportCostActionError('Ошибка обновления себестоимости', 'Не удалось обновить себестоимость', reason);
      }
      return false;
    }
  }, [systemId, stationNumber, dateTo, reportCostActionError]);

  // ── Поступления (ТТН) для расценки ────────────────────────
  const receiptsParams = useMemo(() => {
    if (!systemId) return { system: 0 };
    const params: any = { system: systemId };
    if (stationNumber) params.station = stationNumber;
    if (dateFrom) params.dt_beg = dateFrom;
    if (dateTo) params.dt_end = dateTo;
    return params;
  }, [systemId, stationNumber, dateFrom, dateTo]);

  const { data: receiptsData, isLoading: receiptsLoading } = useReceipts(receiptsParams);
  const flatReceipts = useMemo(() => receiptsData ? flattenReceipts(receiptsData) : [], [receiptsData]);
  const fuelTypes = useMemo(() => [...new Set(flatReceipts.map(r => r.service.service_name))].sort(), [flatReceipts]);

  // Фильтр по виду топлива в таблице расценки
  const [selectedFuel, setSelectedFuel] = useState<string | null>(null);
  const displayedReceipts = useMemo(() => {
    if (!selectedFuel) return flatReceipts;
    return flatReceipts.filter(r => r.service.service_name === selectedFuel);
  }, [flatReceipts, selectedFuel]);

  // Сводка по видам топлива (кол-во ТТН и объём)
  const fuelSummary = useMemo(() => {
    const map = new Map<string, { count: number; volume: number }>();
    for (const r of flatReceipts) {
      const name = r.service.service_name;
      const prev = map.get(name) || { count: 0, volume: 0 };
      prev.count++;
      prev.volume += parseFloat(r.doc.volume) || 0;
      map.set(name, prev);
    }
    return map;
  }, [flatReceipts]);

  // Пакетный выбор строк
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());
  const [batchPrice, setBatchPrice] = useState('');
  const [batchSaving, setBatchSaving] = useState(false);

  const toggleCheck = useCallback((key: string) => {
    setCheckedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const toggleCheckAll = useCallback(() => {
    if (!systemId) return;
    setCheckedKeys(prev => {
      if (prev.size === displayedReceipts.length) return new Set();
      return new Set(displayedReceipts.map(r =>
        makeReceiptCostKey(systemId!, r.stationNumber, r.tank, r.ttn, r.dt)
      ));
    });
  }, [systemId, displayedReceipts]);

  // Сбрасываем выбор при смене фильтра
  useEffect(() => { setCheckedKeys(new Set()); }, [selectedFuel]);

  // ── Табы: расценка vs аналитика ──────────────────────────
  const [activeTab, setActiveTab] = useState<'pricing' | 'analytics' | 'batches'>('pricing');
  const [marginCostsMap, setMarginCostsMap] = useState<Map<string, ReceiptCostRecord>>(new Map());
  const [marginInputUnit, setMarginInputUnit] = useState<'liter' | 'kg'>('liter');
  const marginTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [bulkFillFuel, setBulkFillFuel] = useState('');
  const [bulkFillPrice, setBulkFillPrice] = useState('');
  const [bulkFillSaving, setBulkFillSaving] = useState(false);

  useEffect(() => () => {
    marginTimers.current.forEach(timer => clearTimeout(timer));
    marginTimers.current.clear();
  }, []);

  // Синхронизация карты цен из серверных данных
  useEffect(() => {
    setMarginCostsMap(buildCostIndex(costs));
  }, [costs]);

  // Inline-ввод себестоимости
  const handleCostChange = useCallback((receipt: FlatReceipt, rawValue: string) => {
    if (!systemId) return;
    const value = parseFloat(rawValue);
    if (isNaN(value) || value < 0) return;

    const density = receipt.doc.density || receipt.fact.density || 750;
    const volume = parseFloat(receipt.doc.volume) || parseFloat(receipt.fact.volume) || 0;
    const { costPerLiter, costPerKg } = recalculateCosts(value, marginInputUnit, density);
    const key = makeReceiptCostKey(systemId, receipt.stationNumber, receipt.tank, receipt.ttn, receipt.dt);

    const data: UpsertReceiptCostData = {
      systemId,
      stationNumber: receipt.stationNumber,
      tankNumber: receipt.tank,
      ttn: receipt.ttn,
      receiptDt: receipt.dt,
      fuelCode: receipt.service.service_code,
      fuelName: receipt.service.service_name,
      costPerLiter,
      costPerKg,
      inputUnit: marginInputUnit,
      volumeLiters: volume,
      density,
      totalCost: costPerLiter * volume,
      supplierId: receipt.base?.id,
      supplierName: receipt.base?.name || '',
    };

    // Optimistic update
    setMarginCostsMap(prev => {
      const next = new Map(prev);
      next.set(key, { id: '', ...data, createdBy: null, updatedBy: null, createdAt: '', updatedAt: new Date().toISOString() } as ReceiptCostRecord);
      return next;
    });

    const existingTimer = marginTimers.current.get(key);
    if (existingTimer) clearTimeout(existingTimer);
    marginTimers.current.set(key, setTimeout(async () => {
      try {
        await upsertReceiptCost(data);
        await reloadCosts();
      } catch (reason) {
        await reloadCosts({ silent: true });
        reportCostActionError('Ошибка сохранения себестоимости', 'Не удалось сохранить себестоимость', reason);
      } finally {
        marginTimers.current.delete(key);
      }
    }, 800));
  }, [systemId, marginInputUnit, reloadCosts, reportCostActionError]);

  // Массовое заполнение
  const bulkFillTargets = useMemo(() => {
    if (!bulkFillFuel || !systemId) return [];
    return flatReceipts.filter(r => {
      if (r.service.service_name !== bulkFillFuel) return false;
      const key = makeReceiptCostKey(systemId, r.stationNumber, r.tank, r.ttn, r.dt);
      const existing = marginCostsMap.get(key);
      return !existing || existing.costPerLiter <= 0;
    });
  }, [bulkFillFuel, systemId, flatReceipts, marginCostsMap]);

  const bulkFillAllTargets = useMemo(() => {
    if (!bulkFillFuel) return [];
    return flatReceipts.filter(r => r.service.service_name === bulkFillFuel);
  }, [bulkFillFuel, flatReceipts]);

  const handleBulkFill = useCallback(async (mode: 'fill_empty' | 'overwrite') => {
    if (!systemId || !bulkFillFuel) return;
    const price = parseFloat(bulkFillPrice);
    if (isNaN(price) || price <= 0) return;

    const targets = mode === 'overwrite' ? bulkFillAllTargets : bulkFillTargets;
    if (targets.length === 0) return;

    setBulkFillSaving(true);
    try {
      const entries: UpsertReceiptCostData[] = targets.map(r => {
        const density = r.doc.density || r.fact.density || 750;
        const volume = parseFloat(r.doc.volume) || parseFloat(r.fact.volume) || 0;
        const { costPerLiter, costPerKg } = recalculateCosts(price, marginInputUnit, density);
        return {
          systemId,
          stationNumber: r.stationNumber,
          tankNumber: r.tank,
          ttn: r.ttn,
          receiptDt: r.dt,
          fuelCode: r.service.service_code,
          fuelName: r.service.service_name,
          costPerLiter,
          costPerKg,
          inputUnit: marginInputUnit,
          volumeLiters: volume,
          density,
          totalCost: costPerLiter * volume,
          supplierId: r.base?.id,
          supplierName: r.base?.name || '',
        };
      });

      await bulkUpsertReceiptCosts(entries, mode);
      const synced = await reloadCosts();
      if (synced) {
        setBulkFillPrice('');
      }
    } catch (reason) {
      await reloadCosts({ silent: true });
      reportCostActionError('Ошибка массового сохранения', 'Не удалось сохранить массовые изменения', reason);
    } finally {
      setBulkFillSaving(false);
    }
  }, [systemId, bulkFillFuel, bulkFillPrice, marginInputUnit, bulkFillAllTargets, bulkFillTargets, reloadCosts, reportCostActionError]);

  // Пакетное применение цены к выбранным строкам
  const handleBatchApply = useCallback(async () => {
    if (!systemId || checkedKeys.size === 0) return;
    const price = parseFloat(batchPrice);
    if (isNaN(price) || price <= 0) return;

    const targets = flatReceipts.filter(r => {
      const key = makeReceiptCostKey(systemId, r.stationNumber, r.tank, r.ttn, r.dt);
      return checkedKeys.has(key);
    });
    if (targets.length === 0) return;

    setBatchSaving(true);
    try {
      const entries: UpsertReceiptCostData[] = targets.map(r => {
        const density = r.doc.density || r.fact.density || 750;
        const volume = parseFloat(r.doc.volume) || parseFloat(r.fact.volume) || 0;
        const { costPerLiter, costPerKg } = recalculateCosts(price, marginInputUnit, density);
        return {
          systemId,
          stationNumber: r.stationNumber,
          tankNumber: r.tank,
          ttn: r.ttn,
          receiptDt: r.dt,
          fuelCode: r.service.service_code,
          fuelName: r.service.service_name,
          costPerLiter,
          costPerKg,
          inputUnit: marginInputUnit,
          volumeLiters: volume,
          density,
          totalCost: costPerLiter * volume,
          supplierId: r.base?.id,
          supplierName: r.base?.name || '',
        };
      });

      await bulkUpsertReceiptCosts(entries, 'overwrite');
      const synced = await reloadCosts();
      if (synced) {
        setCheckedKeys(new Set());
        setBatchPrice('');
      }
    } catch (reason) {
      await reloadCosts({ silent: true });
      reportCostActionError('Ошибка пакетного сохранения', 'Не удалось применить цену к выбранным ТТН', reason);
    } finally {
      setBatchSaving(false);
    }
  }, [systemId, checkedKeys, batchPrice, marginInputUnit, flatReceipts, reloadCosts, reportCostActionError]);

  // ── Метод 2: Расценка по объёму ─────────────────────────
  const [volumeMode, setVolumeMode] = useState(false);
  const [volFuel, setVolFuel] = useState('');
  const [volAmount, setVolAmount] = useState(''); // объём закупки
  const [volPrice, setVolPrice] = useState('');   // цена за единицу
  const [volSaving, setVolSaving] = useState(false);

  // Результат подбора (preview)
  type VolMatch = { receipt: FlatReceipt; allocated: number; status: 'full' | 'partial' | 'skip' };
  const [volPreview, setVolPreview] = useState<VolMatch[] | null>(null);

  const handleVolMatch = useCallback(() => {
    if (!volFuel || !volAmount) return;
    const targetVol = parseFloat(volAmount);
    if (isNaN(targetVol) || targetVol <= 0) return;

    // ТТН выбранного топлива, отсортированные по дате ASC (хронологически)
    const candidates = flatReceipts
      .filter(r => r.service.service_name === volFuel)
      .sort((a, b) => new Date(a.dt).getTime() - new Date(b.dt).getTime());

    let remaining = targetVol;
    const result: VolMatch[] = [];

    for (const r of candidates) {
      const docVol = parseFloat(r.doc.volume) || 0;
      if (remaining <= 0) {
        result.push({ receipt: r, allocated: 0, status: 'skip' });
        continue;
      }
      if (remaining >= docVol) {
        result.push({ receipt: r, allocated: docVol, status: 'full' });
        remaining -= docVol;
      } else {
        result.push({ receipt: r, allocated: remaining, status: 'partial' });
        remaining = 0;
      }
    }

    setVolPreview(result);
  }, [volFuel, volAmount, flatReceipts]);

  const volPreviewTotals = useMemo(() => {
    if (!volPreview) return null;
    const matched = volPreview.filter(m => m.status !== 'skip');
    const allocated = matched.reduce((s, m) => s + m.allocated, 0);
    return { count: matched.length, allocated };
  }, [volPreview]);

  const handleVolApply = useCallback(async () => {
    if (!systemId || !volPreview || !volPrice) return;
    const price = parseFloat(volPrice);
    if (isNaN(price) || price <= 0) return;

    const targets = volPreview.filter(m => m.status !== 'skip');
    if (targets.length === 0) return;

    setVolSaving(true);
    try {
      const entries: UpsertReceiptCostData[] = targets.map(m => {
        const r = m.receipt;
        const density = r.doc.density || r.fact.density || 750;
        const volume = parseFloat(r.doc.volume) || parseFloat(r.fact.volume) || 0;
        const { costPerLiter, costPerKg } = recalculateCosts(price, marginInputUnit, density);
        return {
          systemId,
          stationNumber: r.stationNumber,
          tankNumber: r.tank,
          ttn: r.ttn,
          receiptDt: r.dt,
          fuelCode: r.service.service_code,
          fuelName: r.service.service_name,
          costPerLiter,
          costPerKg,
          inputUnit: marginInputUnit,
          volumeLiters: volume,
          density,
          totalCost: costPerLiter * volume,
          supplierId: r.base?.id,
          supplierName: r.base?.name || '',
        };
      });

      await bulkUpsertReceiptCosts(entries, 'overwrite');
      const synced = await reloadCosts();
      if (synced) {
        setVolPreview(null);
        setVolAmount('');
        setVolPrice('');
      }
    } catch (reason) {
      await reloadCosts({ silent: true });
      reportCostActionError('Ошибка сохранения по объёму', 'Не удалось применить расчёт по объёму', reason);
    } finally {
      setVolSaving(false);
    }
  }, [systemId, volPreview, volPrice, marginInputUnit, reloadCosts, reportCostActionError]);

  // ── FIFO-расчёт себестоимости ─────────────────────────────
  // Для каждого вида топлива: партии (ТТН) отсортированы по дате,
  // транзакции потребляют литры из самой ранней непустой партии.

  type BatchProfit = {
    rec: ReceiptCostRecord;
    volumeTotal: number;   // объём партии
    volumeSold: number;    // прокачано (продано) из партии
    revenue: number;       // выручка от проданных литров
    cost: number;          // себестоимость проданных литров
    profit: number;        // выручка - себестоимость
  };

  const fifoResult = useMemo(() => {
    if (!transactions.length || !costs.length) return null;

    // Партии по резервуару (station+tank), сортировка по дате ASC
    // ТТН сливается в конкретный резервуар, продажи идут из конкретного резервуара
    const sortedCosts = [...costs].sort((a, b) => new Date(a.receiptDt).getTime() - new Date(b.receiptDt).getTime());

    type Batch = { idx: number; cpl: number; remaining: number };
    const batchesByTank = new Map<string, Batch[]>();
    const batchProfits: BatchProfit[] = sortedCosts.map(c => ({
      rec: c, volumeTotal: c.volumeLiters, volumeSold: 0, revenue: 0, cost: 0, profit: 0,
    }));

    for (let i = 0; i < sortedCosts.length; i++) {
      const c = sortedCosts[i];
      if (c.costPerLiter <= 0 || c.volumeLiters <= 0) continue;
      const tankKey = `${c.stationNumber}:${c.tankNumber}`;
      let arr = batchesByTank.get(tankKey);
      if (!arr) { arr = []; batchesByTank.set(tankKey, arr); }
      arr.push({ idx: i, cpl: c.costPerLiter, remaining: c.volumeLiters });
    }

    // Транзакции сортированы по дате ASC
    const sortedTx = [...transactions].sort((a, b) => {
      const da = a.dt ? new Date(a.dt).getTime() : 0;
      const db = b.dt ? new Date(b.dt).getTime() : 0;
      return da - db;
    });

    const txCosts: { tx: TransactionItem; fifoCost: number }[] = [];

    for (const tx of sortedTx) {
      const vol = toNum(tx.quantity);
      const price = toNum(tx.price);
      if (vol <= 0 || price <= 0) continue;

      // Точный ключ station:tank
      const txTankKey = `${(tx as TxWithStation)._stationNumber}:${tx.tank}`;
      const batches = batchesByTank.get(txTankKey);

      let costForTx = 0;
      let remaining = vol;

      if (batches) {
        for (const batch of batches) {
          if (remaining <= 0) break;
          if (batch.remaining <= 0) continue;
          const take = Math.min(remaining, batch.remaining);
          costForTx += take * batch.cpl;
          batch.remaining -= take;
          remaining -= take;

          const bp = batchProfits[batch.idx];
          bp.volumeSold += take;
          bp.revenue += take * price;
          bp.cost += take * batch.cpl;
        }
      }
      txCosts.push({ tx, fifoCost: costForTx });
    }

    // Финализируем profit
    for (const bp of batchProfits) {
      bp.profit = bp.revenue - bp.cost;
    }

    return { txCosts, batchProfits };
  }, [transactions, costs]);

  // ── Маржинальность по видам топлива (FIFO) ─────────────
  const marginByFuel = useMemo(() => {
    if (!fifoResult) return [];

    const fuels = new Map<number, { name: string; volume: number; revenue: number; cost: number }>();

    for (const { tx, fifoCost } of fifoResult.txCosts) {
      const vol = toNum(tx.quantity);
      const price = toNum(tx.price);
      const code = tx.fuel;
      const existing = fuels.get(code) || { name: tx.fuel_name || `Топливо ${code}`, volume: 0, revenue: 0, cost: 0 };
      existing.volume += vol;
      existing.revenue += vol * price;
      existing.cost += fifoCost;
      fuels.set(code, existing);
    }

    return Array.from(fuels.entries())
      .map(([fuelCode, data]) => {
        const profit = data.revenue - data.cost;
        const marginPerLiter = data.volume > 0 ? profit / data.volume : 0;
        const marginPct = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;
        return { fuelCode, fuelName: data.name, volume: data.volume, revenue: data.revenue, cost: data.cost, profit, marginPerLiter, marginPct };
      })
      .filter(r => r.volume > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [fifoResult]);

  // ── Маржинальность по способам оплаты (FIFO) ───────────
  const marginByPayment = useMemo(() => {
    if (!fifoResult) return [];

    const payments = new Map<string, { volume: number; revenue: number; cost: number }>();

    for (const { tx, fifoCost } of fifoResult.txCosts) {
      const vol = toNum(tx.quantity);
      const price = toNum(tx.price);
      const payName = normalizePaymentMethod(tx.pay_type?.name || '');
      const existing = payments.get(payName) || { volume: 0, revenue: 0, cost: 0 };
      existing.volume += vol;
      existing.revenue += vol * price;
      existing.cost += fifoCost;
      payments.set(payName, existing);
    }

    return Array.from(payments.entries())
      .map(([payName, data]) => {
        const profit = data.revenue - data.cost;
        const marginPerLiter = data.volume > 0 ? profit / data.volume : 0;
        const marginPct = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;
        return { payName, category: classifyPayment(payName), volume: data.volume, revenue: data.revenue, cost: data.cost, profit, marginPerLiter, marginPct };
      })
      .filter(r => r.volume > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [fifoResult]);

  const totals = useMemo(() => {
    const revenue = marginByFuel.reduce((s, r) => s + r.revenue, 0);
    const cost = marginByFuel.reduce((s, r) => s + r.cost, 0);
    const volume = marginByFuel.reduce((s, r) => s + r.volume, 0);
    const profit = revenue - cost;
    const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;
    const marginPerLiter = volume > 0 ? profit / volume : 0;
    return { revenue, cost, volume, profit, marginPct, marginPerLiter };
  }, [marginByFuel]);

  const pieData = useMemo(() =>
    marginByFuel.map((r, i) => ({
      name: r.fuelName,
      value: r.revenue,
      color: COLORS[i % COLORS.length],
    })),
    [marginByFuel]
  );

  const hasCosts = costs.length > 0 && costs.some(c => c.costPerLiter > 0);

  // Подсчёт расценённых ТТН
  const pricedCount = useMemo(() => {
    if (!systemId) return 0;
    let count = 0;
    for (const r of flatReceipts) {
      const key = makeReceiptCostKey(systemId, r.stationNumber, r.tank, r.ttn, r.dt);
      const c = marginCostsMap.get(key);
      if (c && c.costPerLiter > 0) count++;
    }
    return count;
  }, [systemId, flatReceipts, marginCostsMap]);

  if (!systemId) {
    return (
      <MainLayout fullWidth>
        <div className="w-full h-full px-4 md:px-6 lg:px-8 pt-4">
          <h1 className="text-2xl font-semibold text-foreground mb-4">Маркетинг</h1>
          <Card className="p-6">
            <p className="text-muted-foreground">Выберите торговую сеть для просмотра аналитики маржинальности</p>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth>
      <div className="w-full px-4 md:px-6 lg:px-8">
        {/* Заголовок + период */}
        <div className="mb-4 pt-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <h1 className="text-2xl font-semibold text-foreground">Маркетинг</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Обновить
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label className="text-xs text-muted-foreground">Период от</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="mt-1 w-40" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Период до</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="mt-1 w-40" />
            </div>
            {stationNumber && <Badge variant="outline" className="h-8">ТТ №{stationNumber}</Badge>}
            {flatReceipts.length > 0 && (
              <Badge variant="secondary" className="h-8">
                {pricedCount}/{flatReceipts.length} ТТН расценены
              </Badge>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* ── Табы ──────────────────────────────────────────── */}
        <div className="mb-6 flex gap-1 border-b border-border">
          <button
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors relative',
              activeTab === 'pricing'
                ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setActiveTab('pricing')}
          >
            Расценка ТТН
          </button>
          <button
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors relative',
              activeTab === 'analytics'
                ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setActiveTab('analytics')}
          >
            Аналитика
            {hasCosts && <span className="ml-1.5 text-xs text-green-600">●</span>}
          </button>
          <button
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors relative',
              activeTab === 'batches'
                ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setActiveTab('batches')}
          >
            Прибыль по ТТН
          </button>
        </div>

        {/* ══════ ТАБ: РАСЦЕНКА ТТН ══════ */}
        {activeTab === 'pricing' && (
          <div className="mb-6">
            {/* Метод расценки + единица ввода */}
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 bg-card border border-border rounded-lg px-1.5 py-1">
                <button
                  className={cn('text-xs px-3 py-1 rounded font-medium transition-colors',
                    !volumeMode ? 'bg-amber-600 text-white' : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => { setVolumeMode(false); setVolPreview(null); }}
                >
                  Пакетная
                </button>
                <button
                  className={cn('text-xs px-3 py-1 rounded font-medium transition-colors',
                    volumeMode ? 'bg-violet-600 text-white' : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setVolumeMode(true)}
                >
                  По объёму
                </button>
              </div>
              <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-3 py-1.5">
                <span className="text-xs text-muted-foreground">Единица:</span>
                <button
                  className={`text-xs px-2 py-0.5 rounded ${marginInputUnit === 'liter' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  onClick={() => setMarginInputUnit('liter')}
                >
                  ₽/л
                </button>
                <button
                  className={`text-xs px-2 py-0.5 rounded ${marginInputUnit === 'kg' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  onClick={() => setMarginInputUnit('kg')}
                >
                  ₽/кг
                </button>
              </div>
            </div>

            {/* Панель «По объёму» */}
            {volumeMode && (
              <div className="mb-4 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 p-4">
                <div className="text-sm font-medium text-violet-800 dark:text-violet-200 mb-3">
                  Расценка по объёму — укажите закупку, система подберёт ТТН
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                  <div>
                    <Label className="text-xs text-muted-foreground">Вид топлива</Label>
                    <Select value={volFuel || undefined} onValueChange={v => { setVolFuel(v); setVolPreview(null); }}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Выберите" />
                      </SelectTrigger>
                      <SelectContent>
                        {fuelTypes.map(fuel => {
                          const s = fuelSummary.get(fuel);
                          return (
                            <SelectItem key={fuel} value={fuel}>
                              {fuel} ({s?.count || 0} ТТН, {(s?.volume || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} л)
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Объём закупки, л</Label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="напр. 20000"
                      value={volAmount}
                      onChange={e => { setVolAmount(e.target.value); setVolPreview(null); }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Цена, {marginInputUnit === 'liter' ? '₽/л' : '₽/кг'}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={volPrice}
                      onChange={e => setVolPrice(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Button
                      size="sm"
                      disabled={!volFuel || !volAmount}
                      onClick={handleVolMatch}
                      className="bg-violet-600 hover:bg-violet-700 text-white w-full"
                    >
                      Подобрать ТТН
                    </Button>
                  </div>
                  <div>
                    {volPreview && volPreviewTotals && (
                      <Button
                        size="sm"
                        disabled={!volPrice || volPreviewTotals.count === 0 || volSaving}
                        onClick={handleVolApply}
                        className="bg-green-600 hover:bg-green-700 text-white w-full"
                      >
                        {volSaving ? 'Сохранение...' : `Применить (${volPreviewTotals.count} ТТН)`}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Предпросмотр подбора */}
                {volPreview && (
                  <div className="mt-4">
                    <div className="text-xs text-violet-700 dark:text-violet-300 mb-2">
                      Результат подбора: <b>{volPreviewTotals?.count}</b> ТТН покрыты,
                      распределено <b>{(volPreviewTotals?.allocated || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 })}</b> л
                      из {parseFloat(volAmount).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} л
                    </div>
                    <div className="max-h-[300px] overflow-y-auto rounded border border-violet-200 dark:border-violet-700">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent text-xs">
                            <TableHead className="text-violet-700 dark:text-violet-300">Статус</TableHead>
                            <TableHead className="text-violet-700 dark:text-violet-300">Дата</TableHead>
                            <TableHead className="text-violet-700 dark:text-violet-300">ТТН</TableHead>
                            <TableHead className="text-right text-violet-700 dark:text-violet-300">Объём ТТН, л</TableHead>
                            <TableHead className="text-right text-violet-700 dark:text-violet-300">Распределено, л</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {volPreview.map((m, i) => (
                            <TableRow
                              key={i}
                              className={cn(
                                'text-xs',
                                m.status === 'full' && 'bg-green-50/50 dark:bg-green-900/10',
                                m.status === 'partial' && 'bg-amber-50/50 dark:bg-amber-900/10',
                                m.status === 'skip' && 'opacity-40',
                              )}
                            >
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px]',
                                    m.status === 'full' && 'border-green-500 text-green-700 dark:text-green-400',
                                    m.status === 'partial' && 'border-amber-500 text-amber-700 dark:text-amber-400',
                                    m.status === 'skip' && 'border-muted text-muted-foreground',
                                  )}
                                >
                                  {m.status === 'full' ? 'Полная' : m.status === 'partial' ? 'Частичная' : 'Не вошла'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-foreground/80">
                                {format(new Date(m.receipt.dt), 'dd.MM.yy', { locale: ru })}
                              </TableCell>
                              <TableCell className="font-mono text-foreground/80">{m.receipt.ttn}</TableCell>
                              <TableCell className="text-right font-mono text-foreground/80">
                                {(parseFloat(m.receipt.doc.volume) || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
                              </TableCell>
                              <TableCell className={cn(
                                'text-right font-mono font-medium',
                                m.status === 'full' && 'text-green-700 dark:text-green-400',
                                m.status === 'partial' && 'text-amber-700 dark:text-amber-400',
                              )}>
                                {m.allocated > 0 ? m.allocated.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Таблица поступлений с расценкой (пакетный метод) */}
            {!volumeMode && (
              <Card className="bg-background border-border">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      Поступления (ТТН)
                      {selectedFuel && (
                        <span className="text-muted-foreground font-normal ml-2">
                          — {selectedFuel} ({displayedReceipts.length})
                        </span>
                      )}
                    </h3>
                  </div>
                  {/* Выбор вида топлива (обязательный) */}
                  <div className="flex flex-wrap gap-2">
                    {fuelTypes.map(fuel => {
                      const summary = fuelSummary.get(fuel);
                      const isActive = selectedFuel === fuel;
                      return (
                        <button
                          key={fuel}
                          className={cn(
                            'text-xs px-3 py-1.5 rounded-full border transition-colors font-medium',
                            isActive
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                          )}
                          onClick={() => setSelectedFuel(isActive ? null : fuel)}
                        >
                          {fuel} ({summary?.count || 0}) · {(summary?.volume || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} л
                        </button>
                      );
                    })}
                  </div>
                </div>
                {!selectedFuel ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    Выберите вид топлива для расценки
                  </div>
                ) : receiptsLoading ? (
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : displayedReceipts.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    Нет поступлений за выбранный период
                  </div>
                ) : (
                  <>
                  {/* Панель пакетного действия */}
                  {checkedKeys.size > 0 && (
                    <div className="p-3 border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 flex flex-wrap items-center gap-3">
                      <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                        Выбрано: {checkedKeys.size}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={marginInputUnit === 'liter' ? '₽/л' : '₽/кг'}
                        value={batchPrice}
                        onChange={e => setBatchPrice(e.target.value)}
                        className="h-7 w-28 text-xs"
                      />
                      <Button
                        size="sm"
                        disabled={!batchPrice || batchSaving}
                        onClick={handleBatchApply}
                        className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        {batchSaving ? 'Сохранение...' : 'Применить цену'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setCheckedKeys(new Set())}
                      >
                        Снять выбор
                      </Button>
                    </div>
                  )}
                  <div className="max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-8 px-2">
                            <input
                              type="checkbox"
                              className="rounded border-border"
                              checked={checkedKeys.size > 0 && checkedKeys.size === displayedReceipts.length}
                              ref={el => { if (el) el.indeterminate = checkedKeys.size > 0 && checkedKeys.size < displayedReceipts.length; }}
                              onChange={toggleCheckAll}
                            />
                          </TableHead>
                          <TableHead className="text-muted-foreground">Дата</TableHead>
                          <TableHead className="text-muted-foreground">ТТ</TableHead>
                          <TableHead className="text-muted-foreground">ТТН</TableHead>
                          <TableHead className="text-muted-foreground">Топливо</TableHead>
                          <TableHead className="text-right text-muted-foreground">Объём, л</TableHead>
                          <TableHead className="text-right text-muted-foreground w-32">
                            {marginInputUnit === 'liter' ? '₽/л' : '₽/кг'}
                          </TableHead>
                          <TableHead className="text-right text-muted-foreground">Итого, ₽</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedReceipts.map((receipt, idx) => {
                          const costKey = makeReceiptCostKey(systemId!, receipt.stationNumber, receipt.tank, receipt.ttn, receipt.dt);
                          const saved = marginCostsMap.get(costKey);
                          const docVolume = parseFloat(receipt.doc.volume) || 0;
                          const totalCost = saved ? saved.costPerLiter * docVolume : 0;
                          const displayValue = saved?.costPerLiter
                            ? (marginInputUnit === 'liter' ? saved.costPerLiter : (saved.costPerKg ?? 0)).toFixed(2)
                            : '';
                          const isChecked = checkedKeys.has(costKey);

                          return (
                            <TableRow
                              key={`${receipt.stationNumber}-${receipt.ttn}-${idx}`}
                              className={cn('border-border', isChecked && 'bg-amber-50/50 dark:bg-amber-900/10')}
                            >
                              <TableCell className="px-2">
                                <input
                                  type="checkbox"
                                  className="rounded border-border"
                                  checked={isChecked}
                                  onChange={() => toggleCheck(costKey)}
                                />
                              </TableCell>
                              <TableCell className="text-foreground/80 text-xs">
                                {format(new Date(receipt.dt), 'dd.MM.yy HH:mm', { locale: ru })}
                              </TableCell>
                              <TableCell className="text-foreground/80 text-xs">{receipt.stationNumber}</TableCell>
                              <TableCell className="font-mono text-foreground/80 text-xs">{receipt.ttn}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs bg-secondary text-foreground border-border">
                                  {receipt.service.service_name}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono text-foreground/80 text-xs">
                                {docVolume.toFixed(0)}
                              </TableCell>
                              <TableCell className="py-0.5 px-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  className={cn(
                                    "h-7 text-xs text-right w-full px-1.5",
                                    saved?.costPerLiter ? '' : 'border-amber-300 dark:border-amber-700'
                                  )}
                                  defaultValue={displayValue}
                                  onChange={e => handleCostChange(receipt, e.target.value)}
                                />
                              </TableCell>
                              <TableCell className="text-right font-mono text-foreground/80 text-xs">
                                {totalCost > 0 ? fmtCurrency(totalCost) : '—'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  </>
                )}
              </Card>
            )}
          </div>
        )}

        {/* ══════ ТАБ: ПРИБЫЛЬ ПО ТТН ══════ */}
        {activeTab === 'batches' && (
          <div className="mb-6">
            {!fifoResult || fifoResult.batchProfits.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground text-sm">
                Нет данных — введите себестоимость в табе «Расценка ТТН»
              </Card>
            ) : (
              <Card>
                <div className="p-4 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">
                    Прибыль по партиям (FIFO)
                    <span className="text-muted-foreground font-normal ml-2">
                      ({fifoResult.batchProfits.filter(b => b.volumeSold > 0).length} из {fifoResult.batchProfits.length} прокачаны)
                    </span>
                  </h3>
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-muted-foreground">Дата</TableHead>
                        <TableHead className="text-muted-foreground">ТТ</TableHead>
                        <TableHead className="text-muted-foreground">ТТН</TableHead>
                        <TableHead className="text-muted-foreground">Топливо</TableHead>
                        <TableHead className="text-right text-muted-foreground">Объём, л</TableHead>
                        <TableHead className="text-right text-muted-foreground">Продано, л</TableHead>
                        <TableHead className="text-right text-muted-foreground">Себест., ₽/л</TableHead>
                        <TableHead className="text-right text-muted-foreground">Выручка, ₽</TableHead>
                        <TableHead className="text-right text-muted-foreground">Себест-ть, ₽</TableHead>
                        <TableHead className="text-right text-muted-foreground">Прибыль, ₽</TableHead>
                        <TableHead className="text-right text-muted-foreground">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fifoResult.batchProfits.map((bp, i) => {
                        const pct = bp.revenue > 0 ? (bp.profit / bp.revenue) * 100 : 0;
                        const soldPct = bp.volumeTotal > 0 ? (bp.volumeSold / bp.volumeTotal) * 100 : 0;
                        return (
                          <TableRow
                            key={`${bp.rec.ttn}-${i}`}
                            className={cn('text-xs', bp.volumeSold === 0 && 'opacity-40')}
                          >
                            <TableCell className="text-foreground/80">
                              {format(new Date(bp.rec.receiptDt), 'dd.MM.yy', { locale: ru })}
                            </TableCell>
                            <TableCell className="text-foreground/80">{bp.rec.stationNumber}</TableCell>
                            <TableCell className="font-mono text-foreground/80">{bp.rec.ttn}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">{bp.rec.fuelName}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-foreground/80">
                              {fmtCurrency(bp.volumeTotal)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              <span className={soldPct >= 100 ? 'text-green-600 dark:text-green-400' : soldPct > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}>
                                {fmtCurrency(bp.volumeSold)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono text-foreground/80">
                              {fmtNum(bp.rec.costPerLiter)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-foreground/80">
                              {bp.revenue > 0 ? fmtCurrency(bp.revenue) : '—'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-foreground/80">
                              {bp.cost > 0 ? fmtCurrency(bp.cost) : '—'}
                            </TableCell>
                            <TableCell className={cn(
                              'text-right font-mono font-medium',
                              bp.profit > 0 ? 'text-green-600 dark:text-green-400' : bp.profit < 0 ? 'text-red-600 dark:text-red-400' : ''
                            )}>
                              {bp.volumeSold > 0 ? fmtCurrency(bp.profit) : '—'}
                            </TableCell>
                            <TableCell className={cn(
                              'text-right font-mono font-bold',
                              bp.volumeSold > 0 ? marginColor(pct) : ''
                            )}>
                              {bp.volumeSold > 0 ? `${fmtNum(pct, 1)}%` : '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ══════ ТАБ: АНАЛИТИКА ══════ */}
        {activeTab === 'analytics' && (loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
            <Skeleton className="h-64" />
          </div>
        ) : (
          <>
            {/* KPI карточки */}
            {hasCosts && (
              <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard
                  label="Выручка"
                  value={`${fmtCurrency(totals.revenue)} ₽`}
                  icon={<DollarSign className="h-4 w-4" />}
                  color="blue"
                />
                <KpiCard
                  label="Себестоимость"
                  value={`${fmtCurrency(totals.cost)} ₽`}
                  icon={<Package className="h-4 w-4" />}
                  color="amber"
                />
                <KpiCard
                  label="Прибыль"
                  value={`${fmtCurrency(totals.profit)} ₽`}
                  subtitle={`${fmtNum(totals.marginPerLiter)} ₽/л`}
                  icon={<TrendingUp className="h-4 w-4" />}
                  color={totals.profit >= 0 ? 'green' : 'red'}
                />
                <KpiCard
                  label="Маржинальность"
                  value={`${fmtNum(totals.marginPct, 1)}%`}
                  subtitle={`${fmtCurrency(totals.volume)} л`}
                  icon={<Percent className="h-4 w-4" />}
                  color={totals.marginPct >= 15 ? 'green' : totals.marginPct >= 5 ? 'amber' : 'red'}
                />
              </div>
            )}

            {/* Маржинальность по видам топлива */}
            {marginByFuel.length > 0 && (
              <Card className="mb-6">
                <CardContent className="p-4 md:p-6">
                  <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    Маржинальность по видам топлива
                  </h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Топливо</TableHead>
                          <TableHead className="text-right">Объём, л</TableHead>
                          <TableHead className="text-right">Выручка, ₽</TableHead>
                          <TableHead className="text-right">Себест-ть, ₽</TableHead>
                          <TableHead className="text-right">Прибыль, ₽</TableHead>
                          <TableHead className="text-right">Маржа, ₽/л</TableHead>
                          <TableHead className="text-right">%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {marginByFuel.map(row => (
                          <TableRow key={row.fuelCode}>
                            <TableCell>
                              <Badge variant="outline">{row.fuelName}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">{fmtCurrency(row.volume)}</TableCell>
                            <TableCell className="text-right font-mono">{fmtCurrency(row.revenue)}</TableCell>
                            <TableCell className="text-right font-mono">{fmtCurrency(row.cost)}</TableCell>
                            <TableCell className={`text-right font-mono font-medium ${row.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {fmtCurrency(row.profit)}
                            </TableCell>
                            <TableCell className="text-right font-mono">{fmtNum(row.marginPerLiter)}</TableCell>
                            <TableCell className={`text-right font-mono font-bold ${marginColor(row.marginPct)}`}>
                              {fmtNum(row.marginPct, 1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2 font-bold">
                          <TableCell>Итого</TableCell>
                          <TableCell className="text-right font-mono">{fmtCurrency(totals.volume)}</TableCell>
                          <TableCell className="text-right font-mono">{fmtCurrency(totals.revenue)}</TableCell>
                          <TableCell className="text-right font-mono">{fmtCurrency(totals.cost)}</TableCell>
                          <TableCell className={`text-right font-mono ${totals.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {fmtCurrency(totals.profit)}
                          </TableCell>
                          <TableCell className="text-right font-mono">{fmtNum(totals.marginPerLiter)}</TableCell>
                          <TableCell className={`text-right font-mono ${marginColor(totals.marginPct)}`}>
                            {fmtNum(totals.marginPct, 1)}%
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Маржинальность по способам оплаты */}
            {marginByPayment.length > 0 && (
              <Card className="mb-6">
                <CardContent className="p-4 md:p-6">
                  <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    Маржинальность по способам оплаты
                  </h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Способ оплаты</TableHead>
                          <TableHead className="text-right">Объём, л</TableHead>
                          <TableHead className="text-right">Выручка, ₽</TableHead>
                          <TableHead className="text-right">Себест-ть, ₽</TableHead>
                          <TableHead className="text-right">Прибыль, ₽</TableHead>
                          <TableHead className="text-right">Маржа, ₽/л</TableHead>
                          <TableHead className="text-right">%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {marginByPayment.map(row => (
                          <TableRow key={row.payName}>
                            <TableCell>{row.payName}</TableCell>
                            <TableCell className="text-right font-mono">{fmtCurrency(row.volume)}</TableCell>
                            <TableCell className="text-right font-mono">{fmtCurrency(row.revenue)}</TableCell>
                            <TableCell className="text-right font-mono">{fmtCurrency(row.cost)}</TableCell>
                            <TableCell className={`text-right font-mono font-medium ${row.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {fmtCurrency(row.profit)}
                            </TableCell>
                            <TableCell className="text-right font-mono">{fmtNum(row.marginPerLiter)}</TableCell>
                            <TableCell className={`text-right font-mono font-bold ${marginColor(row.marginPct)}`}>
                              {fmtNum(row.marginPct, 1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Графики */}
            {marginByFuel.length > 0 && hasCosts && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardContent className="p-4 md:p-6">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Структура выручки</h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={2}
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [`${fmtCurrency(value)} ₽`, 'Выручка']}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))',
                            fontSize: 12,
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 md:p-6">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Маржинальность по видам, %</h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <ComposedChart data={marginByFuel}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis dataKey="fuelName" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))',
                            fontSize: 12,
                          }}
                          formatter={(value: number, name: string) => {
                            if (name === 'marginPct') return [`${value.toFixed(1)}%`, 'Маржинальность'];
                            if (name === 'marginPerLiter') return [`${value.toFixed(2)} ₽/л`, 'Маржа'];
                            return [value, name];
                          }}
                        />
                        <Bar dataKey="marginPct" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Line type="monotone" dataKey="marginPerLiter" stroke="#3b82f6" strokeWidth={2} yAxisId={0} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Пусто */}
            {!loading && transactions.length === 0 && (
              <Card className="p-6 text-center text-muted-foreground">
                Нет данных о транзакциях за выбранный период
              </Card>
            )}
          </>
        ))}
      </div>
    </MainLayout>
  );
}

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
  color: 'green' | 'amber' | 'red' | 'blue';
}) {
  const colorMap = {
    green: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    red: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  };

  return (
    <div className={`rounded-lg border p-3 ${colorMap[color]}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <div className="text-lg font-bold truncate">{value}</div>
      {subtitle && <div className="text-xs opacity-70 mt-0.5">{subtitle}</div>}
    </div>
  );
}
