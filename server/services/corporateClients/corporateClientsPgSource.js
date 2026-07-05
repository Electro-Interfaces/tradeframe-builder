const postgres = require('../../db/pool');
const {
  normalizeCorporateClient,
  buildCorporateClientRecord,
} = require('./corporateClientsTransforms');

async function ensureNetworkExists(networkId) {
  const network = await postgres.queryOne(
    `SELECT id FROM networks WHERE id = $1::uuid AND deleted_at IS NULL LIMIT 1`,
    [networkId]
  );
  if (!network) {
    throw new Error('Сеть не найдена');
  }
}

async function getCorporateClients(filters = {}) {
  const params = [];
  const conditions = ['c.deleted_at IS NULL'];

  // Scope пользователя: null — без ограничений, массив (в т.ч. пустой) — жёсткий фильтр.
  if (Array.isArray(filters.allowedNetworkIds)) {
    params.push(filters.allowedNetworkIds);
    conditions.push(`c.network_id = ANY($${params.length}::uuid[])`);
  }

  if (filters.networkId) {
    params.push(filters.networkId);
    conditions.push(`c.network_id = $${params.length}::uuid`);
  }

  if (filters.status === 'active') {
    conditions.push('c.is_active = true');
  } else if (filters.status === 'inactive') {
    conditions.push('c.is_active = false');
  }

  if (filters.searchTerm) {
    params.push(`%${filters.searchTerm}%`);
    conditions.push(`(
      c.name ILIKE $${params.length}
      OR COALESCE(c.inn, '') ILIKE $${params.length}
      OR COALESCE(c.contact_person, '') ILIKE $${params.length}
    )`);
  }

  const { rows } = await postgres.query(
    `SELECT c.*, nw.name AS network_name
       FROM corporate_clients c
       INNER JOIN networks nw ON nw.id = c.network_id AND nw.deleted_at IS NULL
      WHERE ${conditions.join(' AND ')}
      ORDER BY c.name`,
    params
  );

  return rows.map(normalizeCorporateClient);
}

async function getCorporateClientById(id) {
  const row = await postgres.queryOne(
    `SELECT c.*, nw.name AS network_name
       FROM corporate_clients c
       INNER JOIN networks nw ON nw.id = c.network_id
      WHERE c.id = $1::uuid AND c.deleted_at IS NULL
      LIMIT 1`,
    [id]
  );
  return row ? normalizeCorporateClient(row) : null;
}

async function createCorporateClient(input, actorUserId) {
  await ensureNetworkExists(input.networkId);
  const record = buildCorporateClientRecord(input, actorUserId, { includeCreatedBy: true });

  const { rows } = await postgres.query(
    `INSERT INTO corporate_clients (
       network_id, name, inn, contact_person, phone, email, description, is_active, created_by, updated_by
     ) VALUES (
       $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10
     )
     RETURNING *`,
    [
      record.network_id, record.name, record.inn, record.contact_person,
      record.phone, record.email, record.description, record.is_active,
      record.created_by, record.updated_by,
    ]
  );

  return getCorporateClientById(rows[0].id);
}

async function updateCorporateClient(id, input, actorUserId) {
  await ensureNetworkExists(input.networkId);
  const record = buildCorporateClientRecord(input, actorUserId);

  const { rows } = await postgres.query(
    `UPDATE corporate_clients
        SET network_id = $2::uuid,
            name = $3,
            inn = $4,
            contact_person = $5,
            phone = $6,
            email = $7,
            description = $8,
            is_active = $9,
            updated_by = $10
      WHERE id = $1::uuid AND deleted_at IS NULL
    RETURNING *`,
    [
      id, record.network_id, record.name, record.inn, record.contact_person,
      record.phone, record.email, record.description, record.is_active, record.updated_by,
    ]
  );

  return rows[0] ? getCorporateClientById(id) : null;
}

async function deleteCorporateClient(id, actorUserId) {
  // Мягкое удаление: заказы (corporate_orders) ссылаются на клиента — не каскадим.
  await postgres.query(
    `UPDATE corporate_clients
        SET deleted_at = now(), is_active = false, updated_by = $2
      WHERE id = $1::uuid AND deleted_at IS NULL`,
    [id, actorUserId || 'system']
  );
}

async function setActive(id, isActive, actorUserId) {
  const { rows } = await postgres.query(
    `UPDATE corporate_clients
        SET is_active = $2, updated_by = $3
      WHERE id = $1::uuid AND deleted_at IS NULL
    RETURNING id`,
    [id, !!isActive, actorUserId || 'system']
  );
  return rows[0] ? getCorporateClientById(id) : null;
}

module.exports = {
  getCorporateClients,
  getCorporateClientById,
  createCorporateClient,
  updateCorporateClient,
  deleteCorporateClient,
  setActive,
};
