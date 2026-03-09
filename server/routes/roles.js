const express = require('express');

const { requireAuth } = require('../middleware/auth');
const adminDataSource = require('../services/admin/adminDataSource');

const router = express.Router();

function hasAdminAccess(user) {
  const roleCodes = new Set([
    user?.role,
    ...(Array.isArray(user?.roles) ? user.roles.map((role) => role.roleCode) : []),
  ].filter(Boolean));

  if (['super_admin', 'system_admin', 'network_admin'].some((code) => roleCodes.has(code))) {
    return true;
  }

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return permissions.some((permission) => {
    const actions = Array.isArray(permission?.actions) ? permission.actions : [];
    const canManage = actions.includes('manage') || actions.includes('write');

    return canManage && (
      (permission.section === 'admin' && ['users', 'roles'].includes(permission.resource))
      || (permission.section === 'networks' && permission.resource === 'users')
    );
  });
}

function requireAdminAccess(req, res, next) {
  if (!hasAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Недостаточно прав для управления ролями' });
  }

  return next();
}

router.use(requireAuth, requireAdminAccess);

router.get('/', async (req, res) => {
  try {
    const roles = await adminDataSource.getRoles({
      includeDeleted: req.query.includeDeleted === 'true',
      activeOnly: req.query.activeOnly === 'true',
      scope: req.query.scope,
    });

    return res.json(roles);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки ролей' });
  }
});

router.get('/by-code/:code', async (req, res) => {
  try {
    const role = await adminDataSource.getRoleByCode(req.params.code, {
      includeDeleted: req.query.includeDeleted === 'true',
    });

    if (!role) {
      return res.status(404).json({ error: 'Роль не найдена' });
    }

    return res.json(role);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки роли' });
  }
});

router.post('/assignments', async (req, res) => {
  try {
    const userId = String(req.body?.userId || '');
    const roleId = String(req.body?.roleId || '');

    if (!userId || !roleId) {
      return res.status(400).json({ error: 'userId и roleId обязательны' });
    }

    await adminDataSource.assignRoleToUser({
      userId,
      roleId,
      scopeValues: Array.isArray(req.body?.scopeValues) ? req.body.scopeValues : [],
      expiresAt: req.body?.expiresAt || null,
      assignedBy: req.user.id,
    });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка назначения роли' });
  }
});

router.delete('/assignments', async (req, res) => {
  try {
    const userId = String(req.query.userId || '');
    const roleId = String(req.query.roleId || '');

    if (!userId || !roleId) {
      return res.status(400).json({ error: 'userId и roleId обязательны' });
    }

    await adminDataSource.removeRoleFromUser({ userId, roleId });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка удаления роли у пользователя' });
  }
});

router.get('/users/:userId', async (req, res) => {
  try {
    const roles = await adminDataSource.getUserRoles(req.params.userId);
    return res.json(roles);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки ролей пользователя' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const role = await adminDataSource.getRoleById(req.params.id, {
      includeDeleted: req.query.includeDeleted === 'true',
    });

    if (!role) {
      return res.status(404).json({ error: 'Роль не найдена' });
    }

    return res.json(role);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки роли' });
  }
});

router.post('/', async (req, res) => {
  try {
    const createdRole = await adminDataSource.createRole({
      tenant_id: req.body?.tenant_id || 'default',
      code: req.body?.code,
      name: req.body?.name,
      description: req.body?.description || '',
      permissions: Array.isArray(req.body?.permissions) ? req.body.permissions : [],
      scope: req.body?.scope || 'global',
      scope_values: Array.isArray(req.body?.scope_values) ? req.body.scope_values : [],
      is_system: Boolean(req.body?.is_system),
      is_active: req.body?.is_active !== false,
    });

    return res.status(201).json(createdRole);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка создания роли' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updatedRole = await adminDataSource.updateRole(req.params.id, {
      name: req.body?.name,
      description: req.body?.description,
      permissions: Array.isArray(req.body?.permissions) ? req.body.permissions : undefined,
      scope: req.body?.scope,
      scope_values: Array.isArray(req.body?.scope_values) ? req.body.scope_values : undefined,
      is_active: req.body?.is_active,
    });

    return res.json(updatedRole);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка обновления роли' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await adminDataSource.deleteRole(req.params.id);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка удаления роли' });
  }
});

module.exports = router;
