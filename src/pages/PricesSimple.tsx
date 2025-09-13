import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  DollarSign,
  RefreshCw,
  Fuel,
  HelpCircle
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { HelpButton } from "@/components/help/HelpButton";
import { useSelection } from "@/context/SelectionContext";
import { tradingPointsService } from "@/services/tradingPointsService";
import { stsApiService, Price as STSPrice } from "@/services/stsApi";

// Упрощенный интерфейс цены
interface SimpleFuelPrice {
  id: string;
  fuelType: string;
  price: number;
  priceGross: number;
  unit: string;
  lastUpdated: string;
  source: 'sts-api' | 'cache';
}

const PricesSimple: React.FC = () => {
  const isMobile = useIsMobile();
  const { selectedTradingPoint, selectedNetwork } = useSelection();

  const [currentPrices, setCurrentPrices] = useState<SimpleFuelPrice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Простой localStorage кэш
  const CACHE_KEY = 'prices_simple_cache';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

  const saveToCache = (prices: SimpleFuelPrice[], tradingPointId: string) => {
    const cacheData = {
      tradingPointId,
      prices,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  };

  const loadFromCache = (tradingPointId: string): SimpleFuelPrice[] | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      if (cacheData.tradingPointId !== tradingPointId) return null;
      if (Date.now() - cacheData.timestamp > CACHE_DURATION) return null;

      return cacheData.prices.map(price => ({ ...price, source: 'cache' as const }));
    } catch {
      return null;
    }
  };

  const clearCache = () => {
    localStorage.removeItem(CACHE_KEY);
  };

  // Загрузка цен из STS API
  const loadPricesFromSTS = async () => {
    setIsLoading(true);

    try {
      if (!selectedTradingPoint || selectedTradingPoint === 'all') {
        throw new Error('Выберите торговую точку для загрузки цен');
      }

      // Получаем данные торговой точки
      const tradingPointObject = await tradingPointsService.getById(selectedTradingPoint);
      if (!tradingPointObject) {
        throw new Error('Не удалось загрузить данные торговой точки');
      }

      const contextParams = {
        networkId: selectedNetwork?.external_id || selectedNetwork?.code || '1',
        tradingPointId: tradingPointObject.external_id || '1'
      };

      // Загружаем цены из STS API
      const stsPrices = await stsApiService.getPrices(contextParams);

      if (stsPrices && stsPrices.length > 0) {
        const transformedPrices: SimpleFuelPrice[] = stsPrices
          .filter(stsPrice => stsPrice && stsPrice.id && stsPrice.fuelType)
          .map((stsPrice: STSPrice, index) => ({
            id: String(stsPrice.id || `sts_${index}`),
            fuelType: stsPrice.fuelType || 'Неизвестно',
            price: stsPrice.price || 0,
            priceGross: stsPrice.price || 0,
            unit: stsPrice.unit || 'литр',
            lastUpdated: new Date().toISOString(),
            source: 'sts-api' as const
          }));

        setCurrentPrices(transformedPrices);
        setLastUpdated(new Date().toISOString());

        // Сохраняем в кэш
        saveToCache(transformedPrices, selectedTradingPoint);

        toast({
          title: "Цены загружены",
          description: `Загружено ${transformedPrices.length} цен из STS API`
        });
      } else {
        setCurrentPrices([]);
        toast({
          title: "Нет данных",
          description: "Цены не найдены"
        });
      }

    } catch (error) {
      console.error('STS API error:', error);

      // Пробуем загрузить из кэша при ошибке
      if (selectedTradingPoint && selectedTradingPoint !== 'all') {
        const cachedPrices = loadFromCache(selectedTradingPoint);
        if (cachedPrices && cachedPrices.length > 0) {
          setCurrentPrices(cachedPrices);
          setLastUpdated(cachedPrices[0].lastUpdated);
          toast({
            title: "Загружено из кэша",
            description: "Используются сохраненные цены"
          });
          return;
        }
      }

      toast({
        title: "Ошибка загрузки",
        description: error instanceof Error ? error.message : "Не удалось загрузить цены",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Автоматическая загрузка при выборе торговой точки
  useEffect(() => {
    if (selectedTradingPoint && selectedTradingPoint !== 'all') {
      // Сначала пробуем загрузить из кэша
      const cachedPrices = loadFromCache(selectedTradingPoint);
      if (cachedPrices && cachedPrices.length > 0) {
        setCurrentPrices(cachedPrices);
        setLastUpdated(cachedPrices[0].lastUpdated);
      } else {
        // Если кэша нет - загружаем из API
        loadPricesFromSTS();
      }
    } else {
      setCurrentPrices([]);
      setLastUpdated(null);
    }
  }, [selectedTradingPoint]);

  const formatPrice = (value: number) => {
    return value.toFixed(2) + " ₽";
  };

  const formatLastUpdated = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ru-RU');
    } catch {
      return 'Неизвестно';
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'sts-api':
        return <Badge variant="default">STS API</Badge>;
      case 'cache':
        return <Badge variant="secondary">Кэш</Badge>;
      default:
        return <Badge variant="outline">Неизвестно</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="h-full flex flex-col">
        {/* Заголовок */}
        <div className="flex-shrink-0 p-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-trade.blue" />
              <h1 className="text-2xl font-bold">Цены (Упрощенная версия)</h1>
              {!isMobile && (
                <div className="flex items-center gap-2 ml-4">
                  <HelpButton
                    helpUrl="help/prices.html"
                  />
                  <Button
                    onClick={loadPricesFromSTS}
                    disabled={isLoading || !selectedTradingPoint || selectedTradingPoint === 'all'}
                    size="sm"
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                    Обновить
                  </Button>
                  <Button
                    onClick={clearCache}
                    variant="outline"
                    size="sm"
                  >
                    Очистить кэш
                  </Button>
                </div>
              )}
            </div>
          </div>

          {lastUpdated && (
            <p className="text-sm text-muted-foreground mt-2">
              Последнее обновление: {formatLastUpdated(lastUpdated)}
            </p>
          )}
        </div>

        {/* Контент */}
        <div className="flex-1 p-6 overflow-auto">
          {!selectedTradingPoint || selectedTradingPoint === 'all' ? (
            <EmptyState
              icon={Fuel}
              title="Выберите торговую точку"
              description="Для просмотра цен необходимо выбрать конкретную торговую точку"
            />
          ) : isLoading && currentPrices.length === 0 ? (
            <EmptyState
              icon={RefreshCw}
              title="Загрузка цен..."
              description="Получаем актуальные цены из STS API"
              className="animate-pulse"
            />
          ) : currentPrices.length === 0 ? (
            <EmptyState
              icon={Fuel}
              title="Цены не найдены"
              description="Не удалось получить информацию о ценах"
              action={
                <Button onClick={loadPricesFromSTS} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Попробовать еще раз
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentPrices.map((price) => (
                <Card key={price.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Fuel className="h-5 w-5 text-trade.blue" />
                        {price.fuelType}
                      </CardTitle>
                      {getSourceBadge(price.source)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-2xl font-bold text-trade.green">
                      {formatPrice(price.price)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      за {price.unit}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Мобильные кнопки */}
        {isMobile && (
          <div className="flex-shrink-0 p-4 border-t bg-background">
            <div className="flex gap-2">
              <Button
                onClick={loadPricesFromSTS}
                disabled={isLoading || !selectedTradingPoint || selectedTradingPoint === 'all'}
                className="flex-1"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Обновить
              </Button>
              <Button
                onClick={clearCache}
                variant="outline"
              >
                Очистить кэш
              </Button>
              <HelpButton
                helpUrl="help/prices.html"
                variant="outline"
                size="default"
              >
                <HelpCircle className="h-4 w-4" />
              </HelpButton>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default PricesSimple;