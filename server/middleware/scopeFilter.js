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
    return { networkIds: new Set(), networkCodes: new Set(), hasRestrictions: true };
  }

  // Super admin — без ограничений
  if (SUPER_ADMIN_ROLES.includes(user.role)) {
    return { networkIds: new Set(), networkCodes: new Set(), hasRestrictions: false };
  }

  // Проверяем scope='global' — без ограничений
  const hasGlobalScope = user.roles.some(r => r.scope === 'global');
  if (hasGlobalScope) {
    return { networkIds: new Set(), networkCodes: new Set(), hasRestrictions: false };
  }

  const networkIds = new Set();
  const networkCodes = new Set();
  let hasRestrictions = false;

  user.roles.forEach(role => {
    if (role.scopeValues && role.scopeValues.length > 0) {
      hasRestrictions = true;
      if (role.scope === 'network') {
        role.scopeValues.forEach(id => networkIds.add(id));
      } else if (role.scope === 'trading_point' || role.scope === 'assigned') {
        role.scopeValues.forEach(scopeValue => {
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
    return { networkIds, networkCodes, hasRestrictions: false };
  }

  return { networkIds, networkCodes, hasRestrictions };
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
 * Кэш маппинга external_id -> network для проверки STS system параметра
 * Обновляется раз в 5 минут
 */
let networksByExternalId = null;
let networkCacheTime = 0;
const NETWORK_CACHE_TTL = 5 * 60 * 1000; // 5 минут

async function getNetworkByExternalId(externalId) {
  const now = Date.now();
  if (!networksByExternalId || now - networkCacheTime > NETWORK_CACHE_TTL) {
    try {
      const allNetworks = await orgDataSource.getNetworks();
      networksByExternalId = new Map();
      for (const n of allNetworks) {
        if (n.external_id) {
          networksByExternalId.set(String(n.external_id), n);
        }
      }
      networkCacheTime = now;
    } catch {
      networksByExternalId = networksByExternalId || new Map();
    }
  }
  return networksByExternalId.get(String(externalId)) || null;
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

  // Прямого доступа нет — проверяем alias-привязку: возможно, точка из этой
  // физической сети (network) одолжена в одну из разрешённых юзеру сетей.
  const stationParam = req.query.station || req.body?.station;
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
  filterNetworksByScope,
  filterTradingPointsByScope,
  validateStsAccess,
};
