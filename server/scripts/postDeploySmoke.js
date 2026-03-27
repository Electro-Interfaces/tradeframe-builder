const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const postgres = require('../db/pool');
const authDataSource = require('../services/auth/authDataSource');
const tokenService = require('../services/auth/tokenService');

function getArgValue(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : '';
}

async function getSmokeUser() {
  const userRow = await postgres.queryOne(`
    SELECT u.id
      FROM users u
     WHERE u.deleted_at IS NULL
       AND u.status = 'active'
     ORDER BY EXISTS (
       SELECT 1
         FROM user_roles ur
         JOIN roles r
           ON r.id = ur.role_id
          AND r.deleted_at IS NULL
        WHERE ur.user_id = u.id
          AND ur.deleted_at IS NULL
          AND r.code IN ('super_admin', 'system_admin')
     ) DESC,
     u.last_login DESC NULLS LAST,
     u.created_at ASC
     LIMIT 1
  `);

  if (!userRow?.id) {
    throw new Error('Не найден активный пользователь для smoke-проверки');
  }

  const user = await authDataSource.getAppUserById(userRow.id);
  if (!user) {
    throw new Error('Не удалось загрузить пользователя для smoke-проверки');
  }

  return user;
}

function createHeaders(user, token) {
  return {
    Authorization: `Bearer ${token}`,
    'X-TF-User-Id': user.id,
    'X-TF-User-Email': user.email || '',
    'X-TF-User-Name': encodeURIComponent(user.name || ''),
    'X-TF-User-Role': user.role || '',
  };
}

async function requestJson(name, url, headers) {
  const response = await fetch(url, { headers });
  const text = await response.text();
  let payload = text;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {}

  if (!response.ok) {
    const details = typeof payload === 'string' ? payload : JSON.stringify(payload);
    throw new Error(`${name}: HTTP ${response.status} ${details}`);
  }

  console.log(`[Smoke] ${name}: HTTP ${response.status}`);
  return payload;
}

async function main() {
  const baseUrl = getArgValue('base-url') || process.env.SMOKE_BASE_URL;
  const system = getArgValue('system') || process.env.SMOKE_STS_SYSTEM || '15';
  const station = getArgValue('station') || process.env.SMOKE_STS_STATION || '1';

  if (!baseUrl) {
    throw new Error('Не задан base URL для smoke-проверки');
  }

  const user = await getSmokeUser();
  const token = tokenService.createAccessToken(user).token;
  const headers = createHeaders(user, token);
  const authHeaders = {
    Authorization: headers.Authorization,
  };

  const me = await requestJson('auth/me', `${baseUrl}/api/auth/me`, {
    Authorization: headers.Authorization,
  });
  if (!me?.id || String(me.id) !== String(user.id)) {
    throw new Error('auth/me вернул неожиданные данные пользователя');
  }

  const unread = await requestJson('support/unread', `${baseUrl}/api/support/unread`, headers);
  if (!unread || typeof unread.total !== 'number') {
    throw new Error('support/unread вернул неожиданный ответ');
  }

  const legalDocumentTypes = await requestJson(
    'legal/document-types',
    `${baseUrl}/api/legal/document-types`,
    authHeaders
  );
  if (!Array.isArray(legalDocumentTypes)) {
    throw new Error('legal/document-types вернул неожиданный ответ');
  }

  const messages = await requestJson(
    'messages',
    `${baseUrl}/api/messages?limit=1`,
    authHeaders
  );
  if (!messages || messages.success !== true || !Array.isArray(messages.data) || typeof messages.total !== 'number') {
    throw new Error('messages вернул неожиданный ответ');
  }

  await requestJson(
    'sts/v2/info',
    `${baseUrl}/api/sts/v2/info?system=${encodeURIComponent(system)}&station=${encodeURIComponent(station)}`,
    {
      Authorization: headers.Authorization,
    }
  );
}

main()
  .catch((error) => {
    console.error('[Smoke] FAILED:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await postgres.closePool().catch(() => {});
  });
