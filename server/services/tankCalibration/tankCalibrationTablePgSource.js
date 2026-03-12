const postgres = require('../../db/pool');
const { normalizeCalibrationSettings } = require('./tankCalibrationTransforms');
const {
  buildCalibrationTableDownload,
  buildComparisonWithPrevious,
  normalizeCalibrationTable,
  normalizeCalibrationTablePoints,
} = require('./tankCalibrationTableTransforms');

function queryOne(client, text, params = []) {
  return client.query(text, params).then((result) => result.rows[0] || null);
}

function isValidDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime());
}

function assertCreatePayload(input = {}) {
  if (!input.tank_id) {
    throw new Error('tank_id is required');
  }

  const points = normalizeCalibrationTablePoints(input.table);
  if (!points.length) {
    throw new Error('Калибровочная таблица не содержит точек');
  }

  if (!isValidDateOnly(input.analysis_start_date) || !isValidDateOnly(input.analysis_end_date)) {
    throw new Error('analysis_start_date и analysis_end_date должны быть в формате YYYY-MM-DD');
  }

  if (new Date(`${input.analysis_start_date}T00:00:00Z`) > new Date(`${input.analysis_end_date}T00:00:00Z`)) {
    throw new Error('analysis_start_date не может быть позже analysis_end_date');
  }

  return points;
}

async function getCalibrationTables(tankId) {
  const { rows } = await postgres.query(
    `SELECT *
       FROM tank_calibration_tables
      WHERE tank_id = $1
      ORDER BY version DESC, created_at DESC`,
    [tankId]
  );

  return rows.map(normalizeCalibrationTable);
}

async function getCalibrationTable(tableId) {
  const row = await postgres.queryOne(
    `SELECT *
       FROM tank_calibration_tables
      WHERE id = $1::uuid
      LIMIT 1`,
    [tableId]
  );

  return normalizeCalibrationTable(row);
}

async function createCalibrationTable(input, actorUserId) {
  const normalizedTable = assertCreatePayload(input);

  return postgres.withTransaction(async (client) => {
    const previousRow = await queryOne(
      client,
      `SELECT *
         FROM tank_calibration_tables
        WHERE tank_id = $1
        ORDER BY version DESC
        LIMIT 1`,
      [input.tank_id]
    );

    const version = (Number(previousRow?.version) || 0) + 1;

    let settingsSnapshot = input.calibration_settings_snapshot;
    if (!settingsSnapshot) {
      const settingsRow = await queryOne(
        client,
        `SELECT *
           FROM tank_calibration_settings
          WHERE tank_id = $1
          LIMIT 1`,
        [input.tank_id]
      );

      settingsSnapshot = normalizeCalibrationSettings(settingsRow) || { tank_id: input.tank_id };
    }

    const comparisonWithPrevious = input.comparison_with_previous
      || buildComparisonWithPrevious(normalizedTable, previousRow?.table_points);

    const insertedRow = await queryOne(
      client,
      `INSERT INTO tank_calibration_tables (
         tank_id,
         version,
         is_active,
         status,
         table_points,
         analysis_start_date,
         analysis_end_date,
         calibration_settings_snapshot,
         statistics,
         diagnostics,
         comparison_with_previous,
         created_by,
         creation_notes
       ) VALUES (
         $1,
         $2,
         false,
         'draft',
         $3::jsonb,
         $4::date,
         $5::date,
         $6::jsonb,
         $7::jsonb,
         $8::jsonb,
         $9::jsonb,
         $10::uuid,
         $11
       )
       RETURNING *`,
      [
        input.tank_id,
        version,
        JSON.stringify(normalizedTable),
        input.analysis_start_date,
        input.analysis_end_date,
        JSON.stringify(settingsSnapshot || {}),
        input.statistics ? JSON.stringify(input.statistics) : null,
        input.diagnostics ? JSON.stringify(input.diagnostics) : null,
        comparisonWithPrevious ? JSON.stringify(comparisonWithPrevious) : null,
        actorUserId || null,
        input.creation_notes || '',
      ]
    );

    return normalizeCalibrationTable(insertedRow);
  });
}

async function approveCalibrationTable(tableId, actorUserId, notes = '') {
  return postgres.withTransaction(async (client) => {
    const existing = await queryOne(
      client,
      `SELECT *
         FROM tank_calibration_tables
        WHERE id = $1::uuid
        LIMIT 1`,
      [tableId]
    );

    if (!existing) {
      throw new Error('Калибровочная таблица не найдена');
    }

    if (!['draft', 'pending_approval'].includes(existing.status)) {
      throw new Error('Утвердить можно только черновик калибровочной таблицы');
    }

    const updated = await queryOne(
      client,
      `UPDATE tank_calibration_tables
          SET status = 'approved',
              approved_by = $2::uuid,
              approved_at = now(),
              approval_notes = $3,
              rejected_by = NULL,
              rejected_at = NULL,
              rejection_reason = ''
        WHERE id = $1::uuid
      RETURNING *`,
      [tableId, actorUserId || null, notes || '']
    );

    return normalizeCalibrationTable(updated);
  });
}

async function rejectCalibrationTable(tableId, actorUserId, reason) {
  if (!reason || !reason.trim()) {
    throw new Error('Причина отклонения обязательна');
  }

  return postgres.withTransaction(async (client) => {
    const existing = await queryOne(
      client,
      `SELECT *
         FROM tank_calibration_tables
        WHERE id = $1::uuid
        LIMIT 1`,
      [tableId]
    );

    if (!existing) {
      throw new Error('Калибровочная таблица не найдена');
    }

    if (!['draft', 'pending_approval'].includes(existing.status)) {
      throw new Error('Отклонить можно только черновик калибровочной таблицы');
    }

    const updated = await queryOne(
      client,
      `UPDATE tank_calibration_tables
          SET status = 'rejected',
              rejected_by = $2::uuid,
              rejected_at = now(),
              rejection_reason = $3,
              approved_by = NULL,
              approved_at = NULL,
              approval_notes = ''
        WHERE id = $1::uuid
      RETURNING *`,
      [tableId, actorUserId || null, reason.trim()]
    );

    return normalizeCalibrationTable(updated);
  });
}

async function applyCalibrationTable(tableId, actorUserId) {
  return postgres.withTransaction(async (client) => {
    const existing = await queryOne(
      client,
      `SELECT *
         FROM tank_calibration_tables
        WHERE id = $1::uuid
        LIMIT 1`,
      [tableId]
    );

    if (!existing) {
      throw new Error('Калибровочная таблица не найдена');
    }

    if (existing.status !== 'approved') {
      throw new Error('Применить можно только утверждённую калибровочную таблицу');
    }

    if (existing.is_active) {
      return normalizeCalibrationTable(existing);
    }

    await client.query(
      `UPDATE tank_calibration_tables
          SET is_active = false
        WHERE tank_id = $1
          AND is_active = true`,
      [existing.tank_id]
    );

    const applied = await queryOne(
      client,
      `UPDATE tank_calibration_tables
          SET is_active = true,
              applied_by = $2::uuid,
              applied_at = now()
        WHERE id = $1::uuid
      RETURNING *`,
      [tableId, actorUserId || null]
    );

    await client.query(
      `INSERT INTO tank_calibration_settings (
         tank_id,
         settings,
         calibration_status,
         last_calibration_date,
         created_at,
         updated_at
       ) VALUES (
         $1,
         COALESCE($2::jsonb, '{}'::jsonb),
         'completed',
         now(),
         now(),
         now()
       )
       ON CONFLICT (tank_id) DO UPDATE
       SET calibration_status = 'completed',
           last_calibration_date = now(),
           updated_at = now()`,
      [
        existing.tank_id,
        existing.calibration_settings_snapshot
          ? JSON.stringify(existing.calibration_settings_snapshot)
          : JSON.stringify({}),
      ]
    );

    return normalizeCalibrationTable(applied);
  });
}

async function deleteCalibrationTable(tableId) {
  const existing = await postgres.queryOne(
    `SELECT id, is_active, status
       FROM tank_calibration_tables
      WHERE id = $1::uuid
      LIMIT 1`,
    [tableId]
  );

  if (!existing) {
    throw new Error('Калибровочная таблица не найдена');
  }

  if (existing.is_active) {
    throw new Error('Нельзя удалить активную калибровочную таблицу');
  }

  if (existing.status === 'approved') {
    throw new Error('Нельзя удалить утверждённую калибровочную таблицу');
  }

  await postgres.query(
    `DELETE FROM tank_calibration_tables
      WHERE id = $1::uuid`,
    [tableId]
  );
}

async function downloadCalibrationTable(tableId, format = 'csv') {
  const table = await getCalibrationTable(tableId);
  if (!table) {
    throw new Error('Калибровочная таблица не найдена');
  }

  if (!['csv', 'json'].includes(format)) {
    throw new Error('Поддерживаются только форматы csv и json');
  }

  return buildCalibrationTableDownload(table, format);
}

module.exports = {
  applyCalibrationTable,
  approveCalibrationTable,
  createCalibrationTable,
  deleteCalibrationTable,
  downloadCalibrationTable,
  getCalibrationTable,
  getCalibrationTables,
  rejectCalibrationTable,
};
