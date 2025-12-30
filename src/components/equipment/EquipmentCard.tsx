/**
 * Компонент карточки оборудования
 * Отображает информацию о терминальном устройстве
 */

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Settings, AlertTriangle } from 'lucide-react';
import type { TerminalEquipmentItem } from '@/types/equipment';

interface EquipmentCardProps {
  equipment: TerminalEquipmentItem;
  isMobile: boolean;
}

/**
 * Получить иконку статуса
 */
function getStatusIcon(status: string, className: string = 'w-4 h-4') {
  switch (status) {
    case 'online':
      return <CheckCircle2 className={`${className} text-green-500`} />;
    case 'offline':
    case 'error':
      return <AlertCircle className={`${className} text-red-500`} />;
    default:
      return <Settings className={`${className} text-gray-500`} />;
  }
}

export function EquipmentCard({ equipment, isMobile }: EquipmentCardProps) {
  const isKKT = equipment.name === 'ККТ';
  const hasUnpunchedReceipts = equipment.hasUnpunchedReceipts;
  const isEmergencyMode = equipment.isEmergencyMode;

  // Определяем стиль карточки
  const getCardStyle = () => {
    if (isKKT && isEmergencyMode) {
      return 'bg-red-900/40 border-red-600 hover:border-red-500';
    }
    if (isKKT && hasUnpunchedReceipts) {
      return 'bg-amber-900/40 border-amber-600 hover:border-amber-500';
    }
    return 'bg-slate-700 border-slate-600 hover:border-slate-500';
  };

  return (
    <div
      className={`rounded-lg border transition-colors cursor-pointer ${getCardStyle()} ${
        isMobile ? 'p-2' : 'p-3'
      }`}
    >
      {/* Заголовок с иконкой */}
      <div className={`flex items-center justify-between ${isMobile ? 'mb-1 gap-1' : 'mb-1.5 gap-2'}`}>
        <span className={`font-medium text-white truncate flex-1 min-w-0 ${isMobile ? 'text-[11px] leading-tight' : 'text-xs'}`}>
          {equipment.name}
        </span>
        <div className="flex-shrink-0 flex items-center gap-1">
          {/* Индикатор не пробитых чеков для ККТ */}
          {isKKT && hasUnpunchedReceipts && (
            <AlertTriangle className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-amber-400`} />
          )}
          {getStatusIcon(equipment.status, isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5')}
        </div>
      </div>

      {/* Код/версия */}
      <div className={`text-slate-300 truncate ${isMobile ? 'text-[9px] leading-tight' : 'text-[10px]'}`}>
        {equipment.code}
      </div>

      {/* Локация (если есть) */}
      {equipment.location && (
        <div className={`text-slate-400 truncate ${isMobile ? 'text-[9px] leading-tight' : 'text-[10px]'}`}>
          {equipment.location}
        </div>
      )}

      {/* Статус */}
      <div className={isMobile ? 'mt-1' : 'mt-1.5'}>
        <Badge
          className={`font-semibold truncate max-w-full inline-block ${
            isMobile ? 'text-[9px] px-1 py-0 leading-tight' : 'text-[10px] px-1.5 py-0.5'
          } ${
            isKKT && isEmergencyMode
              ? 'bg-red-600 text-white hover:bg-red-700'
              : equipment.status === 'online'
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          {equipment.statusText}
        </Badge>
      </div>
    </div>
  );
}
