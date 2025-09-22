import React, { useState, useMemo, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { nomenclatureService } from "@/services/nomenclatureService";
import { FuelNomenclature } from "@/types/nomenclature";
import { pricesCacheService, CachedFuelPrice } from "@/services/pricesCache";
import { DataSourceIndicator, DataSourceInfo, useDataSourceInfo } from "@/components/data-source/DataSourceIndicator";
import { externalPricesService, ExternalPrice } from "@/services/externalPricesService";
import { stsApiService, Price as STSPrice } from "@/services/stsApi";
import { RetailPricingDashboard } from "@/components/pricing/RetailPricingDashboard";

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

// Mock data
const mockFuelTypes = [
  { id: "ai95", name: "АИ-95", code: "AI95" },
  { id: "ai92", name: "АИ-92", code: "AI92" },
  { id: "ai98", name: "АИ-98", code: "AI98" },
  { id: "dt", name: "ДТ", code: "DT" },
  { id: "gas", name: "Газ", code: "GAS" }
];

const mockCurrentPrices: FuelPrice[] = [
  {
    id: "1",
    fuelType: "АИ-95",
    fuelCode: "AI95",
    priceNet: 5000, // 50.00 руб
    vatRate: 20,
    priceGross: 6000, // 60.00 руб
    unit: "Л",
    appliedFrom: "15.12.2024 08:00",
    status: "active",
    tradingPoint: "АЗС-1 на Московской",
    networkId: "net1"
  },
  {
    id: "2",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 4750,
    vatRate: 20,
    priceGross: 5700,
    unit: "Л",
    appliedFrom: "16.12.2024 12:00",
    status: "scheduled",
    tradingPoint: "АЗС-1 на Московской",
    networkId: "net1"
  },
  {
    id: "3",
    fuelType: "ДТ",
    fuelCode: "DT",
    priceNet: 5200,
    vatRate: 20,
    priceGross: 6240,
    unit: "Л",
    appliedFrom: "14.12.2024 06:00",
    status: "expired",
    tradingPoint: "АЗС-1 на Московской",
    networkId: "net1"
  },
  {
    id: "4",
    fuelType: "АИ-98",
    fuelCode: "AI98",
    priceNet: 5500,
    vatRate: 20,
    priceGross: 6600,
    unit: "Л",
    appliedFrom: "15.12.2024 08:00",
    status: "active",
    tradingPoint: "АЗС-1 на Московской",
    networkId: "net1"
  }
];

const mockJournalEntries: PriceJournalEntry[] = [
  {
    id: "j1",
    timestamp: "15.12.2024 08:00",
    fuelType: "АИ-95",
    fuelCode: "AI95",
    priceNet: 5000,
    priceGross: 6000,
    vatRate: 20,
    source: "manual",
    packageId: "pkg1",
    status: "applied",
    authorName: "Иванов А.И.",
    tradingPoint: "АЗС-1 на Московской"
  },
  {
    id: "j2",
    timestamp: "15.12.2024 08:00",
    fuelType: "АИ-98",
    fuelCode: "AI98",
    priceNet: 5500,
    priceGross: 6600,
    vatRate: 20,
    source: "manual",
    packageId: "pkg1",
    status: "applied",
    authorName: "Иванов А.И.",
    tradingPoint: "АЗС-1 на Московской"
  },
  {
    id: "j3",
    timestamp: "16.12.2024 12:00",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 4750,
    priceGross: 5700,
    vatRate: 20,
    source: "import",
    packageId: "pkg2",
    status: "scheduled",
    authorName: "Система",
    tradingPoint: "АЗС-1 на Московской"
  }
];

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
  const [fuelNomenclature, setFuelNomenclature] = useState<FuelNomenclature[]>([]);
  
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
  const [initialLoadTriggered, setInitialLoadTriggered] = useState(false);
  const [pageReady, setPageReady] = useState(true);

  // Состояния для pull-to-refresh (стандартный мобильный подход)
  const [pullState, setPullState] = useState<'idle' | 'pulling' | 'canRefresh' | 'refreshing'>('idle');
  const [pullDistance, setPullDistance] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const startTouchRef = useRef<{ y: number; time: number } | null>(null);
  const rafId = useRef<number | null>(null);

  const PULL_THRESHOLD = 80; // Порог для активации обновления
  const MAX_PULL_DISTANCE = 120; // Максимальное расстояние растягивания
  const INDICATOR_APPEAR_THRESHOLD = 30; // Порог появления индикатора

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
    ensureSTSApiConfigured();
    setStsApiConfigured(true);

    // Автоматически загружаем данные цен при выборе торговой точки
    if (selectedTradingPoint && selectedTradingPoint !== 'all') {
      loadPricesFromSTSAPI();
    } else {
      // Если торговая точка не выбрана, сбрасываем состояние
      setCurrentPrices([]);
      setIsInitialLoading(false);
    }
    setPageReady(true);
  }, [selectedTradingPoint])

  // Проверяем настройку внешнего API при инициализации
  useEffect(() => {
    setExternalPricesConfigured(externalPricesService.isConfigured());
    
    // Проверяем настройки STS API
    const stsConfig = localStorage.getItem('sts-api-config');
    const isConfigured = !!(stsConfig && JSON.parse(stsConfig).enabled);
    setStsApiConfigured(isConfigured);
  }, [hasExternalDatabase]);

  // Загрузка номенклатуры топлива
  useEffect(() => {
    const loadFuelNomenclature = async () => {
      try {
        const filters = { 
          status: 'active' as const,
          ...(selectedTradingPoint?.network_id && { networkId: selectedTradingPoint.network_id })
        };
        const data = await nomenclatureService.getNomenclature(filters);
        
        // Удаляем дубликаты по названию топлива, оставляя только уникальные названия
        const uniqueFuelTypes = data.reduce((acc, fuel) => {
          if (!acc.some(item => item.name === fuel.name)) {
            acc.push(fuel);
          }
          return acc;
        }, [] as FuelNomenclature[]);
        
        setFuelNomenclature(uniqueFuelTypes);
      } catch (error) {
        console.error('Failed to load fuel nomenclature:', error);
        setFuelNomenclature([]);
      }
    };
    loadFuelNomenclature();
  }, [selectedTradingPoint?.network_id]);

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

  // Новые функции для работы с кэшем
  const loadPricesFromCache = async (tradingPointId: string) => {
    setIsInitialLoading(true);
    try {
      const prices = await pricesCacheService.getPricesForTradingPoint(tradingPointId);
      setCurrentPrices(prices);
    } catch (error) {
      console.error('Ошибка при загрузке цен:', error);
      toast({
        title: "Ошибка загрузки",
        description: error instanceof Error ? error.message : "Не удалось загрузить цены",
        variant: "destructive"
      });
    } finally {
      setIsInitialLoading(false);
    }
  };

  // Загрузка цен из внешнего API (по аналогии с резервуарами)
  const loadPricesFromExternalAPI = async () => {
    if (!externalPricesService.isConfigured()) {
      return;
    }

    setLoadingFromExternalAPI(true);
    try {
      
      // Получаем параметры из селекторов приложения
      const contextParams = {
        networkId: selectedNetwork?.external_id || selectedNetwork?.code,
        tradingPointId: selectedTradingPoint && selectedTradingPoint !== 'all' ? 
          (typeof selectedTradingPoint === 'string' ? selectedTradingPoint : selectedTradingPoint.id) : 
          undefined,
        status: ['active', 'scheduled'] // загружаем активные и запланированные цены
      };
      
      
      const externalPrices = await externalPricesService.getPrices(contextParams);
      
      if (externalPrices && externalPrices.length > 0) {
        // Преобразуем внешние цены в формат страницы
        const transformedPrices: FuelPrice[] = externalPrices.map(price => ({
          id: price.id,
          fuelType: price.fuel_type,
          fuelCode: price.fuel_code,
          priceNet: price.price_net,
          vatRate: price.vat_rate,
          priceGross: price.price_gross,
          unit: price.unit,
          appliedFrom: price.valid_from,
          validTo: price.valid_to,
          status: price.status as any,
          tradingPoint: price.trading_point_name || 'Неизвестно',
          networkId: price.network_id || '',
          source: 'external-api' // помечаем источник
        }));

        setCurrentPrices(transformedPrices);
        setDataSourceType('external-api');
        
        // Цены загружены - уведомление убрано
      } else {
        setDataSourceType('cache');
        // Fallback к кэшу
        if (selectedTradingPoint) {
          const tradingPointId = typeof selectedTradingPoint === 'string' ? 
            selectedTradingPoint : selectedTradingPoint.id;
          await loadPricesFromCache(tradingPointId);
        }
      }
    } catch (error: any) {
      console.error('Ошибка при загрузке цен из внешнего API:', error);
      toast({
        title: "Ошибка внешнего API",
        description: `Не удалось загрузить цены из внешнего API: ${error.message}. Используются кешированные данные.`,
        variant: "destructive"
      });
      
      setDataSourceType('cache');
      // Fallback к кэшу при ошибке
      if (selectedTradingPoint) {
        const tradingPointId = typeof selectedTradingPoint === 'string' ? 
          selectedTradingPoint : selectedTradingPoint.id;
        await loadPricesFromCache(tradingPointId);
      }
    } finally {
      setLoadingFromExternalAPI(false);
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
      console.error('❌ Ошибка загрузки цен из STS API:', error);
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
    console.log('🔍 Анализ currentPrices:', currentPrices);

    const pricesData = currentPrices.map((price, index) => {
      console.log(`🔍 Цена ${index + 1}:`, {
        fuelType: price.fuelType,
        priceGross: price.priceGross,
        priceWithVAT: price.priceWithVAT,
        price: price.price,
        fullObject: price
      });

      // Получаем цену в рублях с учетом источника данных
      let currentPriceValue = 0;

      if (price.priceGross && typeof price.priceGross === 'number') {
        // Если источник STS API, цена уже в рублях
        // Если другой источник, цена в копейках
        if (price.source === 'sts-api') {
          currentPriceValue = price.priceGross;
          console.log(`💰 STS API - используем priceGross как рубли: ${currentPriceValue} руб`);
        } else {
          currentPriceValue = price.priceGross / 100;
          console.log(`💰 Другой источник - priceGross: ${price.priceGross} коп = ${currentPriceValue} руб`);
        }
      } else if (price.priceWithVAT && typeof price.priceWithVAT === 'number') {
        currentPriceValue = price.priceWithVAT;
        console.log(`💰 Используем priceWithVAT: ${currentPriceValue} руб`);
      } else if (price.price && typeof price.price === 'number') {
        currentPriceValue = price.price;
        console.log(`💰 Используем price: ${currentPriceValue} руб`);
      }

      const result = {
        fuel_type: price.fuelType || price.fuel_type || 'Неизвестно',
        price: currentPriceValue,
        currentPrice: currentPriceValue
      };

      console.log(`✅ Результат для ${result.fuel_type}:`, result);
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

      console.log('💰 Цены для отправки (в рублях):', prices);

      const effectiveDate = effectiveDateTime.toISOString();

      const result = await stsApiService.setPrices(prices, effectiveDate, contextParams);

      if (result.success) {
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
      console.error('❌ Ошибка установки цен:', error);
      toast({
        title: "Ошибка установки цен",
        description: error.message || "Произошла ошибка при установке цен",
        variant: "destructive"
      });
    } finally {
      setIsSettingPrices(false);
    }
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
      console.error('Ошибка при обновлении цен:', error);
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

  // Стандартный мобильный pull-to-refresh
  const triggerHapticFeedback = () => {
    if ('vibrate' in navigator && isMobile) {
      navigator.vibrate(50);
    }
  };

  const handleRefreshData = async () => {
    if (!selectedTradingPoint || selectedTradingPoint === 'all') return;

    setPullState('refreshing');

    try {
      if (stsApiConfigured) {
        await loadPricesFromSTSAPI();
      } else {
        const tradingPointId = typeof selectedTradingPoint === 'string' ?
          selectedTradingPoint : selectedTradingPoint.id;
        await loadPricesFromCache(tradingPointId);
      }

      triggerHapticFeedback();
    } catch (error) {
      console.error('Ошибка обновления:', error);
    }

    // Анимация завершения
    setTimeout(() => {
      setPullState('idle');
      setPullDistance(0);
    }, 500);
  };

  const updatePullDistance = (distance: number) => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(() => {
      const clampedDistance = Math.min(distance, MAX_PULL_DISTANCE);
      setPullDistance(clampedDistance);

      // Обновляем состояние на основе расстояния
      if (clampedDistance >= PULL_THRESHOLD && pullState !== 'canRefresh' && pullState !== 'refreshing') {
        setPullState('canRefresh');
        triggerHapticFeedback();
      } else if (clampedDistance < PULL_THRESHOLD && pullState === 'canRefresh') {
        setPullState('pulling');
      }
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile || !scrollContainerRef.current || pullState === 'refreshing') return;

    const container = scrollContainerRef.current;
    if (container.scrollTop > 0) return;

    startTouchRef.current = {
      y: e.touches[0].clientY,
      time: Date.now()
    };
    setPullState('pulling');
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !startTouchRef.current || !scrollContainerRef.current || pullState === 'refreshing') return;

    const container = scrollContainerRef.current;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startTouchRef.current.y;

    // Только если движение вниз и мы в верху страницы
    if (deltaY > 0 && container.scrollTop === 0) {
      e.preventDefault();

      // Применяем эластичность (чем больше тянем, тем медленнее)
      const elasticity = Math.max(0.5, 1 - (deltaY / MAX_PULL_DISTANCE) * 0.5);
      const adjustedDistance = deltaY * elasticity;

      updatePullDistance(adjustedDistance);
    } else if (deltaY <= 0 || container.scrollTop > 0) {
      // Сбрасываем если движение вверх или начался скролл
      setPullState('idle');
      setPullDistance(0);
      startTouchRef.current = null;
    }
  };

  const handleTouchEnd = async () => {
    if (!isMobile || !startTouchRef.current) return;

    startTouchRef.current = null;

    if (pullState === 'canRefresh') {
      await handleRefreshData();
    } else {
      // Плавная анимация возврата
      setPullState('idle');
      setPullDistance(0);
    }
  };

  // Подключаем обработчики touch событий
  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  // Очищаем состояние при смене торговой точки
  useEffect(() => {
    setPullState('idle');
    setPullDistance(0);
    startTouchRef.current = null;
  }, [selectedTradingPoint]);

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
      console.error('Ошибка сохранения цены:', error);
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
        className="w-full h-full px-4 relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: isMobile && pullState !== 'idle' ? `translateY(${pullDistance * 0.5}px)` : 'translateY(0)',
          transition: pullState === 'idle' ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {/* Стандартный мобильный pull-to-refresh индикатор */}
        {isMobile && pullState !== 'idle' && pullDistance >= INDICATOR_APPEAR_THRESHOLD && (
          <div
            className="absolute top-0 left-0 right-0 flex justify-center items-center z-50"
            style={{
              transform: `translateY(-${Math.max(0, 80 - pullDistance)}px)`,
              opacity: Math.min(1, (pullDistance - INDICATOR_APPEAR_THRESHOLD) / 40)
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
        {/* Premium Header */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-600/50 rounded-xl shadow-2xl backdrop-blur-sm mb-6 mt-4">
          <CardHeader className="pb-6">
            <CardTitle className={`text-slate-100 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-10 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full shadow-lg"></div>
                <div className="flex flex-col">
                  <span className={`${isMobile ? 'text-xl font-bold' : 'text-3xl font-bold'} text-white leading-tight`}>Цены</span>
                  {!isMobile && (
                    <span className="text-slate-400 text-sm font-medium">Управление ценами на топливо с отложенным применением и журналом изменений</span>
                  )}
                </div>
              </div>

              <div className={`flex ${isMobile ? 'gap-2' : 'gap-4'} items-center`}>
                {/* Кнопка инструкции скрыта
                <Button
                  onClick={() => window.open('/help/point-prices', '_blank')}
                  variant="outline"
                  size="sm"
                  className="border-slate-500/60 text-slate-300 hover:text-white hover:bg-slate-600/80 hover:border-slate-400 hover:shadow-md transition-all duration-300 px-3 py-2.5 rounded-lg bg-slate-700/30 backdrop-blur-sm"
                >
                  <HelpCircle className="w-4 h-4" />
                </Button>
                */}
                {!isMobile && (
                  <Button
                    onClick={loadPricesFromSTSAPI}
                    variant="outline"
                    size="sm"
                    disabled={loadingFromSTSAPI}
                    className="border-slate-500/60 text-slate-300 hover:text-white hover:bg-slate-600/80 hover:border-slate-400 hover:shadow-md transition-all duration-300 px-3 py-2.5 rounded-lg bg-slate-700/30 backdrop-blur-sm"
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${loadingFromSTSAPI ? 'animate-spin' : ''}`} />
                    Обновить
                  </Button>
                )}
                {stsApiConfigured && currentPrices.length > 0 && (
                  <Button
                    onClick={handleSetPrices}
                    size="sm"
                    disabled={isSettingPrices || !selectedTradingPoint || selectedTradingPoint === 'all'}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg font-medium px-3 py-2"
                  >
                    <Edit className={`w-4 h-4 ${isMobile ? '' : 'mr-1'} ${isSettingPrices ? 'animate-pulse' : ''}`} />
                    {!isMobile && "Изменить цены"}
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
        </Card>


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
          <div className="pb-6">
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'}`}>
              {filteredPrices.map((price) => (
                <div key={price.id} className={`bg-slate-800 border border-slate-700 rounded-lg hover:shadow-xl transition-all duration-200 ${isMobile ? 'p-4' : 'p-6'}`}>
                  {/* Header с видом топлива и статусом */}
                  <div className={`${isMobile ? 'space-y-3' : 'flex items-start justify-between'} mb-4`}>
                    <div className="flex items-center gap-3">
                      <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-lg flex items-center justify-center border border-blue-500/20 flex-shrink-0`}>
                        <Fuel className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-blue-400`} />
                      </div>
                      <div className="flex-1">
                        <div className={`font-semibold text-white ${isMobile ? 'text-base truncate' : 'text-lg'}`}>{price.fuelType || 'Неизвестно'}</div>
                      </div>
                    </div>
                    <Badge variant="secondary" className={`text-xs ${getStatusColor(price.status)} ${isMobile ? 'self-start flex-shrink-0' : ''}`}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(price.status)}
                        {getStatusText(price.status)}
                      </div>
                    </Badge>
                  </div>

                  {/* Цены */}
                  <div className="space-y-3 mb-4">
                    <div className={`flex items-center justify-between border-t border-slate-600 pt-2 ${isMobile ? 'gap-2' : ''}`}>
                      <span className={`text-slate-400 ${isMobile ? 'text-xs flex-shrink-0' : 'text-sm'}`}>Цена:</span>
                      {editingPriceId === price.id ? (
                        <div className={`flex items-center gap-2 ${isMobile ? 'min-w-0' : ''}`}>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editingValue}
                            onChange={(e) => handleEditingValueChange(e.target.value)}
                            className={`${isMobile ? 'w-20 h-7' : 'w-24 h-8'} text-right bg-slate-700 border-slate-600 text-white font-bold text-sm`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveInlinePrice();
                              } else if (e.key === 'Escape') {
                                handleCancelInlineEdit();
                              }
                            }}
                            autoFocus
                          />
                          <span className={`text-slate-400 ${isMobile ? 'text-xs flex-shrink-0' : 'text-sm'}`}>₽</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleInlineEdit(price.id, price.priceGross)}
                          className={`text-white font-bold hover:text-blue-400 hover:underline transition-colors cursor-pointer ${isMobile ? 'text-base min-w-0 truncate' : 'text-lg'}`}
                          title="Нажмите для редактирования цены"
                        >
                          {formatPrice(price.priceGross, price.source !== 'sts-api')}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Дополнительная информация */}
                  <div className={`space-y-2 mb-4 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    <div className={`flex items-center justify-between ${isMobile ? 'gap-2' : ''}`}>
                      <span className="text-slate-400">Единица:</span>
                      <span className={`text-white text-right ${isMobile ? 'min-w-0 truncate' : ''}`}>{price.unit}</span>
                    </div>
                  </div>

                  {/* Действия */}
                  <div className={`flex gap-2 pt-3 border-t border-slate-700 ${isMobile ? 'flex-col' : 'flex-row'}`}>
                    {editingPriceId === price.id ? (
                      <>
                        <Button
                          variant="ghost"
                          size={isMobile ? "default" : "sm"}
                          onClick={handleSaveInlinePrice}
                          disabled={!hasChanges}
                          className="flex-1 text-green-400 hover:text-green-300 hover:bg-green-500/10 disabled:text-slate-500 disabled:hover:text-slate-500"
                        >
                          <Save className="w-4 h-4" />
                          <span className={isMobile ? "ml-2" : "ml-1"}>Сохранить</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelInlineEdit}
                          className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Панель управления ценами для розничной компании */}
        <div className="mt-8">
          <RetailPricingDashboard />
        </div>

        {/* Диалог создания/редактирования цены */}
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[95vh]' : 'max-w-2xl'}`}>
            <DialogHeader>
              <DialogTitle>
                {selectedPrice ? 'Редактировать цену' : 'Новая цена на топливо'}
              </DialogTitle>
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
                          value={priceItem.price.toFixed(2)}
                          onChange={(e) => {
                            const newPrices = [...pricesForUpdate];
                            newPrices[index].price = parseFloat(e.target.value) || 0;
                            setPricesForUpdate(newPrices);
                          }}
                          className="w-32 bg-slate-700 border-slate-600 text-white text-right"
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