/**
 * Telegram Webhook для привязки пользователей
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

/**
 * Webhook endpoint для получения обновлений от Telegram Bot
 */
router.post('/webhook', async (req, res) => {
  try {
    const update = req.body;

    if (update.message) {
      await handleMessage(update.message);
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(200).json({ ok: true });
  }
});

/**
 * Обработка сообщения от пользователя
 */
async function handleMessage(message) {
  const chatId = message.chat.id;
  const text = message.text;
  const username = message.from.username;

  if (text.startsWith('/start')) {
    const linkCode = text.split(' ')[1];

    if (linkCode) {
      await linkUserByChatId(chatId, linkCode, username);
    } else {
      await sendWelcomeMessage(chatId);
    }
  }
}

/**
 * Привязать пользователя к Chat ID через код привязки
 */
async function linkUserByChatId(chatId, linkCode, username) {
  try {
    const { data: settings, error } = await supabase
      .from('user_notification_settings')
      .select('*')
      .eq('telegram_link_code', linkCode)
      .gte('telegram_link_expires_at', new Date().toISOString())
      .single();

    if (error || !settings) {
      return;
    }

    await supabase
      .from('user_notification_settings')
      .update({
        telegram_chat_id: chatId.toString(),
        telegram_username: username,
        telegram_verified: true,
        telegram_enabled: true,
        telegram_link_code: null,
        telegram_link_expires_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', settings.id);

  } catch (error) {
    console.error('❌ Ошибка привязки Telegram:', error);
  }
}

/**
 * Отправить приветственное сообщение
 */
async function sendWelcomeMessage(chatId) {
  return { success: true };
}

/**
 * API endpoint для генерации кода привязки
 * ОБНОВЛЕНО: использует таблицу telegram_link_codes
 */
router.post('/generate-link-code', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const linkCode = generateLinkCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа

    // Создаем запись в таблице telegram_link_codes
    const { data: codeData, error: insertError } = await supabase
      .from('telegram_link_codes')
      .insert({
        code: linkCode,
        user_id: userId,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'TradeControlDW_Bot';
    const telegramLink = `https://t.me/${botUsername}?start=${linkCode}`;

    console.log(`[Telegram] Generated link code: ${linkCode} for user: ${userId}`);

    res.json({
      success: true,
      linkCode,
      telegramLink,
      expiresAt: expiresAt.toISOString()
    });

  } catch (error) {
    console.error('❌ Ошибка генерации кода привязки:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Генерировать случайный код привязки
 */
function generateLinkCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * API endpoint для сохранения настроек уведомлений пользователя
 */
router.post('/save-settings', async (req, res) => {
  try {
    const { userId, settings } = req.body;

    console.log('[Telegram] Save settings request:', { userId, settings });

    if (!userId || !settings) {
      return res.status(400).json({ error: 'userId and settings are required' });
    }

    // Проверяем существующие настройки
    const { data: existing, error: existingError } = await supabase
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    console.log('[Telegram] Existing settings:', existing, 'Error:', existingError);

    let result;

    if (existing) {
      // Обновляем существующие настройки
      console.log('[Telegram] Updating settings...');
      const { data, error } = await supabase
        .from('user_notification_settings')
        .update(settings)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('[Telegram] Update error:', error);
        throw error;
      }
      result = data;
    } else {
      // Создаем новые настройки
      console.log('[Telegram] Creating new settings...');
      const { data, error } = await supabase
        .from('user_notification_settings')
        .insert({
          user_id: userId,
          ...settings
        })
        .select()
        .single();

      if (error) {
        console.error('[Telegram] Insert error:', error);
        throw error;
      }
      result = data;
    }

    console.log('[Telegram] Settings saved successfully:', result);
    res.json({ success: true, data: result });

  } catch (error) {
    console.error('[Telegram] Save settings error:', error.message, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint для получения настроек уведомлений пользователя
 */
router.get('/get-settings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({ success: true, data: data || null });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint для сохранения подписок пользователя
 */
router.post('/save-subscription', async (req, res) => {
  try {
    const { userId, notificationType, subscription } = req.body;

    if (!userId || !notificationType) {
      return res.status(400).json({ error: 'userId and notificationType are required' });
    }

    // Проверяем существующую подписку
    const { data: existing } = await supabase
      .from('user_notification_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('notification_type', notificationType)
      .single();

    let result;

    if (existing) {
      // Обновляем существующую подписку
      const { data, error } = await supabase
        .from('user_notification_subscriptions')
        .update(subscription)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Создаем новую подписку
      const { data, error } = await supabase
        .from('user_notification_subscriptions')
        .insert({
          user_id: userId,
          notification_type: notificationType,
          ...subscription
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    res.json({ success: true, data: result });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint для получения подписок пользователя
 */
router.get('/get-subscriptions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('user_notification_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ success: true, data: data || [] });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint для отправки тестового уведомления
 */
router.post('/send-test-notification', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Получаем настройки пользователя с chat_id
    const { data: settings, error: settingsError } = await supabase
      .from('user_notification_settings')
      .select('telegram_chat_id, telegram_verified')
      .eq('user_id', userId)
      .single();

    if (settingsError || !settings) {
      return res.status(404).json({ error: 'User notification settings not found' });
    }

    if (!settings.telegram_verified || !settings.telegram_chat_id) {
      return res.status(400).json({ error: 'Telegram not linked for this user' });
    }

    // Импортируем sendNotification из telegram-bot.js
    const { sendNotification } = require('../telegram-bot');

    // Создаем тестовое уведомление
    const testNotification = {
      notification_type: 'bill_acceptor_threshold',
      title: 'Тестовое уведомление',
      message: 'Это тестовое уведомление для проверки работы Telegram бота.\n\n✅ Если вы получили это сообщение, значит интеграция работает корректно!',
      priority: 'medium',
      created_at: new Date().toISOString()
    };

    // Отправляем уведомление
    const sent = await sendNotification(settings.telegram_chat_id, testNotification);

    if (sent) {
      console.log(`[Telegram] Test notification sent to user ${userId}`);
      res.json({
        success: true,
        message: 'Test notification sent successfully',
        chat_id: settings.telegram_chat_id
      });
    } else {
      res.status(500).json({ error: 'Failed to send notification' });
    }

  } catch (error) {
    console.error('[Telegram] Send test notification error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint для получения правил уведомлений
 */
router.get('/get-rules/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    console.log('[Telegram] Get rules request for tenant:', tenantId);

    const { data, error } = await supabase
      .from('notification_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Telegram] Get rules error:', error);
      throw error;
    }

    console.log(`[Telegram] Found ${data?.length || 0} rules for tenant ${tenantId}`);
    res.json({ success: true, data: data || [] });

  } catch (error) {
    console.error('[Telegram] Get rules failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint для создания правила уведомления
 */
router.post('/create-rule', async (req, res) => {
  try {
    const { rule } = req.body;

    console.log('[Telegram] Create rule request:', JSON.stringify(rule, null, 2));

    if (!rule) {
      return res.status(400).json({ error: 'rule is required' });
    }

    const { data, error } = await supabase
      .from('notification_rules')
      .insert(rule)
      .select()
      .single();

    if (error) {
      console.error('[Telegram] Create rule error:', error);
      throw error;
    }

    console.log('[Telegram] Rule created successfully:', data.id);
    res.json({ success: true, data });

  } catch (error) {
    console.error('[Telegram] Create rule failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint для обновления правила уведомления
 */
router.put('/update-rule/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const { updates } = req.body;

    if (!updates) {
      return res.status(400).json({ error: 'updates are required' });
    }

    const { data, error } = await supabase
      .from('notification_rules')
      .update(updates)
      .eq('id', ruleId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint для удаления правила уведомления
 */
router.delete('/delete-rule/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;

    const { error } = await supabase
      .from('notification_rules')
      .delete()
      .eq('id', ruleId);

    if (error) throw error;

    res.json({ success: true });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
