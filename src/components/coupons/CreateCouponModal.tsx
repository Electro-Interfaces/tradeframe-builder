/**
 * Модальное окно создания купона
 * Поддерживает два режима: Рубли (сумма) и Литры (топливо + объём)
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNewAuth } from '@/contexts/NewAuthContext';
import { couponsApiService } from '@/services/couponsApiService';
import type { CreateCouponRequest, CouponCreateMode, CouponWithAge } from '@/types/coupons';

export interface FuelOption {
  code: number;
  label: string;
}

interface CreateCouponModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  systemId: number;
  stationId: number;
  fuelOptions: FuelOption[];
  networkName?: string;
  stationName?: string;
  onSuccess?: () => void;
  onCouponCreated?: (coupon: CouponWithAge) => void;
}

export function CreateCouponModal({
  isOpen,
  onOpenChange,
  systemId,
  stationId,
  fuelOptions,
  networkName,
  stationName,
  onSuccess,
  onCouponCreated,
}: CreateCouponModalProps) {
  const { toast } = useToast();
  const { user } = useNewAuth();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<CouponCreateMode>('liters');
  const [serviceCode, setServiceCode] = useState<string | undefined>(undefined);
  const [amount, setAmount] = useState<string>('');
  const [lifetime, setLifetime] = useState<string>('7');
  const [fiscal, setFiscal] = useState(false);
  const [comment, setComment] = useState<string>('');

  // Валидация
  const amountNum = parseFloat(amount);
  const lifetimeNum = parseInt(lifetime, 10);
  const isFuelSelected = serviceCode !== undefined && serviceCode !== '';
  const isAmountValid = !isNaN(amountNum) && amountNum > 0;
  const isLifetimeValid = !isNaN(lifetimeNum) && lifetimeNum >= 1;
  const isCommentValid = comment.trim().length > 0;

  const isFormValid = mode === 'liters'
    ? isFuelSelected && isAmountValid && isLifetimeValid && isCommentValid
    : isAmountValid && isLifetimeValid && isCommentValid;

  const selectedFuelLabel = fuelOptions.find(o => String(o.code) === serviceCode)?.label || '';

  const handleModeChange = (newMode: CouponCreateMode) => {
    setMode(newMode);
    // Сбрасываем специфичные для режима поля
    setServiceCode(undefined);
    setAmount('');
  };

  const resetForm = () => {
    setMode('liters');
    setServiceCode(undefined);
    setAmount('');
    setLifetime('7');
    setFiscal(false);
    setComment('');
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;

    setLoading(true);
    try {
      const authorName = user?.name || user?.email || 'Неизвестный';

      const request: CreateCouponRequest = {
        amount: amountNum,
        lifetime: lifetimeNum,
        fiscal,
        comment: comment.trim(),
        user_id: user?.id || undefined,
        user_name: authorName,
        ...(mode === 'liters' && { service_code: Number(serviceCode) }),
      };

      const result = await couponsApiService.createCoupon(systemId, stationId, request);
      const couponNumber = result?.number || '—';

      // Оптимистичное добавление — показываем купон сразу, не ждём STS API
      const fuelOption = fuelOptions.find(f => f.code === Number(serviceCode));
      const totalQty = mode === 'liters' ? amountNum : 0;
      // Цену не знаем — API вернёт точное значение позже
      const totalSum = mode === 'liters' ? 0 : amountNum;

      const optimisticCoupon: CouponWithAge = {
        number: couponNumber,
        dt: new Date().toISOString(),
        pos: stationId,
        shift: 0,
        opernum: 0,
        summ_total: totalSum,
        qty_total: totalQty,
        qty_used: 0,
        summ_used: 0,
        price: 0,
        service: {
          service_code: mode === 'liters' ? Number(serviceCode) : 0,
          service_name: mode === 'liters' ? (fuelOption?.label || '—') : 'Рубли',
        },
        state: { id: 0, name: 'Активный' },
        type: { id: 1, name: 'Вручную' },
        rest_summ: totalSum,
        rest_qty: totalQty,
        comment: comment.trim(),
        user: { id: user?.id || '', name: authorName },
        // Поля CouponWithAge
        ageInDays: 0,
        ageInHours: 0,
        isOld: false,
        isCritical: false,
        priority: 'normal',
        isActive: true,
        isRedeemed: false,
        isExpired: false,
        stationName: stationName || `ТТ ${stationId}`,
        stationCode: stationId,
        isOptimistic: true,
      };
      onCouponCreated?.(optimisticCoupon);

      const description = mode === 'liters'
        ? `${selectedFuelLabel} — ${amountNum} л, купон #${couponNumber}`
        : `${amountNum} ₽, купон #${couponNumber}`;

      toast({
        title: 'Купон создан',
        description,
      });

      resetForm();
      onOpenChange(false);
      // Обновляем данные из API — оптимистичные купоны сохранятся если API их ещё не вернул
      setTimeout(() => onSuccess?.(), 3000);
      setTimeout(() => onSuccess?.(), 10000);
    } catch (error: any) {
      toast({
        title: 'Ошибка создания купона',
        description: error?.message || 'Не удалось создать купон',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto bg-slate-800 border border-slate-600 text-white">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-white">
            Создать купон
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Сеть и станция */}
          <div className="bg-slate-700/50 rounded-lg px-3 py-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Сеть:</span>
              <span className="text-white font-medium">{networkName || `#${systemId}`}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Станция:</span>
              <span className="text-white font-medium">{stationName || `#${stationId}`}</span>
            </div>
          </div>

          {/* Переключатель режима: Литры / Рубли */}
          <div className="space-y-2">
            <Label className="text-slate-300">Тип купона</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === 'liters' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleModeChange('liters')}
                className={mode === 'liters'
                  ? 'flex-1 bg-blue-600 hover:bg-blue-700 text-white'
                  : 'flex-1 border-slate-600 text-slate-300 hover:bg-slate-700'
                }
              >
                ⛽ Литры
              </Button>
              <Button
                type="button"
                variant={mode === 'rubles' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleModeChange('rubles')}
                className={mode === 'rubles'
                  ? 'flex-1 bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'flex-1 border-slate-600 text-slate-300 hover:bg-slate-700'
                }
              >
                ₽ Рубли
              </Button>
            </div>
          </div>

          {/* Вид топлива — активно только в режиме Литры */}
          <div className="space-y-2">
            <Label className={mode === 'liters' ? 'text-slate-300' : 'text-slate-500'}>
              Вид топлива
            </Label>
            <Select
              value={serviceCode}
              onValueChange={setServiceCode}
              disabled={mode === 'rubles'}
            >
              <SelectTrigger className={`bg-slate-700 border-slate-600 ${
                mode === 'rubles' ? 'text-slate-500 opacity-50 cursor-not-allowed' : 'text-white'
              }`}>
                <SelectValue placeholder={mode === 'rubles' ? 'Не требуется' : 'Выберите топливо'} />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {fuelOptions.map((opt) => (
                  <SelectItem
                    key={opt.code}
                    value={String(opt.code)}
                    className="text-white hover:bg-slate-600"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400 h-4">
              {mode === 'liters' && !isFuelSelected ? 'Выберите конкретный вид топлива' : '\u00A0'}
            </p>
          </div>

          {/* Количество / Сумма */}
          <div className="space-y-2">
            <Label className="text-slate-300">
              {mode === 'liters' ? 'Объём (литры)' : 'Сумма (рубли)'}
            </Label>
            <Input
              type="number"
              min="0.1"
              step={mode === 'liters' ? '0.1' : '1'}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={mode === 'liters' ? 'Введите объём в литрах' : 'Введите сумму в рублях'}
              className="bg-slate-700 border-slate-600 text-white"
            />
            <p className="text-xs text-red-400 h-4">
              {amount && !isAmountValid
                ? (mode === 'liters' ? 'Объём должен быть больше 0' : 'Сумма должна быть больше 0')
                : '\u00A0'}
            </p>
          </div>

          {/* Срок действия */}
          <div className="space-y-2">
            <Label className="text-slate-300">Срок действия (дней)</Label>
            <Input
              type="number"
              min="1"
              value={lifetime}
              onChange={(e) => setLifetime(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
            {lifetime && !isLifetimeValid && (
              <p className="text-xs text-red-400">Минимум 1 день</p>
            )}
          </div>

          {/* Комментарий (обязательное поле) */}
          <div className="space-y-2">
            <Label className="text-slate-300">
              Комментарий <span className="text-red-400">*</span>
            </Label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Укажите причину выдачи купона"
              maxLength={200}
              rows={2}
              className="w-full rounded-md bg-slate-700 border border-slate-600 text-white text-sm px-3 py-2 placeholder:text-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-between">
              {!isCommentValid && comment.length === 0 && (
                <p className="text-xs text-slate-400">Обязательное поле</p>
              )}
              {comment.length > 0 && (
                <p className="text-xs text-slate-500 ml-auto">{comment.length}/200</p>
              )}
            </div>
          </div>

          {/* Фискальный чек */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300">Фискальный чек</Label>
              <Switch
                checked={fiscal}
                onCheckedChange={setFiscal}
                className="data-[state=unchecked]:bg-slate-500 data-[state=checked]:bg-emerald-600"
              />
            </div>
            {fiscal && (
              <div className="bg-amber-900/30 border border-amber-600/50 rounded-md p-2">
                <p className="text-xs text-amber-200">
                  ⚠️ С фискальным чеком операция будет отражена в налоговой отчетности
                </p>
              </div>
            )}
          </div>

          {/* Важное предупреждение */}
          <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2">
              <div className="text-red-400 mt-0.5">⚠️</div>
              <div className="text-xs text-red-200 space-y-1">
                <p className="font-semibold">Ответственная операция!</p>
                <p>Создание купона влияет на:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>Товарный учет топлива</li>
                  <li>Финансовую отчетность</li>
                  <li>Баланс станции</li>
                </ul>
                <p className="mt-1">Комментарий обязателен для аудита операций</p>
              </div>
            </div>
          </div>

          {/* Автор */}
          <div className="flex items-center justify-between py-2 border-t border-slate-700">
            <span className="text-xs text-slate-400">Автор:</span>
            <span className="text-xs text-slate-300">{user?.name || user?.email || '—'}</span>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Создание...
              </>
            ) : (
              'Создать'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
