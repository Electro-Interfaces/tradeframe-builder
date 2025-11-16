import { useState } from 'react';
import {
  TankCalibrationSettings as CalibrationSettings,
  DEFAULT_CALIBRATION_SETTINGS,
  CalibrationFuelType,
  TankShapeType,
  TankLocationType,
  LevelSensorType,
  TankShape,
  CalibrationMethod,
  CalculateCalibrationTableResult
} from '@/types/tanks';
import { calculateCalibrationTable, downloadCalibrationTable, getCalibrationTables } from '@/services/calibrationTableService';
import {
  calculateCalibrationTable as runCalibrationAlgorithm,
  buildCurrentCalibrationTable,
  buildGeometricCalibrationTable
} from '@/utils/calibrationAlgorithm';
import { getTankHistory } from '@/services/tankHistoryService';
import { getTransactions } from '@/services/tankBookService';
import { CalibrationTablesHistory } from './CalibrationTablesHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Thermometer,
  Droplets,
  Clock,
  AlertTriangle,
  Filter,
  Calculator,
  Save,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  FileSpreadsheet,
  Bell,
  Gauge,
  LineChart
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useSelection } from '@/contexts/SelectionContext';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface TankCalibrationSettingsProps {
  tankId: string;
  tankName: string;
  tankCapacity: number;
  initialSettings?: CalibrationSettings;
  onSave: (settings: CalibrationSettings) => Promise<void>;
}

// Интерфейс для результата сравнения калибровочных таблиц
interface CalibrationComparison {
  level_mm: number;
  current_volume: number;
  calculated_volume: number;
  difference: number;
  difference_percent: number;
}

// Интерфейс для валидации через ТРК
interface TRKValidationPoint {
  timestamp: string;          // Дата-время транзакции
  level_before_mm: number;    // Уровень до отпуска
  level_after_mm: number;     // Уровень после отпуска
  volume_by_sensor: number;   // Изменение объема по датчику (через калибровочную таблицу)
  volume_by_trk: number;      // Отпущено по ТРК (литры)
  deviation: number;          // Расхождение (литры)
  deviation_percent: number;  // Расхождение (%)
  nozzle: number;             // Номер пистолета
}

interface AnalysisResult extends CalculateCalibrationTableResult {
  comparison?: CalibrationComparison[];
  current_table_version?: number;
  statistics?: {
    max_difference: number;
    avg_difference: number;
    max_difference_percent: number;
    avg_difference_percent: number;
  };
  trk_validation?: TRKValidationPoint[];  // Данные валидации через ТРК
}

export function TankCalibrationSettingsComponent({
  tankId,
  tankName,
  tankCapacity,
  initialSettings,
  onSave
}: TankCalibrationSettingsProps) {
  const [settings, setSettings] = useState<CalibrationSettings>(() => {
    // Если есть initialSettings - используем их как приоритетные
    if (initialSettings) {
      return {
        tank_id: tankId,
        ...DEFAULT_CALIBRATION_SETTINGS,
        ...initialSettings,
        // Сохраняем calibration_status из initialSettings или устанавливаем 'never'
        calibration_status: initialSettings.calibration_status || 'never'
      } as CalibrationSettings;
    }
    
    // Если нет initialSettings - используем дефолты
    return {
      tank_id: tankId,
      ...DEFAULT_CALIBRATION_SETTINGS,
      calibration_status: 'never' as const
    } as CalibrationSettings;
  });

  const { selectedNetwork, selectedTradingPoint } = useSelection();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Состояния для расчета таблицы
  const [showCalculationDialog, setShowCalculationDialog] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [calculationNotes, setCalculationNotes] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationResult, setCalculationResult] = useState<CalculateCalibrationTableResult | null>(null);

  // Состояние для диалога анализа калибровки
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [analysisStartDate, setAnalysisStartDate] = useState('');
  const [analysisEndDate, setAnalysisEndDate] = useState('');
  const [analysisNotes, setAnalysisNotes] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Вычисляемый градиент: объём резервуара × коэффициент расширения
  const calculatedGradient = (tankCapacity * settings.thermal_expansion_coefficient).toFixed(2);

  // ⚡ НОВОЕ: Функция расчета объема резервуара по геометрическим размерам
  const calculateTankVolume = (): number => {
    const shape = settings.tank_shape_type;
    const diameter = settings.tank_diameter_mm;
    const length = settings.tank_length_mm;
    const width = settings.tank_width_mm;
    const height = settings.tank_height_mm;

    switch (shape) {
      case 'horizontal_cylinder':
        // V = π × (D/2)² × L (литры)
        return Math.PI * Math.pow(diameter / 2, 2) * length / 1_000_000;

      case 'vertical_cylinder':
        // V = π × (D/2)² × H (литры)
        return Math.PI * Math.pow(diameter / 2, 2) * height / 1_000_000;

      case 'spherical':
        // V = (4/3) × π × (D/2)³ (литры)
        return (4 / 3) * Math.PI * Math.pow(diameter / 2, 3) / 1_000_000;

      case 'rectangular':
        // V = L × W × H (литры)
        return length * width * height / 1_000_000;

      default:
        return 0;
    }
  };

  // Автоматически рассчитанный объем резервуара (литры)
  const calculatedVolume = calculateTankVolume();

  const updateSetting = <K extends keyof CalibrationSettings>(
    key: K,
    value: CalibrationSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Хелпер для безопасной обработки числовых input'ов
  const handleNumberInput = (key: keyof CalibrationSettings, inputValue: string, isInteger: boolean = false) => {
    if (inputValue === '') {
      updateSetting(key as any, 0 as any);
      return;
    }
    const parsed = isInteger ? parseInt(inputValue) : parseFloat(inputValue);
    updateSetting(key as any, (isNaN(parsed) ? 0 : parsed) as any);
  };

  // Получить рекомендуемые значения погрешностей для типа датчика
  const getSensorAccuracyDefaults = (sensorType: LevelSensorType) => {
    // Данные по исследованию ГОСТ и производителей
    const sensorAccuracyDefaults = {
      radar: {
        error_percent: 0.1,  // ±0.1% по объему (БАРС351И, Rosemount 5300)
        accuracy_mm: 1       // ±1-2 мм
      },
      float: {
        error_percent: 1.0,  // ±1% (механический износ)
        accuracy_mm: 1       // ±1 мм (ГОСТ 8.247 метрошток)
      },
      capacitive: {
        error_percent: 0.2,  // ±0.1-0.2% (при стабильной среде)
        accuracy_mm: 3       // ±3 мм (зависит от диэлектрических свойств)
      },
      hydrostatic: {
        error_percent: 0.5,  // ±0.1-1% (зависит от модели)
        accuracy_mm: 3       // ±3 мм
      },
      other: {
        error_percent: 0.5,  // усредненное значение
        accuracy_mm: 3       // усредненное значение
      }
    };

    return sensorAccuracyDefaults[sensorType];
  };

  // Обработчик изменения типа датчика (только обновляет тип, без изменения погрешностей)
  const handleSensorTypeChange = (sensorType: LevelSensorType) => {
    updateSetting('level_sensor_type', sensorType);
  };

  // Применить рекомендуемые значения погрешностей для текущего типа датчика
  const applyRecommendedAccuracy = () => {
    const defaults = getSensorAccuracyDefaults(settings.level_sensor_type);

    setSettings(prev => ({
      ...prev,
      level_sensor_error_percent: defaults.error_percent,
      level_sensor_accuracy_mm: defaults.accuracy_mm
    }));
  };

  // Получить пояснение для текущего типа датчика
  const getSensorAccuracyHint = () => {
    switch (settings.level_sensor_type) {
      case 'radar':
        return '📡 Радарный: ±0.1% объема, ±1-2мм уровня (БАРС351И, Rosemount 5300)';
      case 'float':
        return '🎈 Поплавковый: ±1% объема, ±1мм уровня (ГОСТ 8.247)';
      case 'capacitive':
        return '⚡ Емкостной: ±0.1-0.2% объема, ±3мм (требует стабильной среды)';
      case 'hydrostatic':
        return '💧 Гидростатический: ±0.1-1% объема, ±3мм (зависит от модели)';
      default:
        return 'Усредненные значения для неопределенного типа датчика';
    }
  };

  // Получить пояснение для ТРК в зависимости от типа топлива
  const getDispenserAccuracyHint = () => {
    if (settings.fuel_type === 'lpg') {
      return 'СУГ (пропан-бутан): ±0.25-0.4% (ГОСТ 9018-89)';
    }
    return 'Бензин/ДТ: ±0.25% коммерческие АЗС (ГОСТ 9018-89, с 2024г обязательно)';
  };

  // Обработчик изменения типа топлива с автоматическим обновлением коэффициентов
  const handleFuelTypeChange = (fuelType: CalibrationFuelType) => {
    // Коэффициенты по данным Приказа Минэнерго № 281 от 16.04.2018
    // и технических справочников для СУГ
    const coefficients = {
      gasoline: {
        thermal: 0.00083,    // АИ-92/95
        summer_loss: 0.08,   // Весенне-летний период
        winter_loss: 0.03    // Осенне-зимний период
      },
      diesel: {
        thermal: 0.00074,    // Дизельное топливо
        summer_loss: 0.05,
        winter_loss: 0.02
      },
      propane: {
        thermal: 0.003,      // СУГ (в 3.6 раза больше бензина!)
        summer_loss: 0.12,   // Группа 1.1, резервуары 100-1000 м³
        winter_loss: 0.74    // Высокая летучесть СУГ
      },
      gas: {
        thermal: 0.001,
        summer_loss: 0.1,
        winter_loss: 0.05
      }
    };

    const coef = coefficients[fuelType] || coefficients.gasoline;

    setSettings(prev => ({
      ...prev,
      fuel_type: fuelType,
      thermal_expansion_coefficient: coef.thermal,
      natural_loss_summer_percent: coef.summer_loss,
      natural_loss_winter_percent: coef.winter_loss
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await onSave(settings);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({
      tank_id: tankId,
      ...DEFAULT_CALIBRATION_SETTINGS,
      calibration_status: 'never'
    } as CalibrationSettings);
  };

  const handleCalculate = async () => {
    if (!startDate || !endDate) {
      setCalculationResult({
        success: false,
        error: 'Необходимо указать начальную и конечную дату периода анализа',
      });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setCalculationResult({
        success: false,
        error: 'Начальная дата не может быть позже конечной',
      });
      return;
    }

    setIsCalculating(true);
    setCalculationResult(null);

    try {
      const result = await calculateCalibrationTable({
        tank_id: tankId,
        period: {
          start_date: startDate,
          end_date: endDate,
        },
        notes: calculationNotes,
      });

      setCalculationResult(result);
    } catch (error) {
      console.error('Calculation error:', error);
      setCalculationResult({
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка расчета',
      });
    } finally {
      setIsCalculating(false);
    }
  };

  // Обработчик анализа калибровки (локальный расчет с сравнением с текущей таблицей)
  // Функция валидации калибровки через ТРК (Вариант 2 + Вариант 3)
  const validateCalibrationByTRK = (
    tankHistory: Array<{ dt: string; level: string; volume: string; number: number }>,
    transactions: Array<{ dt?: string; tank: number; nozzle: number; quantity: string | number }>,
    tankNumber: number,
    currentCalibrationMap: Map<number, number>,  // level_mm → volume_liters
    pollingIntervalMinutes: number = 10  // Интервал опроса датчика (по умолчанию 10 мин)
  ): TRKValidationPoint[] => {
    const validationPoints: TRKValidationPoint[] = [];
    
    // Настраиваемое окно поиска = 3 интервала опроса (обычно 30 минут)
    const searchWindowMinutes = pollingIntervalMinutes * 3;
    
    // Счетчики для отладки
    let totalIntervals = 0;
    let skippedLargeIntervals = 0;
    let intervalsWithoutTransactions = 0;
    let skippedNoVolumeChange = 0;
    let skippedLevelIncrease = 0;
    let skippedInterpolationFailed = 0;
    
    // Сортируем историю по времени
    const sortedHistory = [...tankHistory].sort((a, b) => 
      new Date(a.dt).getTime() - new Date(b.dt).getTime()
    );
    
    // Фильтруем и сортируем транзакции по этому резервуару
    const tankTransactions = transactions
      .filter(t => t.tank === tankNumber && t.dt)
      .sort((a, b) => new Date(a.dt!).getTime() - new Date(b.dt!).getTime());
    
    // Проходим по всем парам соседних замеров уровня
    for (let i = 0; i < sortedHistory.length - 1; i++) {
      totalIntervals++;
      const recordBefore = sortedHistory[i];
      const recordAfter = sortedHistory[i + 1];
      
      const timeBefore = new Date(recordBefore.dt).getTime();
      const timeAfter = new Date(recordAfter.dt).getTime();
      const intervalMinutes = (timeAfter - timeBefore) / (1000 * 60);
      
      // Пропускаем слишком большие интервалы (больше окна поиска)
      if (intervalMinutes > searchWindowMinutes) {
        skippedLargeIntervals++;
        continue;
      }
      
      // Находим ВСЕ транзакции между этими двумя замерами
      const transactionsInInterval = tankTransactions.filter(t => {
        const transactionTime = new Date(t.dt!).getTime();
        return transactionTime > timeBefore && transactionTime < timeAfter;
      });
      
      // Если нет транзакций в интервале - пропускаем
      if (transactionsInInterval.length === 0) {
        intervalsWithoutTransactions++;
        continue;
      }
      
      // Суммируем объем ВСЕХ отпусков в интервале
      let totalVolumeTRK = 0;
      const nozzlesUsed = new Set<number>();
      
      for (const transaction of transactionsInInterval) {
        const volumeTRK = typeof transaction.quantity === 'string' 
          ? parseFloat(transaction.quantity) 
          : transaction.quantity;
        
        if (!isNaN(volumeTRK) && volumeTRK > 0) {
          totalVolumeTRK += volumeTRK;
          nozzlesUsed.add(transaction.nozzle);
        }
      }
      
      if (totalVolumeTRK <= 0) {
        skippedNoVolumeChange++;
        continue;
      }
      
      // Рассчитываем уровни
      const levelBefore = parseFloat(recordBefore.level) * 10; // см → мм
      const levelAfter = parseFloat(recordAfter.level) * 10;   // см → мм
      
      if (isNaN(levelBefore) || isNaN(levelAfter)) continue;
      if (levelBefore <= levelAfter) {
        skippedLevelIncrease++;
        continue; // Уровень должен УМЕНЬШИТЬСЯ
      }
      
      // Получаем объемы из калибровочной таблицы
      const volumeBefore = interpolateVolume(levelBefore, currentCalibrationMap);
      const volumeAfter = interpolateVolume(levelAfter, currentCalibrationMap);
      
      if (volumeBefore === null || volumeAfter === null) {
        skippedInterpolationFailed++;
        continue;
      }
      
      const volumeBySensor = volumeBefore - volumeAfter;
      const deviation = volumeBySensor - totalVolumeTRK;
      const deviationPercent = totalVolumeTRK > 0 ? (deviation / totalVolumeTRK) * 100 : 0;
      
      // Берем временную метку середины интервала
      const middleTimestamp = new Date((timeBefore + timeAfter) / 2).toISOString();
      
      validationPoints.push({
        timestamp: middleTimestamp,
        level_before_mm: Math.round(levelBefore),
        level_after_mm: Math.round(levelAfter),
        volume_by_sensor: volumeBySensor,
        volume_by_trk: totalVolumeTRK,
        deviation,
        deviation_percent: deviationPercent,
        nozzle: nozzlesUsed.size > 1 ? -1 : Array.from(nozzlesUsed)[0]  // -1 если несколько пистолетов
      });
    }
    
    return validationPoints;
  };
  
  // Вспомогательная функция интерполяции объема по уровню
  const interpolateVolume = (
    levelMm: number, 
    calibrationMap: Map<number, number>
  ): number | null => {
    // Прямой lookup
    if (calibrationMap.has(levelMm)) {
      return calibrationMap.get(levelMm)!;
    }
    
    // Линейная интерполяция
    const levels = Array.from(calibrationMap.keys()).sort((a, b) => a - b);
    
    for (let i = 0; i < levels.length - 1; i++) {
      const level1 = levels[i];
      const level2 = levels[i + 1];
      
      if (levelMm >= level1 && levelMm <= level2) {
        const vol1 = calibrationMap.get(level1)!;
        const vol2 = calibrationMap.get(level2)!;
        const t = (levelMm - level1) / (level2 - level1);
        return vol1 + t * (vol2 - vol1);
      }
    }
    
    return null; // Вне диапазона
  };

  const handleAnalysis = async () => {
    if (!analysisStartDate || !analysisEndDate) {
      setAnalysisResult({
        success: false,
        error: 'Необходимо указать начальную и конечную дату периода анализа',
      });
      return;
    }

    if (new Date(analysisStartDate) > new Date(analysisEndDate)) {
      setAnalysisResult({
        success: false,
        error: 'Начальная дата не может быть позже конечной',
      });
      return;
    }

    if (!selectedNetwork || !selectedTradingPoint) {
      setAnalysisResult({
        success: false,
        error: 'Необходимо выбрать сеть и торговую точку',
      });
      return;
    }

    // Получаем external_id торговой точки
    let tradingPointExternalId: string | null = null;
    try {
      const { tradingPointsService } = await import('@/services/tradingPointsService');
      const tradingPoint = await tradingPointsService.getById(selectedTradingPoint);
      tradingPointExternalId = tradingPoint?.external_id || null;
    } catch (err) {
      setAnalysisResult({
        success: false,
        error: 'Ошибка загрузки данных торговой точки',
      });
      return;
    }

    if (!selectedNetwork.external_id || !tradingPointExternalId) {
      setAnalysisResult({
        success: false,
        error: `У выбранной сети или торговой точки отсутствует external_id для API запросов. Network ID: ${selectedNetwork.external_id}, Station ID: ${tradingPointExternalId}`,
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      // 1. Получаем текущую активную калибровочную таблицу (если есть)
      let activeTable;
      try {
        const currentTables = await getCalibrationTables(tankId);
        activeTable = currentTables.find(t => t.is_active && t.status === 'applied');
      } catch (error) {
        // Игнорируем ошибку - возможно API не реализован или нет таблиц
        activeTable = undefined;
      }

      // 2. Получаем историю резервуара за период
      const historyParams = {
        system: selectedNetwork.external_id,
        station: tradingPointExternalId,
        dt_beg: `${analysisStartDate} 00:00:00`,
        dt_end: `${analysisEndDate} 23:59:59`
      };

      const history = await getTankHistory(historyParams);

      // Фильтруем по номеру резервуара (используем tankId как номер)
      const tankNumber = parseInt(tankId, 10);
      const tankHistory = history.filter(r => r.number === tankNumber);

      if (tankHistory.length === 0) {
        throw new Error('Нет данных истории резервуара за выбранный период');
      }

      // 3. Получаем транзакции (отпуски ТРК) за период
      const transactionsResponse = await getTransactions({
        system: selectedNetwork.external_id,
        station: tradingPointExternalId,
        dt_beg: `${analysisStartDate} 00:00:00`,
        dt_end: `${analysisEndDate} 23:59:59`
      });

      const transactions = transactionsResponse.items || [];

      // 4. Строим ГЕОМЕТРИЧЕСКУЮ (эталонную) калибровочную таблицу на основе физических параметров
      const geometricTableResult = buildGeometricCalibrationTable(settings);

      // 5. Строим ТЕКУЩУЮ калибровочную таблицу из показаний API датчика (level, volume)
      const currentTableResult = buildCurrentCalibrationTable(tankHistory, settings);

      // 6. Строим РАССЧИТАННУЮ калибровочную таблицу на основе транзакций ТРК
      const calculatedTableResult = runCalibrationAlgorithm(
        tankHistory,
        transactions,
        settings,
        tankNumber
      );

      // 7. Сравниваем ГЕОМЕТРИЧЕСКУЮ (эталон) с ТЕКУЩЕЙ (датчик)
      let comparison: CalibrationComparison[] | undefined;
      let statistics: AnalysisResult['statistics'] | undefined;

      if (geometricTableResult.table.length > 0 && currentTableResult.table.length > 0) {
        comparison = [];
        let totalDiff = 0;
        let totalDiffPercent = 0;
        let maxDiff = 0;
        let maxDiffPercent = 0;

        // Создаем map геометрической (эталон) и текущей (датчик) таблиц
        const geometricMap = new Map(
          geometricTableResult.table.map(point => [point.level_mm, point.volume_liters])
        );
        const currentMap = new Map(
          currentTableResult.table.map(point => [point.level_mm, point.volume_liters])
        );

        // Берем все уровни из геометрической таблицы для сравнения
        const levelsToCompare = geometricTableResult.table.map(p => p.level_mm);

        // Сравниваем ГЕОМЕТРИЧЕСКУЮ (эталон) с ТЕКУЩЕЙ (датчик)
        for (const level_mm of levelsToCompare) {

          // Получаем объем из геометрической таблицы (эталон)
          const geometric_volume = geometricMap.get(level_mm) || 0;

          // Находим объем из текущей таблицы через интерполяцию
          let current_volume: number | null = null;
          const sortedCurrentLevels = Array.from(currentMap.keys()).sort((a, b) => a - b);
          
          // Определяем диапазон реальных исторических данных
          const minHistoricalLevel = sortedCurrentLevels[0];
          const maxHistoricalLevel = sortedCurrentLevels[sortedCurrentLevels.length - 1];

          // Показываем только данные в пределах истории (НЕ экстраполируем)
          if (level_mm >= minHistoricalLevel && level_mm <= maxHistoricalLevel) {
            // Прямой lookup
            if (currentMap.has(level_mm)) {
              current_volume = currentMap.get(level_mm)!;
            } else {
              // Линейная интерполяция между соседними точками
              for (let i = 0; i < sortedCurrentLevels.length - 1; i++) {
                if (level_mm >= sortedCurrentLevels[i] && level_mm <= sortedCurrentLevels[i + 1]) {
                  const level1 = sortedCurrentLevels[i];
                  const level2 = sortedCurrentLevels[i + 1];
                  const vol1 = currentMap.get(level1)!;
                  const vol2 = currentMap.get(level2)!;

                  const t = (level_mm - level1) / (level2 - level1);
                  current_volume = vol1 + t * (vol2 - vol1);
                  break;
                }
              }
            }
          }
          // Если уровень за пределами истории - оставляем current_volume = null

          // Разница: геометрия - датчик (положительное = датчик занижает, отрицательное = завышает)
          // Вычисляем разницу только если есть исторические данные
          const difference = current_volume !== null ? geometric_volume - current_volume : 0;
          const differencePercent = current_volume !== null && current_volume > 0
            ? (difference / current_volume) * 100
            : 0;

          comparison.push({
            level_mm: Math.round(level_mm),
            current_volume: current_volume ?? 0, // Используем 0 для отсутствующих данных (Recharts не поддерживает null)
            calculated_volume: geometric_volume, // Геометрическая (эталон)
            difference,
            difference_percent: differencePercent,
          });

          // Учитываем в статистике только реальные данные
          if (current_volume !== null) {
            totalDiff += Math.abs(difference);
            totalDiffPercent += Math.abs(differencePercent);
            maxDiff = Math.max(maxDiff, Math.abs(difference));
            maxDiffPercent = Math.max(maxDiffPercent, Math.abs(differencePercent));
          }
        }

        // Вычисляем статистику
        if (comparison.length > 0) {
          statistics = {
            max_difference: maxDiff,
            avg_difference: totalDiff / comparison.length,
            max_difference_percent: maxDiffPercent,
            avg_difference_percent: totalDiffPercent / comparison.length,
          };
        }
      }

      // 7. Валидация калибровки через ТРК (используем currentTableResult для калибровочной таблицы)
      const currentCalibrationMap = new Map(
        currentTableResult.table.map(point => [point.level_mm, point.volume_liters])
      );
      const trkValidation = validateCalibrationByTRK(
        tankHistory,
        transactions,
        tankNumber,
        currentCalibrationMap,
        settings.data_polling_interval_minutes  // Используем настройку из параметров
      );
      
      // 8. Формируем результат с дополнительной информацией
      setAnalysisResult({
        success: true,
        table: calculatedTableResult.table, // Рассчитанная таблица (правильная)
        calibration_id: '', // Не сохраняется
        data_points_used: calculatedTableResult.data_points_count,
        quality_metrics: calculatedTableResult.quality_metrics,
        comparison,
        current_table_version: activeTable?.version,
        statistics,
        trk_validation: trkValidation,  // Данные валидации через ТРК
        debug: {
          tankHistoryCount: tankHistory.length,
          transactionsCount: transactions.length,
          currentTablePoints: currentTableResult.data_points_count,
          currentTableFiltered: currentTableResult.filtered_points_count,
          calculatedTablePoints: calculatedTableResult.data_points_count,
          calculatedTableFiltered: calculatedTableResult.filtered_points_count,
          currentTableSize: currentTableResult.table.length,
          calculatedTableSize: calculatedTableResult.table.length,
          comparisonSize: comparison?.length || 0,
          levelRange: {
            min: Math.min(...tankHistory.map(r => parseFloat(r.level))),
            max: Math.max(...tankHistory.map(r => parseFloat(r.level)))
          },
          volumeRange: {
            min: Math.min(...tankHistory.map(r => parseFloat(r.volume))),
            max: Math.max(...tankHistory.map(r => parseFloat(r.volume)))
          },
          stepMm: settings.calibration_step_mm
        }
      });
    } catch (error) {
      setAnalysisResult({
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка анализа',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadTable = async (format: 'csv' | 'json') => {
    if (!calculationResult?.calibration_id) return;

    try {
      await downloadCalibrationTable(calculationResult.calibration_id, format);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Конфигурация параметров</h3>
          <p className="text-sm text-muted-foreground">
            {tankName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnalysisDialog(true)}

// DUMMY - This won't actually be inserted, I need to find the right location in the JSX
          >
            <LineChart className="w-4 h-4 mr-2" />
            Анализ Калибровки
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCalculationDialog(true)}
          >
            <Calculator className="w-4 h-4 mr-2" />
            Автокалибровка
          </Button>
          <Badge variant={
            settings.calibration_status === 'completed' ? 'default' :
            settings.calibration_status === 'in_progress' ? 'secondary' :
            settings.calibration_status === 'failed' ? 'destructive' :
            'outline'
          }>
            {settings.calibration_status === 'completed' ? 'Откалиброван' :
             settings.calibration_status === 'in_progress' ? 'В процессе' :
             settings.calibration_status === 'failed' ? 'Ошибка' :
             'Не калиброван'}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Табы с параметрами */}
      <Tabs defaultValue="equipment" className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-4">
          <TabsTrigger value="equipment" className="flex items-center gap-1">
            <Settings className="h-3 w-3" />
            <span className="hidden sm:inline">Оборудование</span>
          </TabsTrigger>
          <TabsTrigger value="accuracy" className="flex items-center gap-1">
            <Gauge className="h-3 w-3" />
            <span className="hidden sm:inline">Погрешности</span>
          </TabsTrigger>
          <TabsTrigger value="temperature" className="flex items-center gap-1">
            <Thermometer className="h-3 w-3" />
            <span className="hidden sm:inline">Температура</span>
          </TabsTrigger>
          <TabsTrigger value="losses" className="flex items-center gap-1">
            <Droplets className="h-3 w-3" />
            <span className="hidden sm:inline">Потери</span>
          </TabsTrigger>
          <TabsTrigger value="timing" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className="hidden sm:inline">Время</span>
          </TabsTrigger>
          <TabsTrigger value="thresholds" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            <span className="hidden sm:inline">Пороги</span>
          </TabsTrigger>
        </TabsList>

        {/* Контейнер с фиксированной высотой и прокруткой */}
        <div className="h-[520px] overflow-y-auto">
          {/* Погрешности оборудования */}
          <TabsContent value="equipment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Характеристики резервуара и оборудования
              </CardTitle>
              <CardDescription>
                Физические характеристики резервуара, геометрические параметры и тип датчика уровня
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tank_shape_type">Тип резервуара по форме</Label>
                  <Select
                    value={settings.tank_shape_type}
                    onValueChange={(value: TankShapeType) => updateSetting('tank_shape_type', value)}
                  >
                    <SelectTrigger id="tank_shape_type">
                      <SelectValue placeholder="Выберите тип резервуара" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="horizontal_cylinder">Горизонтальный цилиндрический</SelectItem>
                      <SelectItem value="vertical_cylinder">Вертикальный цилиндрический</SelectItem>
                      <SelectItem value="spherical">Сферический (СУГ)</SelectItem>
                      <SelectItem value="rectangular">Прямоугольный</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Форма резервуара влияет на расчёт калибровочной таблицы
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tank_location_type">Расположение резервуара</Label>
                  <Select
                    value={settings.tank_location_type}
                    onValueChange={(value: TankLocationType) => updateSetting('tank_location_type', value)}
                  >
                    <SelectTrigger id="tank_location_type">
                      <SelectValue placeholder="Выберите расположение" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="underground">🔽 Подземный</SelectItem>
                      <SelectItem value="surface">🔼 Наземный</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Влияет на температурный режим и условия эксплуатации
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nozzles_count">Количество пистолетов (ТРК)</Label>
                  <Input
                    id="nozzles_count"
                    type="number"
                    min="1"
                    value={settings.nozzles_count || ''}
                    onChange={(e) => handleNumberInput('nozzles_count', e.target.value, true)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Количество раздаточных пистолетов, подключённых к резервуару
                  </p>
                </div>
              </div>

              {/* Геометрические параметры резервуара */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Диаметр - только для цилиндрических и сферических */}
                {(settings.tank_shape_type === 'horizontal_cylinder' ||
                  settings.tank_shape_type === 'vertical_cylinder' ||
                  settings.tank_shape_type === 'spherical') && (
                  <div className="space-y-2">
                    <Label htmlFor="tank_diameter_mm">Диаметр резервуара (мм)</Label>
                    <Input
                      id="tank_diameter_mm"
                      type="number"
                      min="1000"
                      value={settings.tank_diameter_mm || ''}
                      onChange={(e) => handleNumberInput('tank_diameter_mm', e.target.value, true)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Внутренний диаметр резервуара. Типовые: 2500, 2600, 3000 мм
                    </p>
                  </div>
                )}

                {/* Длина - для горизонтальных цилиндров и прямоугольных */}
                {(settings.tank_shape_type === 'horizontal_cylinder' ||
                  settings.tank_shape_type === 'rectangular') && (
                  <div className="space-y-2">
                    <Label htmlFor="tank_length_mm">Длина резервуара (мм)</Label>
                    <Input
                      id="tank_length_mm"
                      type="number"
                      min="1000"
                      value={settings.tank_length_mm || ''}
                      onChange={(e) => handleNumberInput('tank_length_mm', e.target.value, true)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Длина резервуара. Типовые: 6300, 7800 мм
                    </p>
                  </div>
                )}

                {/* Ширина - только для прямоугольных */}
                {settings.tank_shape_type === 'rectangular' && (
                  <div className="space-y-2">
                    <Label htmlFor="tank_width_mm">Ширина резервуара (мм)</Label>
                    <Input
                      id="tank_width_mm"
                      type="number"
                      min="1000"
                      value={settings.tank_width_mm || ''}
                      onChange={(e) => handleNumberInput('tank_width_mm', e.target.value, true)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Ширина прямоугольного резервуара
                    </p>
                  </div>
                )}

                {/* Высота - для вертикальных цилиндров и прямоугольных */}
                {(settings.tank_shape_type === 'vertical_cylinder' ||
                  settings.tank_shape_type === 'rectangular') && (
                  <div className="space-y-2">
                    <Label htmlFor="tank_height_mm">Высота резервуара (мм)</Label>
                    <Input
                      id="tank_height_mm"
                      type="number"
                      min="1000"
                      value={settings.tank_height_mm || ''}
                      onChange={(e) => handleNumberInput('tank_height_mm', e.target.value, true)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Высота резервуара
                    </p>
                  </div>
                )}

                {/* Угол наклона - только для горизонтальных цилиндров */}
                {settings.tank_shape_type === 'horizontal_cylinder' && (
                  <div className="space-y-2">
                    <Label htmlFor="tank_tilt_angle_degrees">Угол наклона (градусы)</Label>
                    <Input
                      id="tank_tilt_angle_degrees"
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={settings.tank_tilt_angle_degrees || ''}
                      onChange={(e) => handleNumberInput('tank_tilt_angle_degrees', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Угол наклона для слива остатков. Обычно 0-3°
                    </p>
                  </div>
                )}
              </div>

              {/* Автоматически рассчитанный объем */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Calculator className="h-6 w-6 text-blue-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-300">Расчетный объем резервуара</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {settings.tank_shape_type === 'horizontal_cylinder' && 'Формула: V = π × (D/2)² × L'}
                      {settings.tank_shape_type === 'vertical_cylinder' && 'Формула: V = π × (D/2)² × H'}
                      {settings.tank_shape_type === 'spherical' && 'Формула: V = (4/3) × π × (D/2)³'}
                      {settings.tank_shape_type === 'rectangular' && 'Формула: V = L × W × H'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{calculatedVolume.toFixed(0)}</p>
                    <p className="text-sm text-slate-400">литров</p>
                  </div>
                </div>
              </div>

              {/* Тип датчика уровня */}
              <div className="space-y-2">
                <Label htmlFor="level_sensor_type">Тип датчика уровня</Label>
                <Select
                  value={settings.level_sensor_type}
                  onValueChange={handleSensorTypeChange}
                >
                  <SelectTrigger id="level_sensor_type">
                    <SelectValue placeholder="Выберите тип датчика" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="radar">📡 Радарный (±1мм)</SelectItem>
                    <SelectItem value="float">🎈 Поплавковый (±1мм)</SelectItem>
                    <SelectItem value="capacitive">⚡ Емкостной (±3мм)</SelectItem>
                    <SelectItem value="hydrostatic">💧 Гидростатический (±3мм)</SelectItem>
                    <SelectItem value="other">🔧 Другой</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Для каждого типа доступны рекомендуемые погрешности на основе ГОСТ и данных производителей (раздел "Погрешности")
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Погрешности измерительного оборудования */}
        <TabsContent value="accuracy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Погрешности измерительного оборудования
              </CardTitle>
              <CardDescription>
                Метрологические параметры ТРК и датчиков уровня по ГОСТ Р 8.579-2001
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Информационный badge с текущими настройками */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 flex items-center justify-between gap-4">
                <p className="text-sm text-slate-300">
                  <span className="font-semibold">Текущий датчик:</span> {getSensorAccuracyHint()}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={applyRecommendedAccuracy}
                  className="shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Применить рекомендуемые
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dispensers_error_percent">Погрешность ТРК (%)</Label>
                  <Input
                    id="dispensers_error_percent"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={settings.dispensers_error_percent || ''}
                    onChange={(e) => handleNumberInput('dispensers_error_percent', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {getDispenserAccuracyHint()}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="level_sensor_error_percent">Погрешность уровнемера (%)</Label>
                  <Input
                    id="level_sensor_error_percent"
                    type="number"
                    step="0.01"
                    min="0"
                    max="5"
                    value={settings.level_sensor_error_percent || ''}
                    onChange={(e) => handleNumberInput('level_sensor_error_percent', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Можно указать свое значение или применить рекомендуемое для выбранного типа датчика
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="level_sensor_accuracy_mm">Точность уровнемера (мм)</Label>
                  <Input
                    id="level_sensor_accuracy_mm"
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={settings.level_sensor_accuracy_mm || ''}
                    onChange={(e) => handleNumberInput('level_sensor_accuracy_mm', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Коммерческий учет: ±3мм (ГОСТ), высокоточные радарные: ±1мм
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bias_offset_percent">Колебание (%)</Label>
                  <Input
                    id="bias_offset_percent"
                    type="number"
                    step="0.001"
                    value={settings.bias_offset_percent || ''}
                    onChange={(e) => handleNumberInput('bias_offset_percent', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Допустимое колебание показаний для фильтрации выбросов (может быть отрицательным, точность до 0.001%)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Температурные параметры */}
        <TabsContent value="temperature" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Thermometer className="h-5 w-5" />
                Температурные параметры
              </CardTitle>
              <CardDescription>
                Коэффициенты теплового расширения топлива
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fuel_type">Тип топлива</Label>
                  <Select
                    value={settings.fuel_type}
                    onValueChange={(value) => handleFuelTypeChange(value as CalibrationFuelType)}
                  >
                    <SelectTrigger id="fuel_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gasoline">Бензин</SelectItem>
                      <SelectItem value="diesel">Дизельное топливо</SelectItem>
                      <SelectItem value="propane">Пропан (СУГ)</SelectItem>
                      <SelectItem value="gas">Газ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thermal_expansion_coefficient">Коэффициент расширения (1/°C)</Label>
                  <Input
                    id="thermal_expansion_coefficient"
                    type="number"
                    step="0.0001"
                    value={settings.thermal_expansion_coefficient || ''}
                    onChange={(e) => handleNumberInput('thermal_expansion_coefficient', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    АИ-92/95: 0.00083, ДТ: 0.00074, Пропан: 0.003, Керосин: 0.001
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="base_temperature">Базовая температура (°C)</Label>
                  <Input
                    id="base_temperature"
                    type="number"
                    value={settings.base_temperature || ''}
                    onChange={(e) => handleNumberInput('base_temperature', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Обычно 15°C или 20°C
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="temp_gradient_liters_per_degree">Градиент (л/°C)</Label>
                  <Input
                    id="temp_gradient_liters_per_degree"
                    type="text"
                    value={calculatedGradient}
                    readOnly
                    className="bg-slate-800 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">
                    Автоматический расчет: {tankCapacity} л × {settings.thermal_expansion_coefficient}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="working_temp_min">Мин. температура (°C)</Label>
                  <Input
                    id="working_temp_min"
                    type="number"
                    value={settings.working_temp_min || ''}
                    onChange={(e) => handleNumberInput('working_temp_min', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="working_temp_max">Макс. температура (°C)</Label>
                  <Input
                    id="working_temp_max"
                    type="number"
                    value={settings.working_temp_max || ''}
                    onChange={(e) => handleNumberInput('working_temp_max', e.target.value)}
                  />
                </div>
              </div>

              {/* Теплоизоляция */}
              <div className="flex items-center justify-between p-4 border border-slate-700 rounded-lg bg-slate-800/30">
                <div className="space-y-1">
                  <Label htmlFor="has_thermal_insulation" className="text-base font-medium">
                    Наличие теплоизоляции
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Улучшает стабильность температуры, снижает суточные колебания и влияние внешних факторов
                  </p>
                </div>
                <Switch
                  id="has_thermal_insulation"
                  checked={settings.has_thermal_insulation}
                  onCheckedChange={(checked) => updateSetting('has_thermal_insulation', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Испарение и потери */}
        <TabsContent value="losses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5" />
                Испарение и естественная убыль
              </CardTitle>
              <CardDescription>
                Параметры потерь топлива при хранении и отпуске
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="natural_loss_summer_percent">Убыль летом (%)</Label>
                  <Input
                    id="natural_loss_summer_percent"
                    type="number"
                    step="0.1"
                    value={settings.natural_loss_summer_percent || ''}
                    onChange={(e) => handleNumberInput('natural_loss_summer_percent', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Весенне-летний (01.04-30.09): Бензин 0.08%, ДТ 0.05%, Пропан ~0.12% (Приказ № 281)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="natural_loss_winter_percent">Убыль зимой (%)</Label>
                  <Input
                    id="natural_loss_winter_percent"
                    type="number"
                    step="0.1"
                    value={settings.natural_loss_winter_percent || ''}
                    onChange={(e) => handleNumberInput('natural_loss_winter_percent', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Осенне-зимний (01.10-31.03): Бензин 0.03%, ДТ 0.02%, Пропан ~0.74% (Приказ № 281)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discharge_loss_percent">Потери при сливе (%)</Label>
                  <Input
                    id="discharge_loss_percent"
                    type="number"
                    step="0.01"
                    value={settings.discharge_loss_percent || ''}
                    onChange={(e) => handleNumberInput('discharge_loss_percent', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Обычно 0.1-0.2%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Временные параметры */}
        <TabsContent value="timing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Временные интервалы
              </CardTitle>
              <CardDescription>
                Периоды усреднения и анализа данных
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_polling_interval_minutes">Интервал получения данных (мин)</Label>
                  <Input
                    id="data_polling_interval_minutes"
                    type="number"
                    value={settings.data_polling_interval_minutes || ''}
                    onChange={(e) => handleNumberInput('data_polling_interval_minutes', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Частота опроса остатков резервуара (5, 10, 15 минут)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="averaging_period_minutes">Период усреднения (мин)</Label>
                  <Input
                    id="averaging_period_minutes"
                    type="number"
                    value={settings.averaging_period_minutes || ''}
                    onChange={(e) => handleNumberInput('averaging_period_minutes', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Интервал усреднения показаний датчика (15, 30, 60 минут)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tank_rest_time_minutes">Время покоя резервуара (мин)</Label>
                  <Input
                    id="tank_rest_time_minutes"
                    type="number"
                    value={settings.tank_rest_time_minutes || ''}
                    onChange={(e) => handleNumberInput('tank_rest_time_minutes', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Время стабилизации после приёма/отпуска топлива (обычно 30 мин)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Пороговые значения */}
        <TabsContent value="thresholds" className="space-y-4">
          {/* Пороговые уведомления */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Пороги уведомлений
              </CardTitle>
              <CardDescription>
                Настройка уровней для автоматических уведомлений (как на странице Оборудование)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fuel_level_warning_percent">⚠️ Порог предупреждения (%)</Label>
                  <Input
                    id="fuel_level_warning_percent"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.fuel_level_warning_percent || ''}
                    onChange={(e) => handleNumberInput('fuel_level_warning_percent', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Уведомление при уровне ≤ указанного %
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fuel_level_critical_percent">🔴 Критический порог (%)</Label>
                  <Input
                    id="fuel_level_critical_percent"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.fuel_level_critical_percent || ''}
                    onChange={(e) => handleNumberInput('fuel_level_critical_percent', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Критическое уведомление при уровне ≤ указанного %
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fuel_level_max_percent">🔼 Максимальный уровень (%)</Label>
                  <Input
                    id="fuel_level_max_percent"
                    type="number"
                    min="80"
                    max="100"
                    value={settings.fuel_level_max_percent || ''}
                    onChange={(e) => handleNumberInput('fuel_level_max_percent', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Бензин/ДТ: 95%, Пропан (СУГ): 85% - безопасность заполнения
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Мёртвый остаток и зоны датчика */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5" />
                Мёртвый остаток и зоны измерений
              </CardTitle>
              <CardDescription>
                Технический остаток и мёртвые зоны датчика уровня (ГОСТ 8.346-2000)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dead_stock_liters">Мёртвый остаток (л)</Label>
                  <Input
                    id="dead_stock_liters"
                    type="number"
                    min="0"
                    value={settings.dead_stock_liters || ''}
                    onChange={(e) => handleNumberInput('dead_stock_liters', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Объём под заливной трубой, не откачиваемый (для 25 м³: ~1500 л)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dead_stock_percent">Мёртвый остаток (%)</Label>
                  <Input
                    id="dead_stock_percent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.dead_stock_percent || ''}
                    onChange={(e) => handleNumberInput('dead_stock_percent', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Обычно 0-6% от объёма резервуара
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sensor_blind_zone_bottom_mm">Мёртвая зона снизу (мм)</Label>
                  <Input
                    id="sensor_blind_zone_bottom_mm"
                    type="number"
                    min="0"
                    value={settings.sensor_blind_zone_bottom_mm || ''}
                    onChange={(e) => handleNumberInput('sensor_blind_zone_bottom_mm', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Зона где датчик не работает (снизу), обычно 100-200 мм
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sensor_blind_zone_top_mm">Мёртвая зона сверху (мм)</Label>
                  <Input
                    id="sensor_blind_zone_top_mm"
                    type="number"
                    min="0"
                    value={settings.sensor_blind_zone_top_mm || ''}
                    onChange={(e) => handleNumberInput('sensor_blind_zone_top_mm', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Зона где датчик не работает (сверху), обычно 100-200 мм
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="critical_water_level_mm">Критический уровень воды (мм)</Label>
                  <Input
                    id="critical_water_level_mm"
                    type="number"
                    min="0"
                    value={settings.critical_water_level_mm || ''}
                    onChange={(e) => handleNumberInput('critical_water_level_mm', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    При превышении требуется откачка, обычно 30-50 мм
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Пороговые значения мониторинга */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Пороги мониторинга работы резервуара
              </CardTitle>
              <CardDescription>
                Допустимые отклонения при работе. При нарушении система сигнализирует о необходимости калибровки
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_change_for_calibration_liters">Мин. изменение для калибровки (л)</Label>
                  <Input
                    id="min_change_for_calibration_liters"
                    type="number"
                    value={settings.min_change_for_calibration_liters || ''}
                    onChange={(e) => handleNumberInput('min_change_for_calibration_liters', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Минимальное изменение объёма для учёта в калибровке
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_acceptable_deviation_percent">Макс. допустимое расхождение (%)</Label>
                  <Input
                    id="max_acceptable_deviation_percent"
                    type="number"
                    step="0.1"
                    value={settings.max_acceptable_deviation_percent || ''}
                    onChange={(e) => handleNumberInput('max_acceptable_deviation_percent', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Максимально допустимое расхождение от калибровки
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_acceptable_deviation_liters">Макс. допустимое расхождение (л)</Label>
                  <Input
                    id="max_acceptable_deviation_liters"
                    type="number"
                    value={settings.max_acceptable_deviation_liters || ''}
                    onChange={(e) => handleNumberInput('max_acceptable_deviation_liters', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Максимально допустимое расхождение в литрах
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="critical_error_threshold_percent">Критическая ошибка (%)</Label>
                  <Input
                    id="critical_error_threshold_percent"
                    type="number"
                    step="0.1"
                    value={settings.critical_error_threshold_percent || ''}
                    onChange={(e) => handleNumberInput('critical_error_threshold_percent', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    При превышении требуется ручная проверка калибровки
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        </div>
      </Tabs>

      {/* Кнопки действий */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isSaving}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Сбросить
        </Button>

        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">Сохранено</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">Ошибка</span>
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Сохранить
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Модальное окно расчета таблицы */}
      <Dialog open={showCalculationDialog} onOpenChange={setShowCalculationDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
              <Calculator className="h-6 w-6 text-blue-400" />
              Расчет калибровочной таблицы
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-base">
              Таблица рассчитывается на основе реальных отпусков ТРК за выбранный период с учетом установленных параметров
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Выбор периода */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-400" />
                  Период анализа данных
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Дата от */}
                  <div>
                    <Label htmlFor="dialog_start_date" className="text-sm text-slate-300">📅 Начальная дата</Label>
                    <Input
                      id="dialog_start_date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      max={endDate || undefined}
                      className="mt-1.5 bg-slate-900 border-slate-600 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                  </div>

                  {/* Дата до */}
                  <div>
                    <Label htmlFor="dialog_end_date" className="text-sm text-slate-300">📅 Конечная дата</Label>
                    <Input
                      id="dialog_end_date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || undefined}
                      max={new Date().toISOString().split('T')[0]}
                      className="mt-1.5 bg-slate-900 border-slate-600 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                  </div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-2.5">
                  <p className="text-xs text-blue-300 flex items-center gap-2">
                    <span className="text-blue-400">ℹ️</span>
                    Данные из /v1/tank_history (обновление каждые 10 минут)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Параметры расчета */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4 text-green-400" />
                  Параметры расчета
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Алгоритм расчета */}
                <div className="space-y-2">
                  <Label htmlFor="dialog_calibration_method" className="text-sm font-medium text-slate-200">
                    🧮 Алгоритм расчета
                  </Label>
                  <Select
                    value={settings.calibration_method}
                    onValueChange={(value) => updateSetting('calibration_method', value as CalibrationMethod)}
                  >
                    <SelectTrigger id="dialog_calibration_method" className="bg-slate-900 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linear_regression">Линейная регрессия</SelectItem>
                      <SelectItem value="least_squares">Метод наименьших квадратов (МНК)</SelectItem>
                      <SelectItem value="moving_average">Скользящее среднее</SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Динамическое описание алгоритма */}
                  <div className="bg-slate-800/50 border border-slate-700 rounded-md p-2.5">
                    <p className="text-xs text-slate-300">
                      {settings.calibration_method === 'linear_regression' && (
                        <>
                          <span className="font-semibold text-blue-400">Линейная регрессия:</span> Строит линейную зависимость между уровнем и объемом.
                          Быстрый и простой метод, подходит для резервуаров с простой геометрией.
                        </>
                      )}
                      {settings.calibration_method === 'least_squares' && (
                        <>
                          <span className="font-semibold text-green-400">МНК:</span> Минимизирует сумму квадратов отклонений.
                          Наиболее точный метод, учитывает все точки данных. Рекомендуется для коммерческого учета.
                        </>
                      )}
                      {settings.calibration_method === 'moving_average' && (
                        <>
                          <span className="font-semibold text-orange-400">Скользящее среднее:</span> Сглаживает колебания данных усреднением.
                          Устойчив к выбросам, хорош для данных с шумом и частыми колебаниями.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <Separator className="my-3" />

                {/* Фильтрация аномалий */}
                <div className="space-y-3">
                  <h5 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                    <Filter className="h-4 w-4 text-orange-400" />
                    Фильтрация данных
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 bg-slate-900 rounded-md border border-slate-700">
                      <Label htmlFor="dialog_exclude_delivery" className="text-sm cursor-pointer">
                        ⛽ Исключать приемы топлива
                      </Label>
                      <Switch
                        id="dialog_exclude_delivery"
                        checked={settings.exclude_delivery_periods}
                        onCheckedChange={(checked) => updateSetting('exclude_delivery_periods', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-900 rounded-md border border-slate-700">
                      <Label htmlFor="dialog_exclude_maintenance" className="text-sm cursor-pointer">
                        🔧 Исключать периоды ТО
                      </Label>
                      <Switch
                        id="dialog_exclude_maintenance"
                        checked={settings.exclude_maintenance_periods}
                        onCheckedChange={(checked) => updateSetting('exclude_maintenance_periods', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-900 rounded-md border border-slate-700">
                      <Label htmlFor="dialog_outlier_filter" className="text-sm cursor-pointer">
                        🎯 Фильтр выбросов
                      </Label>
                      <Switch
                        id="dialog_outlier_filter"
                        checked={settings.outlier_filter_enabled}
                        onCheckedChange={(checked) => updateSetting('outlier_filter_enabled', checked)}
                      />
                    </div>

                    {settings.outlier_filter_enabled && (
                      <div className="space-y-2">
                        <Label htmlFor="dialog_outlier_sigma" className="text-sm text-slate-300">σ Сигма</Label>
                        <Input
                          id="dialog_outlier_sigma"
                          type="number"
                          step="0.1"
                          value={settings.outlier_filter_sigma || ''}
                          onChange={(e) => handleNumberInput('outlier_filter_sigma', e.target.value)}
                          className="bg-slate-900 border-slate-600"
                        />
                        <p className="text-xs text-slate-400">
                          3σ = 99.7% данных
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="my-3" />

                {/* Веса данных */}
                <div className="space-y-3">
                  <h5 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                    ⚖️ Веса источников данных
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dialog_sensor_weight" className="text-sm text-slate-300">
                        📡 Вес уровнемера (0-1)
                      </Label>
                      <Input
                        id="dialog_sensor_weight"
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={settings.sensor_weight || ''}
                        onChange={(e) => handleNumberInput('sensor_weight', e.target.value)}
                        className="bg-slate-900 border-slate-600"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dialog_dispenser_weight" className="text-sm text-slate-300">
                        ⛽ Вес ТРК (0-1)
                      </Label>
                      <Input
                        id="dialog_dispenser_weight"
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={settings.dispenser_weight || ''}
                        onChange={(e) => handleNumberInput('dispenser_weight', e.target.value)}
                        className="bg-slate-900 border-slate-600"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Примечания */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-purple-400" />
                  Примечания к расчету
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  id="dialog_calculation_notes"
                  placeholder="Укажите причину расчета новой таблицы..."
                  value={calculationNotes}
                  onChange={(e) => setCalculationNotes(e.target.value)}
                  rows={3}
                  className="bg-slate-900 border-slate-600 resize-none"
                />
              </CardContent>
            </Card>

            {/* Кнопка расчета */}
            <Button
              onClick={handleCalculate}
              disabled={isCalculating || !startDate || !endDate}
              className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {isCalculating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Выполняется расчет...
                </>
              ) : (
                <>
                  <Calculator className="w-5 h-5 mr-2" />
                  Рассчитать таблицу
                </>
              )}
            </Button>

            {/* Результаты расчета */}
            {calculationResult && (
              <div className={`mt-4 p-4 rounded-lg border ${calculationResult.success ? 'bg-green-900/20 border-green-600/50' : 'bg-red-900/20 border-red-600/50'}`}>
                {calculationResult.success ? (
                  <>
                    <h4 className="font-semibold text-green-400 flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-4 h-4" />
                      Расчет завершен успешно
                    </h4>

                    {/* Статистика */}
                    {calculationResult.statistics && (
                      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Точек данных:</span>
                          <span className="font-semibold text-white">
                            {calculationResult.statistics.data_points_used}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Отфильтровано:</span>
                          <span className="font-semibold text-white">
                            {calculationResult.statistics.data_points_filtered}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Среднее откл.:</span>
                          <span className="font-semibold text-white">
                            {calculationResult.statistics.average_deviation_percent?.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">R²:</span>
                          <span className="font-semibold text-white">
                            {calculationResult.statistics.r_squared?.toFixed(4)}
                          </span>
                        </div>
                        {calculationResult.table && (
                          <div className="flex justify-between col-span-2">
                            <span className="text-slate-400">Точек в таблице:</span>
                            <span className="font-semibold text-white">
                              {calculationResult.table.length}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Сравнение с предыдущей */}
                    {calculationResult.comparison?.has_previous && (
                      <div className="mb-4 p-3 bg-slate-800/50 rounded">
                        <p className="text-sm font-semibold mb-2">Сравнение с активной таблицей:</p>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Среднее отличие:</span>
                            <span className="font-semibold">
                              {calculationResult.comparison.average_difference_percent?.toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Макс. отличие:</span>
                            <span className="font-semibold">
                              {calculationResult.comparison.max_difference_percent?.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Кнопки скачивания */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadTable('csv')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Скачать CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadTable('json')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Скачать JSON
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-red-400">
                    <XCircle className="w-4 h-4" />
                    <span>Ошибка: {calculationResult.error}</span>
                  </div>
                )}
              </div>
            )}

            {/* История таблиц */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>История калибровочных таблиц</CardTitle>
                <CardDescription>
                  Все расчитанные таблицы для этого резервуара. Применение таблицы требует прав администратора.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CalibrationTablesHistory tankId={tankId} />
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Модальное окно анализа калибровки */}
      <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
              <LineChart className="h-6 w-6 text-blue-400" />
              Анализ Калибровки
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-base">
              Расчет таблицы на основе реальных отпусков ТРК с последующим сравнением с текущей калибровкой
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Выбор периода */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-400" />
                  Период анализа данных
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Дата от */}
                  <div>
                    <Label htmlFor="analysis_start_date" className="text-sm text-slate-300">📅 Начальная дата</Label>
                    <Input
                      id="analysis_start_date"
                      type="date"
                      value={analysisStartDate}
                      onChange={(e) => setAnalysisStartDate(e.target.value)}
                      max={analysisEndDate || undefined}
                      className="mt-1.5 bg-slate-900 border-slate-600 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                  </div>

                  {/* Дата до */}
                  <div>
                    <Label htmlFor="analysis_end_date" className="text-sm text-slate-300">📅 Конечная дата</Label>
                    <Input
                      id="analysis_end_date"
                      type="date"
                      value={analysisEndDate}
                      onChange={(e) => setAnalysisEndDate(e.target.value)}
                      min={analysisStartDate || undefined}
                      max={new Date().toISOString().split('T')[0]}
                      className="mt-1.5 bg-slate-900 border-slate-600 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                  </div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-2.5">
                  <p className="text-xs text-blue-300 flex items-center gap-2">
                    <span className="text-blue-400">ℹ️</span>
                    Данные из /v1/tank_history (обновление каждые 10 минут)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Параметры расчета */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4 text-green-400" />
                  Параметры расчета
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Алгоритм расчета */}
                <div className="space-y-2">
                  <Label htmlFor="analysis_calibration_method" className="text-sm font-medium text-slate-200">
                    🧮 Алгоритм расчета
                  </Label>
                  <Select
                    value={settings.calibration_method}
                    onValueChange={(value) => updateSetting('calibration_method', value as CalibrationMethod)}
                  >
                    <SelectTrigger id="analysis_calibration_method" className="bg-slate-900 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linear_regression">Линейная регрессия</SelectItem>
                      <SelectItem value="least_squares">Метод наименьших квадратов (МНК)</SelectItem>
                      <SelectItem value="moving_average">Скользящее среднее</SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Динамическое описание алгоритма */}
                  <div className="bg-slate-800/50 border border-slate-700 rounded-md p-2.5">
                    <p className="text-xs text-slate-300">
                      {settings.calibration_method === 'linear_regression' && (
                        <>
                          <span className="font-semibold text-blue-400">Линейная регрессия:</span> Строит линейную зависимость между уровнем и объемом.
                          Быстрый и простой метод, подходит для резервуаров с простой геометрией.
                        </>
                      )}
                      {settings.calibration_method === 'least_squares' && (
                        <>
                          <span className="font-semibold text-green-400">МНК:</span> Минимизирует сумму квадратов отклонений.
                          Наиболее точный метод, учитывает все точки данных. Рекомендуется для коммерческого учета.
                        </>
                      )}
                      {settings.calibration_method === 'moving_average' && (
                        <>
                          <span className="font-semibold text-orange-400">Скользящее среднее:</span> Сглаживает колебания данных усреднением.
                          Устойчив к выбросам, хорош для данных с шумом и частыми колебаниями.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <Separator className="my-3" />

                {/* Фильтрация аномалий */}
                <div className="space-y-3">
                  <h5 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                    <Filter className="h-4 w-4 text-orange-400" />
                    Фильтрация данных
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 bg-slate-900 rounded-md border border-slate-700">
                      <Label htmlFor="analysis_exclude_delivery" className="text-sm cursor-pointer">
                        ⛽ Исключать приемы топлива
                      </Label>
                      <Switch
                        id="analysis_exclude_delivery"
                        checked={settings.exclude_delivery_periods}
                        onCheckedChange={(checked) => updateSetting('exclude_delivery_periods', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-900 rounded-md border border-slate-700">
                      <Label htmlFor="analysis_exclude_maintenance" className="text-sm cursor-pointer">
                        🔧 Исключать периоды ТО
                      </Label>
                      <Switch
                        id="analysis_exclude_maintenance"
                        checked={settings.exclude_maintenance_periods}
                        onCheckedChange={(checked) => updateSetting('exclude_maintenance_periods', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-900 rounded-md border border-slate-700">
                      <Label htmlFor="analysis_outlier_filter" className="text-sm cursor-pointer">
                        🎯 Фильтр выбросов
                      </Label>
                      <Switch
                        id="analysis_outlier_filter"
                        checked={settings.outlier_filter_enabled}
                        onCheckedChange={(checked) => updateSetting('outlier_filter_enabled', checked)}
                      />
                    </div>

                    {settings.outlier_filter_enabled && (
                      <div className="space-y-2">
                        <Label htmlFor="analysis_outlier_sigma" className="text-sm text-slate-300">σ Сигма</Label>
                        <Input
                          id="analysis_outlier_sigma"
                          type="number"
                          step="0.1"
                          value={settings.outlier_filter_sigma || ''}
                          onChange={(e) => handleNumberInput('outlier_filter_sigma', e.target.value)}
                          className="bg-slate-900 border-slate-600"
                        />
                        <p className="text-xs text-slate-400">
                          3σ = 99.7% данных
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="my-3" />

                {/* Шаг построения таблицы */}
                <div className="space-y-2 mb-6">
                  <Label htmlFor="analysis_calibration_step" className="text-sm font-semibold text-slate-200">
                    📏 Шаг построения таблицы (мм)
                  </Label>
                  <Input
                    id="analysis_calibration_step"
                    type="number"
                    step="10"
                    min="10"
                    max="1000"
                    value={settings.calibration_step_mm || ''}
                    onChange={(e) => handleNumberInput('calibration_step_mm', e.target.value)}
                    className="bg-slate-900 border-slate-600"
                  />
                  <p className="text-xs text-slate-400">
                    Шаг между точками калибровочной таблицы. Рекомендуется 50-100 мм для коммерческого учёта.
                  </p>
                </div>

                {/* Веса данных */}
                <div className="space-y-3">
                  <h5 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                    ⚖️ Веса источников данных
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="analysis_sensor_weight" className="text-sm text-slate-300">
                        📡 Вес уровнемера (0-1)
                      </Label>
                      <Input
                        id="analysis_sensor_weight"
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={settings.sensor_weight || ''}
                        onChange={(e) => handleNumberInput('sensor_weight', e.target.value)}
                        className="bg-slate-900 border-slate-600"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="analysis_dispenser_weight" className="text-sm text-slate-300">
                        ⛽ Вес ТРК (0-1)
                      </Label>
                      <Input
                        id="analysis_dispenser_weight"
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={settings.dispenser_weight || ''}
                        onChange={(e) => handleNumberInput('dispenser_weight', e.target.value)}
                        className="bg-slate-900 border-slate-600"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Примечания */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-purple-400" />
                  Примечания к анализу
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  id="analysis_notes"
                  placeholder="Укажите причину анализа калибровки..."
                  value={analysisNotes}
                  onChange={(e) => setAnalysisNotes(e.target.value)}
                  rows={3}
                  className="bg-slate-900 border-slate-600 resize-none"
                />
              </CardContent>
            </Card>

            {/* Кнопка анализа */}
            <Button
              onClick={handleAnalysis}
              disabled={isAnalyzing}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Выполняется анализ...
                </>
              ) : (
                <>
                  <LineChart className="w-4 h-4 mr-2" />
                  Выполнить анализ
                </>
              )}
            </Button>

            {/* Результаты анализа */}
            {analysisResult && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    {analysisResult.success ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                        <span className="text-green-400">Анализ выполнен успешно</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-400" />
                        <span className="text-red-400">Ошибка анализа</span>
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisResult.success ? (
                    <div className="space-y-4">
                      {/* Статистика сравнения */}
                      {analysisResult.statistics && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-slate-900 border border-slate-700 rounded-md p-3">
                            <p className="text-xs text-slate-400 mb-1">Макс. отклонение</p>
                            <p className="text-lg font-semibold text-white">
                              {analysisResult.statistics.max_difference.toFixed(2)} л
                            </p>
                          </div>
                          <div className="bg-slate-900 border border-slate-700 rounded-md p-3">
                            <p className="text-xs text-slate-400 mb-1">Средн. отклонение</p>
                            <p className="text-lg font-semibold text-white">
                              {analysisResult.statistics.avg_difference.toFixed(2)} л
                            </p>
                          </div>
                          <div className="bg-slate-900 border border-slate-700 rounded-md p-3">
                            <p className="text-xs text-slate-400 mb-1">Макс. отклонение %</p>
                            <p className="text-lg font-semibold text-white">
                              {analysisResult.statistics.max_difference_percent.toFixed(3)}%
                            </p>
                          </div>
                          <div className="bg-slate-900 border border-slate-700 rounded-md p-3">
                            <p className="text-xs text-slate-400 mb-1">Средн. отклонение %</p>
                            <p className="text-lg font-semibold text-white">
                              {analysisResult.statistics.avg_difference_percent.toFixed(3)}%
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Отладочная информация */}
                      {analysisResult.debug && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-3">
                          <p className="text-sm font-semibold text-yellow-300 mb-2">🔍 Отладочная информация:</p>
                          <div className="grid grid-cols-2 gap-2 text-xs text-yellow-200">
                            <div>История резервуара: <strong>{analysisResult.debug.tankHistoryCount}</strong> записей</div>
                            <div>Транзакции ТРК: <strong>{analysisResult.debug.transactionsCount}</strong></div>
                            <div>Текущая таблица - точек данных: <strong>{analysisResult.debug.currentTablePoints}</strong></div>
                            <div>Текущая таблица - после фильтрации: <strong>{analysisResult.debug.currentTableFiltered}</strong></div>
                            <div>Рассчитанная таблица - точек данных: <strong>{analysisResult.debug.calculatedTablePoints}</strong></div>
                            <div>Рассчитанная таблица - после фильтрации: <strong>{analysisResult.debug.calculatedTableFiltered}</strong></div>
                            <div>Размер текущей таблицы: <strong>{analysisResult.debug.currentTableSize}</strong> точек</div>
                            <div>Размер рассчитанной таблицы: <strong>{analysisResult.debug.calculatedTableSize}</strong> точек</div>
                            <div className="col-span-2">Сравнение: <strong>{analysisResult.debug.comparisonSize}</strong> точек</div>
                            {analysisResult.debug.levelRange && (
                              <div className="col-span-2 border-t border-yellow-500/20 pt-2 mt-2">
                                <strong>Диапазон уровней:</strong> {analysisResult.debug.levelRange.min.toFixed(1)} - {analysisResult.debug.levelRange.max.toFixed(1)} см
                              </div>
                            )}
                            {analysisResult.debug.volumeRange && (
                              <div className="col-span-2">
                                <strong>Диапазон объемов:</strong> {analysisResult.debug.volumeRange.min.toFixed(0)} - {analysisResult.debug.volumeRange.max.toFixed(0)} л
                              </div>
                            )}
                            {analysisResult.debug.stepMm && (
                              <div className="col-span-2">
                                <strong>Шаг таблицы:</strong> {analysisResult.debug.stepMm} мм
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Информация о версии текущей таблицы */}
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3">
                        <p className="text-sm text-blue-300">
                          ℹ️ Сравнение рассчитанной калибровочной таблицы с реальными показаниями датчика уровня за выбранный период
                        </p>
                      </div>

                      {/* График разницы по уровням */}
                      {analysisResult.comparison && analysisResult.comparison.length > 0 && (() => {
                        const differences = analysisResult.comparison.map(r => r.difference);
                        const minDiff = Math.min(...differences);
                        const maxDiff = Math.max(...differences);
                        console.log('📊 График данные:', {
                          точек: analysisResult.comparison.length,
                          минРазница: minDiff,
                          максРазница: maxDiff,
                          первые3: analysisResult.comparison.slice(0, 3),
                          последние3: analysisResult.comparison.slice(-3)
                        });
                        return (
                        <div className="bg-slate-900 border border-slate-700 rounded-md p-4 mb-4">
                          <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                            📊 График зависимости объема от уровня
                          </h4>
                          <ResponsiveContainer width="100%" height={400}>
                            <RechartsLineChart
                              data={analysisResult.comparison}
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                              <XAxis
                                dataKey="level_mm"
                                stroke="#94a3b8"
                                label={{ value: 'Уровень (мм)', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
                              />
                              <YAxis
                                stroke="#94a3b8"
                                label={{ value: 'Объем (л)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#1e293b',
                                  border: '1px solid #475569',
                                  borderRadius: '6px',
                                  color: '#e2e8f0'
                                }}
                                formatter={(value: number, name: string) => [
                                  `${value.toFixed(2)} л`, 
                                  name === 'calculated_volume' ? 'Геометрия (эталон)' : 'Датчик (текущий)'
                                ]}
                                labelFormatter={(label) => `Уровень: ${label} мм`}
                              />
                              <Legend
                                wrapperStyle={{ color: '#94a3b8' }}
                              />
                              <Line
                                type="monotone"
                                dataKey="calculated_volume"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ fill: '#3b82f6', r: 2 }}
                                activeDot={{ r: 5 }}
                                name="Геометрия (эталон)"
                              />
                              <Line
                                type="monotone"
                                dataKey="current_volume"
                                stroke="#f97316"
                                strokeWidth={2}
                                dot={{ fill: '#f97316', r: 2 }}
                                activeDot={{ r: 5 }}
                                name="Датчик (текущий)"
                              />
                            </RechartsLineChart>
                          </ResponsiveContainer>
                          <p className="text-xs text-slate-400 mt-2 text-center">
                            Синяя линия — геометрический расчет (эталон), оранжевая — показания датчика уровня. 
                            ⚠️ Если оранжевая линия "застревает" на одном уровне — в истории резервуара нет данных для более высоких уровней.
                          </p>
                        </div>
                        );
                      })()}

                      {/* График прироста объема на каждый шаг */}
                      {analysisResult.comparison && analysisResult.comparison.length > 1 && (() => {
                        // Вычисляем прирост объема между соседними точками (геометрия, датчик И ТРК)
                        const increments = [];
                        
                        // Создаем Map из данных валидации ТРК для быстрого поиска
                        const trkDataMap = new Map<number, number>();
                        if (analysisResult.trk_validation) {
                          analysisResult.trk_validation.forEach(point => {
                            // Используем средний уровень интервала
                            const avgLevel = Math.round((point.level_before_mm + point.level_after_mm) / 2);
                            const increment = point.volume_by_trk; // Отпущено по ТРК
                            
                            // Если на этом уровне уже есть данные - усредняем
                            if (trkDataMap.has(avgLevel)) {
                              const existing = trkDataMap.get(avgLevel)!;
                              trkDataMap.set(avgLevel, (existing + increment) / 2);
                            } else {
                              trkDataMap.set(avgLevel, increment);
                            }
                          });
                        }
                        
                        for (let i = 1; i < analysisResult.comparison.length; i++) {
                          const prev = analysisResult.comparison[i - 1];
                          const curr = analysisResult.comparison[i];
                          const levelStep = curr.level_mm - prev.level_mm;
                          
                          // Прирост по геометрической модели (зеленая линия)
                          const volumeIncrementGeometric = curr.calculated_volume - prev.calculated_volume;
                          
                          // Прирост по датчику (оранжевая линия) - только если есть данные
                          const volumeIncrementSensor = (curr.current_volume > 0 && prev.current_volume > 0)
                            ? curr.current_volume - prev.current_volume
                            : null;
                          
                          // Прирост по ТРК (синяя линия) - ищем ближайшие данные
                          let volumeIncrementTRK: number | null = null;
                          if (trkDataMap.size > 0) {
                            const avgLevel = Math.round((curr.level_mm + prev.level_mm) / 2);
                            
                            // Прямой lookup
                            if (trkDataMap.has(avgLevel)) {
                              volumeIncrementTRK = trkDataMap.get(avgLevel)!;
                            } else {
                              // Поиск ближайшего уровня (в пределах ±100 мм)
                              const sortedLevels = Array.from(trkDataMap.keys()).sort((a, b) => a - b);
                              const closest = sortedLevels.find(level => 
                                Math.abs(level - avgLevel) <= 100
                              );
                              if (closest !== undefined) {
                                volumeIncrementTRK = trkDataMap.get(closest)!;
                              }
                            }
                          }
                          
                          increments.push({
                            level_mm: curr.level_mm,
                            increment_geometric: volumeIncrementGeometric,
                            increment_sensor: volumeIncrementSensor,
                            increment_trk: volumeIncrementTRK,
                            increment_per_mm: volumeIncrementGeometric / levelStep
                          });
                        }
                        
                        const maxIncrementGeometric = Math.max(...increments.map(i => i.increment_geometric));
                        const minIncrementGeometric = Math.min(...increments.map(i => i.increment_geometric));
                        
                        // Фильтруем для статистики по датчику (исключаем null)
                        const sensorIncrements = increments.filter(i => i.increment_sensor !== null).map(i => i.increment_sensor!);
                        const maxIncrementSensor = sensorIncrements.length > 0 ? Math.max(...sensorIncrements) : 0;
                        const minIncrementSensor = sensorIncrements.length > 0 ? Math.min(...sensorIncrements) : 0;
                        
                        // Фильтруем для статистики по ТРК (исключаем null)
                        const trkIncrements = increments.filter(i => i.increment_trk !== null).map(i => i.increment_trk!);
                        const maxIncrementTRK = trkIncrements.length > 0 ? Math.max(...trkIncrements) : 0;
                        const minIncrementTRK = trkIncrements.length > 0 ? Math.min(...trkIncrements) : 0;
                        
                        return (
                        <div className="bg-slate-900 border border-slate-700 rounded-md p-4 mb-4">
                          <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                            📈 График прироста объема (НЕЛИНЕЙНОСТЬ)
                          </h4>
                          <ResponsiveContainer width="100%" height={300}>
                            <RechartsLineChart
                              data={increments}
                              margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
                              layout="vertical"
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                              <XAxis
                                type="number"
                                stroke="#94a3b8"
                                label={{ value: 'Прирост объема (л)', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
                              />
                              <YAxis
                                type="number"
                                dataKey="level_mm"
                                stroke="#94a3b8"
                                label={{ value: 'Уровень (мм)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                                reversed={true}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#1e293b',
                                  border: '1px solid #475569',
                                  borderRadius: '6px',
                                  color: '#e2e8f0'
                                }}
                                formatter={(value: number | null, name: string) => {
                                  if (value === null) return ['Нет данных', name];
                                  const labels: Record<string, string> = {
                                    'increment_geometric': 'Геометрия',
                                    'increment_sensor': 'Датчик',
                                    'increment_trk': 'ТРК'
                                  };
                                  return [`${value.toFixed(2)} л`, labels[name] || name];
                                }}
                                labelFormatter={(label) => `Уровень: ${label} мм`}
                              />
                              <Legend wrapperStyle={{ color: '#94a3b8' }} />
                              <Line
                                type="monotone"
                                dataKey="increment_geometric"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={{ fill: '#10b981', r: 2 }}
                                activeDot={{ r: 5 }}
                                name="Геометрия (эталон)"
                              />
                              <Line
                                type="monotone"
                                dataKey="increment_sensor"
                                stroke="#f97316"
                                strokeWidth={2}
                                dot={{ fill: '#f97316', r: 2 }}
                                activeDot={{ r: 5 }}
                                name="Датчик (текущий)"
                                connectNulls={false}
                              />
                              <Line
                                type="monotone"
                                dataKey="increment_trk"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ fill: '#3b82f6', r: 3 }}
                                activeDot={{ r: 6 }}
                                name="ТРК (реальные отпуски)"
                                connectNulls={false}
                              />
                            </RechartsLineChart>
                          </ResponsiveContainer>
                          <p className="text-xs text-slate-400 mt-2 text-center">
                            🟢 <strong>Зеленая</strong> — теоретический прирост (геометрия). 
                            🟠 <strong>Оранжевая</strong> — прирост по датчику (из API volume). 
                            🔵 <strong>Синяя</strong> — прирост по ТРК (реальные отпуски, метрологически поверенные). 
                            Максимум в середине: 
                            геом {maxIncrementGeometric.toFixed(1)}л, 
                            датчик {maxIncrementSensor > 0 ? maxIncrementSensor.toFixed(1) : 'N/A'}л,
                            ТРК {maxIncrementTRK > 0 ? maxIncrementTRK.toFixed(1) : 'N/A'}л
                            — характерная особенность горизонтального цилиндра!
                          </p>
                          
                          {/* Информация о данных ТРК */}
                          {trkIncrements.length === 0 && (
                            <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-600/50 rounded-md">
                              <p className="text-xs text-yellow-300 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                <strong>Данные ТРК (синяя линия) недоступны:</strong>
                              </p>
                              <ul className="text-xs text-yellow-200 mt-2 ml-6 list-disc space-y-1">
                                <li>Найдено точек валидации ТРК: {analysisResult.trk_validation?.length || 0}</li>
                                <li>Возможные причины: нет транзакций в периоде, интервалы между замерами {'>'} 30 мин, уровень не уменьшился</li>
                                <li>Попробуйте: выбрать период с активными отпусками, уменьшить интервал опроса датчика</li>
                              </ul>
                            </div>
                          )}
                        </div>
                        );
                      })()}

                      {/* График валидации калибровки через ТРК */}
                      {analysisResult.trk_validation && analysisResult.trk_validation.length > 0 && (() => {
                        const trkData = analysisResult.trk_validation;
                        
                        // Группируем по пистолетам для статистики
                        const nozzleGroups = trkData.reduce((acc, point) => {
                          if (!acc[point.nozzle]) {
                            acc[point.nozzle] = [];
                          }
                          acc[point.nozzle].push(point);
                          return acc;
                        }, {} as Record<number, TRKValidationPoint[]>);
                        
                        // Статистика по всем точкам
                        const avgDeviation = trkData.reduce((sum, p) => sum + Math.abs(p.deviation), 0) / trkData.length;
                        const maxDeviation = Math.max(...trkData.map(p => Math.abs(p.deviation)));
                        const avgDeviationPercent = trkData.reduce((sum, p) => sum + Math.abs(p.deviation_percent), 0) / trkData.length;
                        
                        // Данные для графика: сортируем по времени
                        const chartData = [...trkData].sort((a, b) => 
                          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                        );
                        
                        return (
                        <div className="bg-slate-900 border border-slate-700 rounded-md p-4 mb-4">
                          <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                            🎯 Валидация калибровки через ТРК (независимый эталон)
                          </h4>
                          
                          {/* Статистика по пистолетам */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            <div className="bg-slate-800 border border-slate-600 rounded-md p-3">
                              <p className="text-xs text-slate-400 mb-1">Всего проверок</p>
                              <p className="text-lg font-semibold text-white">{trkData.length}</p>
                            </div>
                            <div className="bg-slate-800 border border-slate-600 rounded-md p-3">
                              <p className="text-xs text-slate-400 mb-1">Средн. отклонение</p>
                              <p className="text-lg font-semibold text-white">{avgDeviation.toFixed(2)} л</p>
                              <p className="text-xs text-slate-400">({avgDeviationPercent.toFixed(2)}%)</p>
                            </div>
                            <div className="bg-slate-800 border border-slate-600 rounded-md p-3">
                              <p className="text-xs text-slate-400 mb-1">Макс. отклонение</p>
                              <p className="text-lg font-semibold text-white">{maxDeviation.toFixed(2)} л</p>
                            </div>
                            <div className="bg-slate-800 border border-slate-600 rounded-md p-3">
                              <p className="text-xs text-slate-400 mb-1">Пистолетов</p>
                              <p className="text-lg font-semibold text-white">{Object.keys(nozzleGroups).filter(n => n !== '-1').length}</p>
                              <p className="text-xs text-slate-400">
                                {Object.keys(nozzleGroups)
                                  .filter(n => n !== '-1')
                                  .map(n => `№${n}`)
                                  .join(', ')}
                                {nozzleGroups[-1] && nozzleGroups[-1].length > 0 && 
                                  ` (+${nozzleGroups[-1].length} групповых)`}
                              </p>
                            </div>
                          </div>
                          
                          {/* График отклонений по времени */}
                          <ResponsiveContainer width="100%" height={300}>
                            <RechartsLineChart
                              data={chartData.map((point, idx) => ({
                                index: idx + 1,
                                timestamp: new Date(point.timestamp).toLocaleTimeString('ru-RU', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                }),
                                deviation_percent: point.deviation_percent,
                                volume_by_trk: point.volume_by_trk,
                                volume_by_sensor: point.volume_by_sensor,
                                nozzle: point.nozzle
                              }))}
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                              <XAxis
                                dataKey="index"
                                stroke="#94a3b8"
                                label={{ value: 'Номер отпуска', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
                              />
                              <YAxis
                                stroke="#94a3b8"
                                label={{ value: 'Отклонение (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#1e293b',
                                  border: '1px solid #475569',
                                  borderRadius: '6px',
                                  color: '#e2e8f0'
                                }}
                                formatter={(value: number, name: string) => {
                                  if (name === 'deviation_percent') return [`${value.toFixed(2)}%`, 'Отклонение'];
                                  if (name === 'volume_by_trk') return [`${value.toFixed(2)} л`, 'ТРК'];
                                  if (name === 'volume_by_sensor') return [`${value.toFixed(2)} л`, 'Датчик'];
                                  return [value, name];
                                }}
                                labelFormatter={(label) => `Отпуск №${label}`}
                              />
                              <Legend wrapperStyle={{ color: '#94a3b8' }} />
                              <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
                              <ReferenceLine y={2} stroke="#f59e0b" strokeDasharray="2 2" label={{ value: '+2%', fill: '#f59e0b' }} />
                              <ReferenceLine y={-2} stroke="#f59e0b" strokeDasharray="2 2" label={{ value: '-2%', fill: '#f59e0b' }} />
                              <Line
                                type="monotone"
                                dataKey="deviation_percent"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                dot={{ fill: '#8b5cf6', r: 3 }}
                                activeDot={{ r: 6 }}
                                name="Отклонение датчика от ТРК"
                              />
                            </RechartsLineChart>
                          </ResponsiveContainer>
                          
                          <p className="text-xs text-slate-400 mt-2 text-center">
                            🎯 Сравнение показаний датчика уровня (через калибровочную таблицу) с фактическими отпусками через ТРК. 
                            ТРК — метрологически поверенные приборы (±0.25% ГОСТ), служат независимым эталоном для проверки калибровки.
                          </p>
                          
                          {avgDeviationPercent > 2 && (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-3 mt-3">
                              <p className="text-sm text-yellow-300 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                <strong>Внимание:</strong> Среднее отклонение {avgDeviationPercent.toFixed(2)}% превышает допустимые 2%. 
                                Рекомендуется повторная калибровка резервуара.
                              </p>
                            </div>
                          )}
                        </div>
                        );
                      })()}

                      {/* Таблица сравнения */}
                      {analysisResult.comparison && analysisResult.comparison.length > 0 && (
                        <div className="border border-slate-700 rounded-md overflow-hidden">
                          <div className="max-h-96 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-800 sticky top-0">
                                <tr>
                                  <th className="px-3 py-2 text-left text-slate-300 font-medium">Уровень (мм)</th>
                                  <th className="px-3 py-2 text-right text-slate-300 font-medium">Датчик (л)</th>
                                  <th className="px-3 py-2 text-right text-slate-300 font-medium">Калибровка (л)</th>
                                  <th className="px-3 py-2 text-right text-slate-300 font-medium">Разница (л)</th>
                                  <th className="px-3 py-2 text-right text-slate-300 font-medium">Разница (%)</th>
                                </tr>
                              </thead>
                              <tbody className="bg-slate-900">
                                {analysisResult.comparison.map((row, idx) => (
                                  <tr 
                                    key={idx}
                                    className={`border-t border-slate-800 ${
                                      Math.abs(row.difference_percent) > 1 ? 'bg-red-500/10' :
                                      Math.abs(row.difference_percent) > 0.5 ? 'bg-yellow-500/10' :
                                      ''
                                    }`}
                                  >
                                    <td className="px-3 py-2 text-slate-200">{row.level_mm}</td>
                                    <td className="px-3 py-2 text-right text-slate-200">
                                      {row.current_volume.toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-slate-200">
                                      {row.calculated_volume.toFixed(2)}
                                    </td>
                                    <td className={`px-3 py-2 text-right font-medium ${
                                      Math.abs(row.difference) > 50 ? 'text-red-400' :
                                      Math.abs(row.difference) > 20 ? 'text-yellow-400' :
                                      'text-green-400'
                                    }`}>
                                      {row.difference > 0 ? '+' : ''}{row.difference.toFixed(2)}
                                    </td>
                                    <td className={`px-3 py-2 text-right font-medium ${
                                      Math.abs(row.difference_percent) > 1 ? 'text-red-400' :
                                      Math.abs(row.difference_percent) > 0.5 ? 'text-yellow-400' :
                                      'text-green-400'
                                    }`}>
                                      {row.difference_percent > 0 ? '+' : ''}{row.difference_percent.toFixed(3)}%
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Нет текущей таблицы для сравнения */}
                      {!analysisResult.comparison && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-4">
                          <p className="text-sm text-blue-300">
                            ℹ️ Показаны результаты расчета калибровочной таблицы без сравнения с реальными показаниями датчика.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-400">
                      <XCircle className="w-4 h-4" />
                      <span>Ошибка: {analysisResult.error}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
