const pgAuthRepository = require('../../repositories/pg/authRepository');
const passwordService = require('./passwordService');

function getRequestedSource() {
  return 'pg';
}

function normalizeDatabaseUser(user) {
  if (!user) {
    return null;
  }

  const userRoles = Array.isArray(user.user_roles)
    ? user.user_roles
        .filter(Boolean)
        .map((userRole) => ({
          scope_value: userRole.scope_value ?? undefined,
          role: userRole.role
            ? {
                id: userRole.role.id,
                name: userRole.role.name,
                code: userRole.role.code,
                scope: userRole.role.scope,
                scope_values: Array.isArray(userRole.role.scope_values)
                  ? userRole.role.scope_values
                  : [],
                permissions: Array.isArray(userRole.role.permissions)
                  ? userRole.role.permissions
                  : [],
              }
            : null,
        }))
        .filter((userRole) => userRole.role)
    : [];

  return {
    id: user.id,
    tenant_id: user.tenant_id || 'default',
    email: user.email,
    name: user.name || '',
    phone: user.phone || undefined,
    status: user.status || 'inactive',
    direct_permissions: Array.isArray(user.direct_permissions) ? user.direct_permissions : [],
    preferences: user.preferences || {},
    pwd_salt: user.pwd_salt || '',
    pwd_hash: user.pwd_hash || '',
    last_login: user.last_login || null,
    version: user.version || 1,
    user_roles: userRoles,
    created_at: user.created_at,
    updated_at: user.updated_at,
    deleted_at: user.deleted_at || null,
    role: userRoles[0]?.role?.code || 'user',
  };
}

function transformUser(databaseUser) {
  const userRoles = databaseUser.user_roles || [];
  const primaryRole = userRoles[0]?.role;
  const roleNameToCode = {
    'Суперадминистратор': 'super_admin',
    'Администратор сети': 'network_admin',
    'Менеджер': 'manager',
    'Оператор': 'operator',
    'Менеджер БТО': 'bto_manager',
  };

  const permissionSet = new Set();
  const allPermissions = [];

  userRoles.forEach((userRole) => {
    const role = userRole.role;
    if (!role || !Array.isArray(role.permissions)) {
      return;
    }

    role.permissions.forEach((permission) => {
      const key = typeof permission === 'object'
        ? `${permission.section}.${permission.resource}.${(permission.actions || []).join(',')}`
        : String(permission);

      if (!permissionSet.has(key)) {
        permissionSet.add(key);
        allPermissions.push(permission);
      }
    });
  });

  const roles = userRoles.map((userRole) => {
    const role = userRole.role;
    let userScopeValues = [];

    if (userRole.scope_value) {
      try {
        const parsed = typeof userRole.scope_value === 'string'
          ? JSON.parse(userRole.scope_value)
          : userRole.scope_value;
        if (Array.isArray(parsed)) {
          userScopeValues = parsed;
        } else if (parsed) {
          userScopeValues = [String(parsed)];
        }
      } catch (error) {
        userScopeValues = [String(userRole.scope_value)];
      }
    }

    if (userScopeValues.length === 0 && Array.isArray(role.scope_values)) {
      userScopeValues = role.scope_values;
    }

    return {
      roleId: String(role.id),
      roleName: role.name,
      roleCode: role.code || roleNameToCode[role.name] || role.name,
      scope: role.scope,
      scopeValues: userScopeValues,
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
    };
  });

  return {
    id: databaseUser.id,
    email: databaseUser.email,
    name: databaseUser.name,
    phone: databaseUser.phone,
    status: databaseUser.status,
    role: primaryRole
      ? primaryRole.code || roleNameToCode[primaryRole.name] || primaryRole.name
      : 'user',
    roleId: primaryRole?.id || 0,
    permissions: allPermissions,
    roles,
  };
}

async function getDatabaseUserByEmailFromPg(email) {
  return normalizeDatabaseUser(await pgAuthRepository.getUserByEmail(email));
}

async function getDatabaseUserByIdFromPg(userId) {
  return normalizeDatabaseUser(await pgAuthRepository.getUserById(userId));
}

async function touchLastLoginInPg(userId) {
  await pgAuthRepository.updateLastLogin(userId);
}

async function updateUserNameInPg(userId, name) {
  await pgAuthRepository.updateUserName(userId, name);
}

async function updatePasswordInPg(userId, pwdSalt, pwdHash) {
  await pgAuthRepository.updatePassword(userId, pwdSalt, pwdHash);
}

async function getDatabaseUserByEmail(email) {
  return getDatabaseUserByEmailFromPg(email);
}

async function getDatabaseUserById(userId) {
  return getDatabaseUserByIdFromPg(userId);
}

async function touchLastLogin(userId) {
  return touchLastLoginInPg(userId);
}

async function updateUserName(userId, name) {
  return updateUserNameInPg(userId, name);
}

async function updatePassword(userId, pwdSalt, pwdHash) {
  return updatePasswordInPg(userId, pwdSalt, pwdHash);
}

async function authenticate(email, password) {
  const databaseUser = await getDatabaseUserByEmail(email);
  if (!databaseUser) {
    return null;
  }

  if (databaseUser.status !== 'active') {
    throw new Error('Аккаунт не активен');
  }

  const isValidPassword = passwordService.verifyPassword(
    password,
    databaseUser.pwd_salt,
    databaseUser.pwd_hash
  );

  if (!isValidPassword) {
    return null;
  }

  // Автоматическая миграция bcrypt → SHA256 при успешном логине
  if (passwordService.isBcryptHash(databaseUser.pwd_hash)) {
    const newSalt = passwordService.generateSalt();
    const newHash = passwordService.createPasswordHash(password, newSalt);
    await updatePassword(databaseUser.id, newSalt, newHash).catch(() => {});
  }

  await touchLastLogin(databaseUser.id);

  return {
    databaseUser: {
      ...databaseUser,
      last_login: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    user: transformUser(databaseUser),
  };
}

async function getAppUserById(userId) {
  const databaseUser = await getDatabaseUserById(userId);
  if (!databaseUser) {
    return null;
  }

  if (databaseUser.status !== 'active') {
    return null;
  }

  return transformUser(databaseUser);
}

async function changePassword(userId, currentPassword, newPassword) {
  const databaseUser = await getDatabaseUserById(userId);
  if (!databaseUser) {
    throw new Error('Пользователь не найден');
  }

  const isValidPassword = passwordService.verifyPassword(
    currentPassword,
    databaseUser.pwd_salt,
    databaseUser.pwd_hash
  );

  if (!isValidPassword) {
    throw new Error('Неверный текущий пароль');
  }

  const newSalt = passwordService.generateSalt();
  const newHash = passwordService.createPasswordHash(newPassword, newSalt);
  await updatePassword(userId, newSalt, newHash);
}

async function getDatabaseUserForClient(email, requester) {
  if (!requester) {
    throw new Error('Требуется авторизация');
  }

  const requestedEmail = (email || requester.email || '').trim();
  const requesterEmail = (requester.email || '').trim().toLowerCase();
  const canReadOtherUsers = requester.role === 'super_admin';

  if (!requestedEmail) {
    throw new Error('Email не указан');
  }

  if (requestedEmail.toLowerCase() !== requesterEmail && !canReadOtherUsers) {
    throw new Error('Недостаточно прав для просмотра пользователя');
  }

  const databaseUser = await getDatabaseUserByEmail(requestedEmail);
  if (!databaseUser) {
    return null;
  }

  return databaseUser;
}

module.exports = {
  authenticate,
  changePassword,
  getAppUserById,
  getDatabaseUserByEmail,
  getDatabaseUserForClient,
  getRequestedSource,
  transformUser,
  updateUserName,
};
