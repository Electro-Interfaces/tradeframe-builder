/**
 * Типы карточки «Связь» — состояние связи станции через TradeLink Integration API.
 * Контракт совпадает с ответом backend /api/tradelink/station-status,
 * который агрегирует Hub /integration/connectivity (+ /diagnostics для событий).
 */

/** Статус ноды: online | offline | degraded (пульс есть, канал/туннель не норма) | pending. */
export type StationNetStatus = 'online' | 'offline' | 'degraded' | 'pending';

/**
 * Диагноз связи за 7 дней:
 *  - stable — норма;
 *  - hub-link-flap — флапает мобильный канал (LTE/WiFi), но реальных обрывов нет (НЕ авария);
 *  - flaky-internet — были реальные обрывы интернета (срабатывал failover).
 */
export type Classification = 'stable' | 'hub-link-flap' | 'flaky-internet' | (string & {});

export type MatchSource = 'external_code' | 'stationNumber' | 'name' | null;

/** Оператор связи (резолвится по публичному IP). */
export interface StationOperator {
  asn?: number | null;
  name: string | null;
  mobile?: boolean | null;
  region?: string | null;
}

/** Разбор балла: score = base(uptime) + штрафы (штрафы ≤ 0). */
export interface QualityBreakdown {
  base: number | null;
  penaltyOutages: number | null;
  penaltyFlaps: number | null;
  penaltySwitches: number | null;
}

/** Надёжность связи за окно (7 дней — connectivity, 24ч — connectivityToday). */
export interface StationConnectivityStats {
  windowDays?: number | null;
  windowHours?: number | null;
  realOutages: number | null;
  heartbeatFlaps: number | null;
  channelSwitches: number | null;
  lastRealOutageAt?: string | null;
  classification: Classification | null;
  /** 0..100 — интегральный балл надёжности (реальные обрывы топят сильно, флапы — умеренно). */
  qualityScore: number | null;
  /** Доступность по времени, % (главная причина балла). */
  uptimePct?: number | null;
  /** Минут без связи за окно. */
  downtimeMinutes?: number | null;
  /** Разбор балла (uptime + штрафы) — для тултипа «почему N/100». */
  qualityBreakdown?: QualityBreakdown | null;
}

/** Организация локальной сети ноды (карта «сеть точки»). */
export interface StationLan {
  localIp: string | null;
  subnet: string | null;
  gateway: string | null;
  adapter: string | null;
  hostMac: string | null;
  speedMbps: number | null;
  publicIp: string | null;
}

/** Устройство локальной сети из network_scan (drill-down /diagnostics). */
export interface StationLanDevice {
  ip: string | null;
  mac: string | null;
  hostname: string | null;
}

/** Результат сканирования LAN (из /diagnostics). */
export interface StationLanScan {
  devices: StationLanDevice[];
  routerMac: string | null;
  scannedAt: string | null;
}

/** Состояние «прямо сейчас» (из последнего снимка). offline → score=0. */
export interface StationNow {
  score: number | null; // 0..100
  healthy: boolean | null;
  status: StationNetStatus | null;
  channelsUp: number | null;
  channelsTotal: number | null;
  failoverActive: boolean | null;
  tunnelUp: boolean | null;
}

export interface StationFailover {
  enabled: boolean | null;
  state: string | null; // normal | failover
  probeMode?: string | null;
  failedTarget?: string | null;
}

/** Транспорт канала: напрямую через интернет станции или через overlay-туннель. */
export type ChannelTransport = 'direct' | 'tunnel';

/** Сервисный канал станции к облаку/заказам. connected — источник правды «жив ли канал». */
export interface StationChannel {
  key: string; // sts | ocs | ts-serv | stationdata
  label: string; // Телеметрия | Заказы · OnlServ | OCS | …
  group?: string | null; // telemetry | orders | ocs | other
  target: string | null;
  connected: boolean | null;
  transport?: ChannelTransport | null;
}

/** Агрегат каналов по бизнес-группе (для карточки одной строкой). */
export interface StationServiceGroup {
  key: string; // orders | telemetry | ocs
  label: string; // Заказы | Телеметрия | OCS
  connected: boolean | null;
  transport: ChannelTransport | null; // tunnel, если хоть один канал группы туннельный
  /** Заказы: TCP жив, но терминал завис — заказы фактически стоят. */
  stalled?: boolean | null;
  channelsUp: number | null;
  channelsTotal: number | null;
}

/** Событие связи из таймлайна /diagnostics. */
export interface StationEvent {
  ts: string;
  type: string; // disconnect | channel_switch | …
  severity: string; // info | warning | …
  message: string;
}

/** Состояние станции для карточки «Связь». */
export interface StationStatusDetail {
  nodeId: string;
  tradingPointId: string | null;
  stationNumber: string | null;
  name: string | null;
  matchSource: MatchSource;
  status: StationNetStatus;
  online: boolean;
  lastSeen: string | null;
  /** Тип канала: LTE | Ethernet | … */
  channelType: string | null;
  agentVersion: string | null;
  runtimeProfile: string | null;
  operator: StationOperator | null;
  /** Локальная сеть точки (подсеть/роутер/адаптер/MAC/скорость/WAN). */
  network: StationLan;
  /** Устройства LAN из network_scan (из /diagnostics, иначе null). */
  lan: StationLanScan | null;
  /** «Сейчас» — состояние из последнего снимка. */
  now: StationNow;
  /** Надёжность за текущие сутки (24ч). */
  connectivityToday: StationConnectivityStats;
  /** Надёжность за 7 дней (база). */
  connectivity: StationConnectivityStats;
  failover: StationFailover;
  channels: StationChannel[];
  /** Агрегаты каналов по группам (orders/telemetry/ocs) — основа списка в карточке. */
  serviceGroups: StationServiceGroup[];
  /** overlay-IP ноды (из /diagnostics, иначе null). */
  overlayIp: string | null;
  /** Таймлайн событий связи за 7 дней (из /diagnostics, иначе пусто). */
  recentEvents: StationEvent[];
}
