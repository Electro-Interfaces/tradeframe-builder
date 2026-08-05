/**
 * Аналитика из материализованной таблицы sts_transactions.
 * Отдаёт готовые агрегаты (KPI + разбивки) и пагинированный список операций —
 * браузер больше не тащит сотни тысяч сырых транзакций и не суммирует их сам.
 */
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getUserScope, getAllowedNetworkIds } = require('../middleware/scopeFilter');
const analytics = require('../services/analytics/analyticsPgSource');
const stsSource = require('../services/analytics/analyticsStsSource');
const stsSync = require('../services/analytics/stsSync');
const { parseDims } = require('../services/analytics/pivotDims');

const router = express.Router();
router.use(requireAuth);

// Выбор источника: если запрошенный период начинается РАНЬШЕ материализованного
// окна PG (или покрытия нет вовсе) — берём данные напрямую из STS (историю
// глубже окна PG не держит). Иначе — быстрый PG-источник.
// Дополнительно: при уходе в STS запускаем ленивую до-материализацию сети до
// запрошенной даты В ФОНЕ (не блокируя ответ) — повторные заходы пойдут из PG.
async function pickSource(networkIds, from) {
  const cov = await analytics.coverageStart(networkIds);
  if (cov && String(from) >= cov) return analytics;
  for (const nid of networkIds) {
    stsSync.ensureCoverage(nid, String(from)).catch(() => {});
  }
  return stsSource;
}

// Разрешённые станции пользователя (scope). null = без ограничений.
function allowedStationsOf(user) {
  const scope = getUserScope(user);
  if (!scope.hasRestrictions) return null;
  const stations = new Set();
  for (const pid of scope.pointIds) {
    const m = /-azs-(\d+)$/.exec(String(pid));
    if (m) stations.add(Number(m[1]));
  }
  // Ограничения по сети без явных точек → станции не сужаем (сеть уже отфильтрована)
  return stations.size > 0 ? Array.from(stations) : null;
}

// networkIds из query (?networkId=uuid или ?networkIds=a,b), пересечённые со scope
async function resolveNetworkIds(req) {
  const allowed = await getAllowedNetworkIds(req.user); // null = все
  const raw = req.query.networkIds || req.query.networkId;
  let requested = raw ? String(raw).split(',').map(s => s.trim()).filter(Boolean) : null;
  if (!requested) {
    // не указано — все доступные пользователю
    if (allowed) return Array.from(allowed);
    // super_admin без указания сети — вернём пусто (пусть UI выберет сеть)
    return [];
  }
  if (allowed) requested = requested.filter(id => allowed.has(id));
  return requested;
}

// GET /api/analytics/overview?networkId=&from=&to=
router.get('/overview', async (req, res) => {
  try {
    const networkIds = await resolveNetworkIds(req);
    if (!networkIds.length) return res.json({ kpi: { operations: 0, volume: 0, revenue: 0, avgCheck: 0 }, byFuel: [], byPayment: [], byDay: [], byHour: [], byStation: [] });
    const { from, to, stations } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'Параметры from и to обязательны' });
    const stationList = stations ? String(stations).split(',').map(s => s.trim()).filter(Boolean) : null;
    const source = await pickSource(networkIds, from);
    const data = await source.getOverview({ networkIds, from, to, allowedStations: allowedStationsOf(req.user), stations: stationList });
    res.json(data);
  } catch (error) {
    console.error('[Analytics] overview:', error.message);
    res.status(500).json({ error: error.message || 'Ошибка аналитики' });
  }
});

// GET /api/analytics/overview-detailed?networkId=&from=&to= — расширенная аналитика Обзора
router.get('/overview-detailed', async (req, res) => {
  try {
    const networkIds = await resolveNetworkIds(req);
    if (!networkIds.length) return res.json({ byStationFuel: [], byStationDay: [], byDayPayment: [] });
    const { from, to, stations } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'Параметры from и to обязательны' });
    const stationList = stations ? String(stations).split(',').map(s => s.trim()).filter(Boolean) : null;
    const source = await pickSource(networkIds, from);
    const data = await source.getDetailedAnalytics({ networkIds, from, to, allowedStations: allowedStationsOf(req.user), stations: stationList });
    res.json(data);
  } catch (error) {
    console.error('[Analytics] overview-detailed:', error.message);
    res.status(500).json({ error: error.message || 'Ошибка аналитики' });
  }
});

// GET /api/analytics/operations?networkId=&from=&to=&fuel=&payment=&station=&search=&page=&pageSize=
router.get('/operations', async (req, res) => {
  try {
    const networkIds = await resolveNetworkIds(req);
    if (!networkIds.length) return res.json({ total: 0, page: 1, pageSize: 100, rows: [] });
    const { from, to, fuels, payments, station, stations, shift, receipt, pos, card, search, page, pageSize } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'Параметры from и to обязательны' });
    const splitCsv = (v) => (v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : []);
    const source = await pickSource(networkIds, from);
    const data = await source.getOperations({
      networkIds, from, to, allowedStations: allowedStationsOf(req.user),
      fuels: splitCsv(fuels), payments: splitCsv(payments),
      station, stations: splitCsv(stations), shift, receipt, pos, card, search, page, pageSize,
    });
    res.json(data);
  } catch (error) {
    console.error('[Analytics] operations:', error.message);
    res.status(500).json({ error: error.message || 'Ошибка аналитики' });
  }
});

// GET /api/analytics/pivot?networkId=&from=&to=&dims=station,fuel,payment&...
// Отдаёт «листья» сводной (агрегаты по выбранным измерениям). Иерархию, подытоги
// и доли считает браузер — перестановка порядка группировок не идёт в сеть.
router.get('/pivot', async (req, res) => {
  try {
    const networkIds = await resolveNetworkIds(req);
    let dims;
    try {
      dims = parseDims(req.query.dims);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    if (!networkIds.length) return res.json({ dims, rows: [], truncated: false });
    const { from, to, fuels, payments, station, stations, shift, receipt, pos, card, search } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'Параметры from и to обязательны' });
    const splitCsv = (v) => (v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : []);
    const source = await pickSource(networkIds, from);
    const data = await source.getPivot({
      networkIds, from, to, allowedStations: allowedStationsOf(req.user), dims,
      fuels: splitCsv(fuels), payments: splitCsv(payments),
      station, stations: splitCsv(stations), shift, receipt, pos, card, search,
    });
    res.json(data);
  } catch (error) {
    console.error('[Analytics] pivot:', error.message);
    res.status(500).json({ error: error.message || 'Ошибка аналитики' });
  }
});

// POST /api/analytics/coupon-usage?networkId= — даты реализации купонов.
// Тело: { coupons: [{ number, station, dt, qty_used, summ_used }] }.
// Купоны живут только в STS (в PG их нет), поэтому список приходит с фронта,
// а сервер лишь сопоставляет их с материализованными транзакциями.
router.post('/coupon-usage', async (req, res) => {
  try {
    const networkIds = await resolveNetworkIds(req);
    if (!networkIds.length) return res.json({});
    const coupons = Array.isArray(req.body?.coupons) ? req.body.coupons.slice(0, 5000) : [];
    const data = await analytics.getCouponUsage({
      networkIds, coupons, allowedStations: allowedStationsOf(req.user),
    });
    res.json(data);
  } catch (error) {
    console.error('[Analytics] coupon-usage:', error.message);
    res.status(500).json({ error: error.message || 'Ошибка сопоставления купонов' });
  }
});

// GET /api/analytics/sync-status?networkId= — свежесть данных для UI
router.get('/sync-status', async (req, res) => {
  try {
    const networkIds = await resolveNetworkIds(req);
    if (!networkIds.length) return res.json({ lastSyncedAt: null, stations: [] });
    res.json(await analytics.getSyncStatus(networkIds[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/analytics/sync — кнопка «Обновить»: принудительный досинк выбранной сети.
// С переданным периодом перечитывает выбранные даты напрямую из STS, иначе
// сохраняет быстрый режим «хвоста» для старых клиентов.
router.post('/sync', async (req, res) => {
  try {
    const networkIds = await resolveNetworkIds(req);
    if (!networkIds.length) return res.status(400).json({ error: 'Сеть не выбрана или нет доступа' });
    const { from, to } = req.body || {};
    if ((from && !to) || (!from && to)) {
      return res.status(400).json({ error: 'Для синхронизации периода нужны обе даты: from и to' });
    }

    let range = null;
    if (from && to) {
      try {
        range = stsSync.validateSyncRange(from, to);
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }
    }

    const requestedStations = Array.isArray(req.body?.stations)
      ? req.body.stations.map(Number).filter(Number.isFinite)
      : null;
    const allowedStations = allowedStationsOf(req.user);
    const stations = requestedStations && allowedStations
      ? requestedStations.filter((station) => allowedStations.includes(station))
      : requestedStations || allowedStations;

    const results = [];
    for (const id of networkIds) {
      results.push(range
        ? await stsSync.syncNetworkRange(id, range.from, range.to, stations)
        : await stsSync.syncNetwork(id));
    }
    const rows = results.reduce((s, r) => s + (r.rows || 0), 0);
    res.json({ ok: true, synced: rows, networks: results.length, range });
  } catch (error) {
    console.error('[Analytics] sync:', error.message);
    res.status(500).json({ error: error.message || 'Ошибка синхронизации' });
  }
});

module.exports = router;
