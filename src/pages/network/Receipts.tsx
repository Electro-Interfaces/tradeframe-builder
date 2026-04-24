/**
 * Страница "Поступления топлива"
 * Отображает информацию по поступлениям в резервуары
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useReceipts } from '@/hooks/useReceipts';
import { useSelection } from '@/contexts/SelectionContext';
import { useNewAuth } from '@/contexts/NewAuthContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { networksService } from '@/services/networksService';
import { useSelectedNetworks } from '@/hooks/useSelectedNetworks';
import { tradingPointsService } from '@/services/tradingPointsService';
import { todayString } from '@/utils/dateUtils';
import {
  flattenReceipts,
  getFilterOptions,
} from '@/services/receiptsService';
import { exportReceiptsToExcel } from '@/services/receiptsExportService';
import {
  makeReceiptCostKey,
  recalculateCosts,
  fetchReceiptCosts,
  upsertReceiptCost,
  bulkUpsertReceiptCosts,
  buildCostIndex,
  type ReceiptCostRecord,
  type UpsertReceiptCostData,
} from '@/services/receiptCostApiService';
import {
  fetchConfirmations,
  bulkConfirmReceipts,
  buildConfirmationIndex,
  makeConfirmationKey,
  type ReceiptConfirmation,
} from '@/services/receiptConfirmationApiService';
import { extractStationNumber } from '@/utils/tradingPointUtils';
import type { ReceiptsQueryParams, FlatReceipt } from '@/types/receipts';
import type { Network } from '@/types/network';
import type { TradingPoint } from '@/types/tradingpoint';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Filter, Download, RefreshCw, TrendingUp, Layers, X, Check, Pencil, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ReceiptDetailsModal } from '@/components/receipts/ReceiptDetailsModal';
import { MobileReceiptsTable } from '@/components/receipts/MobileReceiptsTable';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import ReceiptFuelCard from '@/components/receipts/ReceiptFuelCard';

const PULL_THRESHOLD = 80;
const MAX_PULL_DISTANCE = 120;
const INDICATOR_APPEAR_THRESHOLD = 30;

export default function Receipts() {
  // Используем контекст выбора
  const { selectedNetwork, selectedNetworkIds, selectedTradingPoint: selectedTradingPointId, isAllTradingPoints, selectedTradingPoints } = useSelection();
  const { selectedExternalIds } = useSelectedNetworks();
  const { user } = useNewAuth();
  const isMobile = useIsMobile();

  // Вычисляем разрешенные номера станций из scopeValues ролей пользователя
  const allowedStationNumbers = useMemo(() => {
    if (!user?.roles) return null;

    const userScopeValues: string[] = [];
    user.roles.forEach(role => {
      if (role.scopeValues && role.scopeValues.length > 0) {
        userScopeValues.push(...role.scopeValues);
      }
    });

    // Если scopeValues пустой - полный доступ
    if (userScopeValues.length === 0) return null;

    // Извлекаем номера станций из scopeValues формата "{networkCode}-azs-{stationNumber}"
    const stationNumbers = new Set<string>();
    userScopeValues.forEach(scopeValue => {
      const parts = scopeValue.split('-azs-');
      if (parts.length === 2) {
        stationNumbers.add(parts[1]);
      }
    });

    return stationNumbers.size > 0 ? stationNumbers : null;
  }, [user?.roles]);

  // Состояние фильтров
  const [systemId, setSystemId] = useState<number | null>(null);
  const [stationNumber, setStationNumber] = useState<number | null>(null);
  const [stationIds, setStationIds] = useState<number[]>([]);
  const [selectedKpiFuels, setSelectedKpiFuels] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>(() => todayString());
  const [shiftNumber, setShiftNumber] = useState<string>('');
  const [baseId, setBaseId] = useState<string>('');
  const [ttnNumber, setTtnNumber] = useState<string>('');
  const [debouncedTtn, setDebouncedTtn] = useState<string>('');

  const [filtersOpen, setFiltersOpen] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<FlatReceipt | null>(null);

  // ── Массовое подтверждение ────────────────────────────
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);

  // Загрузка списка сетей
  const [networks, setNetworks] = useState<Network[]>([]);

  // Загрузка сетей
  useEffect(() => {
    networksService.getAll().then(setNetworks).catch(() => {});
  }, []);

  // Все system IDs из мультиселекта сетей
  const systemIds = useMemo(() =>
    selectedExternalIds.map(id => parseInt(id)).filter(n => !isNaN(n)),
    [selectedExternalIds]
  );

  // Устанавливаем системный ID из контекста при загрузке (первая выбранная сеть)
  useEffect(() => {
    if (systemIds.length > 0) {
      setSystemId(systemIds[0]);
    } else if (selectedNetwork?.external_id) {
      setSystemId(parseInt(selectedNetwork.external_id));
    }
  }, [systemIds, selectedNetwork]);

  // Извлекаем номер станции из выбранной торговой точки
  useEffect(() => {
    if (isAllTradingPoints) {
      setStationNumber(null);
    } else if (selectedTradingPointId && selectedNetwork?.id) {
      tradingPointsService.getById(selectedTradingPointId, selectedNetwork.id)
        .then(tp => {
          const station = extractStationNumber(tp);
          setStationNumber(station || null);
        })
        .catch(() => setStationNumber(null));
    }
  }, [selectedTradingPointId, selectedNetwork, isAllTradingPoints]);

  // Параметры запроса к API (с мультисетевой поддержкой)
  const queryParams = useMemo(() => {
    const params: any = {
      system: systemId || 0,
      systems: systemIds.length > 1 ? systemIds : undefined
    };

    // Добавляем station если выбрана конкретная торговая точка
    if (stationNumber !== null && !isAllTradingPoints) {
      params.station = stationNumber;
    }

    if (dateFrom) params.dt_beg = dateFrom;
    if (dateTo) params.dt_end = dateTo;

    return params;
  }, [systemId, systemIds, stationNumber, isAllTradingPoints, dateFrom, dateTo]);

  // Загрузка данных
  const { data: receiptsData, isLoading, isError, error, refetch } = useReceipts(queryParams);

  // Pull-to-refresh для мобильных
  const {
    pullState,
    pullDistance,
    scrollContainerRef
  } = usePullToRefresh({
    onRefresh: refetch,
    enabled: isMobile,
    pullThreshold: PULL_THRESHOLD,
    maxPullDistance: MAX_PULL_DISTANCE,
    indicatorAppearThreshold: INDICATOR_APPEAR_THRESHOLD
  });

  // Дебаунс для номера ТТН
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTtn(ttnNumber);
    }, 500);

    return () => clearTimeout(timer);
  }, [ttnNumber]);

  // Преобразование данных в плоский список
  const flatReceipts = useMemo(() => {
    if (!receiptsData) return [];
    return flattenReceipts(receiptsData);
  }, [receiptsData]);

  // Получение опций для фильтров
  const filterOptions = useMemo(() => {
    return getFilterOptions(flatReceipts);
  }, [flatReceipts]);

  // Номера станций из мультиселекта для фильтрации поступлений
  const [resolvedStationNumbers, setResolvedStationNumbers] = useState<Set<string> | null>(null);

  // Всегда фильтруем по справочнику — STS может возвращать станции, не зарегистрированные в системе
  useEffect(() => {
    if (!isAllTradingPoints || selectedNetworkIds.length === 0) {
      setResolvedStationNumbers(null);
      return;
    }
    Promise.all(
      selectedNetworkIds.map(id => tradingPointsService.getByNetworkId(id).catch(() => []))
    ).then(results => {
      const allPoints = results.flat();
      const relevantPoints = selectedTradingPoints.length > 0 && selectedTradingPoints.length < allPoints.length
        ? allPoints.filter(p => selectedTradingPoints.includes(p.id))
        : allPoints;
      const numbers = new Set(
        relevantPoints.map(p => p.external_id).filter((id): id is string => !!id)
      );
      setResolvedStationNumbers(numbers.size > 0 ? numbers : null);
    });
  }, [isAllTradingPoints, selectedTradingPoints, selectedNetworkIds]);

  // Базовая фильтрация БЕЗ фильтра по видам топлива (для карточек)
  const baseFilteredReceipts = useMemo(() => {
    let filtered = flatReceipts;

    // Фильтр по мультиселекту торговых точек
    if (resolvedStationNumbers && resolvedStationNumbers.size > 0) {
      filtered = filtered.filter(r => resolvedStationNumbers.has(String(r.stationNumber)));
    }

    // Фильтр по доступным станциям (RBAC на основе scopeValues роли пользователя)
    if (allowedStationNumbers) {
      filtered = filtered.filter(r => allowedStationNumbers.has(String(r.stationNumber)));
    }

    // Фильтр по ТТ
    if (stationIds.length > 0) {
      filtered = filtered.filter(r => stationIds.includes(r.stationNumber));
    }

    // Фильтр по номеру смены
    if (shiftNumber && shiftNumber.trim() !== '') {
      const shift = parseInt(shiftNumber);
      filtered = filtered.filter(r => r.shiftNumber === shift);
    }

    // Фильтр по нефтебазе
    if (baseId && baseId !== 'all') {
      filtered = filtered.filter(r => r.base.id === parseInt(baseId));
    }

    // Фильтр по номеру ТТН
    if (debouncedTtn && debouncedTtn.trim() !== '') {
      filtered = filtered.filter(r =>
        r.ttn.toLowerCase().includes(debouncedTtn.toLowerCase().trim())
      );
    }

    // Клиентская фильтрация по датам (т.к. API не фильтрует корректно)
    if (dateFrom || dateTo) {
      filtered = filtered.filter(r => {
        const receiptDate = new Date(r.dt);

        if (dateFrom && dateTo) {
          // Оба фильтра заданы
          const fromDate = new Date(dateFrom + 'T00:00:00');
          const toDate = new Date(dateTo + 'T23:59:59');
          return receiptDate >= fromDate && receiptDate <= toDate;
        } else if (dateFrom) {
          // Только дата "от"
          const fromDate = new Date(dateFrom + 'T00:00:00');
          return receiptDate >= fromDate;
        } else if (dateTo) {
          // Только дата "до"
          const toDate = new Date(dateTo + 'T23:59:59');
          return receiptDate <= toDate;
        }

        return true;
      });
    }

    return filtered;
  }, [flatReceipts, stationIds, shiftNumber, baseId, debouncedTtn, dateFrom, dateTo, allowedStationNumbers, resolvedStationNumbers]);

  // Фильтрация и сортировка данных на клиенте (для таблицы)
  const filteredReceipts = useMemo(() => {
    let filtered = baseFilteredReceipts;

    // Фильтр по виду топлива через KPI карточки
    if (selectedKpiFuels.size > 0) {
      filtered = filtered.filter(receipt =>
        selectedKpiFuels.has(receipt.service.service_name)
      );
    }

    // Сортировка: самые свежие наверху (по дате, DESC)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.dt).getTime();
      const dateB = new Date(b.dt).getTime();
      return dateB - dateA; // DESC - новые сверху
    });
  }, [baseFilteredReceipts, selectedKpiFuels]);

  // Открытие модального окна с деталями
  const handleSelectReceipt = (receipt: FlatReceipt) => {
    setSelectedReceipt(receipt);
  };

  // Закрытие модального окна
  const handleCloseModal = () => {
    setSelectedReceipt(null);
  };

  // Обработка выбора видов топлива через KPI карточки
  const handleKpiFuelClick = (fuel: string) => {
    const newSelected = new Set(selectedKpiFuels);
    if (newSelected.has(fuel)) {
      newSelected.delete(fuel);
    } else {
      newSelected.add(fuel);
    }
    setSelectedKpiFuels(newSelected);
  };

  // Очистка фильтров
  const clearFilters = () => {
    setStationIds([]);
    setSelectedKpiFuels(new Set());
    setDateFrom('');
    setDateTo(todayString());
    setShiftNumber('');
    setBaseId('');
    setTtnNumber('');
  };

  // ── Подтверждения менеджером ─────────────────────────────
  const [confirmations, setConfirmations] = useState<Map<string, ReceiptConfirmation>>(new Map());

  const loadConfirmations = useCallback(() => {
    if (!systemId) return;
    fetchConfirmations({
      systemId,
      stationNumber: stationNumber ?? undefined,
      dtBeg: dateFrom || undefined,
      dtEnd: dateTo || undefined,
    })
      .then(items => setConfirmations(buildConfirmationIndex(items)))
      .catch(() => {});
  }, [systemId, stationNumber, dateFrom, dateTo]);

  // Загрузка подтверждений при изменении фильтров
  useEffect(() => { loadConfirmations(); }, [loadConfirmations]);

  // Сброс чекбоксов при смене фильтров
  useEffect(() => { setCheckedKeys(new Set()); }, [systemId, stationNumber, dateFrom, dateTo]);

  const getReceiptKey = useCallback((r: FlatReceipt) => {
    return systemId ? makeConfirmationKey(systemId, r.stationNumber, r.tank, r.ttn, r.dt) : '';
  }, [systemId]);

  // Неподтверждённые строки из текущего отфильтрованного списка
  const unconfirmedReceipts = useMemo(() => {
    return filteredReceipts.filter(r => {
      const key = getReceiptKey(r);
      return key && !confirmations.has(key);
    });
  }, [filteredReceipts, confirmations, getReceiptKey]);

  const toggleCheck = useCallback((key: string) => {
    setCheckedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const toggleCheckAll = useCallback(() => {
    setCheckedKeys(prev => {
      if (prev.size >= unconfirmedReceipts.length && unconfirmedReceipts.length > 0) return new Set();
      return new Set(unconfirmedReceipts.map(r => getReceiptKey(r)));
    });
  }, [unconfirmedReceipts, getReceiptKey]);

  const handleBulkConfirm = useCallback(async () => {
    if (!systemId || checkedKeys.size === 0) return;
    setBulkSaving(true);
    try {
      const items = filteredReceipts
        .filter(r => checkedKeys.has(getReceiptKey(r)))
        .map(r => ({
          systemId: systemId!,
          stationNumber: r.stationNumber,
          shiftNumber: r.shiftNumber,
          tankNumber: r.tank,
          ttn: r.ttn,
          receiptDt: r.dt,
          status: 'confirmed' as const,
        }));
      await bulkConfirmReceipts(items);
      setCheckedKeys(new Set());
      loadConfirmations();
    } catch (err: any) {
      alert(err.message || 'Ошибка массового подтверждения');
    } finally {
      setBulkSaving(false);
    }
  }, [systemId, checkedKeys, filteredReceipts, getReceiptKey, loadConfirmations]);

  // ── Режим маржи ──────────────────────────────────────────
  const [showMargin, setShowMargin] = useState(false);
  const [marginCosts, setMarginCosts] = useState<Map<string, ReceiptCostRecord>>(new Map());
  const marginTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [marginInputUnit, setMarginInputUnit] = useState<'liter' | 'kg'>('liter');

  // Загрузка цен из PG при включении режима маржи
  useEffect(() => {
    if (!showMargin || !systemId) return;
    fetchReceiptCosts({
      systemId,
      stationNumber: stationNumber ?? undefined,
      dtBeg: dateFrom || undefined,
      dtEnd: dateTo || undefined,
    })
      .then(records => setMarginCosts(buildCostIndex(records)))
      .catch(() => {});
  }, [showMargin, systemId, stationNumber, dateFrom, dateTo]);

  const handleMarginCostChange = useCallback((receipt: FlatReceipt, rawValue: string) => {
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
    setMarginCosts(prev => {
      const next = new Map(prev);
      next.set(key, {
        id: '',
        ...data,
        costPerKg: costPerKg,
        createdBy: null,
        updatedBy: null,
        createdAt: '',
        updatedAt: new Date().toISOString(),
      } as ReceiptCostRecord);
      return next;
    });

    // Debounced save to PG
    const existingTimer = marginTimers.current.get(key);
    if (existingTimer) clearTimeout(existingTimer);
    marginTimers.current.set(key, setTimeout(() => {
      upsertReceiptCost(data).catch(() => {});
      marginTimers.current.delete(key);
    }, 600));
  }, [systemId, marginInputUnit]);

  // KPI маржи
  const marginSummary = useMemo(() => {
    if (!showMargin || marginCosts.size === 0) return null;
    let totalCost = 0;
    let totalVolume = 0;
    let count = 0;
    for (const c of marginCosts.values()) {
      if (c.costPerLiter > 0) {
        totalCost += c.totalCost;
        totalVolume += c.volumeLiters;
        count++;
      }
    }
    const avgCostPerLiter = totalVolume > 0 ? totalCost / totalVolume : 0;
    return { totalCost, totalVolume, avgCostPerLiter, count };
  }, [showMargin, marginCosts]);

  // Быстрое заполнение по виду топлива
  const [bulkFillOpen, setBulkFillOpen] = useState(false);
  const [bulkFillFuel, setBulkFillFuel] = useState<string>('');
  const [bulkFillPrice, setBulkFillPrice] = useState<string>('');
  const [bulkFillSaving, setBulkFillSaving] = useState(false);

  const bulkFillTargets = useMemo(() => {
    if (!bulkFillFuel || !showMargin || !systemId) return [];
    return filteredReceipts.filter(r => {
      if (r.service.service_name !== bulkFillFuel) return false;
      const key = makeReceiptCostKey(systemId, r.stationNumber, r.tank, r.ttn, r.dt);
      const existing = marginCosts.get(key);
      return !existing || existing.costPerLiter <= 0;
    });
  }, [bulkFillFuel, showMargin, systemId, filteredReceipts, marginCosts]);

  const handleBulkFill = useCallback(async (mode: 'fill_empty' | 'overwrite') => {
    if (!systemId || !bulkFillFuel) return;
    const price = parseFloat(bulkFillPrice);
    if (isNaN(price) || price <= 0) return;

    const targets = mode === 'overwrite'
      ? filteredReceipts.filter(r => r.service.service_name === bulkFillFuel)
      : bulkFillTargets;

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

      // Перезагрузка цен
      const records = await fetchReceiptCosts({
        systemId,
        stationNumber: stationNumber ?? undefined,
        dtBeg: dateFrom || undefined,
        dtEnd: dateTo || undefined,
      });
      setMarginCosts(buildCostIndex(records));
      setBulkFillOpen(false);
      setBulkFillPrice('');
    } catch {
      // тихая ошибка
    } finally {
      setBulkFillSaving(false);
    }
  }, [systemId, bulkFillFuel, bulkFillPrice, marginInputUnit, filteredReceipts, bulkFillTargets, stationNumber, dateFrom, dateTo]);

  // Экспорт в Excel
  const handleExport = async () => {
    try {
      const blob = await exportReceiptsToExcel(
        filteredReceipts,
        selectedNetwork?.name || 'Торговая сеть',
        {
          dateFrom,
          dateTo
        }
      );

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `поступления_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // Ошибка обработана
    }
  };

  if (!systemId) {
    return (
      <MainLayout fullWidth={true}>
        <div className="w-full h-full px-4 md:px-6 lg:px-8">
          <div className="mb-6 pt-4">
            <h1 className="text-2xl font-semibold text-foreground">Поступления топлива</h1>
          </div>
          <div className="bg-di-surface-mid rounded-xl border border-transparent p-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Выберите торговую сеть для просмотра поступлений
              </AlertDescription>
            </Alert>
            <Card className="p-6 mt-6 bg-secondary border-border">
              <Label htmlFor="network-select">Торговая сеть</Label>
              <Select onValueChange={(value) => setSystemId(parseInt(value))}>
                <SelectTrigger id="network-select" className="mt-2">
                  <SelectValue placeholder="Выберите сеть" />
                </SelectTrigger>
                <SelectContent>
                  {networks?.map((network) => (
                    <SelectItem key={network.id} value={network.id.toString()}>
                      {network.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth={true}>
      <div
        ref={scrollContainerRef}
        data-pull-to-refresh="true"
        className={`w-full px-4 md:px-6 lg:px-8 relative ${isMobile ? 'overflow-y-scroll' : ''}`}
        style={isMobile ? {
          height: 'calc(100vh - 120px)',
          overscrollBehavior: 'none',
          overscrollBehaviorY: 'none',
          WebkitOverscrollBehavior: 'none',
          WebkitOverscrollBehaviorY: 'none',
          touchAction: 'pan-y',
          WebkitOverflowScrolling: 'touch'
        } : undefined}
      >
        {/* Pull-to-refresh индикатор */}
        {isMobile && pullDistance > INDICATOR_APPEAR_THRESHOLD && (
          <div
            className="absolute top-0 left-0 right-0 flex justify-center items-center z-50 transition-all duration-200"
            style={{
              height: `${Math.min(pullDistance, MAX_PULL_DISTANCE)}px`,
              opacity: Math.min(pullDistance / PULL_THRESHOLD, 1)
            }}
          >
            <div className="bg-card/90 backdrop-blur-sm rounded-full p-3 shadow-lg border border-border">
              {pullState === 'refreshing' ? (
                <RefreshCw className="h-5 w-5 text-primary dark:text-primary/70 animate-spin" />
              ) : pullDistance >= PULL_THRESHOLD ? (
                <RefreshCw className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <RefreshCw className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>
        )}
        {/* Заголовок страницы */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <h1 className={`font-headline font-bold text-foreground ${isMobile ? 'text-lg' : 'text-xl'}`}>{isMobile ? 'Поступления' : 'Поступления топлива'}</h1>
          </div>
          <div className="flex gap-3 items-center shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filteredReceipts.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Экспорт
            </Button>
          </div>
        </div>

        {/* Панель фильтров + карточки топлива */}
        {filtersOpen && (
        <div className={isMobile ? 'space-y-4 mb-8' : 'flex gap-4 mb-8 items-stretch'}>
          <div className={isMobile ? '' : 'flex-1 min-w-0 flex'}>
            <div className="bg-di-surface-mid rounded-xl border border-transparent flex-1 flex flex-col justify-between">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">Фильтры</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                >
                  Очистить фильтры
                </Button>
              </div>
              <div className="px-4 pb-4 border-t border-di-outline-variant/10 pt-4">
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Дата от */}
                    <div>
                      <Label htmlFor="date-from" className="text-xs text-muted-foreground">Дата от</Label>
                      <Input
                        id="date-from"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="mt-1 border-di-outline-variant/20 bg-di-surface-low"
                      />
                    </div>

                    {/* Дата до */}
                    <div>
                      <Label htmlFor="date-to" className="text-xs text-muted-foreground">Дата до</Label>
                      <Input
                        id="date-to"
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="mt-1 border-di-outline-variant/20 bg-di-surface-low"
                      />
                    </div>

                    {/* Номер ТТН */}
                    <div>
                      <Label htmlFor="ttn" className="text-xs text-muted-foreground">Номер ТТН</Label>
                      <Input
                        id="ttn"
                        type="text"
                        placeholder="Введите номер"
                        value={ttnNumber}
                        onChange={(e) => setTtnNumber(e.target.value)}
                        className="mt-1 border-di-outline-variant/20 bg-di-surface-low"
                      />
                    </div>

                    {/* Нефтебаза */}
                    <div>
                      <Label htmlFor="base" className="text-xs text-muted-foreground">Нефтебаза</Label>
                      <Select value={baseId || undefined} onValueChange={setBaseId}>
                        <SelectTrigger id="base" className="mt-1 border-di-outline-variant/20 bg-di-surface-low">
                          <SelectValue placeholder="Все" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все</SelectItem>
                          {filterOptions.bases.map((base) => (
                            <SelectItem key={base.id} value={base.id.toString()}>
                              {base.name || `База ${base.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Номер смены */}
                    <div>
                      <Label htmlFor="shift-number" className="text-xs text-muted-foreground">Номер смены</Label>
                      <Input
                        id="shift-number"
                        type="number"
                        placeholder="Введите номер"
                        value={shiftNumber}
                        onChange={(e) => setShiftNumber(e.target.value)}
                        className="mt-1 border-di-outline-variant/20 bg-di-surface-low"
                      />
                    </div>
                  </div>
                </div>
            </div>
          </div>
          {/* Карточки видов топлива — справа от фильтра */}
          {flatReceipts.length > 0 && (
            <div className="bg-di-surface-mid rounded-xl border border-transparent p-4 shrink-0 md:w-[420px]">
              <div className="grid grid-cols-2 gap-2">
              {filterOptions.fuelTypes.map((fuel) => {
                // Используем baseFilteredReceipts - данные БЕЗ фильтра по видам топлива
                const fuelReceipts = baseFilteredReceipts.filter(r => r.service.service_name === fuel);
                // Используем документальные данные (doc) для избежания ошибок в фактических данных
                const totalVolume = fuelReceipts.reduce((sum, r) => sum + parseFloat(r.doc.volume), 0);
                const totalAmount = fuelReceipts.reduce((sum, r) => sum + parseFloat(r.doc.amount), 0);
                const isSelected = selectedKpiFuels.has(fuel);

                return (
                  <ReceiptFuelCard
                    key={fuel}
                    fuel={fuel}
                    isSelected={isSelected}
                    isMobile={isMobile}
                    volume={totalVolume}
                    amount={totalAmount}
                    receiptCount={fuelReceipts.length}
                    onClick={handleKpiFuelClick}
                  />
                );
              })}

              {/* Итоговая карточка */}
              <ReceiptFuelCard
                fuel="Итого"
                isSelected={false}
                isMobile={isMobile}
                volume={baseFilteredReceipts.reduce((sum, r) => sum + parseFloat(r.doc.volume), 0)}
                amount={baseFilteredReceipts.reduce((sum, r) => sum + parseFloat(r.doc.amount), 0)}
                receiptCount={baseFilteredReceipts.length}
                onClick={() => setSelectedKpiFuels(new Set())}
              />
              </div>
            </div>
          )}
        </div>
        )}

        {/* KPI маржи */}
        {showMargin && marginSummary && marginSummary.count > 0 && (
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Средняя закупочная</div>
              <div className="text-lg font-bold text-amber-700 dark:text-amber-300">{marginSummary.avgCostPerLiter.toFixed(2)} ₽/л</div>
            </div>
            <div className="rounded-lg border border-primary/20 dark:border-primary bg-primary/5 dark:bg-blue-900/20 p-3">
              <div className="text-[10px] text-primary dark:text-primary/70 font-medium">Общая стоимость</div>
              <div className="text-lg font-bold text-primary dark:text-blue-300">{marginSummary.totalCost.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽</div>
            </div>
            <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-3">
              <div className="text-[10px] text-green-600 dark:text-green-400 font-medium">Объём с ценой</div>
              <div className="text-lg font-bold text-green-700 dark:text-green-300">{marginSummary.totalVolume.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} л</div>
              <div className="text-[10px] text-green-600/70 dark:text-green-400/70">{marginSummary.count} из {filteredReceipts.length} поступлений</div>
            </div>
          </div>
        )}

        {/* Панель управления расценкой: единицы ввода */}
        {showMargin && filteredReceipts.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-3 py-1.5">
              <span className="text-xs text-muted-foreground">Единица ввода:</span>
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
        )}

        {/* Панель массовой расценки */}
        {bulkFillOpen && (
          <div className="mb-4 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 p-4">
            <div className="text-sm font-medium text-violet-800 dark:text-violet-200 mb-3">
              Массовая расценка — заполнение себестоимости по виду топлива
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
              <div>
                <Label className="text-xs text-muted-foreground">Вид топлива</Label>
                <Select value={bulkFillFuel || undefined} onValueChange={setBulkFillFuel}>
                  <SelectTrigger className="mt-1 border-di-outline-variant/20 bg-di-surface-low">
                    <SelectValue placeholder="Выберите" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions.fuelTypes.map(fuel => (
                      <SelectItem key={fuel} value={fuel}>{fuel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  value={bulkFillPrice}
                  onChange={e => setBulkFillPrice(e.target.value)}
                  className="mt-1 border-di-outline-variant/20 bg-di-surface-low"
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {bulkFillFuel && (
                  <>
                    <div>Незаполненных: <b>{bulkFillTargets.length}</b></div>
                    <div>Объём: <b>{bulkFillTargets.reduce((s, r) => s + (parseFloat(r.doc.volume) || 0), 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} л</b></div>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={!bulkFillFuel || !bulkFillPrice || bulkFillTargets.length === 0 || bulkFillSaving}
                  onClick={() => handleBulkFill('fill_empty')}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {bulkFillSaving ? 'Сохранение...' : 'Заполнить пустые'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!bulkFillFuel || !bulkFillPrice || bulkFillSaving}
                  onClick={() => handleBulkFill('overwrite')}
                >
                  Заменить все
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Таблица */}
        <div className="bg-di-surface-mid rounded-xl border border-transparent p-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Журнал поступлений
              <span className="text-muted-foreground ml-2 font-normal text-sm">
                ({filteredReceipts.length})
              </span>
            </h2>
          </div>

          <Card className="bg-transparent border-transparent shadow-none">
        {/* Панель массового подтверждения */}
        {checkedKeys.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 border-b border-di-outline-variant/10 bg-di-surface-low">
            <span className="text-sm text-muted-foreground">
              Выбрано: <span className="font-medium text-foreground">{checkedKeys.size}</span>
            </span>
            <Button
              size="sm"
              onClick={handleBulkConfirm}
              disabled={bulkSaving}
              className="bg-green-600 hover:bg-green-700 text-white text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              {bulkSaving ? 'Подтверждение...' : 'Подтвердить выбранные'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCheckedKeys(new Set())}
              className="text-xs text-muted-foreground"
            >
              Снять выбор
            </Button>
          </div>
        )}
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : isError ? (
          <Alert variant="destructive" className="m-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Ошибка загрузки данных: {error instanceof Error ? error.message : 'Неизвестная ошибка'}
            </AlertDescription>
          </Alert>
        ) : filteredReceipts.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            Нет данных для отображения
          </div>
        ) : isMobile ? (
          <MobileReceiptsTable
            receipts={filteredReceipts}
            onReceiptClick={handleSelectReceipt}
            confirmations={confirmations}
            getConfirmationKey={(r) => systemId ? makeConfirmationKey(systemId, r.stationNumber, r.tank, r.ttn, r.dt) : ''}
            onBulkConfirm={systemId ? async (items) => {
              await bulkConfirmReceipts(items.map(r => ({
                systemId: systemId!,
                stationNumber: r.stationNumber,
                shiftNumber: r.shiftNumber,
                tankNumber: r.tank,
                ttn: r.ttn,
                receiptDt: r.dt,
                status: 'confirmed' as const,
              })));
              loadConfirmations();
            } : undefined}
          />
        ) : (
          <Table className="border-separate border-spacing-y-1">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-8 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <Checkbox
                    checked={unconfirmedReceipts.length > 0 && checkedKeys.size >= unconfirmedReceipts.length}
                    onCheckedChange={toggleCheckAll}
                    aria-label="Выбрать все"
                  />
                </TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Дата и время</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">ТТ</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Смена</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">ТТН</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Топливо</TableHead>
                <TableHead className="text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Объем (л)</TableHead>
                <TableHead className="text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Масса (кг)</TableHead>
                <TableHead className="text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Отклонение (кг)</TableHead>
                <TableHead className="text-center text-muted-foreground w-10"></TableHead>
                {showMargin && (
                  <>
                    <TableHead className="text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-28">{marginInputUnit === 'liter' ? '₽/л' : '₽/кг'}</TableHead>
                    <TableHead className="text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Итого ₽</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceipts.map((receipt, index) => {
                const receiptId = `${receipt.stationNumber}-${receipt.shiftNumber}-${receipt.ttn}-${index}`;

                const docVolume = parseFloat(receipt.doc.volume);
                const docAmount = parseFloat(receipt.doc.amount);
                const factAmount = parseFloat(receipt.fact.amount);
                const amountDiff = factAmount - docAmount;

                const rKey = getReceiptKey(receipt);
                const conf = confirmations.get(rKey);
                const isConfirmed = !!conf;

                return (
                  <TableRow
                    key={receiptId}
                    className={cn(
                      'cursor-pointer bg-di-surface-low hover:bg-di-surface-high transition-colors group h-16 border-b-0 [&>td:last-child]:rounded-r-xl',
                      isConfirmed && 'bg-muted/40',
                      conf?.status === 'corrected' && 'border-l-2 border-l-amber-400',
                      conf?.status === 'rejected' && 'border-l-2 border-l-red-400',
                    )}
                    onClick={() => handleSelectReceipt(receipt)}
                  >
                    <TableCell className="px-2 rounded-l-xl" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={checkedKeys.has(rKey)}
                        onCheckedChange={() => toggleCheck(rKey)}
                        disabled={isConfirmed}
                        aria-label="Выбрать поступление"
                      />
                    </TableCell>
                    <TableCell className="text-foreground/80">
                      {format(new Date(receipt.dt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                    </TableCell>
                    <TableCell className="text-foreground/80">{receipt.stationNumber}</TableCell>
                    <TableCell className="text-foreground/80">{receipt.shiftNumber}</TableCell>
                    <TableCell className="font-mono text-foreground/80">{receipt.ttn}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-secondary text-foreground border-border">
                        {receipt.service.service_name}
                      </Badge>
                    </TableCell>

                    {/* Документальные данные — с корректировкой если есть */}
                    <TableCell className="text-right font-mono text-foreground/80">
                      {conf?.status === 'corrected' && conf.correctedVolume ? (
                        <div className="flex flex-col items-end leading-tight">
                          <span className="text-[10px] text-muted-foreground line-through">{docVolume.toFixed(2)}</span>
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">{parseFloat(conf.correctedVolume).toFixed(2)}</span>
                        </div>
                      ) : (
                        docVolume.toFixed(2)
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-foreground/80">
                      {conf?.status === 'corrected' && conf.correctedAmount ? (
                        <div className="flex flex-col items-end leading-tight">
                          <span className="text-[10px] text-muted-foreground line-through">{docAmount.toFixed(2)}</span>
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">{parseFloat(conf.correctedAmount).toFixed(2)}</span>
                        </div>
                      ) : (
                        docAmount.toFixed(2)
                      )}
                    </TableCell>

                    {/* Отклонение по массе */}
                    <TableCell className="text-right font-mono">
                      <span className={cn(amountDiff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                        {amountDiff > 0 ? '+' : ''}{amountDiff.toFixed(2)}
                      </span>
                    </TableCell>

                    {/* Статус подтверждения */}
                    <TableCell className="text-center px-1">
                      {conf && (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex">
                                {conf.status === 'confirmed' && <Check className="h-4 w-4 text-green-500" />}
                                {conf.status === 'corrected' && <Pencil className="h-4 w-4 text-amber-500" />}
                                {conf.status === 'rejected' && <XCircle className="h-4 w-4 text-red-500" />}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs max-w-xs p-0">
                              <div className="p-2 space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  {conf.status === 'confirmed' && <Check className="h-3 w-3 text-green-500 shrink-0" />}
                                  {conf.status === 'corrected' && <Pencil className="h-3 w-3 text-amber-500 shrink-0" />}
                                  {conf.status === 'rejected' && <XCircle className="h-3 w-3 text-red-500 shrink-0" />}
                                  <span className="font-medium">
                                    {conf.status === 'confirmed' ? 'Подтверждено' : conf.status === 'corrected' ? 'Скорректировано' : 'Отклонено'}
                                  </span>
                                </div>
                                <div className="text-muted-foreground">
                                  {conf.confirmedByName && <span>{conf.confirmedByName} · </span>}
                                  {format(new Date(conf.updatedAt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                                </div>
                                {conf.status === 'corrected' && (
                                  <div className="border-t border-border pt-1.5 mt-1.5 space-y-0.5 font-mono">
                                    {conf.correctedVolume && (
                                      <div className="flex justify-between gap-3">
                                        <span className="text-muted-foreground">Объём:</span>
                                        <span><span className="text-muted-foreground line-through mr-1">{docVolume.toFixed(2)}</span>→ <span className="text-amber-600 dark:text-amber-400 font-semibold">{parseFloat(conf.correctedVolume).toFixed(2)}</span></span>
                                      </div>
                                    )}
                                    {conf.correctedAmount && (
                                      <div className="flex justify-between gap-3">
                                        <span className="text-muted-foreground">Масса:</span>
                                        <span><span className="text-muted-foreground line-through mr-1">{docAmount.toFixed(2)}</span>→ <span className="text-amber-600 dark:text-amber-400 font-semibold">{parseFloat(conf.correctedAmount).toFixed(2)}</span></span>
                                      </div>
                                    )}
                                    {conf.correctedDensity != null && (
                                      <div className="flex justify-between gap-3">
                                        <span className="text-muted-foreground">Плотн.:</span>
                                        <span><span className="text-muted-foreground line-through mr-1">{receipt.doc.density.toFixed(3)}</span>→ <span className="text-amber-600 dark:text-amber-400 font-semibold">{conf.correctedDensity.toFixed(3)}</span></span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {conf.comment && (
                                  <div className="border-t border-border pt-1.5 mt-1.5 text-foreground/80 italic">
                                    {conf.comment}
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>

                    {showMargin && (() => {
                      const costKey = systemId
                        ? makeReceiptCostKey(systemId, receipt.stationNumber, receipt.tank, receipt.ttn, receipt.dt)
                        : '';
                      const saved = marginCosts.get(costKey);
                      const totalCost = saved ? saved.costPerLiter * docVolume : 0;
                      return (
                        <>
                          <TableCell className="py-0.5 px-1" onClick={e => e.stopPropagation()}>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              className="h-7 text-xs text-right w-full px-1.5"
                              defaultValue={saved?.costPerLiter ? (marginInputUnit === 'liter' ? saved.costPerLiter : (saved.costPerKg ?? 0)).toFixed(2) : ''}
                              onChange={e => handleMarginCostChange(receipt, e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono text-foreground/80">
                            {totalCost > 0 ? totalCost.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) : '—'}
                          </TableCell>
                        </>
                      );
                    })()}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
          </Card>
        </div>

        {/* Модальное окно деталей поступления */}
        <ReceiptDetailsModal
          isOpen={selectedReceipt !== null}
          onClose={handleCloseModal}
          receipt={selectedReceipt}
          systemId={systemId}
          confirmation={selectedReceipt && systemId
            ? confirmations.get(makeConfirmationKey(systemId, selectedReceipt.stationNumber, selectedReceipt.tank, selectedReceipt.ttn, selectedReceipt.dt)) ?? null
            : null
          }
          onConfirmationChanged={loadConfirmations}
        />
      </div>
    </MainLayout>
  );
}
