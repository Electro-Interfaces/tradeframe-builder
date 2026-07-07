/**
 * Страница "Остатки топлива" (рефакторинг v1.7.1)
 * Показывает текущие остатки по всем резервуарам сети с аналитикой и динамикой
 * Модульная архитектура с разделением на components, hooks, utils
 */

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ArrowUpDown, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSelection } from '@/contexts/SelectionContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { todayString, daysAgoString } from '@/utils/dateUtils';

// Импорты из локальных модулей
import { useFuelInventory } from './hooks/useFuelInventory';
import { useShiftChartData } from './hooks/useShiftChartData';
import { FuelInventoryFilters } from './components/FuelInventoryFilters';
import { TankInventoryCard } from './components/TankInventoryCard';
import { FuelBalanceCharts } from './components/FuelBalanceCharts';
import {
  formatNumber,
  filterInventory,
  sortInventory,
  calculateTotals
} from './utils/fuelInventoryHelpers';
import { getFuelColor } from '@/types/shift-dashboard';
import { FuelBadge } from '@/components/common/FuelBadge';
import { FuelLegend } from '@/components/common/FuelLegend';
import {
  FILTER_PANEL_CLASS,
  FILTER_PANEL_HEADER_CLASS,
  FILTER_PANEL_TITLE_CLASS,
} from '@/components/common/filterPanel';

export default function FuelInventory() {
  const { selectedNetwork } = useSelection();
  const isMobile = useIsMobile();

  // Состояние фильтров
  const [selectedFuel, setSelectedFuel] = useState<string>('all');

  // Состояние сортировки (по умолчанию - по ТТ по возрастанию)
  const [sortColumn, setSortColumn] = useState<'station' | 'fuel' | 'volumeBook'>('station');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Фильтры дат - по умолчанию последние 7 дней (локальный часовой пояс)
  const [dateFrom, setDateFrom] = useState<string>(() => daysAgoString(7));
  const [dateTo, setDateTo] = useState<string>(() => todayString());

  // Используем хуки для загрузки данных - загружаем ВСЕ станции (фильтр на клиенте)
  const { loading, inventory, fuelSummaries, error, loadInventory, refresh, loadingProgress } = useFuelInventory(dateFrom, dateTo);

  // Хук для графиков (фильтрация по ТТ из глобального селектора в хедере)
  const { chartData, loading: loadingCharts, loaded: chartsLoaded, loadChartData } = useShiftChartData(dateFrom, dateTo, 'all');

  // Обработчик клика на заголовок столбца для сортировки
  const handleSort = (column: 'station' | 'fuel' | 'volumeBook') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Фильтрация и сортировка данных
  // Фильтруем только по виду топлива (ТТ фильтруется глобально из хедера)
  const filteredInventory = filterInventory(inventory, selectedFuel, 'all');
  const sortedInventory = sortInventory(filteredInventory, sortColumn, sortDirection);

  // Расчет суммарных значений для всех отфильтрованных данных
  const totals = calculateTotals(sortedInventory);

  // Вспомогательные функции
  // Цветовая индикация по уровню заполнения резервуара
  const getProgressColor = (fillPercent: number) => {
    if (fillPercent >= 20) return 'bg-emerald-600';  // >= 20% - зеленый (норма)
    if (fillPercent >= 10) return 'bg-yellow-500'; // 10-20% - желтый (внимание)
    return 'bg-red-500';                            // < 10% - красный (критический)
  };

  const getSortIcon = (column: 'station' | 'fuel' | 'volumeBook') => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3" />;
    }
    return sortDirection === 'asc' ?
      <ArrowUp className="h-3 w-3" /> :
      <ArrowDown className="h-3 w-3" />;
  };

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
                onApply={loadInventory}
                loading={loading}
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

        {/* Графики динамики остатков по сменам */}
        <FuelBalanceCharts
          chartData={chartData}
          loading={loadingCharts}
          loaded={chartsLoaded}
          onLoad={loadChartData}
        />

        {/* Таблица/Карточки остатков */}
        <div className="bg-di-surface-mid rounded-xl border border-transparent p-4">
          <div className={`flex ${isMobile ? 'flex-col gap-3' : 'flex-row justify-between items-center'} mb-4`}>
            <h2 className="font-headline font-bold text-foreground text-lg">Остатки по резервуарам</h2>
              <div className="flex items-center gap-2">
                <FuelLegend />
               {/* Фильтр по виду топлива */}
               <Select value={selectedFuel} onValueChange={setSelectedFuel}>
                <SelectTrigger className={`${isMobile ? 'w-full' : 'w-[200px]'} bg-background`}>
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
                {sortedInventory.length === 0 && !loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Нет данных для отображения
                  </div>
                ) : (
                  sortedInventory.map((tank, idx) => (
                    <TankInventoryCard key={idx} tank={tank} />
                  ))
                )}

                {/* Итоговая карточка для мобильных */}
                {totals && (
                  <Card className="bg-background/70 border-border border-2">
                    <CardContent className="p-4 space-y-2">
                      <div className="text-sm font-semibold text-foreground mb-3">
                        ИТОГО ({totals.tankCount} {totals.tankCount === 1 ? 'резервуар' : totals.tankCount < 5 ? 'резервуара' : 'резервуаров'})
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-card rounded p-2">
                          <div className="text-[10px] text-muted-foreground mb-0.5">Начальный</div>
                          <div className="text-sm font-mono text-foreground/80 font-semibold">
                            {formatNumber(totals.volumeBegin)} л
                          </div>
                        </div>
                        <div className="bg-card rounded p-2">
                          <div className="text-[10px] text-muted-foreground mb-0.5">Книжный</div>
                          <div className="text-sm font-mono text-foreground font-bold">
                            {formatNumber(totals.volumeBook)} л
                          </div>
                        </div>
                        <div className="bg-emerald-100 dark:bg-emerald-900/20 rounded p-2 border border-green-300 dark:border-green-700/30">
                          <div className="text-[10px] text-green-600 dark:text-green-400 mb-0.5">Поступления</div>
                          <div className="text-sm font-mono text-green-600 dark:text-green-400 font-semibold">
                            +{formatNumber(totals.volumeReceipts)} л
                          </div>
                        </div>
                        <div className="bg-primary/10 dark:bg-blue-900/20 rounded p-2 border border-primary/30 dark:border-blue-700/30">
                          <div className="text-[10px] text-primary dark:text-primary/70 mb-0.5">Реализация</div>
                          <div className="text-sm font-mono text-primary dark:text-primary/70 font-semibold">
                            -{formatNumber(totals.volumeSales)} л
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground text-right mt-2">
                        Заполнение: {totals.capacity > 0 ? `${((totals.volumeBook / totals.capacity) * 100).toFixed(1)}%` : '—'}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              /* Десктопный вид - таблица */
              <div>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <button
                          onClick={() => handleSort('station')}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          ТТ
                          {getSortIcon('station')}
                        </button>
                      </TableHead>
                      <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Резервуар</TableHead>
                      <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <button
                          onClick={() => handleSort('fuel')}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          Топливо
                          {getSortIcon('fuel')}
                        </button>
                      </TableHead>
                      <TableHead className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">ТТН</TableHead>
                      <TableHead className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Смены</TableHead>
                      <TableHead className="text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Нач. остаток</TableHead>
                      <TableHead className="text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Поступления</TableHead>
                      <TableHead className="text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Реализация</TableHead>
                      <TableHead className="text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <button
                          onClick={() => handleSort('volumeBook')}
                          className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                        >
                          Книжный остаток
                          {getSortIcon('volumeBook')}
                        </button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Итоговая строка ПЕРВОЙ */}
                    {totals && sortedInventory.length > 0 && (
                      <TableRow className="bg-di-surface-high/50 hover:bg-di-surface-high transition-colors [&>td:first-child]:rounded-l-xl [&>td:last-child]:rounded-r-xl">
                        <TableCell colSpan={3} className="text-foreground font-semibold">
                          ИТОГО ({totals.tankCount} резерв.)
                        </TableCell>
                        <TableCell className="text-center font-mono text-primary dark:text-primary/70 font-semibold">
                          {totals.receiptCount}
                        </TableCell>
                        <TableCell className="text-center font-mono text-purple-600 dark:text-purple-400 font-semibold">
                          {totals.shiftCount}
                        </TableCell>
                        <TableCell className="text-right font-mono text-foreground/80 font-semibold">
                          {formatNumber(totals.volumeBegin)} л
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600 dark:text-green-400 font-semibold">
                          +{formatNumber(totals.volumeReceipts)} л
                        </TableCell>
                        <TableCell className="text-right font-mono text-primary dark:text-primary/70 font-semibold">
                          -{formatNumber(totals.volumeSales)} л
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <div className="font-mono text-foreground font-bold">
                              {formatNumber(totals.volumeBook)} л
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                              {totals.capacity > 0 ? (
                                <>
                                  <span className="text-xs text-muted-foreground font-semibold">
                                    {((totals.volumeBook / totals.capacity) * 100).toFixed(1)}%
                                  </span>
                                  <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${getProgressColor((totals.volumeBook / totals.capacity) * 100)}`}
                                      style={{ width: `${Math.max(0, Math.min(100, (totals.volumeBook / totals.capacity) * 100))}%` }}
                                    ></div>
                                  </div>
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground" title="Ёмкость резервуаров не настроена в STS">—</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}

                    {sortedInventory.map((tank, idx) => (
                      <TableRow key={idx} className="bg-di-surface-low hover:bg-di-surface-high transition-colors group [&>td:first-child]:rounded-l-xl [&>td:last-child]:rounded-r-xl">
                        <TableCell className="text-foreground">
                          {tank.stationName || `АЗС ${tank.station}`}
                        </TableCell>
                        <TableCell className="text-foreground">Р{tank.tankNumber}</TableCell>
                        <TableCell>
                          <FuelBadge fuel={tank.fuelName} />
                        </TableCell>
                        <TableCell className="text-center font-mono text-primary dark:text-primary/70">
                          {tank.receiptCount || 0}
                        </TableCell>
                        <TableCell className="text-center font-mono text-purple-600 dark:text-purple-400">
                          {tank.shiftCount || 0}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {formatNumber(tank.volumeBegin)} л
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600 dark:text-green-400">
                          +{formatNumber(tank.volumeReceipts)} л
                        </TableCell>
                        <TableCell className="text-right font-mono text-primary dark:text-primary/70">
                          -{formatNumber(tank.volumeSales)} л
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <div className="font-mono text-foreground font-semibold">
                              {formatNumber(tank.volumeBook)} л
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                              {tank.capacity > 0 ? (
                                <>
                                  <span className="text-xs text-muted-foreground">{tank.fillPercent.toFixed(1)}%</span>
                                  <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${getProgressColor(tank.fillPercent)}`}
                                      style={{ width: `${Math.max(0, Math.min(100, tank.fillPercent))}%` }}
                                    ></div>
                                  </div>
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground" title="Ёмкость резервуара не настроена в STS — процент заполнения недоступен">
                                  ёмкость не задана
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {sortedInventory.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          Нет данных для отображения
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
        </div>

      </div>
    </MainLayout>
  );
}
