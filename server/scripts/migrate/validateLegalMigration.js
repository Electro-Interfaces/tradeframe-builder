require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const postgres = require('../../db/pool');

const inputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', '..', 'tmp', 'migration', 'legal-export.json');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Файл не найден: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildIdSet(items, key = 'id') {
  return new Set(items.map((item) => item?.[key]).filter(Boolean));
}

function diffMissing(sourceIds, targetIds) {
  return [...sourceIds].filter((id) => !targetIds.has(id));
}

function diffUnexpected(sourceIds, targetIds) {
  return [...targetIds].filter((id) => !sourceIds.has(id));
}

async function fetchCounts(client) {
  const { rows } = await client.query(
    `SELECT
       (SELECT COUNT(*)::int FROM document_types) AS document_types,
       (SELECT COUNT(*)::int FROM document_versions) AS document_versions,
       (SELECT COUNT(*)::int FROM user_document_acceptances) AS user_document_acceptances,
       (SELECT COUNT(*)::int FROM user_legal_statuses) AS user_legal_statuses`
  );

  return rows[0];
}

async function fetchIdSets(client) {
  const documentTypes = await client.query('SELECT id FROM document_types');
  const documentVersions = await client.query('SELECT id FROM document_versions');
  const acceptances = await client.query('SELECT id FROM user_document_acceptances');
  const statuses = await client.query('SELECT user_id FROM user_legal_statuses');

  return {
    documentTypes: new Set(documentTypes.rows.map((row) => row.id)),
    documentVersions: new Set(documentVersions.rows.map((row) => row.id)),
    userDocumentAcceptances: new Set(acceptances.rows.map((row) => row.id)),
    userLegalStatuses: new Set(statuses.rows.map((row) => row.user_id)),
  };
}

async function main() {
  const input = readJson(inputPath);
  const documentTypes = Array.isArray(input.documentTypes) ? input.documentTypes : [];
  const documentVersions = Array.isArray(input.documentVersions) ? input.documentVersions : [];
  const userDocumentAcceptances = Array.isArray(input.userDocumentAcceptances)
    ? input.userDocumentAcceptances
    : [];
  const userLegalStatuses = Array.isArray(input.userLegalStatuses) ? input.userLegalStatuses : [];

  const pool = postgres.getPool();
  if (!pool) {
    throw new Error('DATABASE_URL не задан, валидация PostgreSQL невозможна');
  }

  const client = await pool.connect();
  try {
    const counts = await fetchCounts(client);
    const idSets = await fetchIdSets(client);
    const errors = [];

    if (counts.document_types !== documentTypes.length) {
      errors.push(`Count mismatch document_types: source=${documentTypes.length} target=${counts.document_types}`);
    }

    if (counts.document_versions !== documentVersions.length) {
      errors.push(`Count mismatch document_versions: source=${documentVersions.length} target=${counts.document_versions}`);
    }

    if (counts.user_document_acceptances !== userDocumentAcceptances.length) {
      errors.push(`Count mismatch user_document_acceptances: source=${userDocumentAcceptances.length} target=${counts.user_document_acceptances}`);
    }

    if (counts.user_legal_statuses !== userLegalStatuses.length) {
      errors.push(`Count mismatch user_legal_statuses: source=${userLegalStatuses.length} target=${counts.user_legal_statuses}`);
    }

    const checks = [
      ['document_types', buildIdSet(documentTypes), idSets.documentTypes],
      ['document_versions', buildIdSet(documentVersions), idSets.documentVersions],
      ['user_document_acceptances', buildIdSet(userDocumentAcceptances), idSets.userDocumentAcceptances],
      ['user_legal_statuses', buildIdSet(userLegalStatuses, 'user_id'), idSets.userLegalStatuses],
    ];

    checks.forEach(([label, sourceIds, targetIds]) => {
      const missing = diffMissing(sourceIds, targetIds);
      const unexpected = diffUnexpected(sourceIds, targetIds);

      if (missing.length) {
        errors.push(`Отсутствуют ${label}: ${missing.slice(0, 10).join(', ')}`);
      }

      if (unexpected.length) {
        errors.push(`Лишние ${label} в БД: ${unexpected.slice(0, 10).join(', ')}`);
      }
    });

    console.log(`Source counts: document_types=${documentTypes.length}, document_versions=${documentVersions.length}, user_document_acceptances=${userDocumentAcceptances.length}, user_legal_statuses=${userLegalStatuses.length}`);
    console.log(`Database counts: document_types=${counts.document_types}, document_versions=${counts.document_versions}, user_document_acceptances=${counts.user_document_acceptances}, user_legal_statuses=${counts.user_legal_statuses}`);

    if (errors.length) {
      errors.forEach((error) => console.error(error));
      process.exitCode = 1;
      return;
    }

    console.log('Валидация legal-миграции прошла успешно');
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await postgres.closePool();
  });
