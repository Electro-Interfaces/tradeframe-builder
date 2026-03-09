require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const postgres = require('../../db/pool');

const args = process.argv.slice(2);
const reset = args.includes('--reset');
const positionalArgs = args.filter((arg) => !arg.startsWith('--'));

const inputPath = positionalArgs[0]
  ? path.resolve(positionalArgs[0])
  : path.join(__dirname, '..', '..', 'tmp', 'migration', 'auth-export.json');

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
    if (value === undefined || value === null || value === '') {
      throw new Error(`В ${label} найден элемент без поля ${key}`);
    }

    if (seen.has(String(value))) {
      throw new Error(`В ${label} найден дубликат ${key}: ${value}`);
    }

    seen.add(String(value));
  });
}

function ensureRelations(users, roles, userRoles) {
  const userIds = new Set(users.map((user) => user.id));
  const roleIds = new Set(roles.map((role) => String(role.id)));

  userRoles.forEach((userRole) => {
    if (!userIds.has(userRole.user_id)) {
      throw new Error(`Для user_role ${userRole.id} не найден user ${userRole.user_id}`);
    }

    if (!roleIds.has(String(userRole.role_id))) {
      throw new Error(`Для user_role ${userRole.id} не найден role ${userRole.role_id}`);
    }

    if (userRole.assigned_by && !userIds.has(userRole.assigned_by)) {
      // Системный UUID (00000000-...-000000000001) или удалённый пользователь — обнуляем
      console.warn(`  [WARN] user_role ${userRole.id}: assigned_by ${userRole.assigned_by} не найден, обнуляем`);
      userRole.assigned_by = null;
    }
  });
}

async function upsertUsers(client, users) {
  for (const user of users) {
    await client.query(
      `INSERT INTO users (
         id,
         tenant_id,
         email,
         name,
         phone,
         status,
         direct_permissions,
         preferences,
         pwd_salt,
         pwd_hash,
         last_login,
         version,
         created_at,
         updated_at,
         deleted_at
       ) VALUES (
         $1::uuid, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10,
         $11::timestamptz, $12, $13::timestamptz, $14::timestamptz, $15::timestamptz
       )
       ON CONFLICT (id) DO UPDATE
       SET tenant_id = EXCLUDED.tenant_id,
           email = EXCLUDED.email,
           name = EXCLUDED.name,
           phone = EXCLUDED.phone,
           status = EXCLUDED.status,
           direct_permissions = EXCLUDED.direct_permissions,
           preferences = EXCLUDED.preferences,
           pwd_salt = EXCLUDED.pwd_salt,
           pwd_hash = EXCLUDED.pwd_hash,
           last_login = EXCLUDED.last_login,
           version = EXCLUDED.version,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at,
           deleted_at = EXCLUDED.deleted_at`,
      [
        user.id,
        user.tenant_id || 'default',
        user.email,
        user.name || '',
        user.phone || null,
        user.status || 'active',
        JSON.stringify(Array.isArray(user.direct_permissions) ? user.direct_permissions : []),
        JSON.stringify(user.preferences || {}),
        user.pwd_salt || '',
        user.pwd_hash || '',
        user.last_login || null,
        Number(user.version || 1),
        user.created_at,
        user.updated_at || user.created_at,
        user.deleted_at || null,
      ]
    );
  }
}

async function upsertRoles(client, roles) {
  for (const role of roles) {
    await client.query(
      `INSERT INTO roles (
         id,
         tenant_id,
         code,
         name,
         description,
         permissions,
         scope,
         scope_values,
         is_system,
         is_active,
         created_at,
         updated_at,
         deleted_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6::jsonb, $7, $8::text[], $9, $10, $11::timestamptz, $12::timestamptz, $13::timestamptz
       )
       ON CONFLICT (id) DO UPDATE
       SET tenant_id = EXCLUDED.tenant_id,
           code = EXCLUDED.code,
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           permissions = EXCLUDED.permissions,
           scope = EXCLUDED.scope,
           scope_values = EXCLUDED.scope_values,
           is_system = EXCLUDED.is_system,
           is_active = EXCLUDED.is_active,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at,
           deleted_at = EXCLUDED.deleted_at`,
      [
        role.id,
        role.tenant_id || 'default',
        role.code,
        role.name,
        role.description || '',
        JSON.stringify(Array.isArray(role.permissions) ? role.permissions : []),
        role.scope || 'global',
        Array.isArray(role.scope_values) ? role.scope_values : [],
        Boolean(role.is_system),
        role.is_active !== false,
        role.created_at,
        role.updated_at || role.created_at,
        role.deleted_at || null,
      ]
    );
  }
}

async function upsertUserRoles(client, userRoles) {
  for (const userRole of userRoles) {
    await client.query(
      `INSERT INTO user_roles (
         id,
         user_id,
         role_id,
         scope_value,
         assigned_at,
         assigned_by,
         expires_at,
         is_active,
         deleted_at
       ) VALUES (
         $1, $2::uuid, $3, $4, $5::timestamptz, $6::uuid, $7::timestamptz, $8, $9::timestamptz
       )
       ON CONFLICT (id) DO UPDATE
       SET user_id = EXCLUDED.user_id,
           role_id = EXCLUDED.role_id,
           scope_value = EXCLUDED.scope_value,
           assigned_at = EXCLUDED.assigned_at,
           assigned_by = EXCLUDED.assigned_by,
           expires_at = EXCLUDED.expires_at,
           is_active = EXCLUDED.is_active,
           deleted_at = EXCLUDED.deleted_at`,
      [
        userRole.id,
        userRole.user_id,
        userRole.role_id,
        userRole.scope_value || '',
        userRole.assigned_at,
        userRole.assigned_by || null,
        userRole.expires_at || null,
        userRole.is_active !== false,
        userRole.deleted_at || null,
      ]
    );
  }
}

async function syncIdentitySequence(client, table, column) {
  await client.query(
    `SELECT setval(
       pg_get_serial_sequence($1, $2),
       COALESCE((SELECT MAX(${column}) FROM ${table}), 1),
       EXISTS(SELECT 1 FROM ${table})
     )`,
    [table, column]
  );
}

async function getCounts(client) {
  const { rows } = await client.query(
    `SELECT
       (SELECT COUNT(*)::int FROM users) AS users,
       (SELECT COUNT(*)::int FROM roles) AS roles,
       (SELECT COUNT(*)::int FROM user_roles) AS user_roles`
  );

  return rows[0];
}

async function main() {
  const input = readJson(inputPath);
  const users = Array.isArray(input.users) ? input.users : [];
  const roles = Array.isArray(input.roles) ? input.roles : [];
  const userRoles = Array.isArray(input.user_roles) ? input.user_roles : [];

  ensureUniqueIds(users, 'id', 'users');
  ensureUniqueIds(roles, 'id', 'roles');
  ensureUniqueIds(userRoles, 'id', 'user_roles');
  ensureRelations(users, roles, userRoles);

  const pool = postgres.getPool();
  if (!pool) {
    throw new Error('DATABASE_URL не задан, загрузка auth-данных в PostgreSQL невозможна');
  }

  const result = await postgres.withTransaction(async (client) => {
    if (reset) {
      await client.query('DELETE FROM refresh_tokens');
      await client.query('DELETE FROM user_roles');
      await client.query('DELETE FROM roles');
      await client.query('DELETE FROM users');
    }

    await upsertUsers(client, users);
    await upsertRoles(client, roles);
    await upsertUserRoles(client, userRoles);
    // roles и user_roles теперь UUID — sequence не нужен

    return getCounts(client);
  });

  console.log(`Загружено users: ${users.length}`);
  console.log(`Загружено roles: ${roles.length}`);
  console.log(`Загружено user_roles: ${userRoles.length}`);
  console.log(`Состояние БД: users=${result.users}, roles=${result.roles}, user_roles=${result.user_roles}`);
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
