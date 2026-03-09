const pgSource = require('./nomenclaturePgSource');

function getRequestedSource() {
  return 'pg';
}

function getSource() {
  return pgSource;
}

module.exports = {
  activateNomenclature: (...args) => getSource().activateNomenclature(...args),
  addExternalCode: (...args) => getSource().addExternalCode(...args),
  archiveNomenclature: (...args) => getSource().archiveNomenclature(...args),
  createNomenclature: (...args) => getSource().createNomenclature(...args),
  deleteNomenclature: (...args) => getSource().deleteNomenclature(...args),
  getExternalCodeMappings: (...args) => getSource().getExternalCodeMappings(...args),
  getNomenclature: (...args) => getSource().getNomenclature(...args),
  getNomenclatureById: (...args) => getSource().getNomenclatureById(...args),
  getRequestedSource,
  removeExternalCode: (...args) => getSource().removeExternalCode(...args),
  updateNomenclature: (...args) => getSource().updateNomenclature(...args),
};
