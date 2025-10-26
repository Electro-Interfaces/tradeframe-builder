/**
 * Модальное окно для настройки параметров автокалибровки резервуара
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TankCalibrationSettingsComponent } from './TankCalibrationSettings';
import { saveCalibrationSettings } from '@/services/tankCalibrationService';
import type { Tank, TankCalibrationSettings } from '@/types/tanks';

interface TankCalibrationDialogProps {
  tank: Tank;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TankCalibrationDialog({ tank, open, onOpenChange }: TankCalibrationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            Параметры резервуара
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-base">
            Настройка параметров и калибровки для резервуара: <span className="text-blue-400 font-semibold text-lg">{tank.name} ({tank.fuelType})</span>
          </DialogDescription>
        </DialogHeader>

        <TankCalibrationSettingsComponent
          tankId={tank.id.toString()}
          tankName={tank.name}
          tankCapacity={tank.capacityLiters}
          onSave={async (settings: TankCalibrationSettings) => {
            await saveCalibrationSettings(settings);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
