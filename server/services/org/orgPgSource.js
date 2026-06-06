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
       n.code AS network_code,
       n.external_id AS network_external_id
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
       (
         SELECT COUNT(*) FROM (
           SELECT tp.id
             FROM trading_points tp
            WHERE tp.network_id = n.id
              AND tp.deleted_at IS NULL
              AND NOT EXISTS (
                SELECT 1 FROM network_trading_point_aliases a
                WHERE a.trading_point_id = tp.id
                  AND a.network_id <> n.id
              )
           UNION
           SELECT a.trading_point_id
             FROM network_trading_point_aliases a
             INNER JOIN trading_points tp ON tp.id = a.trading_point_id
            WHERE a.network_id = n.id
              AND tp.deleted_at IS NULL
         ) s
       ) AS points_count
     FROM networks n
     WHERE n.deleted_at IS NULL
       AND n.is_active = true
     ORDER BY n.name`
  );

  return rows.map(normalizeNetworkFromPgRow);
}

async function getNetworkById(networkId) {
  const { rows } = await postgres.query(
    `SELECT
       n.*,
       (
         SELECT COUNT(*) FROM (
           SELECT tp.id
             FROM trading_points tp
            WHERE tp.network_id = n.id
              AND tp.deleted_at IS NULL
              AND NOT EXISTS (
                SELECT 1 FROM network_trading_point_aliases a
                WHERE a.trading_point_id = tp.id
                  AND a.network_id <> n.id
              )
           UNION
           SELECT a.trading_point_id
             FROM network_trading_point_aliases a
             INNER JOIN trading_points tp ON tp.id = a.trading_point_id
            WHERE a.network_id = n.id
              AND tp.deleted_at IS NULL
         ) s
       ) AS points_count
     FROM networks n
     WHERE n.id = $1
       AND n.deleted_at IS NULL
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
  // Guard: нельзя удалять сеть с живыми точками или с входящими alias-зависимостями
  // (точки этой сети одолжены другим сетям). Иначе CASCADE/JOIN уронит станции —
  // как в инциденте с БТО, когда удаление сети-родителя alias-точек обрушило все АЗС.
  const blockers = await postgres.queryOne(
    `SELECT
       (SELECT COUNT(*) FROM trading_points tp
         WHERE tp.network_id = $1 AND tp.deleted_at IS NULL) AS live_points,
       (SELECT COUNT(*) FROM network_trading_point_aliases a
          INNER JOIN trading_points tp ON tp.id = a.trading_point_id
         WHERE tp.network_id = $1) AS incoming_aliases`,
    [networkId]
  );
  const livePoints = Number(blockers?.live_points || 0);
  const incomingAliases = Number(blockers?.incoming_aliases || 0);
  if (livePoints > 0 || incomingAliases > 0) {
    const err = new Error(
      `Нельзя удалить сеть: к ней привязано живых точек — ${livePoints}, ` +
      `внешних alias-зависимостей — ${incomingAliases}. ` +
      'Сначала перенесите точки в другую сеть и снимите alias.'
    );
    err.status = 409;
    throw err;
  }

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
  // Случай 1: запрос всех точек без фильтра по сети — алиасы не подмешиваем
  // (иначе одна точка появится дважды). Точки с алиасом в другую сеть
  // показываются один раз как родные.
  if (!networkId || networkId === 'all') {
    const { rows } = await postgres.query(
      `SELECT
         tp.*,
         n.name AS network_name,
         n.code AS network_code,
         n.external_id AS network_external_id
       FROM trading_points tp
       INNER JOIN networks n
         ON n.id = tp.network_id
        AND n.deleted_at IS NULL
       WHERE tp.deleted_at IS NULL
         AND tp.is_active = true
       ORDER BY n.name, tp.name`
    );

    const externalCodesRows = await loadExternalCodesForPoints(rows.map((row) => row.id));
    return mapTradingPoints(rows, externalCodesRows);
  }

  // Случай 2: запрос точек конкретной сети — объединяем родные точки и алиасы.
  // Точки, имеющие алиас в ДРУГУЮ сеть, скрываются из своей родной сети
  // (концепция «переезд»: точка видна только в целевой сети алиаса).
  // Для alias-точек видимые поля сети (network_id/code/name) подменяются на
  // целевую сеть, а network_external_id остаётся родным (используется
  // в server-side эндпоинтах вроде /api/sts/fuel-inventory).
  const { rows: nativeRows } = await postgres.query(
    `SELECT
       tp.*,
       n.name AS network_name,
       n.code AS network_code,
       n.external_id AS network_external_id
     FROM trading_points tp
     INNER JOIN networks n
       ON n.id = tp.network_id
      AND n.deleted_at IS NULL
     WHERE tp.network_id = $1
       AND tp.deleted_at IS NULL
       AND tp.is_active = true
       AND NOT EXISTS (
         SELECT 1 FROM network_trading_point_aliases a
         WHERE a.trading_point_id = tp.id
           AND a.network_id <> tp.network_id
       )
     ORDER BY tp.name`,
    [networkId]
  );

  const { rows: aliasRows } = await postgres.query(
    `SELECT
       tp.*,
       target_n.id   AS target_network_id,
       target_n.name AS target_network_name,
       target_n.code AS target_network_code,
       src_n.external_id AS source_network_external_id
     FROM trading_points tp
     INNER JOIN network_trading_point_aliases a
       ON a.trading_point_id = tp.id
     INNER JOIN networks target_n
       ON target_n.id = a.network_id
      AND target_n.deleted_at IS NULL
     INNER JOIN networks src_n
       ON src_n.id = tp.network_id
      AND src_n.deleted_at IS NULL
     WHERE a.network_id = $1
       AND tp.network_id <> $1
       AND tp.deleted_at IS NULL
       AND tp.is_active = true
     ORDER BY tp.name`,
    [networkId]
  );

  const aliasMapped = aliasRows.map((row) => ({
    ...row,
    network_id: row.target_network_id,
    network_name: row.target_network_name,
    network_code: row.target_network_code,
    network_external_id: row.source_network_external_id,
    is_alias: true,
  }));

  const allRows = [...nativeRows, ...aliasMapped];
  const externalCodesRows = await loadExternalCodesForPoints(allRows.map((row) => row.id));
  return mapTradingPoints(allRows, externalCodesRows);
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

// Расширения fan-out для per-network STS-запросов.
// Для сети с external_id = networkExternalId возвращает список физических
// (system, station) пар, которые надо опросить дополнительно к основному запросу,
// чтобы данные alias-точек попали в ответ.
async function getAliasExpansionsForSystem(networkExternalId) {
  if (networkExternalId == null || networkExternalId === '') return [];

  const { rows } = await postgres.query(
    `SELECT src_n.external_id AS physical_system,
            tp.code           AS station_code
       FROM network_trading_point_aliases a
       INNER JOIN trading_points tp
         ON tp.id = a.trading_point_id
        AND tp.deleted_at IS NULL
        AND tp.is_active = true
       INNER JOIN networks tgt
         ON tgt.id = a.network_id
        AND tgt.deleted_at IS NULL
       INNER JOIN networks src_n
         ON src_n.id = tp.network_id
        AND src_n.deleted_at IS NULL
      WHERE tgt.external_id = $1`,
    [String(networkExternalId)]
  );

  return rows.map((row) => ({
    physicalSystem: String(row.physical_system),
    stationCode: String(row.station_code),
  }));
}

// Список station codes, физически принадлежащих сети с указанным external_id,
// но «уехавших» из неё через alias в другую сеть. Используется в STS-прокси
// для фильтрации ответов per-network запросов: данные «уехавших» станций
// не должны появляться в их родной сети, иначе будет дубликат с целевой.
async function getOutgoingAliasesFromSystem(physicalSystemExternalId) {
  if (physicalSystemExternalId == null || physicalSystemExternalId === '') return [];

  const { rows } = await postgres.query(
    `SELECT tp.code AS station_code
       FROM trading_points tp
       INNER JOIN networks src_n
         ON src_n.id = tp.network_id
        AND src_n.deleted_at IS NULL
       INNER JOIN network_trading_point_aliases a
         ON a.trading_point_id = tp.id
        AND a.network_id <> tp.network_id
      WHERE src_n.external_id = $1
        AND tp.deleted_at IS NULL
        AND tp.is_active = true`,
    [String(physicalSystemExternalId)]
  );

  return rows.map((row) => String(row.station_code));
}

// Подмена per-station запроса. Если фронт прислал (system=<целевая_сеть>, station=<code>),
// и в alias-таблице есть точка с таким code в указанной целевой сети — возвращает
// родной physicalSystem (физическая сеть точки). Иначе — null (подмена не нужна).
async function findAliasReverse(targetSystemExternalId, stationCode) {
  if (targetSystemExternalId == null || stationCode == null) return null;

  const row = await postgres.queryOne(
    `SELECT src_n.external_id AS physical_system,
            tp.code           AS station_code
       FROM network_trading_point_aliases a
       INNER JOIN trading_points tp
         ON tp.id = a.trading_point_id
        AND tp.deleted_at IS NULL
        AND tp.is_active = true
       INNER JOIN networks tgt
         ON tgt.id = a.network_id
        AND tgt.deleted_at IS NULL
       INNER JOIN networks src_n
         ON src_n.id = tp.network_id
        AND src_n.deleted_at IS NULL
      WHERE tgt.external_id = $1
        AND tp.code = $2
      LIMIT 1`,
    [String(targetSystemExternalId), String(stationCode)]
  );

  return row
    ? { physicalSystem: String(row.physical_system), stationCode: String(row.station_code) }
    : null;
}

// Проверка alias-доступа: есть ли запись network_trading_point_aliases,
// связывающая разрешённую сеть юзера с какой-либо точкой из физической сети,
// чьим external_id юзер обращается к STS. Используется в validateStsAccess.
async function findAliasAccess({
  sourceNetworkId,
  stationCode = null,
  allowedNetworkIds = [],
  allowedNetworkCodes = [],
}) {
  if (!sourceNetworkId) return false;
  if (allowedNetworkIds.length === 0 && allowedNetworkCodes.length === 0) {
    return false;
  }

  const row = await postgres.queryOne(
    `SELECT 1
       FROM network_trading_point_aliases a
       INNER JOIN trading_points tp
         ON tp.id = a.trading_point_id
        AND tp.deleted_at IS NULL
       INNER JOIN networks tgt
         ON tgt.id = a.network_id
        AND tgt.deleted_at IS NULL
      WHERE tp.network_id = $1
        AND ($2::text IS NULL OR tp.code = $2)
        AND (
          tgt.id = ANY($3::uuid[])
          OR LOWER(tgt.code) = ANY($4::text[])
          OR tgt.external_id = ANY($4::text[])
        )
      LIMIT 1`,
    [
      sourceNetworkId,
      stationCode,
      allowedNetworkIds,
      allowedNetworkCodes.map((c) => String(c).toLowerCase()),
    ]
  );

  return Boolean(row);
}

// Маппинг нод TradeLink на торговые точки сети: external_code с system='tradelink',
// code = node-ID Hub. Принимает UUID сети или её external_id. Один SQL, без N+1.
async function loadTradelinkCodesForNetwork(networkId) {
  if (!networkId) return [];
  const { rows } = await postgres.query(
    `SELECT ec.code AS node_id,
            ec.trading_point_id,
            tp.code AS station_code,
            tp.name AS station_name
       FROM trading_point_external_codes ec
       INNER JOIN trading_points tp ON tp.id = ec.trading_point_id AND tp.deleted_at IS NULL
       INNER JOIN networks n ON n.id = tp.network_id AND n.deleted_at IS NULL
      WHERE lower(ec.system) = 'tradelink'
        AND ec.is_active
        AND (n.id::text = $1 OR n.external_id = $1)`,
    [String(networkId)]
  );
  return rows;
}

// Резолв id торговой точки по сети и коду станции. Для RBAC (validateStsAccess):
// проверка прямого доступа scope=trading_point по фактической принадлежности
// точки — устойчиво к смене external_id и переезду точки между сетями (id opaque).
async function findTradingPointId(networkId, stationCode) {
  if (!networkId || stationCode == null) return null;
  const row = await postgres.queryOne(
    `SELECT tp.id
       FROM trading_points tp
      WHERE tp.network_id = $1
        AND tp.code = $2
        AND tp.deleted_at IS NULL
      LIMIT 1`,
    [networkId, String(stationCode)]
  );
  return row ? row.id : null;
}

module.exports = {
  addExternalCode,
  loadTradelinkCodesForNetwork,
  findTradingPointId,
  createNetwork,
  createTradingPoint,
  deleteNetwork,
  deleteTradingPoint,
  findAliasAccess,
  findAliasReverse,
  getAliasExpansionsForSystem,
  getOutgoingAliasesFromSystem,
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
