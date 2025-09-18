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
import { couponsApiService } from '@/services/couponsService';
import { couponsBusinessService } from '@/services/couponsBusinessService';
import type { CouponsApiResponse, CouponsFilter, Coupon } from '@/types/coupons';

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
  Copy
} from 'lucide-react';

export default function CouponsPage() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { selectedTradingPoint, selectedNetwork } = useSelection();

  // Состояния данных
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = isMobile ? 20 : 50;
  const [totalPages, setTotalPages] = useState(0);

  // Состояния фильтров
  const [filters, setFilters] = useState<CouponsFilter>({
    system: 15, // По умолчанию система 15
    search: '',
    state: undefined,
    ageFilter: 'all',
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 дней назад
    dateTo: new Date().toISOString().split('T')[0] // сегодня
  });

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

      // Временно используем только демо-данные с топливными купонами
      console.log('🎫 Загружаем демо-данные с топливными купонами (API отключен)');

        // Fallback на демо-данные с новым форматом топливных купонов
        const mockCoupons = [
          {
            number: "CPN001234567",
            station: 1,
            date: "2025-09-15T14:30:00",
            amount: 1500.50,
            state: "Активен" as const,
            description: "Купон АИ-95 (32.6 л остается)",
            systemId: 15,
            systemNumber: 1,
            fuel_type: "АИ-95" as const,
            fuel_price: 46.05,
            fuel_amount: 32.6,
            fuel_used: 0,
            fuel_rest: 32.6,
            can_change_fuel: true,
            is_unused: true,
            expires_at: "2025-10-15T14:30:00"
          },
          {
            number: "CPN001234568",
            station: 1,
            date: "2025-09-14T10:15:00",
            amount: 750.00,
            state: "Активен" as const,
            description: "Купон ДТ (12.5 л остается)",
            systemId: 15,
            systemNumber: 1,
            fuel_type: "ДТ" as const,
            fuel_price: 60.00,
            fuel_amount: 15.0,
            fuel_used: 2.5,
            fuel_rest: 12.5,
            can_change_fuel: false,
            is_unused: false,
            expires_at: "2025-10-14T10:15:00"
          },
          {
            number: "CPN001234569",
            station: 2,
            date: "2025-09-13T16:45:00",
            amount: 320.75,
            state: "Активен" as const,
            description: "Купон АИ-92 (7.8 л остается)",
            systemId: 15,
            systemNumber: 2,
            fuel_type: "АИ-92" as const,
            fuel_price: 41.12,
            fuel_amount: 7.8,
            fuel_used: 0,
            fuel_rest: 7.8,
            can_change_fuel: true,
            is_unused: true,
            expires_at: "2025-10-13T16:45:00"
          },
          {
            number: "CPN001234570",
            station: 2,
            date: "2025-09-12T09:20:00",
            amount: 890.25,
            state: "Активен" as const,
            description: "Купон АИ-98 (16.9 л остается)",
            systemId: 15,
            systemNumber: 2,
            fuel_type: "АИ-98" as const,
            fuel_price: 52.70,
            fuel_amount: 16.9,
            fuel_used: 0,
            fuel_rest: 16.9,
            can_change_fuel: true,
            is_unused: true,
            expires_at: "2025-10-12T09:20:00"
          },
          {
            number: "CPN001234571",
            station: 3,
            date: "2025-09-11T13:10:00",
            amount: 450.00,
            state: "Погашен" as const,
            description: "Купон ДТ-З (полностью использован)",
            systemId: 15,
            systemNumber: 3,
            fuel_type: "ДТ-З" as const,
            fuel_price: 65.00,
            fuel_amount: 6.92,
            fuel_used: 6.92,
            fuel_rest: 0,
            can_change_fuel: false,
            is_unused: false,
            expires_at: "2025-10-11T13:10:00"
          },
          {
            number: "CPN001234572",
            station: 1,
            date: "2025-09-10T11:45:00",
            amount: 675.30,
            state: "Активен" as const,
            description: "Купон АИ-95 (14.7 л остается) 🔄",
            systemId: 15,
            systemNumber: 1,
            fuel_type: "АИ-95" as const,
            fuel_price: 46.05,
            fuel_amount: 14.7,
            fuel_used: 0,
            fuel_rest: 14.7,
            can_change_fuel: true,
            is_unused: true,
            expires_at: "2025-10-10T11:45:00"
          },
          {
            number: "CPN001234573",
            station: 2,
            date: "2025-09-09T15:20:00",
            amount: 412.50,
            state: "Активен" as const,
            description: "Купон АИ-92 (10.0 л остается)",
            systemId: 15,
            systemNumber: 2,
            fuel_type: "АИ-92" as const,
            fuel_price: 41.25,
            fuel_amount: 10.0,
            fuel_used: 0,
            fuel_rest: 10.0,
            can_change_fuel: true,
            is_unused: true,
            expires_at: "2025-10-09T15:20:00"
          },
          {
            number: "CPN001234574",
            station: 3,
            date: "2025-09-08T12:30:00",
            amount: 920.00,
            state: "Активен" as const,
            description: "Купон ДТ (частично использован)",
            systemId: 15,
            systemNumber: 3,
            fuel_type: "ДТ" as const,
            fuel_price: 58.00,
            fuel_amount: 20.0,
            fuel_used: 4.1,
            fuel_rest: 15.9,
            can_change_fuel: false,
            is_unused: false,
            expires_at: "2025-10-08T12:30:00"
          },
          {
            number: "CPN001234575",
            station: 1,
            date: "2025-09-07T08:45:00",
            amount: 2280.90,
            state: "Активен" as const,
            description: "Купон АИ-98 (большая сумма)",
            systemId: 15,
            systemNumber: 1,
            fuel_type: "АИ-98" as const,
            fuel_price: 52.30,
            fuel_amount: 43.6,
            fuel_used: 0,
            fuel_rest: 43.6,
            can_change_fuel: true,
            is_unused: true,
            expires_at: "2025-10-07T08:45:00"
          },
          {
            number: "CPN001234576",
            station: 2,
            date: "2025-09-06T17:15:00",
            amount: 325.00,
            state: "Погашен" as const,
            description: "Купон АИ-92 (полностью использован)",
            systemId: 15,
            systemNumber: 2,
            fuel_type: "АИ-92" as const,
            fuel_price: 41.25,
            fuel_amount: 7.88,
            fuel_used: 7.88,
            fuel_rest: 0,
            can_change_fuel: false,
            is_unused: false,
            expires_at: "2025-10-06T17:15:00"
          },
          {
            number: "CPN001234577",
            station: 3,
            date: "2025-09-05T14:00:00",
            amount: 650.00,
            state: "Активен" as const,
            description: "Купон ДТ-З (малый остаток)",
            systemId: 15,
            systemNumber: 3,
            fuel_type: "ДТ-З" as const,
            fuel_price: 65.00,
            fuel_amount: 12.0,
            fuel_used: 10.0,
            fuel_rest: 2.0,
            can_change_fuel: false,
            is_unused: false,
            expires_at: "2025-10-05T14:00:00"
          },
          {
            number: "CPN001234578",
            station: 1,
            date: "2025-09-04T11:30:00",
            amount: 1380.45,
            state: "Активен" as const,
            description: "Купон АИ-95 (30.0 л остается) 🔄",
            systemId: 15,
            systemNumber: 1,
            fuel_type: "АИ-95" as const,
            fuel_price: 46.02,
            fuel_amount: 30.0,
            fuel_used: 0,
            fuel_rest: 30.0,
            can_change_fuel: true,
            is_unused: true,
            expires_at: "2025-10-04T11:30:00"
          },
          {
            number: "CPN001234579",
            station: 2,
            date: "2025-09-03T16:20:00",
            amount: 2115.60,
            state: "Активен" as const,
            description: "Купон АИ-98 (частично использован)",
            systemId: 15,
            systemNumber: 2,
            fuel_type: "АИ-98" as const,
            fuel_price: 52.89,
            fuel_amount: 45.0,
            fuel_used: 5.0,
            fuel_rest: 40.0,
            can_change_fuel: false,
            is_unused: false,
            expires_at: "2025-10-03T16:20:00"
          },
          {
            number: "CPN001234580",
            station: 3,
            date: "2025-09-02T09:10:00",
            amount: 522.50,
            state: "Погашен" as const,
            description: "Купон ДТ (полностью использован)",
            systemId: 15,
            systemNumber: 3,
            fuel_type: "ДТ" as const,
            fuel_price: 58.06,
            fuel_amount: 9.0,
            fuel_used: 9.0,
            fuel_rest: 0,
            can_change_fuel: false,
            is_unused: false,
            expires_at: "2025-10-02T09:10:00"
          }
        ];

        setCoupons(mockCoupons);

        toast({
          title: "Загружены демо-данные с топливными купонами",
          description: `Показано ${mockCoupons.length} купонов с разными типами топлива`,
          variant: "default"
        });

    } catch (err: any) {
      const errorMessage = err.message || 'Неизвестная ошибка при загрузке данных';
      setError(errorMessage);

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
   * Экспорт данных
   */
  const exportToExcel = () => {
    if (!filteredCoupons || filteredCoupons.length === 0) return;

    const csvData = couponsBusinessService.exportToCsv(filteredCoupons);

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `coupons_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Экспорт завершен",
      description: `Экспортировано ${filteredCoupons.length} купонов`,
    });
  };

  // Отфильтрованные купоны
  const filteredCoupons = useMemo(() => {
    let filtered = coupons.filter(coupon => {
      // Фильтр по поиску
      if (filters.search && !coupon.number.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Фильтр по датам
      if (filters.dateFrom || filters.dateTo) {
        const couponDate = new Date(coupon.date);

        // Проверяем валидность даты
        if (isNaN(couponDate.getTime())) {
          console.warn('🎫 Невалидная дата в купоне:', coupon.date, coupon);
          return true; // Показываем купон если дата невалидна
        }

        const couponDateStr = couponDate.toISOString().split('T')[0];

        if (filters.dateFrom && couponDateStr < filters.dateFrom) {
          return false;
        }

        if (filters.dateTo && couponDateStr > filters.dateTo) {
          return false;
        }
      }

      // KPI фильтры по статусам
      if (selectedKpiStates.size > 0 && !selectedKpiStates.has(coupon.state)) {
        return false;
      }

      // Фильтр по типу топлива
      if (selectedFuelType !== 'all' && coupon.fuel_type !== selectedFuelType) {
        return false;
      }

      return true;
    });

    // Сортировка по дате (свежие сверху)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);

      // Обрабатываем невалидные даты
      const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
      const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();

      return timeB - timeA;
    });
  }, [coupons, filters, selectedKpiStates, selectedFuelType]);

  // Пагинация
  const paginatedCoupons = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const totalPages = Math.ceil(filteredCoupons.length / itemsPerPage);
    setTotalPages(totalPages);
    return filteredCoupons.slice(startIndex, endIndex);
  }, [filteredCoupons, currentPage, itemsPerPage]);

  // Уникальные статусы для KPI (убираем станции)
  const uniqueStates = useMemo(() => {
    const states = new Set(coupons.map(c => c.state));
    return Array.from(states).sort();
  }, [coupons]);

  // Уникальные типы топлива для KPI
  const uniqueFuelTypes = useMemo(() => {
    const fuelTypes = new Set(coupons.map(c => c.fuel_type).filter(Boolean));
    return Array.from(fuelTypes).sort();
  }, [coupons]);

  // Статистика по типам топлива
  const fuelStats = useMemo(() => {
    return uniqueFuelTypes.map(fuelType => {
      const fuelCoupons = coupons.filter(c => c.fuel_type === fuelType);
      const filteredFuelCoupons = filteredCoupons.filter(c => c.fuel_type === fuelType);

      const totalAmount = fuelCoupons.reduce((sum, c) => sum + (c.amount || 0), 0);
      const filteredAmount = filteredFuelCoupons.reduce((sum, c) => sum + (c.amount || 0), 0);

      const totalLiters = fuelCoupons.reduce((sum, c) => sum + (c.fuel_rest || 0), 0);
      const filteredLiters = filteredFuelCoupons.reduce((sum, c) => sum + (c.fuel_rest || 0), 0);

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
  }, [coupons, filteredCoupons, uniqueFuelTypes]);

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
    loadCouponsData();
  }, [selectedTradingPoint]);

  // Получаем badge для статуса
  const getStatusBadge = (state: string) => {
    switch (state) {
      case 'Активен':
        return <Badge className="bg-green-600 text-white">Активен</Badge>;
      case 'Погашен':
        return <Badge className="bg-slate-600 text-slate-200">Погашен</Badge>;
      default:
        return <Badge variant="secondary">{state}</Badge>;
    }
  };

  const getCompactStatusBadge = (state: string) => {
    switch (state) {
      case 'Активен':
        return <Badge className="bg-green-600 text-white text-xs px-1 py-0">Активен</Badge>;
      case 'Погашен':
        return <Badge className="bg-slate-600 text-slate-200 text-xs px-1 py-0">Погашен</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs px-1 py-0">{state}</Badge>;
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
                <span className="text-amber-400 text-sm font-medium">
                  (Это демо режим - все данные предоставлены для согласования механизма работы с купонами)
                </span>
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
        {coupons.length > 0 && (
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
        {coupons.length > 0 && (
          <div className="space-y-4">
            {/* Карточки по статусам */}
            <div className="space-y-2">
              <h3 className={`text-slate-300 font-medium px-2 ${isMobile ? 'text-sm' : 'text-base'}`}>Статусы</h3>
              <div className={`grid gap-4 ${isMobile ? 'grid-cols-3 gap-2' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                {uniqueStates.map(state => {
                  const allStateCoupons = coupons.filter(c => c.state === state);
                  const filteredStateCoupons = filteredCoupons.filter(c => c.state === state);

                  const allAmount = allStateCoupons.reduce((sum, c) => sum + (c.amount || 0), 0);
                  const filteredAmount = filteredStateCoupons.reduce((sum, c) => sum + (c.amount || 0), 0);

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
                  const totalAmount = filteredCoupons.reduce((sum, c) => sum + (c.amount || 0), 0);
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
                        <th className="px-2 py-2 text-left font-medium">Номер</th>
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
                              {(coupon.can_change_fuel || false) && (coupon.is_unused || false) && (
                                <span className="text-yellow-400 text-xs">🔄 Можно сменить</span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-white font-semibold text-xs">{coupon.fuel_type || 'АИ-95'}</span>
                              <span className="text-slate-300 text-xs">{(coupon.fuel_price || 46.00).toFixed(2)} ₽/л</span>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-white text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-xs">{(coupon.fuel_rest || (coupon.amount || 0) / (coupon.fuel_price || 46.00)).toFixed(1)} л</span>
                              <span className="text-slate-300 text-xs">{((coupon.fuel_rest || (coupon.amount || 0) / (coupon.fuel_price || 46.00)) * (coupon.fuel_price || 46.00)).toFixed(0)} ₽</span>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            {getCompactStatusBadge(coupon.state)}
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
                      <TableHead className="text-slate-300 min-w-[100px]">Тип топлива</TableHead>
                      <TableHead className="text-slate-300 min-w-[100px]">Цена за литр</TableHead>
                      <TableHead className="text-slate-300 min-w-[120px]">Остаток (л)</TableHead>
                      <TableHead className="text-slate-300 min-w-[100px]">Остаток (₽)</TableHead>
                      <TableHead className="text-slate-300 min-w-[100px]">Статус</TableHead>
                      <TableHead className="text-slate-300 min-w-[120px]">Срок действия</TableHead>
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
                            {(coupon.can_change_fuel || false) && (coupon.is_unused || false) && (
                              <span className="text-yellow-400 text-xs flex items-center gap-1">
                                🔄 Можно сменить топливо
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm min-w-[100px] text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-semibold text-blue-300">{coupon.fuel_type || 'АИ-95'}</span>
                            <span className="text-xs text-slate-400">
                              {(coupon.fuel_used || 0) > 0 ? `Исп: ${(coupon.fuel_used || 0).toFixed(1)}л` : 'Не использован'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm min-w-[100px] text-right">
                          <span className="font-mono">{(coupon.fuel_price || 46.00).toFixed(2)} ₽</span>
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm min-w-[120px] text-right font-bold">
                          <div className="flex flex-col items-end">
                            <span className="text-green-400 font-bold">{(coupon.fuel_rest || (coupon.amount || 0) / (coupon.fuel_price || 46.00)).toFixed(1)} л</span>
                            <span className="text-xs text-slate-400">
                              из {(coupon.fuel_amount || (coupon.amount || 0) / (coupon.fuel_price || 46.00)).toFixed(1)} л
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm min-w-[100px] text-right font-bold">
                          <span className="text-green-400">{((coupon.fuel_rest || (coupon.amount || 0) / (coupon.fuel_price || 46.00)) * (coupon.fuel_price || 46.00)).toFixed(2)} ₽</span>
                        </TableCell>
                        <TableCell className="min-w-[100px]">
                          {getStatusBadge(coupon.state)}
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm min-w-[120px]">
                          <div className="flex flex-col">
                            <span className="text-xs">
                              {coupon.expires_at ? safeDateFormat(coupon.expires_at, date => date.toLocaleDateString('ru-RU')) : '-'}
                            </span>
                            <span className="text-xs text-slate-400">
                              {coupon.expires_at ? `(истекает через ${Math.ceil((new Date(coupon.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} дн.)` : '30 дней'}
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
                  <div>{getStatusBadge(selectedCoupon.state)}</div>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-700 bg-blue-900/30 px-2 -mx-2 rounded">
                  <span className="text-slate-300 font-medium">Тип топлива:</span>
                  <span className="text-blue-300 font-bold text-lg">{selectedCoupon.fuel_type || 'АИ-95'}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Цена за литр:</span>
                  <span className="text-white font-mono text-sm">{(selectedCoupon.fuel_price || 46.00).toFixed(2)} ₽/л</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-700 bg-green-900/30 px-2 -mx-2 rounded">
                  <span className="text-slate-300 font-medium">Остаток:</span>
                  <div className="text-right">
                    <div className="text-green-300 font-bold text-lg">{(selectedCoupon.fuel_rest || (selectedCoupon.amount || 0) / (selectedCoupon.fuel_price || 46.00)).toFixed(1)} литров</div>
                    <div className="text-slate-400 text-xs">на сумму {((selectedCoupon.fuel_rest || (selectedCoupon.amount || 0) / (selectedCoupon.fuel_price || 46.00)) * (selectedCoupon.fuel_price || 46.00)).toFixed(2)} ₽</div>
                  </div>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Использовано:</span>
                  <span className="text-white font-mono text-sm">
                    {(selectedCoupon.fuel_used || 0).toFixed(1)} л из {(selectedCoupon.fuel_amount || (selectedCoupon.amount || 0) / (selectedCoupon.fuel_price || 46.00)).toFixed(1)} л
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Дата выдачи:</span>
                  <span className="text-white font-mono text-xs">
                    {safeDateFormat(selectedCoupon.date, date => date.toLocaleString('ru-RU'))}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Срок действия:</span>
                  <div className="text-right">
                    <div className="text-white font-mono text-xs">
                      {selectedCoupon.expires_at ? safeDateFormat(selectedCoupon.expires_at, date => date.toLocaleDateString('ru-RU')) : 'Через 30 дней'}
                    </div>
                    <div className="text-slate-400 text-xs">
                      {selectedCoupon.expires_at ? `(осталось ${Math.ceil((new Date(selectedCoupon.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} дней)` : '(30 дней с момента выдачи)'}
                    </div>
                  </div>
                </div>

                {(selectedCoupon.can_change_fuel || false) && (selectedCoupon.is_unused || false) && (
                  <div className="flex justify-between py-2 border-b border-slate-700 bg-yellow-900/30 px-2 -mx-2 rounded">
                    <span className="text-slate-300 font-medium">Смена топлива:</span>
                    <div className="text-right">
                      <div className="text-yellow-300 font-bold">🔄 Доступна</div>
                      <div className="text-slate-400 text-xs">Можно поменять тип топлива</div>
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