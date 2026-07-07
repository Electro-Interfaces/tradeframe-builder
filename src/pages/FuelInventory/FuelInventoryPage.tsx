/**
 * Страница "Остатки топлива" — новый дизайн (Этап 1)
 * Сводка KPI сверху + группировка резервуаров по станциям + фильтр «требуют внимания».
 * Датчики (факт. уровень, вода, расхождение книжн/факт, раскрытие строк) — Этап 2.
 */

import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDebounce } from '@/hooks/use-debounce';
import { todayString, daysAgoString } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import { getFuelColor } from '@/utils/fuelColors';

// Импорты из локальных модулей
import { useFuelInventory } from './hooks/useFuelInventory';
import { useShiftChartData } from './hooks/useShiftChartData';
import { FuelInventoryFilters } from './components/FuelInventoryFilters';
import { TankInventoryCard } from './components/TankInventoryCard';
import { FuelBalanceCharts } from './components/FuelBalanceCharts';
import { TankDetailDialog } from './components/TankDetailDialog';
import { useSelectedNetworks } from '@/hooks/useSelectedNetworks';
import type { TankInventory } from '@/services/fuelInventoryService';
import {
  formatNumber,
  filterInventory,
  sortInventory,
  getPeriodDays,
  getDaysToReorder,
  getFillLevel,
  isTankAttention,
  groupByStation,
} from './utils/fuelInventoryHelpers';
import { FuelLegend } from '@/components/common/FuelLegend';
import {
  FILTER_PANEL_CLASS,
  FILTER_PANEL_HEADER_CLASS,
  FILTER_PANEL_TITLE_CLASS,
} from '@/components/common/filterPanel';

// Единая сетка колонок для шапки/строк десктопной таблицы
const GRID_COLS = 'grid grid-cols-[minmax(0,1.9fr)_130px_210px_140px] gap-3 items-center';

export default function FuelInventory() {
  const isMobile = useIsMobile();

  // Сети-кандидаты для резолва станция→точка→датчик в модалке подробностей
  const { selectedNetworks } = useSelectedNetworks();

  // Состояние фильтров
  const [selectedFuel, setSelectedFuel] = useState<string>('all');
  const [attnOnly, setAttnOnly] = useState<boolean>(false);

  // Выбранный резервуар для модалки подробного состояния (Этап 2)
  const [selectedTank, setSelectedTank] = useState<TankInventory | null>(null);

  // Состояние сортировки (по умолчанию - по станции по возрастанию)
  const [sortColumn, setSortColumn] = useState<'station' | 'fuel' | 'volumeBook'>('station');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Свёрнутые станции (по умолчанию пустой Set = все станции РАЗВЁРНУТЫ)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Фильтры дат - по умолчанию последние 7 дней (локальный часовой пояс)
  const [dateFrom, setDateFrom] = useState<string>(() => daysAgoString(7));
  const [dateTo, setDateTo] = useState<string>(() => todayString());

  // Период применяется автоматически с задержкой (без кнопки «Применить»):
  // не грузим на каждую цифру при вводе даты, но и не заставляем жать кнопку.
  const debouncedDateFrom = useDebounce(dateFrom, 600);
  const debouncedDateTo = useDebounce(dateTo, 600);

  // Используем хуки для загрузки данных - загружаем ВСЕ станции (фильтр на клиенте)
  const { loading, inventory, fuelSummaries, error, refresh, loadingProgress } = useFuelInventory(debouncedDateFrom, debouncedDateTo);

  // Хук для графиков (фильтрация по ТТ из глобального селектора в хедере)
  const { chartData, loading: loadingCharts, loaded: chartsLoaded, loadChartData } = useShiftChartData(debouncedDateFrom, debouncedDateTo, 'all');

  // Число дней периода для прогноза «до дозаказа»
  const periodDays = useMemo(() => getPeriodDays(debouncedDateFrom, debouncedDateTo), [debouncedDateFrom, debouncedDateTo]);

  // Обработчик клика на заголовок столбца для сортировки
  const handleSort = (column: 'station' | 'fuel' | 'volumeBook') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Фильтрация и сортировка данных (ТТ фильтруется глобально из хедера)
  const filteredInventory = filterInventory(inventory, selectedFuel, 'all');
  const sortedInventory = sortInventory(filteredInventory, sortColumn, sortDirection);

  // Группировка по станциям (порядок наследуется от отсортированного списка)
  const allGroups = useMemo(
    () => groupByStation(sortedInventory, periodDays),
    [sortedInventory, periodDays]
  );

  // Группы для отображения: при включённом фильтре «Требуют внимания»
  // оставляем только проблемные резервуары и прячем станции без них
  const displayGroups = useMemo(() => {
    if (!attnOnly) return allGroups;
    return allGroups
      .map((g) => ({ ...g, tanks: g.tanks.filter((t) => isTankAttention(t, periodDays)) }))
      .filter((g) => g.tanks.length > 0);
  }, [allGroups, attnOnly, periodDays]);

  // Сводка (KPI) — по всем отфильтрованным резервуарам
  const stats = useMemo(() => {
    let totalBook = 0;
    let totalReceipts = 0;
    let totalSales = 0;
    let critCount = 0;
    let reorderCount = 0;

    for (const tank of sortedInventory) {
      totalBook += tank.volumeBook;
      totalReceipts += tank.volumeReceipts;
      totalSales += tank.volumeSales;

      if (tank.capacity > 0 && tank.fillPercent < 10) critCount += 1;

      const days = getDaysToReorder(tank.volumeBook, tank.volumeSales, tank.shiftCount, periodDays);
      if (days != null && days <= 3) reorderCount += 1;
    }

    return {
      totalBook,
      totalReceipts,
      totalSales,
      critCount,
      reorderCount,
      stationCount: allGroups.length,
      tankCount: sortedInventory.length,
    };
  }, [sortedInventory, allGroups, periodDays]);

  // Управление раскрытием станций
  const anyCollapsed = allGroups.some((g) => collapsed.has(g.key));

  const toggleStation = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (anyCollapsed) {
      setCollapsed(new Set());
    } else {
      setCollapsed(new Set(allGroups.map((g) => g.key)));
    }
  };

  const getSortIcon = (column: 'station' | 'fuel' | 'volumeBook') => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3" />;
    }
    return sortDirection === 'asc' ?
      <ArrowUp className="h-3 w-3" /> :
      <ArrowDown className="h-3 w-3" />;
  };

  // Цвет заливки прогресс-бара по уровню заполнения
  const barColor = (fillPercent: number) => {
    const lv = getFillLevel(fillPercent);
    return lv === 'crit' ? 'bg-red-500' : lv === 'warn' ? 'bg-amber-500' : 'bg-emerald-500';
  };
  const fillTextColor = (fillPercent: number) => {
    const lv = getFillLevel(fillPercent);
    return lv === 'crit' ? 'text-red-500' : lv === 'warn' ? 'text-amber-500' : 'text-emerald-500';
  };

  const isEmpty = displayGroups.length === 0 && !loading;

  return (
    <MainLayout>
      <div className="space-y-6 px-4 md:px-0">
        {/* Заголовок */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <h1 className={`font-headline font-bold text-foreground ${isMobile ? 'text-lg' : 'text-xl'}`}>Остатки топлива</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Книжные остатки по резервуарам на основании сменных отчетов</p>
          </div>
          <div className="flex gap-3 items-center shrink-0">
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading} title="Обновить (свежие данные, минуя кэш)">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Фильтры */}
        <div className="mb-4">
          <div className={FILTER_PANEL_CLASS}>
            <div className={FILTER_PANEL_HEADER_CLASS}>
              <div className={FILTER_PANEL_TITLE_CLASS}>
                <span className="font-medium text-foreground">Фильтры</span>
              </div>
            </div>
            <div>
              <FuelInventoryFilters
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
              />
            </div>
          </div>
        </div>

        {/* Индикатор прогресса загрузки смен - показываем только при активной загрузке */}
        {loading && loadingProgress.total > 0 && (
          <Card className="bg-primary/10 dark:bg-blue-900/20 border-primary/30 dark:border-blue-700">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <RefreshCw className="w-5 h-5 text-primary dark:text-primary/70 animate-spin" />
                <div className="flex-1">
                  <p className="text-primary dark:text-primary/70 font-medium mb-2">
                    Загрузка сменных отчетов: {loadingProgress.loaded} / {loadingProgress.total}
                  </p>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${(loadingProgress.loaded / loadingProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-primary dark:text-primary/70 font-mono text-sm">
                  {Math.round((loadingProgress.loaded / loadingProgress.total) * 100)}%
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Сообщение об ошибке */}
        {error && (
          <Card className="bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700">
            <CardContent className="py-4">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Сводка (KPI) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Всего топлива */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
            <span className="absolute inset-y-0 left-0 w-1 bg-primary" />
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Всего топлива</div>
            <div className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">{formatNumber(stats.totalBook)}</div>
            <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              литров · {stats.stationCount} ст. · {stats.tankCount} рез.
            </div>
          </div>

          {/* Критический уровень */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
            <span className="absolute inset-y-0 left-0 w-1 bg-red-500" />
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Критический уровень</div>
            <div className={cn('mt-1.5 text-2xl font-bold tabular-nums', stats.critCount > 0 ? 'text-red-500' : 'text-foreground')}>
              {stats.critCount}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">резервуаров ниже 10%</div>
          </div>

          {/* Требуют дозаказа */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
            <span className="absolute inset-y-0 left-0 w-1 bg-amber-500" />
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Требуют дозаказа</div>
            <div className={cn('mt-1.5 text-2xl font-bold tabular-nums', stats.reorderCount > 0 ? 'text-amber-500' : 'text-foreground')}>
              {stats.reorderCount}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">опустеют за ≤ 3 дня</div>
          </div>

          {/* Поступления за период */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
            <span className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Поступления за период</div>
            <div className="mt-1.5 text-2xl font-bold tabular-nums text-emerald-500">{formatNumber(stats.totalReceipts)}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">литров за период</div>
          </div>

          {/* Реализация за период */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
            <span className="absolute inset-y-0 left-0 w-1 bg-primary" />
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Реализация за период</div>
            <div className="mt-1.5 text-2xl font-bold tabular-nums text-primary">{formatNumber(stats.totalSales)}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">литров за период</div>
          </div>
        </div>

        {/* Графики динамики остатков по сменам */}
        <FuelBalanceCharts
          chartData={chartData}
          loading={loadingCharts}
          loaded={chartsLoaded}
          onLoad={loadChartData}
        />

        {/* Остатки по станциям / резервуарам */}
        <div className="bg-di-surface-mid rounded-xl border border-transparent p-4">
          <div className={`flex ${isMobile ? 'flex-col gap-3' : 'flex-row justify-between items-center'} mb-4`}>
            <h2 className="font-headline font-bold text-foreground text-lg">Остатки по резервуарам</h2>
            <div className="flex flex-wrap items-center gap-2">
              <FuelLegend />

              {/* Фильтр «Требуют внимания» */}
              <button
                type="button"
                onClick={() => setAttnOnly((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  attnOnly
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', attnOnly ? 'bg-primary' : 'bg-amber-500')} />
                Требуют внимания
              </button>

              {/* Развернуть / свернуть всё */}
              <button
                type="button"
                onClick={toggleExpandAll}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                {anyCollapsed ? 'Развернуть всё' : 'Свернуть всё'}
              </button>

              {/* Фильтр по виду топлива */}
              <Select value={selectedFuel} onValueChange={setSelectedFuel}>
                <SelectTrigger className={`${isMobile ? 'w-full' : 'w-[180px]'} bg-background`}>
                  <SelectValue placeholder="Все виды топлива" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все виды</SelectItem>
                  {fuelSummaries.map(summary => (
                    <SelectItem key={summary.fuelCode} value={summary.fuelCode.toString()}>
                      {summary.fuelName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isMobile ? (
            /* Мобильный вид - карточки */
            <div className="space-y-3">
              {isEmpty ? (
                <div className="text-center py-8 text-muted-foreground">
                  {attnOnly ? 'Нет резервуаров, требующих внимания' : 'Нет данных для отображения'}
                </div>
              ) : (
                displayGroups.map((group) => (
                  <div key={group.key} className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-foreground truncate">{group.stationName}</span>
                        {group.alertCount > 0 && (
                          <span className="shrink-0 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-bold text-amber-500 tabular-nums">
                            {group.alertCount} ⚠
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {formatNumber(group.totalBook)} л
                      </span>
                    </div>
                    {group.tanks.map((tank) => (
                      <div
                        key={`${tank.station}-${tank.tankNumber}-${tank.fuelCode}`}
                        onClick={() => setSelectedTank(tank)}
                        className="cursor-pointer"
                      >
                        <TankInventoryCard tank={tank} />
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Десктопный вид - группы по станциям */
            <div>
              {/* Шапка столбцов */}
              <div className={cn(GRID_COLS, 'px-4 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground')}>
                <button
                  onClick={() => handleSort('station')}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Станция / резервуар
                  {getSortIcon('station')}
                </button>
                <button
                  onClick={() => handleSort('volumeBook')}
                  className="flex items-center gap-1 justify-end hover:text-foreground transition-colors"
                >
                  Книжный остаток
                  {getSortIcon('volumeBook')}
                </button>
                <span>Заполнение</span>
                <span className="text-right">До дозаказа</span>
              </div>

              {isEmpty ? (
                <div className="text-center py-8 text-muted-foreground">
                  {attnOnly ? 'Нет резервуаров, требующих внимания' : 'Нет данных для отображения'}
                </div>
              ) : (
                displayGroups.map((group) => {
                  const isStationCollapsed = collapsed.has(group.key);

                  // Агрегаты станции для свёрнутого вида
                  const capTanks = group.tanks.filter((t) => t.capacity > 0);
                  const capSum = capTanks.reduce((s, t) => s + t.capacity, 0);
                  const stFill = capSum > 0 ? (capTanks.reduce((s, t) => s + t.volumeBook, 0) / capSum) * 100 : null;
                  const daysArr = group.tanks
                    .map((t) => getDaysToReorder(t.volumeBook, t.volumeSales, t.shiftCount, periodDays))
                    .filter((d): d is number => d != null);
                  const minDays = daysArr.length ? Math.min(...daysArr) : null;
                  // Состав по видам топлива (для полоски-стека)
                  const mix = new Map<string, { vol: number; bg: string }>();
                  group.tanks.forEach((t) => {
                    const cur = mix.get(t.fuelName) || { vol: 0, bg: getFuelColor(t.fuelName).bg };
                    cur.vol += t.volumeBook;
                    mix.set(t.fuelName, cur);
                  });
                  const mixArr = Array.from(mix.entries()).map(([name, v]) => ({ name, ...v }));

                  return (
                    <div key={group.key} className="mb-2.5 overflow-hidden rounded-xl border border-border bg-card">
                      {/* Шапка станции */}
                      <button
                        type="button"
                        onClick={() => toggleStation(group.key)}
                        className={cn(GRID_COLS, 'w-full px-4 py-3 text-left bg-di-surface-high hover:bg-di-surface-high/70 transition-colors items-center')}
                      >
                        <div className="flex flex-col gap-1.5 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <ChevronDown
                              className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', isStationCollapsed && '-rotate-90')}
                            />
                            <span className="font-bold text-foreground truncate">{group.stationName}</span>
                            <span className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground tabular-nums">
                              {group.tanks.length} рез.
                            </span>
                            {group.alertCount > 0 && (
                              <span className="shrink-0 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-bold text-amber-500 tabular-nums">
                                {group.alertCount} ⚠
                              </span>
                            )}
                          </div>
                          {/* Состав по видам топлива */}
                          <div className="flex items-center gap-2 pl-6">
                            <div className="flex h-1.5 w-40 overflow-hidden rounded-full bg-secondary">
                              {mixArr.map((m) => (
                                <div
                                  key={m.name}
                                  className={cn('h-full', m.bg)}
                                  style={{ width: `${group.totalBook > 0 ? (m.vol / group.totalBook) * 100 : 0}%` }}
                                  title={`${m.name}: ${formatNumber(m.vol)} л`}
                                />
                              ))}
                            </div>
                            <span className="text-[11px] text-muted-foreground truncate">
                              {mixArr.map((m) => m.name).join(' · ')}
                            </span>
                          </div>
                        </div>
                        <span className="text-right font-bold tabular-nums text-foreground">{formatNumber(group.totalBook)} л</span>
                        {/* Средневзвешенное заполнение станции */}
                        <div>
                          {stFill != null ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className={cn('font-semibold tabular-nums', fillTextColor(stFill))}>{Math.round(stFill)}%</span>
                                <span className="text-muted-foreground text-[11px]">в среднем</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                                <div className={cn('h-full rounded-full', barColor(stFill))} style={{ width: `${Math.min(stFill, 100)}%` }} />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">ёмкость не задана</span>
                          )}
                        </div>
                        {/* Ближайший дозаказ по станции */}
                        <div className="text-right">
                          {minDays != null ? (
                            <div className="flex flex-col items-end">
                              <span className={cn('font-bold tabular-nums', minDays <= 3 ? 'text-red-500' : minDays <= 6 ? 'text-amber-500' : 'text-foreground')}>
                                {minDays} <span className="text-xs font-normal text-muted-foreground">дн.</span>
                              </span>
                              <span className="text-[11px] text-muted-foreground">ближайший</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </button>

                      {/* Строки резервуаров */}
                      {!isStationCollapsed && (
                        <div>
                          {group.tanks.map((tank) => {
                            const fuel = getFuelColor(tank.fuelName);
                            const hasCapacity = tank.capacity > 0;
                            const days = getDaysToReorder(tank.volumeBook, tank.volumeSales, tank.shiftCount, periodDays);
                            return (
                              <div
                                key={`${tank.station}-${tank.tankNumber}-${tank.fuelCode}`}
                                onClick={() => setSelectedTank(tank)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setSelectedTank(tank);
                                  }
                                }}
                                title="Подробное состояние резервуара"
                                className={cn(GRID_COLS, 'cursor-pointer border-t border-border px-4 py-2.5 hover:bg-di-surface-low/60 transition-colors')}
                              >
                                {/* Резервуар */}
                                <div className="flex items-center gap-2 min-w-0 pl-6">
                                  <span className={cn('inline-flex items-center justify-center min-w-8 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase text-white shrink-0', fuel.bg)}>
                                    {fuel.label}
                                  </span>
                                  <span className="font-semibold text-foreground">Р{tank.tankNumber}</span>
                                  <span className="text-xs text-muted-foreground truncate">{tank.fuelName}</span>
                                </div>

                                {/* Книжный остаток */}
                                <span className="text-right font-semibold tabular-nums text-foreground">
                                  {formatNumber(tank.volumeBook)}
                                  <span className="text-muted-foreground font-normal"> л</span>
                                </span>

                                {/* Заполнение */}
                                <div>
                                  {hasCapacity ? (
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className={cn('font-semibold tabular-nums', fillTextColor(tank.fillPercent))}>
                                          {Math.round(tank.fillPercent)}%
                                        </span>
                                        <span className="text-muted-foreground tabular-nums">{formatNumber(tank.capacity)} л</span>
                                      </div>
                                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                                        <div
                                          className={cn('h-full rounded-full', barColor(tank.fillPercent))}
                                          style={{ width: `${Math.max(0, Math.min(100, tank.fillPercent))}%` }}
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground" title="Ёмкость резервуара не настроена в STS">
                                      ёмкость не задана
                                    </span>
                                  )}
                                </div>

                                {/* До дозаказа */}
                                <div className="text-right">
                                  {days == null ? (
                                    <span className="text-muted-foreground">—</span>
                                  ) : (
                                    <span
                                      className={cn(
                                        'font-semibold tabular-nums',
                                        days <= 3 ? 'text-red-500' : days <= 6 ? 'text-amber-500' : 'text-foreground'
                                      )}
                                    >
                                      {days} <span className="text-xs font-normal text-muted-foreground">дн.</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Модалка подробного состояния резервуара (книжн. ↔ факт по датчику) */}
        <TankDetailDialog
          open={!!selectedTank}
          onOpenChange={(v) => !v && setSelectedTank(null)}
          tank={selectedTank}
          networks={selectedNetworks}
        />

      </div>
    </MainLayout>
  );
}
