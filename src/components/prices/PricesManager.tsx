/**
 * PricesManager - Компонент для управления ценами на топливо
 * 
 * Особенности:
 * - Автоматическое определение видов топлива из резервуаров
 * - Синхронизация с торговым API
 * - Управление ценами без сложных маппингов
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCw, 
  Save, 
  Fuel, 
  Database, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  ArrowRightLeft,
  Clock,
  DollarSign,
  TrendingUp,
  Activity
} from 'lucide-react';

import { 
  pricesSupabaseService, 
  FuelTypeInfo, 
  FuelPrice 
} from '@/services/pricesSupabaseService';
import { PriceApplicationDialog, PriceChange } from '@/components/dialogs/PriceApplicationDialog';

interface PricesManagerProps {
  tradingPointId: string;
  tradingPointName: string;
  onPricesUpdate?: (prices: FuelPrice[]) => void;
}

interface PriceFormData {
  fuel_type: string;
  price_gross: string;
  changed: boolean; // Флаг изменения цены
}

export const PricesManager: React.FC<PricesManagerProps> = ({
  tradingPointId,
  tradingPointName,
  onPricesUpdate
}) => {
  const [fuelTypesInfo, setFuelTypesInfo] = useState<FuelTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [priceForm, setPriceForm] = useState<Record<string, PriceFormData>>({});
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);
  const [applyingPrices, setApplyingPrices] = useState(false);
  
  // Загружаем информацию о видах топлива при монтировании
  useEffect(() => {
    loadFuelTypesInfo();
  }, [tradingPointId]);

  const loadFuelTypesInfo = async () => {
    console.log(`🔥 [PRICES MANAGER] Загрузка видов топлива для ${tradingPointId}`);
    console.log(`🔥 [PRICES MANAGER] tradingPointName: ${tradingPointName}`);
    
    // Диагностика входных параметров
    if (!tradingPointId) {
      console.error(`❌ [PRICES MANAGER] tradingPointId не передан!`);
      setError('Не указан ID торговой точки');
      setLoading(false);
      return;
    }
    
    if (tradingPointId === 'all') {
      console.error(`❌ [PRICES MANAGER] tradingPointId = "all" - компонент работает только с конкретными торговыми точками!`);
      setError('Выберите конкретную торговую точку для управления ценами');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔥 [PRICES MANAGER] Вызываем getFuelTypesInfo для ${tradingPointId}`);
      const fuelInfo = await pricesSupabaseService.getFuelTypesInfo(tradingPointId);
      
      console.log(`🔍 [PRICES MANAGER] Получен результат getFuelTypesInfo:`, fuelInfo);
      console.log(`🔍 [PRICES MANAGER] Длина массива: ${fuelInfo.length}`);
      
      setFuelTypesInfo(fuelInfo);
      
      // Инициализируем форму с текущими ценами
      const formData: Record<string, PriceFormData> = {};
      fuelInfo.forEach(fuel => {
        console.log(`🔍 [PRICES MANAGER] Обрабатываем топливо: ${fuel.fuel_type}`);
        formData[fuel.fuel_type] = {
          fuel_type: fuel.fuel_type,
          price_gross: fuel.current_price 
            ? (fuel.current_price.price_gross / 100).toFixed(2) 
            : '',
          changed: false
        };
      });
      setPriceForm(formData);
      
      console.log(`✅ [PRICES MANAGER] Загружено ${fuelInfo.length} видов топлива`);
      console.log(`✅ [PRICES MANAGER] fuelTypesInfo state:`, fuelInfo);
      
    } catch (err) {
      console.error('❌ [PRICES MANAGER] Ошибка загрузки:', err);
      setError(`Не удалось загрузить информацию о топливе: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const syncWithTradingAPI = async () => {
    console.log(`🔄 [PRICES MANAGER] Синхронизация с торговым API`);
    setSyncing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await pricesSupabaseService.syncPricesWithTradingAPI(tradingPointId);
      
      if (result.errors.length > 0) {
        setError(`Синхронизация завершена с ошибками: ${result.errors.join(', ')}`);
      } else {
        setSuccess(`Синхронизировано ${result.synced} цен с торговым API`);
      }
      
      // Перезагружаем данные после синхронизации
      await loadFuelTypesInfo();
      
      if (onPricesUpdate) {
        const updatedPrices = await pricesSupabaseService.getCurrentPrices(tradingPointId);
        onPricesUpdate(updatedPrices);
      }
      
    } catch (err) {
      console.error('❌ [PRICES MANAGER] Ошибка синхронизации:', err);
      setError(`Ошибка синхронизации: ${err}`);
    } finally {
      setSyncing(false);
    }
  };


  const updatePriceForm = (fuelType: string, field: keyof PriceFormData, value: string | boolean) => {
    setPriceForm(prev => ({
      ...prev,
      [fuelType]: {
        ...prev[fuelType],
        [field]: value
      }
    }));
  };

  const formatPrice = (priceKopecks: number) => {
    return (priceKopecks / 100).toFixed(2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  // Получить список изменённых цен
  const getChangedPrices = (): PriceChange[] => {
    const changes: PriceChange[] = [];
    
    Object.entries(priceForm).forEach(([fuelType, formData]) => {
      if (formData.changed && formData.price_gross) {
        const fuel = fuelTypesInfo.find(f => f.fuel_type === fuelType);
        changes.push({
          fuel_type: fuelType,
          current_price: fuel?.current_price ? fuel.current_price.price_gross / 100 : undefined,
          new_price: parseFloat(formData.price_gross)
        });
      }
    });
    
    return changes;
  };

  // Открыть диалог группового применения
  const handleBulkSave = () => {
    const changes = getChangedPrices();
    if (changes.length === 0) {
      setError('Нет изменений для сохранения');
      return;
    }
    setShowApplicationDialog(true);
  };

  // Применить изменения цен
  const handleApplyPrices = async (applicationTime: Date, closeShift: boolean) => {
    console.log(`💰 [PRICES MANAGER] Применение цен: ${applicationTime.toISOString()}, закрыть смену: ${closeShift}`);
    
    const changes = getChangedPrices();
    setApplyingPrices(true);
    setError(null);
    setSuccess(null);
    
    try {
      let appliedCount = 0;
      const errors: string[] = [];
      
      // Применяем каждое изменение
      for (const change of changes) {
        try {
          await pricesSupabaseService.updatePrice(tradingPointId, change.fuel_type, change.new_price);
          
          // Сбрасываем флаг изменения
          updatePriceForm(change.fuel_type, 'changed', false);
          appliedCount++;
        } catch (err) {
          errors.push(`${change.fuel_type}: ${err}`);
        }
      }
      
      // TODO: Здесь должна быть логика закрытия смены если closeShift = true
      if (closeShift) {
        console.log('🔄 [SHIFT] Закрываем текущую смену и открываем новую');
        // await shiftService.closeCurrentShift();
        // await shiftService.openNewShift();
      }
      
      if (errors.length > 0) {
        setError(`Применено ${appliedCount} цен. Ошибки: ${errors.join(', ')}`);
      } else {
        setSuccess(`Успешно применено ${appliedCount} ${appliedCount === 1 ? 'цена' : 'цен'}${closeShift ? ' и закрыта смена' : ''}`);
      }
      
      // Перезагружаем данные
      await loadFuelTypesInfo();
      
      if (onPricesUpdate) {
        const updatedPrices = await pricesSupabaseService.getCurrentPrices(tradingPointId);
        onPricesUpdate(updatedPrices);
      }
      
    } catch (error) {
      console.error('❌ [PRICES MANAGER] Ошибка применения цен:', error);
      setError(`Критическая ошибка: ${error}`);
    } finally {
      setApplyingPrices(false);
      setShowApplicationDialog(false);
    }
  };

  // Отладка состояния компонента
  console.log(`🎨 [PRICES MANAGER RENDER] tradingPointId: ${tradingPointId}`);
  console.log(`🎨 [PRICES MANAGER RENDER] loading: ${loading}`);
  console.log(`🎨 [PRICES MANAGER RENDER] fuelTypesInfo:`, fuelTypesInfo);
  console.log(`🎨 [PRICES MANAGER RENDER] fuelTypesInfo.length: ${fuelTypesInfo.length}`);

  if (loading) {
    console.log(`⏳ [PRICES MANAGER RENDER] Показываем загрузку...`);
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и кнопки управления */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Управление ценами - {tradingPointName}
          </h2>
          <p className="text-slate-400 text-sm">
            Управление ценами на топливо торговой точки
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={loadFuelTypesInfo}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
          
          <Button
            onClick={syncWithTradingAPI}
            disabled={syncing}
            variant="outline"
            size="sm"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ArrowRightLeft className="w-4 h-4 mr-2" />
            )}
            Синхронизация с API
          </Button>
          
          <Button
            onClick={handleBulkSave}
            disabled={getChangedPrices().length === 0 || applyingPrices}
            variant="default"
            size="sm"
            className={`${getChangedPrices().length > 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-600'}`}
          >
            {applyingPrices ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Сохранить изменения {getChangedPrices().length > 0 && `(${getChangedPrices().length})`}
          </Button>
        </div>
      </div>

      {/* Сообщения об ошибках и успехе */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-300">{success}</AlertDescription>
        </Alert>
      )}

      {/* Статистические карточки */}
      {fuelTypesInfo.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Всего видов топлива</p>
                  <p className="text-2xl font-bold text-white">
                    {fuelTypesInfo.length}
                  </p>
                </div>
                <Fuel className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Цены установлены</p>
                  <p className="text-2xl font-bold text-white">
                    {fuelTypesInfo.filter(fuel => fuel.has_price).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Требуют настройки</p>
                  <p className="text-2xl font-bold text-white">
                    {fuelTypesInfo.filter(fuel => !fuel.has_price).length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Есть изменения</p>
                  <p className="text-2xl font-bold text-white">
                    {getChangedPrices().length}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Сетка карточек топлива в стиле резервуаров */}
      {fuelTypesInfo.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center text-slate-400">
              <Database className="w-8 h-8 mx-auto mb-2" />
              <p>Виды топлива не найдены</p>
              <p className="text-sm">Проверьте настройки торгового API или номенклатуры</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {fuelTypesInfo.map(fuel => {
            const currentPrice = fuel.current_price?.price_gross ? fuel.current_price.price_gross / 100 : 0;
            const newPrice = priceForm[fuel.fuel_type]?.price_gross ? parseFloat(priceForm[fuel.fuel_type].price_gross) : currentPrice;
            const priceChange = currentPrice > 0 ? ((newPrice - currentPrice) / currentPrice) * 100 : 0;
            const hasChanges = priceForm[fuel.fuel_type]?.changed && newPrice !== currentPrice;
            
            return (
              <Card key={fuel.fuel_type} className="bg-slate-800 border-slate-700 relative overflow-hidden">
                {/* Цветной индикатор слева */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  !fuel.has_price ? 'bg-red-500' :
                  hasChanges ? 'bg-yellow-500' : 'bg-green-500'
                }`} />
                
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        !fuel.has_price ? 'bg-red-500' :
                        hasChanges ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                      <CardTitle className="text-lg text-white">
                        {fuel.fuel_type}
                      </CardTitle>
                    </div>
                    
                    {hasChanges && (
                      <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                        {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Текущая цена - большими цифрами */}
                  <div>
                    <div className="text-2xl font-bold text-white mb-1">
                      {fuel.has_price ? `${formatPrice(fuel.current_price?.price_gross || 0)} ₽` : 'Не установлена'}
                    </div>
                    <div className="text-slate-400 text-sm">
                      {fuel.has_price ? fuel.fuel_type : 'Цена за литр'}
                    </div>
                  </div>

                  {/* Статус цены */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`flex items-center gap-1 ${
                      !fuel.has_price ? 'text-red-400' :
                      hasChanges ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        !fuel.has_price ? 'bg-red-500' :
                        hasChanges ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                      {!fuel.has_price ? 'Нет цены' :
                       hasChanges ? 'Есть изменения' : 'Цена установлена'}
                    </span>
                    
                    {fuel.current_price && (
                      <span className="text-slate-500 ml-auto">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {formatDate(fuel.current_price.applied_from)}
                      </span>
                    )}
                  </div>

                  {/* Форма изменения цены */}
                  <div className="pt-2 border-t border-slate-600">
                    <Label htmlFor={`price-${fuel.fuel_type}`} className="text-slate-400 text-sm">
                      Новая цена, ₽/л
                    </Label>
                    <div className="mt-1">
                      <Input
                        id={`price-${fuel.fuel_type}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={priceForm[fuel.fuel_type]?.price_gross || ''}
                        onChange={(e) => {
                          updatePriceForm(fuel.fuel_type, 'price_gross', e.target.value);
                          updatePriceForm(fuel.fuel_type, 'changed', e.target.value !== (currentPrice > 0 ? currentPrice.toFixed(2) : ''));
                        }}
                        className="bg-slate-700 border-slate-600 text-white w-full"
                        placeholder={currentPrice > 0 ? currentPrice.toFixed(2) : "0.00"}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Диалог применения изменений */}
      <PriceApplicationDialog
        open={showApplicationDialog}
        onOpenChange={setShowApplicationDialog}
        priceChanges={getChangedPrices()}
        tradingPointName={tradingPointName}
        onApply={handleApplyPrices}
        loading={applyingPrices}
      />
    </div>
  );
};

export default PricesManager;