/**
 * Карточка «Связь» на странице оборудования — состояние связи станции
 * (TradeLink Integration API). Слева «Соединение» (качество, каналы, диагноз),
 * справа «Узел» (overlay-IP, агент, оператор, failover).
 */

import { Wifi, RefreshCw, Loader2, Radio, Activity, WifiOff, Unplug, ArrowLeftRight } from 'lucide-react';
import { useStationConnectivity } from '@/hooks/useStationConnectivity';
import { humanizeLastSeen } from '@/utils/stationStatusHumanize';
import {
  EQUIPMENT_SURFACE_CARD_CLASS,
  EQUIPMENT_CARD_PADDING_CLASS,
  EQUIPMENT_SUBCARD_CLASS,
} from './designTokens';
import type {
  StationConnectivityStats,
  StationFailover,
  StationOperator,
  StationServiceGroup,
  StationStatusDetail,
} from '@/types/stationStatus';

interface StationConnectivityCardProps {
  networkExternalId?: string | null;
  stationCode?: string | null;
  /** Когда станция реально передавала данные в облако (STS pos.lastUpdate). */
  lastDataAt?: string | null;
}

type Tone = 'green' | 'amber' | 'red';

const TONE: Record<Tone, { text: string; dot: string; bar: string }> = {
  green: { text: 'text-green-500', dot: 'bg-green-500', bar: 'bg-green-500' },
  amber: { text: 'text-amber-500', dot: 'bg-amber-500', bar: 'bg-amber-500' },
  red: { text: 'text-red-500', dot: 'bg-red-500', bar: 'bg-red-500' },
};

// Диагноз связи за 7 дней → подпись + тон. hub-link-flap НЕ авария (жёлтый).
const CLASS_META: Record<string, { label: string; tone: Tone }> = {
  stable: { label: 'стабильна', tone: 'green' },
  'hub-link-flap': { label: 'флап канала', tone: 'amber' },
  'flaky-internet': { label: 'обрывы интернета', tone: 'red' },
};
function classMeta(c: string | null) {
  return CLASS_META[c || ''] || { label: c || '—', tone: 'amber' as Tone };
}

// Общий статус «сейчас» (из now): offline/лёгший канал — красный; резерв/degraded — жёлтый.
function overallStatus(st: StationStatusDetail): { label: string; tone: Tone } {
  const now = st.now;
  if (st.status === 'offline' || now.score === 0) return { label: 'офлайн', tone: 'red' };
  if (now.channelsTotal != null && now.channelsUp != null && now.channelsUp < now.channelsTotal) {
    return { label: 'канал лёг', tone: 'red' };
  }
  if (now.failoverActive) return { label: 'на резерве', tone: 'amber' };
  if (now.healthy === false || st.status === 'degraded') return { label: 'ухудшено', tone: 'amber' };
  return { label: 'в норме', tone: 'green' };
}

// qualityScore 0..100 → тон по шкале ≥85 / 60–84 / <60.
function qualityTone(q: number): Tone {
  return q >= 85 ? 'green' : q >= 60 ? 'amber' : 'red';
}

function ConnLine({ label, value, title }: { label: string; value: React.ReactNode; title?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm" title={title}>
      <span className="inline-flex items-center gap-2 min-w-0 text-di-on-surface">
        <span className="w-1.5 h-1.5 rounded-full bg-di-outline flex-shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      <span className="text-di-on-surface text-right truncate flex-shrink-0">{value ?? '—'}</span>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className={`${EQUIPMENT_SUBCARD_CLASS} p-3`}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-di-outline mb-2">
        <Icon className="w-3.5 h-3.5" />
        {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function humanizeMins(m: number): string {
  if (m < 60) return `${m} мин`;
  return `${(m / 60).toFixed(1)} ч`;
}

// Расшифровка балла компактными пиктограммами (иконка + число), с tooltip по наведению.
// Пусто, если отклонений нет.
function qualityBadges(stats?: StationConnectivityStats | null) {
  if (!stats) return [];
  const b: { Icon: React.ComponentType<{ className?: string }>; value: React.ReactNode; title: string }[] = [];
  if (stats.downtimeMinutes) {
    const t = humanizeMins(stats.downtimeMinutes);
    b.push({ Icon: WifiOff, value: t, title: `офлайн ${t}` });
  }
  if (stats.realOutages) b.push({ Icon: Unplug, value: stats.realOutages, title: `обрывы интернета: ${stats.realOutages}` });
  if (stats.heartbeatFlaps) b.push({ Icon: Activity, value: stats.heartbeatFlaps, title: `мигания связи: ${stats.heartbeatFlaps}` });
  if (stats.channelSwitches) b.push({ Icon: ArrowLeftRight, value: stats.channelSwitches, title: `смены канала: ${stats.channelSwitches}` });
  return b;
}

// Строка качества: подпись + «X/10» + ползунок (цвет ≥85/60–84/<60), под ней —
// видимая расшифровка балла (доступность/офлайн/события), если есть отклонения.
function QualityRow({ label, score, stats }: { label: string; score: number | null; stats?: StationConnectivityStats | null }) {
  if (score == null) return null;
  const pct = Math.max(0, Math.min(100, score));
  const tone = TONE[qualityTone(score)];
  const badges = qualityBadges(stats);
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="inline-flex items-center gap-2 min-w-0 text-di-on-surface">
        <span className="w-1.5 h-1.5 rounded-full bg-di-outline flex-shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      <div className="flex items-center gap-2 flex-shrink-0">
        {badges.map((b, i) => {
          const Icon = b.Icon;
          return (
            <span key={i} title={b.title} className="inline-flex items-center gap-0.5 text-[10px] text-di-outline cursor-help">
              <Icon className="w-3 h-3" />
              {b.value}
            </span>
          );
        })}
        <span className={`text-xs font-bold ${tone.text}`}>{Math.round(score / 10)}/10</span>
        <div className="w-20 h-2 rounded-full bg-di-surface-low overflow-hidden">
          <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

// Строка бизнес-группы каналов: маркер + название, справа — путь (напрямую/туннель),
// «нет связи» (канал лёг) или «завис» (TCP жив, но терминал не обрабатывает — заказы стоят).
function ServiceGroupRow({ group }: { group: StationServiceGroup }) {
  const tunnel = group.transport === 'tunnel';
  const dotClass =
    group.connected === false
      ? 'bg-red-500'
      : group.stalled
        ? 'bg-amber-500'
        : group.connected
          ? 'bg-green-500'
          : 'bg-di-outline';
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="inline-flex items-center gap-2 text-di-on-surface min-w-0">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
        <span className="truncate">{group.label}</span>
      </span>
      {group.connected === false ? (
        <span className="text-[11px] font-medium text-red-500 flex-shrink-0">нет связи</span>
      ) : group.stalled ? (
        <span className="text-[11px] font-medium text-amber-500 flex-shrink-0">завис</span>
      ) : (
        <span className={`text-[11px] font-medium flex-shrink-0 ${tunnel ? 'text-blue-500' : 'text-di-on-surface-variant'}`}>
          {tunnel ? 'через туннель' : 'напрямую'}
        </span>
      )}
    </div>
  );
}

// Оператор связи: «Ethernet · МТС · St.-Petersburg».
function operatorText(operator?: StationOperator | null, channelType?: string | null): string {
  const parts: string[] = [];
  if (channelType) parts.push(channelType);
  if (operator?.name) parts.push(operator.name);
  if (operator?.region) parts.push(operator.region);
  return parts.length ? parts.join(' · ') : '—';
}

function failoverText(f?: StationFailover | null): string {
  if (!f || f.enabled == null) return '—';
  if (f.state === 'failover') return 'на резерве';
  return f.enabled ? 'готов · норма' : 'выключен';
}

export function StationConnectivityCard({ networkExternalId, stationCode, lastDataAt }: StationConnectivityCardProps) {
  const { station, loading, isFetching, error, refresh } = useStationConnectivity(networkExternalId, stationCode);

  const Header = ({ right }: { right?: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-di-primary/10 flex items-center justify-center flex-shrink-0">
          <Wifi className="w-5 h-5 text-di-primary-light" />
        </div>
        <div className="min-w-0">
          <h2 className="font-headline font-bold text-di-on-surface text-lg leading-tight">Связь</h2>
          <p className="text-xs text-di-on-surface-variant truncate">Передача данных и состояние связи</p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {right}
        <button
          type="button"
          onClick={() => refresh()}
          disabled={isFetching}
          className="h-9 w-9 rounded-lg border border-di-outline-variant flex items-center justify-center text-di-on-surface-variant hover:bg-di-surface-low transition-colors"
          title="Обновить"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );

  if (loading || error || !station) {
    return (
      <div className={`${EQUIPMENT_SURFACE_CARD_CLASS} ${EQUIPMENT_CARD_PADDING_CLASS} w-full h-full`}>
        <Header />
        <p className="text-sm text-di-on-surface-variant py-1 flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading
            ? 'Загрузка состояния связи…'
            : error
              ? `Не удалось загрузить состояние связи: ${error.message}`
              : 'Мониторинг TradeLink не подключён для этой станции.'}
        </p>
      </div>
    );
  }

  const overall = overallStatus(station);
  const overallTone = TONE[overall.tone];

  return (
    <div className={`${EQUIPMENT_SURFACE_CARD_CLASS} ${EQUIPMENT_CARD_PADDING_CLASS} w-full h-full`}>
      <Header
        right={
          <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${overallTone.text}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${overallTone.dot}`} />
            {overall.label}
          </span>
        }
      />

      {/* Две колонки: соединение | качество связи */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Соединение — каналы, передача данных, оператор, резерв */}
        <div>
          <h3 className="text-[11px] uppercase tracking-wide text-di-outline mb-2">Соединение</h3>
          <Section icon={Radio} title="Каналы">
            {station.serviceGroups.map((g) => (
              <ServiceGroupRow key={g.key} group={g} />
            ))}
            <ConnLine label="Передача данных" value={humanizeLastSeen(lastDataAt)} />
            <ConnLine label="Оператор" value={operatorText(station.operator, station.channelType)} />
            <ConnLine label="Резерв" value={failoverText(station.failover)} />
          </Section>
        </div>

        {/* Качество связи — три горизонта + узел */}
        <div>
          <h3 className="text-[11px] uppercase tracking-wide text-di-outline mb-2">Качество связи</h3>
          <Section icon={Activity} title="Надёжность">
            <QualityRow label="Сейчас" score={station.now.score} />
            <QualityRow label="За сутки" score={station.connectivityToday.qualityScore} stats={station.connectivityToday} />
            <QualityRow label="За 7 дней" score={station.connectivity.qualityScore} stats={station.connectivity} />
            <ConnLine label="IP" value={station.overlayIp ? <span className="font-mono">{station.overlayIp}</span> : '—'} />
            <ConnLine label="Агент" value={station.agentVersion} />
          </Section>
        </div>
      </div>
    </div>
  );
}
