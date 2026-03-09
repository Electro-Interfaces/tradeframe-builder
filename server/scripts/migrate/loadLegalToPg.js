require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const postgres = require('../../db/pool');

const args = process.argv.slice(2);
const reset = args.includes('--reset');
const positionalArgs = args.filter((arg) => !arg.startsWith('--'));

const inputPath = positionalArgs[0]
  ? path.resolve(positionalArgs[0])
  : path.join(__dirname, '..', '..', 'tmp', 'migration', 'legal-export.json');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Файл не найден: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureUniqueIds(items, key, label) {
  const seen = new Set();

  items.forEach((item) => {
    const value = item?.[key];
    if (!value) {
      throw new Error(`В ${label} найден элемент без поля ${key}`);
    }

    if (seen.has(value)) {
      throw new Error(`В ${label} найден дубликат ${key}: ${value}`);
    }

    seen.add(value);
  });
}

function ensureRelations(documentTypes, documentVersions, acceptances, statuses, userIds) {
  const documentTypeIds = new Set(documentTypes.map((item) => item.id));
  const versionIds = new Set(documentVersions.map((item) => item.id));

  documentVersions.forEach((item) => {
    if (!documentTypeIds.has(item.doc_type_id)) {
      throw new Error(`Для версии ${item.id} не найден тип документа ${item.doc_type_id}`);
    }
    // Обнуляем editor_id если пользователь не существует (системный UUID)
    if (item.editor_id && userIds && !userIds.has(item.editor_id)) {
      console.warn(`  [WARN] version ${item.id}: editor_id ${item.editor_id} не найден, обнуляем`);
      item.editor_id = null;
    }
  });

  acceptances.forEach((item) => {
    if (!versionIds.has(item.doc_version_id)) {
      throw new Error(`Для согласия ${item.id} не найдена версия документа ${item.doc_version_id}`);
    }
  });

  statuses.forEach((item) => {
    ['tos_version_id', 'privacy_version_id', 'pdn_version_id'].forEach((field) => {
      if (item[field] && !versionIds.has(item[field])) {
        throw new Error(`Для user_legal_statuses ${item.user_id} не найдена версия ${item[field]} (${field})`);
      }
    });
  });
}

async function upsertDocumentTypes(client, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO document_types (
         id,
         code,
         title,
         description,
         is_active,
         created_at,
         updated_at
       ) VALUES (
         $1::uuid, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz
       )
       ON CONFLICT (id) DO UPDATE
       SET code = EXCLUDED.code,
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           is_active = EXCLUDED.is_active,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at`,
      [
        item.id,
        item.code,
        item.title,
        item.description || '',
        item.is_active !== false,
        item.created_at,
        item.updated_at || item.created_at,
      ]
    );
  }
}

async function upsertDocumentVersions(client, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO document_versions (
         id,
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
         published_at,
         archived_at,
         created_at,
         updated_at
       ) VALUES (
         $1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
         $13::uuid, $14, $15::timestamptz, $16::timestamptz, $17::timestamptz, $18::timestamptz
       )
       ON CONFLICT (id) DO UPDATE
       SET doc_type_id = EXCLUDED.doc_type_id,
           doc_type_code = EXCLUDED.doc_type_code,
           version = EXCLUDED.version,
           status = EXCLUDED.status,
           title = EXCLUDED.title,
           content_html = EXCLUDED.content_html,
           content_md = EXCLUDED.content_md,
           checksum = EXCLUDED.checksum,
           changelog = EXCLUDED.changelog,
           locale = EXCLUDED.locale,
           is_current = EXCLUDED.is_current,
           editor_id = EXCLUDED.editor_id,
           editor_name = EXCLUDED.editor_name,
           published_at = EXCLUDED.published_at,
           archived_at = EXCLUDED.archived_at,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at`,
      [
        item.id,
        item.doc_type_id,
        item.doc_type_code,
        item.version,
        item.status || 'draft',
        item.title || '',
        item.content_html || '',
        item.content_md || '',
        item.checksum || '',
        item.changelog || '',
        item.locale || 'ru',
        Boolean(item.is_current),
        item.editor_id || null,
        item.editor_name || '',
        item.published_at || null,
        item.archived_at || null,
        item.created_at,
        item.updated_at || item.created_at,
      ]
    );
  }
}

async function upsertAcceptances(client, items) {
  // Дедупликация: partial unique index (user_id, doc_version_id) WHERE is_revoked = false
  // Оставляем последнее (по accepted_at) неотозванное согласие для каждой пары
  const seen = new Map();
  for (const item of items) {
    if (!item.is_revoked) {
      const key = `${item.user_id}:${item.doc_version_id}`;
      const existing = seen.get(key);
      if (existing) {
        // Помечаем старую запись как отозванную
        const existingDate = new Date(existing.accepted_at || 0).getTime();
        const currentDate = new Date(item.accepted_at || 0).getTime();
        if (currentDate >= existingDate) {
          existing.is_revoked = true;
          seen.set(key, item);
        } else {
          item.is_revoked = true;
        }
      } else {
        seen.set(key, item);
      }
    }
  }

  for (const item of items) {
    await client.query(
      `INSERT INTO user_document_acceptances (
         id,
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
         revoked_at,
         created_at
       ) VALUES (
         $1::uuid, $2::uuid, $3, $4::uuid, $5, $6, $7::timestamptz, $8, $9, $10, $11, $12::timestamptz, $13::timestamptz
       )
       ON CONFLICT (id) DO UPDATE
       SET user_id = EXCLUDED.user_id,
           user_email = EXCLUDED.user_email,
           doc_version_id = EXCLUDED.doc_version_id,
           doc_type_code = EXCLUDED.doc_type_code,
           doc_version = EXCLUDED.doc_version,
           accepted_at = EXCLUDED.accepted_at,
           ip_address = EXCLUDED.ip_address,
           user_agent = EXCLUDED.user_agent,
           source = EXCLUDED.source,
           is_revoked = EXCLUDED.is_revoked,
           revoked_at = EXCLUDED.revoked_at,
           created_at = EXCLUDED.created_at`,
      [
        item.id,
        item.user_id,
        item.user_email || '',
        item.doc_version_id,
        item.doc_type_code,
        item.doc_version || '',
        item.accepted_at,
        item.ip_address || '',
        item.user_agent || '',
        item.source || 'web',
        Boolean(item.is_revoked),
        item.revoked_at || null,
        item.created_at || item.accepted_at,
      ]
    );
  }
}

async function upsertStatuses(client, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO user_legal_statuses (
         user_id,
         tos_version_id,
         privacy_version_id,
         pdn_version_id,
         tos_accepted_at,
         privacy_accepted_at,
         pdn_accepted_at,
         requires_consent,
         created_at,
         updated_at
       ) VALUES (
         $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::timestamptz, $6::timestamptz, $7::timestamptz, $8, $9::timestamptz, $10::timestamptz
       )
       ON CONFLICT (user_id) DO UPDATE
       SET tos_version_id = EXCLUDED.tos_version_id,
           privacy_version_id = EXCLUDED.privacy_version_id,
           pdn_version_id = EXCLUDED.pdn_version_id,
           tos_accepted_at = EXCLUDED.tos_accepted_at,
           privacy_accepted_at = EXCLUDED.privacy_accepted_at,
           pdn_accepted_at = EXCLUDED.pdn_accepted_at,
           requires_consent = EXCLUDED.requires_consent,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at`,
      [
        item.user_id,
        item.tos_version_id || null,
        item.privacy_version_id || null,
        item.pdn_version_id || null,
        item.tos_accepted_at || null,
        item.privacy_accepted_at || null,
        item.pdn_accepted_at || null,
        item.requires_consent !== false,
        item.created_at || item.updated_at || new Date().toISOString(),
        item.updated_at || item.created_at || new Date().toISOString(),
      ]
    );
  }
}

async function getCounts(client) {
  const { rows } = await client.query(
    `SELECT
       (SELECT COUNT(*)::int FROM document_types) AS document_types,
       (SELECT COUNT(*)::int FROM document_versions) AS document_versions,
       (SELECT COUNT(*)::int FROM user_document_acceptances) AS user_document_acceptances,
       (SELECT COUNT(*)::int FROM user_legal_statuses) AS user_legal_statuses`
  );

  return rows[0];
}

async function main() {
  const input = readJson(inputPath);
  const documentTypes = Array.isArray(input.documentTypes) ? input.documentTypes : [];
  const documentVersions = Array.isArray(input.documentVersions) ? input.documentVersions : [];
  const userDocumentAcceptances = Array.isArray(input.userDocumentAcceptances)
    ? input.userDocumentAcceptances
    : [];
  const userLegalStatuses = Array.isArray(input.userLegalStatuses) ? input.userLegalStatuses : [];

  ensureUniqueIds(documentTypes, 'id', 'documentTypes');
  ensureUniqueIds(documentVersions, 'id', 'documentVersions');
  ensureUniqueIds(userDocumentAcceptances, 'id', 'userDocumentAcceptances');
  ensureUniqueIds(userLegalStatuses, 'user_id', 'userLegalStatuses');
  // Загружаем список пользователей для проверки FK
  const authPath = path.join(__dirname, '..', '..', 'tmp', 'migration', 'auth-export.json');
  let userIds = null;
  if (fs.existsSync(authPath)) {
    const authData = readJson(authPath);
    userIds = new Set((authData.users || []).map(u => u.id));
  }
  ensureRelations(documentTypes, documentVersions, userDocumentAcceptances, userLegalStatuses, userIds);

  const pool = postgres.getPool();
  if (!pool) {
    throw new Error('DATABASE_URL не задан, загрузка в PostgreSQL невозможна');
  }

  const result = await postgres.withTransaction(async (client) => {
    if (reset) {
      await client.query('DELETE FROM user_document_acceptances');
      await client.query('DELETE FROM user_legal_statuses');
      await client.query('DELETE FROM document_versions');
      await client.query('DELETE FROM document_types');
    }

    await upsertDocumentTypes(client, documentTypes);
    await upsertDocumentVersions(client, documentVersions);
    await upsertAcceptances(client, userDocumentAcceptances);
    await upsertStatuses(client, userLegalStatuses);

    return getCounts(client);
  });

  console.log(`Загружено типов документов: ${documentTypes.length}`);
  console.log(`Загружено версий документов: ${documentVersions.length}`);
  console.log(`Загружено согласий: ${userDocumentAcceptances.length}`);
  console.log(`Загружено статусов пользователей: ${userLegalStatuses.length}`);
  console.log(`Состояние БД: document_types=${result.document_types}, document_versions=${result.document_versions}, user_document_acceptances=${result.user_document_acceptances}, user_legal_statuses=${result.user_legal_statuses}`);
  console.log(`Режим загрузки: ${reset ? 'reset + upsert' : 'upsert'}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await postgres.closePool();
  });
