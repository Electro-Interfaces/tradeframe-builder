const crypto = require('crypto');

function generateStationId(networkCode, stationCode) {
  return `${networkCode}-azs-${stationCode}`;
}

function parseStationId(id) {
  const parts = String(id || '').split('-azs-');
  if (parts.length !== 2) {
    return null;
  }

  return {
    networkCode: parts[0],
    stationCode: parts[1],
  };
}

function createExternalCodeId() {
  return `ec-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function ensureObject(value, fallback = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function toDateString(value, fallback) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  return fallback || new Date().toISOString();
}

function mapExternalCodes(stationCode, dbCodes, fallbackDate) {
  const createdAt = toDateString(fallbackDate);
  const sourceCodes = ensureArray(dbCodes);

  if (sourceCodes.length === 0) {
    return [{
      id: `default-${stationCode}`,
      system: 'sts',
      code: stationCode,
      description: 'Код станции STS (по умолчанию)',
      isActive: true,
      metadata: { source: 'default' },
      createdAt,
      updatedAt: undefined,
    }];
  }

  return sourceCodes.map((externalCode) => ({
    id: externalCode.id || createExternalCodeId(),
    system: String(externalCode.system || 'sts').toLowerCase(),
    code: String(externalCode.code || stationCode),
    description: externalCode.description || '',
    isActive: externalCode.isActive !== false,
    metadata: ensureObject(externalCode.metadata),
    createdAt: toDateString(externalCode.createdAt, createdAt),
    updatedAt: externalCode.updatedAt ? toDateString(externalCode.updatedAt) : undefined,
  }));
}

function normalizeNetworkFromTenant(tenant) {
  const settings = ensureObject(tenant.settings);
  const stations = ensureArray(settings.stations);

  return {
    id: tenant.id,
    external_id: settings.external_id || tenant.code,
    name: tenant.name,
    description: settings.description || '',
    type: 'АЗС',
    pointsCount: stations.length,
    code: tenant.code,
    status: tenant.is_active ? 'active' : 'inactive',
    settings,
    created_at: tenant.created_at,
    updated_at: tenant.updated_at,
  };
}

function normalizeTradingPointFromTenant(tenant, station) {
  const stationCode = String(station.code || '');
  const stationName = station.name || `АЗС №${stationCode}`;

  return {
    id: generateStationId(tenant.code, stationCode),
    external_id: stationCode,
    networkId: tenant.id,
    networkName: tenant.name,
    name: stationName,
    description: station.description || `${tenant.name} - ${stationName}`,
    geolocation: {
      latitude: Number(station.latitude || 0),
      longitude: Number(station.longitude || 0),
      region: station.region || '',
      city: station.city || '',
      address: station.address || '',
    },
    phone: station.phone || '',
    email: station.email || '',
    website: station.website || '',
    isBlocked: station.active === false,
    blockReason: station.blockReason || '',
    schedule: ensureObject(station.schedule),
    services: ensureObject(station.services),
    billAcceptorThresholds: ensureObject(station.billAcceptorThresholds),
    fuelLevelThresholds: ensureObject(station.fuelLevelThresholds),
    externalCodes: mapExternalCodes(stationCode, station.external_codes, tenant.created_at),
    createdAt: toDateString(tenant.created_at),
    updatedAt: toDateString(tenant.updated_at, tenant.created_at),
  };
}

function normalizeNetworkFromPgRow(row) {
  return {
    id: row.id,
    external_id: row.external_id || row.code,
    name: row.name,
    description: row.description || '',
    type: row.network_type || 'АЗС',
    pointsCount: Number(row.points_count || 0),
    code: row.code,
    status: row.is_active ? 'active' : 'inactive',
    settings: ensureObject(row.settings),
    created_at: toDateString(row.created_at),
    updated_at: toDateString(row.updated_at, row.created_at),
  };
}

function normalizeTradingPointFromPgRow(row, externalCodes = []) {
  return {
    id: row.id,
    external_id: row.external_id || row.code,
    networkId: row.network_id,
    networkName: row.network_name,
    name: row.name,
    description: row.description || '',
    geolocation: {
      latitude: Number(row.latitude || 0),
      longitude: Number(row.longitude || 0),
      region: row.region || '',
      city: row.city || '',
      address: row.address || '',
    },
    phone: row.phone || '',
    email: row.email || '',
    website: row.website || '',
    isBlocked: Boolean(row.is_blocked || !row.is_active),
    blockReason: row.block_reason || '',
    schedule: ensureObject(row.schedule),
    services: ensureObject(row.services),
    billAcceptorThresholds: ensureObject(row.bill_acceptor_thresholds),
    fuelLevelThresholds: ensureObject(row.fuel_level_thresholds),
    externalCodes: externalCodes.map((externalCode) => ({
      id: externalCode.id,
      system: externalCode.system,
      code: externalCode.code,
      description: externalCode.description || '',
      isActive: externalCode.is_active !== false,
      metadata: ensureObject(externalCode.metadata),
      createdAt: toDateString(externalCode.created_at),
      updatedAt: externalCode.updated_at ? toDateString(externalCode.updated_at) : undefined,
    })),
    createdAt: toDateString(row.created_at),
    updatedAt: toDateString(row.updated_at, row.created_at),
  };
}

function buildStationPayload(input, defaults = {}) {
  return {
    code: String(input.external_id || defaults.code || ''),
    name: input.name || defaults.name || '',
    description: input.description || defaults.description || '',
    address: input.geolocation?.address ?? defaults.address ?? '',
    latitude: input.geolocation?.latitude ?? defaults.latitude ?? 0,
    longitude: input.geolocation?.longitude ?? defaults.longitude ?? 0,
    region: input.geolocation?.region ?? defaults.region ?? '',
    city: input.geolocation?.city ?? defaults.city ?? '',
    phone: input.phone ?? defaults.phone ?? '',
    email: input.email ?? defaults.email ?? '',
    website: input.website ?? defaults.website ?? '',
    active: input.isBlocked === undefined ? (defaults.active ?? true) : !input.isBlocked,
    blockReason: input.blockReason ?? defaults.blockReason ?? '',
    schedule: input.schedule ?? defaults.schedule ?? {},
    services: input.services ?? defaults.services ?? {},
    billAcceptorThresholds: input.billAcceptorThresholds ?? defaults.billAcceptorThresholds ?? {},
    fuelLevelThresholds: input.fuelLevelThresholds ?? defaults.fuelLevelThresholds ?? {},
    external_codes: ensureArray(defaults.external_codes),
  };
}

function transformTenantsToOrg(tenants) {
  const networks = [];
  const tradingPoints = [];
  const tradingPointExternalCodes = [];

  ensureArray(tenants)
    .filter((tenant) => tenant?.type === 'network')
    .forEach((tenant) => {
      const settings = ensureObject(tenant.settings);
      const stations = ensureArray(settings.stations);
      const { stations: _stations, ...networkSettings } = settings;

      networks.push({
        id: tenant.id,
        tenant_id: tenant.tenant_id || 'default',
        code: tenant.code,
        external_id: settings.external_id || tenant.code,
        name: tenant.name,
        description: settings.description || '',
        network_type: 'АЗС',
        source_type: tenant.type || 'network',
        settings: networkSettings,
        is_active: tenant.is_active !== false,
        created_at: toDateString(tenant.created_at),
        updated_at: toDateString(tenant.updated_at, tenant.created_at),
        deleted_at: tenant.deleted_at || null,
      });

      stations.forEach((station) => {
        const pointId = generateStationId(tenant.code, station.code);
        const pointCreatedAt = toDateString(tenant.created_at);
        const pointUpdatedAt = toDateString(tenant.updated_at, tenant.created_at);
        const stationName = station.name || `АЗС №${station.code}`;

        tradingPoints.push({
          id: pointId,
          network_id: tenant.id,
          code: String(station.code || ''),
          external_id: String(station.code || ''),
          name: stationName,
          description: station.description || `${tenant.name} - ${stationName}`,
          latitude: Number(station.latitude || 0),
          longitude: Number(station.longitude || 0),
          region: station.region || '',
          city: station.city || '',
          address: station.address || '',
          phone: station.phone || '',
          email: station.email || '',
          website: station.website || '',
          is_blocked: station.active === false,
          block_reason: station.blockReason || '',
          schedule: ensureObject(station.schedule),
          services: ensureObject(station.services),
          bill_acceptor_thresholds: ensureObject(station.billAcceptorThresholds),
          fuel_level_thresholds: ensureObject(station.fuelLevelThresholds),
          metadata: { source: 'supabase_tenants' },
          is_active: station.active !== false,
          created_at: pointCreatedAt,
          updated_at: pointUpdatedAt,
          deleted_at: null,
        });

        mapExternalCodes(station.code, station.external_codes, pointCreatedAt)
          .forEach((externalCode) => {
            tradingPointExternalCodes.push({
              id: externalCode.id,
              trading_point_id: pointId,
              system: externalCode.system,
              code: externalCode.code,
              description: externalCode.description || '',
              is_active: externalCode.isActive !== false,
              metadata: externalCode.metadata || {},
              created_at: toDateString(externalCode.createdAt, pointCreatedAt),
              updated_at: externalCode.updatedAt ? toDateString(externalCode.updatedAt) : null,
            });
          });
      });
    });

  return {
    networks,
    tradingPoints,
    tradingPointExternalCodes,
  };
}

module.exports = {
  buildStationPayload,
  createExternalCodeId,
  ensureArray,
  ensureObject,
  generateStationId,
  mapExternalCodes,
  normalizeNetworkFromPgRow,
  normalizeNetworkFromTenant,
  normalizeTradingPointFromPgRow,
  normalizeTradingPointFromTenant,
  parseStationId,
  toDateString,
  transformTenantsToOrg,
};
