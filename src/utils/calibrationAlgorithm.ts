/**
 * Алгоритм расчета калибровочной таблицы резервуара
 * TradePoint Builder v1.8.0
 *
 * ИСПРАВЛЕНИЯ v1.8.0:
 * - Добавлен учёт поступлений (receipts) при расчёте объёмов
 * - Переписана логика prepareDataPoints() с разбиением на сегменты
 * - Исправлен метод наименьших квадратов (корректное решение системы)
 * - Добавлена температурная коррекция объёма
 * - Добавлен учёт слепых зон датчика
 * - Добавлен учёт мёртвого остатка
 * - Улучшен фильтр выбросов (относительно тренда)
 * - Удалены console.log из production кода
 */

import type {
  TankHistoryRecord,
  TransactionItem,
  CalibrationTablePoint,
  TankCalibrationSettings,
  CalibrationMethod,
  ReceiptItem
} from '@/types/tanks';

/**
 * Точка данных для калибровки (уровень + объем + температура)
 */
interface CalibrationDataPoint {
  level_mm: number;       // Уровень в миллиметрах
  volume_liters: number;  // Объем в литрах
  timestamp: number;      // Временная метка
  temperature?: number;   // Температура (опционально)
}

interface ParsedMeasurement {
  time: number;
  level_mm: number;
  volume: number;
  temperature?: number;
}


/**
 * Диагностическая информация для отладки
 */
export interface CalibrationDiagnostics {
  segmentsCount: number;
  totalPointsBeforeFilter: number;
  totalPointsAfterFilter: number;
  receiptsProcessed: number;
  transactionsProcessed: number;
  temperatureCorrectionApplied: boolean;
  blindZonesFiltered: number;
  warnings: string[];
  // Опорная точка для отображения на графике
  referencePoint?: {
    level_mm: number;
    volume_liters: number;
  };
}

/**
 * Результат расчета калибровочной таблицы
 */
export interface CalibrationCalculationResult {
  table: CalibrationTablePoint[];
  data_points_count: number;
  filtered_points_count: number;
  method_used: CalibrationMethod;
  quality_metrics?: {
    r_squared?: number;      // Коэффициент детерминации
    rmse?: number;           // Среднеквадратичная ошибка
    max_error?: number;      // Максимальная ошибка
  };
  diagnostics?: CalibrationDiagnostics;
}

// ============================================================================
// ГЕОМЕТРИЧЕСКИЕ ФУНКЦИИ
// ============================================================================

/**
 * Расчет ПОЛНОГО объема цилиндрического резервуара
 */
export function calculateTankFullVolume(
  diameter_mm: number,
  length_mm: number
): number {
  const R = diameter_mm / 2;
  const volume_mm3 = Math.PI * R * R * length_mm;
  return volume_mm3 / 1000000; // мм³ → литры
}

function getTankLevelCapacity(settings: TankCalibrationSettings): number {
  switch (settings.tank_shape_type) {
    case 'vertical_cylinder':
    case 'rectangular':
      return settings.tank_height_mm;
    case 'spherical':
    case 'horizontal_cylinder':
    default:
      return settings.tank_diameter_mm;
  }
}

function getMeasurableLevelRange(settings: TankCalibrationSettings): {
  minLevelMm: number;
  maxLevelMm: number;
} {
  const minLevelMm = Math.max(0, settings.sensor_blind_zone_bottom_mm || 0);
  const tankCapacityMm = getTankLevelCapacity(settings);
  const maxLevelMm = Math.max(
    minLevelMm,
    tankCapacityMm - (settings.sensor_blind_zone_top_mm || 0)
  );

  return {
    minLevelMm,
    maxLevelMm,
  };
}

function calculateVolumeByTankShape(
  level_mm: number,
  settings: TankCalibrationSettings
): number {
  const maxLevel = getTankLevelCapacity(settings);
  const boundedLevel = Math.max(0, Math.min(level_mm, maxLevel));

  switch (settings.tank_shape_type) {
    case 'horizontal_cylinder':
      return calculateHorizontalCylinderVolume(
        boundedLevel,
        settings.tank_diameter_mm,
        settings.tank_length_mm,
        settings.tank_tilt_angle_degrees
      );

    case 'vertical_cylinder': {
      const radius = settings.tank_diameter_mm / 2;
      return (Math.PI * radius * radius * boundedLevel) / 1000000;
    }

    case 'spherical': {
      const radius = settings.tank_diameter_mm / 2;
      return (Math.PI * boundedLevel * boundedLevel * (radius - boundedLevel / 3)) / 1000000;
    }

    case 'rectangular':
      return (settings.tank_length_mm * settings.tank_width_mm * boundedLevel) / 1000000;

    default:
      return calculateHorizontalCylinderVolume(
        boundedLevel,
        settings.tank_diameter_mm,
        settings.tank_length_mm,
        settings.tank_tilt_angle_degrees
      );
  }
}

function buildLevelSequence(startLevel: number, endLevel: number, step: number): number[] {
  if (step <= 0) {
    throw new Error('Шаг калибровки должен быть > 0');
  }

  const normalizedStart = Math.max(0, startLevel);
  const normalizedEnd = Math.max(normalizedStart, endLevel);
  const levels: number[] = [];

  for (let level = normalizedStart; level < normalizedEnd; level += step) {
    levels.push(level);
  }

  if (levels.length === 0 || Math.abs(levels[levels.length - 1] - normalizedEnd) > 0.001) {
    levels.push(normalizedEnd);
  }

  return levels;
}

/**
 * Расчет площади сегмента круга
 */
function calculateCircleSegmentArea(R: number, h: number): number {
  if (h <= 0) return 0;
  if (h >= 2 * R) return Math.PI * R * R;
  if (h === R) return (Math.PI * R * R) / 2;

  const angle = Math.acos((R - h) / R);
  const term1 = R * R * angle;
  const term2 = (R - h) * Math.sqrt(2 * R * h - h * h);

  return term1 - term2;
}

/**
 * Расчет объема горизонтального цилиндрического резервуара по уровню
 */
export function calculateHorizontalCylinderVolume(
  level_mm: number,
  diameter_mm: number,
  length_mm: number,
  tilt_angle_degrees: number = 0
): number {
  const R = diameter_mm / 2;
  const h = level_mm;

  if (h < 0) return 0;
  if (h > diameter_mm) return calculateTankFullVolume(diameter_mm, length_mm);
  if (h === 0) return 0;
  if (h === diameter_mm) return calculateTankFullVolume(diameter_mm, length_mm);

  const segment_area_mm2 = calculateCircleSegmentArea(R, h);
  const volume_mm3 = segment_area_mm2 * length_mm;
  let volume_liters = volume_mm3 / 1000000;

  // Учет угла наклона (упрощенная коррекция)
  if (tilt_angle_degrees !== 0) {
    const tilt_correction = 1 + (Math.abs(tilt_angle_degrees) / 90) * 0.05;
    volume_liters *= tilt_correction;
  }

  return volume_liters;
}

/**
 * ОБРАТНАЯ ФУНКЦИЯ: Расчёт уровня по объёму для горизонтального цилиндра
 * Использует бинарный поиск, так как аналитического решения нет
 *
 * @param volume_liters - Объём в литрах
 * @param settings - Настройки калибровки (содержат диаметр, длину, угол наклона)
 * @returns Уровень в мм
 */
export function calculateLevelFromVolume(
  volume_liters: number,
  settings: TankCalibrationSettings
): number {
  const diameter_mm = settings.tank_diameter_mm;
  const length_mm = settings.tank_length_mm;
  const tilt_angle = settings.tank_tilt_angle_degrees || 0;

  const fullVolume = calculateTankFullVolume(diameter_mm, length_mm);

  // Граничные случаи
  if (volume_liters <= 0) return 0;
  if (volume_liters >= fullVolume) return diameter_mm;

  // Бинарный поиск уровня
  let low = 0;
  let high = diameter_mm;
  const tolerance = 0.1; // точность 0.1 мм

  while (high - low > tolerance) {
    const mid = (low + high) / 2;
    const volumeAtMid = calculateHorizontalCylinderVolume(mid, diameter_mm, length_mm, tilt_angle);

    if (volumeAtMid < volume_liters) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

// ============================================================================
// ТЕМПЕРАТУРНАЯ КОРРЕКЦИЯ
// ============================================================================

/**
 * Коррекция объёма с учётом температуры
 * Формула: V_corrected = V × (1 + α × (T - T_base))
 *
 * @param volume - Измеренный объём (литры)
 * @param actualTemp - Фактическая температура (°C)
 * @param settings - Настройки калибровки
 * @returns Скорректированный объём (литры)
 */
export function correctVolumeForTemperature(
  volume: number,
  actualTemp: number,
  settings: TankCalibrationSettings
): number {
  if (!Number.isFinite(actualTemp)) return volume;

  const alpha = settings.thermal_expansion_coefficient;
  const T_base = settings.base_temperature;

  // Проверка на допустимый диапазон температур
  if (actualTemp < settings.working_temp_min || actualTemp > settings.working_temp_max) {
    return volume; // Не корректируем при экстремальных температурах
  }

  return volume * (1 + alpha * (actualTemp - T_base));
}

/**
 * Обратная коррекция - приведение к базовой температуре
 */
export function normalizeVolumeToBaseTemperature(
  volume: number,
  actualTemp: number,
  settings: TankCalibrationSettings
): number {
  if (!Number.isFinite(actualTemp)) return volume;

  const alpha = settings.thermal_expansion_coefficient;
  const T_base = settings.base_temperature;

  return volume / (1 + alpha * (actualTemp - T_base));
}

// ============================================================================
// УЧЁТ СЛЕПЫХ ЗОН И МЁРТВОГО ОСТАТКА
// ============================================================================

/**
 * Проверка, находится ли уровень в слепой зоне датчика
 */
function isInBlindZone(
  level_mm: number,
  settings: TankCalibrationSettings
): boolean {
  // Слепая зона снизу
  if (level_mm < settings.sensor_blind_zone_bottom_mm) {
    return true;
  }

  // Слепая зона сверху (относительно диаметра резервуара)
  const maxMeasurableLevel = getTankLevelCapacity(settings) - settings.sensor_blind_zone_top_mm;
  if (level_mm > maxMeasurableLevel) {
    return true;
  }

  return false;
}

/**
 * Корректировка объёма с учётом мёртвого остатка
 */
function adjustForDeadStock(
  volume: number,
  settings: TankCalibrationSettings
): number {
  // Мёртвый остаток - объём топлива ниже уровня всасывания
  // Он НЕ доступен для отпуска, но учитывается датчиком
  return Math.max(0, volume - settings.dead_stock_liters);
}

// ============================================================================
// ПОСТРОЕНИЕ КАЛИБРОВОЧНЫХ ТАБЛИЦ
// ============================================================================

/**
 * Построить ГЕОМЕТРИЧЕСКУЮ калибровочную таблицу на основе физических параметров
 */
export function buildGeometricCalibrationTable(
  settings: TankCalibrationSettings
): CalibrationCalculationResult {

  const table: CalibrationTablePoint[] = [];
  const step = settings.calibration_step_mm || 100;
  const { minLevelMm, maxLevelMm } = getMeasurableLevelRange(settings);

  for (const level of buildLevelSequence(minLevelMm, maxLevelMm, step)) {
    const volume = adjustForDeadStock(
      calculateVolumeByTankShape(level, settings),
      settings
    );
    table.push({
      level_mm: level,
      volume_liters: Math.max(0, volume)
    });
  }

  return {
    table,
    data_points_count: table.length,
    filtered_points_count: table.length,
    method_used: 'direct_interpolation',
    quality_metrics: {
      r_squared: 1.0,
      rmse: 0,
      max_error: 0
    }
  };
}

/**
 * Построить текущую калибровочную таблицу из показаний API (level, volume)
 */
export function buildCurrentCalibrationTable(
  history: TankHistoryRecord[],
  settings: TankCalibrationSettings
): CalibrationCalculationResult {

  const dataPoints: CalibrationDataPoint[] = history
    .map(record => ({
      level_mm: parseFloat(record.level) * 10,
      volume_liters: parseFloat(record.volume),
      timestamp: new Date(record.dt).getTime(),
      temperature: parseFloat(record.temperature)
    }))
    .filter(p => !isNaN(p.level_mm) && !isNaN(p.volume_liters));

  const filteredPoints = filterDataPoints(dataPoints, settings);

  if (filteredPoints.length < 2) {
    return {
      table: [],
      data_points_count: dataPoints.length,
      filtered_points_count: 0,
      method_used: settings.calibration_method,
      quality_metrics: { r_squared: 0, rmse: 0, max_error: 0 }
    };
  }

  const table = buildCalibrationTable(filteredPoints, settings);
  const quality_metrics = calculateQualityMetrics(filteredPoints, table, settings.calibration_method);

  return {
    table,
    data_points_count: dataPoints.length,
    filtered_points_count: filteredPoints.length,
    method_used: settings.calibration_method,
    quality_metrics
  };
}

/**
 * Рассчитать калибровочную таблицу на основе исторических данных и транзакций
 * ОСНОВНОЙ АЛГОРИТМ - учитывает поступления и отпуски
 */
export function calculateCalibrationTable(
  history: TankHistoryRecord[],
  transactions: TransactionItem[],
  settings: TankCalibrationSettings,
  tankNumber: number,
  receipts?: ReceiptItem[],
  currentTable?: CalibrationTablePoint[],
  fuelCode?: number
): CalibrationCalculationResult {

  const diagnostics: CalibrationDiagnostics = {
    segmentsCount: 0,
    totalPointsBeforeFilter: 0,
    totalPointsAfterFilter: 0,
    receiptsProcessed: 0,
    transactionsProcessed: 0,
    temperatureCorrectionApplied: false,
    blindZonesFiltered: 0,
    warnings: []
  };

  // 1. Подготовка данных с учетом поступлений и транзакций
  const dataPoints = prepareDataPointsWithReceipts(
    history,
    transactions,
    receipts || [],
    settings,
    tankNumber,
    diagnostics,
    currentTable,
    fuelCode
  );

  diagnostics.totalPointsBeforeFilter = dataPoints.length;

  if (dataPoints.length < 2) {
    diagnostics.warnings.push('Недостаточно данных для калибровки');
    return {
      table: [],
      data_points_count: 0,
      filtered_points_count: 0,
      method_used: settings.calibration_method,
      quality_metrics: { r_squared: 0, rmse: 0, max_error: 0 },
      diagnostics
    };
  }

  // 2. Фильтрация данных
  const filteredPoints = filterDataPointsImproved(dataPoints, settings, diagnostics);
  diagnostics.totalPointsAfterFilter = filteredPoints.length;

  if (filteredPoints.length < 2) {
    diagnostics.warnings.push('После фильтрации осталось недостаточно точек');
    return {
      table: [],
      data_points_count: dataPoints.length,
      filtered_points_count: 0,
      method_used: settings.calibration_method,
      quality_metrics: { r_squared: 0, rmse: 0, max_error: 0 },
      diagnostics
    };
  }

  // 3. Построение калибровочной таблицы с привязкой к опорной точке
  const table = buildCalibrationTable(filteredPoints, settings, diagnostics.referencePoint, diagnostics.warnings);

  // 4. Вычисление метрик качества
  const quality_metrics = calculateQualityMetrics(filteredPoints, table, settings.calibration_method, diagnostics.warnings);

  return {
    table,
    data_points_count: dataPoints.length,
    filtered_points_count: filteredPoints.length,
    method_used: settings.calibration_method,
    quality_metrics,
    diagnostics
  };
}

// ============================================================================
// ПОДГОТОВКА ДАННЫХ С УЧЁТОМ ПОСТУПЛЕНИЙ
// ============================================================================

/**
 * Подготовка точек данных с учётом поступлений (receipts) и отпусков (transactions)
 *
 * НОВЫЙ АЛГОРИТМ v1.9.4:
 * - Используется ОДНА опорная точка (с максимальным уровнем)
 * - Объем для опорной точки берется из текущей калибровочной таблицы
 * - ВСЕ остальные объемы вычисляются ТОЛЬКО через данные ТРК
 * - Это устраняет накопление ошибок от неточной калибровочной таблицы
 */
function prepareDataPointsWithReceipts(
  history: TankHistoryRecord[],
  transactions: TransactionItem[],
  receipts: ReceiptItem[],
  settings: TankCalibrationSettings,
  tankNumber: number,
  diagnostics: CalibrationDiagnostics,
  currentTable?: CalibrationTablePoint[],
  fuelCode?: number
): CalibrationDataPoint[] {

  if (history.length === 0) {
    return [];
  }

  const effectiveFuelCode = fuelCode
    ?? history.find(record => record.number === tankNumber && typeof record.fuel === 'number' && record.fuel > 0)?.fuel
    ?? null;

  const hasDirectTankMatches = transactions.some(tx => tx.tank === tankNumber);

  const matchTransactionToTank = (tx: TransactionItem) => {
    if (hasDirectTankMatches) {
      return tx.tank === tankNumber;
    }
    if (effectiveFuelCode !== null) {
      return tx.fuel === effectiveFuelCode;
    }
    return tx.tank === tankNumber;
  };

  if (settings.reference_source === 'current_table' && (!currentTable || currentTable.length === 0)) {
    diagnostics.warnings.push('Источник опорной точки "текущая таблица" выбран, но активная таблица недоступна. Используется геометрия.');
  }

  // Подготовка транзакций для данного резервуара
  const tankTransactions = transactions
    .filter(matchTransactionToTank)
    .map(tx => ({
      time: new Date(tx.dt || '').getTime(),
      quantity: typeof tx.quantity === 'string' ? parseFloat(tx.quantity) : tx.quantity,
      type: 'release' as const
    }))
    .filter(tx => !isNaN(tx.quantity) && tx.quantity > 0)
    .sort((a, b) => a.time - b.time);

  diagnostics.transactionsProcessed = tankTransactions.length;

  if (hasDirectTankMatches) {
    diagnostics.warnings.push(`Отпуски ТРК сопоставлены по номеру резервуара ${tankNumber}.`);
  } else if (effectiveFuelCode !== null) {
    diagnostics.warnings.push(`Отпуски ТРК сопоставлены по коду топлива ${effectiveFuelCode}, так как совпадений по резервуару ${tankNumber} не найдено.`);
  } else {
    diagnostics.warnings.push('Код топлива резервуара не определен. Использована fallback-фильтрация транзакций по номеру резервуара, она может быть неточной.');
  }

  // Подготовка поступлений для данного резервуара
  const tankReceipts = receipts
    .filter(r => r.tank === tankNumber)
    .map(r => ({
      time: new Date(r.dt).getTime(),
      volume: typeof r.fact?.volume === 'string' ? parseFloat(r.fact.volume) : (r.fact?.volume || 0),
      type: 'receipt' as const
    }))
    .filter(r => !isNaN(r.volume) && r.volume > 0)
    .sort((a, b) => a.time - b.time);

  diagnostics.receiptsProcessed = tankReceipts.length;

  if (tankTransactions.length === 0 && tankReceipts.length === 0) {
    diagnostics.warnings.push('За выбранный период не найдено ни одного реального отпуска ТРК или поступления для этого резервуара.');
    return [];
  }

  // Сортируем историю по времени
  const sortedHistory = [...history]
    .filter(r => r.number === tankNumber)
    .sort((a, b) => new Date(a.dt).getTime() - new Date(b.dt).getTime());

  if (sortedHistory.length === 0) {
    return [];
  }

  // НОВЫЙ АЛГОРИТМ: Одна опорная точка
  return calculateFromSingleReferencePoint(
    sortedHistory,
    tankTransactions,
    tankReceipts,
    settings,
    diagnostics,
    currentTable
  );
}

/**
 * НОВЫЙ АЛГОРИТМ: Расчёт от одной опорной точки
 *
 * 1. Находим точку с МАКСИМАЛЬНЫМ уровнем (после поступления и стабилизации)
 * 2. Берём объём для неё из ГЕОМЕТРИЧЕСКОГО расчёта (эталон!)
 * 3. Вычисляем объёмы для ВСЕХ остальных точек через ТРК данные:
 *    - Вниз (отпуски): volume = reference - Σ(отпуски)
 *    - Вверх (поступления): volume = reference + Σ(поступления)
 */
function calculateFromSingleReferencePoint(
  sortedHistory: TankHistoryRecord[],
  transactions: { time: number; quantity: number; type: 'release' }[],
  receipts: { time: number; volume: number; type: 'receipt' }[],
  settings: TankCalibrationSettings,
  diagnostics: CalibrationDiagnostics,
  currentTable?: CalibrationTablePoint[]
): CalibrationDataPoint[] {

  const rawMeasurements: ParsedMeasurement[] = sortedHistory.map(record => ({
    time: new Date(record.dt).getTime(),
    level_mm: parseFloat(record.level) * 10,
    volume: parseFloat(record.volume),
    temperature: parseFloat(record.temperature)
  }));

  const averagedMeasurements = averageMeasurementsByWindow(rawMeasurements, settings, diagnostics);
  const parsedHistory = filterMeasurementsByRestWindow(
    averagedMeasurements,
    transactions,
    receipts,
    settings,
    diagnostics
  );

  if (parsedHistory.length === 0) {
    diagnostics.warnings.push('После усреднения и окна стабилизации не осталось валидных измерений датчика.');
    return [];
  }

  // Находим опорную точку - просто МАКСИМАЛЬНЫЙ уровень в периоде
  let referencePoint: { time: number; level_mm: number; volume: number; temperature?: number } | null = null;
  let maxLevel = -1;
  let refSourceUsed = 'geometry';

  for (const record of parsedHistory) {
    // Проверяем слепую зону
    if (isInBlindZone(record.level_mm, settings)) continue;

    // Просто ищем максимальный уровень
    if (record.level_mm > maxLevel) {
      maxLevel = record.level_mm;

      let referenceVolume = 0;
      let sourceUsed = 'geometry';

      // Выбор источника объема для опорной точки
      if (settings.reference_source === 'manual' && settings.manual_reference_volume) {
        referenceVolume = settings.manual_reference_volume;
        sourceUsed = 'manual';
      } else if (settings.reference_source === 'current_table' && currentTable && currentTable.length > 0) {
        // Интерполяция по текущей таблице
        referenceVolume = interpolateVolumeFromTable(record.level_mm, currentTable);
        sourceUsed = 'current_table';

        // Если точка вне диапазона текущей таблицы, фоллбек на геометрию
        if (referenceVolume === null) {
          referenceVolume = calculateVolumeByTankShape(record.level_mm, settings);
          sourceUsed = 'geometry_fallback';
        }
      } else {
        // По умолчанию - геометрия
        referenceVolume = calculateVolumeByTankShape(record.level_mm, settings);
        sourceUsed = 'geometry';
      }

      referencePoint = {
        time: record.time,
        level_mm: record.level_mm,
        volume: referenceVolume,
        temperature: record.temperature
      };

      refSourceUsed = sourceUsed;
    }
  }

  if (!referencePoint) {
    diagnostics.warnings.push('Не найдена опорная точка для калибровки');
    return [];
  }

  // Валидация значений опорной точки перед использованием
  const refLevelMm = referencePoint.level_mm;
  const refVolume = referencePoint.volume;

  if (isNaN(refLevelMm) || isNaN(refVolume)) {
    diagnostics.warnings.push(`❌ Опорная точка содержит NaN: level_mm=${refLevelMm}, volume=${refVolume}`);
    return [];
  }

  const sourceLabel = refSourceUsed === 'manual' ? 'вручную'
    : refSourceUsed === 'current_table' ? 'из таблицы'
    : refSourceUsed === 'geometry_fallback' ? 'геометрия (фоллбек)'
    : 'геометрия';
  diagnostics.warnings.push(
    `⭐ Опорная точка: уровень ${refLevelMm.toFixed(0)} мм (физ.), объём ${refVolume.toFixed(0)} л (${sourceLabel})`
  );

  diagnostics.referencePoint = {
    level_mm: refLevelMm,
    volume_liters: refVolume
  };

  // 4. Создаём timeline из уже распарсенных данных
  type TimelineEvent =
    | { time: number; type: 'measurement'; level_mm: number; temperature?: number }
    | { time: number; type: 'release'; quantity: number }
    | { time: number; type: 'receipt'; volume: number };

  const timeline: TimelineEvent[] = [];

  // Добавляем измерения (уже распарсены)
  for (const record of parsedHistory) {
    if (!isInBlindZone(record.level_mm, settings)) {
      timeline.push({
        time: record.time,
        type: 'measurement',
        level_mm: record.level_mm,
        temperature: record.temperature
      });
    } else {
      diagnostics.blindZonesFiltered++;
    }
  }

  // Добавляем отпуски и поступления
  for (const tx of transactions) {
    timeline.push({ time: tx.time, type: 'release', quantity: tx.quantity });
  }
  for (const r of receipts) {
    timeline.push({ time: r.time, type: 'receipt', volume: r.volume });
  }

  // Сортируем timeline
  timeline.sort((a, b) => a.time - b.time);

  // 5. Находим индекс опорной точки
  const result: CalibrationDataPoint[] = [];
  const refTime = referencePoint.time;
  const refLevel = referencePoint.level_mm;

  let refIndex = -1;
  for (let i = 0; i < timeline.length; i++) {
    const e = timeline[i];
    if (e.type === 'measurement' &&
      Math.abs(e.time - refTime) < 60000 &&
      Math.abs(e.level_mm - refLevel) < 10) {
      refIndex = i;
      break;
    }
  }

  if (refIndex === -1) {
    diagnostics.warnings.push('Опорная точка не найдена в timeline');
    return [];
  }

  // Добавляем опорную точку
  let referenceVolume = referencePoint.volume;

  // Температурная коррекция опорной точки
  if (referencePoint.temperature && !isNaN(referencePoint.temperature)) {
    referenceVolume = normalizeVolumeToBaseTemperature(
      referenceVolume,
      referencePoint.temperature,
      settings
    );
    diagnostics.temperatureCorrectionApplied = true;
  }

  result.push({
    level_mm: referencePoint.level_mm,
    volume_liters: adjustForDeadStock(referenceVolume, settings),
    timestamp: referencePoint.time,
    temperature: referencePoint.temperature
  });

  // 4. Идём НАЗАД от опорной точки (в прошлое)
  let volumeBackward = referenceVolume;
  let lastBackwardAcceptedVolume = adjustForDeadStock(referenceVolume, settings);
  let skippedByMinChange = 0;
  const minChangeForCalibration = Math.max(0, settings.min_change_for_calibration_liters || 0);

  for (let i = refIndex - 1; i >= 0; i--) {
    const event = timeline[i];

    if (event.type === 'release') {
      // Отпуск был ДО опорной точки → объём был БОЛЬШЕ
      volumeBackward += event.quantity;
    } else if (event.type === 'receipt') {
      // Поступление было ДО опорной точки → объём был МЕНЬШЕ до него
      volumeBackward -= event.volume;
    } else if (event.type === 'measurement') {
      let volume = volumeBackward;

      // Температурная коррекция
      if (event.temperature && !isNaN(event.temperature)) {
        volume = normalizeVolumeToBaseTemperature(volume, event.temperature, settings);
      }

      // Проверка на отрицательный объём
      if (volume < 0) {
        diagnostics.warnings.push(
          `Отрицательный объём (${volume.toFixed(0)} л) на уровне ${event.level_mm.toFixed(0)} мм - возможно пропущено поступление`
        );
        continue;
      }

      const adjustedVolume = adjustForDeadStock(volume, settings);
      if (minChangeForCalibration > 0 && Math.abs(adjustedVolume - lastBackwardAcceptedVolume) < minChangeForCalibration) {
        skippedByMinChange++;
        continue;
      }

      // Используем РЕАЛЬНЫЙ уровень датчика!
      // Это связывает показания датчика (level_mm) с реальным объёмом (по ТРК)
      result.push({
        level_mm: event.level_mm,  // Уровень датчика
        volume_liters: adjustedVolume,  // Объём по ТРК
        timestamp: event.time,
        temperature: event.temperature
      });
      lastBackwardAcceptedVolume = adjustedVolume;
    }
  }

  // 5. Идём ВПЕРЁД от опорной точки (в будущее)
  let volumeForward = referenceVolume;
  let lastForwardAcceptedVolume = adjustForDeadStock(referenceVolume, settings);

  for (let i = refIndex + 1; i < timeline.length; i++) {
    const event = timeline[i];

    if (event.type === 'release') {
      // Отпуск ПОСЛЕ опорной точки → объём стал МЕНЬШЕ
      volumeForward -= event.quantity;
    } else if (event.type === 'receipt') {
      // Поступление ПОСЛЕ опорной точки → объём стал БОЛЬШЕ
      volumeForward += event.volume;
    } else if (event.type === 'measurement') {
      let volume = volumeForward;

      // Температурная коррекция
      if (event.temperature && !isNaN(event.temperature)) {
        volume = normalizeVolumeToBaseTemperature(volume, event.temperature, settings);
      }

      // Проверка на отрицательный объём
      if (volume < 0) {
        diagnostics.warnings.push(
          `Отрицательный объём (${volume.toFixed(0)} л) на уровне ${event.level_mm.toFixed(0)} мм - возможно пропущено поступление`
        );
        continue;
      }

      const adjustedVolume = adjustForDeadStock(volume, settings);
      if (minChangeForCalibration > 0 && Math.abs(adjustedVolume - lastForwardAcceptedVolume) < minChangeForCalibration) {
        skippedByMinChange++;
        continue;
      }

      // Используем РЕАЛЬНЫЙ уровень датчика!
      // Это связывает показания датчика (level_mm) с реальным объёмом (по ТРК)
      result.push({
        level_mm: event.level_mm,  // Уровень датчика
        volume_liters: adjustedVolume,  // Объём по ТРК
        timestamp: event.time,
        temperature: event.temperature
      });
      lastForwardAcceptedVolume = adjustedVolume;
    }
  }

  if (skippedByMinChange > 0) {
    diagnostics.warnings.push(
      `Пропущено ${skippedByMinChange} измерений с изменением меньше ${minChangeForCalibration} л.`
    );
  }

  diagnostics.segmentsCount = 1; // Теперь один "сегмент" - вся шкала

  return result;
}

function averageMeasurementsByWindow(
  measurements: ParsedMeasurement[],
  settings: TankCalibrationSettings,
  diagnostics: CalibrationDiagnostics
): ParsedMeasurement[] {
  const windowMinutes = Math.max(0, settings.averaging_period_minutes || 0);

  if (measurements.length < 2 || windowMinutes <= 0) {
    return measurements;
  }

  const windowMs = windowMinutes * 60 * 1000;
  const sorted = [...measurements].sort((a, b) => a.time - b.time);
  const averaged: ParsedMeasurement[] = [];
  let bucket: ParsedMeasurement[] = [];
  let bucketStart = sorted[0].time;

  const flushBucket = () => {
    if (bucket.length === 0) return;

    const avgTime = bucket.reduce((sum, item) => sum + item.time, 0) / bucket.length;
    const avgLevel = bucket.reduce((sum, item) => sum + item.level_mm, 0) / bucket.length;
    const avgVolume = bucket.reduce((sum, item) => sum + item.volume, 0) / bucket.length;
    const validTemperatures = bucket
      .map(item => item.temperature)
      .filter((temperature): temperature is number => typeof temperature === 'number' && !isNaN(temperature));
    const avgTemperature = validTemperatures.length > 0
      ? validTemperatures.reduce((sum, item) => sum + item, 0) / validTemperatures.length
      : undefined;

    averaged.push({
      time: avgTime,
      level_mm: avgLevel,
      volume: avgVolume,
      temperature: avgTemperature
    });
  };

  for (const measurement of sorted) {
    if (bucket.length === 0) {
      bucket.push(measurement);
      bucketStart = measurement.time;
      continue;
    }

    if (measurement.time - bucketStart < windowMs) {
      bucket.push(measurement);
      continue;
    }

    flushBucket();
    bucket = [measurement];
    bucketStart = measurement.time;
  }

  flushBucket();

  if (averaged.length < measurements.length) {
    diagnostics.warnings.push(
      `Показания датчика усреднены по окну ${windowMinutes} мин: ${measurements.length} -> ${averaged.length} точек.`
    );
  }

  return averaged;
}

function filterMeasurementsByRestWindow(
  measurements: ParsedMeasurement[],
  transactions: { time: number; quantity: number; type: 'release' }[],
  receipts: { time: number; volume: number; type: 'receipt' }[],
  settings: TankCalibrationSettings,
  diagnostics: CalibrationDiagnostics
): ParsedMeasurement[] {
  const restMinutes = Math.max(0, settings.tank_rest_time_minutes || 0);

  if (measurements.length === 0 || restMinutes <= 0) {
    return measurements;
  }

  const restWindowMs = restMinutes * 60 * 1000;
  const eventTimes = [
    ...transactions.map(item => item.time),
    ...receipts.map(item => item.time)
  ].sort((a, b) => a - b);

  if (eventTimes.length === 0) {
    return measurements;
  }

  let filteredCount = 0;
  let eventIndex = 0;
  const stableMeasurements: ParsedMeasurement[] = [];

  for (const measurement of measurements) {
    while (eventIndex < eventTimes.length && eventTimes[eventIndex] <= measurement.time) {
      eventIndex++;
    }

    const previousEventTime = eventIndex > 0 ? eventTimes[eventIndex - 1] : null;
    if (previousEventTime !== null && measurement.time - previousEventTime < restWindowMs) {
      filteredCount++;
      continue;
    }

    stableMeasurements.push(measurement);
  }

  if (filteredCount > 0) {
    diagnostics.warnings.push(
      `Отфильтровано ${filteredCount} измерений в окне стабилизации ${restMinutes} мин после отпусков и поступлений.`
    );
  }

  if (stableMeasurements.length === 0) {
    diagnostics.warnings.push(
      'Окно стабилизации исключило все измерения. Использованы усредненные показания без фильтра покоя.'
    );
    return measurements;
  }

  return stableMeasurements;
}

// ============================================================================
// ФИЛЬТРАЦИЯ ДАННЫХ (УЛУЧШЕННАЯ)
// ============================================================================

/**
 * Улучшенная фильтрация точек данных с использованием скользящей регрессии
 */
function filterDataPointsImproved(
  points: CalibrationDataPoint[],
  settings: TankCalibrationSettings,
  diagnostics: CalibrationDiagnostics
): CalibrationDataPoint[] {

  if (points.length < 5) {
    return points; // Недостаточно точек для фильтрации
  }

  let filtered = [...points];

  // 1. Фильтр выбросов по σ-методу (относительно ТРЕНДА, не среднего)
  if (settings.outlier_filter_enabled) {
    filtered = filterOutliersByTrend(filtered, settings.outlier_filter_sigma ?? 2.0);
  }

  // 2. Фильтрация резких скачков (относительно локального тренда)
  if (settings.bias_offset_percent > 0) {
    filtered = filterByLocalTrend(filtered, settings.bias_offset_percent);
  }

  return filtered;
}

/**
 * Фильтрация выбросов относительно линейного тренда
 */
function filterOutliersByTrend(
  points: CalibrationDataPoint[],
  sigma: number
): CalibrationDataPoint[] {

  if (points.length < 5) return points;

  // Вычисляем линейный тренд
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.level_mm, 0);
  const sumY = points.reduce((s, p) => s + p.volume_liters, 0);
  const sumXY = points.reduce((s, p) => s + p.level_mm * p.volume_liters, 0);
  const sumX2 = points.reduce((s, p) => s + p.level_mm * p.level_mm, 0);

  const denominator = n * sumX2 - sumX * sumX;
  if (Math.abs(denominator) < 0.001) return points; // Избегаем деления на ноль

  const a = (n * sumXY - sumX * sumY) / denominator;
  const b = (sumY - a * sumX) / n;

  // Вычисляем отклонения от тренда
  const residuals = points.map(p => p.volume_liters - (a * p.level_mm + b));
  const meanResidual = residuals.reduce((s, r) => s + r, 0) / n;
  const variance = residuals.reduce((s, r) => s + (r - meanResidual) ** 2, 0) / n;
  const std = Math.sqrt(variance);

  if (std < 0.001) return points; // Все точки на линии

  // Фильтруем точки с отклонением > sigma * std
  const threshold = sigma * std;

  return points.filter((p, i) => Math.abs(residuals[i] - meanResidual) <= threshold);
}

/**
 * Фильтрация по локальному тренду (скользящее окно)
 */
function filterByLocalTrend(
  points: CalibrationDataPoint[],
  maxDeviationPercent: number
): CalibrationDataPoint[] {

  if (points.length < 3) return points;

  // Сортируем по уровню
  const sorted = [...points].sort((a, b) => a.level_mm - b.level_mm);
  const result: CalibrationDataPoint[] = [];

  const windowSize = Math.min(5, Math.floor(sorted.length / 3));

  for (let i = 0; i < sorted.length; i++) {
    // Вычисляем локальный тренд в окрестности точки
    const windowStart = Math.max(0, i - windowSize);
    const windowEnd = Math.min(sorted.length, i + windowSize + 1);
    const window = sorted.slice(windowStart, windowEnd);

    if (window.length < 3) {
      result.push(sorted[i]);
      continue;
    }

    // Линейная регрессия для окна
    const n = window.length;
    const sumX = window.reduce((s, p) => s + p.level_mm, 0);
    const sumY = window.reduce((s, p) => s + p.volume_liters, 0);
    const sumXY = window.reduce((s, p) => s + p.level_mm * p.volume_liters, 0);
    const sumX2 = window.reduce((s, p) => s + p.level_mm * p.level_mm, 0);

    const denominator = n * sumX2 - sumX * sumX;
    if (Math.abs(denominator) < 0.001) {
      result.push(sorted[i]);
      continue;
    }

    const a = (n * sumXY - sumX * sumY) / denominator;
    const b = (sumY - a * sumX) / n;

    // Ожидаемое значение по тренду
    const expectedVolume = a * sorted[i].level_mm + b;
    const actualVolume = sorted[i].volume_liters;

    // Отклонение в процентах
    let deviationPercent: number;
    if (Math.abs(expectedVolume) < 1) {
      // При околонулевом ожидаемом объёме используем абсолютное сравнение
      // Порог 10 л — допустимый абсолютный шум для нулевого уровня
      deviationPercent = Math.abs(actualVolume) > 10 ? maxDeviationPercent + 1 : 0;
    } else {
      deviationPercent = Math.abs((actualVolume - expectedVolume) / expectedVolume) * 100;
    }

    if (deviationPercent <= maxDeviationPercent) {
      result.push(sorted[i]);
    }
  }

  return result;
}

/**
 * Базовая фильтрация (для обратной совместимости)
 */
function filterDataPoints(
  points: CalibrationDataPoint[],
  settings: TankCalibrationSettings
): CalibrationDataPoint[] {

  let filtered = [...points];

  if (settings.outlier_filter_enabled && points.length > 10) {
    const volumes = points.map(p => p.volume_liters);
    const mean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const variance = volumes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / volumes.length;
    const std = Math.sqrt(variance);

    const sigma = settings.outlier_filter_sigma ?? 2.0;
    const lower_bound = mean - sigma * std;
    const upper_bound = mean + sigma * std;

    filtered = filtered.filter(p =>
      p.volume_liters >= lower_bound && p.volume_liters <= upper_bound
    );
  }

  return filtered;
}

// ============================================================================
// ПОСТРОЕНИЕ КАЛИБРОВОЧНОЙ ТАБЛИЦЫ
// ============================================================================

/**
 * Построение калибровочной таблицы выбранным методом
 *
 * @param referencePoint - опорная точка для привязки кривой (опционально)
 * Если указана, вся кривая сдвигается так, чтобы проходить через эту точку
 */
function buildCalibrationTable(
  points: CalibrationDataPoint[],
  settings: TankCalibrationSettings,
  referencePoint?: { level_mm: number; volume_liters: number },
  warnings?: string[]
): CalibrationTablePoint[] {

  const validPoints = points.filter(p =>
    p &&
    typeof p.level_mm === 'number' &&
    typeof p.volume_liters === 'number' &&
    !isNaN(p.level_mm) &&
    !isNaN(p.volume_liters)
  );

  if (validPoints.length < 2) {
    throw new Error('Недостаточно данных для построения калибровочной таблицы (минимум 2 точки)');
  }

  const levels = validPoints.map(p => p.level_mm);
  const min_level = Math.min(...levels);
  const max_level = Math.max(...levels);

  const step = settings.calibration_step_mm || 100;

  if (step <= 0) {
    throw new Error('calibration_step_mm должен быть > 0');
  }
  if (max_level <= 0) {
    throw new Error('Максимальный уровень данных должен быть > 0');
  }

  const table: CalibrationTablePoint[] = [];
  const start_level = Math.floor(min_level / step) * step;

  // Вычисляем смещение для привязки к опорной точке
  let offset = 0;
  if (referencePoint && !isNaN(referencePoint.level_mm) && !isNaN(referencePoint.volume_liters)) {
    // Вычисляем значение регрессии в опорной точке
    const regressionValueAtRef = interpolateVolume(
      referencePoint.level_mm,
      validPoints,
      settings.calibration_method
    );
    // Смещение = заданное значение - значение регрессии
    offset = referencePoint.volume_liters - regressionValueAtRef;
  }

  for (const level of buildLevelSequence(start_level, max_level, step)) {
    const volume = interpolateVolume(level, validPoints, settings.calibration_method);
    const interpolatedVolume = volume + offset;

    if (interpolatedVolume < 0 && warnings) {
      warnings.push(
        `⚠️ Отрицательный интерполированный объём (${interpolatedVolume.toFixed(1)} л) на уровне ${level} мм — обнулён`
      );
    }

    table.push({
      level_mm: level,
      volume_liters: Math.max(0, interpolatedVolume)
    });
  }

  return table;
}

// ============================================================================
// МЕТОДЫ ИНТЕРПОЛЯЦИИ
// ============================================================================

/**
 * Интерполяция объема для заданного уровня
 */
function interpolateVolume(
  level: number,
  points: CalibrationDataPoint[],
  method: CalibrationMethod
): number {

  switch (method) {
    case 'least_squares':
      return leastSquaresInterpolate(level, points);

    case 'moving_average':
      return movingAverageInterpolate(level, points);

    case 'direct_interpolation':
      return directInterpolate(level, points);

    default:
      // Fallback для устаревших значений (например 'linear_regression')
      return leastSquaresInterpolate(level, points);
  }
}

/**
 * Линейная регрессия: y = a*x + b
 */
function linearRegressionInterpolate(
  level: number,
  points: CalibrationDataPoint[]
): number {

  const validPoints = points.filter(p =>
    p && typeof p.level_mm === 'number' && typeof p.volume_liters === 'number' &&
    !isNaN(p.level_mm) && !isNaN(p.volume_liters)
  );

  const n = validPoints.length;

  if (n < 2) {
    throw new Error('linearRegressionInterpolate: недостаточно валидных точек');
  }

  const sumX = validPoints.reduce((sum, p) => sum + p.level_mm, 0);
  const sumY = validPoints.reduce((sum, p) => sum + p.volume_liters, 0);
  const sumXY = validPoints.reduce((sum, p) => sum + p.level_mm * p.volume_liters, 0);
  const sumX2 = validPoints.reduce((sum, p) => sum + p.level_mm * p.level_mm, 0);

  const denominator = n * sumX2 - sumX * sumX;
  if (Math.abs(denominator) < 0.001) {
    // Все точки на вертикальной линии - возвращаем среднее
    return sumY / n;
  }

  const a = (n * sumXY - sumX * sumY) / denominator;
  const b = (sumY - a * sumX) / n;

  return a * level + b;
}

/**
 * Метод наименьших квадратов (полиномиальная регрессия 2-й степени)
 * ИСПРАВЛЕННАЯ ВЕРСИЯ - корректное решение системы методом Гаусса
 */
function leastSquaresInterpolate(
  level: number,
  points: CalibrationDataPoint[]
): number {

  const validPoints = points.filter(p =>
    p && typeof p.level_mm === 'number' && typeof p.volume_liters === 'number' &&
    !isNaN(p.level_mm) && !isNaN(p.volume_liters)
  );

  const n = validPoints.length;

  if (n < 4) {
    return linearRegressionInterpolate(level, validPoints);
  }

  // Нормализация данных для численной стабильности
  const meanX = validPoints.reduce((s, p) => s + p.level_mm, 0) / n;
  const meanY = validPoints.reduce((s, p) => s + p.volume_liters, 0) / n;

  const stdX = Math.sqrt(validPoints.reduce((s, p) => s + (p.level_mm - meanX) ** 2, 0) / n) || 1;
  const stdY = Math.sqrt(validPoints.reduce((s, p) => s + (p.volume_liters - meanY) ** 2, 0) / n) || 1;

  const normalized = validPoints.map(p => ({
    x: (p.level_mm - meanX) / stdX,
    y: (p.volume_liters - meanY) / stdY
  }));

  // КУБИЧЕСКАЯ регрессия: y = a₃x³ + a₂x² + a₁x + a₀
  // Система нормальных уравнений 4×4 (метод Гаусса)
  const degree = 3;
  const size = degree + 1; // 4

  // Суммы степеней x: S[k] = Σ xᵢᵏ
  const S: number[] = new Array(2 * degree + 1).fill(0);
  // Правая часть: T[k] = Σ xᵢᵏ * yᵢ
  const T: number[] = new Array(size).fill(0);

  for (const p of normalized) {
    let xpow = 1;
    for (let k = 0; k <= 2 * degree; k++) {
      S[k] += xpow;
      if (k <= degree) T[k] += xpow * p.y;
      xpow *= p.x;
    }
  }

  // Матрица системы (augmented)
  const A: number[][] = [];
  for (let row = 0; row < size; row++) {
    A[row] = [];
    for (let col = 0; col < size; col++) {
      A[row][col] = S[row + col];
    }
    A[row][size] = T[row];
  }

  // Решение методом Гаусса с частичным выбором ведущего элемента
  for (let col = 0; col < size; col++) {
    // Поиск максимального элемента в столбце
    let maxRow = col;
    for (let row = col + 1; row < size; row++) {
      if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) maxRow = row;
    }
    [A[col], A[maxRow]] = [A[maxRow], A[col]];

    if (Math.abs(A[col][col]) < 1e-12) {
      return linearRegressionInterpolate(level, validPoints);
    }

    for (let row = col + 1; row < size; row++) {
      const factor = A[row][col] / A[col][col];
      for (let j = col; j <= size; j++) {
        A[row][j] -= factor * A[col][j];
      }
    }
  }

  // Обратный ход
  const coeffs: number[] = new Array(size).fill(0);
  for (let row = size - 1; row >= 0; row--) {
    let sum = A[row][size];
    for (let col = row + 1; col < size; col++) {
      sum -= A[row][col] * coeffs[col];
    }
    coeffs[row] = sum / A[row][row];
  }

  // Вычисление: y = a₀ + a₁x + a₂x² + a₃x³
  const x_norm = (level - meanX) / stdX;
  let y_norm = 0;
  let xpow = 1;
  for (let k = 0; k < size; k++) {
    y_norm += coeffs[k] * xpow;
    xpow *= x_norm;
  }

  return y_norm * stdY + meanY;
}

/**
 * Скользящее среднее (локальная интерполяция)
 */
function movingAverageInterpolate(
  level: number,
  points: CalibrationDataPoint[]
): number {

  const validPoints = points.filter(p =>
    p && typeof p.level_mm === 'number' && typeof p.volume_liters === 'number' &&
    !isNaN(p.level_mm) && !isNaN(p.volume_liters)
  );

  if (validPoints.length < 2) {
    throw new Error('movingAverageInterpolate: недостаточно валидных точек');
  }

  const sorted = [...validPoints].sort((a, b) => a.level_mm - b.level_mm);
  const windowSize = Math.min(7, validPoints.length);

  // Находим индекс ближайшей точки
  let closestIdx = 0;
  let minDiff = Math.abs(sorted[0].level_mm - level);

  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.abs(sorted[i].level_mm - level);
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = i;
    }
  }

  // Берем окно вокруг ближайшей точки
  const start = Math.max(0, closestIdx - Math.floor(windowSize / 2));
  const end = Math.min(sorted.length, start + windowSize);
  const windowPoints = sorted.slice(start, end);

  // Взвешенное среднее с экспоненциальным затуханием
  let weightedSum = 0;
  let weightSum = 0;

  for (const p of windowPoints) {
    const distance = Math.abs(p.level_mm - level);
    const weight = Math.exp(-distance / (minDiff + 1)); // Экспоненциальное затухание
    weightedSum += p.volume_liters * weight;
    weightSum += weight;
  }

  return weightedSum / weightSum;
}

/**
 * Прямая интерполяция между ближайшими реальными точками
 * 
 * Этот метод НЕ использует регрессию - он просто находит две ближайшие
 * точки (снизу и сверху по уровню) и линейно интерполирует между ними.
 * 
 * Преимущества:
 * - Учитывает реальную форму резервуара, включая деформации
 * - Не "сглаживает" данные как регрессия
 * - Гарантированно проходит через реальные точки измерений
 */
function directInterpolate(
  level: number,
  points: CalibrationDataPoint[]
): number {

  const validPoints = points.filter(p =>
    p && typeof p.level_mm === 'number' && typeof p.volume_liters === 'number' &&
    !isNaN(p.level_mm) && !isNaN(p.volume_liters)
  );

  if (validPoints.length === 0) {
    return 0;
  }

  if (validPoints.length === 1) {
    return validPoints[0].volume_liters;
  }

  // Сортируем по уровню
  const sorted = [...validPoints].sort((a, b) => a.level_mm - b.level_mm);

  // Если уровень меньше минимального - экстраполяция от первых двух точек
  if (level <= sorted[0].level_mm) {
    if (sorted.length >= 2) {
      const p1 = sorted[0];
      const p2 = sorted[1];
      const slope = (p2.volume_liters - p1.volume_liters) / (p2.level_mm - p1.level_mm);
      return p1.volume_liters + slope * (level - p1.level_mm);
    }
    return sorted[0].volume_liters;
  }

  // Если уровень больше максимального - экстраполяция от последних двух точек
  if (level >= sorted[sorted.length - 1].level_mm) {
    if (sorted.length >= 2) {
      const p1 = sorted[sorted.length - 2];
      const p2 = sorted[sorted.length - 1];
      const slope = (p2.volume_liters - p1.volume_liters) / (p2.level_mm - p1.level_mm);
      return p2.volume_liters + slope * (level - p2.level_mm);
    }
    return sorted[sorted.length - 1].volume_liters;
  }

  // Находим две ближайшие точки (снизу и сверху)
  let lowerPoint = sorted[0];
  let upperPoint = sorted[sorted.length - 1];

  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].level_mm <= level && sorted[i + 1].level_mm >= level) {
      lowerPoint = sorted[i];
      upperPoint = sorted[i + 1];
      break;
    }
  }

  // Если точки совпадают по уровню
  if (upperPoint.level_mm === lowerPoint.level_mm) {
    return (lowerPoint.volume_liters + upperPoint.volume_liters) / 2;
  }

  // Линейная интерполяция между двумя точками
  const t = (level - lowerPoint.level_mm) / (upperPoint.level_mm - lowerPoint.level_mm);
  return lowerPoint.volume_liters + t * (upperPoint.volume_liters - lowerPoint.volume_liters);
}

// ============================================================================
// МЕТРИКИ КАЧЕСТВА
// ============================================================================

/**
 * Вычисление метрик качества калибровки
 */
function calculateQualityMetrics(
  points: CalibrationDataPoint[],
  table: CalibrationTablePoint[],
  method: CalibrationMethod,
  warnings?: string[]
): {
  r_squared: number;
  rmse: number;
  max_error: number;
} {

  const validPoints = points.filter(p =>
    p &&
    typeof p.level_mm === 'number' &&
    typeof p.volume_liters === 'number' &&
    !isNaN(p.level_mm) &&
    !isNaN(p.volume_liters)
  );

  if (validPoints.length === 0 || table.length === 0) {
    return { r_squared: 0, rmse: 0, max_error: 0 };
  }

  const errors: number[] = [];
  const actualValues: number[] = [];
  const predictedValues: number[] = [];

  for (const point of validPoints) {
    let predicted = 0;

    // Интерполяция по таблице
    for (let i = 0; i < table.length - 1; i++) {
      if (point.level_mm >= table[i].level_mm && point.level_mm <= table[i + 1].level_mm) {
        const t = (point.level_mm - table[i].level_mm) / (table[i + 1].level_mm - table[i].level_mm);
        predicted = table[i].volume_liters + t * (table[i + 1].volume_liters - table[i].volume_liters);
        break;
      }
    }

    // Линейная экстраполяция за пределами таблицы
    if (point.level_mm < table[0].level_mm && table.length >= 2) {
      const p1 = table[0];
      const p2 = table[1];
      const slope = (p2.volume_liters - p1.volume_liters) / (p2.level_mm - p1.level_mm);
      predicted = p1.volume_liters + slope * (point.level_mm - p1.level_mm);
    } else if (point.level_mm > table[table.length - 1].level_mm && table.length >= 2) {
      const p1 = table[table.length - 2];
      const p2 = table[table.length - 1];
      const slope = (p2.volume_liters - p1.volume_liters) / (p2.level_mm - p1.level_mm);
      predicted = p2.volume_liters + slope * (point.level_mm - p2.level_mm);
    } else if (point.level_mm < table[0].level_mm) {
      predicted = table[0].volume_liters;
    } else if (point.level_mm > table[table.length - 1].level_mm) {
      predicted = table[table.length - 1].volume_liters;
    }

    actualValues.push(point.volume_liters);
    predictedValues.push(predicted);
    errors.push(Math.abs(point.volume_liters - predicted));
  }

  // RMSE
  const mse = errors.reduce((sum, e) => sum + e * e, 0) / errors.length;
  const rmse = Math.sqrt(mse);

  // Максимальная ошибка
  const maxError = Math.max(...errors);

  // R² (коэффициент детерминации)
  const meanActual = actualValues.reduce((a, b) => a + b, 0) / actualValues.length;
  const ssTot = actualValues.reduce((sum, val) => sum + Math.pow(val - meanActual, 2), 0);
  const ssRes = errors.reduce((sum, err) => sum + err * err, 0);
  const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

  if (rSquared < 0 && warnings) {
    warnings.push(
      `⚠️ R² отрицательный (${rSquared.toFixed(4)}) — модель хуже среднего значения, проверьте данные`
    );
  }

  return {
    r_squared: Math.max(0, Math.min(1, rSquared)),
    rmse,
    max_error: maxError
  };
}

/**
 * Интерполяция объема по таблице
 */
function interpolateVolumeFromTable(level: number, table: CalibrationTablePoint[]): number | null {
  if (!table || table.length === 0) return null;

  // Sort table just in case
  const sortedTable = [...table].sort((a, b) => a.level_mm - b.level_mm);

  // Check bounds
  if (level < sortedTable[0].level_mm) return null;
  if (level > sortedTable[sortedTable.length - 1].level_mm) return null;

  // Find interval
  for (let i = 0; i < sortedTable.length - 1; i++) {
    const p1 = sortedTable[i];
    const p2 = sortedTable[i + 1];

    if (level >= p1.level_mm && level <= p2.level_mm) {
      const ratio = (level - p1.level_mm) / (p2.level_mm - p1.level_mm);
      return p1.volume_liters + (p2.volume_liters - p1.volume_liters) * ratio;
    }
  }

  return null;
}
