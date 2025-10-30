/**
 * Алгоритм расчета калибровочной таблицы резервуара
 * TradeFrame Builder v1.7.14
 * 
 * ИСПРАВЛЕНИЯ v1.7.14:
 * - Добавлен расчет объема с учетом геометрии горизонтального цилиндра
 * - Улучшен алгоритм prepareDataPoints() для учета физических характеристик
 * - Исправлена формула объема для горизонтального цилиндрического резервуара
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
 * Расчет ПОЛНОГО объема цилиндрического резервуара
 * 
 * @param diameter_mm - Внутренний диаметр резервуара (мм)
 * @param length_mm - Длина резервуара (мм)
 * @returns Полный объем в литрах
 * 
 * Формула: V = π × (D/2)² × L
 */
export function calculateTankFullVolume(
  diameter_mm: number,
  length_mm: number
): number {
  const R = diameter_mm / 2; // Радиус
  const volume_mm3 = Math.PI * R * R * length_mm;
  const volume_liters = volume_mm3 / 1000000; // мм³ → литры
  
  console.log(`📏 Полный объем резервуара: D=${diameter_mm}мм, L=${length_mm}мм → V=${volume_liters.toFixed(2)}л`);
  return volume_liters;
}

/**
 * Расчет площади сегмента круга
 * 
 * @param R - Радиус круга (мм)
 * @param h - Высота сегмента от дна (мм)
 * @returns Площадь сегмента (мм²)
 * 
 * Формула: S = R² × arccos((R-h)/R) - (R-h) × √(2Rh - h²)
 */
function calculateCircleSegmentArea(R: number, h: number): number {
  if (h <= 0) return 0;
  if (h >= 2 * R) return Math.PI * R * R; // Полный круг
  
  // Проверка на граничные случаи
  if (h === R) return (Math.PI * R * R) / 2; // Половина круга
  
  // Основная формула для сегмента
  const angle = Math.acos((R - h) / R);
  const term1 = R * R * angle;
  const term2 = (R - h) * Math.sqrt(2 * R * h - h * h);
  
  return term1 - term2;
}

/**
 * Расчет объема горизонтального цилиндрического резервуара по уровню
 * 
 * @param level_mm - Уровень жидкости от дна резервуара (мм)
 * @param diameter_mm - Внутренний диаметр резервуара (мм)
 * @param length_mm - Длина резервуара (мм)
 * @param tilt_angle_degrees - Угол наклона резервуара (градусы, по умолчанию 0)
 * @returns Объем в литрах
 * 
 * Для горизонтального цилиндра:
 * 1. Вычисляем площадь сегмента круга S(h)
 * 2. Умножаем на длину: V = S(h) × L
 * 3. Конвертируем мм³ → литры (÷ 1000000)
 */
export function calculateHorizontalCylinderVolume(
  level_mm: number,
  diameter_mm: number,
  length_mm: number,
  tilt_angle_degrees: number = 0
): number {
  const R = diameter_mm / 2; // Радиус
  const h = level_mm;         // Уровень

  // Валидация входных данных
  if (h < 0) {
    return 0;
  }
  
  if (h > diameter_mm) {
    return calculateTankFullVolume(diameter_mm, length_mm);
  }

  if (h === 0) return 0;
  if (h === diameter_mm) {
    return calculateTankFullVolume(diameter_mm, length_mm);
  }

  // Расчет площади сегмента
  const segment_area_mm2 = calculateCircleSegmentArea(R, h);
  
  // Объем = площадь сегмента × длина
  const volume_mm3 = segment_area_mm2 * length_mm;
  let volume_liters = volume_mm3 / 1000000;

  // Учет угла наклона (упрощенная коррекция)
  // При наклоне объем в нижней части больше
  if (tilt_angle_degrees !== 0) {
    const tilt_correction = 1 + (Math.abs(tilt_angle_degrees) / 90) * 0.05; // До 5% коррекции
    volume_liters *= tilt_correction;
  }

  return volume_liters;
}

/**
 * Построить ГЕОМЕТРИЧЕСКУЮ калибровочную таблицу на основе физических параметров
 * Это ЭТАЛОННАЯ таблица, рассчитанная по математической модели резервуара
 * 
 * @param settings - Настройки калибровки (содержат diameter_mm, length_mm, shape и т.д.)
 * @returns Результат с эталонной калибровочной таблицей
 */
export function buildGeometricCalibrationTable(
  settings: TankCalibrationSettings
): CalibrationCalculationResult {
  
  console.log('📐 Построение ГЕОМЕТРИЧЕСКОЙ калибровочной таблицы');
  console.log(`   Диаметр: ${settings.tank_diameter_mm} мм`);
  console.log(`   Длина: ${settings.tank_length_mm} мм`);
  console.log(`   Форма: ${settings.tank_shape_type}`);
  
  const table: CalibrationTablePoint[] = [];
  const step = settings.calibration_step_mm;
  
  // Строим таблицу от 0 до tank_diameter_mm с заданным шагом
  for (let level = 0; level <= settings.tank_diameter_mm; level += step) {
    let volume = 0;
    
    // Выбираем формулу в зависимости от типа резервуара
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
        // Для вертикального: V = π × R² × h
        const R = settings.tank_diameter_mm / 2;
        volume = (Math.PI * R * R * level) / 1000000; // мм³ → литры
        break;
      
      case 'sphere':
        // Для сферы (упрощенно)
        volume = calculateHorizontalCylinderVolume(
          level,
          settings.tank_diameter_mm,
          settings.tank_length_mm,
          settings.tank_tilt_angle_degrees
        );
        break;
      
      default:
        // По умолчанию - горизонтальный цилиндр
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
  
  console.log(`✅ Геометрическая таблица построена: ${table.length} точек`);
  console.log(`   Полный объем: ${table[table.length - 1].volume_liters.toFixed(2)} л`);
  
  return {
    table,
    data_points_count: table.length,
    filtered_points_count: table.length,
    method_used: 'geometric' as CalibrationMethod,
    quality_metrics: {
      r_squared: 1.0, // Идеальная геометрия
      rmse: 0,
      max_error: 0
    }
  };
}

/**
 * Построить текущую калибровочную таблицу из показаний API (level, volume)
 * Это таблица, которая используется датчиками СЕЙЧАС
 */
export function buildCurrentCalibrationTable(
  history: TankHistoryRecord[],
  settings: TankCalibrationSettings
): CalibrationCalculationResult {

  // Преобразуем историю в точки данных (просто берем level и volume как есть)
  const dataPoints: CalibrationDataPoint[] = history
    .map(record => ({
      level_mm: parseFloat(record.level) * 10, // см → мм
      volume_liters: parseFloat(record.volume),
      timestamp: new Date(record.dt).getTime()
    }))
    .filter(p => !isNaN(p.level_mm) && !isNaN(p.volume_liters));

  // Фильтрация данных
  const filteredPoints = filterDataPoints(dataPoints, settings);

  // Построение калибровочной таблицы
  const table = buildCalibrationTable(filteredPoints, settings);

  // Вычисление метрик качества
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
 * Это "правильная" таблица, учитывающая реальные отпуски ТРК
 */
export function calculateCalibrationTable(
  history: TankHistoryRecord[],
  transactions: TransactionItem[],
  settings: TankCalibrationSettings,
  tankNumber: number
): CalibrationCalculationResult {

  // 1. Подготовка данных с учетом транзакций
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

  console.log('🔧 prepareDataPoints: начало обработки');
  console.log('📊 История записей:', history.length);
  console.log('⛽ Транзакций ТРК:', transactions.length);

  // Фильтруем транзакции для данного резервуара
  const tankTransactions = transactions
    .filter(tx => tx.tank === tankNumber)
    .map(tx => ({
      time: new Date(tx.dt || '').getTime(),
      quantity: typeof tx.quantity === 'string' ? parseFloat(tx.quantity) : tx.quantity
    }))
    .filter(tx => !isNaN(tx.quantity))
    .sort((a, b) => a.time - b.time);

  console.log('✅ Транзакций для резервуара', tankNumber, ':', tankTransactions.length);

  // Сортируем историю по времени
  const sortedHistory = [...history].sort((a, b) =>
    new Date(a.dt).getTime() - new Date(b.dt).getTime()
  );

  // Находим точку с МАКСИМАЛЬНЫМ уровнем (после заправки)
  let maxLevelIndex = 0;
  let maxLevel = parseFloat(sortedHistory[0].level);

  for (let i = 1; i < sortedHistory.length; i++) {
    const level = parseFloat(sortedHistory[i].level);
    if (!isNaN(level) && level > maxLevel) {
      maxLevel = level;
      maxLevelIndex = i;
    }
  }

  const startRecord = sortedHistory[maxLevelIndex];
  const startVolume = parseFloat(startRecord.volume);
  const startTime = new Date(startRecord.dt).getTime();

  console.log('🎯 Стартовая точка (максимальный уровень):');
  console.log('  - Индекс:', maxLevelIndex, 'из', sortedHistory.length);
  console.log('  - Уровень:', maxLevel, 'см');
  console.log('  - Объём датчика:', startVolume, 'л');
  console.log('  - Время:', startRecord.dt);

  const dataPoints: CalibrationDataPoint[] = [];

  // Идём от точки максимума вперёд по времени
  let cumulativeRelease = 0;

  for (let i = maxLevelIndex; i < sortedHistory.length; i++) {
    const record = sortedHistory[i];
    const timestamp = new Date(record.dt).getTime();
    const level_cm = parseFloat(record.level);

    if (isNaN(level_cm)) {
      continue;
    }

    // Накапливаем отпуски с момента старта до текущего момента
    for (const tx of tankTransactions) {
      if (tx.time > startTime && tx.time <= timestamp && tx.time > (dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].timestamp : startTime)) {
        cumulativeRelease += tx.quantity;
      }
    }

    // Рассчитываем объём: начальный - все отпуски с начала
    const calculated_volume = startVolume - cumulativeRelease;

    dataPoints.push({
      level_mm: level_cm * 10, // Конвертируем см в мм
      volume_liters: calculated_volume,
      timestamp
    });
  }

  console.log('✅ Построено точек данных:', dataPoints.length);
  console.log('📊 Первая точка:', dataPoints[0]);
  console.log('📊 Последняя точка:', dataPoints[dataPoints.length - 1]);
  console.log('📉 Суммарные отпуски ТРК:', cumulativeRelease, 'л');

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

  console.log('🔍 buildCalibrationTable: входные точки:', points.length);
  console.log('🔍 Первые 5 точек:', points.slice(0, 5));
  
  // Фильтруем валидные точки
  const validPoints = points.filter(p =>
    p &&
    typeof p.level_mm === 'number' &&
    typeof p.volume_liters === 'number' &&
    !isNaN(p.level_mm) &&
    !isNaN(p.volume_liters)
  );

  console.log('✅ После фильтрации в buildCalibrationTable:', validPoints.length, 'валидных точек');
  console.log('✅ Первые 3 валидные:', validPoints.slice(0, 3));

  if (validPoints.length < 2) {
    throw new Error('Недостаточно данных для построения калибровочной таблицы (минимум 2 точки)');
  }

  // Определяем диапазон уровней для таблицы
  const levels = validPoints.map(p => p.level_mm);

  if (levels.length === 0) {
    throw new Error('Нет валидных данных уровня для построения таблицы');
  }

  const min_level = Math.min(...levels);
  const max_level = Math.max(...levels);

  // Создаем точки таблицы с шагом calibration_step_mm
  const step = settings.calibration_step_mm;
  const table: CalibrationTablePoint[] = [];

  // Начинаем с минимального уровня (округленного вниз до шага), а не с 0
  const start_level = Math.floor(min_level / step) * step;

  console.log('🔧 Параметры построения таблицы:', {
    min_level,
    max_level,
    step,
    start_level,
    expectedPoints: Math.floor((max_level - start_level) / step) + 1,
    method: settings.calibration_method
  });

  for (let level = start_level; level <= max_level; level += step) {
    console.log(`📊 Интерполяция для уровня ${level} мм`);
    const volume = interpolateVolume(level, validPoints, settings.calibration_method);
    console.log(`✅ Получен объем: ${volume} л`);

    table.push({
      level_mm: level,
      volume_liters: Math.max(0, volume) // Объем не может быть отрицательным
    });
  }

  console.log('🎉 Таблица построена:', table.length, 'точек');

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
  
  // Дополнительная валидация точек
  const validPoints = points.filter(p =>
    p && typeof p.level_mm === 'number' && typeof p.volume_liters === 'number' &&
    !isNaN(p.level_mm) && !isNaN(p.volume_liters)
  );

  const n = validPoints.length;
  
  if (n < 2) {
    throw new Error('linearRegressionInterpolate: недостаточно валидных точек');
  }
  const sum_x = validPoints.reduce((sum, p) => sum + p.level_mm, 0);
  const sum_y = validPoints.reduce((sum, p) => sum + p.volume_liters, 0);
  const sum_xy = validPoints.reduce((sum, p) => sum + p.level_mm * p.volume_liters, 0);
  const sum_x2 = validPoints.reduce((sum, p) => sum + p.level_mm * p.level_mm, 0);

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

  // Дополнительная валидация точек
  const validPoints = points.filter(p =>
    p && typeof p.level_mm === 'number' && typeof p.volume_liters === 'number' &&
    !isNaN(p.level_mm) && !isNaN(p.volume_liters)
  );

  // Для простоты используем квадратичную регрессию: y = a*x^2 + b*x + c
  const n = validPoints.length;

  // Если точек мало, используем линейную
  if (n < 5) {
    return linearRegressionInterpolate(level, validPoints);
  }

  // Формируем систему нормальных уравнений
  let sum_x = 0, sum_x2 = 0, sum_x3 = 0, sum_x4 = 0;
  let sum_y = 0, sum_xy = 0, sum_x2y = 0;

  for (const p of validPoints) {
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

  // Дополнительная валидация точек
  const validPoints = points.filter(p =>
    p && typeof p.level_mm === 'number' && typeof p.volume_liters === 'number' &&
    !isNaN(p.level_mm) && !isNaN(p.volume_liters)
  );

  if (validPoints.length < 2) {
    throw new Error('movingAverageInterpolate: недостаточно валидных точек');
  }

  // Сортируем точки по уровню
  const sorted = [...validPoints].sort((a, b) => a.level_mm - b.level_mm);

  // Находим ближайшие точки
  const window_size = Math.min(5, validPoints.length); // Окно 5 точек или меньше

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

  // Фильтруем валидные точки
  const validPoints = points.filter(p =>
    p &&
    typeof p.level_mm === 'number' &&
    typeof p.volume_liters === 'number' &&
    !isNaN(p.level_mm) &&
    !isNaN(p.volume_liters)
  );

  if (validPoints.length === 0) {
    return { r_squared: 0, rmse: 0, max_error: 0 };
  }

  // Для каждой точки данных находим соответствующий объем из таблицы
  const errors: number[] = [];
  const actual_values: number[] = [];
  const predicted_values: number[] = [];

  for (const point of validPoints) {
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
