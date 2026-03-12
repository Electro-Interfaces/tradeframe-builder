const pgSource = require('./tankCalibrationPgSource');
const tablePgSource = require('./tankCalibrationTablePgSource');

function getRequestedSource() {
  return 'pg';
}

function getSource() {
  return pgSource;
}

module.exports = {
  applyCalibrationTable: (...args) => tablePgSource.applyCalibrationTable(...args),
  approveCalibrationTable: (...args) => tablePgSource.approveCalibrationTable(...args),
  createCalibrationTable: (...args) => tablePgSource.createCalibrationTable(...args),
  deleteCalibrationSettings: (...args) => getSource().deleteCalibrationSettings(...args),
  deleteCalibrationTable: (...args) => tablePgSource.deleteCalibrationTable(...args),
  downloadCalibrationTable: (...args) => tablePgSource.downloadCalibrationTable(...args),
  getCalibrationTable: (...args) => tablePgSource.getCalibrationTable(...args),
  getCalibrationSettings: (...args) => getSource().getCalibrationSettings(...args),
  getCalibrationTables: (...args) => tablePgSource.getCalibrationTables(...args),
  getRequestedSource,
  rejectCalibrationTable: (...args) => tablePgSource.rejectCalibrationTable(...args),
  saveCalibrationSettings: (...args) => getSource().saveCalibrationSettings(...args),
  setCalibrationStatus: (...args) => getSource().setCalibrationStatus(...args),
};
