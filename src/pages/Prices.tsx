/**
 * Prices Page - Новая архитектура управления ценами
 * 
 * Особенности:
 * - Автоматическая синхронизация с резервуарами
 * - Нет сложных маппингов UUID
 * - Интеграция с торговым API
 * - Журнал изменений цен
 */

import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, 
  History, 
  AlertCircle
} from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { HelpButton } from "@/components/help/HelpButton";
import { useSelection } from "@/context/SelectionContext";

// Новые компоненты
import PricesManager from "@/components/prices/PricesManager";
import PriceHistoryJournal from "@/components/prices/PriceHistoryJournal";

// Новые сервисы
import { 
  pricesSupabaseService, 
  FuelPrice,
  FuelTypeInfo 
} from "@/services/pricesSupabaseService";

export default function Prices() {
  console.log('🔥 [PRICES PAGE] Компонент рендерится с новой архитектурой!');
  
  const { selectedNetwork, selectedTradingPoint } = useSelection();
  const [currentPrices, setCurrentPrices] = useState<FuelPrice[]>([]);
  const [fuelTypesInfo, setFuelTypesInfo] = useState<FuelTypeInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("manage");
  const [tradingPointInfo, setTradingPointInfo] = useState<{id: string, name: string} | null>(null);

  console.log('🔥 [PRICES PAGE] selectedTradingPoint:', selectedTradingPoint);
  console.log('🔥 [PRICES PAGE] selectedNetwork:', selectedNetwork);

  // Загружаем информацию о торговой точке
  useEffect(() => {
    async function loadTradingPointInfo() {
      if (selectedTradingPoint && selectedTradingPoint !== 'all') {
        try {
          const { tradingPointsService } = await import('@/services/tradingPointsService');
          const tradingPoint = await tradingPointsService.getById(selectedTradingPoint);
          if (tradingPoint) {
            setTradingPointInfo({ id: tradingPoint.id, name: tradingPoint.name });
          } else {
            setTradingPointInfo(null);
          }
        } catch (error) {
          console.error('Ошибка загрузки информации о торговой точке:', error);
          setTradingPointInfo(null);
        }
      } else {
        setTradingPointInfo(null);
      }
    }
    
    loadTradingPointInfo();
  }, [selectedTradingPoint]);

  // Загружаем данные при изменении торговой точки
  useEffect(() => {
    if (selectedTradingPoint) {
      loadPricesData();
    }
  }, [selectedTradingPoint, selectedNetwork]);

  const loadPricesData = async () => {
    if (!selectedTradingPoint) return;

    console.log(`🔥 [PRICES PAGE] Загрузка данных для торговой точки: ${selectedTradingPoint}`);
    setLoading(true);
    setError(null);

    try {
      if (selectedTradingPoint === 'all') {
        // Для "all" загружаем данные по всем торговым точкам сети
        if (!selectedNetwork) {
          setError('Сеть не выбрана');
          return;
        }

        console.log(`🌐 [PRICES PAGE] Загрузка данных для всех торговых точек сети`);
        
        // Получаем все торговые точки сети
        const { tradingPointsService } = await import('@/services/tradingPointsService');
        const tradingPoints = await tradingPointsService.getByNetworkId(selectedNetwork.id);
        
        // Загружаем данные для каждой торговой точки
        const allPrices: FuelPrice[] = [];
        const allFuelInfo: FuelTypeInfo[] = [];
        
        for (const tp of tradingPoints) {
          try {
            const [prices, fuelInfo] = await Promise.all([
              pricesSupabaseService.getCurrentPrices(tp.id),
              pricesSupabaseService.getFuelTypesInfo(tp.id)
            ]);
            allPrices.push(...prices);
            allFuelInfo.push(...fuelInfo);
          } catch (err) {
            console.warn(`⚠️ Ошибка загрузки данных для ${tp.name}:`, err);
          }
        }
        
        setCurrentPrices(allPrices);
        setFuelTypesInfo(allFuelInfo);
        
        console.log(`✅ [PRICES PAGE] Загружено ${allPrices.length} цен и ${allFuelInfo.length} видов топлива для всех торговых точек`);
        
      } else {
        // Для конкретной торговой точки
        const [prices, fuelInfo] = await Promise.all([
          pricesSupabaseService.getCurrentPrices(selectedTradingPoint),
          pricesSupabaseService.getFuelTypesInfo(selectedTradingPoint)
        ]);

        setCurrentPrices(prices);
        setFuelTypesInfo(fuelInfo);
        
        console.log(`✅ [PRICES PAGE] Загружено ${prices.length} цен и ${fuelInfo.length} видов топлива`);
      }
      
    } catch (err) {
      console.error('❌ [PRICES PAGE] Ошибка загрузки данных:', err);
      setError(`Не удалось загрузить данные: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePricesUpdate = (updatedPrices: FuelPrice[]) => {
    setCurrentPrices(updatedPrices);
    // Также можем обновить информацию о видах топлива
    if (selectedTradingPoint) {
      pricesSupabaseService.getFuelTypesInfo(selectedTradingPoint)
        .then(setFuelTypesInfo)
        .catch(console.error);
    }
  };

  const formatPrice = (priceKopecks: number) => {
    return (priceKopecks / 100).toFixed(2);
  };

  // Если торговая точка не выбрана или выбраны все
  if (!selectedTradingPoint || selectedTradingPoint === 'all') {
    return (
      <MainLayout>
        <div className="w-full px-4 md:px-6 lg:px-8">
          <div className="w-full space-y-6">
            {/* Заголовок */}
            <div className="mb-6 pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-white">Управление ценами</h1>
                  <p className="text-slate-400 mt-2">
                    Автоматическое управление ценами на основе резервуаров
                  </p>
                </div>
                <HelpButton route="/prices" variant="text" className="flex-shrink-0" />
              </div>
            </div>

            {/* Выберите торговую точку */}
            <EmptyState
              icon={<DollarSign className="h-8 w-8" />}
              title="Выберите конкретную торговую точку"
              description="Управление ценами работает только с конкретной торговой точкой. Выберите торговую точку из выпадающего списка в шапке приложения."
            />
            
            {selectedTradingPoint === 'all' && (
              <Alert className="border-yellow-500 bg-yellow-950">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-300">
                  <strong>Подсказка:</strong> Сейчас выбраны "Все торговые точки". 
                  Для управления ценами нужно выбрать конкретную торговую точку в селекторе выше.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </MainLayout>
    );
  }

  // Определяем имя торговой точки
  const getTradingPointDisplayName = () => {
    if (selectedTradingPoint === 'all') {
      return selectedNetwork ? `Все торговые точки сети "${selectedNetwork.name}"` : 'Все торговые точки';
    }
    
    // Если торговая точка загружена, используем её имя
    if (tradingPointInfo) {
      return tradingPointInfo.name;
    }
    
    // Если информация о торговой точке еще не загружена, показываем загрузку
    if (selectedTradingPoint && selectedTradingPoint !== 'all') {
      return 'Загрузка...';
    }
    
    return typeof selectedTradingPoint === 'object' 
      ? selectedTradingPoint.name 
      : selectedTradingPoint;
  };
  
  const tradingPointName = getTradingPointDisplayName();

  return (
    <MainLayout>
      <div className="w-full px-4 md:px-6 lg:px-8">
        <div className="w-full space-y-6">
          {/* Заголовок */}
          <div className="mb-6 pt-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-white">Управление ценами</h1>
                <p className="text-slate-400 mt-2">
                  {tradingPointName} • Управление ценами на топливо
                </p>
              </div>
              <HelpButton route="/prices" variant="text" className="flex-shrink-0" />
            </div>
          </div>

          {/* Общие сообщения об ошибках */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}


          {/* Основной контент */}
          <PricesManager
            tradingPointId={selectedTradingPoint}
            tradingPointName={tradingPointName}
            onPricesUpdate={handlePricesUpdate}
          />
        </div>
      </div>
    </MainLayout>
  );
}