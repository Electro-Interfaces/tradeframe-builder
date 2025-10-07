/**
 * Компонент карточки купюроприемника
 * Отображает детальную информацию о купюроприемнике с количеством купюр и суммой
 */

import { Badge } from '@/components/ui/badge';
import { Banknote, CheckCircle2, AlertCircle } from 'lucide-react';
import type { TerminalEquipmentItem } from '@/types/equipment';

interface BillAcceptorCardProps {
  billAcceptor: TerminalEquipmentItem;
  isMobile: boolean;
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

export function BillAcceptorCard({ billAcceptor, isMobile }: BillAcceptorCardProps) {
  return (
    <div
      className={`bg-slate-700 rounded-lg ${isMobile ? 'p-4' : 'p-6'} border border-slate-600 hover:border-slate-500 transition-colors`}
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
            <div className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold text-green-400`}>
              {billAcceptor.billCount || 0}
            </div>
            <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-300`}>купюр</div>
          </div>

          {/* Сумма */}
          <div className="text-center">
            <div className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold text-blue-400`}>
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
    </div>
  );
}
