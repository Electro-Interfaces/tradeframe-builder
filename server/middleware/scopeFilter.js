/**
 * Middleware для фильтрации данных по scope пользователя
 *
 * Роли имеют scope: global | network | trading_point | assigned
 * scopeValues содержат:
 *   - для scope='network': UUID сетей
 *   - для scope='trading_point'/'assigned': ID точек в формате {networkCode}-azs-{stationCode}
 *
 * super_admin/system_admin → полный доступ (scope не проверяется)
 */

const orgDataSource = require('../services/org/orgDataSource');

const SUPER_ADMIN_ROLES = ['super_admin', 'system_admin'];

/**
 * Извлекает разрешённые сети и коды из ролей пользователя
 * Возвращает { networkIds: Set<UUID>, networkCodes: Set<string>, hasRestrictions: boolean }
 */
function getUserScope(user) {
  if (!user || !user.roles) {
    return { networkIds: new Set(), networkCodes: new Set(), pointIds: new Set(), hasRestrictions: true };
  }

  // Super admin — без ограничений
  if (SUPER_ADMIN_ROLES.includes(user.role)) {
    return { networkIds: new Set(), networkCodes: new Set(), pointIds: new Set(), hasRestrictions: false };
  }

  // Проверяем scope='global' — без ограничений
  const hasGlobalScope = user.roles.some(r => r.scope === 'global');
  if (hasGlobalScope) {
    return { networkIds: new Set(), networkCodes: new Set(), pointIds: new Set(), hasRestrictions: false };
  }

  const networkIds = new Set();
  const networkCodes = new Set();
  const pointIds = new Set();
  let hasRestrictions = false;

  user.roles.forEach(role => {
    if (role.scopeValues && role.scopeValues.length > 0) {
      hasRestrictions = true;
      if (role.scope === 'network') {
        role.scopeValues.forEach(id => networkIds.add(id));
      } else if (role.scope === 'trading_point' || role.scope === 'assigned') {
        role.scopeValues.forEach(scopeValue => {
          // Полный id точки — для прямого доступа (устойчив к смене сети/external_id).
          pointIds.add(String(scopeValue));
          // Префикс кода сети — legacy-путь доступа «по сети».
          const parts = String(scopeValue).split('-azs-');
          if (parts.length === 2) {
            networkCodes.add(parts[0]);
          }
        });
      }
    }
  });

  // Если есть роли, но ни одна не имеет scopeValues — значит ограничений нет
  // (например, network_admin без scope_values = доступ ко всем сетям)
  if (!hasRestrictions) {
    return { networkIds, networkCodes, pointIds, hasRestrictions: false };
  }

  return { networkIds, networkCodes, pointIds, hasRestrictions };
}

/**
 * Проверяет доступ к сети (по id, code, или external_id)
 */
function hasNetworkAccess(network, scope) {
  if (!scope.hasRestrictions) return true;
  return scope.networkIds.has(network.id) ||
         scope.networkCodes.has(network.code) ||
         scope.networkCodes.has(network.external_id);
}

/**
 * Кэш списка сетей (и маппинга external_id -> network) для scope-проверок
 * Обновляется раз в 5 минут
 */
let networksCacheList = null;
let networksByExternalId = null;
let networkCacheTime = 0;
const NETWORK_CACHE_TTL = 5 * 60 * 1000; // 5 минут

async function getAllNetworksCached() {
  const now = Date.now();
  if (!networksCacheList || now - networkCacheTime > NETWORK_CACHE_TTL) {
    try {
      const allNetworks = await orgDataSource.getNetworks();
      networksCacheList = allNetworks;
      networksByExternalId = new Map();
      for (const n of allNetworks) {
        if (n.external_id) {
          networksByExternalId.set(String(n.external_id), n);
        }
      }
      networkCacheTime = now;
    } catch {
      networksCacheList = networksCacheList || [];
      networksByExternalId = networksByExternalId || new Map();
    }
  }
  return networksCacheList;
}

async function getNetworkByExternalId(externalId) {
  await getAllNetworksCached();
  return networksByExternalId.get(String(externalId)) || null;
}

/**
 * Разрешённые UUID сетей пользователя для фильтрации доменных данных
 * (корп. заказы, инвентаризация и т.п.).
 *
 * null — ограничений нет (super_admin/system_admin/global scope);
 * иначе Set<uuid> (возможно пустой — доступа нет никуда).
 * networkCodes из ролей trading_point/assigned резолвятся в UUID через кэш сетей.
 */
async function getAllowedNetworkIds(user) {
  const scope = getUserScope(user);
  if (!scope.hasRestrictions) return null;

  const ids = new Set();
  scope.networkIds.forEach(id => ids.add(String(id)));

  if (scope.networkCodes.size > 0) {
    const allNetworks = await getAllNetworksCached();
    for (const n of allNetworks) {
      if (scope.networkCodes.has(n.code) || scope.networkCodes.has(n.external_id)) {
        ids.add(String(n.id));
      }
    }
  }

  return ids;
}

/**
 * Middleware: фильтрует список сетей по scope пользователя
 * Добавляется ПОСЛЕ ответа в маршруте GET /api/networks
 */
function filterNetworksByScope(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    if (!Array.isArray(data)) {
      // Одиночная сеть — проверяем доступ
      if (data && data.id) {
        const scope = getUserScope(req.user);
        if (scope.hasRestrictions && !hasNetworkAccess(data, scope)) {
          return res.status(403).json({ error: 'Нет доступа к этой сети' });
        }
      }
      return originalJson(data);
    }

    const scope = getUserScope(req.user);
    if (!scope.hasRestrictions) {
      return originalJson(data);
    }

    const filtered = data.filter(network => hasNetworkAccess(network, scope));
    return originalJson(filtered);
  };
  next();
}

/**
 * Middleware: фильтрует торговые точки по scope пользователя
 */
function filterTradingPointsByScope(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    if (!Array.isArray(data)) {
      return originalJson(data);
    }

    const scope = getUserScope(req.user);
    if (!scope.hasRestrictions) {
      return originalJson(data);
    }

    // Фильтруем по network_id или по прямому ID точки
    const pointScopeValues = new Set();
    if (req.user && req.user.roles) {
      req.user.roles.forEach(role => {
        if ((role.scope === 'trading_point' || role.scope === 'assigned') &&
            role.scopeValues && role.scopeValues.length > 0) {
          role.scopeValues.forEach(v => pointScopeValues.add(v));
        }
      });
    }

    const filtered = data.filter(point => {
      // Доступ по сети
      if (scope.networkIds.has(point.network_id || point.networkId)) {
        return true;
      }
      // Доступ по коду сети (для trading_point scope через networkCode)
      if (point.network_code && scope.networkCodes.has(point.network_code)) {
        return true;
      }
      // Прямой доступ по ID точки
      if (pointScopeValues.has(point.id)) {
        return true;
      }
      return false;
    });

    return originalJson(filtered);
  };
  next();
}

/**
 * Middleware: проверяет доступ к STS system параметру
 * Требует requireAuth перед собой
 */
async function validateStsAccess(req, res, next) {
  const scope = getUserScope(req.user);
  if (!scope.hasRestrictions) {
    return next();
  }

  // Получаем system из query или body
  const systemId = req.query.system || req.body?.system;
  if (!systemId) {
    return next(); // Нет system — пропускаем, STS API сам вернёт ошибку
  }

  // Находим сеть по external_id (= STS system code)
  const network = await getNetworkByExternalId(systemId);
  if (!network) {
    return next(); // Сеть не найдена в нашей БД — пропускаем, STS API разберётся
  }

  if (hasNetworkAccess(network, scope)) {
    return next();
  }

  const stationParam = req.query.station || req.body?.station;

  // Прямой доступ по id точки (scope=trading_point): резолвим точку по
  // фактической сети + коду станции и сверяем с разрешёнными id. Устойчиво
  // к смене external_id и переезду точки между сетями (id точки opaque),
  // поэтому переживает миграцию ГИГ 65→15 и отказ от alias.
  if (scope.pointIds && scope.pointIds.size > 0 && stationParam != null) {
    const tpId = await orgDataSource.findTradingPointId(network.id, String(stationParam));
    if (tpId && scope.pointIds.has(tpId)) {
      return next();
    }
  }

  // Прямого доступа нет — проверяем alias-привязку: возможно, точка из этой
  // физической сети (network) одолжена в одну из разрешённых юзеру сетей.
  const aliasAllowed = await orgDataSource.findAliasAccess({
    sourceNetworkId: network.id,
    stationCode: stationParam ? String(stationParam) : null,
    allowedNetworkIds: Array.from(scope.networkIds),
    allowedNetworkCodes: Array.from(scope.networkCodes),
  });

  if (!aliasAllowed) {
    return res.status(403).json({
      error: 'Нет доступа к данным этой сети'
    });
  }

  return next();
}

module.exports = {
  getUserScope,
  hasNetworkAccess,
  getAllowedNetworkIds,
  filterNetworksByScope,
  filterTradingPointsByScope,
  validateStsAccess,
};
