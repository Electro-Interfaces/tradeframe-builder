/**
 * PriceApplicationDialog - Диалог для группового применения цен
 * 
 * Особенности:
 * - Выбор времени применения цен
 * - Режим "Применить немедленно" с предупреждением о закрытии смены
 * - Предварительный просмотр изменений
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  Clock,
  AlertTriangle,
  Save,
  Eye,
  Loader2
} from 'lucide-react';

export interface PriceChange {
  fuel_type: string;
  current_price?: number;
  new_price: number;
}

interface PriceApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceChanges: PriceChange[];
  tradingPointName: string;
  onApply: (applicationTime: Date, closeShift: boolean) => void;
  loading?: boolean;
}

export const PriceApplicationDialog: React.FC<PriceApplicationDialogProps> = ({
  open,
  onOpenChange,
  priceChanges,
  tradingPointName,
  onApply,
  loading = false
}) => {
  const [applicationMode, setApplicationMode] = useState<'immediate' | 'scheduled'>('scheduled');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [closeShiftConfirmed, setCloseShiftConfirmed] = useState(false);

  // Инициализируем дату и время по умолчанию
  React.useEffect(() => {
    if (open && !scheduledDate) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(6, 0, 0, 0); // 6:00 утра следующего дня
      
      setScheduledDate(tomorrow.toISOString().split('T')[0]);
      setScheduledTime('06:00');
    }
  }, [open, scheduledDate]);

  const handleApply = () => {
    let applicationTime: Date;
    let closeShift = false;

    if (applicationMode === 'immediate') {
      applicationTime = new Date();
      closeShift = closeShiftConfirmed;
    } else {
      applicationTime = new Date(`${scheduledDate}T${scheduledTime}:00`);
    }

    onApply(applicationTime, closeShift);
  };

  const isValid = () => {
    if (priceChanges.length === 0) return false;
    
    if (applicationMode === 'immediate') {
      return closeShiftConfirmed; // Для немедленного применения требуется подтверждение
    } else {
      return scheduledDate && scheduledTime;
    }
  };

  const formatPrice = (price: number) => {
    return price.toFixed(2) + ' ₽';
  };

  const formatDateTime = (dateStr: string, timeStr: string) => {
    try {
      const date = new Date(`${dateStr}T${timeStr}:00`);
      return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Неверная дата';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Save className="w-5 h-5" />
            Применение изменений цен - {tradingPointName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Предварительный просмотр изменений */}
          <div>
            <Label className="text-slate-300 flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4" />
              Изменения для применения ({priceChanges.length})
            </Label>
            
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {priceChanges.map((change, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-700 rounded-lg p-3">
                  <div>
                    <span className="text-white font-medium">{change.fuel_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {change.current_price && (
                      <>
                        <Badge variant="outline" className="text-slate-400">
                          {formatPrice(change.current_price)}
                        </Badge>
                        <span className="text-slate-400">→</span>
                      </>
                    )}
                    <Badge variant="default" className="bg-green-600">
                      {formatPrice(change.new_price)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Выбор режима применения */}
          <div>
            <Label className="text-slate-300 mb-3 block">Время применения изменений</Label>
            
            <RadioGroup 
              value={applicationMode} 
              onValueChange={(value: 'immediate' | 'scheduled') => setApplicationMode(value)}
              className="space-y-4"
            >
              {/* Запланированное применение */}
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="scheduled" id="scheduled" />
                <div className="flex-1 space-y-3">
                  <Label htmlFor="scheduled" className="text-white cursor-pointer">
                    Применить в указанное время
                  </Label>
                  
                  {applicationMode === 'scheduled' && (
                    <div className="grid grid-cols-2 gap-3 ml-6">
                      <div>
                        <Label className="text-slate-400">Дата</Label>
                        <Input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-400">Время</Label>
                        <Input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                    </div>
                  )}
                  
                  {applicationMode === 'scheduled' && scheduledDate && scheduledTime && (
                    <div className="ml-6">
                      <Badge variant="outline" className="text-blue-400 border-blue-400">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDateTime(scheduledDate, scheduledTime)}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Немедленное применение */}
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="immediate" id="immediate" />
                <div className="flex-1 space-y-3">
                  <Label htmlFor="immediate" className="text-white cursor-pointer">
                    Применить немедленно
                  </Label>
                  
                  {applicationMode === 'immediate' && (
                    <>
                      <Alert variant="destructive" className="ml-6">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Внимание!</strong> Немедленное применение цен приведет к 
                          закрытию текущей смены и открытию новой смены с новыми ценами.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="ml-6 flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="close-shift-confirm"
                          checked={closeShiftConfirmed}
                          onChange={(e) => setCloseShiftConfirmed(e.target.checked)}
                          className="rounded border-slate-600"
                        />
                        <Label 
                          htmlFor="close-shift-confirm" 
                          className="text-slate-300 cursor-pointer"
                        >
                          Подтверждаю закрытие текущей смены
                        </Label>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Отменить
          </Button>

          {/* Кнопка для быстрого немедленного применения */}
          <Button
            onClick={() => {
              setApplicationMode('immediate');
              setCloseShiftConfirmed(true);
              onApply(new Date(), true);
            }}
            disabled={priceChanges.length === 0 || loading}
            variant="destructive"
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Clock className="w-4 h-4 mr-2" />
            )}
            Применить немедленно
          </Button>
          
          <Button
            onClick={handleApply}
            disabled={!isValid() || loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <>
                {applicationMode === 'immediate' ? (
                  <Clock className="w-4 h-4 mr-2" />
                ) : (
                  <Calendar className="w-4 h-4 mr-2" />
                )}
              </>
            )}
            {applicationMode === 'immediate' ? 'Применить с подтверждением' : 'Запланировать применение'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PriceApplicationDialog;