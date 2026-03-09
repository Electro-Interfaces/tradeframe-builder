const pgSource = require('./tankCalibrationPgSource');

function getRequestedSource() {
  return 'pg';
}

function getSource() {
  return pgSource;
}

module.exports = {
  deleteCalibrationSettings: (...args) => getSource().deleteCalibrationSettings(...args),
  getCalibrationSettings: (...args) => getSource().getCalibrationSettings(...args),
  getRequestedSource,
  saveCalibrationSettings: (...args) => getSource().saveCalibrationSettings(...args),
  setCalibrationStatus: (...args) => getSource().setCalibrationStatus(...args),
};
