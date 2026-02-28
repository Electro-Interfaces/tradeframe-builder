/**
 * Модальное окно для настройки параметров автокалибровки резервуара
 */

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TankCalibrationSettingsComponent } from './TankCalibrationSettings';
import { saveCalibrationSettings, getCalibrationSettings } from '@/services/tankCalibrationService';
import type { Tank, TankCalibrationSettings } from '@/types/tanks';

interface TankCalibrationDialogProps {
  tank: Tank;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TankCalibrationDialog({ tank, open, onOpenChange }: TankCalibrationDialogProps) {
  const [initialSettings, setInitialSettings] = useState<TankCalibrationSettings | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Загружаем настройки при открытии диалога
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      getCalibrationSettings(tank.id.toString())
        .then(settings => {
          setInitialSettings(settings || undefined);
        })
        .catch(error => {
          console.error('Error loading calibration settings:', error);
          setInitialSettings(undefined);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, tank.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Параметры резервуара
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base">
            Настройка параметров и калибровки для резервуара: <span className="text-blue-600 dark:text-blue-400 font-semibold text-lg">{tank.name} ({tank.fuelType})</span>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Загрузка настроек...
          </div>
        ) : (
          <TankCalibrationSettingsComponent
            tankId={tank.id.toString()}
            tankName={tank.name}
            tankCapacity={tank.capacityLiters}
            initialSettings={initialSettings}
            onSave={async (settings: TankCalibrationSettings) => {
              await saveCalibrationSettings(settings);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
