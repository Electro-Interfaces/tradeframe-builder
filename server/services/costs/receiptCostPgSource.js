const postgres = require('../../db/pool');

async function getReceiptCosts(filters = {}) {
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

  if (filters.fuelCode) {
    params.push(filters.fuelCode);
    conditions.push(`fuel_code = $${params.length}`);
  }

  if (filters.ttn) {
    params.push(filters.ttn);
    conditions.push(`ttn = $${params.length}`);
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
    `SELECT * FROM receipt_costs ${where} ORDER BY receipt_dt DESC, ttn`,
    params
  );

  return rows.map(normalizeRow);
}

async function getReceiptCostByKey(systemId, stationNumber, tankNumber, ttn, receiptDt) {
  const row = await postgres.queryOne(
    `SELECT * FROM receipt_costs
     WHERE system_id = $1 AND station_number = $2 AND tank_number = $3
       AND ttn = $4 AND receipt_dt = $5
     LIMIT 1`,
    [systemId, stationNumber, tankNumber, ttn, receiptDt]
  );

  return row ? normalizeRow(row) : null;
}

async function upsertReceiptCost(data, userId) {
  const row = await postgres.queryOne(
    `INSERT INTO receipt_costs (
       system_id, station_number, tank_number, ttn, receipt_dt,
       fuel_code, fuel_name,
       cost_per_liter, cost_per_kg, input_unit,
       volume_liters, density, total_cost,
       supplier_id, supplier_name,
       created_by, updated_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16)
     ON CONFLICT (system_id, station_number, tank_number, ttn, receipt_dt)
     DO UPDATE SET
       fuel_code = EXCLUDED.fuel_code,
       fuel_name = EXCLUDED.fuel_name,
       cost_per_liter = EXCLUDED.cost_per_liter,
       cost_per_kg = EXCLUDED.cost_per_kg,
       input_unit = EXCLUDED.input_unit,
       volume_liters = EXCLUDED.volume_liters,
       density = EXCLUDED.density,
       total_cost = EXCLUDED.total_cost,
       supplier_id = EXCLUDED.supplier_id,
       supplier_name = EXCLUDED.supplier_name,
       updated_by = EXCLUDED.updated_by
     RETURNING *`,
    [
      data.systemId,
      data.stationNumber,
      data.tankNumber,
      data.ttn,
      data.receiptDt,
      data.fuelCode || 0,
      data.fuelName || '',
      data.costPerLiter,
      data.costPerKg || null,
      data.inputUnit || 'liter',
      data.volumeLiters || 0,
      data.density || 0,
      data.totalCost || 0,
      data.supplierId || null,
      data.supplierName || '',
      userId || null,
    ]
  );

  return normalizeRow(row);
}

async function bulkUpsertReceiptCosts(entries, userId, mode = 'fill_empty') {
  if (!entries.length) return { inserted: 0, updated: 0 };

  let inserted = 0;
  let updated = 0;

  await postgres.withTransaction(async (client) => {
    for (const data of entries) {
      if (mode === 'fill_empty') {
        const existing = await client.query(
          `SELECT id FROM receipt_costs
           WHERE system_id = $1 AND station_number = $2 AND tank_number = $3
             AND ttn = $4 AND receipt_dt = $5
           LIMIT 1`,
          [data.systemId, data.stationNumber, data.tankNumber, data.ttn, data.receiptDt]
        );

        if (existing.rows.length > 0) continue;
      }

      const result = await client.query(
        `INSERT INTO receipt_costs (
           system_id, station_number, tank_number, ttn, receipt_dt,
           fuel_code, fuel_name,
           cost_per_liter, cost_per_kg, input_unit,
           volume_liters, density, total_cost,
           supplier_id, supplier_name,
           created_by, updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16)
         ON CONFLICT (system_id, station_number, tank_number, ttn, receipt_dt)
         DO UPDATE SET
           fuel_code = EXCLUDED.fuel_code,
           fuel_name = EXCLUDED.fuel_name,
           cost_per_liter = EXCLUDED.cost_per_liter,
           cost_per_kg = EXCLUDED.cost_per_kg,
           input_unit = EXCLUDED.input_unit,
           volume_liters = EXCLUDED.volume_liters,
           density = EXCLUDED.density,
           total_cost = EXCLUDED.total_cost,
           supplier_id = EXCLUDED.supplier_id,
           supplier_name = EXCLUDED.supplier_name,
           updated_by = EXCLUDED.updated_by
         RETURNING xmax`,
        [
          data.systemId,
          data.stationNumber,
          data.tankNumber,
          data.ttn,
          data.receiptDt,
          data.fuelCode || 0,
          data.fuelName || '',
          data.costPerLiter,
          data.costPerKg || null,
          data.inputUnit || 'liter',
          data.volumeLiters || 0,
          data.density || 0,
          data.totalCost || 0,
          data.supplierId || null,
          data.supplierName || '',
          userId || null,
        ]
      );

      // xmax = 0 means INSERT, > 0 means UPDATE
      if (result.rows[0]?.xmax === '0') {
        inserted++;
      } else {
        updated++;
      }
    }
  });

  return { inserted, updated };
}

async function deleteReceiptCost(id) {
  const result = await postgres.query(
    'DELETE FROM receipt_costs WHERE id = $1::uuid RETURNING id',
    [id]
  );

  return result.rowCount > 0;
}

async function getAvgCostByFuel(systemId, stationNumber, dtBeg, dtEnd) {
  const params = [systemId];
  const conditions = ['system_id = $1'];

  if (stationNumber) {
    params.push(stationNumber);
    conditions.push(`station_number = $${params.length}`);
  }

  if (dtBeg) {
    params.push(dtBeg);
    conditions.push(`receipt_dt >= $${params.length}`);
  }

  if (dtEnd) {
    params.push(dtEnd);
    conditions.push(`receipt_dt <= $${params.length}`);
  }

  const { rows } = await postgres.query(
    `SELECT
       fuel_code,
       fuel_name,
       COUNT(*) AS receipt_count,
       SUM(volume_liters) AS total_volume,
       SUM(total_cost) AS total_cost,
       CASE WHEN SUM(volume_liters) > 0
         THEN SUM(total_cost) / SUM(volume_liters)
         ELSE 0
       END AS avg_cost_per_liter
     FROM receipt_costs
     WHERE ${conditions.join(' AND ')}
       AND cost_per_liter > 0
     GROUP BY fuel_code, fuel_name
     ORDER BY fuel_name`,
    params
  );

  return rows;
}

function normalizeRow(row) {
  return {
    id: row.id,
    systemId: row.system_id,
    stationNumber: row.station_number,
    tankNumber: row.tank_number,
    ttn: row.ttn,
    receiptDt: row.receipt_dt,
    fuelCode: row.fuel_code,
    fuelName: row.fuel_name,
    costPerLiter: parseFloat(row.cost_per_liter) || 0,
    costPerKg: row.cost_per_kg ? parseFloat(row.cost_per_kg) : null,
    inputUnit: row.input_unit,
    volumeLiters: parseFloat(row.volume_liters) || 0,
    density: parseFloat(row.density) || 0,
    totalCost: parseFloat(row.total_cost) || 0,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  getReceiptCosts,
  getReceiptCostByKey,
  upsertReceiptCost,
  bulkUpsertReceiptCosts,
  deleteReceiptCost,
  getAvgCostByFuel,
};
