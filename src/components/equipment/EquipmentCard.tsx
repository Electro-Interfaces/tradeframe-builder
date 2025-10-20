/**
 * Компонент карточки оборудования
 * Отображает информацию о терминальном устройстве
 */

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Settings } from 'lucide-react';
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
  return (
    <div
      className={`bg-slate-700 rounded-lg border border-slate-600 hover:border-slate-500 transition-colors cursor-pointer ${
        isMobile ? 'p-2.5' : 'p-4'
      }`}
    >
      <div className={`flex items-center justify-between ${isMobile ? 'mb-1.5 gap-2' : 'mb-2 gap-3'}`}>
        <span className={`font-medium text-white truncate flex-1 min-w-0 ${isMobile ? 'text-xs leading-tight' : 'text-sm'}`}>
          {equipment.name}
        </span>
        <div className="flex-shrink-0">
          {getStatusIcon(equipment.status, isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')}
        </div>
      </div>

      <div className={isMobile ? 'space-y-0.5' : 'space-y-1'}>
        <div className={`text-slate-300 ${isMobile ? 'text-[10px] leading-tight' : 'text-xs'}`}>
          {equipment.code}
        </div>
        {equipment.location && (
          <div className={`text-slate-400 truncate ${isMobile ? 'text-[10px] leading-tight' : 'text-xs'}`}>
            {equipment.location}
          </div>
        )}
      </div>

      <div className={isMobile ? 'mt-1.5' : 'mt-3'}>
        <Badge
          className={`font-semibold truncate max-w-full inline-block ${
            isMobile ? 'text-[10px] px-1.5 py-0.5 leading-tight' : 'text-xs px-2 py-1'
          } ${
            equipment.status === 'online' && equipment.statusText === 'Готов'
              ? 'bg-green-600 text-white hover:bg-green-700'
              : equipment.status === 'online'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          {equipment.statusText}
        </Badge>
      </div>
    </div>
  );
}
