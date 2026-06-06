/**
 * TradeLink Status Mapper — тонкая адаптация ответа Integration API
 * (/integration/connectivity, /diagnostics) в контракт карточки «Связь».
 * Hub уже агрегирует состояние — здесь только подписи каналов, резолв ноды
 * на торговую точку и маппинг полей. Без сети/БД — тестируемо.
 */

// Подписи каналов Hub → человеческие (sts/ocs/ts-serv/stationdata).
const CHANNEL_LABELS = {
  stationdata: 'Телеметрия',
  sts: 'Заказы · OnlServ',
  'ts-serv': 'Заказы · ts-serv',
  ts_serv: 'Заказы · ts-serv',
  msto: 'Заказы · интегратор',
  ocs: 'OCS',
};

function channelLabel(name) {
  const key = String(name || '').toLowerCase();
  return CHANNEL_LABELS[key] || (name ? String(name) : '—');
}

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[№#"']/g, ' ')
    .replace(/\b(аказс|казс|азс|гиг|станция|сервер)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Номер станции: из имени ноды «АКАЗС №1 …» → «1»; иначе первое число имени.
function getStationNumber(node) {
  const name = node && node.name ? String(node.name) : '';
  const byHash = name.match(/№\s*(\d+)/);
  if (byHash) return byHash[1];
  const anyNum = name.match(/\b(\d{1,4})\b/);
  return anyNum ? anyNum[1] : null;
}

/**
 * Резолв ноды на торговую точку по приоритету:
 *   1) external_code (system='tradelink', code=node.id)
 *   2) номер станции из имени == trading_point.code
 *   3) нормализованное имя
 * maps = { byNodeId, byCode, byName }
 */
function resolveTradingPoint(node, maps) {
  const nodeId = node?.id;
  if (maps?.byNodeId?.has(nodeId)) {
    return { tradingPointId: maps.byNodeId.get(nodeId), matchSource: 'external_code' };
  }
  const stationNumber = getStationNumber(node);
  if (stationNumber && maps?.byCode?.has(stationNumber)) {
    return { tradingPointId: maps.byCode.get(stationNumber), matchSource: 'stationNumber' };
  }
  const norm = normalizeName(node?.name);
  if (norm && maps?.byName?.has(norm)) {
    return { tradingPointId: maps.byName.get(norm), matchSource: 'name' };
  }
  return { tradingPointId: null, matchSource: null };
}

function mapChannels(node) {
  const list = Array.isArray(node?.channels) ? node.channels : [];
  return list.map((c) => ({
    key: c.name,
    label: channelLabel(c.name),
    group: c.group ?? null,
    target: c.target ?? null,
    connected: typeof c.connected === 'boolean' ? c.connected : null,
    transport: c.transport ?? null,
  }));
}

// Бизнес-группы каналов (готовый агрегат Hub serviceGroups) → массив для карточки.
const GROUP_LABELS = { telemetry: 'Телеметрия', orders: 'Заказы', ocs: 'OCS' };
const GROUP_ORDER = ['telemetry', 'orders', 'ocs'];

function mapServiceGroups(node) {
  const sg = (node && node.serviceGroups) || {};
  const one = (key) => {
    const g = sg[key];
    if (!g) return null;
    return {
      key,
      label: GROUP_LABELS[key] || key,
      connected: typeof g.connected === 'boolean' ? g.connected : null,
      transport: g.transport ?? null,
      stalled: g.stalled ?? null,
      channelsUp: g.channelsUp ?? null,
      channelsTotal: g.channels ?? g.channelsTotal ?? null,
    };
  };
  const ordered = GROUP_ORDER.map(one).filter(Boolean);
  const extra = Object.keys(sg).filter((k) => !GROUP_ORDER.includes(k)).map(one).filter(Boolean);
  return [...ordered, ...extra];
}

// Надёжность за окно (connectivity — 7д, connectivityToday — 24ч). Единый shape.
function mapStats(stats) {
  const c = stats || {};
  return {
    windowDays: c.windowDays ?? null,
    windowHours: c.windowHours ?? null,
    realOutages: c.realOutages ?? null,
    heartbeatFlaps: c.heartbeatFlaps ?? null,
    channelSwitches: c.channelSwitches ?? null,
    lastRealOutageAt: c.lastRealOutageAt ?? null,
    classification: c.classification ?? null,
    qualityScore: c.qualityScore ?? null,
    uptimePct: c.uptimePct ?? null,
    downtimeMinutes: c.downtimeMinutes ?? null,
    qualityBreakdown: c.qualityBreakdown
      ? {
          base: c.qualityBreakdown.base ?? null,
          penaltyOutages: c.qualityBreakdown.penaltyOutages ?? null,
          penaltyFlaps: c.qualityBreakdown.penaltyFlaps ?? null,
          penaltySwitches: c.qualityBreakdown.penaltySwitches ?? null,
        }
      : null,
  };
}

// Состояние «прямо сейчас» из последнего снимка.
function mapNow(node) {
  const n = (node && node.now) || {};
  return {
    score: n.score ?? null,
    healthy: n.healthy ?? null,
    status: n.status ?? null,
    channelsUp: n.channelsUp ?? null,
    channelsTotal: n.channelsTotal ?? null,
    failoverActive: n.failoverActive ?? null,
    tunnelUp: n.tunnelUp ?? null,
  };
}

function mapFailover(node) {
  const f = (node && node.failover) || {};
  return {
    enabled: f.enabled ?? null,
    state: f.state ?? null,
    probeMode: f.probeMode ?? null,
    failedTarget: f.failedTarget ?? null,
  };
}

// Локальная сеть ноды (карта «сеть точки»).
function mapNetwork(node) {
  const n = (node && node.network) || {};
  return {
    localIp: n.localIp ?? null,
    subnet: n.subnet ?? null,
    gateway: n.gateway ?? null,
    adapter: n.adapter ?? null,
    hostMac: n.hostMac ?? null,
    speedMbps: n.speedMbps ?? null,
    publicIp: n.publicIp ?? null,
  };
}

// Устройства LAN из network_scan (только /diagnostics).
function mapLan(diagnostics) {
  const l = diagnostics && diagnostics.lan;
  if (!l) return null;
  return {
    devices: Array.isArray(l.devices)
      ? l.devices.map((d) => ({ ip: d.ip ?? null, mac: d.mac ?? null, hostname: d.hostname ?? null }))
      : [],
    routerMac: l.routerMac ?? null,
    scannedAt: l.scannedAt ?? null,
  };
}

function mapOperator(node) {
  const o = node && node.operator;
  if (!o) return null;
  return {
    asn: o.asn ?? null,
    name: o.name ?? null,
    mobile: o.mobile ?? null,
    region: o.region ?? null,
  };
}

/**
 * Нода Integration API → контракт карточки «Связь».
 * node — из /connectivity (или /diagnostics); resolved — resolveTradingPoint;
 * diagnostics — опц. ответ /diagnostics (overlayIp, recentEvents).
 */
function mapStation(node, resolved, diagnostics) {
  const diag = diagnostics || {};
  return {
    nodeId: node?.id || null,
    tradingPointId: resolved?.tradingPointId ?? null,
    stationNumber: getStationNumber(node),
    name: node?.name || null,
    matchSource: resolved?.matchSource ?? null,
    status: node?.status || 'pending',
    online: node?.status === 'online',
    lastSeen: node?.lastSeen ?? null,
    channelType: node?.channel ?? null,
    agentVersion: node?.agentVersion ?? null,
    runtimeProfile: node?.runtimeProfile ?? null,
    operator: mapOperator(node),
    network: mapNetwork(node),
    lan: mapLan(diagnostics),
    now: mapNow(node),
    connectivityToday: mapStats(node && node.connectivityToday),
    connectivity: mapStats(node && node.connectivity),
    failover: mapFailover(node),
    channels: mapChannels(node),
    serviceGroups: mapServiceGroups(node),
    overlayIp: diag.overlayIp ?? null,
    recentEvents: Array.isArray(diag.recentEvents) ? diag.recentEvents : [],
  };
}

module.exports = {
  CHANNEL_LABELS,
  channelLabel,
  normalizeName,
  getStationNumber,
  resolveTradingPoint,
  mapChannels,
  mapServiceGroups,
  mapStats,
  mapNow,
  mapNetwork,
  mapLan,
  mapFailover,
  mapOperator,
  mapStation,
};
