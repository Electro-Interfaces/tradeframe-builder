/**
 * Модальное окно создания купона
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
import type { CreateCouponRequest } from '@/types/coupons';

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
}: CreateCouponModalProps) {
  const { toast } = useToast();
  const { user } = useNewAuth();
  const [loading, setLoading] = useState(false);
  const [serviceCode, setServiceCode] = useState<string | undefined>(undefined);
  const [volume, setVolume] = useState<string>('');
  const [lifetime, setLifetime] = useState<string>('7');
  const [fiscal, setFiscal] = useState(false);

  // Валидация
  const volumeNum = parseFloat(volume);
  const lifetimeNum = parseInt(lifetime, 10);
  const isFuelSelected = serviceCode !== undefined && serviceCode !== '';
  const isVolumeValid = !isNaN(volumeNum) && volumeNum > 0;
  const isLifetimeValid = !isNaN(lifetimeNum) && lifetimeNum >= 1;
  const isFormValid = isFuelSelected && isVolumeValid && isLifetimeValid;

  const selectedFuelLabel = fuelOptions.find(o => String(o.code) === serviceCode)?.label || '';

  const handleSubmit = async () => {
    if (!isFormValid) return;

    setLoading(true);
    try {
      const authorName = user?.name || user?.email || 'Неизвестный';

      const request: CreateCouponRequest = {
        service_code: Number(serviceCode),
        amount: volumeNum,
        lifetime: lifetimeNum,
        fiscal,
        author: authorName,
      };

      await couponsApiService.createCoupon(systemId, stationId, request);

      toast({
        title: 'Купон создан',
        description: `${selectedFuelLabel} — ${volumeNum} л, автор: ${authorName}`,
      });

      // Сбрасываем форму
      setServiceCode(undefined);
      setVolume('');
      setLifetime('7');
      setFiscal(false);

      onOpenChange(false);
      // Задержка перед обновлением списка — API может не сразу вернуть новый купон
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
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

          {/* Вид топлива */}
          <div className="space-y-2">
            <Label className="text-slate-300">Вид топлива</Label>
            <Select value={serviceCode} onValueChange={setServiceCode}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Выберите топливо" />
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
            {!isFuelSelected && (
              <p className="text-xs text-slate-400">Выберите конкретный вид топлива</p>
            )}
          </div>

          {/* Объём в литрах */}
          <div className="space-y-2">
            <Label className="text-slate-300">Объём (литры)</Label>
            <Input
              type="number"
              min="0.1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              placeholder="Введите объём в литрах"
              className="bg-slate-700 border-slate-600 text-white"
            />
            {volume && !isVolumeValid && (
              <p className="text-xs text-red-400">Объём должен быть больше 0</p>
            )}
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

          {/* Фискальный чек */}
          <div className="flex items-center justify-between">
            <Label className="text-slate-300">Фискальный чек</Label>
            <Switch
              checked={fiscal}
              onCheckedChange={setFiscal}
              className="data-[state=unchecked]:bg-slate-500 data-[state=checked]:bg-green-600"
            />
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
