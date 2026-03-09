const postgres = require('../../db/pool');
const {
  buildMessageStats,
  buildUserContext,
  filterUsersForMessage,
  normalizeMessage,
  normalizeMessageRecipient,
  normalizeRecipientCandidate,
} = require('./messagingTransforms');

async function loadAuthorsByIds(authorIds) {
  if (!authorIds.length) {
    return new Map();
  }

  const { rows } = await postgres.query(
    `SELECT id, email, name
       FROM users
      WHERE id = ANY($1::uuid[])`,
    [authorIds]
  );

  return new Map(rows.map((row) => [row.id, row]));
}

async function loadUserContext(userIds) {
  if (!userIds.length) {
    return new Map();
  }

  const usersResult = await postgres.query(
    `SELECT id, email, name
       FROM users
      WHERE id = ANY($1::uuid[])
        AND deleted_at IS NULL
        AND status = 'active'`,
    [userIds]
  );

  const settingsResult = await postgres.query(
    `SELECT *
       FROM user_notification_settings
      WHERE user_id = ANY($1::uuid[])`,
    [userIds]
  );

  const rolesResult = await postgres.query(
    `SELECT
       ur.user_id,
       ur.role_id,
       ur.scope_value,
       r.id AS role_join_id,
       r.name AS role_name,
       r.code AS role_code,
       r.scope AS role_scope,
       r.scope_values AS role_scope_values
     FROM user_roles ur
     INNER JOIN roles r
       ON r.id = ur.role_id
      AND r.deleted_at IS NULL
      AND r.is_active = true
     WHERE ur.user_id = ANY($1::uuid[])
       AND ur.deleted_at IS NULL
       AND ur.is_active = true`,
    [userIds]
  );

  const settingsByUserId = new Map(settingsResult.rows.map((row) => [row.user_id, row]));
  const rolesByUserId = new Map();

  rolesResult.rows.forEach((row) => {
    if (!rolesByUserId.has(row.user_id)) {
      rolesByUserId.set(row.user_id, []);
    }

    rolesByUserId.get(row.user_id).push({
      user_id: row.user_id,
      role_id: row.role_id,
      scope_value: row.scope_value,
      role: {
        id: row.role_join_id,
        name: row.role_name,
        code: row.role_code,
        scope: row.role_scope,
        scope_values: row.role_scope_values || [],
      },
    });
  });

  return new Map(usersResult.rows.map((row) => [
    row.id,
    buildUserContext(row, settingsByUserId.get(row.id), rolesByUserId.get(row.id) || []),
  ]));
}

async function getMessages(params = {}) {
  const filters = [];
  const values = [];

  if (params.status) {
    values.push(String(params.status));
    filters.push(`status = $${values.length}`);
  }

  if (params.authorId) {
    values.push(String(params.authorId));
    filters.push(`author_id = $${values.length}::uuid`);
  }

  if (params.networkId) {
    values.push(String(params.networkId));
    filters.push(`(recipient_type <> 'networks' OR COALESCE(recipient_filter->'network_ids', '[]'::jsonb) ? $${values.length})`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const limit = Number(params.limit || 50);
  const offset = Number(params.offset || 0);

  const countResult = await postgres.query(
    `SELECT COUNT(*)::int AS total
       FROM broadcast_messages
       ${whereClause}`,
    values
  );

  values.push(limit);
  const limitParam = values.length;
  values.push(offset);
  const offsetParam = values.length;

  const messagesResult = await postgres.query(
    `SELECT *
       FROM broadcast_messages
       ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${limitParam}
      OFFSET $${offsetParam}`,
    values
  );

  const authorsById = await loadAuthorsByIds(
    [...new Set(messagesResult.rows.map((row) => row.author_id).filter(Boolean))]
  );

  return {
    data: messagesResult.rows.map((row) => normalizeMessage(row, authorsById.get(row.author_id))),
    total: countResult.rows[0]?.total || 0,
    limit,
    offset,
  };
}

async function getMessageById(messageId) {
  const messageRow = await postgres.queryOne(
    `SELECT *
       FROM broadcast_messages
      WHERE id = $1
      LIMIT 1`,
    [messageId]
  );

  if (!messageRow) {
    return null;
  }

  const authorMap = await loadAuthorsByIds([messageRow.author_id]);
  const recipientsResult = await postgres.query(
    `SELECT *
       FROM message_recipients
      WHERE message_id = $1
      ORDER BY created_at ASC`,
    [messageId]
  );
  const recipientUserMap = await loadUserContext(
    [...new Set(recipientsResult.rows.map((row) => row.user_id).filter(Boolean))]
  );

  return normalizeMessage(
    messageRow,
    authorMap.get(messageRow.author_id),
    recipientsResult.rows.map((row) => normalizeMessageRecipient(row, recipientUserMap.get(row.user_id)))
  );
}

async function createMessage(input) {
  const { rows } = await postgres.query(
    `INSERT INTO broadcast_messages (
       author_id,
       title,
       content,
       content_html,
       message_type,
       priority,
       channels,
       recipient_type,
       recipient_filter,
       status,
       scheduled_at,
       metadata
     ) VALUES (
       $1::uuid, $2, $3, $4, $5, $6, $7::text[], $8, $9::jsonb, $10, $11::timestamptz, $12::jsonb
     )
     RETURNING *`,
    [
      input.author_id,
      input.title,
      input.content,
      input.content_html || null,
      input.message_type || 'news',
      input.priority || 'medium',
      input.channels?.length ? input.channels : ['telegram', 'email'],
      input.recipient_type || 'all',
      JSON.stringify(input.recipient_filter || {}),
      input.status || 'draft',
      input.scheduled_at || null,
      JSON.stringify(input.metadata || {}),
    ]
  );

  const authorMap = await loadAuthorsByIds([rows[0].author_id]);
  return normalizeMessage(rows[0], authorMap.get(rows[0].author_id));
}

async function updateMessage(messageId, updates) {
  const current = await getMessageById(messageId);
  if (!current) {
    throw new Error('Сообщение не найдено');
  }

  const nextMessage = {
    ...current,
    ...updates,
    recipient_filter: updates.recipient_filter !== undefined ? updates.recipient_filter : current.recipient_filter,
    metadata: updates.metadata !== undefined ? updates.metadata : current.metadata,
    channels: updates.channels !== undefined ? updates.channels : current.channels,
  };

  const { rows } = await postgres.query(
    `UPDATE broadcast_messages
        SET title = $2,
            content = $3,
            content_html = $4,
            message_type = $5,
            priority = $6,
            channels = $7::text[],
            recipient_type = $8,
            recipient_filter = $9::jsonb,
            status = $10,
            scheduled_at = $11::timestamptz,
            sent_at = $12::timestamptz,
            total_recipients = $13,
            sent_count = $14,
            delivered_count = $15,
            failed_count = $16,
            read_count = $17,
            metadata = $18::jsonb,
            updated_at = now()
      WHERE id = $1
      RETURNING *`,
    [
      messageId,
      nextMessage.title,
      nextMessage.content,
      nextMessage.content_html || null,
      nextMessage.message_type || 'news',
      nextMessage.priority || 'medium',
      nextMessage.channels?.length ? nextMessage.channels : ['telegram', 'email'],
      nextMessage.recipient_type || 'all',
      JSON.stringify(nextMessage.recipient_filter || {}),
      nextMessage.status || 'draft',
      nextMessage.scheduled_at || null,
      nextMessage.sent_at || null,
      Number(nextMessage.total_recipients || 0),
      Number(nextMessage.sent_count || 0),
      Number(nextMessage.delivered_count || 0),
      Number(nextMessage.failed_count || 0),
      Number(nextMessage.read_count || 0),
      JSON.stringify(nextMessage.metadata || {}),
    ]
  );

  const authorMap = await loadAuthorsByIds([rows[0].author_id]);
  return normalizeMessage(rows[0], authorMap.get(rows[0].author_id));
}

async function deleteMessage(messageId) {
  await postgres.query(
    `DELETE FROM broadcast_messages
      WHERE id = $1`,
    [messageId]
  );
}

async function getRecipientCandidates(message) {
  const usersResult = await postgres.query(
    `SELECT id, email, name
       FROM users
      WHERE deleted_at IS NULL
        AND status = 'active'
      ORDER BY email`
  );

  const userIds = usersResult.rows.map((row) => row.id);
  const userMap = await loadUserContext(userIds);
  const allUsers = usersResult.rows
    .map((row) => userMap.get(row.id))
    .filter(Boolean);

  return filterUsersForMessage(allUsers, message).map(normalizeRecipientCandidate);
}

async function createMessageRecipients(records) {
  if (!records.length) {
    return [];
  }

  return postgres.withTransaction(async (client) => {
    const insertedRows = [];

    for (const record of records) {
      const result = await client.query(
        `INSERT INTO message_recipients (
           message_id,
           user_id,
           channel,
           contact_info,
           delivery_status
         ) VALUES (
           $1::uuid, $2::uuid, $3, $4, $5
         )
         ON CONFLICT (message_id, user_id, channel) DO UPDATE
         SET contact_info = EXCLUDED.contact_info,
             delivery_status = EXCLUDED.delivery_status,
             updated_at = now()
         RETURNING *`,
        [
          record.message_id,
          record.user_id,
          record.channel,
          record.contact_info || null,
          record.delivery_status || 'pending',
        ]
      );

      insertedRows.push(result.rows[0]);
    }

    return insertedRows;
  });
}

async function updateRecipientStatus(messageId, userId, channel, updates) {
  const current = await postgres.queryOne(
    `SELECT *
       FROM message_recipients
      WHERE message_id = $1
        AND user_id = $2
        AND channel = $3
      LIMIT 1`,
    [messageId, userId, channel]
  );

  if (!current) {
    return null;
  }

  const nextValue = {
    ...current,
    ...updates,
  };

  const { rows } = await postgres.query(
    `UPDATE message_recipients
        SET contact_info = $4,
            delivery_status = $5,
            sent_at = $6::timestamptz,
            delivered_at = $7::timestamptz,
            read_at = $8::timestamptz,
            error_message = $9,
            retry_count = $10,
            updated_at = now()
      WHERE message_id = $1
        AND user_id = $2
        AND channel = $3
      RETURNING *`,
    [
      messageId,
      userId,
      channel,
      nextValue.contact_info || null,
      nextValue.delivery_status || 'pending',
      nextValue.sent_at || null,
      nextValue.delivered_at || null,
      nextValue.read_at || null,
      nextValue.error_message || null,
      Number(nextValue.retry_count || 0),
    ]
  );

  return rows[0] || null;
}

async function getMessageStats(messageId) {
  const { rows } = await postgres.query(
    `SELECT channel, delivery_status
       FROM message_recipients
      WHERE message_id = $1`,
    [messageId]
  );

  return buildMessageStats(rows);
}

module.exports = {
  createMessage,
  createMessageRecipients,
  deleteMessage,
  getMessageById,
  getMessageStats,
  getMessages,
  getRecipientCandidates,
  updateMessage,
  updateRecipientStatus,
};
