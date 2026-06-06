/**
 * Карта «Сеть» — локальная сеть точки (TradeLink network): подсеть, IP станции,
 * роутер, адаптер, MAC, скорость линка. Данные из того же useStationConnectivity
 * (React Query дедуплицирует запрос с карточкой «Связь»).
 */

import { Network as NetworkIcon, Loader2 } from 'lucide-react';
import { useStationConnectivity } from '@/hooks/useStationConnectivity';
import {
  EQUIPMENT_SURFACE_CARD_CLASS,
  EQUIPMENT_CARD_PADDING_CLASS,
  EQUIPMENT_SUBCARD_CLASS,
} from './designTokens';

interface StationNetworkCardProps {
  networkExternalId?: string | null;
  stationCode?: string | null;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-di-outline flex-shrink-0">{label}</span>
      <span className="text-di-on-surface text-right truncate">{value ?? '—'}</span>
    </div>
  );
}

export function StationNetworkCard({ networkExternalId, stationCode }: StationNetworkCardProps) {
  const { station, loading, error } = useStationConnectivity(networkExternalId, stationCode);

  const Header = () => (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-xl bg-di-primary/10 flex items-center justify-center flex-shrink-0">
        <NetworkIcon className="w-5 h-5 text-di-primary-light" />
      </div>
      <div className="min-w-0">
        <h2 className="font-headline font-bold text-di-on-surface text-lg leading-tight">Сеть</h2>
        <p className="text-xs text-di-on-surface-variant truncate">Локальная сеть станции</p>
      </div>
    </div>
  );

  if (loading || error || !station) {
    return (
      <div className={`${EQUIPMENT_SURFACE_CARD_CLASS} ${EQUIPMENT_CARD_PADDING_CLASS} h-full`}>
        <Header />
        <p className="text-sm text-di-on-surface-variant py-1 flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Загрузка сети…' : error ? 'Сеть недоступна' : 'Нет данных о сети.'}
        </p>
      </div>
    );
  }

  const net = station.network;
  return (
    <div className={`${EQUIPMENT_SURFACE_CARD_CLASS} ${EQUIPMENT_CARD_PADDING_CLASS} h-full`}>
      <Header />
      <div className={`${EQUIPMENT_SUBCARD_CLASS} p-3`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-1.5">
          <Row label="Подсеть" value={net.subnet} />
          <Row
            label="IP станции"
            value={
              net.localIp ? (
                <span>
                  <span className="font-mono">{net.localIp}</span>
                  <span className="text-[10px] text-di-outline"> · статика</span>
                </span>
              ) : '—'
            }
          />
          <Row label="Роутер" value={net.gateway ? <span className="font-mono">{net.gateway}</span> : '—'} />
          <Row label="Линк ПК↔роутер" value={net.adapter} />
          <Row label="Скорость" value={net.speedMbps != null ? `${net.speedMbps} Mbps` : '—'} />
          <Row label="MAC" value={net.hostMac ? <span className="font-mono">{net.hostMac}</span> : '—'} />
        </div>
      </div>
    </div>
  );
}
