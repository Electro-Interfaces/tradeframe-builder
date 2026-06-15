const postgres = require('../../db/pool');
const {
  normalizeCorporateOrder,
  buildCorporateOrderRecord,
} = require('./corporateOrdersTransforms');

function validateInput(input) {
  if (!input.corporateClientId) throw new Error('Корпоративный клиент обязателен');
  if (!input.networkId) throw new Error('Сеть обязательна');
  if (!input.stationCode) throw new Error('АЗС обязательна');
  if (input.fuelCode == null) throw new Error('Вид топлива обязателен');
}

async function getCorporateOrders(filters = {}) {
  const params = [];
  const conditions = ['1=1'];

  if (filters.networkId) {
    params.push(filters.networkId);
    conditions.push(`o.network_id = $${params.length}::uuid`);
  }
  if (filters.clientId) {
    params.push(filters.clientId);
    conditions.push(`o.corporate_client_id = $${params.length}::uuid`);
  }
  if (filters.status && filters.status !== 'all') {
    params.push(filters.status);
    conditions.push(`o.status = $${params.length}`);
  }
  if (filters.stationCode) {
    params.push(String(filters.stationCode));
    conditions.push(`o.station_code = $${params.length}`);
  }
  if (filters.dateFrom) {
    params.push(filters.dateFrom);
    conditions.push(`o.created_at >= $${params.length}::timestamptz`);
  }
  if (filters.dateTo) {
    params.push(filters.dateTo);
    conditions.push(`o.created_at <= $${params.length}::timestamptz`);
  }

  const { rows } = await postgres.query(
    `SELECT o.*, c.name AS client_name
       FROM corporate_orders o
       INNER JOIN corporate_clients c ON c.id = o.corporate_client_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY o.created_at DESC`,
    params
  );

  return rows.map(normalizeCorporateOrder);
}

async function getCorporateOrderById(id) {
  const row = await postgres.queryOne(
    `SELECT o.*, c.name AS client_name
       FROM corporate_orders o
       INNER JOIN corporate_clients c ON c.id = o.corporate_client_id
      WHERE o.id = $1::uuid
      LIMIT 1`,
    [id]
  );
  return row ? normalizeCorporateOrder(row) : null;
}

async function createCorporateOrder(input, actorUserId) {
  validateInput(input);
  const r = buildCorporateOrderRecord(input, actorUserId);

  const { rows } = await postgres.query(
    `INSERT INTO corporate_orders (
       corporate_client_id, network_id, trading_point_id, station_code, station_name,
       fuel_code, fuel_name, column_number, mode,
       ordered_volume, ordered_amount, price, status, comment, created_by, updated_by
     ) VALUES (
       $1::uuid, $2::uuid, $3, $4, $5,
       $6, $7, $8, $9,
       $10, $11, $12, $13, $14, $15, $16
     )
     RETURNING id`,
    [
      r.corporate_client_id, r.network_id, r.trading_point_id, r.station_code, r.station_name,
      r.fuel_code, r.fuel_name, r.column_number, r.mode,
      r.ordered_volume, r.ordered_amount, r.price, r.status, r.comment, r.created_by, r.updated_by,
    ]
  );

  return getCorporateOrderById(rows[0].id);
}

async function deleteCorporateOrder(id) {
  await postgres.query(`DELETE FROM corporate_orders WHERE id = $1::uuid`, [id]);
}

module.exports = {
  getCorporateOrders,
  getCorporateOrderById,
  createCorporateOrder,
  deleteCorporateOrder,
};
