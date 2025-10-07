/**
 * Хук для управления выделением смен
 */

import { useState } from 'react';
import type { ShiftListItem } from '@/types/shift-reports-v2';

export function useShiftSelection() {
  const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>([]);
  const [selectedShiftNumber, setSelectedShiftNumber] = useState<number | null>(null);

  // Переключение выделения одной смены
  const toggleShiftSelection = (shiftId: string) => {
    setSelectedShiftIds(prev =>
      prev.includes(shiftId)
        ? prev.filter(id => id !== shiftId)
        : [...prev, shiftId]
    );
  };

  // Переключение выделения всех смен
  const toggleAllShifts = (shifts: ShiftListItem[], selected: boolean) => {
    if (selected) {
      setSelectedShiftIds(shifts.map(shift => shift.id));
    } else {
      setSelectedShiftIds([]);
    }
  };

  // Выбор смены для просмотра деталей
  const selectShift = (shiftNumber: number) => {
    setSelectedShiftNumber(shiftNumber);
  };

  // Закрытие модального окна деталей
  const closeShiftDetails = () => {
    setSelectedShiftNumber(null);
  };

  return {
    selectedShiftIds,
    selectedShiftNumber,
    toggleShiftSelection,
    toggleAllShifts,
    selectShift,
    closeShiftDetails
  };
}
