/**
 * STS API proxy routes.
 * Бизнес-логика (кэш, токены, dedup) — в services/stsProxyService.js
 */

const express = require('express');
const { requireAuth, tryAuth } = require('../middleware/auth');
const { validateStsAccess } = require('../middleware/scopeFilter');
const stsProxy = require('../services/stsProxyService');

const router = express.Router();

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
        return await aggregateStationInventory(system, station, periodStart, periodEnd, dt_beg, dt_end, userHeaders);
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

// ─── Fallback ──────────────────────────────────────────

router.all('*', (req, res) => stsProxy.proxyRequest(req, res));

module.exports = router;
