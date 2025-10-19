/**
 * Notification Engine - ядро системы уведомлений
 * Проверяет правила, генерирует и отправляет уведомления
 */

const { createClient } = require('@supabase/supabase-js');
const emailService = require('./emailService');
const telegramService = require('./telegramService');

const SUPABASE_URL = 'https://ynwbmxvqucmvjhmsxtqh.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlud2JteHZxdWNtdmpobXN4dHFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjA2MTcxMCwiZXhwIjoyMDQxNjM3NzEwfQ.uXnaH2K6arna7f_gcUeiyLjwivD-P7NRLg5CtvPnB_g';

class NotificationEngine {
  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }

  /**
   * Проверить все активные правила и отправить уведомления
   */
  async processAllRules() {
    try {
      const { data: rules, error } = await this.supabase
        .from('notification_rules')
        .select('*')
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      for (const rule of rules) {
        await this.processRule(rule);
      }

      return { success: true, processedRules: rules.length };
    } catch (error) {
      console.error('❌ Ошибка обработки правил:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Обработать конкретное правило
   */
  async processRule(rule) {
    try {
      await this.supabase
        .from('notification_rules')
        .update({ last_check_at: new Date().toISOString() })
        .eq('id', rule.id);

      switch (rule.type) {
        case 'bill_acceptor_threshold':
          return await this.checkBillAcceptorThresholds(rule);
        case 'equipment_offline':
          return await this.checkEquipmentOffline(rule);
        case 'low_fuel_level':
          return await this.checkLowFuelLevel(rule);
        case 'shift_not_closed':
          return await this.checkShiftNotClosed(rule);
        default:
          console.warn(`⚠️ Неизвестный тип правила: ${rule.type}`);
          return { success: false, error: 'Unknown rule type' };
      }
    } catch (error) {
      console.error(`❌ Ошибка обработки правила ${rule.id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Проверка порогов купюроприемника
   */
  async checkBillAcceptorThresholds(rule) {
    const { rule_config } = rule;
    const { checkType, warningLevel, applyToAllStations, specificStations } = rule_config;

    const { data: stations, error } = await this.supabase
      .from('trading_points')
      .select('id, code, name, bill_acceptor_count, bill_acceptor_amount');

    if (error) {
      throw error;
    }

    const notificationsSent = [];

    for (const station of stations) {
      if (!applyToAllStations && !specificStations?.includes(station.code)) {
        continue;
      }

      const thresholds = this.getBillAcceptorThresholds(station.code);
      const shouldNotify = this.shouldSendBillAcceptorNotification(
        station,
        thresholds,
        checkType,
        warningLevel
      );

      if (shouldNotify) {
        const notification = await this.createBillAcceptorNotification(
          rule,
          station,
          thresholds,
          warningLevel
        );

        if (notification) {
          notificationsSent.push(notification);
        }
      }
    }

    if (notificationsSent.length > 0) {
      await this.supabase
        .from('notification_rules')
        .update({
          last_notification_at: new Date().toISOString(),
          total_notifications_sent: rule.total_notifications_sent + notificationsSent.length
        })
        .eq('id', rule.id);
    }

    return { success: true, notificationsSent: notificationsSent.length };
  }

  /**
   * Получить пороги для станции
   */
  getBillAcceptorThresholds(stationCode) {
    const thresholds = {
      'C0001': { billCountWarning: 150, billCountCritical: 200 },
      'C0002': { billCountWarning: 180, billCountCritical: 250 },
      'C0003': { billCountWarning: 120, billCountCritical: 180 }
    };

    return thresholds[stationCode] || { billCountWarning: 100, billCountCritical: 150 };
  }

  /**
   * Проверить, нужно ли отправлять уведомление
   */
  shouldSendBillAcceptorNotification(station, thresholds, checkType, warningLevel) {
    const billCount = station.bill_acceptor_count || 0;

    if (checkType === 'count') {
      if (warningLevel === 'warning') {
        return billCount >= thresholds.billCountWarning;
      } else if (warningLevel === 'critical') {
        return billCount >= thresholds.billCountCritical;
      }
    }

    return false;
  }

  /**
   * Создать уведомление о превышении порога купюроприемника
   */
  async createBillAcceptorNotification(rule, station, thresholds, level) {
    try {
      const notification = {
        tenant_id: rule.tenant_id,
        rule_id: rule.id,
        type: 'bill_acceptor_threshold',
        title: `Превышен порог купюроприемника: ${station.name}`,
        message: `Количество купюр (${station.bill_acceptor_count}) превысило порог ${level === 'warning' ? thresholds.billCountWarning : thresholds.billCountCritical}. Требуется инкассация.`,
        priority: level === 'warning' ? 'medium' : 'high',
        context: {
          stationCode: station.code,
          stationName: station.name,
          billCount: station.bill_acceptor_count,
          billAmount: station.bill_acceptor_amount,
          threshold: thresholds,
          level
        },
        status: 'pending',
        channels: rule.notification_config?.channels || ['email']
      };

      const { data, error } = await this.supabase
        .from('notifications')
        .insert(notification)
        .select()
        .single();

      if (error) {
        throw error;
      }

      await this.sendNotification(data, rule);

      return data;
    } catch (error) {
      console.error('❌ Ошибка создания уведомления:', error);
      return null;
    }
  }

  /**
   * Отправить уведомление получателям
   */
  async sendNotification(notification, rule) {
    const recipients = await this.getRecipients(rule, notification.tenant_id);
    const channels = notification.channels || ['email'];

    for (const recipient of recipients) {
      for (const channel of channels) {
        await this.sendToChannel(notification, recipient, channel);
      }
    }

    await this.supabase
      .from('notifications')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', notification.id);
  }

  /**
   * Получить список получателей для правила
   */
  async getRecipients(rule, tenantId) {
    const { recipients } = rule;
    const recipientList = [];

    if (recipients.roles && recipients.roles.length > 0) {
      const { data: roleUsers } = await this.supabase
        .from('user_roles')
        .select('user_id, users(id, email, full_name)')
        .in('role_id', recipients.roles);

      if (roleUsers) {
        recipientList.push(...roleUsers.map(ur => ur.users));
      }
    }

    if (recipients.users && recipients.users.length > 0) {
      const { data: users } = await this.supabase
        .from('users')
        .select('id, email, full_name')
        .in('id', recipients.users);

      if (users) {
        recipientList.push(...users);
      }
    }

    for (const user of recipientList) {
      const { data: settings } = await this.supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      user.settings = settings;
    }

    return recipientList;
  }

  /**
   * Отправить уведомление через конкретный канал
   */
  async sendToChannel(notification, recipient, channel) {
    try {
      let deliveryResult;

      if (channel === 'email') {
        if (!recipient.settings?.email_enabled || !recipient.email) {
          return;
        }

        deliveryResult = await emailService.sendBillAcceptorAlert({
          to: recipient.email,
          stationName: notification.context.stationName,
          billCount: notification.context.billCount,
          billAmount: notification.context.billAmount,
          threshold: notification.context.threshold,
          level: notification.context.level
        });
      } else if (channel === 'telegram') {
        if (!recipient.settings?.telegram_enabled || !recipient.settings?.telegram_chat_id) {
          return;
        }

        deliveryResult = await telegramService.sendBillAcceptorAlert({
          chatId: recipient.settings.telegram_chat_id,
          stationName: notification.context.stationName,
          billCount: notification.context.billCount,
          billAmount: notification.context.billAmount,
          threshold: notification.context.threshold,
          level: notification.context.level
        });
      }

      await this.supabase
        .from('notification_delivery_log')
        .insert({
          notification_id: notification.id,
          user_id: recipient.id,
          channel,
          status: deliveryResult?.success ? 'delivered' : 'failed',
          error_message: deliveryResult?.error,
          metadata: deliveryResult
        });

    } catch (error) {
      console.error(`❌ Ошибка отправки через ${channel}:`, error);
    }
  }

  /**
   * Проверка оборудования offline (заглушка)
   */
  async checkEquipmentOffline(rule) {
    return { success: true, notificationsSent: 0 };
  }

  /**
   * Проверка низкого уровня топлива (заглушка)
   */
  async checkLowFuelLevel(rule) {
    return { success: true, notificationsSent: 0 };
  }

  /**
   * Проверка незакрытых смен (заглушка)
   */
  async checkShiftNotClosed(rule) {
    return { success: true, notificationsSent: 0 };
  }
}

const notificationEngine = new NotificationEngine();

module.exports = notificationEngine;
