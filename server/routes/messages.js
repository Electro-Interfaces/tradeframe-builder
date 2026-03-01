/**
 * API endpoints для системы обмена сообщениями
 * Отправка новостных сообщений через Telegram и Email
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

/**
 * Получить список сообщений
 * GET /api/messages
 */
router.get('/', async (req, res) => {
  try {
    const { status, authorId, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('broadcast_messages')
      .select(`
        *,
        author:users!author_id(id, email, name)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (authorId) {
      query = query.eq('author_id', authorId);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('[Messages API] Get messages error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Получить конкретное сообщение
 * GET /api/messages/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('broadcast_messages')
      .select(`
        *,
        author:users!author_id(id, email, name),
        recipients:message_recipients(
          id,
          user_id,
          channel,
          delivery_status,
          sent_at,
          delivered_at,
          read_at,
          error_message,
          user:users(id, email, name)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    res.json({ success: true, data });

  } catch (error) {
    console.error('[Messages API] Get message error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Создать новое сообщение (черновик)
 * POST /api/messages
 */
router.post('/', async (req, res) => {
  try {
    const {
      author_id,
      title,
      content,
      content_html,
      message_type = 'news',
      priority = 'medium',
      channels = ['telegram', 'email'],
      recipient_type = 'all',
      recipient_filter,
      scheduled_at,
      metadata
    } = req.body;

    if (!author_id || !title || !content) {
      return res.status(400).json({
        success: false,
        error: 'author_id, title, and content are required'
      });
    }

    const messageData = {
      author_id,
      title,
      content,
      content_html,
      message_type,
      priority,
      channels,
      recipient_type,
      recipient_filter,
      scheduled_at,
      metadata,
      status: 'draft'
    };

    const { data, error } = await supabase
      .from('broadcast_messages')
      .insert(messageData)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });

  } catch (error) {
    console.error('[Messages API] Create message error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Обновить сообщение
 * PUT /api/messages/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Убираем поля, которые нельзя обновлять
    delete updates.id;
    delete updates.author_id;
    delete updates.created_at;
    delete updates.sent_at;

    const { data, error } = await supabase
      .from('broadcast_messages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });

  } catch (error) {
    console.error('[Messages API] Update message error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Удалить сообщение
 * DELETE /api/messages/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Проверяем, что сообщение в статусе draft
    const { data: message } = await supabase
      .from('broadcast_messages')
      .select('status')
      .eq('id', id)
      .single();

    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    if (message.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Only draft messages can be deleted'
      });
    }

    const { error } = await supabase
      .from('broadcast_messages')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });

  } catch (error) {
    console.error('[Messages API] Delete message error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Отправить сообщение
 * POST /api/messages/:id/send
 */
router.post('/:id/send', async (req, res) => {
  try {
    const { id } = req.params;

    // Получаем сообщение
    const { data: message, error: messageError } = await supabase
      .from('broadcast_messages')
      .select('*')
      .eq('id', id)
      .single();

    if (messageError) throw messageError;

    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    // Проверяем статус
    if (message.status !== 'draft' && message.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        error: 'Message already sent or in progress'
      });
    }

    // Обновляем статус на "sending"
    await supabase
      .from('broadcast_messages')
      .update({ status: 'sending' })
      .eq('id', id);

    // Получаем список получателей
    const recipients = await getRecipients(message);

    if (recipients.length === 0) {
      await supabase
        .from('broadcast_messages')
        .update({ status: 'failed', total_recipients: 0 })
        .eq('id', id);

      return res.status(400).json({
        success: false,
        error: 'No recipients found'
      });
    }

    // Создаем записи получателей
    const recipientRecords = [];
    for (const recipient of recipients) {
      for (const channel of message.channels) {
        // Проверяем наличие контактной информации для канала
        let contactInfo = null;

        if (channel === 'telegram' && recipient.telegram_chat_id && recipient.telegram_verified) {
          // Для broadcast сообщений игнорируем telegram_enabled - отправляем всем, у кого есть и подтвержден Telegram
          contactInfo = recipient.telegram_chat_id;
        } else if (channel === 'email' && (recipient.email_address || recipient.email)) {
          // Используем email_address из настроек, если есть, иначе email из users
          contactInfo = recipient.email_address || recipient.email;
        }

        if (contactInfo) {
          recipientRecords.push({
            message_id: message.id,
            user_id: recipient.id,
            channel,
            contact_info: contactInfo,
            delivery_status: 'pending'
          });
        }
      }
    }

    // Сохраняем получателей в БД
    const { error: recipientsError } = await supabase
      .from('message_recipients')
      .insert(recipientRecords);

    if (recipientsError) throw recipientsError;

    // Обновляем статистику
    await supabase
      .from('broadcast_messages')
      .update({ total_recipients: recipientRecords.length })
      .eq('id', id);

    // Запускаем асинхронную отправку
    sendMessageAsync(message, recipientRecords);

    res.json({
      success: true,
      message: 'Message sending started',
      total_recipients: recipientRecords.length
    });

  } catch (error) {
    console.error('[Messages API] Send message error:', error);

    // Обновляем статус на failed
    await supabase
      .from('broadcast_messages')
      .update({ status: 'failed' })
      .eq('id', req.params.id);

    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Получить список получателей на основе фильтров
 */
async function getRecipients(message) {
  const { recipient_type, recipient_filter } = message;

  let query = supabase
    .from('users')
    .select(`
      id,
      email,
      name,
      settings:user_notification_settings(telegram_chat_id, telegram_verified, telegram_enabled, email_enabled, email_address)
    `);

  // Фильтрация по типу получателя
  if (recipient_type === 'roles' && recipient_filter?.role_ids) {
    // Получаем пользователей с определенными ролями
    query = query.in('role_id', recipient_filter.role_ids);
  } else if (recipient_type === 'users' && recipient_filter?.user_ids) {
    // Конкретные пользователи
    query = query.in('id', recipient_filter.user_ids);
  } else if (recipient_type === 'trading_points' && recipient_filter?.trading_point_ids) {
    // Пользователи, связанные с определенными торговыми точками
    // TODO: реализовать связь пользователей с торговыми точками
  } else if (recipient_type === 'networks' && recipient_filter?.network_ids) {
    // Пользователи, связанные с определенными сетями
    // TODO: реализовать связь пользователей с сетями
  }
  // Для 'all' не добавляем фильтры

  const { data, error } = await query;

  if (error) {
    console.error('[Messages API] Get recipients error:', error);
    return [];
  }

  // Объединяем данные пользователя с настройками
  // ВАЖНО: settings приходит как массив из-за join, берём первый элемент
  return data.map(user => {
    const settings = Array.isArray(user.settings) ? user.settings[0] : user.settings;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      telegram_chat_id: settings?.telegram_chat_id,
      telegram_verified: settings?.telegram_verified,
      telegram_enabled: settings?.telegram_enabled,
      email_enabled: settings?.email_enabled,
      email_address: settings?.email_address
    };
  });
}

/**
 * Асинхронная отправка сообщений
 */
async function sendMessageAsync(message, recipientRecords) {
  const { sendNotification: sendTelegram } = require('../telegram-bot');
  const emailService = require('../services/emailService');

  let sentCount = 0;
  let deliveredCount = 0;
  let failedCount = 0;

  for (const recipient of recipientRecords) {
    try {
      let success = false;

      if (recipient.channel === 'telegram') {
        // Отправка через Telegram
        const notification = {
          notification_type: message.message_type,
          title: message.title,
          message: message.content,
          priority: message.priority,
          created_at: new Date().toISOString()
        };

        success = await sendTelegram(recipient.contact_info, notification);
      } else if (recipient.channel === 'email') {
        // Отправка через Email
        const result = await emailService.sendNotification({
          to: recipient.contact_info,
          subject: message.title,
          text: message.content,
          html: message.content_html || message.content,
          priority: message.priority
        });

        success = result.success;
      }

      // Обновляем статус получателя (идентификация по message_id + user_id + channel)
      if (success) {
        await supabase
          .from('message_recipients')
          .update({
            delivery_status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('message_id', recipient.message_id)
          .eq('user_id', recipient.user_id)
          .eq('channel', recipient.channel);

        sentCount++;
        deliveredCount++;
      } else {
        await supabase
          .from('message_recipients')
          .update({
            delivery_status: 'failed',
            error_message: 'Delivery failed'
          })
          .eq('message_id', recipient.message_id)
          .eq('user_id', recipient.user_id)
          .eq('channel', recipient.channel);

        failedCount++;
      }

    } catch (error) {
      console.error(`[Messages API] Failed to send to recipient:`, error.message);

      await supabase
        .from('message_recipients')
        .update({
          delivery_status: 'failed',
          error_message: error.message
        })
        .eq('message_id', recipient.message_id)
        .eq('user_id', recipient.user_id)
        .eq('channel', recipient.channel);

      failedCount++;
    }

    // Небольшая задержка между отправками
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Обновляем статистику сообщения
  await supabase
    .from('broadcast_messages')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_count: sentCount,
      delivered_count: deliveredCount,
      failed_count: failedCount
    })
    .eq('id', message.id);
}

/**
 * Получить статистику сообщения
 * GET /api/messages/:id/stats
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: recipients, error } = await supabase
      .from('message_recipients')
      .select('delivery_status, channel')
      .eq('message_id', id);

    if (error) throw error;

    const stats = {
      total: recipients.length,
      pending: recipients.filter(r => r.delivery_status === 'pending').length,
      sent: recipients.filter(r => r.delivery_status === 'sent').length,
      delivered: recipients.filter(r => r.delivery_status === 'delivered').length,
      failed: recipients.filter(r => r.delivery_status === 'failed').length,
      read: recipients.filter(r => r.delivery_status === 'read').length,
      by_channel: {
        telegram: recipients.filter(r => r.channel === 'telegram').length,
        email: recipients.filter(r => r.channel === 'email').length
      }
    };

    res.json({ success: true, data: stats });

  } catch (error) {
    console.error('[Messages API] Get stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
