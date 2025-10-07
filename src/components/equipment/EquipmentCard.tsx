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
      className={`bg-slate-700 rounded-lg ${isMobile ? 'p-3' : 'p-4'} border border-slate-600 hover:border-slate-500 transition-colors cursor-pointer`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-white`}>
          {equipment.name}
        </span>
        {getStatusIcon(equipment.status, isMobile ? 'w-3 h-3' : 'w-4 h-4')}
      </div>

      <div className="space-y-1">
        <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-slate-300`}>
          {equipment.code}
        </div>
        {equipment.location && (
          <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-slate-400 truncate`}>
            {equipment.location}
          </div>
        )}
      </div>

      <div className={`${isMobile ? 'mt-2' : 'mt-3'}`}>
        <Badge
          className={`${isMobile ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'} font-semibold ${
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
