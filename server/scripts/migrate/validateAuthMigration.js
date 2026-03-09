require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const postgres = require('../../db/pool');

const positionalArgs = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));

const inputPath = positionalArgs[0]
  ? path.resolve(positionalArgs[0])
  : path.join(__dirname, '..', '..', 'tmp', 'migration', 'auth-export.json');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Файл не найден: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildIdSet(items, key = 'id') {
  return new Set(items.map((item) => String(item?.[key])).filter(Boolean));
}

function buildCountMap(items, key) {
  return items.reduce((accumulator, item) => {
    const value = item?.[key];
    if (value === undefined || value === null || value === '') {
      return accumulator;
    }

    const normalizedValue = String(value);
    accumulator.set(normalizedValue, (accumulator.get(normalizedValue) || 0) + 1);
    return accumulator;
  }, new Map());
}

function diffMissing(sourceIds, targetIds) {
  return [...sourceIds].filter((id) => !targetIds.has(id));
}

function diffUnexpected(sourceIds, targetIds) {
  return [...targetIds].filter((id) => !sourceIds.has(id));
}

function pushMismatches(errors, label, sourceMap, targetMap) {
  const keys = new Set([...sourceMap.keys(), ...targetMap.keys()]);

  keys.forEach((key) => {
    const sourceCount = sourceMap.get(key) || 0;
    const targetCount = targetMap.get(key) || 0;

    if (sourceCount !== targetCount) {
      errors.push(`${label}: ${key} source=${sourceCount} target=${targetCount}`);
    }
  });
}

function ensureRelations(errors, users, roles, userRoles) {
  const userIds = buildIdSet(users);
  const roleIds = buildIdSet(roles);

  userRoles.forEach((userRole) => {
    if (!userIds.has(String(userRole.user_id))) {
      errors.push(`В source JSON user_role ${userRole.id} ссылается на отсутствующего user ${userRole.user_id}`);
    }

    if (!roleIds.has(String(userRole.role_id))) {
      errors.push(`В source JSON user_role ${userRole.id} ссылается на отсутствующий role ${userRole.role_id}`);
    }

    if (userRole.assigned_by && !userIds.has(String(userRole.assigned_by))) {
      // Системный UUID — предупреждение, обнулён при загрузке
      console.warn(`  [WARN] user_role ${userRole.id}: assigned_by ${userRole.assigned_by} отсутствует (обнулён при загрузке)`);
    }
  });
}

async function fetchCounts(client) {
  const { rows } = await client.query(
    `SELECT
       (SELECT COUNT(*)::int FROM users) AS users,
       (SELECT COUNT(*)::int FROM roles) AS roles,
       (SELECT COUNT(*)::int FROM user_roles) AS user_roles`
  );

  return rows[0];
}

async function fetchIdSets(client) {
  const usersResult = await client.query('SELECT id FROM users');
  const rolesResult = await client.query('SELECT id FROM roles');
  const userRolesResult = await client.query('SELECT id FROM user_roles');

  return {
    users: new Set(usersResult.rows.map((row) => String(row.id))),
    roles: new Set(rolesResult.rows.map((row) => String(row.id))),
    user_roles: new Set(userRolesResult.rows.map((row) => String(row.id))),
  };
}

async function fetchUserRoleCounts(client) {
  const { rows } = await client.query(
    `SELECT user_id, COUNT(*)::int AS count
       FROM user_roles
      GROUP BY user_id`
  );

  return new Map(rows.map((row) => [String(row.user_id), row.count]));
}

async function main() {
  const input = readJson(inputPath);
  const users = Array.isArray(input.users) ? input.users : [];
  const roles = Array.isArray(input.roles) ? input.roles : [];
  const userRoles = Array.isArray(input.user_roles) ? input.user_roles : [];

  const pool = postgres.getPool();
  if (!pool) {
    throw new Error('DATABASE_URL не задан, валидация auth-миграции невозможна');
  }

  const client = await pool.connect();
  try {
    const counts = await fetchCounts(client);
    const idSets = await fetchIdSets(client);
    const userRoleCounts = await fetchUserRoleCounts(client);

    const errors = [];
    ensureRelations(errors, users, roles, userRoles);

    if (counts.users !== users.length) {
      errors.push(`Count mismatch users: source=${users.length} target=${counts.users}`);
    }

    if (counts.roles !== roles.length) {
      errors.push(`Count mismatch roles: source=${roles.length} target=${counts.roles}`);
    }

    if (counts.user_roles !== userRoles.length) {
      errors.push(`Count mismatch user_roles: source=${userRoles.length} target=${counts.user_roles}`);
    }

    const sourceUsers = buildIdSet(users);
    const sourceRoles = buildIdSet(roles);
    const sourceUserRoles = buildIdSet(userRoles);

    const missingUsers = diffMissing(sourceUsers, idSets.users);
    const missingRoles = diffMissing(sourceRoles, idSets.roles);
    const missingUserRoles = diffMissing(sourceUserRoles, idSets.user_roles);

    const unexpectedUsers = diffUnexpected(sourceUsers, idSets.users);
    const unexpectedRoles = diffUnexpected(sourceRoles, idSets.roles);
    const unexpectedUserRoles = diffUnexpected(sourceUserRoles, idSets.user_roles);

    if (missingUsers.length) {
      errors.push(`Отсутствуют users: ${missingUsers.slice(0, 10).join(', ')}`);
    }

    if (missingRoles.length) {
      errors.push(`Отсутствуют roles: ${missingRoles.slice(0, 10).join(', ')}`);
    }

    if (missingUserRoles.length) {
      errors.push(`Отсутствуют user_roles: ${missingUserRoles.slice(0, 10).join(', ')}`);
    }

    if (unexpectedUsers.length) {
      errors.push(`Лишние users в БД: ${unexpectedUsers.slice(0, 10).join(', ')}`);
    }

    if (unexpectedRoles.length) {
      errors.push(`Лишние roles в БД: ${unexpectedRoles.slice(0, 10).join(', ')}`);
    }

    if (unexpectedUserRoles.length) {
      errors.push(`Лишние user_roles в БД: ${unexpectedUserRoles.slice(0, 10).join(', ')}`);
    }

    pushMismatches(
      errors,
      'Несовпадение количества ролей по пользователю',
      buildCountMap(userRoles, 'user_id'),
      userRoleCounts
    );

    console.log(`Source counts: users=${users.length}, roles=${roles.length}, user_roles=${userRoles.length}`);
    console.log(`Database counts: users=${counts.users}, roles=${counts.roles}, user_roles=${counts.user_roles}`);

    if (errors.length) {
      errors.forEach((error) => console.error(error));
      process.exitCode = 1;
      return;
    }

    console.log('Валидация auth-миграции прошла успешно');
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
