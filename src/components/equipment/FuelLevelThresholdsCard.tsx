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
  if (currentPercent <= warning) return 'text-amber-500';
  return 'text-green-500';
}

/**
 * Получить цвет границы карточки
 */
function getBorderColor(currentPercent: number, warning: number = 20, critical: number = 10) {
  if (currentPercent <= critical) return 'border-red-500';
  if (currentPercent <= warning) return 'border-amber-400';
  return 'border-border';
}

/**
 * Получить цвет фона карточки
 */
function getBgColor(currentPercent: number, warning: number = 20, critical: number = 10) {
  if (currentPercent <= critical) return 'bg-red-50/50 dark:bg-red-900/10';
  if (currentPercent <= warning) return 'bg-di-surface';
  return 'bg-di-surface';
}

/**
 * Получить цвет прогресс-бара заполнения
 */
function getFillLevelColor(level: number, warning: number = 20, critical: number = 10) {
  if (level <= critical) return 'bg-red-500';
  if (level <= warning) return 'bg-amber-500';
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
    <div className={`${isMobile ? '' : 'bg-di-surface-mid rounded-xl'} overflow-hidden`}>
      {/* Header bar */}
      <div className={`px-6 py-4 ${isMobile ? 'space-y-3' : 'flex items-center justify-between'}`}>
        <div className="flex items-center gap-3">
          <Fuel className="w-5 h-5 text-di-primary-light" />
          <h2 className={`font-headline font-bold text-di-on-surface ${isMobile ? 'text-base' : 'text-lg'}`}>
            Резервуары
          </h2>
          {!isMobile && (
            <div className="flex items-center gap-4 ml-4">
              {criticalTanks.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[10px] font-bold text-di-on-surface-variant uppercase">Критично: {criticalTanks.length}</span>
                </div>
              )}
              {warningTanks.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-di-tertiary-container" />
                  <span className="text-[10px] font-bold text-di-on-surface-variant uppercase">Внимание: {warningTanks.length}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Статистика на мобильных рядом с заголовком */}
          {isMobile && (
            <div className="flex flex-col gap-1">
              {criticalTanks.length > 0 && (
                <Badge className="bg-red-600 text-white hover:bg-red-700 text-xs px-2 py-0.5">
                  🔴 {criticalTanks.length}
                </Badge>
              )}
              {warningTanks.length > 0 && (
                <Badge className="bg-amber-600 text-white hover:bg-amber-700 text-xs px-2 py-0.5">
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
              <Badge className="bg-amber-600 text-white hover:bg-amber-700">
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
        <div className="mb-4 p-3 rounded-lg border-l-4 bg-secondary/50 dark:bg-secondary/30 border-amber-400">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-foreground/90 dark:text-amber-200">
                Нет данных от уровнемеров для {noSensorTanks.length} {noSensorTanks.length === 1 ? 'резервуара' : 'резервуаров'}
              </p>
              <p className="text-xs text-muted-foreground dark:text-amber-300/80 mt-0.5">
                Отображается книжный остаток (начало смены минус отпуск)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Предупреждающее сообщение */}
      {(criticalTanks.length > 0 || warningTanks.length > 0) && (
        <div className={`mb-4 p-3 rounded-lg border-l-4 bg-secondary/50 dark:bg-secondary/30 ${
          criticalTanks.length > 0 ? 'border-red-500' : 'border-amber-400'
        }`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
              criticalTanks.length > 0 ? 'text-red-500' : 'text-amber-500'
            }`} />
            <p className={`text-sm ${
              criticalTanks.length > 0 ? 'text-red-600 dark:text-red-200' : 'text-foreground/90 dark:text-amber-200'
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
        // Мобильный вид — Deep Intel reservoir cards
        <div className="space-y-3 px-4 pb-4">
          {tanks.map((tank, index) => {
              const currentPercent = tank.capacityLiters > 0 ? (tank.currentLevelLiters / tank.capacityLiters) * 100 : 0;
              const threshold = thresholds?.thresholds?.find(t => t.fuelType === tank.fuelType);
              const warning = threshold?.levelWarning || 20;
              const critical = threshold?.levelCritical || 10;
              const isBlocked = !tank.noSensorData && tank.currentLevelLiters < BLOCK_THRESHOLD_LITERS;
              const temp = tank.temperature || tank.apiData?.temperature || 0;
              const waterMm = tank.waterLevelMm || tank.apiData?.water?.level || 0;
              const remaining = fuelRemaining[tank.fuelType];

              // Border color by level
              const borderColor = isBlocked ? 'border-l-[#f87171]'
                : currentPercent <= critical ? 'border-l-[#f87171]'
                : currentPercent <= warning ? 'border-l-[#fbbf24]'
                : 'border-l-di-primary-light/40';

              // Status badge
              const statusText = isBlocked ? 'БЛОК' : tank.noSensorData ? 'КНИЖ.' : currentPercent <= critical ? 'КРИТ.' : currentPercent <= warning ? 'НИЗКИЙ' : 'OK';
              const statusBg = isBlocked || currentPercent <= critical ? 'bg-[#f87171]/10 text-[#f87171] border-[#f87171]/20'
                : currentPercent <= warning ? 'bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/20'
                : 'bg-di-primary/10 text-di-primary-light border-di-primary/20';

              // Remaining color
              const remainColor = remaining
                ? remaining.daysRemaining > 10 ? 'text-[#4ade80]'
                  : remaining.daysRemaining > 3 ? 'text-[#fbbf24]'
                  : 'text-[#f87171]'
                : 'text-di-on-surface-variant';

              return (
                <div key={index} className={`bg-di-surface-mid p-4 rounded-xl border border-di-outline-variant/30 space-y-3`}>
                  {/* Header: name + status */}
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-headline font-bold text-sm uppercase tracking-tight text-di-on-surface">
                        {tank.name} {tank.fuelType}
                      </h4>
                      <p className="text-[10px] text-di-on-surface-variant/50">
                        {tank.noSensorData ? 'Книжный остаток' : `Ёмкость: ${tank.capacityLiters.toLocaleString('ru-RU')} л`}
                      </p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${statusBg}`}>
                      {statusText}
                    </span>
                  </div>

                  {/* Progress bar */}
                  {!tank.noSensorData && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-di-on-surface-variant/60 mb-1">
                        <span>Заполнение</span>
                        <span>{Math.round(currentPercent)}%</span>
                      </div>
                      <div className="w-full h-1 bg-di-surface-highest rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${currentPercent <= critical ? 'bg-[#f87171]' : currentPercent <= warning ? 'bg-[#fbbf24]' : 'bg-di-primary-light'}`}
                          style={{ width: `${Math.max(currentPercent, 2)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 4-column metrics */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-0.5">
                      <p className="text-[8px] text-di-on-surface-variant/50 font-bold uppercase">Объём</p>
                      <p className="font-headline font-bold text-xs text-di-on-surface">
                        {(tank.currentLevelLiters / 1000).toFixed(1)}к л
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] text-di-on-surface-variant/50 font-bold uppercase">Темп</p>
                      <p className="font-headline font-bold text-xs text-di-on-surface">
                        {temp ? `${temp.toFixed(1)}°C` : '—'}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] text-di-on-surface-variant/50 font-bold uppercase">Вода</p>
                      <p className={`font-headline font-bold text-xs ${waterMm > 0 ? 'text-[#fbbf24]' : 'text-[#4ade80]'}`}>
                        {waterMm > 0 ? `${waterMm}мм` : 'нет'}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] text-di-on-surface-variant/50 font-bold uppercase">Осталось</p>
                      <p className={`font-headline font-bold text-xs ${remainColor}`}>
                        {remaining ? `${remaining.daysRemaining.toFixed(1)}д` : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Settings (expanded) */}
                  {isSettingsExpanded && (
                    <div className="border-t border-di-outline-variant/15 pt-2 grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[9px] text-di-outline uppercase">⚠ Порог</Label>
                        <Input type="number" min="0" max="100"
                          value={thresholdForm[tank.fuelType]?.warning || ''}
                          onChange={(e) => updateThreshold(tank.fuelType, 'warning', e.target.value)}
                          className="bg-di-surface-lowest border-di-outline-variant/20 text-di-on-surface h-8 text-sm mt-0.5" />
                      </div>
                      <div>
                        <Label className="text-[9px] text-di-outline uppercase">🔴 Крит.</Label>
                        <Input type="number" min="0" max="100"
                          value={thresholdForm[tank.fuelType]?.critical || ''}
                          onChange={(e) => updateThreshold(tank.fuelType, 'critical', e.target.value)}
                          className="bg-di-surface-lowest border-di-outline-variant/20 text-di-on-surface h-8 text-sm mt-0.5" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        // Desktop вид — Deep Intel Fuel Reservoirs table
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-0.5">
            <thead>
              <tr className="text-[10px] font-bold text-di-on-surface-variant tracking-widest uppercase text-left">
                <th className="px-5 py-2">Резервуар</th>
                <th className="px-3 py-2">Статус</th>
                <th className="px-3 py-2">Заполнение</th>
                <th className="px-3 py-2">Объём</th>
                <th className="px-3 py-2 text-center">t°C</th>
                <th className="px-3 py-2 text-center">Плотн.</th>
                <th className="px-3 py-2 text-center">Вода</th>
                <th className="px-3 py-2 text-center">⚠ %</th>
                <th className="px-3 py-2 text-center">🔴 %</th>
                <th className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span>Осталось</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={calculateRemainingTime}
                      disabled={calculating}
                      className="h-5 px-1.5 py-0 text-[9px] border-di-outline-variant/30 text-di-on-surface-variant hover:bg-di-surface-high"
                    >
                      {calculating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Calculator className="w-3 h-3" />}
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
                const temp = tank.temperature || tank.apiData?.temperature || 0;
                const dens = tank.density || tank.apiData?.density || 0;
                const waterMm = tank.waterLevelMm || tank.apiData?.water?.level || 0;
                const remaining = fuelRemaining[tank.fuelType];
                const daysColor = remaining
                  ? remaining.daysRemaining > 10 ? 'text-[#4ade80]'
                    : remaining.daysRemaining > 3 ? 'text-[#fbbf24]'
                    : 'text-[#f87171]'
                  : '';

                return (
                  <tr key={index} className={`bg-di-surface-high hover:bg-di-surface-highest transition-colors group ${isBlocked ? 'ring-1 ring-red-500/30' : ''}`}>
                    {/* Резервуар */}
                    <td className="px-5 py-2 rounded-l-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-di-primary/10 flex items-center justify-center text-di-primary-light">
                          <Fuel className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-di-on-surface">{tank.name}</p>
                          <p className="text-[10px] text-di-on-surface-variant">{tank.fuelType}</p>
                        </div>
                      </div>
                    </td>
                    {/* Статус */}
                    <td className="px-3 py-2">
                      {isBlocked ? (
                        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f87171]" /><span className="text-[10px] font-bold text-[#f87171]">БЛОК</span></span>
                      ) : tank.noSensorData ? (
                        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#fbbf24]" /><span className="text-[10px] font-bold text-[#fbbf24]">КНИЖ.</span></span>
                      ) : (
                        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#4ade80]" /><span className="text-[10px] font-bold text-[#4ade80]">OK</span></span>
                      )}
                    </td>
                    {/* Level bar */}
                    <td className="px-3 py-2 w-40">
                      {tank.noSensorData ? (
                        <span className="text-[11px] text-di-on-surface-variant">—</span>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-di-surface-lowest rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${currentPercent <= critical ? 'bg-[#f87171]' : currentPercent <= warning ? 'bg-[#fbbf24]' : 'bg-di-primary-light'}`}
                              style={{ width: `${Math.max(currentPercent, 2)}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono font-bold text-di-on-surface min-w-[28px]">{Math.round(currentPercent)}%</span>
                        </div>
                      )}
                    </td>
                    {/* Объём */}
                    <td className="px-3 py-2">
                      <p className="text-[12px] font-mono font-bold tracking-tight text-di-on-surface">
                        {tank.currentLevelLiters.toLocaleString('ru-RU')} л
                      </p>
                    </td>
                    {/* Температура */}
                    <td className="px-3 py-2 text-center">
                      <span className="text-[12px] font-mono font-bold tracking-tight text-di-on-surface">
                        {temp ? `${temp.toFixed(1)}°` : '—'}
                      </span>
                    </td>
                    {/* Плотность */}
                    <td className="px-3 py-2 text-center">
                      <span className="text-[12px] font-mono font-bold tracking-tight text-di-on-surface">
                        {dens ? dens.toFixed(1) : '—'}
                      </span>
                    </td>
                    {/* Вода */}
                    <td className="px-3 py-2 text-center">
                      <span className={`text-[12px] font-mono font-bold tracking-tight ${waterMm > 0 ? 'text-[#fbbf24]' : 'text-[#4ade80]'}`}>
                        {waterMm > 0 ? `${waterMm} мм` : 'нет'}
                      </span>
                    </td>
                    {/* Порог warning */}
                    <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      {isSettingsExpanded ? (
                        <Input type="number" min="0" max="100"
                          value={thresholdForm[tank.fuelType]?.warning || ''}
                          onChange={(e) => updateThreshold(tank.fuelType, 'warning', e.target.value)}
                          onFocus={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}
                          className="bg-di-surface-lowest border-di-outline-variant/20 text-di-on-surface h-6 text-[11px] w-14 text-center" />
                      ) : (
                        <span className="text-[12px] font-bold text-di-on-surface">{warning}</span>
                      )}
                    </td>
                    {/* Порог critical */}
                    <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      {isSettingsExpanded ? (
                        <Input type="number" min="0" max="100"
                          value={thresholdForm[tank.fuelType]?.critical || ''}
                          onChange={(e) => updateThreshold(tank.fuelType, 'critical', e.target.value)}
                          onFocus={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}
                          className="bg-di-surface-lowest border-di-outline-variant/20 text-di-on-surface h-6 text-[11px] w-14 text-center" />
                      ) : (
                        <span className="text-[12px] font-bold text-di-on-surface">{critical}</span>
                      )}
                    </td>
                    {/* Осталось времени — цветовая индикация */}
                    <td className="px-3 py-2 rounded-r-xl text-right">
                      {remaining ? (
                        <div>
                          <p className={`text-sm font-bold font-headline tracking-tight ${daysColor}`}>
                            {remaining.daysRemaining.toFixed(1)} дн
                          </p>
                          <p className="text-[10px] text-di-on-surface-variant">
                            ({remaining.avgDailySales.toFixed(0)} л/д)
                          </p>
                        </div>
                      ) : (
                        <span className="text-di-on-surface-variant">—</span>
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
        <div className="mt-4 flex justify-end border-t border-di-outline-variant/15 pt-3">
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
