const postgres = require('../../db/pool');
const passwordService = require('../auth/passwordService');
const {
  attachRolesToUsers,
  normalizeRoleRecord,
  serializeScopeValues,
} = require('./adminTransforms');

function buildUserWhereClause(options = {}) {
  if (options.deletedOnly) {
    return {
      sql: 'WHERE deleted_at IS NOT NULL',
      params: [],
    };
  }

  if (!options.includeDeleted) {
    return {
      sql: 'WHERE deleted_at IS NULL',
      params: [],
    };
  }

  return {
    sql: '',
    params: [],
  };
}

function buildRoleWhereClause(options = {}) {
  const clauses = [];
  const params = [];

  if (options.deletedOnly) {
    clauses.push('deleted_at IS NOT NULL');
  } else if (!options.includeDeleted) {
    clauses.push('deleted_at IS NULL');
  }

  if (options.activeOnly) {
    clauses.push('is_active = true');
  }

  if (options.scope) {
    params.push(options.scope);
    clauses.push(`scope = $${params.length}`);
  }

  return {
    sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

async function getUsers(options = {}) {
  const { sql, params } = buildUserWhereClause(options);
  const { rows } = await postgres.query(
    `SELECT *
       FROM users
       ${sql}
      ORDER BY created_at DESC`,
    params
  );

  return rows;
}

async function loadUserRoles(userIds) {
  if (!userIds.length) {
    return [];
  }

  const { rows } = await postgres.query(
    `SELECT *
       FROM user_roles
      WHERE user_id = ANY($1::uuid[])
        AND is_active = true
        AND deleted_at IS NULL
      ORDER BY assigned_at`,
    [userIds]
  );

  return rows;
}

async function loadRolesByIds(roleIds) {
  if (!roleIds.length) {
    return [];
  }

  const { rows } = await postgres.query(
    `SELECT *
       FROM roles
      WHERE id = ANY($1::uuid[])
        AND is_active = true
        AND deleted_at IS NULL`,
    [roleIds]
  );

  return rows;
}

async function getUsersWithRoles(options = {}) {
  const users = await getUsers(options);
  const userRoles = await loadUserRoles(users.map((user) => user.id));
  const roles = await loadRolesByIds([...new Set(userRoles.map((userRole) => userRole.role_id))]);
  return attachRolesToUsers(users, userRoles, roles);
}

async function getUserById(userId, options = {}) {
  const users = await getUsersWithRoles({ ...options, includeDeleted: true });
  const user = users.find((item) => item.id === userId);
  if (!user) {
    return null;
  }

  if (!options.includeDeleted && !options.deletedOnly && user.deleted_at) {
    return null;
  }

  if (options.deletedOnly && !user.deleted_at) {
    return null;
  }

  return user;
}

async function getUserByEmail(email, options = {}) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const users = await getUsersWithRoles({ ...options, includeDeleted: true });
  const user = users.find((item) => item.email.toLowerCase() === normalizedEmail);
  if (!user) {
    return null;
  }

  if (!options.includeDeleted && !options.deletedOnly && user.deleted_at) {
    return null;
  }

  if (options.deletedOnly && !user.deleted_at) {
    return null;
  }

  return user;
}

async function assignRoleToUser(input, clientOverride) {
  const client = clientOverride || {
    query: (text, params) => postgres.query(text, params),
  };

  const scopeValue = serializeScopeValues(input.scopeValues);
  const { rows: existingRows } = await client.query(
    `SELECT id
       FROM user_roles
      WHERE user_id = $1
        AND role_id = $2
        AND scope_value IS NOT DISTINCT FROM $3
      LIMIT 1`,
    [input.userId, input.roleId, scopeValue]
  );

  if (existingRows[0]) {
    await client.query(
      `UPDATE user_roles
          SET scope_value = $2,
              expires_at = $3,
              assigned_by = $4,
              assigned_at = now(),
              is_active = true,
              deleted_at = NULL
        WHERE id = $1`,
      [
        existingRows[0].id,
        scopeValue,
        input.expiresAt || null,
        input.assignedBy || null,
      ]
    );
  } else {
    await client.query(
      `INSERT INTO user_roles (
         user_id,
         role_id,
         scope_value,
         assigned_at,
         assigned_by,
         expires_at,
         is_active
       ) VALUES ($1, $2, $3, now(), $4, $5, true)`,
      [
        input.userId,
        input.roleId,
        scopeValue,
        input.assignedBy || null,
        input.expiresAt || null,
      ]
    );
  }
}

async function createUser(input) {
  const existingUser = await getUserByEmail(input.email, { includeDeleted: true });
  if (existingUser) {
    if (existingUser.deleted_at) {
      throw new Error(`Пользователь с email ${input.email} был удален ранее. Для повторного использования этого email восстановите учетную запись.`);
    }

    throw new Error('Пользователь с таким email уже существует');
  }

  const salt = passwordService.generateSalt();
  const passwordHash = passwordService.createPasswordHash(input.password, salt);

  const userId = await postgres.withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO users (
         tenant_id,
         email,
         name,
         phone,
         status,
         direct_permissions,
         preferences,
         pwd_salt,
         pwd_hash
       ) VALUES (
         $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9
       )
       RETURNING id`,
      [
        input.tenant_id || 'default',
        String(input.email).toLowerCase(),
        input.name,
        input.phone || null,
        input.status || 'active',
        JSON.stringify(input.direct_permissions || []),
        JSON.stringify(input.preferences || {}),
        salt,
        passwordHash,
      ]
    );

    const createdUserId = rows[0].id;

    if (Array.isArray(input.roles) && input.roles.length > 0) {
      for (const roleId of input.roles) {
        await assignRoleToUser({
          userId: createdUserId,
          roleId,
          assignedBy: input.assigned_by || null,
        }, client);
      }
    }

    return createdUserId;
  });

  return getUserById(userId, { includeDeleted: true });
}

async function updateUser(userId, input) {
  if (input.email) {
    const existingUser = await getUserByEmail(input.email, { includeDeleted: true });
    if (existingUser && existingUser.id !== userId) {
      throw new Error('Пользователь с таким email уже существует');
    }
  }

  const fields = ['updated_at = now()'];
  const params = [userId];

  if (input.email !== undefined) {
    params.push(String(input.email).toLowerCase());
    fields.push(`email = $${params.length}`);
  }

  if (input.name !== undefined) {
    params.push(input.name);
    fields.push(`name = $${params.length}`);
  }

  if (input.phone !== undefined) {
    params.push(input.phone);
    fields.push(`phone = $${params.length}`);
  }

  if (input.status !== undefined) {
    params.push(input.status);
    fields.push(`status = $${params.length}`);
  }

  if (input.preferences !== undefined) {
    params.push(JSON.stringify(input.preferences || {}));
    fields.push(`preferences = $${params.length}::jsonb`);
  }

  if (input.direct_permissions !== undefined) {
    params.push(JSON.stringify(input.direct_permissions || []));
    fields.push(`direct_permissions = $${params.length}::jsonb`);
  }

  await postgres.query(
    `UPDATE users
        SET ${fields.join(', ')}
      WHERE id = $1`,
    params
  );

  return getUserById(userId, { includeDeleted: true });
}

async function softDeleteUser(userId) {
  await postgres.query(
    `UPDATE users
        SET deleted_at = COALESCE(deleted_at, now()),
            updated_at = now(),
            status = 'inactive'
      WHERE id = $1`,
    [userId]
  );
}

async function restoreUser(userId) {
  await postgres.query(
    `UPDATE users
        SET deleted_at = NULL,
            updated_at = now()
      WHERE id = $1`,
    [userId]
  );

  return getUserById(userId, { includeDeleted: true });
}

async function purgeSoftDeletedUsers() {
  return postgres.withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT id
         FROM users
        WHERE deleted_at IS NOT NULL`
    );

    if (!rows.length) {
      return { deletedCount: 0 };
    }

    const userIds = rows.map((row) => row.id);

    await client.query(
      `DELETE FROM refresh_tokens
        WHERE user_id = ANY($1::uuid[])`,
      [userIds]
    );
    await client.query(
      `DELETE FROM user_roles
        WHERE user_id = ANY($1::uuid[])`,
      [userIds]
    );
    await client.query(
      `DELETE FROM users
        WHERE id = ANY($1::uuid[])`,
      [userIds]
    );

    return { deletedCount: userIds.length };
  });
}

async function setUserPassword(userId, newPassword) {
  const salt = passwordService.generateSalt();
  const passwordHash = passwordService.createPasswordHash(newPassword, salt);

  await postgres.query(
    `UPDATE users
        SET pwd_salt = $2,
            pwd_hash = $3,
            updated_at = now()
      WHERE id = $1`,
    [userId, salt, passwordHash]
  );
}

async function getRoles(options = {}) {
  const { sql, params } = buildRoleWhereClause(options);
  const { rows } = await postgres.query(
    `SELECT *
       FROM roles
       ${sql}
      ORDER BY name`,
    params
  );

  return rows.map(normalizeRoleRecord);
}

async function getRoleById(roleId, options = {}) {
  const roles = await getRoles({ includeDeleted: true });
  const role = roles.find((item) => item.id === String(roleId));
  if (!role) {
    return null;
  }

  if (!options.includeDeleted && role.deleted_at) {
    return null;
  }

  return role;
}

async function getRoleByCode(code, options = {}) {
  const roles = await getRoles({ includeDeleted: true });
  const role = roles.find((item) => item.code === code);
  if (!role) {
    return null;
  }

  if (!options.includeDeleted && role.deleted_at) {
    return null;
  }

  return role;
}

async function createRole(input) {
  const existingRole = await getRoleByCode(input.code, { includeDeleted: true });
  if (existingRole) {
    throw new Error('Роль с таким кодом уже существует');
  }

  const { rows } = await postgres.query(
    `INSERT INTO roles (
       tenant_id,
       code,
       name,
       description,
       permissions,
       scope,
       scope_values,
       is_system,
       is_active
     ) VALUES (
       $1, $2, $3, $4, $5::jsonb, $6, $7::text[], $8, $9
     )
     RETURNING *`,
    [
      input.tenant_id || 'default',
      input.code,
      input.name,
      input.description || '',
      JSON.stringify(input.permissions || []),
      input.scope || 'global',
      input.scope_values || [],
      Boolean(input.is_system),
      input.is_active !== false,
    ]
  );

  return normalizeRoleRecord(rows[0]);
}

async function updateRole(roleId, input) {
  const fields = ['updated_at = now()'];
  const params = [roleId];

  if (input.name !== undefined) {
    params.push(input.name);
    fields.push(`name = $${params.length}`);
  }

  if (input.description !== undefined) {
    params.push(input.description);
    fields.push(`description = $${params.length}`);
  }

  if (input.permissions !== undefined) {
    params.push(JSON.stringify(input.permissions || []));
    fields.push(`permissions = $${params.length}::jsonb`);
  }

  if (input.scope !== undefined) {
    params.push(input.scope);
    fields.push(`scope = $${params.length}`);
  }

  if (input.scope_values !== undefined) {
    params.push(input.scope_values || []);
    fields.push(`scope_values = $${params.length}::text[]`);
  }

  if (input.is_active !== undefined) {
    params.push(Boolean(input.is_active));
    fields.push(`is_active = $${params.length}`);
  }

  const { rows } = await postgres.query(
    `UPDATE roles
        SET ${fields.join(', ')}
      WHERE id = $1
      RETURNING *`,
    params
  );

  return rows[0] ? normalizeRoleRecord(rows[0]) : null;
}

async function deleteRole(roleId) {
  const role = await getRoleById(roleId, { includeDeleted: true });
  if (!role) {
    throw new Error('Роль не найдена');
  }

  if (role.is_system) {
    throw new Error('Нельзя удалить системную роль');
  }

  const { rows } = await postgres.query(
    `SELECT COUNT(*)::int AS count
       FROM user_roles
      WHERE role_id = $1
        AND is_active = true
        AND deleted_at IS NULL`,
    [roleId]
  );

  if ((rows[0]?.count || 0) > 0) {
    throw new Error('Роль используется пользователями и не может быть удалена');
  }

  await postgres.query(
    `UPDATE roles
        SET deleted_at = COALESCE(deleted_at, now()),
            updated_at = now(),
            is_active = false
      WHERE id = $1`,
    [roleId]
  );
}

async function removeRoleFromUser(input) {
  await postgres.query(
    `UPDATE user_roles
        SET is_active = false,
            deleted_at = now()
      WHERE user_id = $1
        AND role_id = $2
        AND deleted_at IS NULL`,
    [input.userId, input.roleId]
  );
}

async function getUserRoles(userId) {
  const user = await getUserById(userId, { includeDeleted: true });
  return user?.roles || [];
}

module.exports = {
  assignRoleToUser,
  createRole,
  createUser,
  deleteRole,
  getRoleByCode,
  getRoleById,
  getRoles,
  getUserByEmail,
  getUserById,
  getUserRoles,
  getUsers,
  getUsersWithRoles,
  purgeSoftDeletedUsers,
  removeRoleFromUser,
  restoreUser,
  setUserPassword,
  softDeleteUser,
  updateRole,
  updateUser,
};
