/**
 * Компонент карточки купюроприемника
 * Отображает детальную информацию о купюроприемнике с количеством купюр и суммой
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Banknote, CheckCircle2, AlertCircle, AlertTriangle, Settings, Loader2, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { TerminalEquipmentItem } from '@/types/equipment';
import type { BillAcceptorThresholds } from '@/types/tradingpoint';
import {
  checkBillAcceptorThresholds,
  getThresholdColor,
  getThresholdBgColor,
  getThresholdBorderColor
} from '@/utils/billAcceptorThresholds';

interface BillAcceptorCardProps {
  billAcceptor: TerminalEquipmentItem;
  isMobile: boolean;
  thresholds?: BillAcceptorThresholds;
  onSaveThresholds?: (thresholds: BillAcceptorThresholds) => Promise<void>;
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
      return <AlertCircle className={`${className} text-gray-500`} />;
  }
}

export function BillAcceptorCard({ billAcceptor, isMobile, thresholds, onSaveThresholds }: BillAcceptorCardProps) {
  const [saving, setSaving] = useState(false);
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

  // Получаем цвета для индикаторов
  const borderColor = getThresholdBorderColor(thresholdStatus.level);
  const bgColor = getThresholdBgColor(thresholdStatus.level);

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
      className={`rounded-lg ${isMobile ? 'p-4' : 'p-6'} border-2 ${borderColor} ${bgColor} hover:border-slate-500 transition-colors`}
    >
      <div className={`flex ${isMobile ? 'flex-col gap-4' : 'items-center justify-between'}`}>
        {/* Название и ID */}
        <div className="flex items-center gap-3">
          <Banknote className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-green-400`} />
          <div>
            <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-white`}>
              {billAcceptor.name}
            </h3>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-400`}>
              {billAcceptor.location}
            </p>
          </div>
        </div>

        {/* Данные и статус */}
        <div className={`flex items-center ${isMobile ? 'justify-between' : 'gap-8'}`}>
          {/* Количество купюр */}
          <div className="text-center">
            <div className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold ${thresholdStatus.billCountExceeded ? getThresholdColor(thresholdStatus.level) : 'text-green-400'}`}>
              {billAcceptor.billCount || 0}
            </div>
            <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-300`}>купюр</div>
          </div>

          {/* Сумма */}
          <div className="text-center">
            <div className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold ${thresholdStatus.cashAmountExceeded ? getThresholdColor(thresholdStatus.level) : 'text-blue-400'}`}>
              {(billAcceptor.billAmount || 0).toLocaleString()}
            </div>
            <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-300`}>₽</div>
          </div>

          {/* Статус */}
          <div className="flex flex-col items-center gap-2">
            {getStatusIcon(billAcceptor.status, isMobile ? 'w-4 h-4' : 'w-5 h-5')}
            <Badge
              className={`${
                billAcceptor.status === 'online'
                  ? `bg-green-600 text-white hover:bg-green-700 ${isMobile ? 'text-xs px-2 py-1' : 'text-base px-3 py-1'} font-semibold`
                  : `bg-red-600 text-white hover:bg-red-700 ${isMobile ? 'text-xs px-2 py-1' : 'text-base px-3 py-1'} font-semibold`
              }`}
            >
              {billAcceptor.statusText}
            </Badge>
          </div>
        </div>
      </div>

      {/* Предупреждающее сообщение */}
      {thresholdStatus.message && (
        <div className={`mt-4 p-3 rounded-lg border-l-4 ${
          thresholdStatus.level === 'critical'
            ? 'bg-red-900/20 border-red-500'
            : 'bg-yellow-900/20 border-yellow-500'
        }`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
              thresholdStatus.level === 'critical' ? 'text-red-500' : 'text-yellow-500'
            }`} />
            <p className={`text-sm ${
              thresholdStatus.level === 'critical' ? 'text-red-200' : 'text-yellow-200'
            }`}>
              {thresholdStatus.message}
            </p>
          </div>
        </div>
      )}

      {/* Настройка порогов в одну строку */}
      <div className="mt-4 border-t border-slate-600 pt-3">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <Settings className="w-3.5 h-3.5" />
          <span>Настройка порогов</span>
        </div>

        {/* Inline форма в одну строку */}
        <div className="grid grid-cols-5 gap-2 items-end">
          {/* Купюры: Предупреждение */}
          <div>
            <Label htmlFor="billCountWarning" className="text-xs text-slate-400 block mb-1">
              Купюр ⚠️
            </Label>
            <Input
              id="billCountWarning"
              type="number"
              min="0"
              placeholder="100"
              value={thresholdForm.billCountWarning}
              onChange={(e) => setThresholdForm(prev => ({ ...prev, billCountWarning: e.target.value }))}
              className="bg-slate-800 border-slate-600 text-white h-8 text-sm"
            />
          </div>

          {/* Купюры: Критический */}
          <div>
            <Label htmlFor="billCountCritical" className="text-xs text-slate-400 block mb-1">
              Купюр 🔴
            </Label>
            <Input
              id="billCountCritical"
              type="number"
              min="0"
              placeholder="150"
              value={thresholdForm.billCountCritical}
              onChange={(e) => setThresholdForm(prev => ({ ...prev, billCountCritical: e.target.value }))}
              className="bg-slate-800 border-slate-600 text-white h-8 text-sm"
            />
          </div>

          {/* Сумма: Предупреждение */}
          <div>
            <Label htmlFor="cashAmountWarning" className="text-xs text-slate-400 block mb-1">
              Сумма ⚠️
            </Label>
            <Input
              id="cashAmountWarning"
              type="number"
              min="0"
              placeholder="50000"
              value={thresholdForm.cashAmountWarning}
              onChange={(e) => setThresholdForm(prev => ({ ...prev, cashAmountWarning: e.target.value }))}
              className="bg-slate-800 border-slate-600 text-white h-8 text-sm"
            />
          </div>

          {/* Сумма: Критический */}
          <div>
            <Label htmlFor="cashAmountCritical" className="text-xs text-slate-400 block mb-1">
              Сумма 🔴
            </Label>
            <Input
              id="cashAmountCritical"
              type="number"
              min="0"
              placeholder="100000"
              value={thresholdForm.cashAmountCritical}
              onChange={(e) => setThresholdForm(prev => ({ ...prev, cashAmountCritical: e.target.value }))}
              className="bg-slate-800 border-slate-600 text-white h-8 text-sm"
            />
          </div>

          {/* Кнопка сохранения */}
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
      </div>
    </div>
  );
}
