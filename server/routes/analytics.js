/**
 * Аналитика из материализованной таблицы sts_transactions.
 * Отдаёт готовые агрегаты (KPI + разбивки) и пагинированный список операций —
 * браузер больше не тащит сотни тысяч сырых транзакций и не суммирует их сам.
 */
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getUserScope, getAllowedNetworkIds } = require('../middleware/scopeFilter');
const analytics = require('../services/analytics/analyticsPgSource');
const stsSync = require('../services/analytics/stsSync');

const router = express.Router();
router.use(requireAuth);

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
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'Параметры from и to обязательны' });
    const data = await analytics.getOverview({ networkIds, from, to, allowedStations: allowedStationsOf(req.user) });
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
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'Параметры from и to обязательны' });
    const data = await analytics.getDetailedAnalytics({ networkIds, from, to, allowedStations: allowedStationsOf(req.user) });
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
    const { from, to, fuels, payments, station, shift, receipt, pos, card, search, page, pageSize } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'Параметры from и to обязательны' });
    const splitCsv = (v) => (v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : []);
    const data = await analytics.getOperations({
      networkIds, from, to, allowedStations: allowedStationsOf(req.user),
      fuels: splitCsv(fuels), payments: splitCsv(payments),
      station, shift, receipt, pos, card, search, page, pageSize,
    });
    res.json(data);
  } catch (error) {
    console.error('[Analytics] operations:', error.message);
    res.status(500).json({ error: error.message || 'Ошибка аналитики' });
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
// Синкает только «хвост» (сегодня + незакрытые дни через курсор) — быстро.
router.post('/sync', async (req, res) => {
  try {
    const networkIds = await resolveNetworkIds(req);
    if (!networkIds.length) return res.status(400).json({ error: 'Сеть не выбрана или нет доступа' });
    const results = [];
    for (const id of networkIds) {
      results.push(await stsSync.syncNetwork(id));
    }
    const rows = results.reduce((s, r) => s + (r.rows || 0), 0);
    res.json({ ok: true, synced: rows, networks: results.length });
  } catch (error) {
    console.error('[Analytics] sync:', error.message);
    res.status(500).json({ error: error.message || 'Ошибка синхронизации' });
  }
});

module.exports = router;
