/**
 * Runtime API endpoints для системы обмена сообщениями
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');

const messagingDataSource = require('../services/messaging/messagingDataSource');

const router = express.Router();

// Все эндпоинты сообщений требуют авторизации
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const result = await messagingDataSource.getMessages({
      status: req.query.status,
      authorId: req.query.authorId,
      networkId: req.query.networkId,
      limit: req.query.limit ? Number(req.query.limit) : 50,
      offset: req.query.offset ? Number(req.query.offset) : 0,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const message = await messagingDataSource.getMessageById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    return res.json({ success: true, data: message });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const messageData = {
      author_id: req.user.id,
      title: req.body.title,
      content: req.body.content,
      content_html: req.body.content_html,
      message_type: req.body.message_type || 'news',
      priority: req.body.priority || 'medium',
      channels: req.body.channels || ['telegram', 'email'],
      recipient_type: req.body.recipient_type || 'all',
      recipient_filter: req.body.recipient_filter || {},
      scheduled_at: req.body.scheduled_at || null,
      metadata: req.body.metadata || {},
      status: 'draft',
    };

    if (!messageData.author_id || !messageData.title || !messageData.content) {
      return res.status(400).json({
        success: false,
        error: 'author_id, title, and content are required',
      });
    }

    const message = await messagingDataSource.createMessage(messageData);
    return res.json({ success: true, data: message });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body };

    delete updates.id;
    delete updates.author_id;
    delete updates.created_at;
    delete updates.sent_at;

    const message = await messagingDataSource.updateMessage(req.params.id, updates);
    return res.json({ success: true, data: message });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const message = await messagingDataSource.getMessageById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    if (message.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Only draft messages can be deleted',
      });
    }

    await messagingDataSource.deleteMessage(req.params.id);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/send', async (req, res) => {
  try {
    const message = await messagingDataSource.getMessageById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    if (message.status !== 'draft' && message.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        error: 'Message already sent or in progress',
      });
    }

    await messagingDataSource.updateMessage(message.id, { status: 'sending' });

    const recipients = await messagingDataSource.getRecipientCandidates(message);
    const recipientRecords = [];

    recipients.forEach((recipient) => {
      message.channels.forEach((channel) => {
        let contactInfo = null;

        if (channel === 'telegram' && recipient.telegram_chat_id && recipient.telegram_verified) {
          contactInfo = recipient.telegram_chat_id;
        } else if (channel === 'email' && (recipient.email_address || recipient.email)) {
          contactInfo = recipient.email_address || recipient.email;
        }

        if (contactInfo) {
          recipientRecords.push({
            message_id: message.id,
            user_id: recipient.id,
            channel,
            contact_info: contactInfo,
            delivery_status: 'pending',
          });
        }
      });
    });

    if (!recipientRecords.length) {
      await messagingDataSource.updateMessage(message.id, {
        status: 'failed',
        total_recipients: 0,
      });

      return res.status(400).json({
        success: false,
        error: 'No recipients found',
      });
    }

    await messagingDataSource.createMessageRecipients(recipientRecords);
    await messagingDataSource.updateMessage(message.id, {
      total_recipients: recipientRecords.length,
    });

    void sendMessageAsync(message, recipientRecords);

    return res.json({
      success: true,
      message: 'Message sending started',
      total_recipients: recipientRecords.length,
    });
  } catch (error) {
    await messagingDataSource.updateMessage(req.params.id, { status: 'failed' }).catch(() => {});
    return res.status(500).json({ success: false, error: error.message });
  }
});

async function sendMessageAsync(message, recipientRecords) {
  const { sendNotification: sendTelegram } = require('../telegram-bot-runtime');
  const emailService = require('../services/emailService');

  let sentCount = 0;
  let deliveredCount = 0;
  let failedCount = 0;

  for (const recipient of recipientRecords) {
    try {
      let success = false;

      if (recipient.channel === 'telegram') {
        success = await sendTelegram(recipient.contact_info, {
          notification_type: message.message_type,
          title: message.title,
          message: message.content,
          priority: message.priority,
          created_at: new Date().toISOString(),
        });
      } else if (recipient.channel === 'email') {
        const result = await emailService.sendNotification({
          to: recipient.contact_info,
          subject: message.title,
          text: message.content,
          html: message.content_html || message.content,
          priority: message.priority,
        });

        success = result.success;
      }

      if (success) {
        await messagingDataSource.updateRecipientStatus(
          recipient.message_id,
          recipient.user_id,
          recipient.channel,
          {
            delivery_status: 'sent',
            sent_at: new Date().toISOString(),
          }
        );

        sentCount += 1;
        deliveredCount += 1;
      } else {
        await messagingDataSource.updateRecipientStatus(
          recipient.message_id,
          recipient.user_id,
          recipient.channel,
          {
            delivery_status: 'failed',
            error_message: 'Delivery failed',
          }
        );

        failedCount += 1;
      }
    } catch (error) {
      await messagingDataSource.updateRecipientStatus(
        recipient.message_id,
        recipient.user_id,
        recipient.channel,
        {
          delivery_status: 'failed',
          error_message: error.message,
        }
      ).catch(() => {});

      failedCount += 1;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  await messagingDataSource.updateMessage(message.id, {
    status: 'sent',
    sent_at: new Date().toISOString(),
    sent_count: sentCount,
    delivered_count: deliveredCount,
    failed_count: failedCount,
  }).catch(() => {});
}

router.get('/:id/stats', async (req, res) => {
  try {
    const stats = await messagingDataSource.getMessageStats(req.params.id);
    return res.json({ success: true, data: stats });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
