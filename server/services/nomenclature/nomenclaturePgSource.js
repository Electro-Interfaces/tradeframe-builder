const { randomUUID } = require('crypto');

const postgres = require('../../db/pool');
const {
  buildNomenclatureRecord,
  normalizeExternalCode,
  normalizeNomenclature,
} = require('./nomenclatureTransforms');

async function ensureNetworkExists(networkId) {
  const network = await postgres.queryOne(
    `SELECT id FROM networks WHERE id = $1::uuid AND deleted_at IS NULL LIMIT 1`,
    [networkId]
  );

  if (!network) {
    throw new Error('Сеть не найдена');
  }
}

async function fetchNomenclatureRows(filters = {}) {
  const params = [];
  const conditions = ['n.deleted_at IS NULL'];

  if (filters.networkId) {
    params.push(filters.networkId);
    conditions.push(`n.network_id = $${params.length}::uuid`);
  }

  if (filters.status && filters.status !== 'all') {
    params.push(filters.status);
    conditions.push(`n.status = $${params.length}`);
  }

  if (filters.searchTerm) {
    params.push(`%${filters.searchTerm}%`);
    conditions.push(`(
      n.name ILIKE $${params.length}
      OR n.internal_code ILIKE $${params.length}
      OR COALESCE(n.description, '') ILIKE $${params.length}
    )`);
  }

  const { rows } = await postgres.query(
    `SELECT
       n.*,
       nw.name AS network_name
     FROM nomenclature n
     INNER JOIN networks nw
       ON nw.id = n.network_id
      AND nw.deleted_at IS NULL
     WHERE ${conditions.join(' AND ')}
     ORDER BY n.name`,
    params
  );

  return rows;
}

async function fetchNomenclatureRowById(id) {
  return postgres.queryOne(
    `SELECT
       n.*,
       nw.name AS network_name
     FROM nomenclature n
     INNER JOIN networks nw
       ON nw.id = n.network_id
      AND nw.deleted_at IS NULL
     WHERE n.id = $1::uuid
       AND n.deleted_at IS NULL
     LIMIT 1`,
    [id]
  );
}

async function fetchExternalCodes(nomenclatureIds) {
  if (!nomenclatureIds.length) {
    return [];
  }

  const { rows } = await postgres.query(
    `SELECT *
       FROM nomenclature_external_codes
      WHERE nomenclature_id = ANY($1::uuid[])
      ORDER BY system_type, created_at, id`,
    [nomenclatureIds]
  );

  return rows;
}

function groupExternalCodes(externalCodes) {
  return externalCodes.reduce((accumulator, row) => {
    const key = String(row.nomenclature_id);
    if (!accumulator.has(key)) {
      accumulator.set(key, []);
    }
    accumulator.get(key).push(row);
    return accumulator;
  }, new Map());
}

async function getNomenclature(filters = {}) {
  const rows = await fetchNomenclatureRows(filters);
  const externalCodes = await fetchExternalCodes(rows.map((row) => row.id));
  const externalCodesByNomenclatureId = groupExternalCodes(externalCodes);

  return rows.map((row) => normalizeNomenclature(
    row,
    externalCodesByNomenclatureId.get(String(row.id)) || []
  ));
}

async function getNomenclatureById(id) {
  const row = await fetchNomenclatureRowById(id);
  if (!row) {
    return null;
  }

  const externalCodes = await fetchExternalCodes([id]);
  return normalizeNomenclature(row, externalCodes);
}

async function upsertExternalCodes(client, nomenclatureId, externalCodes) {
  await client.query(
    `DELETE FROM nomenclature_external_codes
      WHERE nomenclature_id = $1::uuid`,
    [nomenclatureId]
  );

  const insertedRows = [];
  for (const code of externalCodes || []) {
    const { rows } = await client.query(
      `INSERT INTO nomenclature_external_codes (
         id,
         nomenclature_id,
         system_type,
         external_code,
         description,
         created_at,
         updated_at
       ) VALUES (
         $1::uuid, $2::uuid, $3, $4, $5, now(), now()
       )
       RETURNING *`,
      [
        code.id || randomUUID(),
        nomenclatureId,
        code.systemType,
        code.externalCode,
        code.description || '',
      ]
    );

    insertedRows.push(rows[0]);
  }

  return insertedRows;
}

async function createNomenclature(input, actorUserId) {
  await ensureNetworkExists(input.networkId);
  const record = buildNomenclatureRecord(input, actorUserId, { includeCreatedBy: true });

  return postgres.withTransaction(async (client) => {
    const insertResult = await client.query(
      `INSERT INTO nomenclature (
         network_id,
         name,
         internal_code,
         network_api_code,
         network_api_settings,
         description,
         status,
         created_by,
         updated_by
       ) VALUES (
         $1::uuid, $2, $3, $4, $5::jsonb, $6, $7, $8, $9
       )
       RETURNING *`,
      [
        record.network_id,
        record.name,
        record.internal_code,
        record.network_api_code,
        JSON.stringify(record.network_api_settings || {}),
        record.description || '',
        record.status,
        record.created_by,
        record.updated_by,
      ]
    );

    const nomenclatureRow = insertResult.rows[0];
    const externalCodes = await upsertExternalCodes(client, nomenclatureRow.id, input.externalCodes || []);
    const joinedRow = await client.query(
      `SELECT
         n.*,
         nw.name AS network_name
       FROM nomenclature n
       INNER JOIN networks nw
         ON nw.id = n.network_id
      WHERE n.id = $1::uuid`,
      [nomenclatureRow.id]
    );

    return normalizeNomenclature(joinedRow.rows[0], externalCodes);
  });
}

async function updateNomenclature(id, input, actorUserId) {
  await ensureNetworkExists(input.networkId);
  const record = buildNomenclatureRecord(input, actorUserId);

  return postgres.withTransaction(async (client) => {
    const updateResult = await client.query(
      `UPDATE nomenclature
          SET network_id = $2::uuid,
              name = $3,
              internal_code = $4,
              network_api_code = $5,
              network_api_settings = $6::jsonb,
              description = $7,
              status = $8,
              updated_by = $9,
              updated_at = $10::timestamptz
        WHERE id = $1::uuid
          AND deleted_at IS NULL
      RETURNING *`,
      [
        id,
        record.network_id,
        record.name,
        record.internal_code,
        record.network_api_code,
        JSON.stringify(record.network_api_settings || {}),
        record.description || '',
        record.status,
        record.updated_by,
        record.updated_at,
      ]
    );

    if (!updateResult.rows[0]) {
      return null;
    }

    const externalCodes = await upsertExternalCodes(client, id, input.externalCodes || []);
    const joinedRow = await client.query(
      `SELECT
         n.*,
         nw.name AS network_name
       FROM nomenclature n
       INNER JOIN networks nw
         ON nw.id = n.network_id
      WHERE n.id = $1::uuid`,
      [id]
    );

    return normalizeNomenclature(joinedRow.rows[0], externalCodes);
  });
}

async function deleteNomenclature(id) {
  await postgres.query(
    `DELETE FROM nomenclature
      WHERE id = $1::uuid`,
    [id]
  );
}

async function changeStatus(id, status, actorUserId) {
  const { rows } = await postgres.query(
    `UPDATE nomenclature
        SET status = $2,
            updated_by = $3,
            updated_at = now()
      WHERE id = $1::uuid
        AND deleted_at IS NULL
    RETURNING *`,
    [id, status, actorUserId || 'system']
  );

  if (!rows[0]) {
    return null;
  }

  return getNomenclatureById(id);
}

async function archiveNomenclature(id, actorUserId) {
  return changeStatus(id, 'archived', actorUserId);
}

async function activateNomenclature(id, actorUserId) {
  return changeStatus(id, 'active', actorUserId);
}

async function getExternalCodeMappings(nomenclatureId) {
  const externalCodes = await fetchExternalCodes([nomenclatureId]);
  return externalCodes.map(normalizeExternalCode);
}

async function addExternalCode(nomenclatureId, input) {
  const { rows } = await postgres.query(
    `INSERT INTO nomenclature_external_codes (
       id,
       nomenclature_id,
       system_type,
       external_code,
       description,
       created_at,
       updated_at
     ) VALUES (
       $1::uuid, $2::uuid, $3, $4, $5, now(), now()
     )
     RETURNING *`,
    [
      randomUUID(),
      nomenclatureId,
      input.systemType,
      input.externalCode,
      input.description || '',
    ]
  );

  await postgres.query(
    `UPDATE nomenclature
        SET updated_at = now()
      WHERE id = $1::uuid`,
    [nomenclatureId]
  );

  return normalizeExternalCode(rows[0]);
}

async function removeExternalCode(nomenclatureId, mappingId) {
  await postgres.query(
    `DELETE FROM nomenclature_external_codes
      WHERE id = $1::uuid
        AND nomenclature_id = $2::uuid`,
    [mappingId, nomenclatureId]
  );

  await postgres.query(
    `UPDATE nomenclature
        SET updated_at = now()
      WHERE id = $1::uuid`,
    [nomenclatureId]
  );
}

module.exports = {
  activateNomenclature,
  addExternalCode,
  archiveNomenclature,
  createNomenclature,
  deleteNomenclature,
  getExternalCodeMappings,
  getNomenclature,
  getNomenclatureById,
  removeExternalCode,
  updateNomenclature,
};
