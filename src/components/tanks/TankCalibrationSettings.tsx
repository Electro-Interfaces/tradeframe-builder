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
import { calculateCalibrationTable, downloadCalibrationTable } from '@/services/calibrationTableService';
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
  Gauge
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface TankCalibrationSettingsProps {
  tankId: string;
  tankName: string;
  tankCapacity: number;
  initialSettings?: CalibrationSettings;
  onSave: (settings: CalibrationSettings) => Promise<void>;
}

export function TankCalibrationSettingsComponent({
  tankId,
  tankName,
  tankCapacity,
  initialSettings,
  onSave
}: TankCalibrationSettingsProps) {
  const [settings, setSettings] = useState<CalibrationSettings>(() => {
    if (initialSettings) {
      return initialSettings;
    }
    return {
      tank_id: tankId,
      ...DEFAULT_CALIBRATION_SETTINGS,
      calibration_status: 'never'
    } as CalibrationSettings;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Состояния для расчета таблицы
  const [showCalculationDialog, setShowCalculationDialog] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [calculationNotes, setCalculationNotes] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationResult, setCalculationResult] = useState<CalculateCalibrationTableResult | null>(null);

  // Вычисляемый градиент: объём резервуара × коэффициент расширения
  const calculatedGradient = (tankCapacity * settings.thermal_expansion_coefficient).toFixed(2);

  const updateSetting = <K extends keyof CalibrationSettings>(
    key: K,
    value: CalibrationSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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
                    value={settings.nozzles_count}
                    onChange={(e) => updateSetting('nozzles_count', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Количество раздаточных пистолетов, подключённых к резервуару
                  </p>
                </div>
              </div>

              {/* Геометрические параметры резервуара */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tank_diameter_mm">Диаметр резервуара (мм)</Label>
                  <Input
                    id="tank_diameter_mm"
                    type="number"
                    min="1000"
                    value={settings.tank_diameter_mm}
                    onChange={(e) => updateSetting('tank_diameter_mm', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Внутренний диаметр резервуара. Типовые: 2500, 2600, 3000 мм
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tank_length_or_height">
                    {settings.tank_shape_type === 'vertical_cylinder' ? 'Высота резервуара (мм)' : 'Длина резервуара (мм)'}
                  </Label>
                  <Input
                    id="tank_length_or_height"
                    type="number"
                    min="1000"
                    value={settings.tank_shape_type === 'vertical_cylinder' ? settings.tank_height_mm : settings.tank_length_mm}
                    onChange={(e) => {
                      const field = settings.tank_shape_type === 'vertical_cylinder' ? 'tank_height_mm' : 'tank_length_mm';
                      updateSetting(field, parseInt(e.target.value));
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    {settings.tank_shape_type === 'vertical_cylinder' 
                      ? 'Высота вертикального резервуара' 
                      : 'Длина горизонтального резервуара. Типовые: 6300, 7800 мм'}
                  </p>
                </div>

                {settings.tank_shape_type === 'horizontal_cylinder' && (
                  <div className="space-y-2">
                    <Label htmlFor="tank_tilt_angle_degrees">Угол наклона (градусы)</Label>
                    <Input
                      id="tank_tilt_angle_degrees"
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={settings.tank_tilt_angle_degrees}
                      onChange={(e) => updateSetting('tank_tilt_angle_degrees', parseFloat(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Угол наклона для слива остатков. Обычно 0-3°
                    </p>
                  </div>
                )}
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
                    value={settings.dispensers_error_percent}
                    onChange={(e) => updateSetting('dispensers_error_percent', parseFloat(e.target.value))}
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
                    value={settings.level_sensor_error_percent}
                    onChange={(e) => updateSetting('level_sensor_error_percent', parseFloat(e.target.value))}
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
                    value={settings.level_sensor_accuracy_mm}
                    onChange={(e) => updateSetting('level_sensor_accuracy_mm', parseFloat(e.target.value))}
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
                    step="0.01"
                    min="0"
                    max="1"
                    value={settings.bias_offset_percent}
                    onChange={(e) => updateSetting('bias_offset_percent', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Допустимое колебание показаний для фильтрации выбросов
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
                    value={settings.thermal_expansion_coefficient}
                    onChange={(e) => updateSetting('thermal_expansion_coefficient', parseFloat(e.target.value))}
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
                    value={settings.base_temperature}
                    onChange={(e) => updateSetting('base_temperature', parseFloat(e.target.value))}
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
                    value={settings.working_temp_min}
                    onChange={(e) => updateSetting('working_temp_min', parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="working_temp_max">Макс. температура (°C)</Label>
                  <Input
                    id="working_temp_max"
                    type="number"
                    value={settings.working_temp_max}
                    onChange={(e) => updateSetting('working_temp_max', parseFloat(e.target.value))}
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
                    value={settings.natural_loss_summer_percent}
                    onChange={(e) => updateSetting('natural_loss_summer_percent', parseFloat(e.target.value))}
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
                    value={settings.natural_loss_winter_percent}
                    onChange={(e) => updateSetting('natural_loss_winter_percent', parseFloat(e.target.value))}
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
                    value={settings.discharge_loss_percent}
                    onChange={(e) => updateSetting('discharge_loss_percent', parseFloat(e.target.value))}
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
                    value={settings.data_polling_interval_minutes}
                    onChange={(e) => updateSetting('data_polling_interval_minutes', parseFloat(e.target.value))}
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
                    value={settings.averaging_period_minutes}
                    onChange={(e) => updateSetting('averaging_period_minutes', parseFloat(e.target.value))}
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
                    value={settings.tank_rest_time_minutes}
                    onChange={(e) => updateSetting('tank_rest_time_minutes', parseFloat(e.target.value))}
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
                    value={settings.fuel_level_warning_percent}
                    onChange={(e) => updateSetting('fuel_level_warning_percent', parseFloat(e.target.value))}
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
                    value={settings.fuel_level_critical_percent}
                    onChange={(e) => updateSetting('fuel_level_critical_percent', parseFloat(e.target.value))}
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
                    value={settings.fuel_level_max_percent}
                    onChange={(e) => updateSetting('fuel_level_max_percent', parseFloat(e.target.value))}
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
                    value={settings.dead_stock_liters}
                    onChange={(e) => updateSetting('dead_stock_liters', parseFloat(e.target.value))}
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
                    value={settings.dead_stock_percent}
                    onChange={(e) => updateSetting('dead_stock_percent', parseFloat(e.target.value))}
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
                    value={settings.sensor_blind_zone_bottom_mm}
                    onChange={(e) => updateSetting('sensor_blind_zone_bottom_mm', parseFloat(e.target.value))}
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
                    value={settings.sensor_blind_zone_top_mm}
                    onChange={(e) => updateSetting('sensor_blind_zone_top_mm', parseFloat(e.target.value))}
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
                    value={settings.critical_water_level_mm}
                    onChange={(e) => updateSetting('critical_water_level_mm', parseFloat(e.target.value))}
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
                    value={settings.min_change_for_calibration_liters}
                    onChange={(e) => updateSetting('min_change_for_calibration_liters', parseFloat(e.target.value))}
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
                    value={settings.max_acceptable_deviation_percent}
                    onChange={(e) => updateSetting('max_acceptable_deviation_percent', parseFloat(e.target.value))}
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
                    value={settings.max_acceptable_deviation_liters}
                    onChange={(e) => updateSetting('max_acceptable_deviation_liters', parseFloat(e.target.value))}
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
                    value={settings.critical_error_threshold_percent}
                    onChange={(e) => updateSetting('critical_error_threshold_percent', parseFloat(e.target.value))}
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
                          value={settings.outlier_filter_sigma}
                          onChange={(e) => updateSetting('outlier_filter_sigma', parseFloat(e.target.value))}
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
                        value={settings.sensor_weight}
                        onChange={(e) => updateSetting('sensor_weight', parseFloat(e.target.value))}
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
                        value={settings.dispenser_weight}
                        onChange={(e) => updateSetting('dispenser_weight', parseFloat(e.target.value))}
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
    </div>
  );
}
