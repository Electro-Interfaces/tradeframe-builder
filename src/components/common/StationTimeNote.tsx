/**
 * Пометка для страниц со временем станций: у сетей не в МСК время показано
 * по местным часам станции («АЗС Н1 — МСК+2»). У сетей в МСК ничего не рисует.
 */

import { Clock } from 'lucide-react';
import { useSelectedNetworks } from '@/hooks/useSelectedNetworks';
import { mskOffsetLabel, networkTimezone } from '@/utils/stationTime';

export function StationTimeNote({ className = '' }: { className?: string }) {
  const { selectedNetworks } = useSelectedNetworks();
  const shifted = selectedNetworks
    .map((n) => ({ name: n.name, label: mskOffsetLabel(networkTimezone(n)) }))
    .filter((n) => n.label);
  if (!shifted.length) return null;

  return (
    <p className={`inline-flex items-center gap-1 text-[11px] text-di-on-surface-variant ${className}`}>
      <Clock className="w-3 h-3 shrink-0" />
      Время станций местное: {shifted.map((n) => `${n.name} — ${n.label}`).join(', ')}
    </p>
  );
}

export default StationTimeNote;
