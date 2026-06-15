const pgSource = require('./corporateClientsPgSource');

function getSource() {
  return pgSource;
}

module.exports = {
  getCorporateClients: (...args) => getSource().getCorporateClients(...args),
  getCorporateClientById: (...args) => getSource().getCorporateClientById(...args),
  createCorporateClient: (...args) => getSource().createCorporateClient(...args),
  updateCorporateClient: (...args) => getSource().updateCorporateClient(...args),
  deleteCorporateClient: (...args) => getSource().deleteCorporateClient(...args),
  setActive: (...args) => getSource().setActive(...args),
};
