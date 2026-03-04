/**
 * Компонент карточки купюроприемника
 * Отображает детальную информацию о купюроприемнике с количеством купюр и суммой
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Banknote, CheckCircle2, AlertCircle, AlertTriangle, Settings, Loader2, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect, lazy, Suspense } from 'react';
import type { TerminalEquipmentItem, CashoutRecord } from '@/types/equipment';
import type { BillAcceptorThresholds } from '@/types/tradingpoint';
import {
  checkBillAcceptorThresholds
} from '@/utils/billAcceptorThresholds';

const CashoutHistoryDialog = lazy(() => import('./CashoutHistoryDialog').then(m => ({ default: m.CashoutHistoryDialog })));

interface BillAcceptorCardProps {
  billAcceptor: TerminalEquipmentItem;
  isMobile: boolean;
  thresholds?: BillAcceptorThresholds;
  onSaveThresholds?: (thresholds: BillAcceptorThresholds) => Promise<void>;
  cashoutRecords?: CashoutRecord[];
  cashoutLoading?: boolean;
}

/**
 * Получить иконку статуса
 */
function getStatusIcon(status: string, className: string = 'w-5 h-5') {
  switch (status) {
    case 'online':
      return <CheckCircle2 className={`${className} text-green-500`} />;
    case 'offline':
    case 'error':
      return <AlertCircle className={`${className} text-red-500`} />;
    default:
      return <AlertCircle className={`${className} text-muted-foreground`} />;
  }
}

export function BillAcceptorCard({ billAcceptor, isMobile, thresholds, onSaveThresholds, cashoutRecords = [], cashoutLoading = false }: BillAcceptorCardProps) {
  const [saving, setSaving] = useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [thresholdForm, setThresholdForm] = useState({
    billCountWarning: thresholds?.billCountWarning?.toString() || '',
    billCountCritical: thresholds?.billCountCritical?.toString() || '',
    cashAmountWarning: thresholds?.cashAmountWarning?.toString() || '',
    cashAmountCritical: thresholds?.cashAmountCritical?.toString() || '',
  });

  // Проверяем пороговые значения
  const thresholdStatus = checkBillAcceptorThresholds(
    billAcceptor.billCount || 0,
    billAcceptor.billAmount || 0,
    thresholds
  );

  // Синхронизация формы с thresholds при изменении
  useEffect(() => {
    setThresholdForm({
      billCountWarning: thresholds?.billCountWarning?.toString() || '',
      billCountCritical: thresholds?.billCountCritical?.toString() || '',
      cashAmountWarning: thresholds?.cashAmountWarning?.toString() || '',
      cashAmountCritical: thresholds?.cashAmountCritical?.toString() || '',
    });
  }, [thresholds]);

  const handleSave = async () => {
    if (!onSaveThresholds) return;

    setSaving(true);
    try {
      const newThresholds = {
        billCountWarning: thresholdForm.billCountWarning ? Number(thresholdForm.billCountWarning) : undefined,
        billCountCritical: thresholdForm.billCountCritical ? Number(thresholdForm.billCountCritical) : undefined,
        cashAmountWarning: thresholdForm.cashAmountWarning ? Number(thresholdForm.cashAmountWarning) : undefined,
        cashAmountCritical: thresholdForm.cashAmountCritical ? Number(thresholdForm.cashAmountCritical) : undefined,
      };

      await onSaveThresholds(newThresholds);
    } catch (error) {
      console.error('Ошибка сохранения порогов:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`rounded-lg ${isMobile ? 'p-4' : 'p-6'} border-2 border-border bg-card/50 hover:border-border transition-colors`}
    >
      {/* Заголовок */}
      <div className={`${isMobile ? 'space-y-3 mb-3' : 'flex items-center justify-between mb-4'}`}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Banknote className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-green-600 dark:text-green-400 flex-shrink-0`} />
          <div className="flex-1 min-w-0">
            <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-foreground truncate`}>
              {billAcceptor.name}
            </h3>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground truncate`}>
              {billAcceptor.location}
            </p>
          </div>
          {/* Статус на мобильных рядом с заголовком */}
          {isMobile && (
            <div className="flex items-center gap-2">
              {getStatusIcon(billAcceptor.status, 'w-4 h-4')}
              <Badge
                className={`${
                  billAcceptor.status === 'online'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 text-xs px-2 py-0.5'
                    : 'bg-red-600 text-white hover:bg-red-700 text-xs px-2 py-0.5'
                }`}
              >
                {billAcceptor.statusText}
              </Badge>
            </div>
          )}
        </div>

        {/* Статус и настройки для десктопа */}
        {!isMobile && (
          <div className="flex items-center gap-4">
            {getStatusIcon(billAcceptor.status, 'w-5 h-5')}
            <Badge
              className={`${
                billAcceptor.status === 'online'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 text-sm px-3 py-1'
                  : 'bg-red-600 text-white hover:bg-red-700 text-sm px-3 py-1'
              }`}
            >
              {billAcceptor.statusText}
            </Badge>

            {/* Кнопка журнала инкассации */}
            <Suspense fallback={null}>
              <CashoutHistoryDialog
                cashoutRecords={cashoutRecords}
                loading={cashoutLoading}
                isMobile={isMobile}
              />
            </Suspense>

            {/* Кнопка настройки порогов */}
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setIsSettingsExpanded(!isSettingsExpanded);
              }}
              className="border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4 mr-1.5" />
              <span>{isSettingsExpanded ? 'Скрыть настройки' : 'Настроить пороги'}</span>
              {isSettingsExpanded ? (
                <ChevronUp className="w-4 h-4 ml-1.5" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-1.5" />
              )}
            </Button>
          </div>
        )}

        {/* Кнопки для мобильных - отдельная строка */}
        {isMobile && (
          <div className="flex gap-2">
            {/* Кнопка журнала инкассации */}
            <Suspense fallback={null}>
              <CashoutHistoryDialog
                cashoutRecords={cashoutRecords}
                loading={cashoutLoading}
                isMobile={isMobile}
              />
            </Suspense>

            {/* Кнопка настройки порогов */}
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setIsSettingsExpanded(!isSettingsExpanded);
              }}
              className="flex-1 border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4" />
              {isSettingsExpanded ? (
                <ChevronUp className="w-4 h-4 ml-2" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-2" />
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Предупреждающее сообщение */}
      {thresholdStatus.message && (
        <div className={`mb-4 p-3 rounded-lg border-l-4 ${
          thresholdStatus.level === 'critical'
            ? 'bg-red-100 dark:bg-red-900/20 border-red-500'
            : 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-500'
        }`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
              thresholdStatus.level === 'critical' ? 'text-red-500' : 'text-yellow-500'
            }`} />
            <p className={`text-sm ${
              thresholdStatus.level === 'critical' ? 'text-red-700 dark:text-red-200' : 'text-yellow-700 dark:text-yellow-200'
            }`}>
              {thresholdStatus.message}
            </p>
          </div>
        </div>
      )}

      {/* Данные купюроприемника */}
      {isMobile ? (
        // Мобильный вид - карточки
        <div className="space-y-4">
          {/* Текущие показатели */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/50 p-3 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Купюр (шт)</div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{billAcceptor.billCount || 0}</div>
            </div>
            <div className="bg-secondary/50 p-3 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Сумма (₽)</div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{(billAcceptor.billAmount || 0).toLocaleString()}</div>
            </div>
          </div>

          {/* Пороговые значения */}
          {isSettingsExpanded && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="text-sm font-medium text-foreground/80 mb-3">Пороговые значения</div>

              {/* Пороги по количеству купюр */}
              <div className="bg-secondary/30 p-3 rounded-lg space-y-2">
                <div className="text-xs font-medium text-muted-foreground mb-2">Количество купюр</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">⚠️ Предупреждение</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="100"
                      value={thresholdForm.billCountWarning}
                      onChange={(e) => setThresholdForm(prev => ({ ...prev, billCountWarning: e.target.value }))}
                      className="bg-card border-border text-foreground h-10 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">🔴 Критично</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="150"
                      value={thresholdForm.billCountCritical}
                      onChange={(e) => setThresholdForm(prev => ({ ...prev, billCountCritical: e.target.value }))}
                      className="bg-card border-border text-foreground h-10 text-sm mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Пороги по сумме */}
              <div className="bg-secondary/30 p-3 rounded-lg space-y-2">
                <div className="text-xs font-medium text-muted-foreground mb-2">Сумма (₽)</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">⚠️ Предупреждение</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="50000"
                      value={thresholdForm.cashAmountWarning}
                      onChange={(e) => setThresholdForm(prev => ({ ...prev, cashAmountWarning: e.target.value }))}
                      className="bg-card border-border text-foreground h-10 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">🔴 Критично</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="100000"
                      value={thresholdForm.cashAmountCritical}
                      onChange={(e) => setThresholdForm(prev => ({ ...prev, cashAmountCritical: e.target.value }))}
                      className="bg-card border-border text-foreground h-10 text-sm mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Текущие пороги (когда настройки скрыты) */}
          {!isSettingsExpanded && thresholds && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Пороги купюр</div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-yellow-500">⚠️</span>
                  <span className="text-foreground">{thresholds.billCountWarning || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-red-500">🔴</span>
                  <span className="text-foreground">{thresholds.billCountCritical || '—'}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Пороги суммы</div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-yellow-500">⚠️</span>
                  <span className="text-foreground">{thresholds.cashAmountWarning?.toLocaleString() || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-red-500">🔴</span>
                  <span className="text-foreground">{thresholds.cashAmountCritical?.toLocaleString() || '—'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Desktop вид - таблица
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left pb-2 px-2 text-foreground/80 font-medium">Устройство</th>
                <th className="text-center pb-2 px-2 text-foreground/80 font-medium">Купюр (шт)</th>
                <th className="text-center pb-2 px-2 text-foreground/80 font-medium">Сумма (₽)</th>
                <th className="text-center pb-2 px-2 text-foreground/80 font-medium">Порог ⚠️ купюр</th>
                <th className="text-center pb-2 px-2 text-foreground/80 font-medium">Порог 🔴 купюр</th>
                <th className="text-center pb-2 px-2 text-foreground/80 font-medium">Порог ⚠️ сумма</th>
                <th className="text-center pb-2 px-2 text-foreground/80 font-medium">Порог 🔴 сумма</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border hover:bg-secondary/30">
                <td className="py-2 px-2">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-foreground font-medium">{billAcceptor.name}</span>
                  </div>
                </td>
                <td className="py-2 px-2 text-center">
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {billAcceptor.billCount || 0}
                  </span>
                </td>
                <td className="py-2 px-2 text-center">
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {(billAcceptor.billAmount || 0).toLocaleString()}
                  </span>
                </td>
                <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                  {isSettingsExpanded ? (
                    <Input
                      type="number"
                      min="0"
                      placeholder="100"
                      value={thresholdForm.billCountWarning}
                      onChange={(e) => setThresholdForm(prev => ({ ...prev, billCountWarning: e.target.value }))}
                      onFocus={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-card border-border text-foreground h-7 text-sm w-20 text-center"
                    />
                  ) : (
                    <span className="text-foreground font-medium">{thresholds?.billCountWarning || '—'}</span>
                  )}
                </td>
                <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                  {isSettingsExpanded ? (
                    <Input
                      type="number"
                      min="0"
                      placeholder="150"
                      value={thresholdForm.billCountCritical}
                      onChange={(e) => setThresholdForm(prev => ({ ...prev, billCountCritical: e.target.value }))}
                      onFocus={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-card border-border text-foreground h-7 text-sm w-20 text-center"
                    />
                  ) : (
                    <span className="text-foreground font-medium">{thresholds?.billCountCritical || '—'}</span>
                  )}
                </td>
                <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                  {isSettingsExpanded ? (
                    <Input
                      type="number"
                      min="0"
                      placeholder="50000"
                      value={thresholdForm.cashAmountWarning}
                      onChange={(e) => setThresholdForm(prev => ({ ...prev, cashAmountWarning: e.target.value }))}
                      onFocus={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-card border-border text-foreground h-7 text-sm w-24 text-center"
                    />
                  ) : (
                    <span className="text-foreground font-medium">{thresholds?.cashAmountWarning?.toLocaleString() || '—'}</span>
                  )}
                </td>
                <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                  {isSettingsExpanded ? (
                    <Input
                      type="number"
                      min="0"
                      placeholder="100000"
                      value={thresholdForm.cashAmountCritical}
                      onChange={(e) => setThresholdForm(prev => ({ ...prev, cashAmountCritical: e.target.value }))}
                      onFocus={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-card border-border text-foreground h-7 text-sm w-24 text-center"
                    />
                  ) : (
                    <span className="text-foreground font-medium">{thresholds?.cashAmountCritical?.toLocaleString() || '—'}</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Кнопка сохранения */}
      {isSettingsExpanded && (
        <div className="mt-4 flex justify-end border-t border-border pt-3">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !onSaveThresholds}
            className="bg-blue-600 hover:bg-blue-700 text-white h-8"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1.5" />
                Сохранить
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
