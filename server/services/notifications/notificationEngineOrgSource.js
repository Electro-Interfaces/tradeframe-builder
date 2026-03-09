const orgPgSource = require('../org/orgPgSource');

function getOrgSource() {
  return orgPgSource;
}

function mapTradingPointToStation(point) {
  return {
    code: String(point.external_id || ''),
    external_id: String(point.external_id || ''),
    name: point.name || `АЗС ${point.external_id || ''}`,
    active: !point.isBlocked,
    address: point.geolocation?.address || '',
    latitude: Number(point.geolocation?.latitude || 0),
    longitude: Number(point.geolocation?.longitude || 0),
    region: point.geolocation?.region || '',
    city: point.geolocation?.city || '',
    phone: point.phone || '',
    email: point.email || '',
    website: point.website || '',
    blockReason: point.blockReason || '',
    schedule: point.schedule || {},
    services: point.services || {},
    billAcceptorThresholds: point.billAcceptorThresholds || {},
    fuelLevelThresholds: point.fuelLevelThresholds || {},
    external_codes: Array.isArray(point.externalCodes)
      ? point.externalCodes.map((code) => ({
          id: code.id,
          system: code.system,
          code: code.code,
          description: code.description,
          isActive: code.isActive,
          metadata: code.metadata || {},
          createdAt: code.createdAt,
          updatedAt: code.updatedAt,
        }))
      : [],
  };
}

async function mapNetwork(network) {
  if (!network) {
    return null;
  }

  const tradingPoints = await getOrgSource().getTradingPoints(network.id);

  return {
    id: network.id,
    code: network.code,
    name: network.name,
    external_id: network.external_id,
    type: 'network',
    is_active: network.status !== 'inactive',
    settings: {
      ...(network.settings || {}),
      external_id: network.external_id,
      stations: tradingPoints.map(mapTradingPointToStation),
    },
  };
}

async function getNetworksForEngine() {
  const networks = await getOrgSource().getNetworks();
  return Promise.all(networks.map(mapNetwork));
}

async function getNetworkByIdForEngine(networkId) {
  const network = await getOrgSource().getNetworkById(networkId);
  return mapNetwork(network);
}

module.exports = {
  getNetworkByIdForEngine,
  getNetworksForEngine,
};
