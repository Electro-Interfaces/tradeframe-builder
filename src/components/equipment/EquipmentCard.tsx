/**
 * Карточка оборудования — Deep Intel v3
 * bg-surface-container-low, dot status, transparent border, hover accent
 */

import { Cpu, CreditCard, Receipt, Radio, Banknote, Settings, Fuel, AlertCircle, AlertTriangle, CheckCircle2, Dot } from 'lucide-react';
import type { TerminalEquipmentItem } from '@/types/equipment';

interface EquipmentCardProps {
  equipment: TerminalEquipmentItem;
  isMobile: boolean;
}

function DeviceIcon({ name, className }: { name: string; className?: string }) {
  const cls = className || 'w-5 h-5';
  const isStation = name === 'Станция';
  const color = isStation ? 'text-di-primary-light' : 'text-di-primary-light';
  switch (name) {
    case 'POS': return <CreditCard className={`${cls} ${color}`} />;
    case 'ККТ': return <Receipt className={`${cls} ${color}`} />;
    case 'Картридер': return <Cpu className={`${cls} ${color}`} />;
    case 'МПС': return <Radio className={`${cls} ${color}`} />;
    case 'Купюроприемник': return <Banknote className={`${cls} ${color}`} />;
    case 'Станция': return <Fuel className={`${cls} ${color}`} />;
    default: return <Settings className={`${cls} ${color}`} />;
  }
}

export function EquipmentCard({ equipment, isMobile }: EquipmentCardProps) {
  const isPOS = equipment.name === 'POS';
  const isKKT = equipment.name === 'ККТ';
  const isEmergencyMode = equipment.isEmergencyMode;
  const hasUnpunchedReceipts = equipment.hasUnpunchedReceipts;
  const isOnline = equipment.status === 'online';
  const isError = isKKT && isEmergencyMode;
  const isWarning = isKKT && hasUnpunchedReceipts && !isEmergencyMode;

  const borderClass = isError
    ? 'border-red-500/30'
    : isWarning
      ? 'border-di-tertiary-container/30'
      : 'border-transparent hover:border-di-primary/20';

  const displayName = isPOS && equipment.posType
    ? (equipment.posType.id === 1 ? 'Автомат' : 'Оператор')
    : equipment.name;

  const statusLabel = isError ? 'Авария' : isWarning ? 'Внимание' : isOnline ? 'онлайн' : 'офлайн';
  const statusLabelColor = isError
    ? 'text-red-400'
    : isWarning
      ? 'text-di-tertiary-container'
      : 'text-di-on-surface-variant';

  return (
    <div className={`bg-di-surface-mid rounded-xl border ${borderClass} transition-all ${
      isMobile ? 'p-4' : 'p-4'
    }`}>
      {/* Icon + Status dot */}
      <div className="flex justify-between items-start mb-3">
        <DeviceIcon name={equipment.name} className={isMobile ? 'w-4 h-4' : 'w-5 h-5'} />
        <div className="flex items-center gap-1.5">
          {isError ? (
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          ) : isWarning ? (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          ) : isOnline ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Dot className="w-4 h-4 text-red-500" />
          )}
          <span className={`text-[10px] font-bold uppercase ${statusLabelColor}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Label — uppercase, muted */}
      <h3 className={`font-bold uppercase mb-1 ${
        isMobile ? 'text-[9px] tracking-wide' : 'text-[10px] tracking-tighter'
      } text-di-outline`}>
        {displayName}
      </h3>

      {/* Value — Manrope bold */}
      <p className={`font-headline font-bold text-di-on-surface truncate ${
        isMobile ? 'text-sm' : 'text-lg'
      }`}>
        {equipment.code || '—'}
      </p>
    </div>
  );
}
