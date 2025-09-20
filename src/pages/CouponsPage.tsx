/**
 * CouponsPage - Основная страница купонов
 * Управление купонами (сдача топливом)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSelection } from '@/contexts/SelectionContext';

// Импорты сервисов и компонентов
import { couponsApiService } from '@/services/couponsApiService';
import type {
  CouponsApiResponse,
  CouponsFilter,
  Coupon,
  CouponsSearchResult,
  CouponsApiParams
} from '@/types/coupons';

import {
  Receipt,
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  Settings,
  Plus,
  BarChart3,
  Clock,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Calendar,
  Activity,
  Pin,
  Loader2,
  Copy,
  Fuel,
  TrendingUp,
  XCircle,
  Ticket,
  Package
} from 'lucide-react';

export default function CouponsPage() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { selectedTradingPoint, selectedNetwork } = useSelection();

  // Состояния данных
  const [searchResult, setSearchResult] = useState<CouponsSearchResult | null>(null);
  const [loading, setLoading] = useState(true); // Начинаем с loading=true
  const [error, setError] = useState<string | null>(null);

  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = isMobile ? 20 : 50;
  const [totalPages, setTotalPages] = useState(0);

  // Состояния фильтров
  const [filters, setFilters] = useState<CouponsFilter>({
    system: 15, // Начальное значение
    search: '',
    state: undefined,
    ageFilter: 'all',
    // Устанавливаем период по умолчанию - месяц от текущей даты (формат для HTML input)
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 дней назад
    dateTo: new Date().toISOString().split('T')[0] // сегодня
  });

  // Обновляем system в фильтрах при изменении выбранной сети
  useEffect(() => {
    if (selectedNetwork?.external_id && !isNaN(Number(selectedNetwork.external_id))) {
      setFilters(prev => ({
        ...prev,
        system: Number(selectedNetwork.external_id)
      }));
    }
  }, [selectedNetwork]);

  // Фильтр по типу топлива
  const [selectedFuelType, setSelectedFuelType] = useState<string>('all');

  // KPI карточки фильтры (убираем станции, оставляем только статусы)
  const [selectedKpiStates, setSelectedKpiStates] = useState<Set<string>>(new Set());

  // Модальное окно деталей купона
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Функция для безопасной работы с датами
  const safeDateFormat = (dateStr: string, formatFunc: (date: Date) => string, fallback: string = '-') => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return fallback;
      }
      return formatFunc(date);
    } catch (error) {
      console.warn('🎫 Ошибка форматирования даты:', dateStr, error);
      return fallback;
    }
  };

  /**
   * Загрузка данных купонов
   */
  const loadCouponsData = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🎫 Загрузка купонов с фильтрами:', filters);
      console.log('🎫 Выбранная торговая точка:', selectedTradingPoint);

      // Параметры запроса к API
      const apiParams: CouponsApiParams = {
        system: filters.system,
        // Используем external_id торговой точки если он число
        ...(selectedTradingPoint?.external_id && !isNaN(Number(selectedTradingPoint.external_id)) && {
          station: Number(selectedTradingPoint.external_id)
        }),
        ...(filters.dateFrom && { dt_beg: filters.dateFrom }),
        ...(filters.dateTo && { dt_end: filters.dateTo })
      };

      console.log('🎫 API параметры:', apiParams);
      console.log('🎫 Выбранная торговая точка ID:', selectedTradingPoint?.id);

      // Загружаем данные с API
      const apiResponse = await couponsApiService.getCoupons(apiParams);

      // Обрабатываем ответ API
      const processedResult = couponsApiService.processRawCoupons(apiResponse);

      // Применяем дополнительные фильтры
      const filteredResult = couponsApiService.filterCoupons(processedResult, filters);

      setSearchResult(filteredResult);


    } catch (err: any) {
      const errorMessage = err.message || 'Неизвестная ошибка при загрузке данных';
      setError(errorMessage);

      // В случае ошибки API используем пустой результат
      setSearchResult({
        groups: [],
        stats: {
          totalCoupons: 0,
          activeCoupons: 0,
          redeemedCoupons: 0,
          totalDebt: 0,
          totalAmount: 0,
          usedAmount: 0,
          averageRest: 0,
          oldCouponsCount: 0,
          criticalCouponsCount: 0
        },
        totalFound: 0,
        appliedFilters: filters
      });

      toast({
        title: "Ошибка загрузки",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Экспорт данных в Excel с аналитикой
   */
  const exportToExcel = async () => {
    // Динамический импорт библиотеки xlsx
    const XLSX = await import('xlsx');
    const allCoupons = searchResult?.groups.flatMap(g => g.coupons) || [];
    if (allCoupons.length === 0) return;

    const currentDate = new Date().toLocaleDateString('ru-RU');
    const networkName = selectedNetwork?.name || 'Не выбрана';
    const stationName = selectedTradingPoint?.name || 'Все станции';

    // Создаем новую рабочую книгу Excel
    const workbook = XLSX.utils.book_new();

    // Лист "Аналитика"
    const analyticsData = [];

    // Заголовок отчета
    analyticsData.push(['ОТЧЕТ ПО КУПОНАМ']);
    analyticsData.push(['Дата формирования:', currentDate]);
    analyticsData.push(['Сеть:', networkName]);
    analyticsData.push(['Торговая точка:', stationName]);
    analyticsData.push(['']); // Пустая строка

    // Аналитические показатели (в том же порядке, что и карточки)
    analyticsData.push(['АНАЛИТИЧЕСКИЕ ПОКАЗАТЕЛИ']);

    // 1. Выдано купонов
    const totalIssuedLiters = allCoupons.reduce((sum, c) => sum + c.qty_total, 0);
    analyticsData.push(['1. ВЫДАНО КУПОНОВ']);
    analyticsData.push(['   Объем (л):', totalIssuedLiters]);
    analyticsData.push(['   Сумма (₽):', searchResult?.stats.totalAmount || 0]);
    analyticsData.push(['   Количество (шт):', searchResult?.stats.totalCoupons || 0]);
    analyticsData.push(['']);

    // 2. Выдано топлива
    const usedCouponsCount = allCoupons.filter(c => c.qty_used > 0).length;
    analyticsData.push(['2. ВЫДАНО ТОПЛИВА']);
    analyticsData.push(['   Объем (л):', searchResult?.stats.totalFuelDelivered || 0]);
    analyticsData.push(['   Сумма (₽):', searchResult?.stats.usedAmount || 0]);
    analyticsData.push(['   Количество купонов (шт):', usedCouponsCount]);
    analyticsData.push(['']);

    // 3. Остаток (активные купоны)
    const activeCoupons = allCoupons.filter(c => c.isActive && !c.isOld);
    const remainingLiters = activeCoupons.reduce((sum, c) => sum + c.rest_qty, 0);
    const remainingAmount = activeCoupons.reduce((sum, c) => sum + c.rest_summ, 0);
    analyticsData.push(['3. ОСТАТОК (активные купоны)']);
    analyticsData.push(['   Объем (л):', remainingLiters]);
    analyticsData.push(['   Сумма (₽):', remainingAmount]);
    analyticsData.push(['   Количество (шт):', activeCoupons.length]);
    analyticsData.push(['']);

    // 4. Просрочено
    analyticsData.push(['4. ПРОСРОЧЕНО (старше 7 дней)']);
    analyticsData.push(['   Объем (л):', searchResult?.stats.expiredFuelLoss || 0]);
    analyticsData.push(['   Сумма (₽):', searchResult?.stats.expiredAmount || 0]);
    analyticsData.push(['   Количество (шт):', searchResult?.stats.expiredCoupons || 0]);
    analyticsData.push(['']);

    // Дополнительные показатели
    analyticsData.push(['ДОПОЛНИТЕЛЬНЫЕ ПОКАЗАТЕЛИ']);
    analyticsData.push(['Активных купонов:', searchResult?.stats.activeCoupons || 0]);
    analyticsData.push(['Погашенных купонов:', searchResult?.stats.redeemedCoupons || 0]);
    analyticsData.push(['']); // Пустая строка

    analyticsData.push(['Процент использования (%):', searchResult?.stats.utilizationRate || 0]);

    // Создаем лист аналитики
    const analyticsSheet = XLSX.utils.aoa_to_sheet(analyticsData);

    // Форматирование для числовых значений в аналитике (2 знака после запятой)
    const range = XLSX.utils.decode_range(analyticsSheet['!ref'] || 'A1');
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = analyticsSheet[cellAddress];
        if (cell && typeof cell.v === 'number' && col === 1) { // Столбец B (значения)
          cell.z = '0.00'; // Формат с 2 знаками после запятой
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, analyticsSheet, 'Аналитика');

    // Лист "Детальная информация"
    const detailsData = [];
    const headers = [
      'Номер купона',
      'Дата создания',
      'Время создания',
      'Тип топлива',
      'Цена за литр (₽)',
      'Общее количество (л)',
      'Использовано (л)',
      'Остаток (л)',
      'Общая сумма (₽)',
      'Использованная сумма (₽)',
      'Остаток (₽)',
      'Статус',
      'Станция',
      'Смена',
      'Операция'
    ];
    detailsData.push(headers);

    // Данные купонов
    const rows = allCoupons.map(coupon => {
      const date = new Date(coupon.dt);
      return [
        coupon.number,
        date.toLocaleDateString('ru-RU'),
        date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        coupon.service.service_name,
        coupon.price,
        coupon.qty_total,
        coupon.qty_used,
        coupon.rest_qty,
        coupon.summ_total,
        coupon.summ_used,
        coupon.rest_summ,
        coupon.state.name,
        `Станция ${searchResult?.groups.find(g => g.coupons.includes(coupon))?.stationId || ''}`,
        coupon.shift,
        coupon.opernum
      ];
    });

    detailsData.push(...rows);

    // Создаем лист детальной информации
    const detailsSheet = XLSX.utils.aoa_to_sheet(detailsData);

    // Форматирование для числовых столбцов в детальной таблице
    const detailsRange = XLSX.utils.decode_range(detailsSheet['!ref'] || 'A1');
    for (let row = 1; row <= detailsRange.e.r; row++) { // Начинаем с 1 (пропускаем заголовки)
      // Столбцы с числовыми данными: D(4), E(5), F(6), G(7), H(8), I(9), J(10), N(13), O(14)
      const numericColumns = [4, 5, 6, 7, 8, 9, 10, 13, 14]; // Цена, объемы, суммы, смена, операция

      numericColumns.forEach(col => {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = detailsSheet[cellAddress];
        if (cell && typeof cell.v === 'number') {
          if (col >= 4 && col <= 10) { // Денежные и объемные поля
            cell.z = '0.00'; // 2 знака после запятой
          } else { // Смена и операция
            cell.z = '0'; // Целые числа
          }
        }
      });
    }

    XLSX.utils.book_append_sheet(workbook, detailsSheet, 'Детальная информация');

    // Сохраняем Excel файл
    const fileName = `kupony_${networkName.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Экспорт завершен",
      description: `Экспортировано ${allCoupons.length} купонов с полной аналитикой`,
    });
  };

  // Получаем все купоны из результата поиска
  const allCoupons = useMemo(() => {
    return searchResult?.groups.flatMap(g => g.coupons) || [];
  }, [searchResult]);

  // Отфильтрованные купоны (дополнительная фильтрация поверх API)
  const filteredCoupons = useMemo(() => {
    let filtered = allCoupons.filter(coupon => {
      // Фильтр по поиску (дополнительный)
      if (filters.search && !coupon.number.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // KPI фильтры по статусам
      if (selectedKpiStates.size > 0 && !selectedKpiStates.has(coupon.state.name)) {
        return false;
      }

      // Фильтр по типу топлива
      if (selectedFuelType !== 'all' && coupon.service.service_name !== selectedFuelType) {
        return false;
      }

      return true;
    });

    // Сортировка по дате (свежие сверху)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.dt);
      const dateB = new Date(b.dt);

      // Обрабатываем невалидные даты
      const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
      const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();

      return timeB - timeA;
    });
  }, [allCoupons, filters, selectedKpiStates, selectedFuelType]);

  // Пагинация
  const paginatedCoupons = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const totalPages = Math.ceil(filteredCoupons.length / itemsPerPage);
    setTotalPages(totalPages);
    return filteredCoupons.slice(startIndex, endIndex);
  }, [filteredCoupons, currentPage, itemsPerPage]);

  // Уникальные статусы для KPI
  const uniqueStates = useMemo(() => {
    const states = new Set(allCoupons.map(c => c.state.name));
    return Array.from(states).sort();
  }, [allCoupons]);

  // Уникальные типы топлива для KPI
  const uniqueFuelTypes = useMemo(() => {
    const fuelTypes = new Set(allCoupons.map(c => c.service.service_name));
    return Array.from(fuelTypes).sort();
  }, [allCoupons]);

  // Статистика по типам топлива
  const fuelStats = useMemo(() => {
    return uniqueFuelTypes.map(fuelType => {
      const fuelCoupons = allCoupons.filter(c => c.service.service_name === fuelType);
      const filteredFuelCoupons = filteredCoupons.filter(c => c.service.service_name === fuelType);

      const totalAmount = fuelCoupons.reduce((sum, c) => sum + c.rest_summ, 0);
      const filteredAmount = filteredFuelCoupons.reduce((sum, c) => sum + c.rest_summ, 0);

      const totalLiters = fuelCoupons.reduce((sum, c) => sum + c.rest_qty, 0);
      const filteredLiters = filteredFuelCoupons.reduce((sum, c) => sum + c.rest_qty, 0);

      return {
        fuelType,
        totalCoupons: fuelCoupons.length,
        filteredCoupons: filteredFuelCoupons.length,
        totalAmount,
        filteredAmount,
        totalLiters,
        filteredLiters
      };
    });
  }, [allCoupons, filteredCoupons, uniqueFuelTypes]);

  // Функции управления KPI фильтрами (убираем станции)
  const handleKpiStateClick = (state: string) => {
    const newSelected = new Set(selectedKpiStates);
    if (newSelected.has(state)) {
      newSelected.delete(state);
    } else {
      newSelected.add(state);
    }
    setSelectedKpiStates(newSelected);
  };

  // Обработка клика по KPI карточке топлива
  const handleFuelTypeKpiClick = (fuelType: string) => {
    setSelectedFuelType(selectedFuelType === fuelType ? 'all' : fuelType);
  };

  const handleKpiResetAll = () => {
    setSelectedKpiStates(new Set());
  };

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, selectedKpiStates, selectedFuelType]);

  // Загружаем данные при монтировании и при изменении торговой точки
  useEffect(() => {
    // Добавляем проверку для избежания вызова без необходимых данных
    if (selectedNetwork?.external_id) {
      loadCouponsData();
    } else {
      // Если нет выбранной сети, устанавливаем loading=false
      setLoading(false);
      setError('Выберите сеть для загрузки купонов');
    }
  }, [selectedTradingPoint, selectedNetwork]);

  // Получаем badge для статуса
  const getStatusBadge = (stateName: string) => {
    switch (stateName) {
      case 'Активный':
        return <Badge className="bg-green-600 text-white">Активный</Badge>;
      case 'Погашен':
        return <Badge className="bg-slate-600 text-slate-200">Погашен</Badge>;
      default:
        return <Badge variant="secondary">{stateName}</Badge>;
    }
  };

  const getCompactStatusBadge = (stateName: string) => {
    switch (stateName) {
      case 'Активный':
        return <Badge className="bg-green-600 text-white text-xs px-1 py-0">Активный</Badge>;
      case 'Погашен':
        return <Badge className="bg-slate-600 text-slate-200 text-xs px-1 py-0">Погашен</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs px-1 py-0">{stateName}</Badge>;
    }
  };

  return (
    <MainLayout fullWidth={true}>
      <div className={`w-full space-y-6 px-4 md:px-6 lg:px-8 relative overflow-hidden ${isMobile ? 'pt-4' : 'pt-6'} min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950`}>

        {/* Заголовок страницы */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-600/50 rounded-xl shadow-2xl backdrop-blur-sm overflow-hidden">
          <CardHeader className={`${isMobile ? 'px-4 py-4' : 'px-8 py-6'} bg-gradient-to-r from-slate-800/90 via-slate-750/90 to-slate-800/90 border-b border-slate-600/30`}>
            <CardTitle className="text-slate-100 flex items-center justify-between min-w-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-1.5 h-10 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full shadow-lg flex-shrink-0"></div>
                <span className={`${isMobile ? 'text-xl font-bold' : 'text-3xl font-bold'} text-white leading-tight truncate`}>Купоны</span>
              </div>

              <div className={`flex ${isMobile ? 'gap-1' : 'gap-2'} items-center flex-shrink-0`}>
                {/* Кнопка экспорта */}
                {filteredCoupons.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        className={`bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg font-medium ${isMobile ? 'px-3 py-1.5 text-xs' : 'px-3 py-2'}`}
                        size="sm"
                      >
                        <Download className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-2`} />
                        Экспорт
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 bg-slate-800 border-slate-600 shadow-xl rounded-lg">
                      <DropdownMenuItem onClick={exportToExcel} className="flex items-center gap-2 hover:bg-slate-700 cursor-pointer py-2.5">
                        <FileSpreadsheet className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-medium">Экспорт в Excel</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Кнопка обновления */}
                <Button
                  onClick={loadCouponsData}
                  disabled={loading}
                  className={`bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg font-medium ${isMobile ? 'px-3 py-1.5 text-xs' : 'px-3 py-2'}`}
                  size="sm"
                >
                  {loading ? (
                    <RefreshCw className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-2 animate-spin`} />
                  ) : (
                    <RefreshCw className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-2`} />
                  )}
                  Обновить
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Аналитические карточки */}
        {searchResult && searchResult.stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
            {/* Выдано купонов */}
            <Card className="bg-slate-800 border-slate-600">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="w-full">
                    <p className="text-slate-300 text-sm font-medium mb-2">Выдано купонов</p>
                    <p className="text-white text-xl font-bold mb-1">
                      {(() => {
                        const allCoupons = searchResult.groups?.flatMap(g => g.coupons) || [];
                        const totalLiters = allCoupons.reduce((sum, c) => sum + c.qty_total, 0);
                        return `${totalLiters.toFixed(1)} л`;
                      })()}
                    </p>
                    <p className="text-white text-xl font-bold mb-1">
                      {searchResult.stats?.totalAmount?.toFixed(0) || '0'} ₽
                    </p>
                    <p className="text-slate-400 text-xs">
                      {searchResult.stats?.totalCoupons || 0} шт
                    </p>
                  </div>
                  <Ticket className="text-slate-400 w-8 h-8" />
                </div>
              </CardContent>
            </Card>

            {/* Объем выданного топлива */}
            <Card className="bg-slate-800 border-slate-600">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="w-full">
                    <p className="text-slate-300 text-sm font-medium mb-2">Выдано топлива</p>
                    <p className="text-white text-xl font-bold mb-1">
                      {searchResult.stats?.totalFuelDelivered?.toFixed(1) || '0.0'} л
                    </p>
                    <p className="text-white text-xl font-bold mb-1">
                      {searchResult.stats?.usedAmount?.toFixed(0) || '0'} ₽
                    </p>
                    <p className="text-slate-400 text-xs">
                      {(() => {
                        const allCoupons = searchResult.groups?.flatMap(g => g.coupons) || [];
                        const usedCoupons = allCoupons.filter(c => c.qty_used > 0);
                        return usedCoupons.length;
                      })()} шт
                    </p>
                  </div>
                  <Fuel className="text-slate-400 w-8 h-8" />
                </div>
              </CardContent>
            </Card>

            {/* Остаток (активные купоны) */}
            <Card className="bg-slate-800 border-slate-600">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="w-full">
                    <p className="text-slate-300 text-sm font-medium mb-2">Остаток</p>
                    <p className="text-white text-xl font-bold mb-1">
                      {(() => {
                        const allCoupons = searchResult.groups?.flatMap(g => g.coupons) || [];
                        const activeCoupons = allCoupons.filter(c => c.isActive && !c.isOld);
                        const totalRestLiters = activeCoupons.reduce((sum, c) => sum + c.rest_qty, 0);
                        return `${totalRestLiters.toFixed(1)} л`;
                      })()}
                    </p>
                    <p className="text-white text-xl font-bold mb-1">
                      {(() => {
                        const allCoupons = searchResult.groups?.flatMap(g => g.coupons) || [];
                        const activeCoupons = allCoupons.filter(c => c.isActive && !c.isOld);
                        const totalRestSum = activeCoupons.reduce((sum, c) => sum + c.rest_summ, 0);
                        return `${totalRestSum.toFixed(0)} ₽`;
                      })()}
                    </p>
                    <p className="text-slate-400 text-xs">
                      {(() => {
                        const allCoupons = searchResult.groups?.flatMap(g => g.coupons) || [];
                        const activeCoupons = allCoupons.filter(c => c.isActive && !c.isOld);
                        return `${activeCoupons.length} шт`;
                      })()}
                    </p>
                  </div>
                  <Package className="text-slate-400 w-8 h-8" />
                </div>
              </CardContent>
            </Card>

            {/* Просроченные купоны */}
            <Card className="bg-slate-800 border-slate-600">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="w-full">
                    <p className="text-slate-300 text-sm font-medium mb-2">Просрочено</p>
                    <p className="text-white text-xl font-bold mb-1">
                      {searchResult.stats?.expiredFuelLoss?.toFixed(1) || '0.0'} л
                    </p>
                    <p className="text-white text-xl font-bold mb-1">
                      {searchResult.stats?.expiredAmount?.toFixed(0) || '0'} ₽
                    </p>
                    <p className="text-slate-400 text-xs">
                      {searchResult.stats?.expiredCoupons || 0} шт
                    </p>
                  </div>
                  <Clock className="text-slate-400 w-8 h-8" />
                </div>
              </CardContent>
            </Card>


          </div>
        )}

        {/* Компактные фильтры */}
        <Card className="bg-slate-800 border-slate-600 mb-4">
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className={`flex items-center gap-3 ${isMobile ? 'mb-3' : 'mb-4'}`}>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-white text-sm">⚙️</span>
              </div>
              <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-white`}>Фильтры</h2>
            </div>

            {/* Верхняя строка - Поиск */}
            <div className={`${isMobile ? 'space-y-3 mb-4' : 'grid grid-cols-1 gap-6 mb-4'}`}>
              {/* Поиск */}
              <div className={`${isMobile ? 'flex items-center gap-3 min-w-0' : ''}`}>
                {isMobile ? (
                  <>
                    <Label htmlFor="search" className="text-slate-300 text-xs font-medium w-14 flex-shrink-0">Поиск:</Label>
                    <Input
                      id="search"
                      type="text"
                      placeholder="Номер купона..."
                      value={filters.search || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400 h-8 text-sm flex-1 min-w-0"
                    />
                  </>
                ) : (
                  <>
                    <Label htmlFor="search" className="text-slate-300 text-sm font-medium mb-2 block">Поиск по номеру купона</Label>
                    <Input
                      id="search"
                      type="text"
                      placeholder="Поиск по номеру купона..."
                      value={filters.search || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400 h-10 text-base"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Нижняя строка - Даты */}
            <div className={`${isMobile ? 'space-y-3' : 'grid grid-cols-2 gap-6'}`}>
              {/* Дата начала */}
              <div className={`${isMobile ? 'flex items-center gap-3 min-w-0' : ''}`}>
                {isMobile ? (
                  <>
                    <Label htmlFor="dateFrom" className="text-slate-300 text-xs font-medium w-14 flex-shrink-0">С:</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={filters.dateFrom || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-slate-200 h-8 text-sm flex-1 min-w-0"
                    />
                  </>
                ) : (
                  <>
                    <Label htmlFor="dateFrom" className="text-slate-300 text-sm font-medium mb-2 block">Дата начала</Label>
                    <div className="relative">
                      <Input
                        id="dateFrom"
                        type="date"
                        value={filters.dateFrom || ''}
                        onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                        className="bg-slate-700 border-slate-600 text-slate-200 h-10 text-base pr-10"
                      />
                      <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 hover:text-blue-400 transition-colors pointer-events-none" />
                    </div>
                  </>
                )}
              </div>

              {/* Дата окончания */}
              <div className={`${isMobile ? 'flex items-center gap-3 min-w-0' : ''}`}>
                {isMobile ? (
                  <>
                    <Label htmlFor="dateTo" className="text-slate-300 text-xs font-medium w-14 flex-shrink-0">По:</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={filters.dateTo || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-slate-200 h-8 text-sm flex-1 min-w-0"
                    />
                  </>
                ) : (
                  <>
                    <Label htmlFor="dateTo" className="text-slate-300 text-sm font-medium mb-2 block">Дата окончания</Label>
                    <div className="relative">
                      <Input
                        id="dateTo"
                        type="date"
                        value={filters.dateTo || ''}
                        onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                        className="bg-slate-700 border-slate-600 text-slate-200 h-10 text-base pr-10"
                      />
                      <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 hover:text-blue-400 transition-colors pointer-events-none" />
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Заголовок фильтров */}
        {allCoupons.length > 0 && (
          <div className="mb-4">
            <div className="space-y-1">
              {!isMobile && (
                <h3 className="text-xl font-semibold text-white">Фильтр по статусам</h3>
              )}
              <p className="text-xs text-slate-500">выберите один или несколько статусов</p>
            </div>
          </div>
        )}

        {/* KPI карточки */}
        {allCoupons.length > 0 && (
          <div className="space-y-4">
            {/* Карточки по статусам */}
            <div className="space-y-2">
              <h3 className={`text-slate-300 font-medium px-2 ${isMobile ? 'text-sm' : 'text-base'}`}>Статусы</h3>
              <div className={`grid gap-4 ${isMobile ? 'grid-cols-3 gap-2' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                {uniqueStates.map(state => {
                  const allStateCoupons = allCoupons.filter(c => c.state.name === state);
                  const filteredStateCoupons = filteredCoupons.filter(c => c.state.name === state);

                  const allAmount = allStateCoupons.reduce((sum, c) => sum + c.rest_summ, 0);
                  const filteredAmount = filteredStateCoupons.reduce((sum, c) => sum + c.rest_summ, 0);

                  const isSelected = selectedKpiStates.has(state);

                  let cardStyle = '';
                  if (isSelected) {
                    cardStyle = 'bg-slate-700 border-slate-500 border-2 shadow-[inset_0_-16px_0_0_rgb(37_99_235)]';
                  } else {
                    cardStyle = 'bg-slate-800 border-slate-600 hover:bg-slate-700';
                  }

                  return (
                    <Card
                      key={state}
                      className={`${cardStyle} cursor-pointer transition-all duration-200`}
                      onClick={() => handleKpiStateClick(state)}
                    >
                      <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
                        {isMobile ? (
                          <div className="relative">
                            <div className="mb-1">
                              <p className="text-white font-semibold text-xs truncate">{state}</p>
                            </div>
                            <p className="font-bold text-white text-sm mb-1">
                              {filteredAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽
                            </p>
                            <div className="text-xs text-slate-400 space-y-0.5">
                              <div>{filteredStateCoupons.length} куп.</div>
                            </div>
                            {isSelected && (
                              <Pin className="w-4 h-4 text-yellow-400 absolute bottom-0 right-0 drop-shadow-lg" />
                            )}
                          </div>
                        ) : (
                          <div className="relative">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-bold text-white text-lg leading-tight truncate">{state}</p>
                                <p className="text-base text-slate-400 flex items-center gap-1">
                                  <Activity className="w-3 h-3" />
                                  {filteredStateCoupons.length}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-white text-lg leading-tight">
                                  {filteredAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Карточки по видам топлива */}
            {uniqueFuelTypes.length > 0 && (
              <div className="space-y-2">
                <h3 className={`text-slate-300 font-medium px-2 ${isMobile ? 'text-sm' : 'text-base'}`}>Виды топлива</h3>
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'}`}>
                  {fuelStats.map(stat => {
                    const isSelected = selectedFuelType === stat.fuelType;

                    let cardStyle = '';
                    if (isSelected) {
                      cardStyle = 'bg-slate-700 border-slate-500 border-2 shadow-[inset_0_-16px_0_0_rgb(34_197_94)]';
                    } else {
                      cardStyle = 'bg-slate-800 border-slate-600 hover:bg-slate-700';
                    }

                    return (
                      <Card
                        key={stat.fuelType}
                        className={`${cardStyle} cursor-pointer transition-all duration-200`}
                        onClick={() => handleFuelTypeKpiClick(stat.fuelType)}
                      >
                        <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
                          {isMobile ? (
                            <div className="relative">
                              <div className="mb-1">
                                <p className="text-white font-semibold text-xs truncate">{stat.fuelType}</p>
                              </div>
                              <p className="font-bold text-green-400 text-sm mb-1">
                                {stat.filteredLiters.toFixed(1)} л
                              </p>
                              <div className="text-xs text-slate-400 space-y-0.5">
                                <div>{stat.filteredAmount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽</div>
                                <div>{stat.filteredCoupons} куп.</div>
                              </div>
                              {isSelected && (
                                <Pin className="w-4 h-4 text-yellow-400 absolute bottom-0 right-0 drop-shadow-lg" />
                              )}
                            </div>
                          ) : (
                            <div className="relative">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="font-bold text-white text-lg leading-tight truncate">{stat.fuelType}</p>
                                  <p className="text-base text-slate-400 flex items-center gap-1">
                                    <Activity className="w-3 h-3" />
                                    {stat.filteredCoupons}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-green-400 text-lg leading-tight">
                                    {stat.filteredLiters.toFixed(1)} л
                                  </p>
                                  <p className="font-bold text-white text-sm leading-tight">
                                    {stat.filteredAmount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽
                                  </p>
                                </div>
                              </div>
                              {isSelected && (
                                <Pin className="w-4 h-4 text-yellow-400 absolute bottom-1 right-1 drop-shadow-lg" />
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Итоговая карточка */}
            <div className="space-y-2">
              <div className="flex items-center px-2">
                <h3 className={`text-slate-300 font-medium ${isMobile ? 'text-sm' : 'text-base'} mr-4`}>Итого</h3>
                {!isMobile && (
                  <span className="text-sm">
                    {(() => {
                      const selectedStates = Array.from(selectedKpiStates);
                      const allSelected = [...selectedStates];

                      if (allSelected.length === 0) {
                        return <span className="text-slate-400">не выбрано</span>;
                      } else {
                        return (
                          <span>
                            <span className="text-slate-400">выбрано: </span>
                            <span className="text-blue-400 font-bold">{allSelected.join(', ')}</span>
                          </span>
                        );
                      }
                    })()}
                  </span>
                )}
              </div>
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                {(() => {
                  const totalAmount = filteredCoupons.reduce((sum, c) => sum + c.rest_summ, 0);
                  const hasActiveFilters = selectedKpiStates.size > 0;

                  return (
                    <Card
                      className={`${
                        hasActiveFilters
                          ? 'bg-blue-700 border-blue-300 border-2 cursor-pointer hover:bg-blue-600'
                          : 'bg-slate-700 border-slate-500 border-2'
                      } transition-all duration-200`}
                      onClick={hasActiveFilters ? handleKpiResetAll : undefined}
                    >
                      <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
                        {isMobile ? (
                          <div>
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-blue-300 font-semibold text-sm">Итого</p>
                            </div>
                            <p className="font-bold text-white text-lg mb-1">
                              {Math.round(totalAmount).toLocaleString('ru-RU')} ₽
                            </p>
                            <div className="flex justify-between text-xs text-slate-400">
                              <span>{filteredCoupons.length} куп.</span>
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-bold text-white text-lg leading-tight">Итого</p>
                                <p className="text-base text-slate-400 flex items-center gap-1">
                                  <Activity className="w-3 h-3" />
                                  {filteredCoupons.length}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-white text-lg leading-tight">
                                  {totalAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Таблица купонов */}
        <Card className={`bg-slate-800 border border-slate-700 rounded-lg shadow-lg ${isMobile ? 'mx-0 mt-1' : ''}`}>
          <CardHeader className={`${isMobile ? 'px-3 py-1.5' : 'pb-4'}`}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className={`text-slate-200 flex items-center gap-2 ${isMobile ? 'text-base' : 'text-xl'}`}>
                  <Receipt className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  Купоны
                </CardTitle>
                <p className={`text-slate-400 ${isMobile ? 'text-xs mt-0.5' : 'text-sm mt-1'}`}>
                  Показано {paginatedCoupons.length} из {filteredCoupons.length}
                  {totalPages > 1 && ` • Страница ${currentPage} из ${totalPages}`}
                </p>
              </div>

              {!isMobile && totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    ← Предыдущая
                  </Button>
                  <span className="text-sm text-slate-400 px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Следующая →
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className={`${isMobile ? 'px-0 pb-3' : ''}`}>
            {isMobile ? (
              // Mobile compact table layout
              <div>
                <div className="bg-slate-800 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-700 text-slate-300 border-b border-slate-600">
                        <th className="px-2 py-2 text-left font-medium">Номер / Дата</th>
                        <th className="px-2 py-2 text-center font-medium">Топливо</th>
                        <th className="px-2 py-2 text-right font-medium">Остаток</th>
                        <th className="px-2 py-2 text-center font-medium">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCoupons.map((coupon, index) => (
                        <tr
                          key={coupon.number}
                          className={`hover:bg-slate-600 cursor-pointer transition-colors border-b border-slate-700 ${index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-750'}`}
                          onClick={() => {
                            setSelectedCoupon(coupon);
                            setIsDetailsOpen(true);
                          }}
                        >
                          <td className="px-2 py-2">
                            <div className="flex flex-col">
                              <span className="text-white font-mono text-xs truncate" title={coupon.number}>
                                {coupon.number}
                              </span>
                              <span className="text-slate-400 text-xs font-mono">
                                {safeDateFormat(coupon.dt, (date) => date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }))}
                              </span>
                              {coupon.isActive && coupon.qty_used === 0 && (
                                <span className="text-yellow-400 text-xs">🔄 Не использован</span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-white font-semibold text-xs">{coupon.service.service_name}</span>
                              <span className="text-slate-300 text-xs">{coupon.price.toFixed(2)} ₽/л</span>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-white text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-xs">{coupon.rest_qty.toFixed(1)} л</span>
                              <span className="text-slate-300 text-xs">{coupon.rest_summ.toFixed(0)} ₽</span>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            {getCompactStatusBadge(coupon.state.name)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {paginatedCoupons.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Загрузка купонов...</span>
                      </div>
                    ) : (
                      'Нет купонов по выбранным фильтрам'
                    )}
                  </div>
                )}

                {isMobile && totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      ←
                    </Button>
                    <span className="text-sm text-slate-400 px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      →
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700 hover:bg-slate-800">
                      <TableHead className="text-slate-300 min-w-[120px]">Номер купона</TableHead>
                      <TableHead className="text-slate-300 min-w-[140px]">Дата создания</TableHead>
                      <TableHead className="text-slate-300 min-w-[100px]">Тип топлива</TableHead>
                      <TableHead className="text-slate-300 min-w-[100px]">Цена за литр</TableHead>
                      <TableHead className="text-slate-300 min-w-[120px]">Остаток (л)</TableHead>
                      <TableHead className="text-slate-300 min-w-[100px]">Остаток (₽)</TableHead>
                      <TableHead className="text-slate-300 min-w-[100px]">Статус</TableHead>
                      <TableHead className="text-slate-300 min-w-[120px]">Смена</TableHead>
                      <TableHead className="text-slate-300 min-w-[100px]">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCoupons.map((coupon) => (
                      <TableRow
                        key={coupon.number}
                        className="border-slate-700 hover:bg-slate-800"
                      >
                        <TableCell className="text-slate-300 font-mono text-sm min-w-[120px]">
                          <div className="flex flex-col">
                            <span>{coupon.number}</span>
                            {coupon.isActive && coupon.qty_used === 0 && (
                              <span className="text-yellow-400 text-xs flex items-center gap-1">
                                🔄 Не использован
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm min-w-[140px]">
                          <div className="flex flex-col">
                            <span className="font-mono">{safeDateFormat(coupon.dt, (date) => date.toLocaleDateString('ru-RU'))}</span>
                            <span className="text-xs text-slate-400 font-mono">{safeDateFormat(coupon.dt, (date) => date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }))}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm min-w-[100px] text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-semibold text-blue-300">{coupon.service.service_name}</span>
                            <span className="text-xs text-slate-400">
                              {coupon.qty_used > 0 ? `Исп: ${coupon.qty_used.toFixed(1)}л` : 'Не использован'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm min-w-[100px] text-right">
                          <span className="font-mono">{coupon.price.toFixed(2)} ₽</span>
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm min-w-[120px] text-right font-bold">
                          <div className="flex flex-col items-end">
                            <span className="text-green-400 font-bold">{coupon.rest_qty.toFixed(1)} л</span>
                            <span className="text-xs text-slate-400">
                              из {coupon.qty_total.toFixed(1)} л
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm min-w-[100px] text-right font-bold">
                          <span className="text-green-400">{coupon.rest_summ.toFixed(2)} ₽</span>
                        </TableCell>
                        <TableCell className="min-w-[100px]">
                          {getStatusBadge(coupon.state.name)}
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm min-w-[120px]">
                          <div className="flex flex-col">
                            <span className="text-xs">
                              Смена #{coupon.shift}
                            </span>
                            <span className="text-xs text-slate-400">
                              Операция #{coupon.opernum}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[100px]">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(coupon.number);
                              toast({
                                title: "Номер скопирован",
                                description: `Номер купона ${coupon.number} скопирован`,
                              });
                            }}
                            className="text-slate-400 hover:text-white"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {paginatedCoupons.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Загрузка купонов...</span>
                      </div>
                    ) : (
                      'Нет купонов по выбранным фильтрам'
                    )}
                  </div>
                )}

                {!isMobile && totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 py-6 border-t border-slate-700 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      ← Предыдущая страница
                    </Button>

                    <div className="flex items-center gap-2">
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className={currentPage === pageNum
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "border-slate-600 text-slate-300 hover:bg-slate-700"
                            }
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Следующая страница →
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Модальное окно с деталями купона */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-sm mx-auto bg-slate-800 border border-slate-600 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold text-white">
              Купон #{selectedCoupon?.number}
            </DialogTitle>
          </DialogHeader>

          {selectedCoupon && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-1 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Статус:</span>
                  <div>{getStatusBadge(selectedCoupon.state.name)}</div>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-700 bg-blue-900/30 px-2 -mx-2 rounded">
                  <span className="text-slate-300 font-medium">Тип топлива:</span>
                  <span className="text-blue-300 font-bold text-lg">{selectedCoupon.service.service_name}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Цена за литр:</span>
                  <span className="text-white font-mono text-sm">{selectedCoupon.price.toFixed(2)} ₽/л</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-700 bg-green-900/30 px-2 -mx-2 rounded">
                  <span className="text-slate-300 font-medium">Остаток:</span>
                  <div className="text-right">
                    <div className="text-green-300 font-bold text-lg">{selectedCoupon.rest_qty.toFixed(1)} литров</div>
                    <div className="text-slate-400 text-xs">на сумму {selectedCoupon.rest_summ.toFixed(2)} ₽</div>
                  </div>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Использовано:</span>
                  <span className="text-white font-mono text-sm">
                    {selectedCoupon.qty_used.toFixed(1)} л из {selectedCoupon.qty_total.toFixed(1)} л
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Дата выдачи:</span>
                  <span className="text-white font-mono text-xs">
                    {safeDateFormat(selectedCoupon.dt, date => date.toLocaleString('ru-RU'))}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Номер смены:</span>
                  <span className="text-white font-mono text-sm">
                    Смена #{selectedCoupon.shift}, операция #{selectedCoupon.opernum}
                  </span>
                </div>

                {selectedCoupon.isActive && selectedCoupon.qty_used === 0 && (
                  <div className="flex justify-between py-2 border-b border-slate-700 bg-yellow-900/30 px-2 -mx-2 rounded">
                    <span className="text-slate-300 font-medium">Статус:</span>
                    <div className="text-right">
                      <div className="text-yellow-300 font-bold">🔄 Не использован</div>
                      <div className="text-slate-400 text-xs">Купон не использовался</div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between py-2 text-xs">
                  <span className="text-slate-500">Номер купона:</span>
                  <span className="text-slate-400 font-mono">{selectedCoupon.number}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}