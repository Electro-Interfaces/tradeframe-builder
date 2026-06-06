/**
 * TradeLink Integration API proxy routes — состояние связи станций для карточки «Связь».
 * Клиент Hub (ключ, кэш) — services/tradelinkProxyService.js,
 * резолв ноды↔точки и маппинг полей — services/tradelinkStatusMapper.js.
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getUserScope, hasNetworkAccess } = require('../middleware/scopeFilter');
const orgDataSource = require('../services/org/orgDataSource');
const tradelinkProxy = require('../services/tradelinkProxyService');
const mapper = require('../services/tradelinkStatusMapper');

const router = express.Router();

router.use(requireAuth);

// ─── Резолв сети и карты маппинга ──────────────────────

async function resolveNetwork(networkId) {
  if (!networkId) return null;
  const nets = await orgDataSource.getNetworks();
  return nets.find(
    (n) => n.id === networkId || String(n.external_id) === String(networkId)
  ) || null;
}

// Карты для resolveTradingPoint: по node-ID (external_code), по коду станции, по имени.
async function buildMaps(network) {
  const [codes, points] = await Promise.all([
    orgDataSource.loadTradelinkCodesForNetwork(network.external_id || network.id),
    orgDataSource.getTradingPoints(network.id),
  ]);
  const byNodeId = new Map(codes.map((c) => [c.node_id, c.trading_point_id]));
  const byCode = new Map();
  const byName = new Map();
  for (const p of points) {
    if (p.external_id) byCode.set(String(p.external_id), p.id);
    const norm = mapper.normalizeName(p.name);
    if (norm) byName.set(norm, p.id);
  }
  return { byNodeId, byCode, byName };
}

async function fetchNodes() {
  const data = await tradelinkProxy.getConnectivity();
  return Array.isArray(data?.nodes) ? data.nodes : [];
}

// ─── Middleware: доступ к сети по scope ────────────────

async function validateNetworkAccess(req, res, next) {
  try {
    const networkId = req.query.networkId;
    if (!networkId) {
      return res.status(400).json({ error: 'Не указан параметр networkId' });
    }
    const network = await resolveNetwork(networkId);
    if (!network) {
      return res.status(404).json({ error: 'Сеть не найдена' });
    }
    const scope = getUserScope(req.user);
    if (scope.hasRestrictions && !hasNetworkAccess(network, scope)) {
      return res.status(403).json({ error: 'Нет доступа к данным этой сети' });
    }
    req._network = network;
    return next();
  } catch (error) {
    console.error('[TradeLink] validateNetworkAccess error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

// ─── Cache management ──────────────────────────────────

router.get('/_cache/stats', (req, res) => {
  res.json(tradelinkProxy.getCacheStats());
});

router.post('/_cache/clear', (req, res) => {
  const previousStats = tradelinkProxy.clearCache();
  res.json({ message: 'Cache cleared', previousStats });
});

// ─── GET /nodes — карточки станций выбранной сети (bulk) ──

router.get('/nodes', validateNetworkAccess, async (req, res) => {
  try {
    const network = req._network;
    const [maps, nodes] = await Promise.all([buildMaps(network), fetchNodes()]);

    const cards = [];
    for (const node of nodes) {
      const resolved = mapper.resolveTradingPoint(node, maps);
      if (resolved.tradingPointId) {
        cards.push(mapper.mapStation(node, resolved, null));
      }
    }

    const mappedIds = new Set(cards.map((c) => c.nodeId));
    const unmappedTerminals = nodes.filter(
      (n) => String(n.runtimeProfile || '').includes('terminal') && !mappedIds.has(n.id)
    );
    if (unmappedTerminals.length) {
      console.log(
        `[TradeLink] network=${network.external_id || network.id}: ` +
        `${unmappedTerminals.length} терминал-нод не сопоставлено (${unmappedTerminals.map((n) => n.id).join(', ')})`
      );
    }

    res.json(cards);
  } catch (error) {
    console.error('[TradeLink] GET /nodes error:', error.message);
    res.status(error.response?.status || 503).json({ error: 'TradeLink Hub error', message: error.message });
  }
});

// ─── GET /station-status — состояние одной станции по коду ──
// Карточка «Связь»: bulk /connectivity (резолв) + /diagnostics (overlayIp, события).
router.get('/station-status', validateNetworkAccess, async (req, res) => {
  try {
    const station = String(req.query.station || '');
    if (!station) {
      return res.status(400).json({ error: 'Не указан параметр station' });
    }
    const network = req._network;
    const [maps, nodes] = await Promise.all([buildMaps(network), fetchNodes()]);
    const targetTpId = maps.byCode.get(station) || null;

    let matched = null;
    // 1) Нода, сопоставленная с торговой точкой этой сети.
    for (const node of nodes) {
      const resolved = mapper.resolveTradingPoint(node, maps);
      if (targetTpId && resolved.tradingPointId === targetTpId) {
        matched = { node, resolved };
        break;
      }
    }
    // 2) Fallback — прямое совпадение по номеру станции из имени ноды.
    if (!matched) {
      const node = nodes.find((n) => mapper.getStationNumber(n) === station);
      if (node) matched = { node, resolved: mapper.resolveTradingPoint(node, maps) };
    }

    if (!matched) {
      return res.json(null); // у станции нет сопоставленной ноды — не ошибка
    }

    const diagnostics = await tradelinkProxy.getNodeDiagnostics(matched.node.id).catch(() => null);
    res.json(mapper.mapStation(matched.node, matched.resolved, diagnostics));
  } catch (error) {
    console.error('[TradeLink] GET /station-status error:', error.message);
    res.status(error.response?.status || 503).json({ error: 'TradeLink Hub error', message: error.message });
  }
});

// ─── GET /nodes/:id — детальная карточка станции (с диагностикой) ──

router.get('/nodes/:id', validateNetworkAccess, async (req, res) => {
  try {
    const nodeId = req.params.id;
    const network = req._network;
    const [maps, nodes, diagnostics] = await Promise.all([
      buildMaps(network),
      fetchNodes(),
      tradelinkProxy.getNodeDiagnostics(nodeId).catch(() => null),
    ]);

    const node = nodes.find((n) => n.id === nodeId) || diagnostics;
    if (!node) {
      return res.status(404).json({ error: 'Нода не найдена' });
    }
    const resolved = mapper.resolveTradingPoint(node, maps);
    res.json(mapper.mapStation(node, resolved, diagnostics));
  } catch (error) {
    console.error('[TradeLink] GET /nodes/:id error:', error.message);
    res.status(error.response?.status || 503).json({ error: 'TradeLink Hub error', message: error.message });
  }
});

module.exports = router;
module.exports.warmupCache = async () => {
  try {
    await tradelinkProxy.getConnectivity();
  } catch (error) {
    console.error('[TradeLink] cache warmup failed:', error.message);
  }
};
