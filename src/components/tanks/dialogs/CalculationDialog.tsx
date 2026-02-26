/**
 * Диалог расчета калибровочной таблицы
 * Извлечено из TankCalibrationSettings.tsx
 */

import { useState } from 'react';
import type { CalibrationSettings, CalibrationMethod, CalculateCalibrationTableResult } from '@/types/tanks';
import { calculateCalibrationTable, downloadCalibrationTable } from '@/services/calibrationTableService';
import { CalibrationTablesHistory } from '../CalibrationTablesHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Settings,
  Clock,
  Filter,
  Calculator,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  FileSpreadsheet
} from 'lucide-react';

interface CalculationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tankId: string;
  settings: CalibrationSettings;
  updateSetting: <K extends keyof CalibrationSettings>(key: K, value: CalibrationSettings[K]) => void;
  handleNumberInput: (key: keyof CalibrationSettings, value: string, isInteger?: boolean) => void;
}

export function CalculationDialog({
  open,
  onOpenChange,
  tankId,
  settings,
  updateSetting,
  handleNumberInput
}: CalculationDialogProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [calculationNotes, setCalculationNotes] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationResult, setCalculationResult] = useState<CalculateCalibrationTableResult | null>(null);

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
        period: { start_date: startDate, end_date: endDate },
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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                <div>
                  <Label htmlFor="dialog_start_date" className="text-sm text-slate-300">Начальная дата</Label>
                  <Input
                    id="dialog_start_date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate || undefined}
                    className="mt-1.5 bg-slate-900 border-slate-600 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                </div>
                <div>
                  <Label htmlFor="dialog_end_date" className="text-sm text-slate-300">Конечная дата</Label>
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
                  <span className="text-blue-400">i</span>
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
              <div className="space-y-2">
                <Label htmlFor="dialog_calibration_method" className="text-sm font-medium text-slate-200">
                  Алгоритм расчета
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
                <div className="bg-slate-800/50 border border-slate-700 rounded-md p-2.5">
                  <p className="text-xs text-slate-300">
                    {settings.calibration_method === 'linear_regression' && (
                      <><span className="font-semibold text-blue-400">Линейная регрессия:</span> Строит линейную зависимость между уровнем и объемом. Быстрый и простой метод, подходит для резервуаров с простой геометрией.</>
                    )}
                    {settings.calibration_method === 'least_squares' && (
                      <><span className="font-semibold text-green-400">МНК:</span> Минимизирует сумму квадратов отклонений. Наиболее точный метод, учитывает все точки данных. Рекомендуется для коммерческого учета.</>
                    )}
                    {settings.calibration_method === 'moving_average' && (
                      <><span className="font-semibold text-orange-400">Скользящее среднее:</span> Сглаживает колебания данных усреднением. Устойчив к выбросам, хорош для данных с шумом и частыми колебаниями.</>
                    )}
                  </p>
                </div>
              </div>

              <Separator className="my-3" />

              <div className="space-y-3">
                <h5 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                  <Filter className="h-4 w-4 text-orange-400" />
                  Фильтрация данных
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 bg-slate-900 rounded-md border border-slate-700">
                    <Label htmlFor="dialog_outlier_filter" className="text-sm cursor-pointer">
                      Фильтр выбросов
                    </Label>
                    <Switch
                      id="dialog_outlier_filter"
                      checked={settings.outlier_filter_enabled}
                      onCheckedChange={(checked) => updateSetting('outlier_filter_enabled', checked)}
                    />
                  </div>
                  {settings.outlier_filter_enabled && (
                    <div className="space-y-2">
                      <Label htmlFor="dialog_outlier_sigma" className="text-sm text-slate-300">Sigma</Label>
                      <Input
                        id="dialog_outlier_sigma"
                        type="number"
                        step="0.1"
                        value={settings.outlier_filter_sigma || ''}
                        onChange={(e) => handleNumberInput('outlier_filter_sigma', e.target.value)}
                        className="bg-slate-900 border-slate-600"
                      />
                      <p className="text-xs text-slate-400">3sigma = 99.7% данных</p>
                    </div>
                  )}
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
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Выполняется расчет...</>
            ) : (
              <><Calculator className="w-5 h-5 mr-2" />Рассчитать таблицу</>
            )}
          </Button>

          {/* Результаты расчета */}
          {calculationResult && (
            <div className={`mt-4 p-4 rounded-lg border ${calculationResult.success ? 'bg-emerald-900/20 border-green-600/50' : 'bg-red-900/20 border-red-600/50'}`}>
              {calculationResult.success ? (
                <>
                  <h4 className="font-semibold text-green-400 flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4" />
                    Расчет завершен успешно
                  </h4>
                  {calculationResult.statistics && (
                    <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Точек данных:</span>
                        <span className="font-semibold text-white">{calculationResult.statistics.data_points_used}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Отфильтровано:</span>
                        <span className="font-semibold text-white">{calculationResult.statistics.data_points_filtered}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Среднее откл.:</span>
                        <span className="font-semibold text-white">{calculationResult.statistics.average_deviation_percent?.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">R2:</span>
                        <span className="font-semibold text-white">{calculationResult.statistics.r_squared?.toFixed(4)}</span>
                      </div>
                      {calculationResult.table && (
                        <div className="flex justify-between col-span-2">
                          <span className="text-slate-400">Точек в таблице:</span>
                          <span className="font-semibold text-white">{calculationResult.table.length}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {calculationResult.comparison?.has_previous && (
                    <div className="mb-4 p-3 bg-slate-800/50 rounded">
                      <p className="text-sm font-semibold mb-2">Сравнение с активной таблицей:</p>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Среднее отличие:</span>
                          <span className="font-semibold">{calculationResult.comparison.average_difference_percent?.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Макс. отличие:</span>
                          <span className="font-semibold">{calculationResult.comparison.max_difference_percent?.toFixed(2)}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleDownloadTable('csv')}>
                      <Download className="w-4 h-4 mr-2" />Скачать CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownloadTable('json')}>
                      <Download className="w-4 h-4 mr-2" />Скачать JSON
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
  );
}
