const postgres = require('../../db/pool');

const DATABASE_USER_SELECT = `
  SELECT
    u.id,
    u.tenant_id,
    u.email,
    u.name,
    u.phone,
    u.status,
    u.direct_permissions,
    u.preferences,
    u.pwd_salt,
    u.pwd_hash,
    u.last_login,
    u.version,
    u.created_at,
    u.updated_at,
    u.deleted_at,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'scope_value', ur.scope_value,
          'role', jsonb_build_object(
            'id', r.id,
            'name', r.name,
            'code', r.code,
            'scope', r.scope,
            'scope_values', r.scope_values,
            'permissions', r.permissions
          )
        )
        ORDER BY r.id
      ) FILTER (WHERE ur.id IS NOT NULL AND r.id IS NOT NULL),
      '[]'::jsonb
    ) AS user_roles
  FROM users u
  LEFT JOIN user_roles ur
    ON ur.user_id = u.id
   AND ur.is_active = true
   AND ur.deleted_at IS NULL
  LEFT JOIN roles r
    ON r.id = ur.role_id
   AND r.is_active = true
   AND r.deleted_at IS NULL
`;

async function getUserByEmail(email) {
  const result = await postgres.query(
    `${DATABASE_USER_SELECT}
     WHERE lower(u.email) = lower($1)
       AND u.deleted_at IS NULL
     GROUP BY u.id
     LIMIT 1`,
    [email]
  );

  return result.rows[0] || null;
}

async function getUserById(userId) {
  const result = await postgres.query(
    `${DATABASE_USER_SELECT}
     WHERE u.id = $1
       AND u.deleted_at IS NULL
     GROUP BY u.id
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
}

async function updateLastLogin(userId) {
  await postgres.query(
    `UPDATE users
        SET last_login = now(),
            updated_at = now()
      WHERE id = $1`,
    [userId]
  );
}

async function updateUserName(userId, name) {
  const result = await postgres.query(
    `UPDATE users
        SET name = $2,
            updated_at = now()
      WHERE id = $1
    RETURNING id`,
    [userId, name]
  );

  return Boolean(result.rows[0]);
}

async function updatePassword(userId, pwdSalt, pwdHash) {
  const result = await postgres.query(
    `UPDATE users
        SET pwd_salt = $2,
            pwd_hash = $3,
            version = version + 1,
            updated_at = now()
      WHERE id = $1
    RETURNING id`,
    [userId, pwdSalt, pwdHash]
  );

  return Boolean(result.rows[0]);
}

module.exports = {
  getUserByEmail,
  getUserById,
  updateLastLogin,
  updateUserName,
  updatePassword,
};
