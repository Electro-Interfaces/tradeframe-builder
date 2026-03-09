const express = require('express');

const { requireAuth } = require('../middleware/auth');
const authDataSource = require('../services/auth/authDataSource');
const auditDataSource = require('../services/audit/auditDataSource');
const tokenService = require('../services/auth/tokenService');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const result = await authDataSource.authenticate(email, password);
    if (!result) {
      await auditDataSource.createAuditLog({
        action: `Неудачная попытка входа: ${email}`,
        action_type: 'authentication',
        object: email,
        object_type: 'user',
        user_email: email,
        user_name: email.includes('@') ? email.split('@')[0] : email,
        ip_address: req.ip || null,
        user_agent: req.get('user-agent') || null,
        details: {
          reason: 'Неверный email или пароль',
          success: false,
        },
        metadata: {
          source: 'api',
        },
      }).catch(() => {});

      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const accessToken = tokenService.createAccessToken(result.user);

    await auditDataSource.createAuditLog({
      action: `Вход в систему: ${result.user.email}`,
      action_type: 'authentication',
      object: result.user.email,
      object_type: 'user',
      user_id: result.user.id,
      user_email: result.user.email,
      user_name: result.user.name,
      ip_address: req.ip || null,
      user_agent: req.get('user-agent') || null,
      details: {
        role: result.user.role,
        success: true,
      },
      metadata: {
        source: 'api',
      },
    }).catch(() => {});

    return res.json({
      user: result.user,
      token: accessToken.token,
      expires_at: accessToken.expiresAt,
    });
  } catch (error) {
    const message = error.message || 'Ошибка входа в систему';
    const status = message === 'Аккаунт не активен' ? 403 : 500;

    if (status !== 500) {
      const email = String(req.body?.email || '').trim();
      await auditDataSource.createAuditLog({
        action: `Неудачная попытка входа: ${email}`,
        action_type: 'authentication',
        object: email,
        object_type: 'user',
        user_email: email,
        user_name: email.includes('@') ? email.split('@')[0] : email,
        ip_address: req.ip || null,
        user_agent: req.get('user-agent') || null,
        details: {
          reason: message,
          success: false,
        },
        metadata: {
          source: 'api',
        },
      }).catch(() => {});
    }

    return res.status(status).json({ error: message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  return res.json(req.user);
});

router.get('/users/by-email', requireAuth, async (req, res) => {
  try {
    const databaseUser = await authDataSource.getDatabaseUserForClient(req.query.email, req.user);
    if (!databaseUser) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    return res.json(databaseUser);
  } catch (error) {
    const message = error.message || 'Ошибка загрузки пользователя';
    const status = message === 'Недостаточно прав для просмотра пользователя' ? 403 : 400;
    return res.status(status).json({ error: message });
  }
});

router.patch('/me', requireAuth, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Имя обязательно' });
    }

    await authDataSource.updateUserName(req.user.id, name);
    const refreshedUser = await authDataSource.getAppUserById(req.user.id);

    if (!refreshedUser) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    return res.json(refreshedUser);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка обновления профиля' });
  }
});

router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Текущий и новый пароль обязательны' });
    }

    await authDataSource.changePassword(req.user.id, currentPassword, newPassword);
    return res.json({ ok: true });
  } catch (error) {
    const message = error.message || 'Ошибка смены пароля';
    const status = message === 'Неверный текущий пароль' || message === 'Пользователь не найден'
      ? 400
      : 500;

    return res.status(status).json({ error: message });
  }
});

router.post('/logout', requireAuth, async (req, res) => {
  return res.json({ ok: true });
});

module.exports = router;
