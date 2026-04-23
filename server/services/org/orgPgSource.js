const postgres = require('../../db/pool');
const {
  createExternalCodeId,
  ensureObject,
  generateStationId,
  normalizeNetworkFromPgRow,
  normalizeTradingPointFromPgRow,
} = require('./orgTransforms');

function buildNetworkCode(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

async function getNetworkRecordById(networkId) {
  return postgres.queryOne(
    `SELECT * FROM networks WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [networkId]
  );
}

async function getTradingPointRowById(pointId) {
  return postgres.queryOne(
    `SELECT
       tp.*,
       n.name AS network_name,
       n.code AS network_code
     FROM trading_points tp
     INNER JOIN networks n
       ON n.id = tp.network_id
      AND n.deleted_at IS NULL
     WHERE tp.id = $1
       AND tp.deleted_at IS NULL
     LIMIT 1`,
    [pointId]
  );
}

async function loadExternalCodesForPoints(pointIds) {
  if (!pointIds.length) {
    return [];
  }

  const { rows } = await postgres.query(
    `SELECT *
       FROM trading_point_external_codes
      WHERE trading_point_id = ANY($1::text[])
      ORDER BY created_at, id`,
    [pointIds]
  );

  return rows;
}

function mapTradingPoints(rows, externalCodesRows) {
  const externalCodesByPointId = new Map();

  externalCodesRows.forEach((externalCode) => {
    if (!externalCodesByPointId.has(externalCode.trading_point_id)) {
      externalCodesByPointId.set(externalCode.trading_point_id, []);
    }

    externalCodesByPointId.get(externalCode.trading_point_id).push(externalCode);
  });

  return rows.map((row) =>
    normalizeTradingPointFromPgRow(row, externalCodesByPointId.get(row.id) || [])
  );
}

async function getNetworks() {
  const { rows } = await postgres.query(
    `SELECT
       n.*,
       COUNT(tp.id) FILTER (WHERE tp.deleted_at IS NULL) AS points_count
     FROM networks n
     LEFT JOIN trading_points tp
       ON tp.network_id = n.id
      AND tp.deleted_at IS NULL
     WHERE n.deleted_at IS NULL
       AND n.is_active = true
     GROUP BY n.id
     ORDER BY n.name`
  );

  return rows.map(normalizeNetworkFromPgRow);
}

async function getNetworkById(networkId) {
  const { rows } = await postgres.query(
    `SELECT
       n.*,
       COUNT(tp.id) FILTER (WHERE tp.deleted_at IS NULL) AS points_count
     FROM networks n
     LEFT JOIN trading_points tp
       ON tp.network_id = n.id
      AND tp.deleted_at IS NULL
     WHERE n.id = $1
       AND n.deleted_at IS NULL
     GROUP BY n.id
     LIMIT 1`,
    [networkId]
  );

  return rows[0] ? normalizeNetworkFromPgRow(rows[0]) : null;
}

async function createNetwork(input) {
  const { rows } = await postgres.query(
    `INSERT INTO networks (
       code,
       external_id,
       name,
       description,
       network_type,
       settings,
       is_active
     ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
     RETURNING *`,
    [
      input.code || buildNetworkCode(input.name),
      input.external_id || null,
      input.name,
      input.description || '',
      input.type || 'АЗС',
      JSON.stringify({}),
      input.status !== 'inactive',
    ]
  );

  return normalizeNetworkFromPgRow({
    ...rows[0],
    points_count: 0,
  });
}

async function updateNetwork(networkId, input) {
  const { rows } = await postgres.query(
    `UPDATE networks
        SET code = $2,
            external_id = $3,
            name = $4,
            description = $5,
            network_type = $6,
            is_active = $7,
            updated_at = now()
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING *`,
    [
      networkId,
      input.code || buildNetworkCode(input.name),
      input.external_id || null,
      input.name,
      input.description || '',
      input.type || 'АЗС',
      input.status !== 'inactive',
    ]
  );

  return rows[0]
    ? normalizeNetworkFromPgRow({ ...rows[0], points_count: 0 })
    : null;
}

async function deleteNetwork(networkId) {
  await postgres.query(
    `UPDATE networks
        SET is_active = false,
            deleted_at = COALESCE(deleted_at, now()),
            updated_at = now()
      WHERE id = $1
        AND deleted_at IS NULL`,
    [networkId]
  );
}

async function getTradingPoints(networkId) {
  const params = [];
  let whereClause = `
    tp.deleted_at IS NULL
    AND tp.is_active = true
  `;

  if (networkId && networkId !== 'all') {
    params.push(networkId);
    whereClause += ` AND tp.network_id = $${params.length}`;
  }

  const { rows } = await postgres.query(
    `SELECT
       tp.*,
       n.name AS network_name,
       n.code AS network_code
     FROM trading_points tp
     INNER JOIN networks n
       ON n.id = tp.network_id
      AND n.deleted_at IS NULL
     WHERE ${whereClause}
     ORDER BY n.name, tp.name`,
    params
  );

  const externalCodesRows = await loadExternalCodesForPoints(rows.map((row) => row.id));
  return mapTradingPoints(rows, externalCodesRows);
}

async function getTradingPointById(pointId) {
  const row = await getTradingPointRowById(pointId);
  if (!row) {
    return null;
  }

  const externalCodesRows = await loadExternalCodesForPoints([pointId]);
  return normalizeTradingPointFromPgRow(row, externalCodesRows);
}

async function createTradingPoint(input) {
  const network = await getNetworkRecordById(input.networkId);
  if (!network) {
    throw new Error('Сеть не найдена');
  }

  const { rows: existingRows } = await postgres.query(
    `SELECT code
       FROM trading_points
      WHERE network_id = $1
        AND deleted_at IS NULL`,
    [input.networkId]
  );

  let newCode;
  if (input.code) {
    const duplicate = existingRows.some((row) => String(row.code) === String(input.code));
    if (duplicate) {
      throw new Error(`Станция с кодом ${input.code} уже существует в этой сети`);
    }
    newCode = String(input.code);
  } else {
    const maxCode = existingRows.reduce((currentMax, row) => {
      const parsedCode = Number.parseInt(String(row.code || ''), 10);
      return Number.isFinite(parsedCode) ? Math.max(currentMax, parsedCode) : currentMax;
    }, 0);
    newCode = String(maxCode + 1);
  }
  const externalId = input.externalId ? String(input.externalId) : newCode;
  const pointId = generateStationId(network.code, newCode);

  // Проверяем soft-deleted запись с таким же ID — восстанавливаем вместо INSERT
  const { rows: deletedRows } = await postgres.query(
    `SELECT id FROM trading_points WHERE id = $1 AND deleted_at IS NOT NULL`,
    [pointId]
  );

  return postgres.withTransaction(async (client) => {
    let insertResult;

    if (deletedRows.length > 0) {
      insertResult = await client.query(
        `UPDATE trading_points SET
           code = $2,
           external_id = $3,
           name = $4,
           description = $5,
           latitude = $6,
           longitude = $7,
           region = $8,
           city = $9,
           address = $10,
           phone = $11,
           email = $12,
           website = $13,
           is_blocked = $14,
           block_reason = $15,
           schedule = $16::jsonb,
           services = $17::jsonb,
           bill_acceptor_thresholds = $18::jsonb,
           fuel_level_thresholds = $19::jsonb,
           metadata = $20::jsonb,
           is_active = $21,
           deleted_at = NULL,
           updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [
          pointId,
          newCode,
          externalId,
          input.name,
          input.description || `${network.name} - ${input.name}`,
          Number(input.geolocation?.latitude || 0),
          Number(input.geolocation?.longitude || 0),
          input.geolocation?.region || '',
          input.geolocation?.city || '',
          input.geolocation?.address || '',
          input.phone || '',
          input.email || '',
          input.website || '',
          Boolean(input.isBlocked),
          input.blockReason || '',
          JSON.stringify(input.schedule || {}),
          JSON.stringify(input.services || {}),
          JSON.stringify(input.billAcceptorThresholds || {}),
          JSON.stringify(input.fuelLevelThresholds || {}),
          JSON.stringify({}),
          !input.isBlocked,
        ]
      );
    } else {
      insertResult = await client.query(
        `INSERT INTO trading_points (
           id,
           network_id,
           code,
           external_id,
           name,
           description,
           latitude,
           longitude,
           region,
           city,
           address,
           phone,
           email,
           website,
           is_blocked,
           block_reason,
           schedule,
           services,
           bill_acceptor_thresholds,
           fuel_level_thresholds,
           metadata,
           is_active
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
           $11, $12, $13, $14, $15, $16, $17::jsonb, $18::jsonb,
           $19::jsonb, $20::jsonb, $21::jsonb, $22
         )
         RETURNING *`,
        [
          pointId,
          input.networkId,
          newCode,
          externalId,
          input.name,
          input.description || `${network.name} - ${input.name}`,
          Number(input.geolocation?.latitude || 0),
          Number(input.geolocation?.longitude || 0),
          input.geolocation?.region || '',
          input.geolocation?.city || '',
          input.geolocation?.address || '',
          input.phone || '',
          input.email || '',
          input.website || '',
          Boolean(input.isBlocked),
          input.blockReason || '',
          JSON.stringify(input.schedule || {}),
          JSON.stringify(input.services || {}),
          JSON.stringify(input.billAcceptorThresholds || {}),
          JSON.stringify(input.fuelLevelThresholds || {}),
          JSON.stringify({}),
          !input.isBlocked,
        ]
      );
    }

    const defaultExternalCodeId = createExternalCodeId();
    await client.query(
      `INSERT INTO trading_point_external_codes (
         id,
         trading_point_id,
         system,
         code,
         description,
         is_active,
         metadata,
         updated_at
       ) VALUES ($1, $2, 'sts', $3, $4, true, $5::jsonb, now())`,
      [
        defaultExternalCodeId,
        pointId,
        newCode,
        'Код станции STS (по умолчанию)',
        JSON.stringify({ source: 'default' }),
      ]
    );

    return normalizeTradingPointFromPgRow(insertResult.rows[0], [{
      id: defaultExternalCodeId,
      trading_point_id: pointId,
      system: 'sts',
      code: newCode,
      description: 'Код станции STS (по умолчанию)',
      is_active: true,
      metadata: { source: 'default' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]);
  });
}

async function updateTradingPoint(pointId, input) {
  const currentPoint = await getTradingPointRowById(pointId);
  if (!currentPoint) {
    return null;
  }

  const network = await getNetworkRecordById(currentPoint.network_id);
  if (!network) {
    throw new Error('Сеть не найдена');
  }

  const nextCode = String(input.external_id || currentPoint.external_id || currentPoint.code);
  const nextPointId = generateStationId(network.code, nextCode);
  const values = [
    currentPoint.network_id,
    nextCode,
    nextCode,
    input.name || currentPoint.name,
    input.description || currentPoint.description || `${network.name} - ${input.name || currentPoint.name}`,
    Number(input.geolocation?.latitude ?? currentPoint.latitude ?? 0),
    Number(input.geolocation?.longitude ?? currentPoint.longitude ?? 0),
    input.geolocation?.region ?? currentPoint.region ?? '',
    input.geolocation?.city ?? currentPoint.city ?? '',
    input.geolocation?.address ?? currentPoint.address ?? '',
    input.phone ?? currentPoint.phone ?? '',
    input.email ?? currentPoint.email ?? '',
    input.website ?? currentPoint.website ?? '',
    input.isBlocked ?? Boolean(currentPoint.is_blocked || !currentPoint.is_active),
    input.blockReason ?? currentPoint.block_reason ?? '',
    JSON.stringify(input.schedule ?? ensureObject(currentPoint.schedule)),
    JSON.stringify(input.services ?? ensureObject(currentPoint.services)),
    JSON.stringify(input.billAcceptorThresholds ?? ensureObject(currentPoint.bill_acceptor_thresholds)),
    JSON.stringify(input.fuelLevelThresholds ?? ensureObject(currentPoint.fuel_level_thresholds)),
    JSON.stringify(ensureObject(currentPoint.metadata)),
    !(input.isBlocked ?? Boolean(currentPoint.is_blocked || !currentPoint.is_active)),
  ];

  return postgres.withTransaction(async (client) => {
    let pointRow;

    if (nextPointId === pointId) {
      const updateResult = await client.query(
        `UPDATE trading_points
            SET network_id = $2,
                code = $3,
                external_id = $4,
                name = $5,
                description = $6,
                latitude = $7,
                longitude = $8,
                region = $9,
                city = $10,
                address = $11,
                phone = $12,
                email = $13,
                website = $14,
                is_blocked = $15,
                block_reason = $16,
                schedule = $17::jsonb,
                services = $18::jsonb,
                bill_acceptor_thresholds = $19::jsonb,
                fuel_level_thresholds = $20::jsonb,
                metadata = $21::jsonb,
                is_active = $22,
                updated_at = now()
          WHERE id = $1
        RETURNING *`,
        [pointId, ...values]
      );

      pointRow = updateResult.rows[0];
    } else {
      const insertResult = await client.query(
        `INSERT INTO trading_points (
           id,
           network_id,
           code,
           external_id,
           name,
           description,
           latitude,
           longitude,
           region,
           city,
           address,
           phone,
           email,
           website,
           is_blocked,
           block_reason,
           schedule,
           services,
           bill_acceptor_thresholds,
           fuel_level_thresholds,
           metadata,
           is_active,
           created_at,
           updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
           $11, $12, $13, $14, $15, $16, $17::jsonb, $18::jsonb,
           $19::jsonb, $20::jsonb, $21::jsonb, $22, $23, now()
         )
         RETURNING *`,
        [
          nextPointId,
          ...values,
          currentPoint.created_at,
        ]
      );

      await client.query(
        `UPDATE trading_point_external_codes
            SET trading_point_id = $2,
                updated_at = now()
          WHERE trading_point_id = $1`,
        [pointId, nextPointId]
      );

      await client.query(
        `UPDATE trading_point_external_codes
            SET code = $3,
                updated_at = now()
          WHERE trading_point_id = $2
            AND lower(system) = 'sts'
            AND code = $1`,
        [currentPoint.code, nextPointId, nextCode]
      );

      await client.query(`DELETE FROM trading_points WHERE id = $1`, [pointId]);
      pointRow = insertResult.rows[0];
    }

    const externalCodesResult = await client.query(
      `SELECT *
         FROM trading_point_external_codes
        WHERE trading_point_id = $1
        ORDER BY created_at, id`,
      [pointRow.id]
    );

    return normalizeTradingPointFromPgRow(pointRow, externalCodesResult.rows);
  });
}

async function deleteTradingPoint(pointId) {
  await postgres.query(
    `UPDATE trading_points
        SET is_active = false,
            is_blocked = true,
            deleted_at = COALESCE(deleted_at, now()),
            updated_at = now()
      WHERE id = $1
        AND deleted_at IS NULL`,
    [pointId]
  );
}

async function updateBillAcceptorThresholds(pointId, thresholds) {
  await postgres.query(
    `UPDATE trading_points
        SET bill_acceptor_thresholds = $2::jsonb,
            updated_at = now()
      WHERE id = $1
        AND deleted_at IS NULL`,
    [pointId, JSON.stringify(thresholds || {})]
  );
}

async function updateFuelLevelThresholds(pointId, thresholds) {
  await postgres.query(
    `UPDATE trading_points
        SET fuel_level_thresholds = $2::jsonb,
            updated_at = now()
      WHERE id = $1
        AND deleted_at IS NULL`,
    [pointId, JSON.stringify(thresholds || {})]
  );
}

async function addExternalCode(pointId, input) {
  const { rows } = await postgres.query(
    `INSERT INTO trading_point_external_codes (
       id,
       trading_point_id,
       system,
       code,
       description,
       is_active,
       metadata,
       updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, now())
     RETURNING *`,
    [
      createExternalCodeId(),
      pointId,
      String(input.system || 'sts').toLowerCase(),
      String(input.code || ''),
      input.description || '',
      input.isActive !== false,
      JSON.stringify(input.metadata || {}),
    ]
  );

  return normalizeTradingPointFromPgRow(
    {
      id: pointId,
      network_id: '',
      network_name: '',
      name: '',
      description: '',
      latitude: 0,
      longitude: 0,
      region: '',
      city: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      is_blocked: false,
      block_reason: '',
      schedule: {},
      services: {},
      bill_acceptor_thresholds: {},
      fuel_level_thresholds: {},
      is_active: true,
      created_at: rows[0].created_at,
      updated_at: rows[0].updated_at,
      code: '',
      external_id: '',
    },
    [rows[0]]
  ).externalCodes[0];
}

async function updateExternalCode(pointId, codeId, input) {
  const { rows } = await postgres.query(
    `UPDATE trading_point_external_codes
        SET system = $3,
            code = $4,
            description = $5,
            is_active = $6,
            metadata = $7::jsonb,
            updated_at = now()
      WHERE trading_point_id = $1
        AND id = $2
      RETURNING *`,
    [
      pointId,
      codeId,
      String(input.system || 'sts').toLowerCase(),
      String(input.code || ''),
      input.description || '',
      input.isActive !== false,
      JSON.stringify(input.metadata || {}),
    ]
  );

  if (!rows[0]) {
    return null;
  }

  return normalizeTradingPointFromPgRow(
    {
      id: pointId,
      network_id: '',
      network_name: '',
      name: '',
      description: '',
      latitude: 0,
      longitude: 0,
      region: '',
      city: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      is_blocked: false,
      block_reason: '',
      schedule: {},
      services: {},
      bill_acceptor_thresholds: {},
      fuel_level_thresholds: {},
      is_active: true,
      created_at: rows[0].created_at,
      updated_at: rows[0].updated_at,
      code: '',
      external_id: '',
    },
    [rows[0]]
  ).externalCodes[0];
}

async function removeExternalCode(pointId, codeId) {
  await postgres.query(
    `DELETE FROM trading_point_external_codes
      WHERE trading_point_id = $1
        AND id = $2`,
    [pointId, codeId]
  );
}

module.exports = {
  addExternalCode,
  createNetwork,
  createTradingPoint,
  deleteNetwork,
  deleteTradingPoint,
  getNetworkById,
  getNetworks,
  getTradingPointById,
  getTradingPoints,
  removeExternalCode,
  updateBillAcceptorThresholds,
  updateExternalCode,
  updateFuelLevelThresholds,
  updateNetwork,
  updateTradingPoint,
};
