/**
 * Модальное окно с деталями поступления топлива
 * + Блок подтверждения менеджером
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, Pencil, XCircle, Undo2 } from "lucide-react";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNewAuth } from '@/contexts/NewAuthContext';
import type { FlatReceipt } from '@/types/receipts';
import {
  confirmReceipt,
  deleteConfirmation,
  type ReceiptConfirmation,
  type ConfirmationStatus,
} from '@/services/receiptConfirmationApiService';

interface ReceiptDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: FlatReceipt | null;
  systemId?: number | null;
  confirmation?: ReceiptConfirmation | null;
  onConfirmationChanged?: () => void;
}

export const ReceiptDetailsModal: React.FC<ReceiptDetailsModalProps> = ({
  isOpen,
  onClose,
  receipt,
  systemId,
  confirmation,
  onConfirmationChanged,
}) => {
  const isMobile = useIsMobile();
  const { user } = useNewAuth();

  // Режим коррекции / отклонения
  const [correcting, setCorrecting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [corrVolume, setCorrVolume] = useState('');
  const [corrAmount, setCorrAmount] = useState('');
  const [corrDensity, setCorrDensity] = useState('');
  const [corrTemp, setCorrTemp] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Сброс формы при смене поступления
  useEffect(() => {
    setCorrecting(false);
    setRejecting(false);
    setCorrVolume('');
    setCorrAmount('');
    setCorrDensity('');
    setCorrTemp('');
    setComment('');
  }, [receipt?.ttn, receipt?.dt, receipt?.tank]);

  if (!receipt) return null;

  const resetCorrectionForm = () => {
    setCorrecting(false);
    setRejecting(false);
    setCorrVolume('');
    setCorrAmount('');
    setCorrDensity('');
    setCorrTemp('');
    setComment('');
    setError(null);
  };

  const startCorrection = () => {
    // Предзаполняем документальными данными
    setCorrVolume(receipt.doc.volume);
    setCorrAmount(receipt.doc.amount);
    setCorrDensity(String(receipt.doc.density));
    setCorrTemp(String(receipt.doc.temp));
    setComment(confirmation?.comment || '');
    setCorrecting(true);
  };

  const handleConfirm = async (status: ConfirmationStatus) => {
    if (!systemId) return;
    if (status === 'rejected' && !comment.trim()) {
      setError('Укажите причину отклонения');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await confirmReceipt({
        systemId,
        stationNumber: receipt.stationNumber,
        shiftNumber: receipt.shiftNumber,
        tankNumber: receipt.tank,
        ttn: receipt.ttn,
        receiptDt: receipt.dt,
        status,
        correctedVolume: status === 'corrected' ? corrVolume : null,
        correctedAmount: status === 'corrected' ? corrAmount : null,
        correctedDensity: status === 'corrected' && corrDensity ? parseFloat(corrDensity) : null,
        correctedTemp: status === 'corrected' && corrTemp ? parseFloat(corrTemp) : null,
        comment: (status === 'corrected' || status === 'rejected') ? comment : '',
        confirmedByName: user?.name || user?.email || '',
      });
      resetCorrectionForm();
      onConfirmationChanged?.();
    } catch (err: any) {
      setError(err.message || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmation?.id) return;
    if (!window.confirm('Отменить подтверждение этого поступления?')) return;
    setError(null);
    setSaving(true);
    try {
      await deleteConfirmation(confirmation.id);
      resetCorrectionForm();
      onConfirmationChanged?.();
    } catch (err: any) {
      setError(err.message || 'Не удалось отменить');
    } finally {
      setSaving(false);
    }
  };

  const getDeviationBadgeVariant = (percent: number): "default" | "secondary" | "destructive" => {
    const absPercent = Math.abs(percent);
    if (absPercent < 1) return 'default';
    if (absPercent < 3) return 'secondary';
    return 'destructive';
  };

  const statusLabel: Record<ConfirmationStatus, string> = {
    confirmed: 'Подтверждено',
    corrected: 'Скорректировано',
    rejected: 'Отклонено',
  };

  const statusColor: Record<ConfirmationStatus, string> = {
    confirmed: 'text-green-600 dark:text-green-400',
    corrected: 'text-amber-600 dark:text-amber-400',
    rejected: 'text-red-600 dark:text-red-400',
  };

  const statusBorderColor: Record<ConfirmationStatus, string> = {
    confirmed: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20',
    corrected: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20',
    rejected: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20',
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetCorrectionForm(); onClose(); } }}>
      <DialogContent className={cn(
        "bg-card text-foreground border-border",
        isMobile ? "max-w-[95vw] max-h-[90vh] p-3" : "max-w-2xl max-h-[80vh] p-4"
      )}>
        <DialogHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-foreground mb-1">
                Детали поступления
              </DialogTitle>
              <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                <span>ТТН: <span className="text-foreground font-mono">{receipt.ttn}</span></span>
                <span>•</span>
                <span>Смена: <span className="text-foreground">{receipt.shiftNumber}</span></span>
                <span>•</span>
                <span>ТТ: <span className="text-foreground">{receipt.stationNumber}</span></span>
                {confirmation && (
                  <>
                    <span>•</span>
                    <span className={statusColor[confirmation.status]}>
                      {statusLabel[confirmation.status]}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto pr-2" style={{ maxHeight: isMobile ? '60vh' : '55vh' }}>
          {/* Основная информация */}
          <div className="bg-background rounded-lg p-3 border border-border">
            <h3 className="text-xs font-semibold text-foreground/80 mb-2">Основная информация</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground mb-0.5">Дата и время</div>
                <div className="text-foreground">
                  {format(new Date(receipt.dt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-0.5">Вид топлива</div>
                <div>
                  <Badge variant="outline" className="bg-card text-foreground border-border text-xs">
                    {receipt.service.service_name}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-0.5">Резервуар</div>
                <div className="text-foreground">Резервуар {receipt.tank}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-0.5">Нефтебаза</div>
                <div className="text-foreground">
                  {receipt.base.name || `База ${receipt.base.id}`}
                </div>
              </div>
            </div>
          </div>

          {/* Сравнительная таблица */}
          <div className="bg-background rounded-lg p-3 border border-border">
            <h3 className="text-xs font-semibold text-foreground/80 mb-2">Данные поступления</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1.5 text-muted-foreground font-medium">Параметр</th>
                    <th className="text-right py-1.5 text-muted-foreground font-medium">Документ</th>
                    <th className="text-right py-1.5 text-muted-foreground font-medium">Факт</th>
                    <th className="text-right py-1.5 text-muted-foreground font-medium">Разница</th>
                    {confirmation?.status === 'corrected' && (
                      <th className="text-right py-1.5 text-amber-600 dark:text-amber-400 font-medium">Коррекция</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-1.5 text-foreground/80">Объем (л)</td>
                    <td className="text-right py-1.5 font-mono text-foreground">{parseFloat(receipt.doc.volume).toFixed(2)}</td>
                    <td className="text-right py-1.5 font-mono text-foreground">{parseFloat(receipt.fact.volume).toFixed(2)}</td>
                    <td className={cn('text-right py-1.5 font-mono', receipt.volumeDiff > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                      {receipt.volumeDiff > 0 ? '+' : ''}{receipt.volumeDiff.toFixed(2)}
                    </td>
                    {confirmation?.status === 'corrected' && (
                      <td className="text-right py-1.5 font-mono text-amber-600 dark:text-amber-400 font-semibold">
                        {confirmation.correctedVolume ? parseFloat(confirmation.correctedVolume).toFixed(2) : '—'}
                      </td>
                    )}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-1.5 text-foreground/80">Масса (кг)</td>
                    <td className="text-right py-1.5 font-mono text-foreground">{parseFloat(receipt.doc.amount).toFixed(2)}</td>
                    <td className="text-right py-1.5 font-mono text-foreground">{parseFloat(receipt.fact.amount).toFixed(2)}</td>
                    <td className={cn('text-right py-1.5 font-mono', receipt.amountDiff > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                      {receipt.amountDiff > 0 ? '+' : ''}{receipt.amountDiff.toFixed(2)}
                    </td>
                    {confirmation?.status === 'corrected' && (
                      <td className="text-right py-1.5 font-mono text-amber-600 dark:text-amber-400 font-semibold">
                        {confirmation.correctedAmount ? parseFloat(confirmation.correctedAmount).toFixed(2) : '—'}
                      </td>
                    )}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-1.5 text-foreground/80">Плотность</td>
                    <td className="text-right py-1.5 font-mono text-foreground">{receipt.doc.density.toFixed(3)}</td>
                    <td className="text-right py-1.5 font-mono text-foreground">{receipt.fact.density.toFixed(3)}</td>
                    <td className={cn('text-right py-1.5 font-mono', (receipt.fact.density - receipt.doc.density) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                      {(receipt.fact.density - receipt.doc.density) > 0 ? '+' : ''}
                      {(receipt.fact.density - receipt.doc.density).toFixed(3)}
                    </td>
                    {confirmation?.status === 'corrected' && (
                      <td className="text-right py-1.5 font-mono text-amber-600 dark:text-amber-400 font-semibold">
                        {confirmation.correctedDensity != null ? confirmation.correctedDensity.toFixed(3) : '—'}
                      </td>
                    )}
                  </tr>
                  <tr>
                    <td className="py-1.5 text-foreground/80">Температура (°C)</td>
                    <td className="text-right py-1.5 font-mono text-foreground">{receipt.doc.temp}</td>
                    <td className="text-right py-1.5 font-mono text-foreground">{receipt.fact.temp}</td>
                    <td className={cn('text-right py-1.5 font-mono', (receipt.fact.temp - receipt.doc.temp) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                      {(receipt.fact.temp - receipt.doc.temp) > 0 ? '+' : ''}
                      {receipt.fact.temp - receipt.doc.temp}
                    </td>
                    {confirmation?.status === 'corrected' && (
                      <td className="text-right py-1.5 font-mono text-amber-600 dark:text-amber-400 font-semibold">
                        {confirmation.correctedTemp != null ? confirmation.correctedTemp : '—'}
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Отклонения в процентах */}
          <div className="bg-background rounded-lg p-3 border border-border">
            <h3 className="text-xs font-semibold text-foreground/80 mb-2">Отклонения</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between p-2 bg-card rounded">
                <div className="text-xs text-muted-foreground">По объему</div>
                <Badge variant={getDeviationBadgeVariant(receipt.volumeDiffPercent)} className="text-xs">
                  {receipt.volumeDiffPercent > 0 ? '+' : ''}
                  {receipt.volumeDiffPercent.toFixed(2)}%
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-card rounded">
                <div className="text-xs text-muted-foreground">По массе</div>
                <Badge variant={getDeviationBadgeVariant(receipt.amountDiffPercent)} className="text-xs">
                  {receipt.amountDiffPercent > 0 ? '+' : ''}
                  {receipt.amountDiffPercent.toFixed(2)}%
                </Badge>
              </div>
            </div>
          </div>

          {/* ── Блок подтверждения менеджером ── */}
          {systemId && (
            <div className={cn(
              'rounded-lg p-3 border',
              confirmation ? statusBorderColor[confirmation.status] : 'border-border bg-background'
            )}>
              {confirmation && !correcting ? (
                /* Уже подтверждено — показываем статус */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {confirmation.status === 'confirmed' && <Check className="h-4 w-4 text-green-500" />}
                      {confirmation.status === 'corrected' && <Pencil className="h-4 w-4 text-amber-500" />}
                      {confirmation.status === 'rejected' && <XCircle className="h-4 w-4 text-red-500" />}
                      <span className={cn('text-sm font-medium', statusColor[confirmation.status])}>
                        {statusLabel[confirmation.status]}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDelete}
                      disabled={saving}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Undo2 className="h-3 w-3 mr-1" />
                      Отменить
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {confirmation.confirmedByName && (
                      <span>{confirmation.confirmedByName} • </span>
                    )}
                    {format(new Date(confirmation.updatedAt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                  </div>
                  {confirmation.comment && (
                    <div className="text-xs text-foreground/80 mt-1 bg-card/50 rounded p-2">
                      {confirmation.comment}
                    </div>
                  )}
                </div>
              ) : correcting ? (
                /* Режим коррекции — editable поля */
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-foreground/80">Корректировка данных</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground">Объем (л)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={corrVolume}
                        onChange={e => setCorrVolume(e.target.value)}
                        className="h-7 text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Масса (кг)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={corrAmount}
                        onChange={e => setCorrAmount(e.target.value)}
                        className="h-7 text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Плотность</label>
                      <Input
                        type="number"
                        step="0.001"
                        value={corrDensity}
                        onChange={e => setCorrDensity(e.target.value)}
                        className="h-7 text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Температура (°C)</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={corrTemp}
                        onChange={e => setCorrTemp(e.target.value)}
                        className="h-7 text-xs mt-0.5"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Комментарий</label>
                    <Textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Причина корректировки..."
                      className="text-xs mt-0.5 min-h-[48px]"
                    />
                  </div>
                  {error && <p className="text-xs text-red-500">{error}</p>}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleConfirm('corrected')}
                      disabled={saving}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      {saving ? 'Сохранение...' : 'Сохранить коррекцию'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetCorrectionForm}
                      disabled={saving}
                      className="text-xs"
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                /* Не подтверждено — кнопки действий */
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-foreground/80">Подтверждение менеджером</h3>
                  {rejecting ? (
                    /* Режим отклонения — запрос причины */
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground">Причина отклонения *</label>
                        <Textarea
                          value={comment}
                          onChange={e => { setComment(e.target.value); setError(null); }}
                          placeholder="Укажите причину отклонения..."
                          className="text-xs mt-0.5 min-h-[48px]"
                          autoFocus
                        />
                      </div>
                      {error && <p className="text-xs text-red-500">{error}</p>}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleConfirm('rejected')}
                          disabled={saving}
                          className="bg-red-600 hover:bg-red-700 text-white text-xs"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          {saving ? 'Сохранение...' : 'Отклонить'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setRejecting(false); setComment(''); setError(null); }}
                          disabled={saving}
                          className="text-xs"
                        >
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleConfirm('confirmed')}
                          disabled={saving}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          {saving ? 'Сохранение...' : 'Подтвердить'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={startCorrection}
                          disabled={saving}
                          className="border-amber-600 text-amber-600 hover:bg-amber-600 hover:text-white text-xs"
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Скорректировать
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRejecting(true)}
                          disabled={saving}
                          className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white text-xs"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Отклонить
                        </Button>
                      </div>
                      {error && <p className="text-xs text-red-500">{error}</p>}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
};
