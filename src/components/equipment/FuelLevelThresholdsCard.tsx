/**
 * Компонент карточки настройки порогов уровня топлива
 * Позволяет настроить критические и предупреждающие уровни для каждого вида топлива
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Fuel,
  Settings,
  Loader2,
  Save,
  AlertTriangle,
  Calculator,
  Lock,
  Ban,
  AlertCircle,
  CheckCircle2,
  Dot,
  Droplet,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";

/**
 * Порог блокировки отпуска топлива (литры)
 * При уровне ниже этого значения отпуск топлива должен быть заблокирован
 */
const BLOCK_THRESHOLD_LITERS = 800;
import type { Tank } from "@/types/tanks";
import type {
  FuelLevelThresholds,
  FuelLevelThreshold,
} from "@/types/tradingpoint";
import { stsApiService } from "@/services/stsApi";
import { tradingPointsService } from "@/services/tradingPointsService";
import {
  EQUIPMENT_CARD_INNER_PADDING_CLASS,
  EQUIPMENT_SURFACE_CARD_CLASS,
  getEquipmentActionButtonClass,
} from "./designTokens";

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

export function FuelLevelThresholdsCard({
  tanks,
  isMobile,
  thresholds,
  onSaveThresholds,
  networkId,
  stationCode,
}: FuelLevelThresholdsCardProps) {
  const [saving, setSaving] = useState(false);
  const [editingTankKey, setEditingTankKey] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [fuelRemaining, setFuelRemaining] = useState<FuelRemaining>({});

  // Получаем уникальные виды топлива из резервуаров
  const fuelTypes = useMemo(
    () =>
      Array.from(new Set(tanks.map((tank) => tank.fuelType).filter(Boolean))),
    [tanks],
  );

  // Создаем форму для каждого вида топлива
  const [thresholdForm, setThresholdForm] = useState<
    Record<string, { warning: string; critical: string }>
  >({});

  // Инициализация формы на основе текущих порогов
  useEffect(() => {
    const initialForm: Record<string, { warning: string; critical: string }> =
      {};

    fuelTypes.forEach((fuelType) => {
      const existingThreshold = thresholds?.thresholds?.find(
        (t) => t.fuelType === fuelType,
      );
      initialForm[fuelType] = {
        warning: existingThreshold?.levelWarning?.toString() || "20",
        critical: existingThreshold?.levelCritical?.toString() || "10",
      };
    });

    setThresholdForm(initialForm);
  }, [fuelTypes, thresholds]);

  // Проверяем есть ли резервуары без данных уровнемера
  const noSensorTanks = tanks.filter((tank) => tank.noSensorData);

  // Проверяем есть ли заблокированные резервуары (< 800 литров) — только при наличии данных уровнемера
  const blockedTanks = tanks.filter(
    (tank) =>
      !tank.noSensorData && tank.currentLevelLiters < BLOCK_THRESHOLD_LITERS,
  );

  // Проверяем есть ли критические уровни — только при наличии данных уровнемера
  const criticalTanks = tanks.filter((tank) => {
    if (tank.noSensorData) return false;
    const currentPercent =
      tank.capacityLiters > 0
        ? (tank.currentLevelLiters / tank.capacityLiters) * 100
        : 0;
    const threshold = thresholds?.thresholds?.find(
      (t) => t.fuelType === tank.fuelType,
    );
    const critical = threshold?.levelCritical || 10;
    return currentPercent <= critical;
  });

  const warningTanks = tanks.filter((tank) => {
    if (tank.noSensorData) return false;
    const currentPercent =
      tank.capacityLiters > 0
        ? (tank.currentLevelLiters / tank.capacityLiters) * 100
        : 0;
    const threshold = thresholds?.thresholds?.find(
      (t) => t.fuelType === tank.fuelType,
    );
    const warning = threshold?.levelWarning || 20;
    const critical = threshold?.levelCritical || 10;
    return currentPercent > critical && currentPercent <= warning;
  });
  const hasHeaderAlert =
    blockedTanks.length > 0 ||
    noSensorTanks.length > 0 ||
    criticalTanks.length > 0 ||
    warningTanks.length > 0;

  const handleSave = async (fuelType: string) => {
    if (!onSaveThresholds) return;

    setSaving(true);
    try {
      const existingThresholds = thresholds?.thresholds ?? [];
      const nextThreshold = {
        fuelType,
        levelWarning: thresholdForm[fuelType]?.warning
          ? Number(thresholdForm[fuelType].warning)
          : 20,
        levelCritical: thresholdForm[fuelType]?.critical
          ? Number(thresholdForm[fuelType].critical)
          : 10,
      };

      const hasExisting = existingThresholds.some(
        (threshold) => threshold.fuelType === fuelType,
      );
      const newThresholds: FuelLevelThreshold[] = hasExisting
        ? existingThresholds.map((threshold) =>
            threshold.fuelType === fuelType ? nextThreshold : threshold,
          )
        : [...existingThresholds, nextThreshold];

      await onSaveThresholds({ thresholds: newThresholds });
      setEditingTankKey(null);
    } catch (error) {
      console.error("Ошибка сохранения порогов топлива:", error);
    } finally {
      setSaving(false);
    }
  };

  const updateThreshold = (
    fuelType: string,
    field: "warning" | "critical",
    value: string,
  ) => {
    setThresholdForm((prev) => ({
      ...prev,
      [fuelType]: {
        ...prev[fuelType],
        [field]: value,
      },
    }));
  };

  const getTankKey = (tank: Tank, index: number): string =>
    `${tank.id}-${index}`;

  const isEditingTank = (tank: Tank, index: number): boolean =>
    editingTankKey === getTankKey(tank, index);

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

      if (
        tradingPoint.external_id === null ||
        tradingPoint.external_id === undefined ||
        tradingPoint.external_id === ""
      ) {
        throw new Error(
          `У торговой точки "${tradingPoint.name}" отсутствует external_id. Настройте его в разделе администрирования.`,
        );
      }

      // Получаем дату 3 дней назад (оптимизация: меньше период = быстрее запрос)
      const dateTo = new Date();
      const dateFrom = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

      // Загружаем транзакции за последние 3 дня (оптимизировано для скорости)
      const allTransactions = await stsApiService.getTransactions(
        dateFrom.toISOString().split("T")[0],
        dateTo.toISOString().split("T")[0],
        2000, // уменьшенный лимит для быстрого ответа
        {
          networkId,
          tradingPointId: tradingPoint.external_id,
        },
      );

      // ✅ ФИЛЬТРАЦИЯ: STS API игнорирует date_from/date_to, фильтруем на клиенте
      const transactions = allTransactions.filter((tx) => {
        if (!tx.date && !tx.startTime) return false;
        const txDate = new Date(tx.date || tx.startTime);
        return txDate >= dateFrom && txDate <= dateTo;
      });

      // Группируем транзакции по видам топлива и считаем суммарную реализацию
      const fuelSales: Record<string, number> = {};
      const fuelDates: Record<string, Set<string>> = {};

      transactions.forEach((tx) => {
        const fuelType = tx.fuelType;
        const volume = tx.volume || 0;
        const txDate = (tx.date || tx.startTime)?.split("T")[0];

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

      Object.keys(fuelSales).forEach((fuelType) => {
        const totalSales = fuelSales[fuelType];
        // ✅ ИСПРАВЛЕНИЕ: Используем реальное количество дней с продажами
        const actualDays = fuelDates[fuelType]?.size || 3;
        const avgDailySales = actualDays > 0 ? totalSales / actualDays : 0;

        // Находим текущий остаток по этому виду топлива
        const tanksOfType = tanks.filter((t) => t.fuelType === fuelType);
        const currentVolume = tanksOfType.reduce(
          (sum, t) => sum + t.currentLevelLiters,
          0,
        );

        // ✅ ИСПРАВЛЕНИЕ: Рассчитываем до критического уровня, а не до нуля
        const threshold = thresholds?.thresholds?.find(
          (t) => t.fuelType === fuelType,
        );
        const criticalPercent = threshold?.levelCritical || 10;
        const totalCapacity = tanksOfType.reduce(
          (sum, t) => sum + t.capacityLiters,
          0,
        );
        const criticalVolume = (totalCapacity * criticalPercent) / 100;

        // Сколько литров до критического уровня
        const volumeUntilCritical = Math.max(0, currentVolume - criticalVolume);

        // Рассчитываем сколько дней осталось до критического уровня
        const daysRemaining =
          avgDailySales > 0 ? volumeUntilCritical / avgDailySales : 0;

        remaining[fuelType] = {
          daysRemaining,
          avgDailySales,
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
    <div
      className={`${isMobile ? "" : EQUIPMENT_SURFACE_CARD_CLASS} overflow-hidden`}
    >
      {/* Header bar */}
      <div
        className={`px-5 py-4 ${isMobile ? "space-y-3" : "flex items-center justify-between"}`}
      >
        <div className="flex items-center gap-3">
          <Fuel className="w-5 h-5 text-di-primary-light" />
          <h2
            className={`font-headline font-bold text-di-on-surface ${isMobile ? "text-base" : "text-lg"}`}
          >
            Резервуары
          </h2>
          {hasHeaderAlert && (
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          )}
          {!isMobile && (
            <div className="flex items-center gap-4 ml-4">
              {criticalTanks.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[10px] font-bold text-di-on-surface-variant uppercase">
                    Критично: {criticalTanks.length}
                  </span>
                </div>
              )}
              {warningTanks.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-di-tertiary-container" />
                  <span className="text-[10px] font-bold text-di-on-surface-variant uppercase">
                    Внимание: {warningTanks.length}
                  </span>
                </div>
              )}
            </div>
          )}
          {isMobile && (
            <div className="flex flex-col gap-1">
              {criticalTanks.length > 0 && (
                <Badge className="inline-flex items-center gap-1 bg-red-600 text-white hover:bg-red-700 text-xs px-2 py-0.5">
                  <AlertCircle className="w-3 h-3" />
                  {criticalTanks.length}
                </Badge>
              )}
              {warningTanks.length > 0 && (
                <Badge className="inline-flex items-center gap-1 bg-amber-600 text-white hover:bg-amber-700 text-xs px-2 py-0.5">
                  <AlertTriangle className="w-3 h-3" />
                  {warningTanks.length}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Статистика для десктопа */}
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
          </div>
        )}
      </div>

      {/* Баннер БЛОКИРОВКИ отпуска топлива (< 800 литров) */}
      {blockedTanks.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border-l-4 bg-red-100 dark:bg-red-900/30 border-red-600">
          <div className="flex items-start gap-2">
            <Ban className="w-5 h-5 flex-shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-200">
                ВНИМАНИЕ: Отпуск топлива заблокирован для {blockedTanks.length}{" "}
                {blockedTanks.length === 1 ? "резервуара" : "резервуаров"}{" "}
                (уровень &lt; 800 л)
              </p>
              <ul className="mt-1 text-xs text-red-600 dark:text-red-300">
                {blockedTanks.map((tank, idx) => (
                  <li key={idx}>
                    {tank.name} ({tank.fuelType}):{" "}
                    {tank.currentLevelLiters.toLocaleString()} л
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
                Нет данных от уровнемеров для {noSensorTanks.length}{" "}
                {noSensorTanks.length === 1 ? "резервуара" : "резервуаров"}
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
        <div
          className={`mb-4 p-3 rounded-lg border-l-4 bg-secondary/50 dark:bg-secondary/30 ${
            criticalTanks.length > 0 ? "border-red-500" : "border-amber-400"
          }`}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle
              className={`w-5 h-5 flex-shrink-0 ${
                criticalTanks.length > 0 ? "text-red-500" : "text-amber-500"
              }`}
            />
            <p
              className={`text-sm ${
                criticalTanks.length > 0
                  ? "text-red-600 dark:text-red-200"
                  : "text-foreground/90 dark:text-amber-200"
              }`}
            >
              {criticalTanks.length > 0
                ? `Критически низкий уровень топлива: ${criticalTanks.map((t) => t.name).join(", ")}!`
                : `Низкий уровень топлива: ${warningTanks.map((t) => t.name).join(", ")}`}
            </p>
          </div>
        </div>
      )}

      {/* Данные резервуаров */}
      {isMobile ? (
        // Мобильный вид — Deep Intel reservoir cards
        <div className="space-y-3 pb-4">
          {tanks.map((tank, index) => {
            const tankKey = getTankKey(tank, index);
            const isEditing = isEditingTank(tank, index);
            const currentPercent =
              tank.capacityLiters > 0
                ? (tank.currentLevelLiters / tank.capacityLiters) * 100
                : 0;
            const threshold = thresholds?.thresholds?.find(
              (t) => t.fuelType === tank.fuelType,
            );
            const warning = threshold?.levelWarning || 20;
            const critical = threshold?.levelCritical || 10;
            const isBlocked =
              !tank.noSensorData &&
              tank.currentLevelLiters < BLOCK_THRESHOLD_LITERS;
            const temp = tank.temperature || tank.apiData?.temperature || 0;
            const waterMm =
              tank.waterLevelMm || tank.apiData?.water?.level || 0;
            const remaining = fuelRemaining[tank.fuelType];

            // Border color by level
            const borderColor = isBlocked
              ? "border-l-[#f87171]"
              : currentPercent <= critical
                ? "border-l-[#f87171]"
                : currentPercent <= warning
                  ? "border-l-[#fbbf24]"
                  : "border-l-di-primary-light/40";

            // Status badge
            const statusText = isBlocked
              ? "БЛОК"
              : tank.noSensorData
                ? "КНИЖ."
                : currentPercent <= critical
                  ? "КРИТ."
                  : currentPercent <= warning
                    ? "НИЗКИЙ"
                    : "НОРМА";
            const statusBg =
              isBlocked || currentPercent <= critical
                ? "bg-[#f87171]/10 text-[#f87171] border-[#f87171]/20"
                : currentPercent <= warning
                  ? "bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/20"
                  : "bg-di-primary/10 text-di-primary-light border-di-primary/20";

            // Remaining color
            const remainColor = remaining
              ? remaining.daysRemaining > 10
                ? "text-[#4ade80]"
                : remaining.daysRemaining > 3
                  ? "text-[#fbbf24]"
                  : "text-[#f87171]"
              : "text-di-on-surface-variant";

            return (
              <div
                key={index}
                className={`${EQUIPMENT_SURFACE_CARD_CLASS} ${EQUIPMENT_CARD_INNER_PADDING_CLASS} space-y-3`}
              >
                {/* Header: name + status */}
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h4 className="font-headline font-bold text-sm uppercase tracking-tight text-di-on-surface">
                      {tank.name} {tank.fuelType}
                    </h4>
                    <p className="text-[10px] text-di-on-surface-variant/50">
                      {tank.noSensorData
                        ? "Книжный остаток"
                        : `Ёмкость: ${tank.capacityLiters.toLocaleString("ru-RU")} л`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${statusBg}`}
                    >
                      {isBlocked ? (
                        <AlertCircle className="w-3 h-3" />
                      ) : tank.noSensorData ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : currentPercent <= critical ? (
                        <AlertCircle className="w-3 h-3" />
                      ) : currentPercent <= warning ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      {statusText}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setEditingTankKey(isEditing ? null : tankKey)
                      }
                      className={`h-8 w-8 p-0 text-di-on-surface-variant hover:bg-di-surface-high hover:text-di-on-surface ${isEditing ? "bg-di-surface-high text-di-on-surface" : ""}`}
                      aria-label={`Настроить пороги для ${tank.name}`}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
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
                        className={`h-full rounded-full ${currentPercent <= critical ? "bg-red-500" : currentPercent <= warning ? "bg-amber-500" : "bg-di-primary-light"}`}
                        style={{ width: `${Math.max(currentPercent, 2)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* 4-column metrics */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-0.5">
                    <p className="text-[8px] text-di-on-surface-variant/50 font-bold uppercase">
                      Объём
                    </p>
                    <p className="font-headline font-bold text-xs text-di-on-surface">
                      {(tank.currentLevelLiters / 1000).toFixed(1)}к л
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[8px] text-di-on-surface-variant/50 font-bold uppercase">
                      Темп
                    </p>
                    <p className="font-headline font-bold text-xs text-di-on-surface">
                      {temp ? `${temp.toFixed(1)}°C` : "—"}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[8px] text-di-on-surface-variant/50 font-bold uppercase">
                      Вода
                    </p>
                    <p
                      className={`inline-flex items-center gap-1 font-headline font-bold text-xs ${waterMm > 0 ? "text-red-500" : "text-di-on-surface-variant"}`}
                    >
                      <Droplet className="w-3 h-3" />
                      {waterMm > 0 ? `${waterMm}мм` : "нет"}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[8px] text-di-on-surface-variant/50 font-bold uppercase">
                      Осталось
                    </p>
                    <p
                      className={`font-headline font-bold text-xs ${remainColor}`}
                    >
                      {remaining
                        ? `${remaining.daysRemaining.toFixed(1)}д`
                        : "—"}
                    </p>
                  </div>
                </div>

                <Collapsible open={isEditing}>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                    <div className="border-t border-di-outline-variant/15 pt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[9px] text-di-outline uppercase">
                            Порог
                          </Label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={thresholdForm[tank.fuelType]?.warning || ""}
                            onChange={(e) =>
                              updateThreshold(
                                tank.fuelType,
                                "warning",
                                e.target.value,
                              )
                            }
                            className="bg-di-surface-lowest border-di-outline-variant/20 text-di-on-surface h-8 text-sm mt-0.5"
                          />
                        </div>
                        <div>
                          <Label className="text-[9px] text-di-outline uppercase">
                            Крит.
                          </Label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={thresholdForm[tank.fuelType]?.critical || ""}
                            onChange={(e) =>
                              updateThreshold(
                                tank.fuelType,
                                "critical",
                                e.target.value,
                              )
                            }
                            className="bg-di-surface-lowest border-di-outline-variant/20 text-di-on-surface h-8 text-sm mt-0.5"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSave(tank.fuelType)}
                          disabled={saving || !onSaveThresholds}
                          className="h-8 gap-2 bg-primary hover:bg-primary/80 text-white"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Применить
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })}
        </div>
      ) : (
        // Desktop вид — Deep Intel Fuel Reservoirs table
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-0.5">
            <thead>
              <tr className="text-[10px] font-bold text-muted-foreground uppercase text-left">
                <th className="px-5 py-3">Резервуар</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Заполнение</th>
                <th className="px-4 py-3">Объём</th>
                <th className="px-4 py-3 text-center">t°C</th>
                <th className="px-4 py-3 text-center">Плотн.</th>
                <th className="px-4 py-3 text-center">Вода</th>
                <th className="px-4 py-3 text-center">Порог %</th>
                <th className="px-4 py-3 text-center">Крит. %</th>
                <th className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span>Осталось</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={calculateRemainingTime}
                      disabled={calculating}
                      className="h-5 px-1.5 py-0 text-[9px] border-di-outline-variant/30 text-di-on-surface-variant hover:bg-di-surface-high"
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
                const tankKey = getTankKey(tank, index);
                const isEditing = isEditingTank(tank, index);
                const currentPercent =
                  tank.capacityLiters > 0
                    ? (tank.currentLevelLiters / tank.capacityLiters) * 100
                    : 0;
                const threshold = thresholds?.thresholds?.find(
                  (t) => t.fuelType === tank.fuelType,
                );
                const warning = threshold?.levelWarning || 20;
                const critical = threshold?.levelCritical || 10;
                const isBlocked =
                  !tank.noSensorData &&
                  tank.currentLevelLiters < BLOCK_THRESHOLD_LITERS;
                const temp = tank.temperature || tank.apiData?.temperature || 0;
                const dens = tank.density || tank.apiData?.density || 0;
                const waterMm =
                  tank.waterLevelMm || tank.apiData?.water?.level || 0;
                const remaining = fuelRemaining[tank.fuelType];
                const daysColor = remaining
                  ? remaining.daysRemaining > 10
                    ? "text-green-500"
                    : remaining.daysRemaining > 3
                      ? "text-amber-500"
                      : "text-red-500"
                  : "";

                return (
                  <tr
                    key={index}
                    className={`bg-di-surface-low hover:bg-di-surface-high/40 transition-colors group ${isBlocked ? "ring-1 ring-red-500/30" : ""}`}
                  >
                    {/* Резервуар */}
                    <td className="px-5 py-4 rounded-l-xl">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Fuel className="w-5 h-5 text-primary shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-foreground">
                              {tank.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {tank.fuelType}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setEditingTankKey(isEditing ? null : tankKey)
                          }
                          className={`h-8 w-8 p-0 text-di-on-surface-variant hover:bg-di-surface-high hover:text-di-on-surface ${isEditing ? "bg-di-surface-high text-di-on-surface" : ""}`}
                          aria-label={`Настроить пороги для ${tank.name}`}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                    {/* Статус */}
                    <td className="px-4 py-4">
                      {isBlocked ? (
                        <span className="inline-flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                          <span className="text-[10px] font-bold text-red-500">
                            БЛОК
                          </span>
                        </span>
                      ) : tank.noSensorData ? (
                        <span className="inline-flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-[10px] font-bold text-amber-500">
                            КНИЖ.
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-[10px] font-bold text-green-600">
                            Норма
                          </span>
                        </span>
                      )}
                    </td>
                    {/* Level bar */}
                    <td className="px-4 py-4 w-44">
                      {tank.noSensorData ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${currentPercent <= critical ? "bg-red-500" : currentPercent <= warning ? "bg-amber-500" : "bg-di-primary-light"}`}
                              style={{
                                width: `${Math.max(currentPercent, 2)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-mono font-bold text-foreground min-w-[32px]">
                            {Math.round(currentPercent)}%
                          </span>
                        </div>
                      )}
                    </td>
                    {/* Объём */}
                    <td className="px-4 py-4">
                      <p className="text-sm font-mono font-bold text-foreground">
                        {tank.currentLevelLiters.toLocaleString("ru-RU")}{" "}
                        <span className="text-muted-foreground font-normal">
                          л
                        </span>
                      </p>
                    </td>
                    {/* Температура */}
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm font-mono text-foreground">
                        {temp ? `${temp.toFixed(1)}°` : "—"}
                      </span>
                    </td>
                    {/* Плотность */}
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm font-mono text-foreground">
                        {dens ? dens.toFixed(1) : "—"}
                      </span>
                    </td>
                    {/* Вода */}
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-sm font-mono font-bold ${waterMm > 0 ? "text-red-500" : "text-muted-foreground"}`}
                      >
                        <Droplet className="w-3.5 h-3.5" />
                        {waterMm > 0 ? `${waterMm} мм` : "нет"}
                      </span>
                    </td>
                    {/* Порог warning */}
                    <td
                      className="px-4 py-4 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isEditing ? (
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={thresholdForm[tank.fuelType]?.warning || ""}
                          onChange={(e) =>
                            updateThreshold(
                              tank.fuelType,
                              "warning",
                              e.target.value,
                            )
                          }
                          onFocus={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-di-surface-lowest border-di-outline-variant/20 text-foreground h-7 text-xs w-16 text-center"
                        />
                      ) : (
                        <span className="text-sm font-bold text-foreground">
                          {warning}
                        </span>
                      )}
                    </td>
                    {/* Порог critical */}
                    <td
                      className="px-4 py-4 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isEditing ? (
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={thresholdForm[tank.fuelType]?.critical || ""}
                          onChange={(e) =>
                            updateThreshold(
                              tank.fuelType,
                              "critical",
                              e.target.value,
                            )
                          }
                          onFocus={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-di-surface-lowest border-di-outline-variant/20 text-foreground h-7 text-xs w-16 text-center"
                        />
                      ) : (
                        <span className="text-sm font-bold text-foreground">
                          {critical}
                        </span>
                      )}
                    </td>
                    {/* Осталось */}
                    <td className="px-4 py-4 rounded-r-xl text-right">
                      <div className="flex items-center justify-end gap-3">
                        {remaining ? (
                          <div>
                            <p
                              className={`text-sm font-headline font-bold tracking-tight ${daysColor}`}
                            >
                              {remaining.daysRemaining.toFixed(1)} дн
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              ({remaining.avgDailySales.toFixed(0)} л/д)
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {isEditing && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleSave(tank.fuelType)}
                            disabled={saving || !onSaveThresholds}
                            className="h-8 gap-2 bg-primary hover:bg-primary/80 text-white"
                          >
                            {saving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            Применить
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
