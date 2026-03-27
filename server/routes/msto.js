/**
 * MSTO API proxy routes.
 * Бизнес-логика (кэш, токены, retry) — в services/mstoProxyService.js
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const mstoProxy = require('../services/mstoProxyService');

const router = express.Router();

// Логирование
router.use((req, res, next) => { req.startTime = Date.now(); next(); });

// ─── Health / Cache / Token ────────────────────────────

router.get('/health', requireAuth, async (req, res) => {
  try {
    await mstoProxy.getMstoClient();
    res.json({ status: 'ok', timestamp: new Date().toISOString(), ...mstoProxy.getTokenInfo() });
  } catch (error) {
    res.status(503).json({ status: 'error', message: error.message });
  }
});

router.post('/_cache/clear', requireAuth, (req, res) => {
  mstoProxy.clearCache();
  res.json({ message: 'Cache cleared successfully' });
});

router.post('/_token/refresh', requireAuth, async (req, res) => {
  try {
    await mstoProxy.invalidateAndRefreshToken();
    res.json({ message: 'Token refreshed successfully', ...mstoProxy.getTokenInfo() });
  } catch (error) {
    res.status(500).json({ error: 'Token refresh failed', message: error.message });
  }
});

// ─── Service Points ────────────────────────────────────

router.get('/servicePoints', async (req, res) => {
  try {
    const client = await mstoProxy.getMstoClient();
    const response = await client.get('/private/servicePoints');
    res.json(response.data);
  } catch (error) {
    if (error.response?.status === 403 || error.response?.status === 404 ||
        (error.response?.data && typeof error.response.data === 'string' && error.response.data.includes('Access Denied'))) {
      return res.json([]);
    }
    throw error;
  }
});

// ─── Transactions (с конвертацией дат) ─────────────────

function convertDateToMstoFormat(isoDate) {
  if (!isoDate) return null;
  if (/^\d{2}\.\d{2}\.\d{4}/.test(isoDate)) return isoDate;
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return null;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch { return null; }
}

function convertTransactionParams(req, res, next) {
  if (req.query.dateFrom) {
    const dateFrom = req.query.dateFrom.includes('T') ? req.query.dateFrom : `${req.query.dateFrom}T00:00:00`;
    req.query.dateFrom = convertDateToMstoFormat(dateFrom);
  }
  if (req.query.dateTo) {
    const dateTo = req.query.dateTo.includes('T') ? req.query.dateTo : `${req.query.dateTo}T23:59:59`;
    req.query.dateTo = convertDateToMstoFormat(dateTo);
  }
  if (req.query.operationResults && !req.query.operationResult) {
    const results = Array.isArray(req.query.operationResults) ? req.query.operationResults : req.query.operationResults.split(',');
    req.query.operationResult = results.join(',');
    delete req.query.operationResults;
  }
  if (req.query.operationResult === 'sw') req.query.operationResult = 'success,wait';
  if (req.query.servicePointIds && !req.query.servicePointId) {
    req.query.servicePointId = Array.isArray(req.query.servicePointIds) ? req.query.servicePointIds.join(',') : req.query.servicePointIds;
    delete req.query.servicePointIds;
  }
  if (!req.query.size) req.query.size = '2000';
  next();
}

router.get('/transactions', convertTransactionParams, async (req, res) => {
  try {
    const urlPath = '/private/transactions';
    const cacheKey = mstoProxy.generateCacheKey(urlPath, req.query);

    const cachedData = mstoProxy.getCache(cacheKey);
    if (cachedData !== undefined) return res.status(200).json(cachedData);

    const spMap = await mstoProxy.getServicePointsMap();

    let response;
    try {
      const client = await mstoProxy.getMstoClient();
      response = await client.get(urlPath, { params: req.query });
    } catch (error) {
      if (error.response?.status === 401) {
        await mstoProxy.invalidateAndRefreshToken();
        const client = await mstoProxy.getMstoClient();
        response = await client.get(urlPath, { params: req.query });
      } else throw error;
    }

    if (response.data?.models && Array.isArray(response.data.models)) {
      response.data.models = response.data.models.map((tx) => {
        if (tx.servicePointName && !tx.servicePointId) {
          const id = spMap[tx.servicePointName.toLowerCase()];
          if (id) tx.servicePointId = id;
        }
        return tx;
      });
    }

    mstoProxy.setCache(cacheKey, response.data, mstoProxy.getTTL(urlPath));
    res.status(200).json(response.data);
  } catch (error) {
    console.error(`[MSTO Proxy Error] ${error.message}`);
    if (error.response) {
      res.status(error.response.status).json({ error: 'MSTO API Error', message: error.response.data?.message || error.message, details: error.response.data });
    } else {
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }
});

// ─── Tariffs & Transaction details ─────────────────────

router.get('/tariffs', (req, res) => mstoProxy.proxyRequest(req, res, '/private/tariffs'));
router.get('/transactions/:id', (req, res) => mstoProxy.proxyRequest(req, res, `/private/transactions/${req.params.id}`));

// ─── Orders API (no JWT) ──────────────────────────────

router.get('/orders/history', async (req, res) => {
  try { res.json(await mstoProxy.ordersApiRequest('/history', req.query)); }
  catch (error) { res.status(error.response?.status || 500).json({ error: 'Failed to fetch orders history', details: error.response?.data || error.message }); }
});

router.get('/orders/details', async (req, res) => {
  if (!req.query.sessionId) return res.status(400).json({ error: 'sessionId is required' });
  try { res.json(await mstoProxy.ordersApiRequest('/details', { sessionId: req.query.sessionId })); }
  catch (error) {
    if (error.response?.status === 404) return res.status(404).json({ error: 'Order not found' });
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch order details', details: error.response?.data || error.message });
  }
});

router.get('/orders/statuses', async (req, res) => {
  try { res.json(await mstoProxy.ordersApiRequest('/statuses')); }
  catch (error) { res.status(error.response?.status || 500).json({ error: 'Failed to fetch order statuses', details: error.response?.data || error.message }); }
});

// ─── Fallback ──────────────────────────────────────────

router.all('*', (req, res) => {
  const targetPath = req.path.startsWith('/private') ? req.path : `/private${req.path}`;
  mstoProxy.proxyRequest(req, res, targetPath);
});

module.exports = router;
module.exports.warmupCache = mstoProxy.warmupCache;
