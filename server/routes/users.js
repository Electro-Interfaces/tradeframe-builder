const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { requireAdminAccess } = require('../middleware/requireAdmin');
const adminDataSource = require('../services/admin/adminDataSource');

const router = express.Router();
}

router.use(requireAuth, requireAdminAccess);

router.get('/', async (req, res) => {
  try {
    const paginated = req.query.paginated === 'true';
    const rawLimit = parseInt(req.query.limit, 10);
    const rawOffset = parseInt(req.query.offset, 10);

    // Default 200, max 1000. Без параметра limit — 200 (защита от OOM).
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), 1000)
      : 200;
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0
      ? rawOffset
      : 0;

    const options = {
      includeDeleted: req.query.includeDeleted === 'true',
      deletedOnly: req.query.deletedOnly === 'true',
      limit,
      offset,
      paginated,
    };

    const result = await adminDataSource.getUsersWithRoles(options);

    if (paginated) {
      // Новый формат: { data: [...], total, limit, offset }
      return res.json({
        data: result.data,
        total: result.total,
        limit,
        offset,
      });
    }

    // Обратная совместимость: возвращаем массив
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки пользователей' });
  }
});

router.get('/by-email/:email', async (req, res) => {
  try {
    const user = await adminDataSource.getUserByEmail(req.params.email, {
      includeDeleted: req.query.includeDeleted === 'true',
      deletedOnly: req.query.deletedOnly === 'true',
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки пользователя' });
  }
});

router.delete('/deleted/purge', async (req, res) => {
  try {
    const result = await adminDataSource.purgeSoftDeletedUsers();
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка очистки удаленных пользователей' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await adminDataSource.getUserById(req.params.id, {
      includeDeleted: req.query.includeDeleted === 'true',
      deletedOnly: req.query.deletedOnly === 'true',
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки пользователя' });
  }
});

router.post('/', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim();
    const name = String(req.body?.name || '').trim();
    const password = String(req.body?.password || '');

    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, имя и пароль обязательны' });
    }

    const createdUser = await adminDataSource.createUser({
      tenant_id: req.body?.tenant_id || 'default',
      email,
      name,
      phone: req.body?.phone || null,
      password,
      status: req.body?.status || 'active',
      roles: Array.isArray(req.body?.roles) ? req.body.roles : [],
      assigned_by: req.user.id,
      preferences: req.body?.preferences || {},
      direct_permissions: req.body?.direct_permissions || [],
    });

    return res.status(201).json(createdUser);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка создания пользователя' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updatedUser = await adminDataSource.updateUser(req.params.id, {
      email: req.body?.email,
      name: req.body?.name,
      phone: req.body?.phone,
      status: req.body?.status,
      preferences: req.body?.preferences,
      direct_permissions: req.body?.direct_permissions,
    });

    return res.json(updatedUser);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка обновления пользователя' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await adminDataSource.softDeleteUser(req.params.id);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка удаления пользователя' });
  }
});

router.post('/:id/restore', async (req, res) => {
  try {
    const restoredUser = await adminDataSource.restoreUser(req.params.id);
    return res.json(restoredUser);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка восстановления пользователя' });
  }
});

router.post('/:id/password', async (req, res) => {
  try {
    const newPassword = String(req.body?.newPassword || '');
    if (!newPassword) {
      return res.status(400).json({ error: 'Новый пароль обязателен' });
    }

    await adminDataSource.setUserPassword(req.params.id, newPassword);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка смены пароля' });
  }
});

module.exports = router;
