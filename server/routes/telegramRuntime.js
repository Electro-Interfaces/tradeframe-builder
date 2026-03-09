/**
 * Runtime API endpoints для Telegram и настроек уведомлений
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');

const notificationDataSource = require('../services/notifications/notificationDataSource');

const router = express.Router();

// /webhook — публичный (Telegram Bot API callback)
router.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    const message = update?.message;
    const text = String(message?.text || '');
    const username = message?.from?.username || null;
    const chatId = message?.chat?.id;

    if (chatId && text.startsWith('/start')) {
      const code = text.split(' ')[1];
      if (code) {
        const linkCode = await notificationDataSource.findTelegramLinkCode(code);
        if (linkCode && !linkCode.used && new Date(linkCode.expires_at) >= new Date()) {
          await notificationDataSource.saveTelegramBinding(linkCode.user_id, {
            telegram_chat_id: String(chatId),
            telegram_username: username,
            telegram_verified: true,
            telegram_enabled: true,
          });
          await notificationDataSource.markTelegramLinkCodeUsed(linkCode.id);
        }
      }
    }
  } catch {}

  res.status(200).json({ ok: true });
});

// Все эндпоинты ниже требуют авторизации
router.use(requireAuth);

router.get('/get-rules/:tenantId', async (req, res) => {
  try {
    const data = await notificationDataSource.getNotificationRules(req.params.tenantId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/get-rule/:ruleId', async (req, res) => {
  try {
    const data = await notificationDataSource.getNotificationRule(req.params.ruleId);
    res.json({ success: true, data: data || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/create-rule', async (req, res) => {
  try {
    if (!req.body.rule) {
      return res.status(400).json({ error: 'rule is required' });
    }

    const data = await notificationDataSource.createNotificationRule(req.body.rule);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.put('/update-rule/:ruleId', async (req, res) => {
  try {
    if (!req.body.updates) {
      return res.status(400).json({ error: 'updates are required' });
    }

    const data = await notificationDataSource.updateNotificationRule(req.params.ruleId, req.body.updates);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete('/delete-rule/:ruleId', async (req, res) => {
  try {
    await notificationDataSource.deleteNotificationRule(req.params.ruleId);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/get-notifications/:tenantId', async (req, res) => {
  try {
    const data = await notificationDataSource.getNotifications(req.params.tenantId, {
      status: req.query.status,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    });

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/mark-notification-read/:notificationId', async (req, res) => {
  try {
    const data = await notificationDataSource.markNotificationAsRead(req.params.notificationId);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/get-settings/:userId', async (req, res) => {
  try {
    const data = await notificationDataSource.getUserNotificationSettings(req.params.userId);
    return res.json({ success: true, data: data || null });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/save-settings', async (req, res) => {
  try {
    const { userId, settings } = req.body;
    if (!userId || !settings) {
      return res.status(400).json({ error: 'userId and settings are required' });
    }

    const data = await notificationDataSource.saveUserNotificationSettings(userId, settings);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/generate-link-code', async (req, res) => {
  try {
    if (!req.body.userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const data = await notificationDataSource.generateTelegramLinkCode(req.body.userId);
    return res.json({ success: true, ...data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/get-subscriptions/:userId', async (req, res) => {
  try {
    const data = await notificationDataSource.getUserNotificationSubscriptions(req.params.userId);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/save-subscription', async (req, res) => {
  try {
    const { userId, notificationType, subscription } = req.body;
    if (!userId || !notificationType) {
      return res.status(400).json({ error: 'userId and notificationType are required' });
    }

    const data = await notificationDataSource.saveUserNotificationSubscription(
      userId,
      notificationType,
      subscription || {}
    );

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/get-role-subscriptions/:roleId', async (req, res) => {
  try {
    const data = await notificationDataSource.getRoleNotificationSubscriptions(req.params.roleId);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/send-test-notification', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const settings = await notificationDataSource.getUserNotificationSettings(userId);
    if (!settings) {
      return res.status(404).json({ error: 'User notification settings not found' });
    }

    if (!settings.telegram_verified || !settings.telegram_chat_id) {
      return res.status(400).json({ error: 'Telegram not linked for this user' });
    }

    const { sendNotification } = require('../telegram-bot-runtime');
    const sent = await sendNotification(settings.telegram_chat_id, {
      notification_type: 'bill_acceptor_threshold',
      title: 'Тестовое уведомление',
      message: 'Это тестовое уведомление для проверки работы Telegram бота.\n\nЕсли вы получили это сообщение, значит интеграция работает корректно.',
      priority: 'medium',
      created_at: new Date().toISOString(),
    });

    if (!sent) {
      return res.status(500).json({ error: 'Failed to send notification' });
    }

    return res.json({
      success: true,
      message: 'Test notification sent successfully',
      chat_id: settings.telegram_chat_id,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
