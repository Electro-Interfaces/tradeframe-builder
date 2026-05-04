const postgres = require('../db/pool');

const SELECT_HEAD = `
  SELECT
    a.*,
    n.name AS network_name,
    tp.name AS trading_point_name,
    tp.address AS trading_point_address,
    cu.name AS created_by_name,
    cu.email AS created_by_email,
    su.name AS sent_by_name,
    su.email AS sent_by_email,
    xu.name AS cancelled_by_name,
    xu.email AS cancelled_by_email,
    COALESCE((
      SELECT SUM(delta_volume_l)
      FROM inventory_adjustment_items i
      WHERE i.adjustment_id = a.id AND i.fact_volume_l IS NOT NULL
    ), 0) AS total_delta_volume_l,
    COALESCE((
      SELECT COUNT(*)
      FROM inventory_adjustment_items i
      WHERE i.adjustment_id = a.id AND i.fact_volume_l IS NOT NULL
    ), 0) AS filled_items_count
  FROM inventory_adjustments a
  JOIN networks n ON n.id = a.network_id
  JOIN trading_points tp ON tp.id = a.trading_point_id
  JOIN users cu ON cu.id = a.created_by_user_id
  LEFT JOIN users su ON su.id = a.sent_by_user_id
  LEFT JOIN users xu ON xu.id = a.cancelled_by_user_id
`;

function normalizeAdjustment(row) {
  if (!row) return null;
  return {
    id: row.id,
    networkId: row.network_id,
    networkName: row.network_name || null,
    tradingPointId: row.trading_point_id,
    tradingPointName: row.trading_point_name || null,
    tradingPointAddress: row.trading_point_address || null,
    orderNumber: row.order_number,
    orderDate: row.order_date,
    inventoryDate: row.inventory_date,
    effectiveAt: row.effective_at,
    comment: row.comment,
    status: row.status,
    createdByUserId: row.created_by_user_id,
    createdByName: row.created_by_name || null,
    createdByEmail: row.created_by_email || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sentByUserId: row.sent_by_user_id,
    sentByName: row.sent_by_name || null,
    sentByEmail: row.sent_by_email || null,
    sentAt: row.sent_at,
    cancelledByUserId: row.cancelled_by_user_id,
    cancelledByName: row.cancelled_by_name || null,
    cancelledByEmail: row.cancelled_by_email || null,
    cancelledAt: row.cancelled_at,
    cancelReason: row.cancel_reason,
    pdfPath: row.pdf_path,
    emailTo: row.email_to,
    emailStatus: row.email_status,
    emailError: row.email_error,
    totalDeltaVolumeL: row.total_delta_volume_l !== undefined && row.total_delta_volume_l !== null
      ? Number(row.total_delta_volume_l)
      : 0,
    filledItemsCount: row.filled_items_count !== undefined && row.filled_items_count !== null
      ? Number(row.filled_items_count)
      : 0,
  };
}

function normalizeItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    adjustmentId: row.adjustment_id,
    tankNumber: row.tank_number,
    fuelName: row.fuel_name,
    bookVolumeL: row.book_volume_l !== null ? Number(row.book_volume_l) : null,
    bookMassKg: row.book_mass_kg !== null ? Number(row.book_mass_kg) : null,
    factVolumeL: row.fact_volume_l !== null ? Number(row.fact_volume_l) : null,
    factMassKg: row.fact_mass_kg !== null ? Number(row.fact_mass_kg) : null,
    deltaVolumeL: row.delta_volume_l !== null ? Number(row.delta_volume_l) : null,
    deltaMassKg: row.delta_mass_kg !== null ? Number(row.delta_mass_kg) : null,
  };
}

async function listAdjustments(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.networkId) {
    params.push(filters.networkId);
    conditions.push(`a.network_id = $${params.length}::uuid`);
  }

  if (filters.tradingPointId) {
    params.push(filters.tradingPointId);
    conditions.push(`a.trading_point_id = $${params.length}`);
  }

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`a.status = $${params.length}`);
  }

  if (filters.createdByUserId) {
    params.push(filters.createdByUserId);
    conditions.push(`a.created_by_user_id = $${params.length}::uuid`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const limit = Number(filters.limit || 200);
  const offset = Number(filters.offset || 0);
  params.push(limit);
  const limitParam = params.length;
  params.push(offset);
  const offsetParam = params.length;

  const { rows } = await postgres.query(
    `${SELECT_HEAD}
     ${where}
     ORDER BY a.created_at DESC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    params
  );

  return rows.map(normalizeAdjustment);
}

async function getAdjustmentById(id) {
  const row = await postgres.queryOne(
    `${SELECT_HEAD} WHERE a.id = $1::uuid LIMIT 1`,
    [id]
  );
  return normalizeAdjustment(row);
}

async function getItemsForAdjustment(adjustmentId) {
  const { rows } = await postgres.query(
    `SELECT * FROM inventory_adjustment_items
     WHERE adjustment_id = $1::uuid
     ORDER BY tank_number ASC`,
    [adjustmentId]
  );
  return rows.map(normalizeItem);
}

async function createAdjustment(data, userId) {
  return postgres.withTransaction(async (client) => {
    const headerInsert = await client.query(
      `INSERT INTO inventory_adjustments (
         network_id, trading_point_id,
         order_number, order_date, inventory_date, effective_at, comment,
         status,
         created_by_user_id
       ) VALUES (
         $1::uuid, $2,
         $3, $4::date, $5::date, $6::timestamptz, $7,
         'draft',
         $8::uuid
       )
       RETURNING id`,
      [
        data.networkId,
        data.tradingPointId,
        data.orderNumber,
        data.orderDate,
        data.inventoryDate,
        data.effectiveAt,
        data.comment ?? null,
        userId,
      ]
    );

    const adjustmentId = headerInsert.rows[0].id;

    if (Array.isArray(data.items) && data.items.length) {
      await insertItems(client, adjustmentId, data.items);
    }

    return adjustmentId;
  });
}

async function insertItems(client, adjustmentId, items) {
  if (!items.length) return;

  const COLS = 7;
  const params = [];
  const valueRows = [];

  for (const item of items) {
    const offset = params.length;
    params.push(
      adjustmentId,
      item.tankNumber,
      item.fuelName,
      item.bookVolumeL,
      item.bookMassKg ?? null,
      item.factVolumeL ?? null,
      item.factMassKg ?? null
    );
    const placeholders = Array.from({ length: COLS }, (_, i) => `$${offset + i + 1}`);
    valueRows.push(`(${placeholders[0]}::uuid, ${placeholders.slice(1).join(',')})`);
  }

  await client.query(
    `INSERT INTO inventory_adjustment_items (
       adjustment_id, tank_number, fuel_name,
       book_volume_l, book_mass_kg,
       fact_volume_l, fact_mass_kg
     ) VALUES ${valueRows.join(',')}`,
    params
  );
}

async function updateDraft(id, data) {
  return postgres.withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE inventory_adjustments
         SET order_number   = COALESCE($2, order_number),
             order_date     = COALESCE($3::date, order_date),
             inventory_date = COALESCE($4::date, inventory_date),
             effective_at   = COALESCE($5::timestamptz, effective_at),
             comment        = $6
       WHERE id = $1::uuid AND status = 'draft'
       RETURNING id`,
      [
        id,
        data.orderNumber ?? null,
        data.orderDate ?? null,
        data.inventoryDate ?? null,
        data.effectiveAt ?? null,
        data.comment ?? null,
      ]
    );

    if (!rows.length) {
      return false;
    }

    if (Array.isArray(data.items)) {
      await client.query(
        `DELETE FROM inventory_adjustment_items WHERE adjustment_id = $1::uuid`,
        [id]
      );
      if (data.items.length) {
        await insertItems(client, id, data.items);
      }
    }

    return true;
  });
}

async function deleteDraft(id) {
  const result = await postgres.query(
    `DELETE FROM inventory_adjustments
     WHERE id = $1::uuid AND status = 'draft'
     RETURNING id`,
    [id]
  );
  return result.rowCount > 0;
}

async function markCancelled(id, userId, reason) {
  const result = await postgres.query(
    `UPDATE inventory_adjustments
       SET status = 'cancelled',
           cancelled_by_user_id = $2::uuid,
           cancelled_at = now(),
           cancel_reason = $3
     WHERE id = $1::uuid AND status = 'draft'
     RETURNING id`,
    [id, userId, reason ?? null]
  );
  return result.rowCount > 0;
}

async function markSentSuccess(id, userId, { pdfPath, emailTo }) {
  const result = await postgres.query(
    `UPDATE inventory_adjustments
       SET status = 'sent',
           sent_by_user_id = $2::uuid,
           sent_at = now(),
           pdf_path = $3,
           email_to = $4,
           email_status = 'sent',
           email_error = NULL
     WHERE id = $1::uuid AND status IN ('draft','sent')
     RETURNING id`,
    [id, userId, pdfPath ?? null, emailTo ?? null]
  );
  return result.rowCount > 0;
}

async function markSendFailure(id, errorMessage) {
  const result = await postgres.query(
    `UPDATE inventory_adjustments
       SET email_status = 'failed',
           email_error = $2
     WHERE id = $1::uuid AND status = 'draft'
     RETURNING id`,
    [id, errorMessage ?? null]
  );
  return result.rowCount > 0;
}

async function upsertEmailRecipients(networkId, { recipients, cc, fromAddress }) {
  const row = await postgres.queryOne(
    `INSERT INTO inventory_adjustment_email_recipients (network_id, recipients, cc, from_address)
     VALUES ($1::uuid, $2::text[], $3::text[], $4)
     ON CONFLICT (network_id)
     DO UPDATE SET
       recipients = EXCLUDED.recipients,
       cc = EXCLUDED.cc,
       from_address = EXCLUDED.from_address
     RETURNING recipients, cc, from_address`,
    [networkId, recipients, cc || [], fromAddress || null]
  );

  return {
    recipients: row.recipients || [],
    cc: row.cc || [],
    fromAddress: row.from_address || null,
  };
}

async function getEmailRecipients(networkId) {
  const row = await postgres.queryOne(
    `SELECT recipients, cc, from_address
       FROM inventory_adjustment_email_recipients
      WHERE network_id = $1::uuid
      LIMIT 1`,
    [networkId]
  );

  if (!row) return null;

  return {
    recipients: row.recipients || [],
    cc: row.cc || [],
    fromAddress: row.from_address || null,
  };
}

module.exports = {
  listAdjustments,
  getAdjustmentById,
  getItemsForAdjustment,
  createAdjustment,
  updateDraft,
  deleteDraft,
  markCancelled,
  markSentSuccess,
  markSendFailure,
  getEmailRecipients,
  upsertEmailRecipients,
};
