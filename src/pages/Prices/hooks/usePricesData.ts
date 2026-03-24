import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { useSelection } from "@/contexts/SelectionContext";
import { useStationNetworkId } from "@/hooks/useStationNetworkId";
import { useDataSourceInfo } from "@/components/data-source/DataSourceIndicator";
import { tradingPointsService } from "@/services/tradingPointsService";
import {
  tradingNetworkAPI,
  TradingNetworkService
} from "@/services/tradingNetworkAPI";
import { CachedFuelPrice, pricesCacheService } from "@/services/pricesCache";
import { externalPricesService } from "@/services/externalPricesService";
import { stsApiService, Price as STSPrice, PriceScheduleEntry } from "@/services/stsApi";
import { auditLogService } from "@/services/auditLogService";

// Types - CachedFuelPrice as main type
export type FuelPrice = CachedFuelPrice;

export interface PricePackage {
  id: string;
  tradingPointId: string;
  tradingPointName: string;
  applyAt: string;
  authorName: string;
  createdAt: string;
  status: 'draft' | 'scheduled' | 'active' | 'cancelled';
  lines: PricePackageLine[];
}

export interface PricePackageLine {
  fuelId: string;
  fuelType: string;
  priceNet: number;
  vatRate: number;
  unit: string;
  status: 'active' | 'scheduled' | 'cancelled';
}

export interface PriceJournalEntry {
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

export interface PriceForUpdate {
  fuel_type: string;
  price: number;
  currentPrice?: number;
}

// Utility functions
export const formatPrice = (value: number, isInKopecks: boolean = true) => {
  if (isInKopecks) {
    return (value / 100).toFixed(2) + " \u20BD";
  } else {
    return value.toFixed(2) + " \u20BD";
  }
};

export const calculateGrossPrice = (net: number, vatRate: number) => {
  return Math.round(net * (1 + vatRate / 100));
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case "active": return "bg-emerald-100 dark:bg-emerald-500/20 text-green-600 dark:text-green-400 border-green-500/30";
    case "scheduled": return "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30";
    case "expired": return "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30";
    default: return "bg-muted-foreground/20 text-muted-foreground border-border/30";
  }
};

export const getStatusText = (status: string) => {
  switch (status) {
    case "active": return "Активно";
    case "scheduled": return "Запланировано";
    case "expired": return "Истекло";
    default: return "Неизвестно";
  }
};

export const getSourceColor = (source: string) => {
  switch (source) {
    case "manual": return "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30";
    case "import": return "bg-emerald-100 dark:bg-emerald-500/20 text-green-600 dark:text-green-400 border-green-500/30";
    case "api": return "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30";
    default: return "bg-muted-foreground/20 text-muted-foreground border-border/30";
  }
};

export const getSourceText = (source: string) => {
  switch (source) {
    case "manual": return "Ручное";
    case "import": return "Импорт";
    case "api": return "API";
    default: return "Неизвестно";
  }
};

// Fuel nomenclature (static)
export const fuelNomenclature = [
  { id: '1', name: 'АИ-92', internal_code: 'AI92', network_api_code: '2', status: 'active' as const },
  { id: '2', name: 'АИ-95', internal_code: 'AI95', network_api_code: '3', status: 'active' as const },
  { id: '3', name: 'АИ-98', internal_code: 'AI98', network_api_code: '4', status: 'active' as const },
  { id: '4', name: 'ДТ', internal_code: 'DT', network_api_code: '5', status: 'active' as const },
  { id: '5', name: 'Газ', internal_code: 'GAS', network_api_code: '6', status: 'active' as const }
];

// Configure STS API with correct parameters
const ensureSTSApiConfigured = () => {
  const correctConfig = {
    url: import.meta.env.VITE_STS_API_URL || '',
    username: import.meta.env.VITE_STS_API_USERNAME || '',
    password: import.meta.env.VITE_STS_API_PASSWORD || '',
    enabled: true,
    timeout: 30000,
    retryAttempts: 3,
    refreshInterval: 20 * 60 * 1000 // 20 minutes
  };

  const currentConfig = localStorage.getItem('sts-api-config');
  let needsUpdate = false;

  if (currentConfig) {
    try {
      const parsed = JSON.parse(currentConfig);
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

export function usePricesData() {
  const { selectedTradingPoint, selectedNetwork } = useSelection();
  const stationNetworkId = useStationNetworkId();
  const { hasExternalDatabase } = useDataSourceInfo();

  const [currentPrices, setCurrentPrices] = useState<FuelPrice[]>([]);
  const [journalEntries, setJournalEntries] = useState<PriceJournalEntry[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // States for trading network API
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [networkServices, setNetworkServices] = useState<TradingNetworkService[]>([]);

  // States for inline editing
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);
  const [isSavingInline, setIsSavingInline] = useState(false);

  // States for external API
  const [dataSourceType, setDataSourceType] = useState<'external-api' | 'cache' | 'sts-api'>('cache');
  const [externalPricesConfigured, setExternalPricesConfigured] = useState(false);
  const [loadingFromExternalAPI, setLoadingFromExternalAPI] = useState(false);
  const [stsApiConfigured, setStsApiConfigured] = useState(false);
  const [loadingFromSTSAPI, setLoadingFromSTSAPI] = useState(false);

  // States for setting prices via STS API
  const [isSetPricesDialogOpen, setIsSetPricesDialogOpen] = useState(false);
  const [pricesForUpdate, setPricesForUpdate] = useState<PriceForUpdate[]>([]);
  const [effectiveDateTime, setEffectiveDateTime] = useState<Date>(new Date());
  const [isSettingPrices, setIsSettingPrices] = useState(false);

  // States for price change journal
  const [priceSchedule, setPriceSchedule] = useState<PriceScheduleEntry[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [isPriceHistoryDialogOpen, setIsPriceHistoryDialogOpen] = useState(false);
  const [initialLoadTriggered, setInitialLoadTriggered] = useState(false);
  const [pageReady, setPageReady] = useState(true);

  // Load prices from cache (fallback)
  const loadPricesFromCache = async (tradingPointId: string) => {
    try {
      const prices = await pricesCacheService.getPricesForTradingPoint(tradingPointId);
      setCurrentPrices(prices);
    } catch (error) {
      // Silently fail - cache is best-effort
    }
  };

  // Load prices from STS API
  const loadPricesFromSTSAPI = async () => {
    setLoadingFromSTSAPI(true);
    setDataSourceType('sts-api');
    setIsInitialLoading(true);

    try {
      ensureSTSApiConfigured();

      if (!selectedTradingPoint || selectedTradingPoint === 'all') {
        throw new Error('Выберите конкретную торговую точку для получения цен из STS API');
      }

      const tradingPointObject = await tradingPointsService.getById(selectedTradingPoint);
      if (!tradingPointObject) {
        throw new Error('Не удалось загрузить данные торговой точки');
      }

      const contextParams = {
        networkId: stationNetworkId || '1',
        tradingPointId: tradingPointObject.external_id || '1'
      };

      const stsPrices = await stsApiService.getPrices(contextParams);

      if (stsPrices && stsPrices.length > 0) {
        const transformedPrices: FuelPrice[] = stsPrices
          .filter(stsPrice => stsPrice && stsPrice.id && stsPrice.fuelType)
          .map((stsPrice: STSPrice, index) => {
            const mapped = {
              id: String(stsPrice.id || `temp_${index}`),
              fuelType: stsPrice.fuelType || 'Неизвестно',
              fuelCode: stsPrice.fuelType || 'UNKNOWN',
              priceNet: 0,
              vatRate: 0,
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
        setIsInitialLoading(false);
      } else {
        setCurrentPrices([]);
        setIsInitialLoading(false);
      }
    } catch (error: any) {
      setIsInitialLoading(false);
      setStsApiConfigured(true);

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

  // Load price schedule (history)
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
      const tradingPoint = await tradingPointsService.getById(selectedTradingPoint);
      if (!tradingPoint?.external_id) {
        return;
      }

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

  // Open price history dialog
  const handleShowPriceHistory = async () => {
    setIsPriceHistoryDialogOpen(true);
    await loadPriceSchedule(true);
  };

  // Refresh prices from network
  const refreshPricesFromNetwork = async (isMobile: boolean) => {
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

  // Handle refresh data (pull-to-refresh)
  const handleRefreshData = async () => {
    if (!selectedTradingPoint || selectedTradingPoint === 'all') return;
    await loadPricesFromSTSAPI();
    await loadPriceSchedule(stsApiConfigured);
  };

  // Prepare set prices dialog
  const handleSetPrices = (isMobile: boolean) => {
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

    const pricesData = currentPrices.map((price, index) => {
      let currentPriceValue = 0;

      if (price.priceGross && typeof price.priceGross === 'number') {
        if (price.source === 'sts-api') {
          currentPriceValue = price.priceGross;
        } else {
          currentPriceValue = price.priceGross / 100;
        }
      } else if ((price as any).priceWithVAT && typeof (price as any).priceWithVAT === 'number') {
        currentPriceValue = (price as any).priceWithVAT;
      } else if ((price as any).price && typeof (price as any).price === 'number') {
        currentPriceValue = (price as any).price;
      }

      return {
        fuel_type: price.fuelType || (price as any).fuel_type || 'Неизвестно',
        price: currentPriceValue,
        currentPrice: currentPriceValue
      };
    });

    setPricesForUpdate(pricesData);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    setEffectiveDateTime(tomorrow);

    setIsSetPricesDialogOpen(true);
  };

  // Confirm set prices via STS API
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

      const prices = pricesForUpdate.map(item => ({
        fuel_type: item.fuel_type,
        price: item.price
      }));

      const year = effectiveDateTime.getFullYear();
      const month = String(effectiveDateTime.getMonth() + 1).padStart(2, '0');
      const day = String(effectiveDateTime.getDate()).padStart(2, '0');
      const hours = String(effectiveDateTime.getHours()).padStart(2, '0');
      const minutes = String(effectiveDateTime.getMinutes()).padStart(2, '0');
      const seconds = String(effectiveDateTime.getSeconds()).padStart(2, '0');

      const effectiveDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

      const result = await stsApiService.setPrices(prices, effectiveDate, contextParams);

      if (result.success) {
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

  // Get service code by fuel type
  const getServiceCode = (fuelType: string): number | null => {
    const service = networkServices.find(s => s.service_name === fuelType);
    return service?.service_code || null;
  };

  // Inline editing functions
  const handleInlineEdit = (priceId: string, currentGrossPrice: number) => {
    setEditingPriceId(priceId);
    setEditingValue((currentGrossPrice / 100).toFixed(2));
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

  const handleSaveInlinePrice = async (isMobile: boolean) => {
    if (!editingPriceId || !hasChanges || isSavingInline) return;

    const price = currentPrices.find(p => p.id === editingPriceId);
    if (!price) return;

    setIsSavingInline(true);
    try {
      const newGrossPrice = Math.round(parseFloat(editingValue) * 100);
      const newNetPrice = newGrossPrice;

      const tradingPointId = typeof selectedTradingPoint === 'string'
        ? selectedTradingPoint
        : selectedTradingPoint?.id;

      if (tradingPointId) {
        const serviceCode = getServiceCode(price.fuelType);
        if (serviceCode) {
          const stationNumber = parseInt(tradingPointId.replace('point', '')) + 76;

          await tradingNetworkAPI.setPrices(
            stationNumber,
            { [serviceCode.toString()]: newGrossPrice / 100 },
            new Date().toISOString()
          );
        }
      }

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
          description: `Цена на ${price.fuelType} успешно обновлена до ${editingValue} \u20BD/л`,
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
    } finally {
      setIsSavingInline(false);
    }
  };

  // Auto-load prices when trading point is selected
  useEffect(() => {
    const config = ensureSTSApiConfigured();
    const isConfigured = !!(config && config.enabled && config.url && config.username && config.password);
    setStsApiConfigured(isConfigured);

    if (selectedTradingPoint && selectedTradingPoint !== 'all') {
      loadPricesFromSTSAPI();

      if (isConfigured) {
        loadPriceSchedule(isConfigured);
      } else {
        setPriceSchedule([]);
      }
    } else {
      setCurrentPrices([]);
      setPriceSchedule([]);
      setIsInitialLoading(false);
    }
    setPageReady(true);
  }, [selectedTradingPoint]);

  // Check external API configuration on init
  useEffect(() => {
    setExternalPricesConfigured(externalPricesService.isConfigured());
  }, [hasExternalDatabase]);

  // Filtered prices (currently all prices)
  const filteredPrices = currentPrices;

  return {
    // State
    currentPrices,
    setCurrentPrices,
    journalEntries,
    setJournalEntries,
    isInitialLoading,
    isUpdatingPrices,
    networkServices,
    editingPriceId,
    editingValue,
    hasChanges,
    isSavingInline,
    dataSourceType,
    externalPricesConfigured,
    loadingFromExternalAPI,
    stsApiConfigured,
    loadingFromSTSAPI,
    isSetPricesDialogOpen,
    setIsSetPricesDialogOpen,
    pricesForUpdate,
    setPricesForUpdate,
    effectiveDateTime,
    setEffectiveDateTime,
    isSettingPrices,
    priceSchedule,
    isLoadingSchedule,
    isPriceHistoryDialogOpen,
    setIsPriceHistoryDialogOpen,
    pageReady,
    filteredPrices,

    // Selection context (re-exported for convenience)
    selectedTradingPoint,
    selectedNetwork,

    // Actions
    loadPricesFromSTSAPI,
    loadPriceSchedule,
    handleShowPriceHistory,
    refreshPricesFromNetwork,
    handleRefreshData,
    handleSetPrices,
    handleConfirmSetPrices,
    handleInlineEdit,
    handleEditingValueChange,
    handleCancelInlineEdit,
    handleSaveInlinePrice,
  };
}
