/**
 * Купюроприемник — Deep Intel v3
 * Asymmetric 8/4 layout: capacity panel + activity timeline
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Banknote, CheckCircle2, AlertCircle, AlertTriangle, Settings, Loader2, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect, lazy, Suspense } from 'react';
import type { TerminalEquipmentItem, CashoutRecord } from '@/types/equipment';
import type { BillAcceptorThresholds } from '@/types/tradingpoint';
import { checkBillAcceptorThresholds } from '@/utils/billAcceptorThresholds';

const CashoutHistoryDialog = lazy(() => import('./CashoutHistoryDialog').then(m => ({ default: m.CashoutHistoryDialog })));

interface BillAcceptorCardProps {
  billAcceptor: TerminalEquipmentItem;
  isMobile: boolean;
  thresholds?: BillAcceptorThresholds;
  onSaveThresholds?: (thresholds: BillAcceptorThresholds) => Promise<void>;
  cashoutRecords?: CashoutRecord[];
  cashoutLoading?: boolean;
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

  const thresholdStatus = checkBillAcceptorThresholds(
    billAcceptor.billCount || 0,
    billAcceptor.billAmount || 0,
    thresholds
  );

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
      await onSaveThresholds({
        billCountWarning: thresholdForm.billCountWarning ? Number(thresholdForm.billCountWarning) : undefined,
        billCountCritical: thresholdForm.billCountCritical ? Number(thresholdForm.billCountCritical) : undefined,
        cashAmountWarning: thresholdForm.cashAmountWarning ? Number(thresholdForm.cashAmountWarning) : undefined,
        cashAmountCritical: thresholdForm.cashAmountCritical ? Number(thresholdForm.cashAmountCritical) : undefined,
      });
    } catch (error) {
      console.error('Ошибка сохранения порогов:', error);
    } finally {
      setSaving(false);
    }
  };

  const billCount = billAcceptor.billCount || 0;
  const billAmount = billAcceptor.billAmount || 0;
  const maxCapacity = thresholds?.billCountCritical || 1000;
  const fillPercent = Math.min((billCount / maxCapacity) * 100, 100);
  const avgNote = billCount > 0 ? billAmount / billCount : 0;

  // ─── Mobile view ───
  if (isMobile) {
    return (
      <div className="bg-di-surface-mid rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-emerald-500/10 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-di-on-surface text-base">{billAcceptor.name}</h3>
              <p className="text-[10px] text-di-on-surface-variant">{billAcceptor.location || 'Устройство'}</p>
            </div>
          </div>
          {billAcceptor.status === 'online' ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-di-surface-low p-3 rounded-xl">
            <p className="text-[10px] font-bold text-di-outline uppercase mb-1">Купюр</p>
            <p className="font-headline text-xl font-bold text-di-on-surface">{billCount}</p>
          </div>
          <div className="bg-di-surface-low p-3 rounded-xl">
            <p className="text-[10px] font-bold text-di-outline uppercase mb-1">Сумма</p>
            <p className="font-headline text-xl font-bold text-di-on-surface">{billAmount.toLocaleString('ru-RU')}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Suspense fallback={null}>
            <CashoutHistoryDialog cashoutRecords={cashoutRecords} loading={cashoutLoading} isMobile={isMobile} />
          </Suspense>
          <Button size="sm" variant="outline" onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
            className="flex-1 border-di-outline-variant/30 text-di-on-surface-variant hover:bg-di-surface">
            <Settings className="w-4 h-4" />
            {isSettingsExpanded ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
          </Button>
        </div>

        {isSettingsExpanded && (
          <div className="space-y-3 border-t border-di-outline-variant/15 pt-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-di-outline uppercase">⚠ Порог купюр</Label>
                <Input type="number" min="0" value={thresholdForm.billCountWarning}
                  onChange={(e) => setThresholdForm(prev => ({ ...prev, billCountWarning: e.target.value }))}
                  className="bg-di-surface-lowest border-di-outline-variant/20 text-di-on-surface h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-[10px] text-di-outline uppercase">🔴 Крит. купюр</Label>
                <Input type="number" min="0" value={thresholdForm.billCountCritical}
                  onChange={(e) => setThresholdForm(prev => ({ ...prev, billCountCritical: e.target.value }))}
                  className="bg-di-surface-lowest border-di-outline-variant/20 text-di-on-surface h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-[10px] text-di-outline uppercase">⚠ Порог сумма</Label>
                <Input type="number" min="0" value={thresholdForm.cashAmountWarning}
                  onChange={(e) => setThresholdForm(prev => ({ ...prev, cashAmountWarning: e.target.value }))}
                  className="bg-di-surface-lowest border-di-outline-variant/20 text-di-on-surface h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-[10px] text-di-outline uppercase">🔴 Крит. сумма</Label>
                <Input type="number" min="0" value={thresholdForm.cashAmountCritical}
                  onChange={(e) => setThresholdForm(prev => ({ ...prev, cashAmountCritical: e.target.value }))}
                  className="bg-di-surface-lowest border-di-outline-variant/20 text-di-on-surface h-8 text-sm mt-1" />
              </div>
            </div>
            <Button size="sm" onClick={handleSave} disabled={saving || !onSaveThresholds}
              className="w-full bg-di-primary hover:opacity-90 text-white">
              {saving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Сохранение...</> : <><Save className="w-4 h-4 mr-1.5" />Сохранить</>}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ─── Desktop view — Asymmetric 8/4 layout ───
  return (
    <div className="grid grid-cols-12 gap-8">
      {/* ── Left: Capacity Panel (8 cols) ── */}
      <div className="col-span-8 bg-di-surface-mid rounded-xl p-5 relative overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center mb-5 border-b border-di-outline-variant/10 pb-3 relative z-10">
          <div>
            <h2 className="font-headline text-xl font-extrabold text-di-on-surface tracking-tight">
              {billAcceptor.name}
            </h2>
            <p className="text-xs text-di-on-surface-variant font-medium">
              {billAcceptor.location || 'Устройство Купюроприемник'} · {billAcceptor.code}
            </p>
          </div>
          <div className="flex gap-2">
            <Suspense fallback={null}>
              <CashoutHistoryDialog cashoutRecords={cashoutRecords} loading={cashoutLoading} isMobile={false} />
            </Suspense>
            <Button size="sm" variant="outline" onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
              className="border-di-outline-variant/20 text-di-on-surface-variant hover:bg-di-surface text-xs">
              <Settings className="w-4 h-4 mr-1.5" />
              {isSettingsExpanded ? 'Скрыть' : 'Пороги'}
              {isSettingsExpanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </div>

        {/* Warning banner */}
        {thresholdStatus.message && (
          <div className={`mb-6 p-3 rounded-lg border-l-4 ${
            thresholdStatus.level === 'critical' ? 'border-red-500 bg-red-500/5' : 'border-di-tertiary-container bg-di-tertiary-container/5'
          }`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${thresholdStatus.level === 'critical' ? 'text-red-400' : 'text-di-tertiary'}`} />
              <p className={`text-sm ${thresholdStatus.level === 'critical' ? 'text-red-300' : 'text-di-tertiary'}`}>
                {thresholdStatus.message}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 relative z-10">
          {/* Capacity & Progress */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-bold text-di-on-surface-variant uppercase tracking-widest">Заполнение</span>
              <span className="font-headline text-2xl font-bold text-di-on-surface">{fillPercent.toFixed(1)}%</span>
            </div>
            <div className="w-full h-3 bg-di-surface-lowest rounded-full overflow-hidden mb-2">
              <div className="h-full bg-di-primary relative" style={{ width: `${fillPercent}%` }}>
                <div className="absolute inset-0 bg-white/10 opacity-50" />
              </div>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-di-outline uppercase">
              <span>{billCount} купюр</span>
              <span>{maxCapacity} макс.</span>
            </div>

            <div className="mt-5">
              <h3 className="text-[10px] font-bold text-di-outline uppercase tracking-widest mb-2">Финансовая сводка</h3>
              <div className="flex items-baseline gap-2">
                <span className="font-headline text-4xl font-black text-di-on-surface tracking-tighter">
                  {billAmount.toLocaleString('ru-RU')}
                </span>
                <span className="text-di-primary-light font-bold">₽</span>
              </div>
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-di-surface-low p-3 rounded-xl">
              <p className="text-[10px] font-bold text-di-outline uppercase mb-0.5">Средн. номинал</p>
              <p className="font-headline text-xl font-bold text-di-on-surface tracking-tight">{avgNote.toFixed(0)}</p>
            </div>
            <div className="bg-di-surface-low p-3 rounded-xl">
              <p className="text-[10px] font-bold text-di-outline uppercase mb-0.5">Статус</p>
              <p className="font-headline text-xl font-bold text-di-on-surface tracking-tight">
                {billAcceptor.status === 'online' ? '✓' : '✗'}
              </p>
              <div className={`flex items-center gap-1 text-[10px] font-bold ${
                billAcceptor.status === 'online' ? 'text-green-500' : 'text-red-400'
              }`}>
                {billAcceptor.status === 'online' ? 'Nominal' : 'Offline'}
              </div>
            </div>
            <div className="bg-di-surface-low p-3 rounded-xl">
              <p className="text-[10px] font-bold text-di-outline uppercase mb-0.5">Порог ⚠</p>
              <p className="font-headline text-xl font-bold text-di-on-surface tracking-tight">
                {thresholds?.billCountWarning || '—'}
              </p>
            </div>
            <div className="bg-di-surface-low p-3 rounded-xl">
              <p className="text-[10px] font-bold text-di-outline uppercase mb-0.5">Порог 🔴</p>
              <p className="font-headline text-xl font-bold text-di-on-surface tracking-tight">
                {thresholds?.billCountCritical || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Settings panel */}
        {isSettingsExpanded && (
          <div className="mt-6 pt-6 border-t border-di-outline-variant/10 relative z-10">
            <h3 className="text-[10px] font-bold text-di-outline uppercase tracking-widest mb-4">Настройка порогов</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label className="text-[10px] text-di-outline uppercase">⚠ Купюр</Label>
                <Input type="number" min="0" value={thresholdForm.billCountWarning}
                  onChange={(e) => setThresholdForm(prev => ({ ...prev, billCountWarning: e.target.value }))}
                  className="bg-di-surface-lowest border-di-outline-variant/20 text-di-on-surface h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-[10px] text-di-outline uppercase">🔴 Купюр</Label>
                <Input type="number" min="0" value={thresholdForm.billCountCritical}
                  onChange={(e) => setThresholdForm(prev => ({ ...prev, billCountCritical: e.target.value }))}
                  className="bg-di-surface-lowest border-di-outline-variant/20 text-di-on-surface h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-[10px] text-di-outline uppercase">⚠ Сумма</Label>
                <Input type="number" min="0" value={thresholdForm.cashAmountWarning}
                  onChange={(e) => setThresholdForm(prev => ({ ...prev, cashAmountWarning: e.target.value }))}
                  className="bg-di-surface-lowest border-di-outline-variant/20 text-di-on-surface h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-[10px] text-di-outline uppercase">🔴 Сумма</Label>
                <Input type="number" min="0" value={thresholdForm.cashAmountCritical}
                  onChange={(e) => setThresholdForm(prev => ({ ...prev, cashAmountCritical: e.target.value }))}
                  className="bg-di-surface-lowest border-di-outline-variant/20 text-di-on-surface h-8 text-sm mt-1" />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button size="sm" onClick={handleSave} disabled={saving || !onSaveThresholds}
                className="bg-di-primary hover:opacity-90 text-white text-xs">
                {saving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Сохранение...</> : <><Save className="w-4 h-4 mr-1.5" />Сохранить</>}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Recent Activity (4 cols) ── */}
      <div className="col-span-4 bg-di-surface-mid rounded-xl p-5 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline text-base font-bold text-di-on-surface">Последние события</h2>
          <Suspense fallback={null}>
            <CashoutHistoryDialog cashoutRecords={cashoutRecords} loading={cashoutLoading} isMobile={false} />
          </Suspense>
        </div>

        <div className="flex-1 flex flex-col gap-4 relative">
          {/* Timeline line */}
          <div className="absolute left-3 top-2 bottom-2 w-[1px] bg-di-outline-variant/20" />

          {cashoutRecords.length > 0 ? (
            cashoutRecords.slice(-3).reverse().map((record, i) => (
              <div key={i} className="relative pl-10">
                <div className={`absolute left-1.5 top-1 w-3 h-3 rounded-full ${
                  i === 0 ? 'bg-di-primary ring-4 ring-di-primary/20' : 'bg-green-500'
                }`} />
                <p className="text-xs font-bold text-di-on-surface">
                  Инкассация #{record.cashoutno}
                </p>
                <p className="text-[10px] text-di-on-surface-variant mb-1">
                  Смена {record.shift}, пост {record.pos} · {record.billsum.toLocaleString('ru-RU')} ₽
                </p>
                <span className="text-[10px] font-medium text-di-outline">
                  {new Date(record.dt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          ) : (
            <div className="relative pl-10">
              <div className="absolute left-1.5 top-1 w-3 h-3 rounded-full bg-di-outline-variant" />
              <p className="text-xs text-di-on-surface-variant">Нет данных об инкассации</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
