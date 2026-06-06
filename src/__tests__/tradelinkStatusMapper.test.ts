import { describe, it, expect } from 'vitest';
// Backend CommonJS-модуль без типов — тестируем чистую логику маппинга
// ответа TradeLink Integration API в контракт карточки «Связь».
// @ts-ignore
import * as mapper from '../../server/services/tradelinkStatusMapper.js';

const {
  channelLabel,
  normalizeName,
  getStationNumber,
  resolveTradingPoint,
  mapChannels,
  mapServiceGroups,
  mapStats,
  mapStation,
} = mapper as any;

describe('channelLabel', () => {
  it('известный ключ → человеческая подпись', () => {
    expect(channelLabel('stationdata')).toBe('Телеметрия');
    expect(channelLabel('sts')).toBe('Заказы · OnlServ');
  });
  it('неизвестный ключ → как есть', () => expect(channelLabel('foobar')).toBe('foobar'));
  it('пусто → прочерк', () => expect(channelLabel(null)).toBe('—'));
});

describe('getStationNumber', () => {
  it('из «№ N» в имени ноды', () =>
    expect(getStationNumber({ name: 'АКАЗС № 1 Непокоренных' })).toBe('1'));
  it('первое число, если нет «№»', () =>
    expect(getStationNumber({ name: 'Станция 208 Сервер' })).toBe('208'));
  it('нет числа → null', () => expect(getStationNumber({ name: 'Офис Павел' })).toBeNull());
});

describe('resolveTradingPoint — приоритет маппинга', () => {
  const node = { id: 'node-9IzPhkcl', name: 'АКАЗС № 1 Непокоренных' };

  it('external_code (byNodeId) приоритетнее номера станции', () => {
    const maps = {
      byNodeId: new Map([['node-9IzPhkcl', 'tp-by-node']]),
      byCode: new Map([['1', 'tp-by-station']]),
      byName: new Map(),
    };
    expect(resolveTradingPoint(node, maps)).toEqual({
      tradingPointId: 'tp-by-node',
      matchSource: 'external_code',
    });
  });

  it('номер станции, если нет external_code', () => {
    const maps = { byNodeId: new Map(), byCode: new Map([['1', 'tp-by-station']]), byName: new Map() };
    expect(resolveTradingPoint(node, maps)).toEqual({
      tradingPointId: 'tp-by-station',
      matchSource: 'stationNumber',
    });
  });

  it('по имени, если нет ни кода ноды, ни номера', () => {
    // ключ строим через сам normalizeName — устойчиво к деталям нормализации
    const maps = {
      byNodeId: new Map(),
      byCode: new Map(),
      byName: new Map([[normalizeName(node.name), 'tp-by-name']]),
    };
    expect(resolveTradingPoint(node, maps)).toEqual({
      tradingPointId: 'tp-by-name',
      matchSource: 'name',
    });
  });

  it('не найдено → null', () => {
    const maps = { byNodeId: new Map(), byCode: new Map(), byName: new Map() };
    expect(resolveTradingPoint(node, maps)).toEqual({ tradingPointId: null, matchSource: null });
  });
});

describe('mapChannels', () => {
  const node = {
    channels: [
      { name: 'stationdata', group: 'telemetry', target: '195.133.27.26:443', connected: true, transport: 'tunnel' },
      { name: 'sts', group: 'orders', target: '178.250.155.92:1505', connected: false, transport: 'direct' },
    ],
  };
  const ch = mapChannels(node);

  it('подставляет человеческие подписи и переносит поля', () => {
    expect(ch[0]).toMatchObject({
      key: 'stationdata',
      label: 'Телеметрия',
      group: 'telemetry',
      transport: 'tunnel',
      connected: true,
    });
    expect(ch[1]).toMatchObject({ key: 'sts', label: 'Заказы · OnlServ', group: 'orders', transport: 'direct', connected: false });
  });

  it('нет channels → пустой массив', () => expect(mapChannels({})).toEqual([]));
});

describe('mapServiceGroups', () => {
  it('порядок telemetry → orders → ocs и перенос полей', () => {
    const node = {
      serviceGroups: {
        ocs: { connected: true, channelsUp: 1, channels: 1 },
        orders: { connected: false, transport: 'tunnel', stalled: true, channelsUp: 0, channels: 2 },
        telemetry: { connected: true, transport: 'direct', channelsUp: 1, channels: 1 },
      },
    };
    const g = mapServiceGroups(node);
    expect(g.map((x: any) => x.key)).toEqual(['telemetry', 'orders', 'ocs']);
    expect(g.find((x: any) => x.key === 'orders')).toMatchObject({
      label: 'Заказы',
      connected: false,
      transport: 'tunnel',
      stalled: true,
      channelsUp: 0,
      channelsTotal: 2,
    });
  });

  it('null-группы отфильтровываются (напр. чужой OCS у Норд-Лайн)', () => {
    const g = mapServiceGroups({ serviceGroups: { telemetry: { connected: true }, orders: null, ocs: null } });
    expect(g.map((x: any) => x.key)).toEqual(['telemetry']);
  });
});

describe('mapStats — надёжность за окно', () => {
  it('переносит балл, доступность, простой и разбор', () => {
    const s = mapStats({
      windowHours: 24,
      qualityScore: 72,
      uptimePct: 99.1,
      downtimeMinutes: 13,
      realOutages: 1,
      heartbeatFlaps: 9,
      channelSwitches: 2,
      classification: 'hub-link-flap',
      qualityBreakdown: { base: 80, penaltyOutages: -5, penaltyFlaps: -3, penaltySwitches: 0 },
    });
    expect(s.qualityScore).toBe(72);
    expect(s.uptimePct).toBe(99.1);
    expect(s.downtimeMinutes).toBe(13);
    expect(s.classification).toBe('hub-link-flap');
    expect(s.qualityBreakdown.penaltyFlaps).toBe(-3);
  });

  it('пусто → null-поля', () => {
    expect(mapStats(null).qualityScore).toBeNull();
    expect(mapStats({}).qualityBreakdown).toBeNull();
  });
});

describe('mapStation — сборка контракта карточки', () => {
  const node = {
    id: 'node-H5aWpRyt',
    name: 'АКАЗС № 5 Витебский',
    status: 'online',
    lastSeen: '2026-06-06T10:00:00Z',
    channel: 'LTE',
    agentVersion: '0.15.4',
    operator: { name: 'МТС', region: 'St.-Petersburg' },
    network: { localIp: '192.168.1.101' },
    now: { score: 100 },
    connectivityToday: { qualityScore: 70 },
    connectivity: { qualityScore: 50 },
    failover: { enabled: true, state: 'normal' },
    channels: [],
    serviceGroups: {},
  };

  it('online-нода → поля контракта', () => {
    const st = mapStation(node, { tradingPointId: 'tp-5', matchSource: 'external_code' }, { overlayIp: '10.10.80.14', recentEvents: [] });
    expect(st).toMatchObject({
      nodeId: 'node-H5aWpRyt',
      tradingPointId: 'tp-5',
      stationNumber: '5',
      online: true,
      channelType: 'LTE',
      agentVersion: '0.15.4',
      overlayIp: '10.10.80.14',
    });
    expect(st.now.score).toBe(100);
    expect(st.connectivity.qualityScore).toBe(50);
    expect(st.connectivityToday.qualityScore).toBe(70);
  });

  it('offline-нода → online=false, без диагностики lan/overlay null', () => {
    const st = mapStation({ id: 'n', name: 'АКАЗС № 9', status: 'offline' }, null, null);
    expect(st.online).toBe(false);
    expect(st.overlayIp).toBeNull();
    expect(st.lan).toBeNull();
    expect(st.recentEvents).toEqual([]);
  });
});
