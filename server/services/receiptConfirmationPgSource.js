const postgres = require('../db/pool');

async function getConfirmations(filters = {}) {
  const params = [];
  const conditions = [];

  if (filters.systemId) {
    params.push(filters.systemId);
    conditions.push(`system_id = $${params.length}`);
  }

  if (filters.stationNumber) {
    params.push(filters.stationNumber);
    conditions.push(`station_number = $${params.length}`);
  }

  if (filters.tankNumber) {
    params.push(filters.tankNumber);
    conditions.push(`tank_number = $${params.length}`);
  }

  if (filters.ttn) {
    params.push(filters.ttn);
    conditions.push(`ttn = $${params.length}`);
  }

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`status = $${params.length}`);
  }

  if (filters.dtBeg) {
    params.push(filters.dtBeg);
    conditions.push(`receipt_dt >= $${params.length}`);
  }

  if (filters.dtEnd) {
    params.push(filters.dtEnd);
    conditions.push(`receipt_dt <= $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await postgres.query(
    `SELECT * FROM receipt_confirmations ${where} ORDER BY updated_at DESC`,
    params
  );

  return rows.map(normalizeRow);
}

async function getConfirmationByKey(systemId, stationNumber, tankNumber, ttn, receiptDt) {
  const row = await postgres.queryOne(
    `SELECT * FROM receipt_confirmations
     WHERE system_id = $1 AND station_number = $2 AND tank_number = $3
       AND ttn = $4 AND receipt_dt = $5
     LIMIT 1`,
    [systemId, stationNumber, tankNumber, ttn, receiptDt]
  );

  return row ? normalizeRow(row) : null;
}

async function upsertConfirmation(data, userId) {
  const row = await postgres.queryOne(
    `INSERT INTO receipt_confirmations (
       system_id, station_number, shift_number, tank_number, ttn, receipt_dt,
       status,
       corrected_volume, corrected_amount, corrected_density, corrected_temp,
       comment,
       confirmed_by, confirmed_by_name
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     ON CONFLICT (system_id, station_number, tank_number, ttn, receipt_dt)
     DO UPDATE SET
       shift_number = EXCLUDED.shift_number,
       status = EXCLUDED.status,
       corrected_volume = EXCLUDED.corrected_volume,
       corrected_amount = EXCLUDED.corrected_amount,
       corrected_density = EXCLUDED.corrected_density,
       corrected_temp = EXCLUDED.corrected_temp,
       comment = EXCLUDED.comment,
       confirmed_by = EXCLUDED.confirmed_by,
       confirmed_by_name = EXCLUDED.confirmed_by_name
     RETURNING *`,
    [
      data.systemId,
      data.stationNumber,
      data.shiftNumber || 0,
      data.tankNumber,
      data.ttn,
      data.receiptDt,
      data.status || 'confirmed',
      data.correctedVolume ?? null,
      data.correctedAmount ?? null,
      data.correctedDensity ?? null,
      data.correctedTemp ?? null,
      data.comment ?? '',
      userId,
      data.confirmedByName || '',
    ]
  );

  return normalizeRow(row);
}

async function bulkUpsertConfirmations(items, userId, confirmedByName) {
  if (!items.length) return [];

  const COLS = 14;
  const params = [];
  const valueRows = [];

  for (const d of items) {
    const offset = params.length;
    params.push(
      d.systemId,
      d.stationNumber,
      d.shiftNumber || 0,
      d.tankNumber,
      d.ttn,
      d.receiptDt,
      d.status || 'confirmed',
      d.correctedVolume ?? null,
      d.correctedAmount ?? null,
      d.correctedDensity ?? null,
      d.correctedTemp ?? null,
      d.comment ?? '',
      userId,
      confirmedByName,
    );
    const placeholders = Array.from({ length: COLS }, (_, i) => `$${offset + i + 1}`);
    valueRows.push(`(${placeholders.join(',')})`);
  }

  const { rows } = await postgres.query(
    `INSERT INTO receipt_confirmations (
       system_id, station_number, shift_number, tank_number, ttn, receipt_dt,
       status,
       corrected_volume, corrected_amount, corrected_density, corrected_temp,
       comment,
       confirmed_by, confirmed_by_name
     ) VALUES ${valueRows.join(',')}
     ON CONFLICT (system_id, station_number, tank_number, ttn, receipt_dt)
     DO UPDATE SET
       shift_number = EXCLUDED.shift_number,
       status = EXCLUDED.status,
       corrected_volume = EXCLUDED.corrected_volume,
       corrected_amount = EXCLUDED.corrected_amount,
       corrected_density = EXCLUDED.corrected_density,
       corrected_temp = EXCLUDED.corrected_temp,
       comment = EXCLUDED.comment,
       confirmed_by = EXCLUDED.confirmed_by,
       confirmed_by_name = EXCLUDED.confirmed_by_name
     RETURNING *`,
    params
  );

  return rows.map(normalizeRow);
}

async function deleteConfirmation(id) {
  const result = await postgres.query(
    'DELETE FROM receipt_confirmations WHERE id = $1::uuid RETURNING id',
    [id]
  );

  return result.rowCount > 0;
}

function normalizeRow(row) {
  return {
    id: row.id,
    systemId: row.system_id,
    stationNumber: row.station_number,
    shiftNumber: row.shift_number,
    tankNumber: row.tank_number,
    ttn: row.ttn,
    receiptDt: row.receipt_dt,
    status: row.status,
    correctedVolume: row.corrected_volume,
    correctedAmount: row.corrected_amount,
    correctedDensity: row.corrected_density ? parseFloat(row.corrected_density) : null,
    correctedTemp: row.corrected_temp ? parseFloat(row.corrected_temp) : null,
    comment: row.comment,
    confirmedBy: row.confirmed_by,
    confirmedByName: row.confirmed_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  getConfirmations,
  getConfirmationByKey,
  upsertConfirmation,
  bulkUpsertConfirmations,
  deleteConfirmation,
};
