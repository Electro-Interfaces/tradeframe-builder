import React, { useState, useMemo, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PriceCard } from "@/components/prices/PriceCard";
import { PriceHistoryTable } from "@/components/prices/PriceHistoryTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  History,
  CheckCircle,
  Clock,
  XCircle,
  Fuel,
  CalendarIcon,
  Eye,
  Edit,
  Plus,
  Calendar as CalendarDays,
  AlertCircle,
  TrendingUp,
  Archive,
  RefreshCw,
  Upload,
  AlertTriangle,
  Save,
  X,
  HelpCircle
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useSelection } from "@/contexts/SelectionContext";
import { tradingPointsService } from "@/services/tradingPointsService";
import {
  tradingNetworkAPI,
  TradingNetworkPrice,
  TradingNetworkService
} from "@/services/tradingNetworkAPI";
// import { nomenclatureService } from "@/services/nomenclatureService"; // Удален - не используется
import { FuelNomenclature } from "@/types/nomenclature";
import { pricesCacheService, CachedFuelPrice } from "@/services/pricesCache";
import { DataSourceIndicator, DataSourceInfo, useDataSourceInfo } from "@/components/data-source/DataSourceIndicator";
import { externalPricesService, ExternalPrice } from "@/services/externalPricesService";
import { stsApiService, Price as STSPrice, PriceScheduleEntry } from "@/services/stsApi";
import { RetailPricingDashboard } from "@/components/pricing/RetailPricingDashboard";
import { auditLogService } from "@/services/auditLogService";

// Types - теперь используем CachedFuelPrice как основной тип
type FuelPrice = CachedFuelPrice;

interface PricePackage {
  id: string;
  tradingPointId: string;
  tradingPointName: string;
  applyAt: string;
  authorName: string;
  createdAt: string;
  status: 'draft' | 'scheduled' | 'active' | 'cancelled';
  lines: PricePackageLine[];
}

interface PricePackageLine {
  fuelId: string;
  fuelType: string;
  priceNet: number;
  vatRate: number;
  unit: string;
  status: 'active' | 'scheduled' | 'cancelled';
}

interface PriceJournalEntry {
  id: string;
  timestamp: string;
  fuelType: string;
  fuelCode: string;
  priceNet: number;
  priceGross: number;
  vatRate: number;
  source: 'manual' | 'import' | 'api';
  packageId: string;
  status: 'applied' | 'scheduled' | 'cancelled';
  authorName: string;
  tradingPoint: string;
}


// Validation schemas
const priceFormSchema = z.object({
  fuelId: z.string().min(1, "Выберите вид топлива"),
  priceNet: z.number().min(0, "Цена должна быть положительной"),
  vatRate: z.number().optional(),
  unit: z.string().min(1, "Выберите единицу измерения"),
  applyAt: z.date({ required_error: "Укажите дату применения" }),
  comment: z.string().optional(),
  overrideNetwork: z.boolean().default(false),
  fixUntil: z.date().optional()
});

type PriceFormData = z.infer<typeof priceFormSchema>;

export default function Prices() {
  const isMobile = useIsMobile();
  const { selectedTradingPoint, selectedNetwork } = useSelection();
  const { hasExternalDatabase } = useDataSourceInfo();
  
  const [currentPrices, setCurrentPrices] = useState<FuelPrice[]>([]);
  const [journalEntries, setJournalEntries] = useState<PriceJournalEntry[]>([]);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isJournalDialogOpen, setIsJournalDialogOpen] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState<FuelPrice | null>(null);
  // Простая номенклатура топлива без загрузки из БД
  const fuelNomenclature = [
    { id: '1', name: 'АИ-92', internal_code: 'AI92', network_api_code: '2', status: 'active' as const },
    { id: '2', name: 'АИ-95', internal_code: 'AI95', network_api_code: '3', status: 'active' as const },
    { id: '3', name: 'АИ-98', internal_code: 'AI98', network_api_code: '4', status: 'active' as const },
    { id: '4', name: 'ДТ', internal_code: 'DT', network_api_code: '5', status: 'active' as const },
    { id: '5', name: 'Газ', internal_code: 'GAS', network_api_code: '6', status: 'active' as const }
  ];
  
  // Состояния для работы с API торговой сети
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [networkServices, setNetworkServices] = useState<TradingNetworkService[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  // Состояния для inline-редактирования цен
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);
  
  // Состояния для работы с внешним API
  const [dataSourceType, setDataSourceType] = useState<'external-api' | 'cache' | 'sts-api'>('cache');
  const [externalPricesConfigured, setExternalPricesConfigured] = useState(false);
  const [loadingFromExternalAPI, setLoadingFromExternalAPI] = useState(false);
  const [stsApiConfigured, setStsApiConfigured] = useState(false);
  const [loadingFromSTSAPI, setLoadingFromSTSAPI] = useState(false);

  // Состояния для установки цен через STS API
  const [isSetPricesDialogOpen, setIsSetPricesDialogOpen] = useState(false);
  const [pricesForUpdate, setPricesForUpdate] = useState<Array<{ fuel_type: string; price: number; currentPrice?: number }>>([]);
  const [effectiveDateTime, setEffectiveDateTime] = useState<Date>(new Date());
  const [isSettingPrices, setIsSettingPrices] = useState(false);

  // Состояния для журнала изменения цен
  const [priceSchedule, setPriceSchedule] = useState<PriceScheduleEntry[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [isPriceHistoryDialogOpen, setIsPriceHistoryDialogOpen] = useState(false);
  const [initialLoadTriggered, setInitialLoadTriggered] = useState(false);
  const [pageReady, setPageReady] = useState(true);


  const form = useForm<PriceFormData>({
    resolver: zodResolver(priceFormSchema),
    defaultValues: {
      priceNet: 0,
      vatRate: 0,
      unit: "Л",
      applyAt: new Date(),
      overrideNetwork: false
    }
  });

  // Упрощенная автоматическая загрузка цен при выборе торговой точки
  useEffect(() => {
    // Обеспечиваем правильную настройку STS API
    const config = ensureSTSApiConfigured();

    // Проверяем, что API действительно настроен
    const isConfigured = !!(config && config.enabled && config.url && config.username && config.password);
    setStsApiConfigured(isConfigured);

    // Автоматически загружаем данные цен при выборе торговой точки
    if (selectedTradingPoint && selectedTradingPoint !== 'all') {
      loadPricesFromSTSAPI();

      // Загружаем историю цен только если API настроен, передаем isConfigured как параметр
      if (isConfigured) {
        loadPriceSchedule(isConfigured);
      } else {
        setPriceSchedule([]);
      }
    } else {
      // Если торговая точка не выбрана, сбрасываем состояние
      setCurrentPrices([]);
      setPriceSchedule([]);
      setIsInitialLoading(false);
    }
    setPageReady(true);
  }, [selectedTradingPoint])

  // Проверяем настройку внешнего API при инициализации
  useEffect(() => {
    setExternalPricesConfigured(externalPricesService.isConfigured());
  }, [hasExternalDatabase]);

  // Номенклатура топлива не используется - удалена загрузка из БД

  // Просто показываем все цены без фильтрации
  const filteredPrices = currentPrices;

  // Utility functions
  const formatPrice = (value: number, isInKopecks: boolean = true) => {
    if (isInKopecks) {
      return (value / 100).toFixed(2) + " ₽";
    } else {
      return value.toFixed(2) + " ₽";
    }
  };

  const calculateGrossPrice = (net: number, vatRate: number) => {
    return Math.round(net * (1 + vatRate / 100));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "scheduled": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "expired": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active": return "Активно";
      case "scheduled": return "Запланировано";
      case "expired": return "Истёкло";
      default: return "Неизвестно";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle className="w-4 h-4" />;
      case "scheduled": return <Clock className="w-4 h-4" />;
      case "expired": return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case "manual": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "import": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "api": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getSourceText = (source: string) => {
    switch (source) {
      case "manual": return "Ручное";
      case "import": return "Импорт";
      case "api": return "API";
      default: return "Неизвестно";
    }
  };


  // Функция для настройки STS API с правильными параметрами
  const ensureSTSApiConfigured = () => {
    
    const correctConfig = {
      url: 'https://pos.autooplata.ru/tms',
      username: 'UserApi',
      password: 'lHQfLZHzB3tn',
      enabled: true,
      timeout: 30000,
      retryAttempts: 3,
      refreshInterval: 20 * 60 * 1000 // 20 минут
    };
    
    // Проверяем текущую конфигурацию
    const currentConfig = localStorage.getItem('sts-api-config');
    let needsUpdate = false;
    
    if (currentConfig) {
      try {
        const parsed = JSON.parse(currentConfig);
        // Проверяем, что все нужные параметры совпадают
        if (parsed.url !== correctConfig.url || 
            parsed.username !== correctConfig.username || 
            parsed.password !== correctConfig.password ||
            !parsed.enabled) {
          needsUpdate = true;
        }
      } catch {
        needsUpdate = true;
      }
    } else {
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      localStorage.setItem('sts-api-config', JSON.stringify(correctConfig));
    }
    
    return correctConfig;
  };

  // Загрузка цен из STS API (упрощенная версия без дублирования авторизации)
  const loadPricesFromSTSAPI = async () => {
    setLoadingFromSTSAPI(true);
    setDataSourceType('sts-api');
    setIsInitialLoading(true);

    try {
      // Обеспечиваем правильную настройку STS API
      ensureSTSApiConfigured();
      
      // Получаем полный объект торговой точки для получения external_id
      if (!selectedTradingPoint || selectedTradingPoint === 'all') {
        throw new Error('Выберите конкретную торговую точку для получения цен из STS API');
      }

      // Загружаем полные данные торговой точки
      
      const tradingPointObject = await tradingPointsService.getById(selectedTradingPoint);
      if (!tradingPointObject) {
        throw new Error('Не удалось загрузить данные торговой точки');
      }


      // Получаем параметры из селекторов приложения
      const contextParams = {
        networkId: selectedNetwork?.external_id || selectedNetwork?.code || '1',
        tradingPointId: tradingPointObject.external_id || '1'
      };
      

      // Загружаем цены из STS API (stsApiService сам управляет авторизацией)
      const stsPrices = await stsApiService.getPrices(contextParams);
      
      
      if (stsPrices && stsPrices.length > 0) {
        // Преобразуем данные STS API в формат страницы
        const transformedPrices: FuelPrice[] = stsPrices
          .filter(stsPrice => stsPrice && stsPrice.id && stsPrice.fuelType)
          .map((stsPrice: STSPrice, index) => {
          
          const mapped = {
            id: String(stsPrice.id || `temp_${index}`),
            fuelType: stsPrice.fuelType || 'Неизвестно',
            fuelCode: stsPrice.fuelType || 'UNKNOWN',
            priceNet: 0, // Не используется
            vatRate: 0, // Не используется
            priceGross: Number(stsPrice.price) || 0,
            unit: "Л",
            appliedFrom: stsPrice.effectiveDate,
            status: stsPrice.status as any,
            tradingPoint: selectedTradingPoint && typeof selectedTradingPoint === 'object' ? selectedTradingPoint.name : 'Неизвестно',
            networkId: selectedTradingPoint && typeof selectedTradingPoint === 'object' ? selectedTradingPoint.network_id : selectedNetwork?.id || '',
            source: 'sts-api'
          };
          
          return mapped;
        });

        if (transformedPrices && transformedPrices.length > 0) {
          setCurrentPrices(transformedPrices);
        } else {
          setCurrentPrices([]);
        }
        setIsInitialLoading(false); // ВАЖНО: Сбрасываем состояние загрузки
        
        // Цены загружены - уведомление убрано
      } else {
        setCurrentPrices([]);
        setIsInitialLoading(false); // ВАЖНО: Сбрасываем состояние загрузки
        
        // Fallback to cache if no STS data
        if (selectedTradingPoint) {
          const tradingPointId = typeof selectedTradingPoint === 'string' ? 
            selectedTradingPoint : selectedTradingPoint.id;
          await loadPricesFromCache(tradingPointId);
        }
      }
    } catch (error: any) {
      setIsInitialLoading(false);
      setStsApiConfigured(true); // Синхронизируем состояние
      
      toast({
        title: "Ошибка загрузки цен",
        description: error instanceof Error ? error.message : 'Произошла ошибка при загрузке данных цен',
        variant: "destructive"
      });
      
      // Fallback to cache on error
      if (selectedTradingPoint) {
        const tradingPointId = typeof selectedTradingPoint === 'string' ? 
          selectedTradingPoint : selectedTradingPoint.id;
        await loadPricesFromCache(tradingPointId);
      }
    } finally {
      setLoadingFromSTSAPI(false);
    }
  };

  // Функция для подготовки диалога установки цен
  const handleSetPrices = () => {
    if (!stsApiConfigured) {
      toast({
        title: "API СТС не настроен",
        description: "Настройте подключение к API СТС в разделе настроек",
        variant: "destructive"
      });
      return;
    }

    if (!selectedTradingPoint || selectedTradingPoint === 'all') {
      toast({
        title: "Выберите торговую точку",
        description: "Для установки цен необходимо выбрать конкретную торговую точку",
        variant: "destructive"
      });
      return;
    }

    // Подготавливаем список цен для изменения на основе текущих цен
    const pricesData = currentPrices.map((price, index) => {

      // Получаем цену в рублях с учетом источника данных
      let currentPriceValue = 0;

      if (price.priceGross && typeof price.priceGross === 'number') {
        // Если источник STS API, цена уже в рублях
        // Если другой источник, цена в копейках
        if (price.source === 'sts-api') {
          currentPriceValue = price.priceGross;
        } else {
          currentPriceValue = price.priceGross / 100;
        }
      } else if (price.priceWithVAT && typeof price.priceWithVAT === 'number') {
        currentPriceValue = price.priceWithVAT;
      } else if (price.price && typeof price.price === 'number') {
        currentPriceValue = price.price;
      }

      const result = {
        fuel_type: price.fuelType || price.fuel_type || 'Неизвестно',
        price: currentPriceValue,
        currentPrice: currentPriceValue
      };

      return result;
    });

    setPricesForUpdate(pricesData);

    // Устанавливаем дату на следующий день в 00:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    setEffectiveDateTime(tomorrow);

    setIsSetPricesDialogOpen(true);
  };

  // Функция установки цен через STS API
  const handleConfirmSetPrices = async () => {
    if (!selectedNetwork || !selectedTradingPoint) {
      toast({
        title: "Ошибка",
        description: "Не выбрана сеть или торговая точка",
        variant: "destructive"
      });
      return;
    }

    setIsSettingPrices(true);
    try {
      // Получаем полный объект торговой точки для получения external_id
      const tradingPoint = await tradingPointsService.getById(selectedTradingPoint);
      if (!tradingPoint?.external_id) {
        toast({
          title: "Ошибка",
          description: "У выбранной торговой точки не указан external_id для API",
          variant: "destructive"
        });
        return;
      }

      const contextParams = {
        networkId: selectedNetwork.external_id,
        tradingPointId: tradingPoint.external_id
      };

      // Готовим массив цен для API (цены передаются в рублях согласно новой спецификации)
      const prices = pricesForUpdate.map(item => ({
        fuel_type: item.fuel_type,
        price: item.price // Цены в рублях, не конвертируем в копейки
      }));


      // Формируем ISO дату в локальном времени (без преобразования в UTC)
      // Это сохранит выбранную пользователем дату как есть
      const year = effectiveDateTime.getFullYear();
      const month = String(effectiveDateTime.getMonth() + 1).padStart(2, '0');
      const day = String(effectiveDateTime.getDate()).padStart(2, '0');
      const hours = String(effectiveDateTime.getHours()).padStart(2, '0');
      const minutes = String(effectiveDateTime.getMinutes()).padStart(2, '0');
      const seconds = String(effectiveDateTime.getSeconds()).padStart(2, '0');

      const effectiveDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;


      const result = await stsApiService.setPrices(prices, effectiveDate, contextParams);

      if (result.success) {
        // Логируем изменение цен для каждого вида топлива
        for (const priceItem of pricesForUpdate) {
          await auditLogService.logPriceChange(
            tradingPoint.name || 'Неизвестно',
            tradingPoint.id,
            priceItem.fuel_type,
            priceItem.currentPrice || 0,
            priceItem.price,
            `Установка цены с датой ${effectiveDate}`
          );
        }

        toast({
          title: "Цены установлены",
          description: result.message || "Новые цены успешно установлены",
          variant: "default"
        });

        setIsSetPricesDialogOpen(false);

        // Обновляем цены после установки
        await loadPricesFromSTSAPI();
      } else {
        toast({
          title: "Ошибка установки цен",
          description: result.message || "Не удалось установить новые цены",
          variant: "destructive"
        });
      }

    } catch (error: any) {
      toast({
        title: "Ошибка установки цен",
        description: error.message || "Произошла ошибка при установке цен",
        variant: "destructive"
      });
    } finally {
      setIsSettingPrices(false);
    }
  };

  // Функция загрузки журнала изменения цен
  const loadPriceSchedule = async (apiConfigured: boolean = stsApiConfigured) => {
    if (!selectedNetwork || !selectedTradingPoint || selectedTradingPoint === 'all') {
      setPriceSchedule([]);
      return;
    }

    if (!apiConfigured) {
      setPriceSchedule([]);
      return;
    }

    setIsLoadingSchedule(true);
    try {
      // Получаем полный объект торговой точки для получения external_id
      const tradingPoint = await tradingPointsService.getById(selectedTradingPoint);
      if (!tradingPoint?.external_id) {
        return;
      }

      // Загружаем изменения цен с 01.09.2025
      const startDate = '2025-09-01T00:00:00';

      const schedule = await stsApiService.getPriceSchedule(
        selectedNetwork.external_id,
        tradingPoint.external_id,
        startDate
      );

      setPriceSchedule(schedule);

    } catch (error: any) {
      toast({
        title: "Ошибка загрузки журнала",
        description: error.message || "Не удалось загрузить историю изменения цен",
        variant: "destructive"
      });
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  // Функция открытия диалога истории цен
  const handleShowPriceHistory = async () => {
    setIsPriceHistoryDialogOpen(true);
    await loadPriceSchedule(true); // Явно передаем true, т.к. диалог доступен только при настроенном API
  };

  const refreshPricesFromNetwork = async () => {
    const tradingPointId = typeof selectedTradingPoint === 'string' 
      ? selectedTradingPoint 
      : selectedTradingPoint?.id;
    
    if (!tradingPointId) {
      toast({
        title: "Ошибка",
        description: "Выберите торговую точку",
        variant: "destructive"
      });
      return;
    }

    setIsUpdatingPrices(true);
    try {
      const prices = await pricesCacheService.refreshPricesFromNetwork(tradingPointId);
      setCurrentPrices(prices);

      // Цены обновлены - уведомление убрано (только на мобильных и так не показывалось)
    } catch (error) {
      if (!isMobile) {
        toast({
          title: "Ошибка обновления",
          description: error instanceof Error ? error.message : "Не удалось обновить цены",
          variant: "destructive"
        });
      }
    } finally {
      setIsUpdatingPrices(false);
    }
  };

  // Pull-to-refresh с использованием хука
  const handleRefreshData = async () => {
    if (!selectedTradingPoint || selectedTradingPoint === 'all') return;
    await loadPricesFromSTSAPI();
    await loadPriceSchedule(stsApiConfigured); // Передаем текущее состояние API
  };

  const {
    pullState,
    pullDistance,
    scrollContainerRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  } = usePullToRefresh({
    onRefresh: handleRefreshData,
    enabled: isMobile,
    pullThreshold: 80,
    maxPullDistance: 120,
    indicatorAppearThreshold: 30
  });

  // Handlers
  const handleCreatePrice = () => {
    form.reset();
    setSelectedPrice(null);
    setIsFormDialogOpen(true);
  };

  const handleEditPrice = (price: FuelPrice) => {
    setSelectedPrice(price);
    const fuelType = fuelNomenclature.find(f => f.name === price.fuelType);
    form.reset({
      fuelId: fuelType?.id || "",
      priceNet: price.priceNet / 100, // convert to rubles
      vatRate: 0,
      unit: price.unit,
      applyAt: new Date(),
      overrideNetwork: false
    });
    setIsFormDialogOpen(true);
  };

  const onSubmit = (data: PriceFormData) => {
    const grossPrice = data.priceNet * 100; // Цена в копейках
    const fuelType = fuelNomenclature.find(f => f.id === data.fuelId);
    
    if (selectedPrice) {
      // Edit existing
      setCurrentPrices(prev => prev.map(p => 
        p.id === selectedPrice.id 
          ? {
              ...p,
              priceNet: data.priceNet * 100,
              vatRate: 0,
              priceGross: grossPrice,
              unit: data.unit,
              appliedFrom: format(data.applyAt, "dd.MM.yyyy HH:mm"),
              status: data.applyAt > new Date() ? "scheduled" : "active"
            }
          : p
      ));
      if (!isMobile) {
        toast({
          title: "Цена обновлена",
          description: `Цена на ${fuelType?.name} успешно обновлена.`,
        });
      }
    } else {
      // Create new
      const newPrice: FuelPrice = {
        id: Date.now().toString(),
        fuelType: fuelType?.name || "",
        fuelCode: fuelType?.internalCode || "",
        priceNet: data.priceNet * 100,
        vatRate: 0,
        priceGross: grossPrice,
        unit: data.unit,
        appliedFrom: format(data.applyAt, "dd.MM.yyyy HH:mm"),
        status: data.applyAt > new Date() ? "scheduled" : "active",
        tradingPoint: "АЗС-1 на Московской",
        networkId: "net1"
      };
      setCurrentPrices(prev => [...prev, newPrice]);
      if (!isMobile) {
        toast({
          title: "Цена создана",
          description: `Цена на ${fuelType?.name} успешно создана.`,
        });
      }
    }

    // Add journal entry
    const journalEntry: PriceJournalEntry = {
      id: Date.now().toString(),
      timestamp: format(new Date(), "dd.MM.yyyy HH:mm"),
      fuelType: fuelType?.name || "",
      fuelCode: fuelType?.internalCode || "",
      priceNet: data.priceNet * 100,
      priceGross: grossPrice,
      vatRate: 0,
      source: "manual",
      packageId: `pkg_${Date.now()}`,
      status: data.applyAt > new Date() ? "scheduled" : "applied",
      authorName: "Текущий пользователь",
      tradingPoint: "АЗС-1 на Московской"
    };
    setJournalEntries(prev => [journalEntry, ...prev]);

    setIsFormDialogOpen(false);
  };

  // Функция получения service_code по типу топлива (для применения цен)
  const getServiceCode = (fuelType: string): number | null => {
    const service = networkServices.find(s => s.service_name === fuelType);
    return service?.service_code || null;
  };

  // Функции для inline-редактирования
  const handleInlineEdit = (priceId: string, currentGrossPrice: number) => {
    setEditingPriceId(priceId);
    setEditingValue((currentGrossPrice / 100).toFixed(2)); // Convert kopeks to rubles
    setHasChanges(false);
  };

  const handleEditingValueChange = (value: string) => {
    setEditingValue(value);
    const currentPrice = currentPrices.find(p => p.id === editingPriceId);
    const currentGrossPrice = currentPrice ? (currentPrice.priceGross / 100).toFixed(2) : "0";
    setHasChanges(value !== currentGrossPrice);
  };

  const handleCancelInlineEdit = () => {
    setEditingPriceId(null);
    setEditingValue("");
    setHasChanges(false);
  };

  const handleSaveInlinePrice = async () => {
    if (!editingPriceId || !hasChanges) return;
    
    const price = currentPrices.find(p => p.id === editingPriceId);
    if (!price) return;

    try {
      const newGrossPrice = Math.round(parseFloat(editingValue) * 100); // Convert to kopeks
      const newNetPrice = newGrossPrice; // Без НДС

      // Save to API through tradingNetworkAPI
      const tradingPointId = typeof selectedTradingPoint === 'string' 
        ? selectedTradingPoint 
        : selectedTradingPoint?.id;
      
      if (tradingPointId) {
        const serviceCode = getServiceCode(price.fuelType);
        if (serviceCode) {
          // Convert trading point id to station number for API call
          const stationNumber = parseInt(tradingPointId.replace('point', '')) + 76; // point1 -> 77, etc.
          
          await tradingNetworkAPI.setPrices(
            stationNumber,
            { [serviceCode.toString()]: newGrossPrice / 100 }, // API expects price in rubles
            new Date().toISOString()
          );
        }
      }

      // Update local state
      setCurrentPrices(prev => prev.map(p => 
        p.id === editingPriceId 
          ? {
              ...p,
              priceNet: newNetPrice,
              priceGross: newGrossPrice,
              appliedFrom: new Date().toLocaleString('ru-RU')
            }
          : p
      ));

      // Add journal entry
      const journalEntry: PriceJournalEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString('ru-RU'),
        fuelType: price.fuelType,
        fuelCode: price.fuelCode,
        priceNet: newNetPrice,
        priceGross: newGrossPrice,
        vatRate: 0,
        source: "manual",
        packageId: `pkg_${Date.now()}`,
        status: "applied",
        authorName: "Текущий пользователь",
        tradingPoint: "АЗС-1 на Московской"
      };
      setJournalEntries(prev => [journalEntry, ...prev]);

      if (!isMobile) {
        toast({
          title: "Цена обновлена",
          description: `Цена на ${price.fuelType} успешно обновлена до ${editingValue} ₽/л`,
        });
      }

      handleCancelInlineEdit();
    } catch (error) {
      if (!isMobile) {
        toast({
          title: "Ошибка сохранения",
          description: "Не удалось сохранить новую цену",
          variant: "destructive"
        });
      }
    }
  };


  // Проверка выбора торговой точки
  if (!selectedTradingPoint) {
    return (
      <MainLayout fullWidth={true}>
        <div className="w-full h-full px-4 md:px-6 lg:px-8">
          <div className="mb-6 pt-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">Цены по видам топлива</h1>
              <span className="text-xs text-green-400 font-mono">🔧 Версия: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
          <div className="bg-slate-800 mb-6 w-full rounded-lg">
            <div className="px-4 md:px-6 py-4">
              <EmptyState 
                title="Выберите торговую точку" 
                description="Для управления ценами на топливо необходимо выбрать торговую точку из выпадающего списка выше"
                className="py-16"
              />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth={true}>
      <div
        ref={scrollContainerRef}
        className="w-full h-full px-4 md:px-6 lg:px-8 relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: isMobile && pullState !== 'idle' ? `translateY(${pullDistance * 0.5}px)` : 'translateY(0)',
          transition: pullState === 'idle' ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {/* Стандартный мобильный pull-to-refresh индикатор */}
        {isMobile && pullState !== 'idle' && pullDistance >= 30 && (
          <div
            className="absolute top-0 left-0 right-0 flex justify-center items-center z-50"
            style={{
              transform: `translateY(-${Math.max(0, 80 - pullDistance)}px)`,
              opacity: Math.min(1, (pullDistance - 30) / 40)
            }}
          >
            <div className="bg-white/95 backdrop-blur-sm text-slate-700 px-4 py-2 rounded-full shadow-lg border border-slate-200/50 flex items-center gap-2">
              {pullState === 'refreshing' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="text-sm font-medium">Обновление...</span>
                </>
              ) : pullState === 'canRefresh' ? (
                <>
                  <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium text-green-600">Отпустите для обновления</span>
                </>
              ) : (
                <>
                  <div
                    className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full"
                    style={{
                      transform: `rotate(${pullDistance * 3}deg)`
                    }}
                  />
                  <span className="text-sm font-medium">Потяните для обновления</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-white">Цены</h1>
            <div className={`flex ${isMobile ? 'gap-2' : 'gap-3'} items-center`}>
              {!isMobile && (
                <Button
                  onClick={loadPricesFromSTSAPI}
                  variant="outline"
                  size="sm"
                  disabled={loadingFromSTSAPI}
                  className="border-slate-600 text-white hover:bg-slate-700"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingFromSTSAPI ? 'animate-spin' : ''}`} />
                </Button>
              )}
              {stsApiConfigured && currentPrices.length > 0 && (
                <Button
                  onClick={handleSetPrices}
                  variant="outline"
                  size="sm"
                  disabled={isSettingPrices || !selectedTradingPoint || selectedTradingPoint === 'all'}
                  className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
                >
                  <Edit className={`h-4 w-4 ${isMobile ? '' : 'mr-2'}`} />
                  {!isMobile && "Изменить цены"}
                </Button>
              )}
            </div>
          </div>
        </div>


        {/* Плитки цен */}
        {isInitialLoading ? (
          <div className="pb-6">
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'}`}>
              {/* Skeleton плитки для состояния загрузки */}
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-600 rounded-lg animate-pulse"></div>
                      <div>
                        <div className="h-4 w-16 bg-slate-600 rounded animate-pulse mb-2"></div>
                        <div className="h-3 w-12 bg-slate-700 rounded animate-pulse"></div>
                      </div>
                    </div>
                    <div className="h-5 w-20 bg-slate-600 rounded animate-pulse"></div>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between">
                      <div className="h-3 w-24 bg-slate-700 rounded animate-pulse"></div>
                      <div className="h-3 w-16 bg-slate-600 rounded animate-pulse"></div>
                    </div>
                    <div className="flex justify-between">
                      <div className="h-3 w-20 bg-slate-700 rounded animate-pulse"></div>
                      <div className="h-3 w-14 bg-slate-600 rounded animate-pulse"></div>
                    </div>
                    <div className="flex justify-between border-t border-slate-600 pt-2">
                      <div className="h-3 w-16 bg-slate-700 rounded animate-pulse"></div>
                      <div className="h-5 w-20 bg-slate-600 rounded animate-pulse"></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <div className="h-3 w-14 bg-slate-700 rounded animate-pulse"></div>
                      <div className="h-3 w-8 bg-slate-600 rounded animate-pulse"></div>
                    </div>
                    <div className="flex justify-between">
                      <div className="h-3 w-24 bg-slate-700 rounded animate-pulse"></div>
                      <div className="h-3 w-20 bg-slate-600 rounded animate-pulse"></div>
                    </div>
                  </div>
                  
                  <div className={`flex gap-2 pt-3 border-t border-slate-700 ${isMobile ? 'flex-col' : 'flex-row'}`}>
                    <div className="h-8 flex-1 bg-slate-700 rounded animate-pulse"></div>
                    <div className="h-8 w-8 bg-slate-700 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredPrices.length === 0 ? (
          <div>
            <div className={`text-center ${isMobile ? 'py-8' : 'py-16'}`}>
              <div className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4`}>
                <span className={`text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>💰</span>
              </div>
              <h3 className={`font-semibold text-white mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
                Нет цен
              </h3>
              <p className={`text-slate-400 mb-4 ${isMobile ? 'text-sm' : 'text-base'}`}>
                Создайте первую цену на топливо
              </p>
              <Button 
                onClick={handleCreatePrice}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size={isMobile ? "default" : "sm"}
              >
                <Plus className="w-4 h-4" />
                <span className={isMobile ? "ml-2" : "ml-1"}>Создать цену</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
              {filteredPrices.map((price) => (
                <PriceCard
                  key={price.id}
                  price={price}
                  isMobile={isMobile}
                  editingPriceId={editingPriceId}
                  editingValue={editingValue}
                  hasChanges={hasChanges}
                  onInlineEdit={handleInlineEdit}
                  onSaveInlinePrice={handleSaveInlinePrice}
                  onCancelInlineEdit={handleCancelInlineEdit}
                  onEditingValueChange={handleEditingValueChange}
                  formatPrice={formatPrice}
                  getStatusColor={getStatusColor}
                  getStatusText={getStatusText}
                  getStatusIcon={getStatusIcon}
                />
              ))}
            </div>
          </div>
        )}

        {/* История изменения цен */}
        {selectedTradingPoint && selectedTradingPoint !== 'all' && (
          <PriceHistoryTable
            priceSchedule={priceSchedule}
            isLoadingSchedule={isLoadingSchedule}
            isMobile={isMobile}
          />
        )}

        {/* Диалог создания/редактирования цены */}
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[95vh]' : 'max-w-2xl'}`}>
            <DialogHeader>
              <DialogTitle>
                {selectedPrice ? 'Редактировать цену' : 'Новая цена на топливо'}
              </DialogTitle>
              <DialogDescription>
                {selectedPrice
                  ? 'Измените параметры цены на выбранный вид топлива'
                  : 'Создайте новую цену для конкретного вида топлива'
                }
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {/* Вид топлива */}
                <div className="space-y-2">
                  <Label>Вид топлива *</Label>
                  <Select 
                    value={form.watch("fuelId")} 
                    onValueChange={(value) => form.setValue("fuelId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите вид топлива" />
                    </SelectTrigger>
                    <SelectContent>
                      {fuelNomenclature.map((fuel) => (
                        <SelectItem key={fuel.id} value={fuel.id}>
                          {fuel.name} ({fuel.internalCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.fuelId && (
                    <p className="text-red-500 text-sm">{form.formState.errors.fuelId.message}</p>
                  )}
                </div>

                {/* Единица измерения */}
                <div className="space-y-2">
                  <Label>Единица измерения *</Label>
                  <Select 
                    value={form.watch("unit")} 
                    onValueChange={(value) => form.setValue("unit", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Л">Литр</SelectItem>
                      <SelectItem value="Кг">Килограмм</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {/* Цена */}
                <div className="space-y-2">
                  <Label>Цена (₽) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...form.register("priceNet", { valueAsNumber: true })}
                  />
                  {form.formState.errors.priceNet && (
                    <p className="text-red-500 text-sm">{form.formState.errors.priceNet.message}</p>
                  )}
                </div>
              </div>

              {/* Дата применения */}
              <div className="space-y-2">
                <Label>Применить с *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.watch("applyAt") && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch("applyAt") ? (
                        format(form.watch("applyAt"), "dd.MM.yyyy HH:mm", { locale: ru })
                      ) : (
                        <span>Выберите дату</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.watch("applyAt")}
                      onSelect={(date) => form.setValue("applyAt", date || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Комментарий */}
              <div className="space-y-2">
                <Label>Комментарий</Label>
                <Textarea
                  placeholder="Причина изменения цены..."
                  {...form.register("comment")}
                />
              </div>

              {/* Действия */}
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsFormDialogOpen(false)}
                >
                  Отмена
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {selectedPrice ? 'Обновить' : 'Создать'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Диалог журнала изменений */}
        <Dialog open={isJournalDialogOpen} onOpenChange={setIsJournalDialogOpen}>
          <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[95vh] overflow-y-auto' : 'max-w-6xl max-h-[85vh]'}`}>
            <DialogHeader className="pb-4 border-b border-slate-700">
              <DialogTitle className="text-xl font-semibold text-white">
                Журнал изменения цен ({journalEntries.length} записей)
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                История всех изменений цен с указанием времени, источника и автора
              </DialogDescription>
            </DialogHeader>
            
            {/* Таблица журнала */}
            <div className="overflow-auto max-h-[60vh]">
              {journalEntries.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  Журнал изменений пуст
                </div>
              ) : (
                <div className="w-full">
                  <div className="overflow-x-auto w-full rounded-lg border border-slate-600">
                    <table className="w-full text-sm min-w-full table-fixed">
                      <thead className="bg-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-slate-200 font-medium" style={{width: '12%'}}>ВРЕМЯ</th>
                          <th className="px-4 py-3 text-left text-slate-200 font-medium" style={{width: '15%'}}>ТОПЛИВО</th>
                          <th className="px-4 py-3 text-left text-slate-200 font-medium" style={{width: '24%'}}>ЦЕНА</th>
                          <th className="px-4 py-3 text-left text-slate-200 font-medium" style={{width: '10%'}}>ИСТОЧНИК</th>
                          <th className="px-4 py-3 text-left text-slate-200 font-medium" style={{width: '12%'}}>СТАТУС</th>
                          <th className="px-4 py-3 text-left text-slate-200 font-medium" style={{width: '15%'}}>АВТОР</th>
                          <th className="px-4 py-3 text-left text-slate-200 font-medium" style={{width: '12%'}}>ПАКЕТ ID</th>
                        </tr>
                      </thead>
                      <tbody className="bg-slate-800">
                        {journalEntries.map((entry) => (
                          <tr
                            key={entry.id}
                            className="border-b border-slate-600 hover:bg-slate-700 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="text-white font-mono text-xs">
                                {entry.timestamp}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <div className="font-medium text-white text-sm">{entry.fuelType}</div>
                                <div className="text-xs text-slate-400">{entry.fuelCode}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3" colSpan={2}>
                              <div className="text-white font-medium text-center">
                                {formatPrice(entry.priceGross, entry.source !== 'sts-api')}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary" className={`text-xs ${getSourceColor(entry.source)}`}>
                                {getSourceText(entry.source)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary" className={`text-xs ${entry.status === 'applied' ? 'bg-green-500/20 text-green-400' : entry.status === 'scheduled' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                {entry.status === 'applied' ? 'Применено' : entry.status === 'scheduled' ? 'Запланировано' : 'Отменено'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-white text-sm">{entry.authorName}</div>
                            </td>
                            <td className="px-4 py-3">
                              <code className="bg-slate-600 text-slate-200 px-2 py-1 rounded text-xs">
                                {entry.packageId}
                              </code>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer журнала */}
            <div className="flex items-center justify-center pt-4 border-t border-slate-700">
              <div className="text-sm text-slate-400">
                Показано записей: {journalEntries.length}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* AlertDialog для установки цен через STS API */}
        <AlertDialog open={isSetPricesDialogOpen} onOpenChange={setIsSetPricesDialogOpen}>
          <AlertDialogContent className="max-w-4xl max-h-[90vh] bg-slate-900 border-slate-700 overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-orange-400" />
                Установка цен
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-300 text-base">
                <div className="space-y-3">
                  <p>
                    <strong>Внимание!</strong> Будут установлены новые цены для всех видов топлива на выбранной торговой точке.
                  </p>
                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-600">
                    <p className="text-sm"><strong>Сеть:</strong> {selectedNetwork?.name} (ID: {selectedNetwork?.external_id})</p>
                    <p className="text-sm"><strong>Торговая точка:</strong> {
                      typeof selectedTradingPoint === 'string' ? selectedTradingPoint : selectedTradingPoint?.name
                    }</p>
                    <p className="text-sm"><strong>Количество цен:</strong> {pricesForUpdate.length}</p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="my-6 space-y-4">
              {/* Дата и время вступления в силу */}
              <div>
                <Label className="text-white font-medium">Дата и время вступления в силу</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal mt-2 bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {effectiveDateTime ? format(effectiveDateTime, "dd.MM.yyyy HH:mm", { locale: ru }) : "Выберите дату и время"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-600" align="start">
                    <Calendar
                      mode="single"
                      selected={effectiveDateTime}
                      onSelect={(date) => {
                        if (date) {
                          const newDateTime = new Date(date);
                          newDateTime.setHours(effectiveDateTime.getHours());
                          newDateTime.setMinutes(effectiveDateTime.getMinutes());
                          setEffectiveDateTime(newDateTime);
                        }
                      }}
                      disabled={(date) => date < new Date("1900-01-01")}
                      initialFocus
                      className="bg-slate-800"
                    />
                    <div className="p-3 border-t border-slate-600">
                      <div className="flex gap-2">
                        <Input
                          type="time"
                          value={format(effectiveDateTime, "HH:mm")}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(':');
                            const newDateTime = new Date(effectiveDateTime);
                            newDateTime.setHours(parseInt(hours), parseInt(minutes));
                            setEffectiveDateTime(newDateTime);
                          }}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Список цен для изменения */}
              <div>
                <Label className="text-white font-medium">Цены для установки</Label>
                <div className="mt-2 space-y-2">
                  {pricesForUpdate.map((priceItem, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-600">
                      <div className="flex-1">
                        <div className="text-white font-medium">{priceItem.fuel_type}</div>
                        <div className="text-sm text-slate-400">
                          Текущая: {priceItem.currentPrice?.toFixed(2) || '—'} ₽
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={priceItem.price}
                          onChange={(e) => {
                            const newPrices = [...pricesForUpdate];
                            newPrices[index].price = parseFloat(e.target.value) || 0;
                            setPricesForUpdate(newPrices);
                          }}
                          className="w-40 bg-slate-700 border-slate-600 text-white text-right pr-6"
                        />
                        <span className="text-slate-400 text-sm">₽</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                Отмена
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmSetPrices}
                disabled={isSettingPrices}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isSettingPrices ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Установка...
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Установить цены
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>


      </div>
    </MainLayout>
  );
}