/**
 * СТРАНИЦА РЕЗЕРВУАРОВ - ТОЛЬКО РЕАЛЬНЫЕ ДАННЫЕ!
 * 
 * КРИТИЧНО: НЕТ MOCK-ДАННЫХ - показываем ошибки вместо фиктивной информации
 * Это физическая система управления топливом на миллионы рублей
 */

import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { useSelection } from "@/context/SelectionContext";
import { HelpButton } from "@/components/help/HelpButton";
import { 
  Gauge, 
  RefreshCw,
  AlertTriangle,
  Thermometer, 
  Droplets, 
  CheckCircle, 
  XCircle,
  Fuel,
  AlertCircle
} from "lucide-react";

// ТОЛЬКО РЕАЛЬНЫЕ СЕРВИСЫ
import { tanksUnifiedService, TanksLoadResult } from "@/services/tanksUnifiedService";
import { Tank } from "@/services/tanksServiceSupabase";

export default function Tanks() {
  const { selectedTradingPoint } = useSelection();
  const [tanksData, setTanksData] = useState<TanksLoadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка данных резервуаров
  useEffect(() => {
    if (selectedTradingPoint && selectedTradingPoint !== "all") {
      loadTanksData();
    } else {
      setTanksData(null);
      setError(null);
    }
  }, [selectedTradingPoint]);

  const loadTanksData = async () => {
    if (!selectedTradingPoint || selectedTradingPoint === "all") {
      setError("Выберите конкретную торговую точку");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🏪 Загружаем резервуары для торговой точки:', selectedTradingPoint);
      
      const result = await tanksUnifiedService.getTanksForTradingPoint(selectedTradingPoint);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setTanksData(result);
      console.log(`✅ Загружено ${result.tanks.length} резервуаров из ${result.source}`);
      
    } catch (err) {
      console.error('❌ Ошибка загрузки резервуаров:', err);
      setError(`Не удалось загрузить данные резервуаров: ${err instanceof Error ? err.message : 'неизвестная ошибка'}`);
      setTanksData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadTanksData();
  };

  const getTankStatus = (tank: Tank) => {
    const fillPercent = (tank.currentLevelLiters / tank.capacityLiters) * 100;
    
    if (tank.criticalLevelPercent > 0 && fillPercent <= tank.criticalLevelPercent) return { status: 'critical', color: 'red', text: 'Критический' };
    if (tank.minLevelPercent > 0 && fillPercent <= tank.minLevelPercent) return { status: 'warning', color: 'yellow', text: 'Низкий' };
    if (fillPercent >= 95) return { status: 'full', color: 'blue', text: 'Полный' };
    return { status: 'normal', color: 'green', text: 'Нормальный' };
  };

  const formatVolume = (liters: number) => {
    // Показываем полные цифры без сокращений
    return `${Math.round(liters).toLocaleString('ru-RU')} л`;
  };

  // Если торговая точка не выбрана
  if (!selectedTradingPoint || selectedTradingPoint === "all") {
    return (
      <MainLayout>
        <div className="w-full px-4 md:px-6 lg:px-8">
          <div className="w-full space-y-6">
            <div className="mb-6 pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-white">Резервуары</h1>
                  <p className="text-slate-400 mt-2">
                    Мониторинг запасов топлива и управление операциями
                  </p>
                </div>
                <HelpButton route="/tanks" variant="text" className="flex-shrink-0" />
              </div>
            </div>

            <EmptyState
              icon={<Fuel className="h-8 w-8" />}
              title="Выберите торговую точку"
              description="Для просмотра резервуаров выберите конкретную торговую точку из выпадающего списка в шапке приложения."
            />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="w-full px-4 md:px-6 lg:px-8">
        <div className="w-full space-y-6">
          {/* Заголовок */}
          <div className="mb-6 pt-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-white">Резервуары</h1>
                <p className="text-slate-400 mt-2">
                  Мониторинг запасов топлива и управление операциями
                </p>
                {tanksData && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={tanksData.source === 'database' ? 'default' : 'secondary'}>
                      {tanksData.source === 'database' ? 'База данных' : 
                       tanksData.source === 'api' ? 'Внешний API' : 'Данные недоступны'}
                    </Badge>
                    {tanksData.synchronized && (
                      <Badge variant="outline" className="text-green-400 border-green-400">
                        Синхронизировано
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleRefresh} 
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Обновить
                </Button>
                <HelpButton route="/tanks" variant="text" className="flex-shrink-0" />
              </div>
            </div>
          </div>

          {/* Ошибки */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Ошибка загрузки данных:</strong> {error}
                <div className="mt-2">
                  <Button onClick={handleRefresh} variant="outline" size="sm">
                    Повторить попытку
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Загрузка */}
          {loading && (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin mr-3 text-blue-400" />
                  <span className="text-white">Загрузка данных резервуаров...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Данные резервуаров */}
          {tanksData && !loading && !error && (
            <>
              {tanksData.tanks.length === 0 ? (
                <EmptyState
                  icon={<Fuel className="h-8 w-8" />}
                  title="Резервуары не найдены"
                  description="Для данной торговой точки в системе не найдено резервуаров. Проверьте настройки или обратитесь к администратору."
                />
              ) : (
                <>
                  {/* Статистика */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-slate-800 border-slate-700">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-slate-400 text-sm">Всего резервуаров</p>
                            <p className="text-2xl font-bold text-white">
                              {tanksData.tanks.length}
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
                            <p className="text-slate-400 text-sm">Активных резервуаров</p>
                            <p className="text-2xl font-bold text-white">
                              {tanksData.tanks.filter(t => getTankStatus(t).status !== 'critical').length}
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
                            <p className="text-slate-400 text-sm">Требуют внимания</p>
                            <p className="text-2xl font-bold text-white">
                              {tanksData.tanks.filter(t => ['critical', 'warning'].includes(getTankStatus(t).status)).length}
                            </p>
                          </div>
                          <AlertTriangle className="h-8 w-8 text-yellow-400" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-800 border-slate-700">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-slate-400 text-sm">Общий объем</p>
                            <p className="text-2xl font-bold text-white">
                              {formatVolume(tanksData.tanks.reduce((sum, tank) => sum + tank.currentLevelLiters, 0))}
                            </p>
                          </div>
                          <Droplets className="h-8 w-8 text-cyan-400" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Список резервуаров */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {tanksData.tanks.map((tank) => {
                      const status = getTankStatus(tank);
                      const fillPercent = Math.round((tank.currentLevelLiters / tank.capacityLiters) * 100);
                      const minLevelPixels = tank.minLevelPercent || 0;
                      const criticalLevelPixels = tank.criticalLevelPercent || 0;
                      
                      console.log(`🔍 Резервуар ${tank.name}: заполнен=${fillPercent.toFixed(1)}% мин=${minLevelPixels}% крит=${criticalLevelPixels}%`);
                      console.log(`🔍 Полные данные резервуара:`, {
                        id: tank.id,
                        name: tank.name,
                        minLevelPercent: tank.minLevelPercent,
                        criticalLevelPercent: tank.criticalLevelPercent,
                        currentLevelLiters: tank.currentLevelLiters,
                        capacityLiters: tank.capacityLiters
                      });
                      

                      return (
                        <Card key={tank.id} className="bg-slate-800 border-slate-700">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-blue-300 text-lg font-bold">{tank.fuelType === 'Дизельное топливо' ? 'ДТ' : tank.fuelType}</p>
                                  <span className="text-slate-400">—</span>
                                  <div className="text-green-300 font-bold text-xl">{formatVolume(tank.currentLevelLiters)}</div>
                                </div>
                                <CardTitle className="text-slate-400 text-base font-semibold leading-tight">{tank.name}</CardTitle>
                              </div>
                              <div className="text-right">
                                <p className="text-white text-base font-semibold">из {formatVolume(tank.capacityLiters)}</p>
                              </div>
                            </div>
                          </CardHeader>
                          
                          <CardContent className="space-y-6">

                            {/* Второй блок - прогресс бар с визуализацией */}
                            <div className="flex items-start gap-6 py-4 border-y border-slate-700">
                              {/* Левая часть - процент заполнения */}
                              <div className="w-20 flex flex-col items-center justify-center relative h-40">
                                <div 
                                  className="absolute text-center"
                                  style={{ bottom: `${fillPercent}%`, transform: 'translateY(50%)' }}
                                >
                                  <div className="text-white font-bold text-lg leading-tight">
                                    {fillPercent}%
                                  </div>
                                  <div className="text-slate-400 text-base leading-tight">
                                    {formatVolume(tank.currentLevelLiters)}
                                  </div>
                                </div>
                              </div>

                              {/* Центральная часть - вертикальный прогресс-бар с отметками уровней */}
                              <div className="flex items-end h-40 w-16 relative">
                                <div className="w-full h-full bg-slate-700 relative">
                                  {/* Основная заливка */}
                                  <div 
                                    className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${
                                      (tank.criticalLevelPercent > 0 && fillPercent <= tank.criticalLevelPercent) ? 'bg-gradient-to-t from-red-500 to-red-400' :
                                      (tank.minLevelPercent > 0 && fillPercent <= tank.minLevelPercent) ? 'bg-gradient-to-t from-yellow-500 to-yellow-400' :
                                      fillPercent >= 95 ? 'bg-gradient-to-t from-blue-600 to-blue-500' :
                                      'bg-gradient-to-t from-blue-500 to-blue-400'
                                    }`}
                                    style={{ height: `${fillPercent}%` }}
                                  ></div>
                                </div>
                                
                                {/* Отметки уровней вне основного контейнера */}
                                {/* Фактический уровень топлива - линия влево к проценту */}
                                <div 
                                  className="absolute -left-8 right-0 border-t-4 border-green-400 z-30"
                                  style={{ bottom: `${fillPercent}%` }}
                                >
                                  <div className="absolute -left-3 -top-1 w-6 h-2 bg-green-400"></div>
                                </div>
                                
                                {/* Критический уровень - только если больше 0 */}
                                {criticalLevelPixels > 0 && (
                                  <div 
                                    className="absolute left-0 -right-8 border-t-4 border-red-500 z-30"
                                    style={{ bottom: `${criticalLevelPixels}%` }}
                                  >
                                    <div className="absolute -right-3 -top-1 w-6 h-2 bg-red-500"></div>
                                  </div>
                                )}
                                
                                {/* Минимальный уровень - только если больше 0 */}
                                {minLevelPixels > 0 && (
                                  <div 
                                    className="absolute left-0 -right-8 border-t-4 border-yellow-500 z-30"
                                    style={{ bottom: `${minLevelPixels}%` }}
                                  >
                                    <div className="absolute -right-3 -top-1 w-6 h-2 bg-yellow-500"></div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Правая часть - пороговые значения */}
                              <div className="flex-1 pl-4 flex flex-col justify-center h-40 text-right">
                                <div className="space-y-3">
                                  <div className="text-sm">
                                    <div className="text-slate-400">Мин. уровень</div>
                                    <div className="text-yellow-400 font-semibold">
                                      {tank.minLevelPercent > 0 ? `${tank.minLevelPercent}%` : '—'}
                                    </div>
                                    <div className="text-white text-base font-semibold">
                                      {tank.minLevelPercent > 0 ? formatVolume(Math.round(tank.capacityLiters * tank.minLevelPercent / 100)) : '—'}
                                    </div>
                                  </div>
                                  <div className="text-sm">
                                    <div className="text-slate-400">Крит. уровень</div>
                                    <div className="text-red-400 font-semibold">
                                      {tank.criticalLevelPercent > 0 ? `${tank.criticalLevelPercent}%` : '—'}
                                    </div>
                                    <div className="text-white text-base font-semibold">
                                      {tank.criticalLevelPercent > 0 ? formatVolume(Math.round(tank.capacityLiters * tank.criticalLevelPercent / 100)) : '—'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                              
                            {/* Третий блок - дополнительные параметры */}
                            <div className="flex justify-center py-2">
                              <div className="grid grid-cols-2 gap-6 max-w-md">
                              {tank.bookBalance && (
                                <div className="flex items-center gap-3">
                                  <Fuel className="h-5 w-5 text-slate-400" />
                                  <div>
                                    <p className="text-slate-400 text-sm">Книжный остаток</p>
                                    <p className="text-white text-base font-semibold">{formatVolume(tank.bookBalance)}</p>
                                  </div>
                                </div>
                              )}

                              {tank.temperature && tank.temperature !== 20 && (
                                <div className="flex items-center gap-3">
                                  <Thermometer className="h-5 w-5 text-slate-400" />
                                  <div>
                                    <p className="text-slate-400 text-sm">Температура</p>
                                    <p className="text-white text-base font-semibold">{tank.temperature}°C</p>
                                  </div>
                                </div>
                              )}
                              
                              {tank.waterLevelMm !== undefined && (
                                <div className="flex items-center gap-3">
                                  <Droplets className="h-5 w-5 text-slate-400" />
                                  <div>
                                    <p className="text-slate-400 text-sm">Подтоварная вода</p>
                                    <p className="text-white text-base font-semibold">{tank.waterLevelMm} мм</p>
                                  </div>
                                </div>
                              )}
                              
                              {tank.density && (
                                <div className="flex items-center gap-3">
                                  <Gauge className="h-5 w-5 text-slate-400" />
                                  <div>
                                    <p className="text-slate-400 text-sm">Плотность</p>
                                    <p className="text-white text-base font-semibold">{tank.density.toFixed(2)} кг/м³</p>
                                  </div>
                                </div>
                              )}
                              </div>
                            </div>

                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}