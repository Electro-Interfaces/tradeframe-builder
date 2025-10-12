/**
 * Страница "Поступления топлива"
 * Отображает информацию по поступлениям в резервуары
 */

import { useState, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useReceipts } from '@/hooks/useReceipts';
import { useSelection } from '@/contexts/SelectionContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { networksService } from '@/services/networksService';
import { tradingPointsService } from '@/services/tradingPointsService';
import {
  flattenReceipts,
  getFilterOptions,
} from '@/services/receiptsService';
import { exportReceiptsToExcel } from '@/services/receiptsExportService';
import type { ReceiptsQueryParams, FlatReceipt } from '@/types/receipts';
import type { Network } from '@/types/network';
import type { TradingPoint } from '@/types/tradingPoint';
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
import { AlertCircle, Filter, Download, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
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
  const { selectedNetwork } = useSelection();
  const isMobile = useIsMobile();

  // Состояние фильтров
  const [systemId, setSystemId] = useState<number | null>(null);
  const [stationIds, setStationIds] = useState<number[]>([]);
  const [selectedKpiFuels, setSelectedKpiFuels] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>(() => {
    // Устанавливаем текущую дату как дефолт для "дата до"
    const today = new Date();
    return today.toISOString().split('T')[0]; // Формат YYYY-MM-DD
  });
  const [shiftNumber, setShiftNumber] = useState<string>('');
  const [baseId, setBaseId] = useState<string>('');
  const [ttnNumber, setTtnNumber] = useState<string>('');
  const [debouncedTtn, setDebouncedTtn] = useState<string>('');

  const [filtersOpen, setFiltersOpen] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<FlatReceipt | null>(null);

  // Загрузка списка сетей
  const [networks, setNetworks] = useState<Network[]>([]);

  // Загрузка сетей
  useEffect(() => {
    networksService.getAll().then(setNetworks).catch(() => {});
  }, []);

  // Устанавливаем системный ID из контекста при загрузке
  useEffect(() => {
    if (selectedNetwork?.external_id) {
      setSystemId(parseInt(selectedNetwork.external_id));
    }
  }, [selectedNetwork]);

  // Параметры запроса к API
  const queryParams: ReceiptsQueryParams = useMemo(() => {
    const params: ReceiptsQueryParams = {
      system: systemId || 0
    };

    if (dateFrom) params.dt_beg = dateFrom;
    if (dateTo) params.dt_end = dateTo;

    return params;
  }, [systemId, dateFrom, dateTo]);

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

  // Базовая фильтрация БЕЗ фильтра по видам топлива (для карточек)
  const baseFilteredReceipts = useMemo(() => {
    let filtered = flatReceipts;

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
  }, [flatReceipts, stationIds, shiftNumber, baseId, debouncedTtn, dateFrom, dateTo]);

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
    // Возвращаем текущую дату в "дата до"
    const today = new Date();
    setDateTo(today.toISOString().split('T')[0]);
    setShiftNumber('');
    setBaseId('');
    setTtnNumber('');
  };

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
            <h1 className="text-2xl font-semibold text-white">Поступления топлива</h1>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 md:p-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Выберите торговую сеть для просмотра поступлений
              </AlertDescription>
            </Alert>
            <Card className="p-6 mt-6 bg-slate-700 border-slate-600">
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
        className={`w-full h-full px-4 md:px-6 lg:px-8 relative ${isMobile ? 'overflow-y-auto' : ''}`}
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
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-full p-3 shadow-lg border border-slate-700">
              {pullState === 'refreshing' ? (
                <RefreshCw className="h-5 w-5 text-blue-400 animate-spin" />
              ) : pullDistance >= PULL_THRESHOLD ? (
                <RefreshCw className="h-5 w-5 text-green-400" />
              ) : (
                <RefreshCw className="h-5 w-5 text-slate-400" />
              )}
            </div>
          </div>
        )}
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-white">Поступления топлива</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filteredReceipts.length === 0}
              className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Экспорт
            </Button>
          </div>
        </div>

        {/* Панель фильтров */}
        <div className="mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <span className="font-medium text-white">Фильтры</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFilters();
                      }}
                    >
                      Очистить фильтры
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        refetch();
                      }}
                      disabled={isLoading}
                      className="border-slate-600 text-white hover:bg-slate-700"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                    {filtersOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 border-t border-slate-700">
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {/* Дата от */}
                    <div>
                      <Label htmlFor="date-from" className="text-xs text-slate-400">Дата от</Label>
                      <Input
                        id="date-from"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="mt-1 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      />
                    </div>

                    {/* Дата до */}
                    <div>
                      <Label htmlFor="date-to" className="text-xs text-slate-400">Дата до</Label>
                      <Input
                        id="date-to"
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="mt-1 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      />
                    </div>

                    {/* Номер ТТН */}
                    <div>
                      <Label htmlFor="ttn" className="text-xs text-slate-400">Номер ТТН</Label>
                      <Input
                        id="ttn"
                        type="text"
                        placeholder="Введите номер"
                        value={ttnNumber}
                        onChange={(e) => setTtnNumber(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    {/* Нефтебаза */}
                    <div>
                      <Label htmlFor="base" className="text-xs text-slate-400">Нефтебаза</Label>
                      <Select value={baseId || undefined} onValueChange={setBaseId}>
                        <SelectTrigger id="base" className="mt-1">
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
                      <Label htmlFor="shift-number" className="text-xs text-slate-400">Номер смены</Label>
                      <Input
                        id="shift-number"
                        type="number"
                        placeholder="Введите номер"
                        value={shiftNumber}
                        onChange={(e) => setShiftNumber(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </div>

        {/* Карточки видов топлива */}
        {flatReceipts.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-between items-center px-2 mb-2">
              <h3 className={`text-slate-300 font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>Виды топлива</h3>
              {selectedKpiFuels.size > 0 && (
                <span className="text-xs text-slate-400">
                  {selectedKpiFuels.size} {selectedKpiFuels.size === 1 ? 'выбран' : 'выбрано'}
                </span>
              )}
            </div>
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
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

        {/* Таблица */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 md:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">
              Журнал поступлений
              <span className="text-slate-400 ml-2 font-normal text-sm">
                ({filteredReceipts.length})
              </span>
            </h2>
          </div>

          <Card className="bg-slate-900 border-slate-700">
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
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-slate-400">Дата и время</TableHead>
                <TableHead className="text-slate-400">ТТ</TableHead>
                <TableHead className="text-slate-400">Смена</TableHead>
                <TableHead className="text-slate-400">ТТН</TableHead>
                <TableHead className="text-slate-400">Топливо</TableHead>
                <TableHead className="text-right text-slate-400">Объем (л)</TableHead>
                <TableHead className="text-right text-slate-400">Масса (кг)</TableHead>
                <TableHead className="text-right text-slate-400">Отклонение (кг)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceipts.map((receipt, index) => {
                const receiptId = `${receipt.stationNumber}-${receipt.shiftNumber}-${receipt.ttn}-${index}`;

                const docVolume = parseFloat(receipt.doc.volume);
                const docAmount = parseFloat(receipt.doc.amount);
                const factAmount = parseFloat(receipt.fact.amount);
                const amountDiff = factAmount - docAmount;

                return (
                  <TableRow
                    key={receiptId}
                    className="cursor-pointer hover:bg-slate-700/50 transition-colors border-slate-700"
                    onClick={() => handleSelectReceipt(receipt)}
                  >
                    <TableCell className="text-slate-300">
                      {format(new Date(receipt.dt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                    </TableCell>
                    <TableCell className="text-slate-300">{receipt.stationNumber}</TableCell>
                    <TableCell className="text-slate-300">{receipt.shiftNumber}</TableCell>
                    <TableCell className="font-mono text-slate-300">{receipt.ttn}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-700 text-white border-slate-600">
                        {receipt.service.service_name}
                      </Badge>
                    </TableCell>

                    {/* Документальные данные */}
                    <TableCell className="text-right font-mono text-slate-300">
                      {docVolume.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-300">
                      {docAmount.toFixed(2)}
                    </TableCell>

                    {/* Отклонение по массе */}
                    <TableCell className="text-right font-mono">
                      <span className={cn(amountDiff >= 0 ? 'text-green-400' : 'text-red-400')}>
                        {amountDiff > 0 ? '+' : ''}{amountDiff.toFixed(2)}
                      </span>
                    </TableCell>
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
        />
      </div>
    </MainLayout>
  );
}
