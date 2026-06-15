const pgSource = require('./corporateOrdersPgSource');

function getSource() {
  return pgSource;
}

module.exports = {
  getCorporateOrders: (...args) => getSource().getCorporateOrders(...args),
  getCorporateOrderById: (...args) => getSource().getCorporateOrderById(...args),
  createCorporateOrder: (...args) => getSource().createCorporateOrder(...args),
  deleteCorporateOrder: (...args) => getSource().deleteCorporateOrder(...args),
};
