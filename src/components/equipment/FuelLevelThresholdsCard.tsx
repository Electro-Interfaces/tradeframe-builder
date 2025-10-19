/**
 * Компонент карточки настройки порогов уровня топлива
 * Позволяет настроить критические и предупреждающие уровни для каждого вида топлива
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Fuel, Settings, Loader2, Save, AlertTriangle, Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Tank } from '@/types/tanks';
import type { FuelLevelThresholds, FuelLevelThreshold } from '@/types/tradingpoint';
import { stsApiService } from '@/services/stsApi';
import { tradingPointsService } from '@/services/tradingPointsService';

interface FuelLevelThresholdsCardProps {
  tanks: Tank[];
  isMobile: boolean;
  thresholds?: FuelLevelThresholds;
  onSaveThresholds?: (thresholds: FuelLevelThresholds) => Promise<void>;
  networkId?: string;
  stationCode?: string;
}

interface FuelRemaining {
  [fuelType: string]: {
    daysRemaining: number;
    avgDailySales: number;
  };
}

/**
 * Получить цвет уровня топлива
 */
function getFuelLevelColor(currentPercent: number, warning: number = 20, critical: number = 10) {
  if (currentPercent <= critical) return 'text-red-500';
  if (currentPercent <= warning) return 'text-yellow-500';
  return 'text-green-500';
}

/**
 * Получить цвет границы карточки
 */
function getBorderColor(currentPercent: number, warning: number = 20, critical: number = 10) {
  if (currentPercent <= critical) return 'border-red-500';
  if (currentPercent <= warning) return 'border-yellow-500';
  return 'border-slate-600';
}

/**
 * Получить цвет фона карточки
 */
function getBgColor(currentPercent: number, warning: number = 20, critical: number = 10) {
  if (currentPercent <= critical) return 'bg-red-900/10';
  if (currentPercent <= warning) return 'bg-yellow-900/10';
  return 'bg-slate-800/50';
}

/**
 * Получить цвет прогресс-бара заполнения
 */
function getFillLevelColor(level: number, warning: number = 20, critical: number = 10) {
  if (level <= critical) return 'bg-red-500';
  if (level <= warning) return 'bg-yellow-500';
  return 'bg-green-500';
}

export function FuelLevelThresholdsCard({ tanks, isMobile, thresholds, onSaveThresholds, networkId, stationCode }: FuelLevelThresholdsCardProps) {
  const [saving, setSaving] = useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [fuelRemaining, setFuelRemaining] = useState<FuelRemaining>({});

  // Получаем уникальные виды топлива из резервуаров
  const fuelTypes = Array.from(new Set(tanks.map(tank => tank.fuelType).filter(Boolean)));

  // Создаем форму для каждого вида топлива
  const [thresholdForm, setThresholdForm] = useState<Record<string, { warning: string; critical: string }>>({});

  // Инициализация формы на основе текущих порогов
  useEffect(() => {
    // Инициализируем только если форма еще пустая
    if (Object.keys(thresholdForm).length > 0) return;

    const initialForm: Record<string, { warning: string; critical: string }> = {};

    fuelTypes.forEach(fuelType => {
      const existingThreshold = thresholds?.thresholds?.find(t => t.fuelType === fuelType);
      initialForm[fuelType] = {
        warning: existingThreshold?.levelWarning?.toString() || '20',
        critical: existingThreshold?.levelCritical?.toString() || '10',
      };
    });

    setThresholdForm(initialForm);
  }, [fuelTypes, thresholds, thresholdForm]);

  // Проверяем есть ли критические уровни
  const criticalTanks = tanks.filter(tank => {
    const currentPercent = (tank.currentLevelLiters / tank.capacityLiters) * 100;
    const threshold = thresholds?.thresholds?.find(t => t.fuelType === tank.fuelType);
    const critical = threshold?.levelCritical || 10;
    return currentPercent <= critical;
  });

  const warningTanks = tanks.filter(tank => {
    const currentPercent = (tank.currentLevelLiters / tank.capacityLiters) * 100;
    const threshold = thresholds?.thresholds?.find(t => t.fuelType === tank.fuelType);
    const warning = threshold?.levelWarning || 20;
    const critical = threshold?.levelCritical || 10;
    return currentPercent > critical && currentPercent <= warning;
  });

  const handleSave = async () => {
    if (!onSaveThresholds) return;

    setSaving(true);
    try {
      const newThresholds: FuelLevelThreshold[] = fuelTypes.map(fuelType => ({
        fuelType,
        levelWarning: thresholdForm[fuelType]?.warning ? Number(thresholdForm[fuelType].warning) : 20,
        levelCritical: thresholdForm[fuelType]?.critical ? Number(thresholdForm[fuelType].critical) : 10,
      }));

      await onSaveThresholds({ thresholds: newThresholds });
    } catch (error) {
      console.error('Ошибка сохранения порогов топлива:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateThreshold = (fuelType: string, field: 'warning' | 'critical', value: string) => {
    setThresholdForm(prev => ({
      ...prev,
      [fuelType]: {
        ...prev[fuelType],
        [field]: value
      }
    }));
  };

  /**
   * Рассчитать остаток времени работы по каждому виду топлива
   * на основе средней реализации за последние 7 дней
   */
  const calculateRemainingTime = async () => {
    if (!networkId || !stationCode) {
      return;
    }

    setCalculating(true);
    try {
      // Получаем объект торговой точки для получения external_id
      const tradingPoint = await tradingPointsService.getById(stationCode);
      if (!tradingPoint) {
        throw new Error(`Торговая точка с ID ${stationCode} не найдена`);
      }

      if (tradingPoint.external_id === null || tradingPoint.external_id === undefined || tradingPoint.external_id === '') {
        throw new Error(`У торговой точки "${tradingPoint.name}" отсутствует external_id. Настройте его в разделе администрирования.`);
      }

      // Получаем дату 7 дней назад
      const dateTo = new Date().toISOString().split('T')[0];
      const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Загружаем транзакции за последние 7 дней
      const transactions = await stsApiService.getTransactions(
        dateFrom,
        dateTo,
        10000, // большой лимит для получения всех транзакций
        {
          networkId,
          tradingPointId: tradingPoint.external_id
        }
      );

      // Группируем транзакции по видам топлива и считаем суммарную реализацию
      const fuelSales: Record<string, number> = {};

      transactions.forEach(tx => {
        const fuelType = tx.fuelType;
        const volume = tx.volume || 0;

        if (fuelType) {
          fuelSales[fuelType] = (fuelSales[fuelType] || 0) + volume;
        }
      });

      // Рассчитываем среднедневную реализацию и остаток дней
      const remaining: FuelRemaining = {};

      Object.keys(fuelSales).forEach(fuelType => {
        const totalSales = fuelSales[fuelType];
        const avgDailySales = totalSales / 7; // средняя за 7 дней

        // Находим текущий остаток по этому виду топлива
        const tanksOfType = tanks.filter(t => t.fuelType === fuelType);
        const currentVolume = tanksOfType.reduce((sum, t) => sum + t.currentLevelLiters, 0);

        // Рассчитываем сколько дней осталось
        const daysRemaining = avgDailySales > 0 ? currentVolume / avgDailySales : 0;

        remaining[fuelType] = {
          daysRemaining,
          avgDailySales
        };
      });

      setFuelRemaining(remaining);

    } catch (error) {
      // Тихо игнорируем ошибки при автоматическом расчете
    } finally {
      setCalculating(false);
    }
  };

  // Автоматический запуск расчета при загрузке компонента
  useEffect(() => {
    if (networkId && stationCode && tanks.length > 0) {
      calculateRemainingTime();
    }
  }, [networkId, stationCode]);

  if (tanks.length === 0) {
    return null;
  }

  return (
    <div className={`rounded-lg ${isMobile ? 'p-4' : 'p-6'} border-2 ${
      criticalTanks.length > 0 ? 'border-red-500 bg-red-900/10' :
      warningTanks.length > 0 ? 'border-yellow-500 bg-yellow-900/10' :
      'border-slate-600 bg-slate-800/50'
    } hover:border-slate-500 transition-colors`}>
      {/* Заголовок */}
      <div className={`${isMobile ? 'space-y-3 mb-3' : 'flex items-center justify-between mb-4'}`}>
        {/* Заголовок */}
        <div className="flex items-center gap-3">
          <Fuel className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-blue-400`} />
          <div className="flex-1 min-w-0">
            <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-white`}>
              Резервуары
            </h3>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-400`}>
              {tanks.length} {tanks.length === 1 ? 'резервуар' : 'резервуаров'}
            </p>
          </div>
          {/* Статистика на мобильных рядом с заголовком */}
          {isMobile && (
            <div className="flex flex-col gap-1">
              {criticalTanks.length > 0 && (
                <Badge className="bg-red-600 text-white hover:bg-red-700 text-xs px-2 py-0.5">
                  🔴 {criticalTanks.length}
                </Badge>
              )}
              {warningTanks.length > 0 && (
                <Badge className="bg-yellow-600 text-white hover:bg-yellow-700 text-xs px-2 py-0.5">
                  ⚠️ {warningTanks.length}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Статистика и настройки для десктопа */}
        {!isMobile && (
          <div className="flex items-center gap-4">
            {criticalTanks.length > 0 && (
              <Badge className="bg-red-600 text-white hover:bg-red-700">
                Критично: {criticalTanks.length}
              </Badge>
            )}
            {warningTanks.length > 0 && (
              <Badge className="bg-yellow-600 text-white hover:bg-yellow-700">
                Предупреждение: {warningTanks.length}
              </Badge>
            )}

            {/* Кнопка настройки порогов */}
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setIsSettingsExpanded(!isSettingsExpanded);
              }}
              className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4 mr-1.5" />
              <span>{isSettingsExpanded ? 'Скрыть настройки' : 'Настроить пороги'}</span>
              {isSettingsExpanded ? (
                <ChevronUp className="w-4 h-4 ml-1.5" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-1.5" />
            )}
          </Button>
        </div>
        )}

        {/* Кнопка настройки порогов для мобильных - отдельная строка */}
        {isMobile && (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setIsSettingsExpanded(!isSettingsExpanded);
            }}
            className="w-full border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4 mr-2" />
            <span className="text-sm">{isSettingsExpanded ? 'Скрыть настройки' : 'Настроить пороги'}</span>
            {isSettingsExpanded ? (
              <ChevronUp className="w-4 h-4 ml-2" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-2" />
            )}
          </Button>
        )}
      </div>

      {/* Предупреждающее сообщение */}
      {(criticalTanks.length > 0 || warningTanks.length > 0) && (
        <div className={`mb-4 p-3 rounded-lg border-l-4 ${
          criticalTanks.length > 0
            ? 'bg-red-900/20 border-red-500'
            : 'bg-yellow-900/20 border-yellow-500'
        }`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
              criticalTanks.length > 0 ? 'text-red-500' : 'text-yellow-500'
            }`} />
            <p className={`text-sm ${
              criticalTanks.length > 0 ? 'text-red-200' : 'text-yellow-200'
            }`}>
              {criticalTanks.length > 0
                ? `Критически низкий уровень топлива в ${criticalTanks.length} ${criticalTanks.length === 1 ? 'резервуаре' : 'резервуарах'}!`
                : `Низкий уровень топлива в ${warningTanks.length} ${warningTanks.length === 1 ? 'резервуаре' : 'резервуарах'}`
              }
            </p>
          </div>
        </div>
      )}

      {/* Данные резервуаров */}
      {isMobile ? (
        // Мобильный вид - карточки резервуаров
        <div className="space-y-4">
          {/* Кнопка расчета времени */}
          {!calculating && Object.keys(fuelRemaining).length === 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={calculateRemainingTime}
              className="w-full border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Рассчитать остаток времени
            </Button>
          )}

          {tanks.map((tank, index) => {
              const currentPercent = (tank.currentLevelLiters / tank.capacityLiters) * 100;
              const threshold = thresholds?.thresholds?.find(t => t.fuelType === tank.fuelType);
              const warning = threshold?.levelWarning || 20;
              const critical = threshold?.levelCritical || 10;

              return (
                <div
                  key={index}
                  className={`rounded-lg p-4 border-2 ${getBorderColor(currentPercent, warning, critical)} ${getBgColor(currentPercent, warning, critical)}`}
                >
                  {/* Заголовок резервуара */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Fuel className="w-5 h-5 text-blue-400" />
                      <div>
                        <div className="text-sm font-semibold text-white">{tank.name}</div>
                        <div className="text-xs text-slate-400">{tank.fuelType}</div>
                      </div>
                    </div>
                    <div className={`text-xl font-bold ${getFuelLevelColor(currentPercent, warning, critical)}`}>
                      {Math.round(currentPercent)}%
                    </div>
                  </div>

                  {/* Прогресс-бар */}
                  <div className="mb-3">
                    <div className="flex-1 bg-slate-600 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${getFillLevelColor(currentPercent, warning, critical)}`}
                        style={{ width: `${Math.max(currentPercent, 2)}%` }}
                      />
                    </div>
                  </div>

                  {/* Объемы */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-slate-700/50 p-2 rounded">
                      <div className="text-xs text-slate-400">Факт</div>
                      <div className="text-sm font-bold text-blue-400">{tank.currentLevelLiters.toLocaleString()} л</div>
                    </div>
                    <div className="bg-slate-700/50 p-2 rounded">
                      <div className="text-xs text-slate-400">Емкость</div>
                      <div className="text-sm font-bold text-slate-300">{tank.capacityLiters.toLocaleString()} л</div>
                    </div>
                  </div>

                  {/* Остаток времени */}
                  {fuelRemaining[tank.fuelType] && (
                    <div className="bg-slate-700/30 p-2 rounded mb-3">
                      <div className="text-xs text-slate-400 mb-1">Остаток времени</div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-white">
                          {fuelRemaining[tank.fuelType].daysRemaining.toFixed(1)} дн
                        </span>
                        <span className="text-xs text-slate-400">
                          ({fuelRemaining[tank.fuelType].avgDailySales.toFixed(0)} л/день)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Пороговые значения */}
                  {isSettingsExpanded ? (
                    <div className="border-t border-slate-600 pt-3 space-y-2">
                      <div className="text-xs font-medium text-slate-300 mb-2">Пороговые значения (%)</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-slate-400">⚠️ Предупреждение</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={thresholdForm[tank.fuelType]?.warning || ''}
                            onChange={(e) => updateThreshold(tank.fuelType, 'warning', e.target.value)}
                            className="bg-slate-800 border-slate-600 text-white h-10 text-sm mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-400">🔴 Критично</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={thresholdForm[tank.fuelType]?.critical || ''}
                            onChange={(e) => updateThreshold(tank.fuelType, 'critical', e.target.value)}
                            className="bg-slate-800 border-slate-600 text-white h-10 text-sm mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-slate-600 pt-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-500">⚠️</span>
                        <span className="text-slate-400">Предупреждение:</span>
                        <span className="text-white font-medium">{warning}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-red-500">🔴</span>
                        <span className="text-slate-400">Критично:</span>
                        <span className="text-white font-medium">{critical}%</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        // Desktop вид - таблица
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-600">
                <th className="text-left pb-2 px-2 text-slate-300 font-medium">Резервуар</th>
                <th className="text-left pb-2 px-2 text-slate-300 font-medium">Топливо</th>
                <th className="text-left pb-2 px-2 text-slate-300 font-medium">Объем емкости</th>
                <th className="text-left pb-2 px-2 text-slate-300 font-medium">Факт</th>
                <th className="text-left pb-2 px-2 text-slate-300 font-medium">Заполнение</th>
                <th className="text-center pb-2 px-2 text-slate-300 font-medium">Порог ⚠️ (%)</th>
                <th className="text-center pb-2 px-2 text-slate-300 font-medium">Порог 🔴 (%)</th>
                <th className="text-center pb-2 px-2 text-slate-300 font-medium">
                  <div className="flex items-center justify-center gap-2">
                    <span>Осталось времени</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={calculateRemainingTime}
                      disabled={calculating}
                      className="h-6 px-2 py-0 text-xs border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                    >
                      {calculating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Calculator className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {tanks.map((tank, index) => {
                const currentPercent = (tank.currentLevelLiters / tank.capacityLiters) * 100;
                const threshold = thresholds?.thresholds?.find(t => t.fuelType === tank.fuelType);
                const warning = threshold?.levelWarning || 20;
                const critical = threshold?.levelCritical || 10;

                return (
                  <tr key={index} className="border-b border-slate-700 hover:bg-slate-700/30">
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <Fuel className="w-4 h-4 text-blue-400" />
                        <span className="text-white font-medium">{tank.name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-slate-300">{tank.fuelType}</td>
                    <td className="py-2 px-2 text-slate-300">{tank.capacityLiters.toLocaleString()} л</td>
                    <td className="py-2 px-2 text-blue-400 font-bold">{tank.currentLevelLiters.toLocaleString()} л</td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-600 rounded-full h-2 min-w-[60px]">
                          <div
                            className={`h-2 rounded-full ${getFillLevelColor(currentPercent, warning, critical)}`}
                            style={{ width: `${Math.max(currentPercent, 2)}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-300 min-w-[35px]">{Math.round(currentPercent)}%</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      {isSettingsExpanded ? (
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={thresholdForm[tank.fuelType]?.warning || ''}
                          onChange={(e) => updateThreshold(tank.fuelType, 'warning', e.target.value)}
                          onFocus={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-slate-800 border-slate-600 text-white h-7 text-sm w-16 text-center"
                        />
                      ) : (
                        <span className="text-white font-medium">{warning}</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      {isSettingsExpanded ? (
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={thresholdForm[tank.fuelType]?.critical || ''}
                          onChange={(e) => updateThreshold(tank.fuelType, 'critical', e.target.value)}
                          onFocus={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-slate-800 border-slate-600 text-white h-7 text-sm w-16 text-center"
                        />
                      ) : (
                        <span className="text-white font-medium">{critical}</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {fuelRemaining[tank.fuelType] ? (
                        <div className="flex flex-col items-center">
                          <span className="text-white font-semibold">
                            {fuelRemaining[tank.fuelType].daysRemaining.toFixed(1)} дн
                          </span>
                          <span className="text-xs text-slate-400">
                            ({fuelRemaining[tank.fuelType].avgDailySales.toFixed(0)} л/день)
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Кнопка сохранения */}
      {isSettingsExpanded && (
        <div className="mt-4 flex justify-end border-t border-slate-600 pt-3">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !onSaveThresholds}
            className="bg-blue-600 hover:bg-blue-700 text-white h-8"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1.5" />
                Сохранить
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
