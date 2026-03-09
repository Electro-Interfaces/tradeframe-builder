const postgres = require('../../db/pool');
const {
  normalizeCalibrationSettings,
  splitCalibrationSettings,
} = require('./tankCalibrationTransforms');

async function getCalibrationSettings(tankId) {
  const row = await postgres.queryOne(
    `SELECT *
       FROM tank_calibration_settings
      WHERE tank_id = $1
      LIMIT 1`,
    [tankId]
  );

  return normalizeCalibrationSettings(row);
}

async function saveCalibrationSettings(settings) {
  if (!settings?.tank_id) {
    throw new Error('tank_id is required');
  }

  const record = splitCalibrationSettings(settings);
  const { rows } = await postgres.query(
    `INSERT INTO tank_calibration_settings (
       tank_id,
       settings,
       calibration_status,
       last_calibration_date,
       created_at,
       updated_at
     ) VALUES (
       $1, $2::jsonb, $3, $4::timestamptz, COALESCE($5::timestamptz, now()), now()
     )
     ON CONFLICT (tank_id) DO UPDATE
     SET settings = EXCLUDED.settings,
         calibration_status = EXCLUDED.calibration_status,
         last_calibration_date = EXCLUDED.last_calibration_date,
         updated_at = now()
     RETURNING *`,
    [
      record.tank_id,
      JSON.stringify(record.settings || {}),
      record.calibration_status,
      record.last_calibration_date || null,
      record.created_at || null,
    ]
  );

  return normalizeCalibrationSettings(rows[0]);
}

async function deleteCalibrationSettings(tankId) {
  await postgres.query(
    `DELETE FROM tank_calibration_settings
      WHERE tank_id = $1`,
    [tankId]
  );
}

async function setCalibrationStatus(tankId, calibrationStatus, options = {}) {
  const { rows } = await postgres.query(
    `UPDATE tank_calibration_settings
        SET calibration_status = $2,
            last_calibration_date = COALESCE($3::timestamptz, last_calibration_date),
            updated_at = now()
      WHERE tank_id = $1
      RETURNING *`,
    [
      tankId,
      calibrationStatus,
      options.lastCalibrationDate || null,
    ]
  );

  if (!rows[0]) {
    throw new Error('Calibration settings not found');
  }

  return normalizeCalibrationSettings(rows[0]);
}

module.exports = {
  deleteCalibrationSettings,
  getCalibrationSettings,
  saveCalibrationSettings,
  setCalibrationStatus,
};
