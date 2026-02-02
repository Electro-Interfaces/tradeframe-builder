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

export default function FuelInventory() {
  const { selectedNetwork } = useSelection();
  const isMobile = useIsMobile();

  // Состояние фильтров
  const [selectedFuel, setSelectedFuel] = useState<string>('all');

  // Состояние сортировки (по умолчанию - по ТТ по возрастанию)
  const [sortColumn, setSortColumn] = useState<'station' | 'fuel' | 'volumeBook'>('station');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Фильтры дат - по умолчанию последние 7 дней (оптимально для производительности)
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Используем хуки для загрузки данных - загружаем ВСЕ станции (фильтр на клиенте)
  const { loading, inventory, fuelSummaries, error, loadInventory, loadingProgress } = useFuelInventory(dateFrom, dateTo);

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
    if (fillPercent >= 20) return 'bg-emerald-500';  // >= 20% - зеленый (норма)
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
      <div className="space-y-6">
        {/* Заголовок */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-100">Остатки</h1>
              <p className="text-slate-400 mt-1">
                Книжные остатки по всем резервуарам на основании данных сменных отчетов
              </p>
            </div>
          </div>

          {/* Фильтры */}
          <FuelInventoryFilters
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onApply={loadInventory}
            loading={loading}
          />
        </div>

        {/* Индикатор прогресса загрузки смен - показываем только при активной загрузке */}
        {loading && loadingProgress.total > 0 && (
          <Card className="bg-blue-900/20 border-blue-700">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
                <div className="flex-1">
                  <p className="text-blue-400 font-medium mb-2">
                    Загрузка сменных отчетов: {loadingProgress.loaded} / {loadingProgress.total}
                  </p>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${(loadingProgress.loaded / loadingProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-blue-400 font-mono text-sm">
                  {Math.round((loadingProgress.loaded / loadingProgress.total) * 100)}%
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Сообщение об ошибке */}
        {error && (
          <Card className="bg-red-900/20 border-red-700">
            <CardContent className="py-4">
              <p className="text-red-400">{error}</p>
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
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className={`flex ${isMobile ? 'flex-col gap-3' : 'flex-row justify-between items-center'}`}>
              <CardTitle className="text-white">Остатки по резервуарам</CardTitle>
              {/* Фильтр по виду топлива */}
              <Select value={selectedFuel} onValueChange={setSelectedFuel}>
                <SelectTrigger className={`${isMobile ? 'w-full' : 'w-[200px]'} bg-slate-900`}>
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
          </CardHeader>
          <CardContent>
            {isMobile ? (
              /* Мобильный вид - карточки */
              <div className="space-y-3">
                {sortedInventory.length === 0 && !loading ? (
                  <div className="text-center py-8 text-slate-400">
                    Нет данных для отображения
                  </div>
                ) : (
                  sortedInventory.map((tank, idx) => (
                    <TankInventoryCard key={idx} tank={tank} />
                  ))
                )}

                {/* Итоговая карточка для мобильных */}
                {totals && (
                  <Card className="bg-slate-900/70 border-slate-600 border-2">
                    <CardContent className="p-4 space-y-2">
                      <div className="text-sm font-semibold text-white mb-3">
                        ИТОГО ({totals.tankCount} {totals.tankCount === 1 ? 'резервуар' : totals.tankCount < 5 ? 'резервуара' : 'резервуаров'})
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-800 rounded p-2">
                          <div className="text-[10px] text-slate-400 mb-0.5">Начальный</div>
                          <div className="text-sm font-mono text-slate-300 font-semibold">
                            {formatNumber(totals.volumeBegin)} л
                          </div>
                        </div>
                        <div className="bg-slate-800 rounded p-2">
                          <div className="text-[10px] text-slate-400 mb-0.5">Книжный</div>
                          <div className="text-sm font-mono text-white font-bold">
                            {formatNumber(totals.volumeBook)} л
                          </div>
                        </div>
                        <div className="bg-emerald-900/20 rounded p-2 border border-green-700/30">
                          <div className="text-[10px] text-green-400 mb-0.5">Поступления</div>
                          <div className="text-sm font-mono text-green-400 font-semibold">
                            +{formatNumber(totals.volumeReceipts)} л
                          </div>
                        </div>
                        <div className="bg-blue-900/20 rounded p-2 border border-blue-700/30">
                          <div className="text-[10px] text-blue-400 mb-0.5">Реализация</div>
                          <div className="text-sm font-mono text-blue-400 font-semibold">
                            -{formatNumber(totals.volumeSales)} л
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 text-right mt-2">
                        Заполнение: {((totals.volumeBook / totals.capacity) * 100).toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              /* Десктопный вид - таблица */
              <div className="rounded-md border border-slate-700">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-slate-800/50 border-slate-700">
                      <TableHead className="text-slate-300">
                        <button
                          onClick={() => handleSort('station')}
                          className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                          ТТ
                          {getSortIcon('station')}
                        </button>
                      </TableHead>
                      <TableHead className="text-slate-300">Резервуар</TableHead>
                      <TableHead className="text-slate-300">
                        <button
                          onClick={() => handleSort('fuel')}
                          className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                          Топливо
                          {getSortIcon('fuel')}
                        </button>
                      </TableHead>
                      <TableHead className="text-center text-slate-300">ТТН</TableHead>
                      <TableHead className="text-center text-slate-300">Смены</TableHead>
                      <TableHead className="text-right text-slate-300">Нач. остаток</TableHead>
                      <TableHead className="text-right text-slate-300">Поступления</TableHead>
                      <TableHead className="text-right text-slate-300">Реализация</TableHead>
                      <TableHead className="text-right text-slate-300">
                        <button
                          onClick={() => handleSort('volumeBook')}
                          className="flex items-center gap-1 hover:text-white transition-colors ml-auto"
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
                      <TableRow className="bg-slate-800/70 border-b-2 border-slate-600 hover:bg-slate-800">
                        <TableCell colSpan={3} className="text-slate-100 font-semibold">
                          ИТОГО ({totals.tankCount} резерв.)
                        </TableCell>
                        <TableCell className="text-center font-mono text-blue-400 font-semibold">
                          {totals.receiptCount}
                        </TableCell>
                        <TableCell className="text-center font-mono text-purple-400 font-semibold">
                          {totals.shiftCount}
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-300 font-semibold">
                          {formatNumber(totals.volumeBegin)} л
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-400 font-semibold">
                          +{formatNumber(totals.volumeReceipts)} л
                        </TableCell>
                        <TableCell className="text-right font-mono text-blue-400 font-semibold">
                          -{formatNumber(totals.volumeSales)} л
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <div className="font-mono text-slate-100 font-bold">
                              {formatNumber(totals.volumeBook)} л
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-xs text-slate-400 font-semibold">
                                {((totals.volumeBook / totals.capacity) * 100).toFixed(1)}%
                              </span>
                              <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${getProgressColor((totals.volumeBook / totals.capacity) * 100)}`}
                                  style={{ width: `${(totals.volumeBook / totals.capacity) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}

                    {sortedInventory.map((tank, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-700/30 border-slate-700">
                        <TableCell className="text-slate-100">
                          {tank.stationName || `АЗС ${tank.station}`}
                        </TableCell>
                        <TableCell className="text-slate-100">Р{tank.tankNumber}</TableCell>
                        <TableCell>
                          <span className="text-slate-100">{tank.fuelName}</span>
                        </TableCell>
                        <TableCell className="text-center font-mono text-blue-400">
                          {tank.receiptCount || 0}
                        </TableCell>
                        <TableCell className="text-center font-mono text-purple-400">
                          {tank.shiftCount || 0}
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-400">
                          {formatNumber(tank.volumeBegin)} л
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-400">
                          +{formatNumber(tank.volumeReceipts)} л
                        </TableCell>
                        <TableCell className="text-right font-mono text-blue-400">
                          -{formatNumber(tank.volumeSales)} л
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <div className="font-mono text-slate-100 font-semibold">
                              {formatNumber(tank.volumeBook)} л
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-xs text-slate-400">{tank.fillPercent.toFixed(1)}%</span>
                              <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${getProgressColor(tank.fillPercent)}`}
                                  style={{ width: `${tank.fillPercent}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {sortedInventory.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                          Нет данных для отображения
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </MainLayout>
  );
}
