/**
 * Диалог расчета калибровочной таблицы
 * Извлечено из TankCalibrationSettings.tsx
 *
 * Использует клиентский алгоритм calculateCalibrationTable из calibrationAlgorithm.ts
 * (бэкенд-эндпоинт POST /:tankId/calculate не реализован)
 */

import { useState } from 'react';
import type {
  TankCalibrationSettings as CalibrationSettings,
  CalibrationMethod,
  CalculateCalibrationTableResult,
  CalibrationTablePoint,
  ReceiptItem
} from '@/types/tanks';
import { createCalibrationTable } from '@/services/calibrationTableService';
import {
  calculateCalibrationTable as runCalibrationAlgorithm,
  type CalibrationCalculationResult
} from '@/utils/calibrationAlgorithm';
import { getTankHistory } from '@/services/tankHistoryService';
import { getTransactions, getReceipts } from '@/services/tankBookService';
import { useSelection } from '@/contexts/SelectionContext';
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
  tankName?: string;
  fuelType?: string;
  networkName?: string;
  stationName?: string;
  settings: CalibrationSettings;
  updateSetting: <K extends keyof CalibrationSettings>(key: K, value: CalibrationSettings[K]) => void;
  handleNumberInput: (key: keyof CalibrationSettings, value: string, isInteger?: boolean) => void;
  onTableSaved?: () => void;
}

/** Скачать таблицу как CSV/JSON файл (клиентская генерация) */
function downloadTableFile(table: CalibrationTablePoint[], format: 'csv' | 'json') {
  let content: string;
  let mimeType: string;
  const filename = `calibration_table_${new Date().toISOString().slice(0, 10)}.${format}`;

  if (format === 'csv') {
    const header = 'level_mm,volume_liters';
    const rows = table.map(p => `${p.level_mm},${p.volume_liters}`);
    content = [header, ...rows].join('\n');
    mimeType = 'text/csv;charset=utf-8;';
  } else {
    content = JSON.stringify(table, null, 2);
    mimeType = 'application/json;charset=utf-8;';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export function CalculationDialog({
  open,
  onOpenChange,
  tankId,
  tankName,
  fuelType,
  networkName,
  stationName,
  settings,
  updateSetting,
  handleNumberInput,
  onTableSaved
}: CalculationDialogProps) {
  const { selectedNetwork, selectedTradingPoint } = useSelection();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [calculationNotes, setCalculationNotes] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationResult, setCalculationResult] = useState<CalculateCalibrationTableResult | null>(null);
  const [calculatedTable, setCalculatedTable] = useState<CalibrationTablePoint[] | null>(null);

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

    if (!selectedNetwork || !selectedTradingPoint) {
      setCalculationResult({
        success: false,
        error: 'Необходимо выбрать сеть и торговую точку',
      });
      return;
    }

    setIsCalculating(true);
    setCalculationResult(null);
    setCalculatedTable(null);

    try {
      // Получаем external_id торговой точки
      let tradingPointExternalId: string | null = null;
      try {
        const { tradingPointsService } = await import('@/services/tradingPointsService');
        const tradingPoint = await tradingPointsService.getById(selectedTradingPoint);
        tradingPointExternalId = tradingPoint?.external_id || null;
      } catch {
        throw new Error('Ошибка загрузки данных торговой точки');
      }

      if (!selectedNetwork.external_id || !tradingPointExternalId) {
        throw new Error(`Отсутствует external_id: сеть=${selectedNetwork.external_id}, точка=${tradingPointExternalId}`);
      }

      const tankNumber = parseInt(tankId, 10);

      // Загружаем историю резервуара
      const tankHistory = await getTankHistory({
        system: selectedNetwork.external_id,
        station: tradingPointExternalId,
        tank: tankNumber,
        dt_beg: `${startDate} 00:00:00`,
        dt_end: `${endDate} 23:59:59`
      });

      if (tankHistory.length === 0) {
        throw new Error('Нет данных истории резервуара за выбранный период');
      }

      const fuelCode = tankHistory.find(record => record.number === tankNumber)?.fuel;

      // Загружаем транзакции (отпуски ТРК)
      const transactionsResponse = await getTransactions({
        system: selectedNetwork.external_id,
        station: tradingPointExternalId,
        dt_beg: `${startDate} 00:00:00`,
        dt_end: `${endDate} 23:59:59`
      });
      const transactions = transactionsResponse.items || [];

      // Загружаем поступления
      let receipts: ReceiptItem[] = [];
      try {
        const receiptsResponse = await getReceipts({
          system: selectedNetwork.external_id,
          station: tradingPointExternalId,
          dt_beg: `${startDate} 00:00:00`,
          dt_end: `${endDate} 23:59:59`
        });
        receipts = receiptsResponse.shifts?.flatMap(shift => shift.receipt || []) || [];
      } catch {
        // Продолжаем без поступлений
      }

      // Клиентский расчёт
      const result: CalibrationCalculationResult = runCalibrationAlgorithm(
        tankHistory,
        transactions,
        settings,
        tankNumber,
        receipts,
        undefined,
        fuelCode
      );

      if (result.table.length === 0) {
        const details = result.diagnostics?.warnings?.join(' ');
        throw new Error(details || 'Недостаточно реальных отпусков ТРК и показаний датчика для расчета калибровочной таблицы.');
      }

      const savedTable = await createCalibrationTable({
        tank_id: tankId,
        table: result.table,
        analysis_start_date: startDate,
        analysis_end_date: endDate,
        creation_notes: calculationNotes.trim() || undefined,
        calibration_settings_snapshot: settings,
        statistics: {
          data_points_total: result.data_points_count,
          data_points_filtered: result.data_points_count - result.filtered_points_count,
          data_points_used: result.filtered_points_count,
          average_deviation_percent: result.quality_metrics?.rmse ?? 0,
          max_deviation_percent: result.quality_metrics?.max_error ?? 0,
          r_squared: result.quality_metrics?.r_squared ?? 0,
        },
        diagnostics: result.diagnostics,
      });

      setCalculatedTable(savedTable.table);
      setCalculationResult({
        success: true,
        calibration_id: savedTable.id,
        table_version: savedTable.version,
        table: savedTable.table,
        statistics: {
          data_points_total: result.data_points_count,
          data_points_filtered: result.data_points_count - result.filtered_points_count,
          data_points_used: result.filtered_points_count,
          average_deviation_percent: result.quality_metrics?.rmse ?? 0,
          max_deviation_percent: result.quality_metrics?.max_error ?? 0,
          r_squared: result.quality_metrics?.r_squared ?? 0,
        },
        diagnostics: result.diagnostics,
      });
      onTableSaved?.();
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

  const handleDownloadTable = (format: 'csv' | 'json') => {
    if (!calculatedTable || calculatedTable.length === 0) return;
    downloadTableFile(calculatedTable, format);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calculator className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Расчет таблицы по ТРК
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base">
            Создание новой версии таблицы по реальным отпускам ТРК и показаниям резервуара за выбранный период
            <span className="mt-2 block text-blue-600 dark:text-blue-300 font-semibold">
              {networkName || 'Компания не выбрана'} / {stationName || 'Станция не выбрана'} / {tankName || 'Резервуар'}{fuelType ? ` (${fuelType})` : ''}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Выбор периода */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Период анализа данных
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dialog_start_date" className="text-sm text-foreground/80">Начальная дата</Label>
                  <Input
                    id="dialog_start_date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate || undefined}
                    className="mt-1.5 bg-background border-border"
                  />
                </div>
                <div>
                  <Label htmlFor="dialog_end_date" className="text-sm text-foreground/80">Конечная дата</Label>
                  <Input
                    id="dialog_end_date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || undefined}
                    max={new Date().toISOString().split('T')[0]}
                    className="mt-1.5 bg-background border-border"
                  />
                </div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-2.5">
                <p className="text-xs text-blue-600 dark:text-blue-300 flex items-center gap-2">
                  <span className="text-blue-600 dark:text-blue-400">i</span>
                  Данные из /v1/tank_history (обновление каждые 10 минут)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Параметры расчета */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4 text-green-600 dark:text-green-400" />
                Параметры расчета
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dialog_calibration_method" className="text-sm font-medium text-foreground">
                  Алгоритм расчета
                </Label>
                <Select
                  value={settings.calibration_method}
                  onValueChange={(value) => updateSetting('calibration_method', value as CalibrationMethod)}
                >
                  <SelectTrigger id="dialog_calibration_method" className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct_interpolation">Прямая интерполяция (рекомендуется)</SelectItem>
                    <SelectItem value="least_squares">МНК — кубическая регрессия</SelectItem>
                    <SelectItem value="moving_average">Скользящее среднее</SelectItem>
                  </SelectContent>
                </Select>
                <div className="bg-card/50 border border-border rounded-md p-2.5">
                  <p className="text-xs text-foreground/80">
                    {settings.calibration_method === 'least_squares' && (
                      <><span className="font-semibold text-green-600 dark:text-green-400">МНК:</span> Квадратичная аппроксимация (y=ax²+bx+c). Хорошо описывает S-кривую цилиндра. Рекомендуется для коммерческого учёта.</>
                    )}
                    {settings.calibration_method === 'moving_average' && (
                      <><span className="font-semibold text-orange-600 dark:text-orange-400">Скользящее среднее:</span> Сглаживает колебания данных усреднением. Устойчив к выбросам, хорош для данных с шумом и частыми колебаниями.</>
                    )}
                    {settings.calibration_method === 'direct_interpolation' && (
                      <><span className="font-semibold text-purple-600 dark:text-purple-400">Прямая интерполяция:</span> Кусочно-линейная между реальными точками. Максимальная точность при качественных данных.</>
                    )}
                  </p>
                </div>
              </div>

              <Separator className="my-3" />

              <div className="space-y-3">
                <h5 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Filter className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  Фильтрация данных
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 bg-background rounded-md border border-border">
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
                      <Label htmlFor="dialog_outlier_sigma" className="text-sm text-foreground/80">Sigma</Label>
                      <Input
                        id="dialog_outlier_sigma"
                        type="number"
                        step="0.1"
                        value={settings.outlier_filter_sigma || ''}
                        onChange={(e) => handleNumberInput('outlier_filter_sigma', e.target.value)}
                        className="bg-background border-border"
                      />
                      <p className="text-xs text-muted-foreground">3sigma = 99.7% данных</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Примечания */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Примечания к расчету
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Укажите причину расчета новой таблицы..."
                value={calculationNotes}
                onChange={(e) => setCalculationNotes(e.target.value)}
                rows={3}
                className="bg-background border-border resize-none"
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
            <div className={`mt-4 p-4 rounded-lg border ${calculationResult.success ? 'bg-emerald-100 dark:bg-emerald-900/20 border-green-600/50' : 'bg-red-100 dark:bg-red-900/20 border-red-600/50'}`}>
              {calculationResult.success ? (
                <>
                  <h4 className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4" />
                    Расчет завершен успешно
                  </h4>
                  {calculationResult.table_version && (
                    <p className="text-sm text-foreground mb-3">
                      Сохранена версия таблицы: <span className="font-semibold">v{calculationResult.table_version}</span>
                    </p>
                  )}
                  {calculationResult.statistics && (
                    <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Точек данных:</span>
                        <span className="font-semibold text-foreground">{calculationResult.statistics.data_points_used}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Отфильтровано:</span>
                        <span className="font-semibold text-foreground">{calculationResult.statistics.data_points_filtered}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">RMSE:</span>
                        <span className="font-semibold text-foreground">{calculationResult.statistics.average_deviation_percent?.toFixed(1)} л</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">R²:</span>
                        <span className="font-semibold text-foreground">{calculationResult.statistics.r_squared?.toFixed(4)}</span>
                      </div>
                      {calculationResult.table && (
                        <div className="flex justify-between col-span-2">
                          <span className="text-muted-foreground">Точек в таблице:</span>
                          <span className="font-semibold text-foreground">{calculationResult.table.length}</span>
                        </div>
                      )}
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
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <XCircle className="w-4 h-4" />
                  <span>Ошибка: {calculationResult.error}</span>
                </div>
              )}
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
