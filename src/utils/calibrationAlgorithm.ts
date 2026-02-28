/**
 * Алгоритм расчета калибровочной таблицы резервуара
 * TradeControl Builder v1.8.0
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

/**
 * Поступление топлива для обработки
 */
interface ProcessedReceipt {
  time: number;           // Временная метка
  volume: number;         // Объем поступления в литрах
  tankNumber: number;     // Номер резервуара
}

/**
 * Сегмент данных между поступлениями
 */
interface DataSegment {
  startTime: number;
  endTime: number;
  startVolume: number;
  startLevel: number;
  points: CalibrationDataPoint[];
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
  if (!actualTemp || isNaN(actualTemp)) return volume;

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
  if (!actualTemp || isNaN(actualTemp)) return volume;

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
  const maxMeasurableLevel = settings.tank_diameter_mm - settings.sensor_blind_zone_top_mm;
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

  for (let level = 0; level <= settings.tank_diameter_mm; level += step) {
    let volume = 0;

    switch (settings.tank_shape_type) {
      case 'horizontal_cylinder':
        volume = calculateHorizontalCylinderVolume(
          level,
          settings.tank_diameter_mm,
          settings.tank_length_mm,
          settings.tank_tilt_angle_degrees
        );
        break;

      case 'vertical_cylinder':
        const R = settings.tank_diameter_mm / 2;
        volume = (Math.PI * R * R * level) / 1000000;
        break;

      default:
        volume = calculateHorizontalCylinderVolume(
          level,
          settings.tank_diameter_mm,
          settings.tank_length_mm,
          settings.tank_tilt_angle_degrees
        );
    }

    table.push({
      level_mm: level,
      volume_liters: Math.max(0, volume)
    });
  }

  return {
    table,
    data_points_count: table.length,
    filtered_points_count: table.length,
    method_used: 'geometric' as CalibrationMethod,
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
  currentTable?: CalibrationTablePoint[]
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
    currentTable
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
  const table = buildCalibrationTable(filteredPoints, settings, diagnostics.referencePoint);

  // 4. Вычисление метрик качества
  const quality_metrics = calculateQualityMetrics(filteredPoints, table, settings.calibration_method);

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
  currentTable?: CalibrationTablePoint[]
): CalibrationDataPoint[] {

  if (history.length === 0) {
    return [];
  }

  // Подготовка транзакций для данного резервуара
  const tankTransactions = transactions
    .filter(tx => tx.tank === tankNumber)
    .map(tx => ({
      time: new Date(tx.dt || '').getTime(),
      quantity: typeof tx.quantity === 'string' ? parseFloat(tx.quantity) : tx.quantity,
      type: 'release' as const
    }))
    .filter(tx => !isNaN(tx.quantity) && tx.quantity > 0)
    .sort((a, b) => a.time - b.time);

  diagnostics.transactionsProcessed = tankTransactions.length;

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

  // ОПТИМИЗАЦИЯ: Предварительно парсим историю один раз
  const parsedHistory = sortedHistory.map(record => ({
    time: new Date(record.dt).getTime(),
    level_mm: parseFloat(record.level) * 10,
    volume: parseFloat(record.volume),
    temperature: parseFloat(record.temperature)
  }));

  // Находим опорную точку - просто МАКСИМАЛЬНЫЙ уровень в периоде
  let referencePoint: { time: number; level_mm: number; volume: number; temperature?: number } | null = null;
  let maxLevel = -1;

  for (const record of parsedHistory) {
    // Проверяем слепую зону
    if (isInBlindZone(record.level_mm, settings)) continue;

    // Просто ищем максимальный уровень
    if (record.level_mm > maxLevel) {
      maxLevel = record.level_mm;
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

        // Если вернулся 0 (вне диапазона или ошибка), фоллбек на геометрию
        if (referenceVolume === 0 && record.level_mm > 0) {
          referenceVolume = calculateHorizontalCylinderVolume(
            record.level_mm,
            settings.tank_diameter_mm,
            settings.tank_length_mm,
            settings.tank_tilt_angle_degrees || 0
          );
          sourceUsed = 'geometry_fallback';
        }
      } else {
        // По умолчанию - геометрия
        referenceVolume = calculateHorizontalCylinderVolume(
          record.level_mm,
          settings.tank_diameter_mm,
          settings.tank_length_mm,
          settings.tank_tilt_angle_degrees || 0
        );
        sourceUsed = 'geometry';
      }

      referencePoint = {
        time: record.time,
        level_mm: record.level_mm,
        volume: referenceVolume,
        temperature: record.temperature
      };

      // Сохраняем информацию об использованном источнике для диагностики (только для финальной точки)
      // Но так как мы в цикле, это будет перезаписываться. 
      // Мы добавим это в diagnostics после цикла, когда определимся с финальной точкой.
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

  diagnostics.warnings.push(
    `⭐ Опорная точка: уровень ${refLevelMm.toFixed(0)} мм (физ.), объём ${refVolume.toFixed(0)} л (геометрия)`
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

      // Используем РЕАЛЬНЫЙ уровень датчика!
      // Это связывает показания датчика (level_mm) с реальным объёмом (по ТРК)
      result.push({
        level_mm: event.level_mm,  // Уровень датчика
        volume_liters: adjustForDeadStock(volume, settings),  // Объём по ТРК
        timestamp: event.time,
        temperature: event.temperature
      });
    }
  }

  // 5. Идём ВПЕРЁД от опорной точки (в будущее)
  let volumeForward = referenceVolume;

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

      // Используем РЕАЛЬНЫЙ уровень датчика!
      // Это связывает показания датчика (level_mm) с реальным объёмом (по ТРК)
      result.push({
        level_mm: event.level_mm,  // Уровень датчика
        volume_liters: adjustForDeadStock(volume, settings),  // Объём по ТРК
        timestamp: event.time,
        temperature: event.temperature
      });
    }
  }

  diagnostics.segmentsCount = 1; // Теперь один "сегмент" - вся шкала

  return result;
}

/**
 * Создание сегментов между поступлениями
 */
function createSegmentsBetweenReceipts(
  sortedHistory: TankHistoryRecord[],
  receipts: ProcessedReceipt[],
  settings: TankCalibrationSettings
): DataSegment[] {

  const segments: DataSegment[] = [];
  const restTimeMs = settings.tank_rest_time_minutes * 60 * 1000;

  let currentSegmentStart = 0;

  for (const receipt of receipts) {
    // Найти точки ДО поступления
    const pointsBeforeReceipt = sortedHistory.filter((r, idx) => {
      const time = new Date(r.dt).getTime();
      return idx >= currentSegmentStart && time < receipt.time;
    });

    if (pointsBeforeReceipt.length > 0) {
      const firstPoint = pointsBeforeReceipt[0];
      const lastPoint = pointsBeforeReceipt[pointsBeforeReceipt.length - 1];

      segments.push({
        startTime: new Date(firstPoint.dt).getTime(),
        endTime: new Date(lastPoint.dt).getTime(),
        startVolume: parseFloat(firstPoint.volume),
        startLevel: parseFloat(firstPoint.level) * 10,
        points: pointsBeforeReceipt.map(r => ({
          level_mm: parseFloat(r.level) * 10,
          volume_liters: parseFloat(r.volume),
          timestamp: new Date(r.dt).getTime(),
          temperature: parseFloat(r.temperature)
        }))
      });
    }

    // Найти первую стабильную точку ПОСЛЕ поступления (с учётом времени покоя)
    const stableTimeAfterReceipt = receipt.time + restTimeMs;
    const startAfterReceipt = sortedHistory.findIndex(r => {
      const time = new Date(r.dt).getTime();
      return time >= stableTimeAfterReceipt;
    });

    if (startAfterReceipt >= 0) {
      currentSegmentStart = startAfterReceipt;
    }
  }

  // Добавить последний сегмент (после последнего поступления)
  const remainingHistory = sortedHistory.slice(currentSegmentStart);
  if (remainingHistory.length > 0) {
    const firstPoint = remainingHistory[0];
    const lastPoint = remainingHistory[remainingHistory.length - 1];

    segments.push({
      startTime: new Date(firstPoint.dt).getTime(),
      endTime: new Date(lastPoint.dt).getTime(),
      startVolume: parseFloat(firstPoint.volume),
      startLevel: parseFloat(firstPoint.level) * 10,
      points: remainingHistory.map(r => ({
        level_mm: parseFloat(r.level) * 10,
        volume_liters: parseFloat(r.volume),
        timestamp: new Date(r.dt).getTime(),
        temperature: parseFloat(r.temperature)
      }))
    });
  }

  return segments;
}

/**
 * Обработка сегмента - расчёт объёмов с учётом отпусков
 */
function processSegment(
  segment: DataSegment,
  transactions: { time: number; quantity: number }[],
  settings: TankCalibrationSettings,
  diagnostics: CalibrationDiagnostics
): CalibrationDataPoint[] {

  const result: CalibrationDataPoint[] = [];

  // Фильтруем транзакции для этого сегмента
  const segmentTransactions = transactions.filter(
    tx => tx.time >= segment.startTime && tx.time <= segment.endTime
  );

  // Стартовые значения
  let cumulativeRelease = 0;
  let lastProcessedTime = segment.startTime;

  for (const point of segment.points) {
    // Проверка на слепую зону
    if (isInBlindZone(point.level_mm, settings)) {
      diagnostics.blindZonesFiltered++;
      continue;
    }

    // Суммируем все отпуски между последней обработанной точкой и текущей
    for (const tx of segmentTransactions) {
      if (tx.time > lastProcessedTime && tx.time <= point.timestamp) {
        cumulativeRelease += tx.quantity;
      }
    }

    // Рассчитываем скорректированный объём
    let calculatedVolume = segment.startVolume - cumulativeRelease;

    // Температурная коррекция (приведение к базовой температуре)
    if (point.temperature && !isNaN(point.temperature)) {
      calculatedVolume = normalizeVolumeToBaseTemperature(calculatedVolume, point.temperature, settings);
      diagnostics.temperatureCorrectionApplied = true;
    }

    // Коррекция на мёртвый остаток
    const adjustedVolume = adjustForDeadStock(calculatedVolume, settings);

    // Проверка на отрицательный объём (индикатор ошибки)
    if (adjustedVolume < 0) {
      diagnostics.warnings.push(
        `Отрицательный объём (${adjustedVolume.toFixed(1)} л) на уровне ${point.level_mm} мм - возможно пропущено поступление`
      );
      continue; // Пропускаем ошибочную точку
    }

    result.push({
      level_mm: point.level_mm,
      volume_liters: adjustedVolume,
      timestamp: point.timestamp,
      temperature: point.temperature
    });

    lastProcessedTime = point.timestamp;
  }

  return result;
}

/**
 * Обработка без поступлений (fallback для старого алгоритма)
 */
function processSegmentWithoutReceipts(
  sortedHistory: TankHistoryRecord[],
  transactions: { time: number; quantity: number }[],
  settings: TankCalibrationSettings,
  diagnostics: CalibrationDiagnostics
): CalibrationDataPoint[] {

  // Находим лучшую стартовую точку - после значительного повышения уровня
  // (что может указывать на незарегистрированное поступление)
  let bestStartIndex = 0;
  let maxLevelJump = 0;

  for (let i = 1; i < sortedHistory.length; i++) {
    const prevLevel = parseFloat(sortedHistory[i - 1].level);
    const currLevel = parseFloat(sortedHistory[i].level);
    const levelJump = currLevel - prevLevel;

    // Ищем резкий рост уровня (>5% от диаметра)
    if (levelJump > settings.tank_diameter_mm * 0.05 / 10) {
      if (levelJump > maxLevelJump) {
        maxLevelJump = levelJump;
        bestStartIndex = i;
      }
    }
  }

  // Если не нашли скачок - начинаем с точки максимального уровня
  if (bestStartIndex === 0) {
    let maxLevel = parseFloat(sortedHistory[0].level);
    for (let i = 1; i < sortedHistory.length; i++) {
      const level = parseFloat(sortedHistory[i].level);
      if (!isNaN(level) && level > maxLevel) {
        maxLevel = level;
        bestStartIndex = i;
      }
    }
  }

  // Ждём стабилизации уровня
  const restTimeMs = settings.tank_rest_time_minutes * 60 * 1000;
  const startTime = new Date(sortedHistory[bestStartIndex].dt).getTime();

  // Находим первую точку после стабилизации
  let stableStartIndex = bestStartIndex;
  for (let i = bestStartIndex; i < sortedHistory.length; i++) {
    const time = new Date(sortedHistory[i].dt).getTime();
    if (time >= startTime + restTimeMs) {
      stableStartIndex = i;
      break;
    }
  }

  const segment: DataSegment = {
    startTime: new Date(sortedHistory[stableStartIndex].dt).getTime(),
    endTime: new Date(sortedHistory[sortedHistory.length - 1].dt).getTime(),
    startVolume: parseFloat(sortedHistory[stableStartIndex].volume),
    startLevel: parseFloat(sortedHistory[stableStartIndex].level) * 10,
    points: sortedHistory.slice(stableStartIndex).map(r => ({
      level_mm: parseFloat(r.level) * 10,
      volume_liters: parseFloat(r.volume),
      timestamp: new Date(r.dt).getTime(),
      temperature: parseFloat(r.temperature)
    }))
  };

  return processSegment(segment, transactions, settings, diagnostics);
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
    filtered = filterOutliersByTrend(filtered, settings.outlier_filter_sigma);
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
    const deviationPercent = expectedVolume !== 0
      ? Math.abs((actualVolume - expectedVolume) / expectedVolume) * 100
      : 0;

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

    const sigma = settings.outlier_filter_sigma;
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
  referencePoint?: { level_mm: number; volume_liters: number }
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

  for (let level = start_level; level <= max_level; level += step) {
    const volume = interpolateVolume(level, validPoints, settings.calibration_method);

    table.push({
      level_mm: level,
      volume_liters: Math.max(0, volume + offset)  // Применяем смещение
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
    case 'linear_regression':
      return linearRegressionInterpolate(level, points);

    case 'least_squares':
      return leastSquaresInterpolate(level, points);

    case 'moving_average':
      return movingAverageInterpolate(level, points);

    case 'direct_interpolation':
      return directInterpolate(level, points);

    default:
      return linearRegressionInterpolate(level, points);
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

  // Если точек мало, используем линейную регрессию
  if (n < 6) {
    return linearRegressionInterpolate(level, validPoints);
  }

  // Нормализация данных для численной стабильности
  const meanX = validPoints.reduce((s, p) => s + p.level_mm, 0) / n;
  const meanY = validPoints.reduce((s, p) => s + p.volume_liters, 0) / n;

  const stdX = Math.sqrt(validPoints.reduce((s, p) => s + (p.level_mm - meanX) ** 2, 0) / n) || 1;
  const stdY = Math.sqrt(validPoints.reduce((s, p) => s + (p.volume_liters - meanY) ** 2, 0) / n) || 1;

  // Нормализованные данные
  const normalized = validPoints.map(p => ({
    x: (p.level_mm - meanX) / stdX,
    y: (p.volume_liters - meanY) / stdY
  }));

  // Формируем систему нормальных уравнений для квадратичной регрессии
  // y = a*x^2 + b*x + c
  let S0 = n, S1 = 0, S2 = 0, S3 = 0, S4 = 0;
  let T0 = 0, T1 = 0, T2 = 0;

  for (const p of normalized) {
    const x = p.x;
    const y = p.y;
    const x2 = x * x;
    const x3 = x2 * x;
    const x4 = x2 * x2;

    S1 += x;
    S2 += x2;
    S3 += x3;
    S4 += x4;
    T0 += y;
    T1 += x * y;
    T2 += x2 * y;
  }

  // Матрица системы:
  // | S0  S1  S2 | | c |   | T0 |
  // | S1  S2  S3 | | b | = | T1 |
  // | S2  S3  S4 | | a |   | T2 |

  // Решение методом Крамера
  const det = S0 * (S2 * S4 - S3 * S3) - S1 * (S1 * S4 - S3 * S2) + S2 * (S1 * S3 - S2 * S2);

  if (Math.abs(det) < 1e-10) {
    // Матрица вырождена - используем линейную регрессию
    return linearRegressionInterpolate(level, validPoints);
  }

  const det_c = T0 * (S2 * S4 - S3 * S3) - S1 * (T1 * S4 - S3 * T2) + S2 * (T1 * S3 - S2 * T2);
  const det_b = S0 * (T1 * S4 - S3 * T2) - T0 * (S1 * S4 - S3 * S2) + S2 * (S1 * T2 - T1 * S2);
  const det_a = S0 * (S2 * T2 - T1 * S3) - S1 * (S1 * T2 - T1 * S2) + T0 * (S1 * S3 - S2 * S2);

  const c_norm = det_c / det;
  const b_norm = det_b / det;
  const a_norm = det_a / det;

  // Денормализация результата
  const x_norm = (level - meanX) / stdX;
  const y_norm = a_norm * x_norm * x_norm + b_norm * x_norm + c_norm;

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
  method: CalibrationMethod
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

    // Экстраполяция за пределами таблицы
    if (point.level_mm < table[0].level_mm) {
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

  return {
    r_squared: Math.max(0, Math.min(1, rSquared)),
    rmse,
    max_error: maxError
  };
}

/**
 * Интерполяция объема по таблице
 */
function interpolateVolumeFromTable(level: number, table: CalibrationTablePoint[]): number {
  if (!table || table.length === 0) return 0;

  // Sort table just in case
  const sortedTable = [...table].sort((a, b) => a.level_mm - b.level_mm);

  // Check bounds
  if (level <= sortedTable[0].level_mm) return sortedTable[0].volume_liters;
  if (level >= sortedTable[sortedTable.length - 1].level_mm) return sortedTable[sortedTable.length - 1].volume_liters;

  // Find interval
  for (let i = 0; i < sortedTable.length - 1; i++) {
    const p1 = sortedTable[i];
    const p2 = sortedTable[i + 1];

    if (level >= p1.level_mm && level <= p2.level_mm) {
      const ratio = (level - p1.level_mm) / (p2.level_mm - p1.level_mm);
      return p1.volume_liters + (p2.volume_liters - p1.volume_liters) * ratio;
    }
  }

  return 0;
}
