function splitCalibrationSettings(input = {}) {
  const {
    tank_id,
    calibration_status = 'never',
    last_calibration_date = null,
    created_at,
    updated_at,
    ...settings
  } = input;

  return {
    tank_id,
    calibration_status,
    last_calibration_date,
    created_at,
    updated_at,
    settings,
  };
}

function normalizeCalibrationSettings(row) {
  if (!row) {
    return null;
  }

  const settings = row.settings && typeof row.settings === 'object'
    ? row.settings
    : {};

  return {
    tank_id: row.tank_id,
    ...settings,
    calibration_status: row.calibration_status || settings.calibration_status || 'never',
    last_calibration_date: row.last_calibration_date || settings.last_calibration_date || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

module.exports = {
  normalizeCalibrationSettings,
  splitCalibrationSettings,
};
