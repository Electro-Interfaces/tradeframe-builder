import React, { useState, useMemo, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  AlertTriangle
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { HelpButton } from "@/components/help/HelpButton";
import { useSelection } from "@/context/SelectionContext";
import { 
  tradingNetworkAPI, 
  TradingNetworkPrice, 
  TradingNetworkService 
} from "@/services/tradingNetworkAPI";
import { nomenclatureService } from "@/services/nomenclatureService";
import { FuelNomenclature } from "@/types/nomenclature";
import { pricesCacheService, CachedFuelPrice } from "@/services/pricesCache";

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
  vatRate: z.number().min(0).max(100, "НДС должен быть от 0 до 100%"),
  unit: z.string().min(1, "Выберите единицу измерения"),
  applyAt: z.date({ required_error: "Укажите дату применения" }),
  comment: z.string().optional(),
  overrideNetwork: z.boolean().default(false),
  fixUntil: z.date().optional()
});

type PriceFormData = z.infer<typeof priceFormSchema>;

export default function Prices() {
  const { selectedTradingPoint } = useSelection();
  
  console.log('🏪 Prices page: выбранная торговая точка:', selectedTradingPoint);
  console.log('🏪 Prices page: тип selectedTradingPoint:', typeof selectedTradingPoint);
  console.log('🏪 Prices page: selectedTradingPoint.id:', selectedTradingPoint?.id);
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

  const form = useForm<PriceFormData>({
    resolver: zodResolver(priceFormSchema),
    defaultValues: {
      priceNet: 0,
      vatRate: 20,
      unit: "Л",
      applyAt: new Date(),
      overrideNetwork: false
    }
  });

  // Автоматическая загрузка цен при выборе торговой точки
  useEffect(() => {
    let tradingPointId;
    if (typeof selectedTradingPoint === 'string') {
      tradingPointId = selectedTradingPoint;
    } else if (selectedTradingPoint && typeof selectedTradingPoint === 'object') {
      tradingPointId = selectedTradingPoint.id;
    }
    
    if (tradingPointId) {
      console.log('🔄 Загружаем цены для точки:', tradingPointId);
      loadPricesFromCache(tradingPointId);
    } else {
      // Если торговая точка не выбрана, отключаем состояние загрузки
      setCurrentPrices([]);
      setIsInitialLoading(false);
    }
  }, [selectedTradingPoint]);

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
  const formatPrice = (kopecks: number) => {
    return (kopecks / 100).toFixed(2) + " ₽";
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
      console.log('💰 Загружаем цены из кэша/сети для:', tradingPointId);
      const prices = await pricesCacheService.getPricesForTradingPoint(tradingPointId);
      setCurrentPrices(prices);
      
      console.log(`💰 Загружено ${prices.length} цен (источник: ${prices[0]?.source || 'unknown'})`);
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
      console.log('🔄 Принудительное обновление цен из сети для:', tradingPointId);
      const prices = await pricesCacheService.refreshPricesFromNetwork(tradingPointId);
      setCurrentPrices(prices);

      toast({
        title: "Цены обновлены",
        description: `Получено ${prices.length} цен с торговой точки`,
      });
    } catch (error) {
      console.error('Ошибка при обновлении цен:', error);
      toast({
        title: "Ошибка обновления",
        description: error instanceof Error ? error.message : "Не удалось обновить цены",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingPrices(false);
    }
  };

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
      vatRate: price.vatRate,
      unit: price.unit,
      applyAt: new Date(),
      overrideNetwork: false
    });
    setIsFormDialogOpen(true);
  };

  const onSubmit = (data: PriceFormData) => {
    const grossPrice = calculateGrossPrice(data.priceNet * 100, data.vatRate);
    const fuelType = fuelNomenclature.find(f => f.id === data.fuelId);
    
    if (selectedPrice) {
      // Edit existing
      setCurrentPrices(prev => prev.map(p => 
        p.id === selectedPrice.id 
          ? {
              ...p,
              priceNet: data.priceNet * 100,
              vatRate: data.vatRate,
              priceGross: grossPrice,
              unit: data.unit,
              appliedFrom: format(data.applyAt, "dd.MM.yyyy HH:mm"),
              status: data.applyAt > new Date() ? "scheduled" : "active"
            }
          : p
      ));
      toast({
        title: "Цена обновлена",
        description: `Цена на ${fuelType?.name} успешно обновлена.`,
      });
    } else {
      // Create new
      const newPrice: FuelPrice = {
        id: Date.now().toString(),
        fuelType: fuelType?.name || "",
        fuelCode: fuelType?.internalCode || "",
        priceNet: data.priceNet * 100,
        vatRate: data.vatRate,
        priceGross: grossPrice,
        unit: data.unit,
        appliedFrom: format(data.applyAt, "dd.MM.yyyy HH:mm"),
        status: data.applyAt > new Date() ? "scheduled" : "active",
        tradingPoint: "АЗС-1 на Московской",
        networkId: "net1"
      };
      setCurrentPrices(prev => [...prev, newPrice]);
      toast({
        title: "Цена создана",
        description: `Цена на ${fuelType?.name} успешно создана.`,
      });
    }

    // Add journal entry
    const journalEntry: PriceJournalEntry = {
      id: Date.now().toString(),
      timestamp: format(new Date(), "dd.MM.yyyy HH:mm"),
      fuelType: fuelType?.name || "",
      fuelCode: fuelType?.internalCode || "",
      priceNet: data.priceNet * 100,
      priceGross: grossPrice,
      vatRate: data.vatRate,
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
      <div className="w-full h-full px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Цены по видам топлива</h1>
              <p className="text-slate-400 mt-2">Управление ценами на топливо с отложенным применением и журналом изменений</p>
            </div>
            <HelpButton route="/prices" variant="text" className="ml-4 flex-shrink-0" />
          </div>
        </div>

        {/* Панель управления */}
        <div className="bg-slate-800 mb-6 w-full rounded-lg">
          <div className="px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">💰</span>
                </div>
                <h2 className="text-lg font-semibold text-white">Текущие цены</h2>
                <div className="text-sm text-slate-400">
                  Точка: АЗС-1 на Московской
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setIsJournalDialogOpen(true)}
                  variant="outline"
                  className="border-slate-600 text-white hover:bg-slate-700"
                >
                  <History className="w-4 h-4 mr-2" />
                  Журнал
                </Button>
                <Button 
                  onClick={refreshPricesFromNetwork}
                  variant="outline"
                  disabled={isUpdatingPrices}
                  className="border-slate-600 text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {isUpdatingPrices ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Обновить из сети
                </Button>
                <Button 
                  onClick={handleCreatePrice}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Новая цена
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Плитки цен */}
        {isInitialLoading ? (
          <div className="px-4 md:px-6 pb-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                  
                  <div className="flex gap-2 pt-3 border-t border-slate-700">
                    <div className="h-8 flex-1 bg-slate-700 rounded animate-pulse"></div>
                    <div className="h-8 w-8 bg-slate-700 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredPrices.length === 0 ? (
          <div className="px-6">
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">💰</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Нет цен
              </h3>
              <p className="text-slate-400 mb-4">
                Создайте первую цену на топливо
              </p>
              <Button 
                onClick={handleCreatePrice}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Создать цену
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-4 md:px-6 pb-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPrices.map((price) => (
                <div key={price.id} className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:shadow-xl transition-all duration-200">
                  {/* Header с видом топлива и статусом */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <Fuel className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="font-medium text-white text-base">{price.fuelType}</div>
                        <div className="text-slate-400 text-sm">{price.fuelCode}</div>
                      </div>
                    </div>
                    <Badge variant="secondary" className={`text-xs ${getStatusColor(price.status)}`}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(price.status)}
                        {getStatusText(price.status)}
                      </div>
                    </Badge>
                  </div>

                  {/* Цены */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Цена без НДС:</span>
                      <span className="text-white font-semibold">{formatPrice(price.priceNet)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">НДС ({price.vatRate}%):</span>
                      <span className="text-slate-300">{formatPrice(price.priceGross - price.priceNet)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-600 pt-2">
                      <span className="text-slate-400 text-sm">С НДС:</span>
                      <span className="text-white font-bold text-lg">{formatPrice(price.priceGross)}</span>
                    </div>
                  </div>

                  {/* Дополнительная информация */}
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Единица:</span>
                      <span className="text-white">{price.unit}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Применяется с:</span>
                      <span className="text-white font-mono text-xs">{price.appliedFrom}</span>
                    </div>
                  </div>

                  {/* Действия */}
                  <div className="flex gap-2 pt-3 border-t border-slate-700">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditPrice(price)}
                      className="flex-1 text-slate-400 hover:text-white hover:bg-slate-700"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Редактировать
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                      title="История цены"
                    >
                      <History className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Диалог создания/редактирования цены */}
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedPrice ? 'Редактировать цену' : 'Новая цена на топливо'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-3 gap-4">
                {/* Цена без НДС */}
                <div className="space-y-2">
                  <Label>Цена без НДС (₽) *</Label>
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

                {/* Ставка НДС */}
                <div className="space-y-2">
                  <Label>НДС (%) *</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    {...form.register("vatRate", { valueAsNumber: true })}
                  />
                </div>

                {/* Цена с НДС (расчёт) */}
                <div className="space-y-2">
                  <Label>Цена с НДС (₽)</Label>
                  <Input
                    value={calculateGrossPrice(form.watch("priceNet") * 100 || 0, form.watch("vatRate") || 0) / 100}
                    readOnly
                    className="bg-slate-600 text-slate-300"
                  />
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
          <DialogContent className="max-w-6xl max-h-[85vh]">
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
                          <th className="px-4 py-3 text-left text-slate-200 font-medium" style={{width: '12%'}}>ЦЕНА БЕЗ НДС</th>
                          <th className="px-4 py-3 text-left text-slate-200 font-medium" style={{width: '12%'}}>ЦЕНА С НДС</th>
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
                            <td className="px-4 py-3">
                              <div className="text-white font-medium">
                                {formatPrice(entry.priceNet)}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-white font-medium">
                                {formatPrice(entry.priceGross)}
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

      </div>
    </MainLayout>
  );
}