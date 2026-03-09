function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureObject(value, fallback = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
}

function toIsoString(value, fallback = null) {
  if (!value) {
    return fallback;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value.toISOString === 'function') {
    return value.toISOString();
  }

  return fallback;
}

function parseScopeValues(scopeValue, fallback = []) {
  if (Array.isArray(scopeValue)) {
    return scopeValue.map(String);
  }

  if (scopeValue === null || scopeValue === undefined || scopeValue === '') {
    return ensureArray(fallback).map(String);
  }

  if (typeof scopeValue === 'string') {
    try {
      const parsed = JSON.parse(scopeValue);
      if (Array.isArray(parsed)) {
        return parsed.map(String);
      }
    } catch (error) {
      return [scopeValue];
    }

    return [scopeValue];
  }

  return [String(scopeValue)];
}

function serializeScopeValues(scopeValues) {
  if (!Array.isArray(scopeValues) || scopeValues.length === 0) {
    return '';
  }

  return JSON.stringify(scopeValues.map(String));
}

function normalizeRoleRecord(role) {
  return {
    id: String(role.id),
    tenant_id: role.tenant_id || 'default',
    code: role.code,
    name: role.name,
    description: role.description || '',
    permissions: ensureArray(role.permissions),
    scope: role.scope || 'global',
    scope_values: ensureArray(role.scope_values).map(String),
    is_system: Boolean(role.is_system),
    is_active: role.is_active !== false,
    created_at: toIsoString(role.created_at),
    updated_at: toIsoString(role.updated_at, toIsoString(role.created_at)),
    deleted_at: toIsoString(role.deleted_at),
  };
}

function normalizeUserRoleAssignment(userRole, role) {
  if (!role) {
    return null;
  }

  return {
    role_id: String(role.id),
    role_code: role.code,
    role_name: role.name,
    scope: role.scope || 'global',
    scope_value: userRole.scope_value || undefined,
    scopeValues: parseScopeValues(userRole.scope_value, role.scope_values),
    permissions: ensureArray(role.permissions),
    assigned_at: toIsoString(userRole.assigned_at),
    assigned_by: userRole.assigned_by || undefined,
    expires_at: toIsoString(userRole.expires_at),
  };
}

function normalizeUserRecord(user, roles = []) {
  return {
    id: user.id,
    tenant_id: user.tenant_id || 'default',
    email: user.email,
    name: user.name || 'Пользователь',
    phone: user.phone || undefined,
    status: user.status || 'active',
    roles: roles.filter(Boolean),
    direct_permissions: ensureArray(user.direct_permissions),
    preferences: ensureObject(user.preferences),
    pwd_salt: user.pwd_salt || '',
    pwd_hash: user.pwd_hash || '',
    last_login: toIsoString(user.last_login),
    created_at: toIsoString(user.created_at),
    updated_at: toIsoString(user.updated_at, toIsoString(user.created_at)),
    deleted_at: toIsoString(user.deleted_at),
  };
}

function attachRolesToUsers(users, userRoleRows, roleRows) {
  const rolesById = new Map(roleRows.map((role) => [String(role.id), normalizeRoleRecord(role)]));
  const assignmentsByUserId = new Map();

  userRoleRows.forEach((userRole) => {
    const role = rolesById.get(String(userRole.role_id));
    if (!role) {
      return;
    }

    if (!assignmentsByUserId.has(userRole.user_id)) {
      assignmentsByUserId.set(userRole.user_id, []);
    }

    assignmentsByUserId
      .get(userRole.user_id)
      .push(normalizeUserRoleAssignment(userRole, role));
  });

  return users.map((user) => normalizeUserRecord(user, assignmentsByUserId.get(user.id) || []));
}

module.exports = {
  attachRolesToUsers,
  ensureArray,
  ensureObject,
  normalizeRoleRecord,
  normalizeUserRecord,
  parseScopeValues,
  serializeScopeValues,
  toIsoString,
};
