const pgSource = require('./orgPgSource');

function getRequestedSource() {
  return 'pg';
}

function getSource() {
  return pgSource;
}

module.exports = {
  addExternalCode: (...args) => getSource().addExternalCode(...args),
  loadTradelinkCodesForNetwork: (...args) => getSource().loadTradelinkCodesForNetwork(...args),
  createNetwork: (...args) => getSource().createNetwork(...args),
  createTradingPoint: (...args) => getSource().createTradingPoint(...args),
  deleteNetwork: (...args) => getSource().deleteNetwork(...args),
  deleteTradingPoint: (...args) => getSource().deleteTradingPoint(...args),
  findAliasAccess: (...args) => getSource().findAliasAccess(...args),
  findAliasReverse: (...args) => getSource().findAliasReverse(...args),
  findTradingPointId: (...args) => getSource().findTradingPointId(...args),
  getAliasExpansionsForSystem: (...args) => getSource().getAliasExpansionsForSystem(...args),
  getOutgoingAliasesFromSystem: (...args) => getSource().getOutgoingAliasesFromSystem(...args),
  getNetworkById: (...args) => getSource().getNetworkById(...args),
  getNetworks: (...args) => getSource().getNetworks(...args),
  getRequestedSource,
  getTradingPointById: (...args) => getSource().getTradingPointById(...args),
  getTradingPoints: (...args) => getSource().getTradingPoints(...args),
  removeExternalCode: (...args) => getSource().removeExternalCode(...args),
  updateBillAcceptorThresholds: (...args) => getSource().updateBillAcceptorThresholds(...args),
  updateExternalCode: (...args) => getSource().updateExternalCode(...args),
  updateFuelLevelThresholds: (...args) => getSource().updateFuelLevelThresholds(...args),
  updateNetwork: (...args) => getSource().updateNetwork(...args),
  updateTradingPoint: (...args) => getSource().updateTradingPoint(...args),
};
