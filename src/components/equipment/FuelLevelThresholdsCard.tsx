/**
 * Компонент карточки настройки порогов уровня топлива
 * Позволяет настроить критические и предупреждающие уровни для каждого вида топлива
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Fuel, Settings, Loader2, Save, AlertTriangle, Calculator, ChevronDown, ChevronUp, Lock, CheckCircle2, Ban } from 'lucide-react';
import { useState, useEffect } from 'react';

/**
 * Порог блокировки отпуска топлива (литры)
 * При уровне ниже этого значения отпуск топлива должен быть заблокирован
 */
const BLOCK_THRESHOLD_LITERS = 800;
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
  return 'border-border';
}

/**
 * Получить цвет фона карточки
 */
function getBgColor(currentPercent: number, warning: number = 20, critical: number = 10) {
  if (currentPercent <= critical) return 'bg-red-100 dark:bg-red-900/10';
  if (currentPercent <= warning) return 'bg-yellow-100 dark:bg-yellow-900/10';
  return 'bg-card/50';
}

/**
 * Получить цвет прогресс-бара заполнения
 */
function getFillLevelColor(level: number, warning: number = 20, critical: number = 10) {
  if (level <= critical) return 'bg-red-500';
  if (level <= warning) return 'bg-yellow-500';
  return 'bg-emerald-600';
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

  // Проверяем есть ли резервуары без данных уровнемера
  const noSensorTanks = tanks.filter(tank => tank.noSensorData);

  // Проверяем есть ли заблокированные резервуары (< 800 литров) — только при наличии данных уровнемера
  const blockedTanks = tanks.filter(tank => !tank.noSensorData && tank.currentLevelLiters < BLOCK_THRESHOLD_LITERS);

  // Проверяем есть ли критические уровни — только при наличии данных уровнемера
  const criticalTanks = tanks.filter(tank => {
    if (tank.noSensorData) return false;
    const currentPercent = tank.capacityLiters > 0 ? (tank.currentLevelLiters / tank.capacityLiters) * 100 : 0;
    const threshold = thresholds?.thresholds?.find(t => t.fuelType === tank.fuelType);
    const critical = threshold?.levelCritical || 10;
    return currentPercent <= critical;
  });

  const warningTanks = tanks.filter(tank => {
    if (tank.noSensorData) return false;
    const currentPercent = tank.capacityLiters > 0 ? (tank.currentLevelLiters / tank.capacityLiters) * 100 : 0;
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

      // Получаем дату 3 дней назад (оптимизация: меньше период = быстрее запрос)
      const dateTo = new Date();
      const dateFrom = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

      // Загружаем транзакции за последние 3 дня (оптимизировано для скорости)
      const allTransactions = await stsApiService.getTransactions(
        dateFrom.toISOString().split('T')[0],
        dateTo.toISOString().split('T')[0],
        2000, // уменьшенный лимит для быстрого ответа
        {
          networkId,
          tradingPointId: tradingPoint.external_id
        }
      );

      // ✅ ФИЛЬТРАЦИЯ: STS API игнорирует date_from/date_to, фильтруем на клиенте
      const transactions = allTransactions.filter(tx => {
        if (!tx.date && !tx.startTime) return false;
        const txDate = new Date(tx.date || tx.startTime);
        return txDate >= dateFrom && txDate <= dateTo;
      });

      // Группируем транзакции по видам топлива и считаем суммарную реализацию
      const fuelSales: Record<string, number> = {};
      const fuelDates: Record<string, Set<string>> = {};

      transactions.forEach(tx => {
        const fuelType = tx.fuelType;
        const volume = tx.volume || 0;
        const txDate = (tx.date || tx.startTime)?.split('T')[0];

        if (fuelType && txDate) {
          fuelSales[fuelType] = (fuelSales[fuelType] || 0) + volume;

          // Отслеживаем уникальные даты для точного расчёта
          if (!fuelDates[fuelType]) {
            fuelDates[fuelType] = new Set();
          }
          fuelDates[fuelType].add(txDate);
        }
      });

      // Рассчитываем среднедневную реализацию и остаток дней
      const remaining: FuelRemaining = {};

      Object.keys(fuelSales).forEach(fuelType => {
        const totalSales = fuelSales[fuelType];
        // ✅ ИСПРАВЛЕНИЕ: Используем реальное количество дней с продажами
        const actualDays = fuelDates[fuelType]?.size || 3;
        const avgDailySales = actualDays > 0 ? totalSales / actualDays : 0;

        // Находим текущий остаток по этому виду топлива
        const tanksOfType = tanks.filter(t => t.fuelType === fuelType);
        const currentVolume = tanksOfType.reduce((sum, t) => sum + t.currentLevelLiters, 0);

        // ✅ ИСПРАВЛЕНИЕ: Рассчитываем до критического уровня, а не до нуля
        const threshold = thresholds?.thresholds?.find(t => t.fuelType === fuelType);
        const criticalPercent = threshold?.levelCritical || 10;
        const totalCapacity = tanksOfType.reduce((sum, t) => sum + t.capacityLiters, 0);
        const criticalVolume = (totalCapacity * criticalPercent) / 100;

        // Сколько литров до критического уровня
        const volumeUntilCritical = Math.max(0, currentVolume - criticalVolume);

        // Рассчитываем сколько дней осталось до критического уровня
        const daysRemaining = avgDailySales > 0 ? volumeUntilCritical / avgDailySales : 0;

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

  // ✅ ОПТИМИЗАЦИЯ: Отложенный запуск расчета после рендера страницы
  // Используем setTimeout с задержкой 100мс, чтобы страница успела отрисоваться
  useEffect(() => {
    if (networkId && stationCode && tanks.length > 0) {
      const timer = setTimeout(() => {
        calculateRemainingTime();
      }, 100); // Страница отрисуется первой, потом начнется расчет

      return () => clearTimeout(timer);
    }
  }, [networkId, stationCode]);

  if (tanks.length === 0) {
    return null;
  }

  return (
    <div className={`rounded-lg ${isMobile ? 'p-4' : 'p-6'} border-2 ${
      criticalTanks.length > 0 ? 'border-red-500 bg-red-100 dark:bg-red-900/10' :
      warningTanks.length > 0 ? 'border-yellow-500 bg-yellow-100 dark:bg-yellow-900/10' :
      'border-border bg-card/50'
    } hover:border-border transition-colors`}>
      {/* Заголовок */}
      <div className={`${isMobile ? 'space-y-3 mb-3' : 'flex items-center justify-between mb-4'}`}>
        {/* Заголовок */}
        <div className="flex items-center gap-3">
          <Fuel className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-blue-600 dark:text-blue-400`} />
          <div className="flex-1 min-w-0">
            <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-foreground`}>
              Резервуары
            </h3>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
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
              className="border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-colors"
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
            className="w-full border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-colors"
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

      {/* Баннер БЛОКИРОВКИ отпуска топлива (< 800 литров) */}
      {blockedTanks.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border-l-4 bg-red-100 dark:bg-red-900/30 border-red-600">
          <div className="flex items-start gap-2">
            <Ban className="w-5 h-5 flex-shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-200">
                ВНИМАНИЕ: Отпуск топлива заблокирован для {blockedTanks.length} {blockedTanks.length === 1 ? 'резервуара' : 'резервуаров'} (уровень &lt; 800 л)
              </p>
              <ul className="mt-1 text-xs text-red-600 dark:text-red-300">
                {blockedTanks.map((tank, idx) => (
                  <li key={idx}>
                    {tank.name} ({tank.fuelType}): {tank.currentLevelLiters.toLocaleString()} л
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Баннер: нет данных от уровнемеров */}
      {noSensorTanks.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border-l-4 bg-yellow-100 dark:bg-yellow-900/20 border-yellow-500">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-yellow-500" />
            <div>
              <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-200">
                Нет данных от уровнемеров для {noSensorTanks.length} {noSensorTanks.length === 1 ? 'резервуара' : 'резервуаров'}
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-300/80 mt-0.5">
                Отображается книжный остаток (начало смены минус отпуск)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Предупреждающее сообщение */}
      {(criticalTanks.length > 0 || warningTanks.length > 0) && (
        <div className={`mb-4 p-3 rounded-lg border-l-4 ${
          criticalTanks.length > 0
            ? 'bg-red-100 dark:bg-red-900/20 border-red-500'
            : 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-500'
        }`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
              criticalTanks.length > 0 ? 'text-red-500' : 'text-yellow-500'
            }`} />
            <p className={`text-sm ${
              criticalTanks.length > 0 ? 'text-red-700 dark:text-red-200' : 'text-yellow-700 dark:text-yellow-200'
            }`}>
              {criticalTanks.length > 0
                ? `Критически низкий уровень топлива: ${criticalTanks.map(t => t.name).join(', ')}!`
                : `Низкий уровень топлива: ${warningTanks.map(t => t.name).join(', ')}`
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
              className="w-full border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Рассчитать остаток времени
            </Button>
          )}

          {tanks.map((tank, index) => {
              const currentPercent = tank.capacityLiters > 0 ? (tank.currentLevelLiters / tank.capacityLiters) * 100 : 0;
              const threshold = thresholds?.thresholds?.find(t => t.fuelType === tank.fuelType);
              const warning = threshold?.levelWarning || 20;
              const critical = threshold?.levelCritical || 10;
              const isBlocked = !tank.noSensorData && tank.currentLevelLiters < BLOCK_THRESHOLD_LITERS;

              return (
                <div
                  key={index}
                  className={`rounded-lg p-4 border-2 ${isBlocked ? 'border-red-600 bg-red-100 dark:bg-red-900/20' : tank.noSensorData ? 'border-yellow-600 bg-yellow-100 dark:bg-yellow-900/10' : `${getBorderColor(currentPercent, warning, critical)} ${getBgColor(currentPercent, warning, critical)}`}`}
                >
                  {/* Баннер блокировки для мобильного вида */}
                  {isBlocked && (
                    <div className="mb-3 p-2 rounded bg-red-600/30 border border-red-500 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <span className="text-xs font-semibold text-red-700 dark:text-red-200">ОТПУСК ЗАБЛОКИРОВАН</span>
                    </div>
                  )}

                  {/* Баннер: нет данных уровнемера */}
                  {tank.noSensorData && (
                    <div className="mb-3 p-2 rounded bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-600 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-200">Книжный остаток (нет данных уровнемера)</span>
                    </div>
                  )}

                  {/* Заголовок резервуара */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Fuel className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <div className="text-sm font-semibold text-foreground">{tank.name}</div>
                        <div className="text-xs text-muted-foreground">{tank.fuelType}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {tank.noSensorData ? (
                        <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">—</div>
                      ) : (
                        <div className={`text-xl font-bold ${getFuelLevelColor(currentPercent, warning, critical)}`}>
                          {Math.round(currentPercent)}%
                        </div>
                      )}
                      {isBlocked ? (
                        <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0">
                          <Lock className="w-2.5 h-2.5 mr-0.5" />
                          Блок
                        </Badge>
                      ) : tank.noSensorData ? (
                        <Badge className="bg-yellow-600 text-white text-[10px] px-1.5 py-0">
                          книжный
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                          Активен
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Прогресс-бар (скрываем при отсутствии данных уровнемера) */}
                  {!tank.noSensorData && (
                    <div className="mb-3">
                      <div className="flex-1 bg-secondary rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${getFillLevelColor(currentPercent, warning, critical)}`}
                          style={{ width: `${Math.max(currentPercent, 2)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Объемы */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-secondary/50 p-2 rounded">
                      <div className="text-xs text-muted-foreground">{tank.noSensorData ? 'Расчётный остаток' : 'Факт'}</div>
                      <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{tank.currentLevelLiters.toLocaleString()} л</div>
                    </div>
                    <div className="bg-secondary/50 p-2 rounded">
                      <div className="text-xs text-muted-foreground">{tank.noSensorData ? 'Книжный нач.' : 'Емкость'}</div>
                      <div className="text-sm font-bold text-foreground/80">
                        {tank.noSensorData
                          ? `${(tank.apiData?.volume_begin || 0).toLocaleString()} л`
                          : `${tank.capacityLiters.toLocaleString()} л`
                        }
                      </div>
                    </div>
                  </div>

                  {/* Остаток времени */}
                  {fuelRemaining[tank.fuelType] && (
                    <div className="bg-secondary/30 p-2 rounded mb-3">
                      <div className="text-xs text-muted-foreground mb-1">Остаток времени</div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-foreground">
                          {fuelRemaining[tank.fuelType].daysRemaining.toFixed(1)} дн
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({fuelRemaining[tank.fuelType].avgDailySales.toFixed(0)} л/день)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Пороговые значения */}
                  {isSettingsExpanded ? (
                    <div className="border-t border-border pt-3 space-y-2">
                      <div className="text-xs font-medium text-foreground/80 mb-2">Пороговые значения (%)</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">⚠️ Предупреждение</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={thresholdForm[tank.fuelType]?.warning || ''}
                            onChange={(e) => updateThreshold(tank.fuelType, 'warning', e.target.value)}
                            className="bg-card border-border text-foreground h-10 text-sm mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">🔴 Критично</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={thresholdForm[tank.fuelType]?.critical || ''}
                            onChange={(e) => updateThreshold(tank.fuelType, 'critical', e.target.value)}
                            className="bg-card border-border text-foreground h-10 text-sm mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-border pt-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-500">⚠️</span>
                        {!isMobile && <span className="text-muted-foreground">Предупреждение:</span>}
                        <span className="text-foreground font-medium">{warning}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-red-500">🔴</span>
                        {!isMobile && <span className="text-muted-foreground">Критично:</span>}
                        <span className="text-foreground font-medium">{critical}%</span>
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
              <tr className="border-b border-border">
                <th className="text-left pb-2 px-2 text-foreground/80 font-medium">Резервуар</th>
                <th className="text-left pb-2 px-2 text-foreground/80 font-medium">Топливо</th>
                <th className="text-left pb-2 px-2 text-foreground/80 font-medium">Объем емкости</th>
                <th className="text-left pb-2 px-2 text-foreground/80 font-medium">Факт</th>
                <th className="text-center pb-2 px-2 text-foreground/80 font-medium">Статус</th>
                <th className="text-left pb-2 px-2 text-foreground/80 font-medium">Заполнение</th>
                <th className="text-center pb-2 px-2 text-foreground/80 font-medium">Порог ⚠️ (%)</th>
                <th className="text-center pb-2 px-2 text-foreground/80 font-medium">Порог 🔴 (%)</th>
                <th className="text-center pb-2 px-2 text-foreground/80 font-medium">
                  <div className="flex items-center justify-center gap-2">
                    <span>Осталось времени</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={calculateRemainingTime}
                      disabled={calculating}
                      className="h-6 px-2 py-0 text-xs border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white"
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
                const currentPercent = tank.capacityLiters > 0 ? (tank.currentLevelLiters / tank.capacityLiters) * 100 : 0;
                const threshold = thresholds?.thresholds?.find(t => t.fuelType === tank.fuelType);
                const warning = threshold?.levelWarning || 20;
                const critical = threshold?.levelCritical || 10;
                const isBlocked = !tank.noSensorData && tank.currentLevelLiters < BLOCK_THRESHOLD_LITERS;

                return (
                  <tr key={index} className={`border-b border-border hover:bg-secondary/30 ${isBlocked ? 'bg-red-100 dark:bg-red-900/20' : tank.noSensorData ? 'bg-yellow-100 dark:bg-yellow-900/10' : ''}`}>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <Fuel className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-foreground font-medium">{tank.name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-foreground/80">{tank.fuelType}</td>
                    <td className="py-2 px-2 text-foreground/80">
                      {tank.noSensorData ? '—' : `${tank.capacityLiters.toLocaleString()} л`}
                    </td>
                    <td className="py-2 px-2 text-blue-600 dark:text-blue-400 font-bold">
                      {tank.currentLevelLiters.toLocaleString()} л
                      {tank.noSensorData && <span className="text-yellow-600 dark:text-yellow-400 text-xs ml-1">(книж.)</span>}
                    </td>
                    {/* Колонка статуса */}
                    <td className="py-2 px-2 text-center">
                      {isBlocked ? (
                        <Badge className="bg-red-600 text-white hover:bg-red-700 text-xs">
                          <Lock className="w-3 h-3 mr-1" />
                          Блокировка
                        </Badge>
                      ) : tank.noSensorData ? (
                        <Badge className="bg-yellow-600 text-white hover:bg-yellow-700 text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Книжный
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Активен
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      {tank.noSensorData ? (
                        <span className="text-sm text-yellow-600 dark:text-yellow-400">—</span>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-secondary rounded-full h-2 min-w-[60px]">
                            <div
                              className={`h-2 rounded-full ${getFillLevelColor(currentPercent, warning, critical)}`}
                              style={{ width: `${Math.max(currentPercent, 2)}%` }}
                            />
                          </div>
                          <span className="text-sm text-foreground/80 min-w-[35px]">{Math.round(currentPercent)}%</span>
                        </div>
                      )}
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
                          className="bg-card border-border text-foreground h-7 text-sm w-16 text-center"
                        />
                      ) : (
                        <span className="text-foreground font-medium">{warning}</span>
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
                          className="bg-card border-border text-foreground h-7 text-sm w-16 text-center"
                        />
                      ) : (
                        <span className="text-foreground font-medium">{critical}</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {fuelRemaining[tank.fuelType] ? (
                        <div className="flex flex-col items-center">
                          <span className="text-foreground font-semibold">
                            {fuelRemaining[tank.fuelType].daysRemaining.toFixed(1)} дн
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({fuelRemaining[tank.fuelType].avgDailySales.toFixed(0)} л/день)
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
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
        <div className="mt-4 flex justify-end border-t border-border pt-3">
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
