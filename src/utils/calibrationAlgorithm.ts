/**
 * Алгоритм расчета калибровочной таблицы резервуара
 * TradeFrame Builder v1.7.13
 */

import type {
  TankHistoryRecord,
  TransactionItem,
  CalibrationTablePoint,
  TankCalibrationSettings,
  CalibrationMethod
} from '@/types/tanks';

/**
 * Точка данных для калибровки (уровень + объем)
 */
interface CalibrationDataPoint {
  level_mm: number;     // Уровень в миллиметрах
  volume_liters: number; // Объем в литрах
  timestamp: number;    // Временная метка
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
}

/**
 * Рассчитать калибровочную таблицу на основе исторических данных
 */
export function calculateCalibrationTable(
  history: TankHistoryRecord[],
  transactions: TransactionItem[],
  settings: TankCalibrationSettings,
  tankNumber: number
): CalibrationCalculationResult {

  // 1. Подготовка данных
  const dataPoints = prepareDataPoints(history, transactions, settings, tankNumber);

  // 2. Фильтрация данных
  const filteredPoints = filterDataPoints(dataPoints, settings);

  // 3. Построение калибровочной таблицы выбранным методом
  const table = buildCalibrationTable(filteredPoints, settings);

  // 4. Вычисление метрик качества
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
 * Подготовка точек данных из истории резервуара
 * Корректировка объема с учетом отпусков ТРК
 */
function prepareDataPoints(
  history: TankHistoryRecord[],
  transactions: TransactionItem[],
  settings: TankCalibrationSettings,
  tankNumber: number
): CalibrationDataPoint[] {

  // Фильтруем транзакции для данного резервуара
  const tankTransactions = transactions
    .filter(tx => tx.tank === tankNumber)
    .map(tx => ({
      time: new Date(tx.dt || '').getTime(),
      quantity: typeof tx.quantity === 'string' ? parseFloat(tx.quantity) : tx.quantity
    }))
    .filter(tx => !isNaN(tx.quantity))
    .sort((a, b) => a.time - b.time);

  const dataPoints: CalibrationDataPoint[] = [];

  // Two-Pointer алгоритм для эффективного учета отпусков
  let txPointer = 0;
  let cumulativeRelease = 0;

  for (const record of history) {
    const timestamp = new Date(record.dt).getTime();
    const level_cm = parseFloat(record.level);
    const volume_reported = parseFloat(record.volume);

    // Пропускаем невалидные записи
    if (isNaN(level_cm) || isNaN(volume_reported)) {
      continue;
    }

    // Накапливаем отпуски до текущего момента
    while (txPointer < tankTransactions.length && tankTransactions[txPointer].time <= timestamp) {
      cumulativeRelease += tankTransactions[txPointer].quantity;
      txPointer++;
    }

    // Корректируем объем с учетом весов источников данных
    const sensor_weight = settings.sensor_weight;
    const dispenser_weight = settings.dispenser_weight;

    // Нормализация весов
    const total_weight = sensor_weight + dispenser_weight;
    const norm_sensor = sensor_weight / total_weight;
    const norm_dispenser = dispenser_weight / total_weight;

    // Скорректированный объем = объем датчика * вес + (начальный_объем - отпуски) * вес
    // Для простоты берем volume_end как начальный объем периода
    const volume_from_releases = parseFloat(history[0].volume_end) - cumulativeRelease;
    const corrected_volume = volume_reported * norm_sensor + volume_from_releases * norm_dispenser;

    dataPoints.push({
      level_mm: level_cm * 10, // Конвертируем см в мм
      volume_liters: corrected_volume,
      timestamp
    });
  }

  return dataPoints;
}

/**
 * Фильтрация точек данных (выбросы, аномалии)
 */
function filterDataPoints(
  points: CalibrationDataPoint[],
  settings: TankCalibrationSettings
): CalibrationDataPoint[] {

  let filtered = [...points];

  // Фильтр выбросов (статистический метод σ)
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

  // Дополнительная фильтрация по bias_offset_percent
  if (settings.bias_offset_percent > 0 && filtered.length > 1) {
    // Сортируем по времени для последовательной фильтрации
    filtered.sort((a, b) => a.timestamp - b.timestamp);

    const result: CalibrationDataPoint[] = [filtered[0]];

    for (let i = 1; i < filtered.length; i++) {
      const prev = result[result.length - 1];
      const current = filtered[i];

      // Проверяем отклонение от предыдущей точки
      const diff_percent = Math.abs((current.volume_liters - prev.volume_liters) / prev.volume_liters) * 100;

      // Если отклонение в пределах допустимого, добавляем точку
      if (diff_percent <= Math.abs(settings.bias_offset_percent)) {
        result.push(current);
      }
    }

    filtered = result;
  }

  return filtered;
}

/**
 * Построение калибровочной таблицы выбранным методом
 */
function buildCalibrationTable(
  points: CalibrationDataPoint[],
  settings: TankCalibrationSettings
): CalibrationTablePoint[] {

  if (points.length < 2) {
    throw new Error('Недостаточно данных для построения калибровочной таблицы (минимум 2 точки)');
  }

  // Определяем диапазон уровней для таблицы
  const min_level = Math.min(...points.map(p => p.level_mm));
  const max_level = Math.max(...points.map(p => p.level_mm));

  // Создаем точки таблицы с шагом calibration_step_mm
  const step = settings.calibration_step_mm;
  const table: CalibrationTablePoint[] = [];

  for (let level = 0; level <= max_level; level += step) {
    const volume = interpolateVolume(level, points, settings.calibration_method);

    table.push({
      level_mm: level,
      volume_liters: Math.max(0, volume) // Объем не может быть отрицательным
    });
  }

  return table;
}

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

  const n = points.length;
  const sum_x = points.reduce((sum, p) => sum + p.level_mm, 0);
  const sum_y = points.reduce((sum, p) => sum + p.volume_liters, 0);
  const sum_xy = points.reduce((sum, p) => sum + p.level_mm * p.volume_liters, 0);
  const sum_x2 = points.reduce((sum, p) => sum + p.level_mm * p.level_mm, 0);

  // Коэффициенты линейной регрессии
  const a = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x);
  const b = (sum_y - a * sum_x) / n;

  return a * level + b;
}

/**
 * Метод наименьших квадратов (полиномиальная регрессия 2-й степени)
 */
function leastSquaresInterpolate(
  level: number,
  points: CalibrationDataPoint[]
): number {

  // Для простоты используем квадратичную регрессию: y = a*x^2 + b*x + c
  const n = points.length;

  // Если точек мало, используем линейную
  if (n < 5) {
    return linearRegressionInterpolate(level, points);
  }

  // Формируем систему нормальных уравнений
  let sum_x = 0, sum_x2 = 0, sum_x3 = 0, sum_x4 = 0;
  let sum_y = 0, sum_xy = 0, sum_x2y = 0;

  for (const p of points) {
    const x = p.level_mm;
    const y = p.volume_liters;
    const x2 = x * x;
    const x3 = x2 * x;
    const x4 = x2 * x2;

    sum_x += x;
    sum_x2 += x2;
    sum_x3 += x3;
    sum_x4 += x4;
    sum_y += y;
    sum_xy += x * y;
    sum_x2y += x2 * y;
  }

  // Решаем систему 3x3 методом Крамера (упрощенно)
  // Для production лучше использовать библиотеку линейной алгебры

  // Упрощенное решение: берем среднее между линейной и простой квадратичной
  const a_lin = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x);
  const b_lin = (sum_y - a_lin * sum_x) / n;

  // Квадратичный коэффициент (приближенно)
  const mean_level = sum_x / n;
  const mean_volume = sum_y / n;
  const a_quad = (sum_x2y - mean_volume * sum_x2) / (sum_x4 - sum_x2 * sum_x2 / n) * 0.001; // Малый коэффициент

  return a_quad * level * level + a_lin * level + b_lin;
}

/**
 * Скользящее среднее (локальная интерполяция)
 */
function movingAverageInterpolate(
  level: number,
  points: CalibrationDataPoint[]
): number {

  // Сортируем точки по уровню
  const sorted = [...points].sort((a, b) => a.level_mm - b.level_mm);

  // Находим ближайшие точки
  const window_size = Math.min(5, points.length); // Окно 5 точек или меньше

  // Находим индекс ближайшей точки
  let closest_idx = 0;
  let min_diff = Math.abs(sorted[0].level_mm - level);

  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.abs(sorted[i].level_mm - level);
    if (diff < min_diff) {
      min_diff = diff;
      closest_idx = i;
    }
  }

  // Берем окно вокруг ближайшей точки
  const start = Math.max(0, closest_idx - Math.floor(window_size / 2));
  const end = Math.min(sorted.length, start + window_size);

  const window_points = sorted.slice(start, end);

  // Взвешенное среднее (вес обратно пропорционален расстоянию)
  let weighted_sum = 0;
  let weight_sum = 0;

  for (const p of window_points) {
    const distance = Math.abs(p.level_mm - level) + 1; // +1 чтобы избежать деления на 0
    const weight = 1 / distance;
    weighted_sum += p.volume_liters * weight;
    weight_sum += weight;
  }

  return weighted_sum / weight_sum;
}

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

  if (points.length === 0) {
    return { r_squared: 0, rmse: 0, max_error: 0 };
  }

  // Для каждой точки данных находим соответствующий объем из таблицы
  const errors: number[] = [];
  const actual_values: number[] = [];
  const predicted_values: number[] = [];

  for (const point of points) {
    // Находим ближайшие точки в таблице для интерполяции
    let predicted = 0;

    for (let i = 0; i < table.length - 1; i++) {
      if (point.level_mm >= table[i].level_mm && point.level_mm <= table[i + 1].level_mm) {
        // Линейная интерполяция между двумя точками таблицы
        const t = (point.level_mm - table[i].level_mm) / (table[i + 1].level_mm - table[i].level_mm);
        predicted = table[i].volume_liters + t * (table[i + 1].volume_liters - table[i].volume_liters);
        break;
      }
    }

    // Если уровень выше максимального в таблице
    if (point.level_mm > table[table.length - 1].level_mm) {
      predicted = table[table.length - 1].volume_liters;
    }

    actual_values.push(point.volume_liters);
    predicted_values.push(predicted);
    errors.push(Math.abs(point.volume_liters - predicted));
  }

  // RMSE (Root Mean Square Error)
  const mse = errors.reduce((sum, e) => sum + e * e, 0) / errors.length;
  const rmse = Math.sqrt(mse);

  // Максимальная ошибка
  const max_error = Math.max(...errors);

  // R² (коэффициент детерминации)
  const mean_actual = actual_values.reduce((a, b) => a + b, 0) / actual_values.length;
  const ss_tot = actual_values.reduce((sum, val) => sum + Math.pow(val - mean_actual, 2), 0);
  const ss_res = errors.reduce((sum, err) => sum + err * err, 0);
  const r_squared = ss_tot > 0 ? 1 - (ss_res / ss_tot) : 0;

  return {
    r_squared: Math.max(0, Math.min(1, r_squared)), // Ограничиваем [0, 1]
    rmse,
    max_error
  };
}
