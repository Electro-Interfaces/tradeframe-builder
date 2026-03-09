const crypto = require('crypto');
const postgres = require('../../db/pool');

const {
  buildUserConsentRequirement,
  normalizeAcceptance,
  normalizeDocumentType,
  normalizeDocumentVersion,
} = require('./legalTransforms');

async function queryOne(client, text, params = []) {
  if (typeof client.queryOne === 'function') {
    return client.queryOne(text, params);
  }

  const result = await client.query(text, params);
  return result.rows[0] || null;
}

async function fetchDocumentTypeByCode(code, client = postgres) {
  const row = await queryOne(
    client,
    `SELECT *
       FROM document_types
      WHERE code = $1
      LIMIT 1`,
    [code]
  );

  return row || null;
}

async function fetchCurrentPublishedVersions(docTypeCode, client = postgres) {
  const params = [];
  const clauses = [
    `is_current = true`,
    `status = 'published'`,
  ];

  if (docTypeCode) {
    params.push(docTypeCode);
    clauses.push(`doc_type_code = $${params.length}`);
  }

  const { rows } = await client.query(
    `SELECT *
       FROM document_versions
      WHERE ${clauses.join(' AND ')}
      ORDER BY updated_at DESC`,
    params
  );

  return rows.map(normalizeDocumentVersion);
}

async function getDocumentTypes() {
  const { rows } = await postgres.query(
    `SELECT *
       FROM document_types
      WHERE is_active = true
      ORDER BY code`
  );

  const versions = await fetchCurrentPublishedVersions();
  const versionsByType = new Map(versions.map((item) => [item.doc_type_code, item]));

  return rows.map((row) => normalizeDocumentType(row, versionsByType.get(row.code)));
}

async function getDocumentTypeInfo(docTypeCode) {
  const items = await getDocumentTypes();
  return items.find((item) => item.code === docTypeCode) || null;
}

async function getDocumentVersions(docTypeCode) {
  const params = [];
  const whereClause = docTypeCode
    ? (() => {
      params.push(docTypeCode);
      return `WHERE doc_type_code = $${params.length}`;
    })()
    : '';

  const { rows } = await postgres.query(
    `SELECT *
       FROM document_versions
       ${whereClause}
      ORDER BY created_at DESC`,
    params
  );

  return rows.map(normalizeDocumentVersion);
}

async function getDocumentVersion(versionId) {
  const row = await queryOne(
    postgres,
    `SELECT *
       FROM document_versions
      WHERE id = $1
      LIMIT 1`,
    [versionId]
  );

  return normalizeDocumentVersion(row);
}

async function getCurrentDocumentVersion(docTypeCode) {
  const versions = await fetchCurrentPublishedVersions(docTypeCode);
  return versions[0] || null;
}

async function getUserAcceptances(userId) {
  return getAcceptanceJournal({ user_id: userId });
}

async function getUserConsentRequirement(userId) {
  const statusRow = await queryOne(
    postgres,
    `SELECT *
       FROM user_legal_statuses
      WHERE user_id = $1
      LIMIT 1`,
    [userId]
  );

  const currentVersions = await fetchCurrentPublishedVersions();
  return buildUserConsentRequirement(userId, statusRow, currentVersions);
}

async function applyUserLegalStatus(client, userId, docType, versionId, acceptedAt) {
  const now = acceptedAt || new Date().toISOString();
  const versionField = `${docType}_version_id`;
  const acceptedAtField = `${docType}_accepted_at`;

  await client.query(
    `INSERT INTO user_legal_statuses (
       user_id,
       ${versionField},
       ${acceptedAtField},
       requires_consent,
       created_at,
       updated_at
     ) VALUES (
       $1::uuid,
       $2::uuid,
       $3::timestamptz,
       true,
       now(),
       $3::timestamptz
     )
     ON CONFLICT (user_id) DO UPDATE
     SET ${versionField} = EXCLUDED.${versionField},
         ${acceptedAtField} = EXCLUDED.${acceptedAtField},
         updated_at = EXCLUDED.updated_at`,
    [userId, versionId, now]
  );

  const statusRow = await queryOne(
    client,
    `SELECT *
       FROM user_legal_statuses
      WHERE user_id = $1
      LIMIT 1`,
    [userId]
  );
  const currentVersions = await fetchCurrentPublishedVersions(null, client);
  const requirement = buildUserConsentRequirement(userId, statusRow, currentVersions);

  await client.query(
    `UPDATE user_legal_statuses
        SET requires_consent = $2,
            updated_at = $3::timestamptz
      WHERE user_id = $1::uuid`,
    [userId, requirement.requires_consent, now]
  );

  return requirement;
}

async function updateUserLegalStatus(userId, docType, versionId, acceptedAt) {
  return postgres.withTransaction((client) =>
    applyUserLegalStatus(client, userId, docType, versionId, acceptedAt)
  );
}

async function acceptDocument(input) {
  const version = input.versionId
    ? await getDocumentVersion(input.versionId)
    : await getCurrentDocumentVersion(input.docType);

  if (!version) {
    throw new Error('Версия документа не найдена');
  }

  const userId = input.userId;
  const userEmail = input.userEmail || '';
  if (!userId) {
    throw new Error('Пользователь не указан');
  }

  return postgres.withTransaction(async (client) => {
    const existing = await queryOne(
      client,
      `SELECT acceptances.*, users.name AS user_name, users.email
         FROM user_document_acceptances AS acceptances
         LEFT JOIN users ON users.id = acceptances.user_id
        WHERE acceptances.user_id = $1::uuid
          AND acceptances.doc_version_id = $2::uuid
          AND acceptances.is_revoked = false
        LIMIT 1`,
      [userId, version.id]
    );

    if (existing) {
      return normalizeAcceptance(existing);
    }

    const acceptedAt = new Date().toISOString();
    const { rows } = await client.query(
      `INSERT INTO user_document_acceptances (
         user_id,
         user_email,
         doc_version_id,
         doc_type_code,
         doc_version,
         accepted_at,
         ip_address,
         user_agent,
         source,
         is_revoked,
         created_at
       ) VALUES (
         $1::uuid, $2, $3::uuid, $4, $5, $6::timestamptz, $7, $8, $9, false, now()
       )
       RETURNING *`,
      [
        userId,
        userEmail,
        version.id,
        version.doc_type_code,
        version.version,
        acceptedAt,
        input.ipAddress || '',
        input.userAgent || '',
        input.source || 'web',
      ]
    );

    await applyUserLegalStatus(client, userId, version.doc_type_code, version.id, acceptedAt);

    const userRow = await queryOne(
      client,
      `SELECT name, email
         FROM users
        WHERE id = $1::uuid
        LIMIT 1`,
      [userId]
    );

    return normalizeAcceptance({
      ...rows[0],
      user_name: userRow?.name,
      email: userRow?.email,
    });
  });
}

function buildAcceptanceFilters(filters = {}) {
  const clauses = ['acceptances.is_revoked = false'];
  const params = [];

  if (filters.doc_type) {
    params.push(filters.doc_type);
    clauses.push(`acceptances.doc_type_code = $${params.length}`);
  }

  if (filters.version_id) {
    params.push(filters.version_id);
    clauses.push(`acceptances.doc_version_id = $${params.length}::uuid`);
  }

  if (filters.user_id) {
    params.push(filters.user_id);
    clauses.push(`acceptances.user_id = $${params.length}::uuid`);
  }

  if (filters.user_email) {
    params.push(`%${filters.user_email}%`);
    clauses.push(`COALESCE(acceptances.user_email, users.email, '') ILIKE $${params.length}`);
  }

  if (filters.date_from) {
    params.push(filters.date_from);
    clauses.push(`acceptances.accepted_at >= $${params.length}::timestamptz`);
  }

  if (filters.date_to) {
    params.push(filters.date_to);
    clauses.push(`acceptances.accepted_at <= $${params.length}::timestamptz`);
  }

  if (filters.source) {
    params.push(filters.source);
    clauses.push(`acceptances.source = $${params.length}`);
  }

  return {
    params,
    whereClause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
  };
}

async function getAcceptanceJournal(filters = {}) {
  const { params, whereClause } = buildAcceptanceFilters(filters);
  let limitClause = '';
  let offsetClause = '';

  if (filters.limit) {
    params.push(Number(filters.limit));
    limitClause = `LIMIT $${params.length}`;
  }

  if (filters.offset) {
    params.push(Number(filters.offset));
    offsetClause = `OFFSET $${params.length}`;
  }

  const { rows } = await postgres.query(
    `SELECT acceptances.*, users.name AS user_name, users.email
       FROM user_document_acceptances AS acceptances
       LEFT JOIN users ON users.id = acceptances.user_id
       ${whereClause}
      ORDER BY acceptances.accepted_at DESC
      ${limitClause}
      ${offsetClause}`,
    params
  );

  return rows.map(normalizeAcceptance);
}

async function getDocumentStatistics() {
  const currentVersions = await fetchCurrentPublishedVersions();
  if (!currentVersions.length) {
    return [];
  }

  const totalUsersRow = await queryOne(
    postgres,
    `SELECT COUNT(*)::int AS total
       FROM users
      WHERE deleted_at IS NULL`
  );

  const versionIds = currentVersions.map((item) => item.id);
  const { rows } = await postgres.query(
    `SELECT doc_version_id, COUNT(DISTINCT user_id)::int AS accepted_users
       FROM user_document_acceptances
      WHERE doc_version_id = ANY($1::uuid[])
        AND is_revoked = false
      GROUP BY doc_version_id`,
    [versionIds]
  );

  const acceptedByVersion = new Map(rows.map((item) => [item.doc_version_id, item.accepted_users]));
  const total = totalUsersRow?.total || 0;

  return currentVersions.map((version) => {
    const acceptedUsers = acceptedByVersion.get(version.id) || 0;
    return {
      doc_type_code: version.doc_type_code,
      current_version: version.version,
      published_at: version.published_at,
      total_users: total,
      accepted_users: acceptedUsers,
      pending_users: Math.max(total - acceptedUsers, 0),
      acceptance_percentage: total > 0 ? Math.round((acceptedUsers / total) * 100) : 0,
    };
  });
}

function buildChecksum(content) {
  return crypto.createHash('sha256').update(String(content || ''), 'utf8').digest('hex');
}

async function createDocumentDraft(input) {
  const docType = await fetchDocumentTypeByCode(input.docTypeCode);
  if (!docType) {
    throw new Error(`Тип документа ${input.docTypeCode} не найден`);
  }

  const { rows } = await postgres.query(
    `INSERT INTO document_versions (
       doc_type_id,
       doc_type_code,
       version,
       status,
       title,
       content_html,
       content_md,
       checksum,
       changelog,
       locale,
       is_current,
       editor_id,
       editor_name,
       created_at,
       updated_at
     ) VALUES (
       $1::uuid, $2, $3, 'draft', $4, $5, $6, $7, $8, $9, false, $10::uuid, $11, now(), now()
     )
     RETURNING *`,
    [
      docType.id,
      docType.code,
      input.version,
      docType.title,
      input.contentMd || '',
      input.contentMd || '',
      buildChecksum(input.contentMd || ''),
      input.changelog || '',
      input.locale || 'ru',
      input.editorId || null,
      input.editorName || '',
    ]
  );

  return normalizeDocumentVersion(rows[0]);
}

async function updateDocumentVersion(versionId, input) {
  const fields = ['updated_at = now()'];
  const params = [versionId];

  if (input.version !== undefined) {
    params.push(input.version);
    fields.push(`version = $${params.length}`);
  }

  if (input.contentMd !== undefined) {
    params.push(input.contentMd);
    fields.push(`content_md = $${params.length}`);
    params.push(input.contentMd);
    fields.push(`content_html = $${params.length}`);
    params.push(buildChecksum(input.contentMd));
    fields.push(`checksum = $${params.length}`);
  }

  if (input.changelog !== undefined) {
    params.push(input.changelog);
    fields.push(`changelog = $${params.length}`);
  }

  if (input.locale !== undefined) {
    params.push(input.locale);
    fields.push(`locale = $${params.length}`);
  }

  const { rows } = await postgres.query(
    `UPDATE document_versions
        SET ${fields.join(', ')}
      WHERE id = $1::uuid
        AND status = 'draft'
      RETURNING *`,
    params
  );

  if (!rows[0]) {
    throw new Error('Черновик не найден или уже опубликован');
  }

  return normalizeDocumentVersion(rows[0]);
}

async function publishDocumentVersion(versionId) {
  const version = await getDocumentVersion(versionId);
  if (!version) {
    throw new Error('Версия документа не найдена');
  }

  if (version.status !== 'draft') {
    throw new Error('Опубликовать можно только черновик');
  }

  return postgres.withTransaction(async (client) => {
    await client.query(
      `UPDATE document_versions
          SET is_current = false,
              updated_at = now()
        WHERE doc_type_code = $1`,
      [version.doc_type_code]
    );

    const { rows } = await client.query(
      `UPDATE document_versions
          SET status = 'published',
              is_current = true,
              published_at = now(),
              updated_at = now()
        WHERE id = $1::uuid
        RETURNING *`,
      [versionId]
    );

    return normalizeDocumentVersion(rows[0]);
  });
}

async function getAuditLog() {
  return [];
}

module.exports = {
  acceptDocument,
  createDocumentDraft,
  getAcceptanceJournal,
  getAuditLog,
  getCurrentDocumentVersion,
  getDocumentStatistics,
  getDocumentTypeInfo,
  getDocumentTypes,
  getDocumentVersion,
  getDocumentVersions,
  getUserAcceptances,
  getUserConsentRequirement,
  publishDocumentVersion,
  updateDocumentVersion,
  updateUserLegalStatus,
};
