/**
 * STS API proxy routes.
 * Бизнес-логика (кэш, токены, dedup) — в services/stsProxyService.js
 */

const express = require('express');
const NodeCache = require('node-cache');
const { requireAuth, tryAuth } = require('../middleware/auth');
const { validateStsAccess } = require('../middleware/scopeFilter');
const stsProxy = require('../services/stsProxyService');
const orgDataSource = require('../services/org/orgDataSource');

const router = express.Router();

// Кэш ГОТОВОГО результата агрегации «Остатки» по станции.
// Раньше кэшировались только STS-ответы (shifts/shift_report), а сама агрегация
// десятков отчётов пересчитывалась на КАЖДЫЙ заход — отсюда задержка даже при
// тёплом STS-кэше. Кэшируем результат по (system, station, период).
// Умный TTL: закрытый период (не включает сегодня) неизменен → долго; период с
// сегодняшним днём меняется в течение смены → коротко.
const fuelInvCache = new NodeCache({ stdTTL: 900, maxKeys: 4000, useClones: false });
const FUELINV_TTL_CLOSED = 6 * 3600; // закрытый период — 6ч
const FUELINV_TTL_TODAY = 600;       // включает сегодня — 10 мин

function fuelInvTtl(dt_end) {
  const end = new Date(dt_end);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return end >= today ? FUELINV_TTL_TODAY : FUELINV_TTL_CLOSED;
}

// Обёртка над aggregateStationInventory с кэшем результата + дедупликацией in-flight
const fuelInvInflight = new Map();
async function aggregateStationInventoryCached(system, station, periodStart, periodEnd, dt_beg, dt_end, userHeaders) {
  const key = `fuelinv:${system}:${station.id}:${dt_beg}:${dt_end}`;
  const cached = fuelInvCache.get(key);
  if (cached !== undefined) return cached;
  if (fuelInvInflight.has(key)) return fuelInvInflight.get(key);

  const promise = aggregateStationInventory(system, station, periodStart, periodEnd, dt_beg, dt_end, userHeaders)
    .then((result) => {
      fuelInvCache.set(key, result, fuelInvTtl(dt_end));
      return result;
    })
    .finally(() => fuelInvInflight.delete(key));
  fuelInvInflight.set(key, promise);
  return promise;
}

// /v1/services — справочник типов топлива, не требует строгой авторизации
router.get('/v1/services', tryAuth, async (req, res) => {
  try {
    const client = await stsProxy.getStsClient(req);
    const response = await client.get('/v1/services', {
      params: req.query,
      headers: stsProxy.jwtToken ? { Authorization: `Bearer ${stsProxy.jwtToken}` } : {},
      timeout: 10000,
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Авторизация + проверка scope для остальных STS-запросов
router.use(requireAuth);
router.use(validateStsAccess);

// Логирование non-GET запросов
router.use((req, res, next) => {
  req.startTime = Date.now();
  if (req.method !== 'GET') {
    console.log(`[STS Proxy] ${req.method} ${req.path}`, req.query, req.method === 'POST' ? JSON.stringify(req.body).slice(0, 200) : '');
  }
  next();
});

// ─── Cache management ──────────────────────────────────

router.get('/_cache/stats', (req, res) => {
  res.json(stsProxy.getCacheStats());
});

router.post('/_cache/clear', (req, res) => {
  const previousStats = stsProxy.clearCache();
  res.json({ message: 'Cache cleared successfully', previousStats });
});

// ─── STS API endpoints (proxy) ─────────────────────────

router.get('/v1/transactions', (req, res) => stsProxy.proxyRequest(req, res));
router.get('/v2/transactions', (req, res) => stsProxy.proxyRequest(req, res));

router.get('/v1/info', (req, res) => stsProxy.proxyRequest(req, res));
router.get('/v2/info', (req, res) => stsProxy.proxyRequest(req, res));

router.get('/v1/tanks', (req, res) => stsProxy.proxyRequest(req, res));
router.get('/v1/shifts', (req, res) => stsProxy.proxyRequest(req, res));

router.get('/v1/coupons', (req, res) => stsProxy.proxyRequest(req, res));
router.get('/v1/coupons_manual', (req, res) => stsProxy.proxyRequest(req, res));
router.post('/v1/control/coupon', (req, res) => stsProxy.proxyRequest(req, res));

router.get('/v1/report/receipts', (req, res) => stsProxy.proxyRequest(req, res));
router.get('/v1/report/shift_report', (req, res) => stsProxy.proxyRequest(req, res));

router.get('/v1/prices', (req, res) => stsProxy.proxyRequest(req, res));
router.get('/v1/schedule/prices/:station_number', (req, res) => stsProxy.proxyRequest(req, res));
router.get('/v1/pos/prices/:station_number', (req, res) => stsProxy.proxyRequest(req, res));

router.post('/v1/control/shift_open', (req, res) => stsProxy.proxyRequest(req, res));
router.post('/v1/control/shift_close', (req, res) => stsProxy.proxyRequest(req, res));

// ─── Fuel inventory (server-side aggregation) ──────────

router.post('/fuel-inventory', async (req, res) => {
  const { system, stations, dt_beg, dt_end, allowedStations } = req.body;

  if (!system || !stations || !dt_beg || !dt_end) {
    return res.status(400).json({ error: 'Missing required parameters: system, stations, dt_beg, dt_end' });
  }

  try {
    const userHeaders = {
      'x-user-id': req.headers['x-user-id'] || '',
      'x-user-name': req.headers['x-user-name'] || '',
    };

    const periodStart = new Date(dt_beg);
    const periodEnd = new Date(dt_end);

    const allowedSet = allowedStations ? new Set(allowedStations.map(String)) : null;
    const filteredStations = stations.filter((s) => !allowedSet || allowedSet.has(String(s.id)));

    const results = await Promise.all(filteredStations.map(async (station) => {
      try {
        return await aggregateStationInventoryCached(system, station, periodStart, periodEnd, dt_beg, dt_end, userHeaders);
      } catch (e) {
        console.error(`[Fuel Inventory] Error for station ${station.id}:`, e.message);
        return [];
      }
    }));

    res.json(results.flat());
  } catch (error) {
    console.error('[Fuel Inventory] Error:', error.message);
    res.status(500).json({ error: 'Failed to load fuel inventory', message: error.message });
  }
});

// ─── Fuel inventory helper ─────────────────────────────

async function aggregateStationInventory(system, station, periodStart, periodEnd, dt_beg, dt_end, userHeaders) {
  // 1. Смены
  const shiftsResponse = await stsProxy.stsInternalRequest('/v1/shifts', { system, station: station.id }, userHeaders);
  let allShifts = [];
  if (Array.isArray(shiftsResponse)) {
    allShifts = shiftsResponse.length > 0 && shiftsResponse[0].shift !== undefined
      ? shiftsResponse
      : shiftsResponse[0]?.shifts || [];
  } else if (shiftsResponse?.shifts) {
    allShifts = shiftsResponse.shifts;
  }

  const validShifts = allShifts
    .filter((shift) => {
      const openDate = shift.dt_open ? new Date(shift.dt_open) : null;
      return openDate && openDate >= periodStart && openDate <= periodEnd;
    })
    .sort((a, b) => new Date(a.dt_open).getTime() - new Date(b.dt_open).getTime());

  if (validShifts.length === 0) return [];

  // 2. Ёмкости резервуаров
  const tankCapacities = new Map();
  try {
    const tankHistory = await stsProxy.stsInternalRequest('/v1/tank_history', { system, station: station.id, dt_beg, dt_end }, userHeaders);
    if (Array.isArray(tankHistory)) {
      const latest = new Map();
      tankHistory.forEach((record) => {
        if (record.number && record.volume_max) {
          const existing = latest.get(record.number);
          if (!existing || new Date(record.dt) > new Date(existing.dt)) {
            latest.set(record.number, record);
          }
        }
      });
      latest.forEach((record, num) => tankCapacities.set(num, parseFloat(record.volume_max)));
    }
  } catch { /* ignore */ }

  // 3. Сменные отчёты (батчами по 20)
  const shiftReports = [];
  const BATCH_SIZE = 20;
  for (let i = 0; i < validShifts.length; i += BATCH_SIZE) {
    const batch = validShifts.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(async (shift) => {
      try {
        const report = await stsProxy.stsInternalRequest('/v1/report/shift_report', { system, station: station.id, shift: shift.shift }, userHeaders);
        let data = Array.isArray(report) && report.length > 0 ? report[0] : report;
        if (data?.release?.length > 0) {
          return { shiftNumber: shift.shift, shiftDate: shift.dt_close || shift.dt_open, data };
        }
        return null;
      } catch { return null; }
    }));
    shiftReports.push(...batchResults.filter(Boolean));
  }

  if (shiftReports.length === 0) return [];

  // 4. Агрегация по резервуарам
  const tankDataMap = new Map();
  shiftReports.forEach((report) => {
    report.data.release.forEach((tank) => {
      const tankNumber = tank.tank;
      if (!tankDataMap.has(tankNumber)) {
        tankDataMap.set(tankNumber, {
          firstShift: report, lastShift: report,
          receipts: 0, sales: 0, receiptCount: 0, shiftCount: 0,
          capacity: tankCapacities.get(tankNumber) || 0,
          fuelCode: tank.service?.service_code || tank.fuel || 0,
          fuelName: tank.service?.service_name || 'Неизвестно',
          processedShifts: new Set(),
        });
      }
      const d = tankDataMap.get(tankNumber);
      if (new Date(report.shiftDate) > new Date(d.lastShift.shiftDate)) d.lastShift = report;
      const rv = parseFloat(tank.receipt?.volume || '0');
      d.receipts += rv;
      d.sales += parseFloat(tank.release?.volume || '0');
      if (rv > 0) d.receiptCount++;
      if (!d.processedShifts.has(report.shiftNumber)) { d.processedShifts.add(report.shiftNumber); d.shiftCount++; }
    });
  });

  // 5. Формирование результата
  const result = [];
  tankDataMap.forEach((d, tankNumber) => {
    const firstTank = d.firstShift.data.release.find((t) => t.tank === tankNumber);
    const lastTank = d.lastShift.data.release.find((t) => t.tank === tankNumber);
    const volumeEnd = parseFloat(lastTank?.doc_end?.volume || '0');
    result.push({
      station: station.id, stationName: station.name, tankNumber,
      fuelCode: d.fuelCode, fuelName: d.fuelName,
      volumeBook: volumeEnd,
      volumeBegin: parseFloat(firstTank?.doc_beg?.volume || '0'),
      volumeReceipts: d.receipts, volumeSales: d.sales,
      receiptCount: d.receiptCount, shiftCount: d.shiftCount,
      capacity: d.capacity, freeVolume: d.capacity - volumeEnd,
      fillPercent: d.capacity > 0 ? (volumeEnd / d.capacity) * 100 : 0,
      lastUpdate: d.lastShift.shiftDate,
      initialShift: { number: d.firstShift.shiftNumber, date: d.firstShift.shiftDate },
    });
  });
  return result;
}

// ─── Прогрев кэша «Остатки» при старте ─────────────────
// Холодный заход агрегирует сотни shift_report (STS отдаёт ~последовательно) —
// 15-20с. Отчёты закрытых смен неизменны (TTL 24ч), поэтому прогреваем кэш при
// старте backend: первый пользователь после рестарта не ждёт.
async function warmupCache() {
  try {
    const networks = await orgDataSource.getNetworks();
    const active = (networks || []).filter((n) => n && n.external_id);
    if (!active.length) return;

    const fmt = (d, eod) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${eod ? '23:59:59' : '00:00:00'}`;
    // Кэш «Остатков» — по ТОЧНОМУ периоду (fuelinv:sys:st:dt_beg:dt_end), поэтому
    // прогрев обязан совпасть с периодом, который открывает фронт по умолчанию
    // (последние 7 дней, daysAgoString(7)). Раньше грелся 31-дневный период —
    // другой ключ, промах кэша, каждый заход был холодным. Греем оба частых
    // периода: 7 дней (дефолт) и 31 день (месячный отчёт).
    const end = new Date();
    const WARMUP_PERIODS = [7, 31];

    let warmed = 0;
    for (const net of active) {
      let points;
      try {
        points = await orgDataSource.getTradingPoints(net.id);
      } catch {
        continue;
      }
      const stations = (points || [])
        .filter((p) => p && p.external_id)
        .map((p) => ({ id: p.external_id, name: p.name }));
      // Последовательно: STS отдаёт shift_report почти последовательно, параллелить
      // незачем и можно перегрузить внешний API.
      for (const days of WARMUP_PERIODS) {
        const start = new Date();
        start.setDate(start.getDate() - days);
        const dt_beg = fmt(start, false);
        const dt_end = fmt(end, true);
        const periodStart = new Date(dt_beg);
        const periodEnd = new Date(dt_end);
        for (const station of stations) {
          try {
            // Прогреваем СРАЗУ результат-кэш (а не только STS-ответы) — первый
            // заход после рестарта отдаётся из готового агрегата мгновенно.
            await aggregateStationInventoryCached(net.external_id, station, periodStart, periodEnd, dt_beg, dt_end, {});
            warmed++;
          } catch { /* станция пропущена — прогрев best-effort */ }
        }
      }
    }
    console.log(`[STS] Прогрев кэша «Остатки»: ${warmed} прогревов (${WARMUP_PERIODS.join('+')} дней)`);
  } catch (e) {
    console.error('[STS] Прогрев кэша «Остатки» не удался:', e.message);
  }
}

router.warmupCache = warmupCache;

// ─── Fallback ──────────────────────────────────────────

router.all('*', (req, res) => stsProxy.proxyRequest(req, res));

module.exports = router;
