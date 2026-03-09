const { randomUUID } = require('crypto');

function ensureObject(value) {
  if (!value) {
    return {};
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return {};
    }
  }

  if (typeof value === 'object') {
    return value;
  }

  return {};
}

function normalizeNetworkApiSettings(value) {
  const settings = ensureObject(value);
  if (!Object.keys(settings).length) {
    return undefined;
  }

  return {
    ...settings,
    lastSync: settings.lastSync ? new Date(settings.lastSync) : undefined,
  };
}

function normalizeExternalCode(row) {
  return {
    id: String(row.id),
    nomenclatureId: String(row.nomenclature_id || row.nomenclatureId),
    systemType: row.system_type || row.systemType || 'OTHER',
    externalCode: row.external_code || row.externalCode || '',
    description: row.description || undefined,
    createdAt: new Date(row.created_at || row.createdAt || Date.now()),
    updatedAt: new Date(row.updated_at || row.updatedAt || row.created_at || row.createdAt || Date.now()),
  };
}

function normalizeNomenclature(row, externalCodes = []) {
  return {
    id: String(row.id),
    networkId: String(row.network_id || row.networkId),
    networkName: row.network_name || row.networkName || row.networks?.name || '',
    name: row.name,
    internalCode: row.internal_code || row.internalCode || '',
    networkApiCode: row.network_api_code || row.networkApiCode || undefined,
    networkApiSettings: normalizeNetworkApiSettings(row.network_api_settings || row.networkApiSettings),
    externalCodes: externalCodes.map(normalizeExternalCode),
    description: row.description || undefined,
    status: row.status || 'active',
    createdAt: new Date(row.created_at || row.createdAt || Date.now()),
    updatedAt: new Date(row.updated_at || row.updatedAt || row.created_at || row.createdAt || Date.now()),
    createdBy: row.created_by || row.createdBy || undefined,
    updatedBy: row.updated_by || row.updatedBy || undefined,
  };
}

function buildNetworkApiSettings(input) {
  if (!input?.networkApiEnabled) {
    return null;
  }

  return {
    enabled: true,
    endpoint: input.networkApiCode
      ? `/api/v1/fuel-types/${String(input.networkApiCode).toLowerCase()}`
      : undefined,
    priority: 1,
    lastSync: undefined,
    syncStatus: 'pending',
  };
}

function buildNomenclatureRecord(input, actorUserId, options = {}) {
  const now = options.updatedAt || new Date().toISOString();
  return {
    network_id: input.networkId,
    name: input.name,
    internal_code: input.internalCode,
    network_api_code: input.networkApiCode || null,
    network_api_settings: buildNetworkApiSettings(input),
    description: input.description || null,
    status: input.status || 'active',
    created_by: options.includeCreatedBy ? (actorUserId || 'system') : undefined,
    updated_by: actorUserId || 'system',
    updated_at: now,
  };
}

function buildExternalCodeRecords(nomenclatureId, externalCodes) {
  return (externalCodes || []).map((code) => ({
    id: code.id || randomUUID(),
    nomenclature_id: nomenclatureId,
    system_type: code.systemType,
    external_code: code.externalCode,
    description: code.description || null,
  }));
}

module.exports = {
  buildExternalCodeRecords,
  buildNomenclatureRecord,
  ensureObject,
  normalizeExternalCode,
  normalizeNomenclature,
};
