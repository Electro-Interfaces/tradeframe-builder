/**
 * Notification Engine - ядро системы уведомлений
 * Проверяет правила, генерирует и отправляет уведомления
 */

const { createClient } = require('@supabase/supabase-js');
const telegramService = require('./telegramService');
const axios = require('axios');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const STS_API_URL = process.env.STS_API_URL;
const STS_API_USERNAME = process.env.STS_API_USERNAME;
const STS_API_PASSWORD = process.env.STS_API_PASSWORD;

/**
 * Порог блокировки отпуска топлива (литры)
 * При уровне ниже этого значения отпуск топлива должен быть заблокирован
 */
const BLOCK_THRESHOLD_LITERS = 800;

class NotificationEngine {
  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    this.stsToken = null;
    this.stsTokenExpiry = null;
  }

  /**
   * Получить JWT токен для STS API
   */
  async getStsToken() {
    if (this.stsToken && this.stsTokenExpiry && Date.now() < this.stsTokenExpiry) {
      return this.stsToken;
    }

    try {
      const response = await axios.post(`${STS_API_URL}/v1/login`, {
        username: STS_API_USERNAME,
        password: STS_API_PASSWORD
      });

      const rawToken = response.data;
      this.stsToken = typeof rawToken === 'string' ? rawToken.replace(/"/g, '') : rawToken;
      this.stsTokenExpiry = Date.now() + (18 * 60 * 1000); // 18 минут

      return this.stsToken;
    } catch (error) {
      console.error('❌ Ошибка получения STS токена:', error.message);
      throw error;
    }
  }

  /**
   * Получить данные терминала через STS API v2/info
   */
  async getTerminalInfo(networkId, stationNumber) {
    try {
      const token = await this.getStsToken();

      const response = await axios.get(`${STS_API_URL}/v2/info`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          system: networkId,
          station: stationNumber
        }
      });

      return Array.isArray(response.data) ? response.data[0] : response.data;
    } catch (error) {
      console.error(`❌ Ошибка получения данных станции ${stationNumber}:`, error.message);
      return null;
    }
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
   * Проверить активные правила конкретного типа
   * @param {string} ruleType - тип правила (bill_acceptor_threshold, low_fuel_level, terminal_offline, etc.)
   */
  async processRulesByType(ruleType) {
    try {
      const { data: rules, error } = await this.supabase
        .from('notification_rules')
        .select('*')
        .eq('is_active', true)
        .eq('type', ruleType);

      if (error) {
        throw error;
      }

      let totalNotificationsSent = 0;

      for (const rule of rules) {
        const result = await this.processRule(rule);
        if (result && result.notificationsSent) {
          totalNotificationsSent += result.notificationsSent;
        }
      }

      return { success: true, processedRules: rules.length, notificationsSent: totalNotificationsSent };
    } catch (error) {
      console.error(`❌ Ошибка обработки правил типа ${ruleType}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Универсальная проверка дедупликации уведомлений
   * Проверяет, не было ли отправлено уведомление недавно для данного объекта
   *
   * @param {object} rule - правило уведомления
   * @param {string} notificationType - тип уведомления
   * @param {object} identifiers - идентификаторы объекта (stationCode, tankNumber и т.д.)
   * @returns {boolean} - true если можно отправлять, false если нужно пропустить
   */
  async shouldSendNotification(rule, notificationType, identifiers) {
    const notificationConfig = rule.notification_config || {};
    const scheduleConfig = rule.schedule_config || {};

    // Если дедупликация явно отключена
    if (notificationConfig.suppressDuplicates === false) {
      return true;
    }

    // Получаем интервал подавления из настроек
    // suppressDuration в миллисекундах, или вычисляем из cron расписания
    let suppressDurationMs = notificationConfig.suppressDuration;

    if (!suppressDurationMs && scheduleConfig.cron) {
      // Парсим cron и определяем интервал
      suppressDurationMs = this.getCronIntervalMs(scheduleConfig.cron);
    }

    // Значение по умолчанию - 4 часа
    if (!suppressDurationMs) {
      suppressDurationMs = 4 * 60 * 60 * 1000;
    }

    try {
      // Формируем запрос для поиска последнего уведомления
      let query = this.supabase
        .from('notifications')
        .select('*')
        .eq('type', notificationType);

      // Добавляем фильтры по идентификаторам
      for (const [key, value] of Object.entries(identifiers)) {
        query = query.eq(`context->>${key}`, String(value));
      }

      const { data: lastNotification } = await query
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!lastNotification) {
        return true; // Уведомлений еще не было
      }

      // Проверяем время с последнего уведомления
      const lastSentTime = new Date(lastNotification.created_at);
      const now = new Date();
      const timeSinceLastNotification = now - lastSentTime;

      if (timeSinceLastNotification < suppressDurationMs) {
        return false;
      }

      return true;
    } catch (error) {
      // В случае ошибки (например, нет записей) - отправляем уведомление
      return true;
    }
  }

  /**
   * Получить интервал в миллисекундах из cron выражения
   */
  getCronIntervalMs(cronExpression) {
    // Простой парсинг основных паттернов cron
    // Формат: minute hour day month weekday
    const parts = cronExpression.split(' ');
    if (parts.length < 5) return null;

    const [minute, hour] = parts;

    // */N в минутах
    if (minute.startsWith('*/')) {
      const interval = parseInt(minute.slice(2));
      return interval * 60 * 1000;
    }

    // */N в часах (при minute = 0)
    if (minute === '0' && hour.startsWith('*/')) {
      const interval = parseInt(hour.slice(2));
      return interval * 60 * 60 * 1000;
    }

    // Точные часы (0 8 * * * = каждый день в 8:00 = 24 часа)
    if (minute === '0' && /^\d+$/.test(hour)) {
      return 24 * 60 * 60 * 1000;
    }

    return null;
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
        case 'terminal_offline':
          return await this.checkTerminalOffline(rule);
        case 'unpunched_receipts':
          return await this.checkUnpunchedReceipts(rule);
        default:
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

    // Получаем данные из таблицы tenants для получения настроек порогов и списка станций
    const { data: tenants, error } = await this.supabase
      .from('tenants')
      .select('id, code, name, settings')
      .eq('type', 'network')
      .eq('is_active', true);

    if (error) {
      throw error;
    }

    const stations = [];

    // Для каждой сети получаем актуальные данные из STS API
    for (const tenant of tenants || []) {
      const networkId = tenant.settings?.external_id;
      if (!networkId) {
        continue;
      }

      const tenantStations = tenant.settings?.stations || [];

      for (const stationConfig of tenantStations) {
        if (stationConfig.active === false) {
          continue;
        }

        // Получаем актуальные данные с терминала через STS API
        const terminalData = await this.getTerminalInfo(networkId, stationConfig.code);

        let billCount = 0;
        let billAmount = 0;

        if (terminalData && terminalData.pos && terminalData.pos[0]) {
          const devices = terminalData.pos[0].devices || [];
          const billAcceptor = devices.find(d => d.name === 'Купюроприемник');

          if (billAcceptor && billAcceptor.params) {
            const billCountParam = billAcceptor.params.find(p => p.name === 'Количество купюр');
            const billAmountParam = billAcceptor.params.find(p => p.name === 'Сумма купюр');

            billCount = billCountParam ? parseInt(billCountParam.value) : 0;
            billAmount = billAmountParam ? parseFloat(billAmountParam.value) : 0;
          }
        }

        stations.push({
          id: `${tenant.id}_${stationConfig.code}`,
          tenant_id: tenant.id,
          network_id: networkId,
          code: stationConfig.code,
          name: stationConfig.name,
          bill_acceptor_count: billCount,
          bill_acceptor_amount: billAmount,
          thresholds: stationConfig.billAcceptorThresholds || {}
        });
      }
    }

    const notificationsSent = [];

    for (const station of stations) {
      if (!applyToAllStations && !specificStations?.includes(station.code)) {
        continue;
      }

      // Используем пороги из настроек станции
      const thresholds = station.thresholds.billCountWarning
        ? station.thresholds
        : this.getBillAcceptorThresholds(station.code);

      // Определяем какие уровни проверять
      const levelsToCheck = warningLevel === 'both' ? ['warning', 'critical'] : [warningLevel];

      for (const level of levelsToCheck) {
        const shouldNotify = await this.shouldSendBillAcceptorNotification(
          rule,
          station,
          thresholds,
          checkType,
          level
        );

        if (shouldNotify) {
          const notification = await this.createBillAcceptorNotification(
            rule,
            station,
            thresholds,
            level
          );

          if (notification) {
            notificationsSent.push(notification);
          }

          // Если достигнут критический порог, warning уже не нужен
          if (level === 'critical') {
            break;
          }
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
   * Проверить, нужно ли отправлять уведомление о купюроприемнике
   * Проверяет порог и дедупликацию
   */
  async shouldSendBillAcceptorNotification(rule, station, thresholds, checkType, warningLevel) {
    const billCount = station.bill_acceptor_count || 0;

    let thresholdExceeded = false;
    if (checkType === 'count') {
      if (warningLevel === 'warning') {
        thresholdExceeded = billCount >= thresholds.billCountWarning;
      } else if (warningLevel === 'critical') {
        thresholdExceeded = billCount >= thresholds.billCountCritical;
      }
    }

    if (!thresholdExceeded) {
      return false;
    }

    // Проверяем дедупликацию через универсальный метод
    return await this.shouldSendNotification(rule, 'bill_acceptor_threshold', {
      stationCode: station.code
    });
  }

  /**
   * Создать уведомление о превышении порога купюроприемника
   */
  async createBillAcceptorNotification(rule, station, thresholds, level) {
    try {
      // Используем tenant_id станции, если он есть, иначе из правила
      const tenantId = station.tenant_id || rule.tenant_id;

      const notification = {
        tenant_id: tenantId,
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
        channels: ['telegram'] // ✅ Только Telegram
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
    const recipients = await this.getRecipients(rule, notification.tenant_id, notification.type);
    const channels = notification.channels || ['telegram']; // ✅ Только Telegram

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
   * @param {Object} rule - Правило уведомления
   * @param {string} tenantId - ID тенанта
   * @param {string} notificationType - Тип уведомления (low_fuel_level, terminal_offline, и т.д.)
   */
  async getRecipients(rule, tenantId, notificationType) {
    const { recipients } = rule;
    const recipientList = [];

    // Если список получателей пуст, получаем всех активных пользователей
    const hasRecipients = (recipients.roles && recipients.roles.length > 0) ||
                          (recipients.users && recipients.users.length > 0);

    if (!hasRecipients) {
      // ✅ Получаем всех пользователей с включенным Telegram
      const { data: allSettings } = await this.supabase
        .from('user_notification_settings')
        .select('*')
        .eq('telegram_enabled', true);

      if (allSettings) {
        // Для каждой настройки получаем данные пользователя
        for (const setting of allSettings) {
          // ✅ Проверяем подписку пользователя на данный тип уведомления
          const { data: subscription } = await this.supabase
            .from('user_notification_subscriptions')
            .select('enabled')
            .eq('user_id', setting.user_id)
            .eq('notification_type', notificationType)
            .single();

          // Пропускаем, если подписка отключена
          if (subscription && !subscription.enabled) {
            continue;
          }

          const { data: user } = await this.supabase
            .from('users')
            .select('id, name')
            .eq('id', setting.user_id)
            .single();

          if (user) {
            recipientList.push({
              id: user.id,
              full_name: user.name,
              settings: setting
            });
          }
        }
      }
    } else {
      // Используем указанных получателей
      if (recipients.roles && recipients.roles.length > 0) {
        // Получаем ID ролей по названиям
        const { data: roles } = await this.supabase
          .from('roles')
          .select('id')
          .in('name', recipients.roles);

        if (roles && roles.length > 0) {
          const roleIds = roles.map(r => r.id);

          const { data: roleUsers } = await this.supabase
            .from('user_roles')
            .select('user_id')
            .in('role_id', roleIds);

          if (roleUsers) {
            for (const roleUser of roleUsers) {
              const { data: user } = await this.supabase
                .from('users')
                .select('id, name')
                .eq('id', roleUser.user_id)
                .single();

              if (user) {
                recipientList.push({
                  id: user.id,
                      full_name: user.name
                });
              }
            }
          }
        }
      }

      if (recipients.users && recipients.users.length > 0) {
        const { data: users } = await this.supabase
          .from('users')
          .select('id, name')
          .in('id', recipients.users);

        if (users) {
          recipientList.push(...users.map(u => ({
            id: u.id,
            full_name: u.name
          })));
        }
      }

      // Получаем настройки для каждого пользователя
      for (const user of recipientList) {
        const { data: settings } = await this.supabase
          .from('user_notification_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        user.settings = settings;
      }

      // ✅ Фильтруем получателей по подпискам на тип уведомления
      const filteredRecipients = [];
      for (const user of recipientList) {
        const { data: subscription } = await this.supabase
          .from('user_notification_subscriptions')
          .select('enabled')
          .eq('user_id', user.id)
          .eq('notification_type', notificationType)
          .single();

        // Пропускаем, если подписка явно отключена
        if (subscription && !subscription.enabled) {
          continue;
        }

        filteredRecipients.push(user);
      }

      return filteredRecipients;
    }

    return recipientList;
  }

  /**
   * Отправить уведомление через конкретный канал
   */
  async sendToChannel(notification, recipient, channel) {
    try {
      let deliveryResult;

      // ✅ Только Telegram канал
      if (channel === 'telegram') {
        if (!recipient.settings?.telegram_enabled || !recipient.settings?.telegram_chat_id) {
          return;
        }

        // Выбираем шаблон в зависимости от типа уведомления
        if (notification.type === 'bill_acceptor_threshold') {
          deliveryResult = await telegramService.sendBillAcceptorAlert({
            chatId: recipient.settings.telegram_chat_id,
            stationName: notification.context.stationName,
            billCount: notification.context.billCount,
            billAmount: notification.context.billAmount,
            threshold: notification.context.threshold,
            level: notification.context.level
          });
        } else if (notification.type === 'low_fuel_level') {
          deliveryResult = await telegramService.sendLowFuelLevelAlert({
            chatId: recipient.settings.telegram_chat_id,
            stationName: notification.context.stationName,
            tankNumber: notification.context.tankNumber,
            fuelType: notification.context.fuelType,
            currentPercent: notification.context.currentPercent,
            currentVolume: notification.context.currentVolume,
            maxVolume: notification.context.maxVolume,
            threshold: notification.context.threshold,
            level: notification.context.level
          });
        } else if (notification.type === 'terminal_offline') {
          deliveryResult = await telegramService.sendTerminalOfflineAlert({
            chatId: recipient.settings.telegram_chat_id,
            stationName: notification.context.stationName,
            stationCode: notification.context.stationCode,
            lastUpdate: notification.context.lastUpdate,
            delayMinutes: notification.context.delayMinutes,
            maxDelayMinutes: notification.context.maxDelayMinutes
          });
        } else if (notification.type === 'unpunched_receipts') {
          deliveryResult = await telegramService.sendUnpunchedReceiptsAlert({
            chatId: recipient.settings.telegram_chat_id,
            networkName: notification.context.networkName,
            totalCash: notification.context.totalCash,
            totalBank: notification.context.totalBank,
            stations: notification.context.stations
          });
        } else if (notification.type === 'fuel_block_threshold') {
          deliveryResult = await telegramService.sendFuelBlockAlert({
            chatId: recipient.settings.telegram_chat_id,
            stationName: notification.context.stationName,
            tankNumber: notification.context.tankNumber,
            fuelType: notification.context.fuelType,
            currentPercent: notification.context.currentPercent,
            currentVolume: notification.context.currentVolume,
            maxVolume: notification.context.maxVolume,
            blockThreshold: notification.context.blockThreshold,
            dataSource: notification.context.dataSource
          });
        }
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
   * Проверка низкого уровня топлива
   */
  async checkLowFuelLevel(rule) {
    const { rule_config } = rule;
    const { checkType, warningLevel, applyToAllStations, specificStations } = rule_config;

    // Получаем данные из таблицы tenants для получения настроек порогов и списка станций
    const { data: tenants, error } = await this.supabase
      .from('tenants')
      .select('id, code, name, settings')
      .eq('type', 'network')
      .eq('is_active', true);

    if (error) {
      throw error;
    }

    const stations = [];

    // Для каждой сети получаем актуальные данные из STS API
    for (const tenant of tenants || []) {
      const networkId = tenant.settings?.external_id;
      if (!networkId) {
        continue;
      }

      const tenantStations = tenant.settings?.stations || [];

      for (const stationConfig of tenantStations) {
        if (stationConfig.active === false) {
          continue;
        }

        // Получаем актуальные данные резервуаров через STS API
        try {
          const token = await this.getStsToken();
          const response = await axios.get(`${STS_API_URL}/v1/tanks`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            params: {
              system: networkId,
              station: stationConfig.code
            }
          });

          const tanks = response.data || [];

          // Для каждого резервуара проверяем пороги
          for (const tank of tanks) {
            // ✅ ВАЖНО: Пропускаем неактивные резервуары (state !== 1)
            // API может вернуть резервуары из других станций сети или неактивные резервуары
            // Только резервуары с state === 1 являются активными и должны проверяться
            if (!tank.state || tank.state !== 1) {
              continue;
            }

            const fuelType = tank.fuel_name;

            // Определяем отсутствие данных уровнемера (аналогично tanksService.ts)
            const volumeRaw = parseFloat(tank.volume || '0');
            const volumeMaxRaw = parseFloat(tank.volume_max || '0');
            const levelRaw = parseFloat(tank.level || '0');
            const volumeBegin = parseFloat(tank.volume_begin || '0');
            const releaseVolume = parseFloat(tank.release?.volume || '0');
            const noSensorData = volumeRaw === 0 && volumeMaxRaw === 0 && levelRaw === 0 && volumeBegin > 0;

            // Используем книжный остаток если нет данных уровнемера
            const currentVolume = noSensorData
              ? Math.max(0, volumeBegin - releaseVolume)
              : parseFloat(tank.volume || tank.volume_end || 0);
            const maxVolume = noSensorData ? volumeBegin : parseFloat(tank.volume_max || 1);
            const currentPercent = maxVolume > 0 ? (currentVolume / maxVolume) * 100 : 0;

            // Получаем пороги для этого вида топлива из настроек станции
            const fuelThresholds = stationConfig.fuelLevelThresholds?.thresholds?.find(
              t => t.fuelType === fuelType
            );

            const levelWarning = fuelThresholds?.levelWarning || 20;
            const levelCritical = fuelThresholds?.levelCritical || 10;

            stations.push({
              id: `${tenant.id}_${stationConfig.code}_tank_${tank.number}`,
              tenant_id: tenant.id,
              network_id: networkId,
              station_code: stationConfig.code,
              station_name: stationConfig.name,
              tank_number: tank.number,
              fuel_type: fuelType,
              current_percent: currentPercent,
              current_volume: currentVolume,
              max_volume: maxVolume,
              no_sensor_data: noSensorData,
              thresholds: {
                levelWarning,
                levelCritical
              }
            });
          }
        } catch (apiError) {
          console.error(`❌ Ошибка получения данных резервуаров для станции ${stationConfig.code}:`, apiError.message);
        }
      }
    }

    const notificationsSent = [];

    for (const station of stations) {
      if (!applyToAllStations && !specificStations?.includes(station.station_code)) {
        continue;
      }

      // ✅ ПРОВЕРКА ПОРОГА БЛОКИРОВКИ (800 литров) - абсолютный порог
      // Если уровень ниже 800л - отправляем критическое уведомление о блокировке
      if (station.current_volume < BLOCK_THRESHOLD_LITERS) {
        const shouldNotifyBlock = await this.shouldSendNotification(rule, 'fuel_block_threshold', {
          stationCode: station.station_code,
          tankNumber: station.tank_number
        });

        if (shouldNotifyBlock) {
          const blockNotification = await this.createFuelBlockNotification(rule, station);
          if (blockNotification) {
            notificationsSent.push(blockNotification);
          }
        }
        // Блокировка - более критична чем процентные пороги, пропускаем остальные проверки
        continue;
      }

      // Определяем какие уровни проверять (процентные пороги)
      const levelsToCheck = warningLevel === 'both' ? ['warning', 'critical'] : [warningLevel];

      for (const level of levelsToCheck) {
        const shouldNotify = await this.shouldSendFuelLevelNotification(
          rule,
          station,
          level
        );

        if (shouldNotify) {
          const notification = await this.createFuelLevelNotification(
            rule,
            station,
            level
          );

          if (notification) {
            notificationsSent.push(notification);
          }

          // Если достигнут критический порог, warning уже не нужен
          if (level === 'critical') {
            break;
          }
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
   * Проверить, нужно ли отправлять уведомление о низком уровне топлива
   * Проверяет порог и дедупликацию
   */
  async shouldSendFuelLevelNotification(rule, station, warningLevel) {
    const currentPercent = station.current_percent || 0;

    let thresholdExceeded = false;
    if (warningLevel === 'warning') {
      thresholdExceeded = currentPercent <= station.thresholds.levelWarning && currentPercent > station.thresholds.levelCritical;
    } else if (warningLevel === 'critical') {
      thresholdExceeded = currentPercent <= station.thresholds.levelCritical;
    }

    if (!thresholdExceeded) {
      return false;
    }

    // Проверяем дедупликацию через универсальный метод
    return await this.shouldSendNotification(rule, 'low_fuel_level', {
      stationCode: station.station_code,
      tankNumber: station.tank_number
    });
  }

  /**
   * Создать уведомление о низком уровне топлива
   */
  async createFuelLevelNotification(rule, station, level) {
    try {
      const tenantId = station.tenant_id || rule.tenant_id;

      const notification = {
        tenant_id: tenantId,
        rule_id: rule.id,
        type: 'low_fuel_level',
        title: `Низкий уровень топлива: ${station.station_name}`,
        message: `Резервуар №${station.tank_number} (${station.fuel_type}): уровень ${station.current_percent.toFixed(1)}% (${station.current_volume.toLocaleString('ru-RU')} л). Порог ${level === 'warning' ? 'предупреждения' : 'критический'}: ${level === 'warning' ? station.thresholds.levelWarning : station.thresholds.levelCritical}%.`,
        priority: level === 'warning' ? 'medium' : 'high',
        context: {
          stationCode: station.station_code,
          stationName: station.station_name,
          tankNumber: station.tank_number,
          fuelType: station.fuel_type,
          currentPercent: station.current_percent,
          currentVolume: station.current_volume,
          maxVolume: station.max_volume,
          threshold: station.thresholds,
          level
        },
        status: 'pending',
        channels: ['telegram'] // ✅ Только Telegram
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
      console.error('❌ Ошибка создания уведомления о низком уровне топлива:', error);
      return null;
    }
  }

  /**
   * Создать уведомление о БЛОКИРОВКЕ отпуска топлива (уровень < 800 л)
   * Приоритет: critical
   */
  async createFuelBlockNotification(rule, station) {
    try {
      const tenantId = station.tenant_id || rule.tenant_id;

      const notification = {
        tenant_id: tenantId,
        rule_id: rule.id,
        type: 'fuel_block_threshold',
        title: `🚫 БЛОКИРОВКА ОТПУСКА: ${station.station_name}`,
        message: `Резервуар №${station.tank_number} (${station.fuel_type}): уровень ${station.current_volume.toLocaleString('ru-RU')} л (${station.current_percent.toFixed(1)}%). Отпуск топлива заблокирован (порог блокировки: ${BLOCK_THRESHOLD_LITERS} л).`,
        priority: 'critical',
        context: {
          stationCode: station.station_code,
          stationName: station.station_name,
          tankNumber: station.tank_number,
          fuelType: station.fuel_type,
          currentPercent: station.current_percent,
          currentVolume: station.current_volume,
          maxVolume: station.max_volume,
          blockThreshold: BLOCK_THRESHOLD_LITERS,
          level: 'block',
          noSensorData: station.no_sensor_data,
          dataSource: station.no_sensor_data ? 'книжный остаток' : 'уровнемер'
        },
        status: 'pending',
        channels: ['telegram']
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
      console.error('❌ Ошибка создания уведомления о блокировке отпуска топлива:', error);
      return null;
    }
  }

  /**
   * Проверка работы терминала (задержка передачи данных)
   */
  async checkTerminalOffline(rule) {
    try {
      const maxDelayMinutes = rule.rule_config?.maxDelayMinutes || 12;
      let notificationsSent = 0;

      // Получаем тенанта
      const { data: tenant, error: tenantError } = await this.supabase
        .from('tenants')
        .select('*')
        .eq('id', rule.tenant_id)
        .single();

      if (tenantError || !tenant) {
        console.error('❌ Ошибка получения тенанта:', tenantError);
        return { success: false, error: 'Tenant not found' };
      }

      const networkId = tenant.settings?.external_id || tenant.external_id;
      const stations = tenant.settings?.stations || [];

      if (!stations || stations.length === 0) {
        return { success: true, notificationsSent: 0 };
      }

      // Проверяем каждую станцию
      for (const station of stations) {
        // ✅ Пропускаем неактивные станции (аналогично checkBillAcceptorThresholds и checkLowFuelLevel)
        if (station.active === false) {
          continue;
        }

        const stationCode = station.code || station.external_id;
        const stationName = station.name || `АЗС ${stationCode}`;

        // Получаем данные терминала
        const terminalInfo = await this.getTerminalInfo(networkId, stationCode);

        if (!terminalInfo || !terminalInfo.pos || !terminalInfo.pos[0]) {
          continue;
        }

        const posData = terminalInfo.pos[0];
        const lastUpdate = posData.dt_info;

        if (!lastUpdate) {
          continue;
        }

        // Вычисляем задержку
        const now = new Date();
        const lastUpdateDate = new Date(lastUpdate);
        const delayMs = now - lastUpdateDate;
        const delayMinutes = Math.floor(delayMs / 60000);

        // Проверяем превышение порога
        if (delayMinutes > maxDelayMinutes) {

          // Проверяем, не отправляли ли мы недавно уведомление об этой проблеме
          const shouldSend = await this.shouldSendTerminalOfflineNotification(
            rule,
            stationCode
          );

          if (shouldSend) {
            await this.createTerminalOfflineNotification(
              rule,
              tenant,
              stationCode,
              stationName,
              lastUpdate,
              delayMinutes,
              maxDelayMinutes
            );
            notificationsSent++;
          }
        }
      }

      return { success: true, notificationsSent };

    } catch (error) {
      console.error('❌ Ошибка проверки работы терминала:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Проверить, нужно ли отправлять уведомление о проблемах с терминалом
   * Использует универсальную дедупликацию на основе настроек правила
   */
  async shouldSendTerminalOfflineNotification(rule, stationCode) {
    return await this.shouldSendNotification(rule, 'terminal_offline', {
      stationCode: stationCode
    });
  }

  /**
   * Создать уведомление о проблемах с работой терминала
   */
  async createTerminalOfflineNotification(rule, tenant, stationCode, stationName, lastUpdate, delayMinutes, maxDelayMinutes) {
    try {
      const data = {
        tenant_id: tenant.id,
        rule_id: rule.id,
        type: 'terminal_offline',
        title: `Проблема с передачей данных: ${stationName}`,
        message: `Терминал не передает данные уже ${delayMinutes} мин. Последнее обновление: ${new Date(lastUpdate).toLocaleString('ru-RU')}`,
        priority: 'high',
        status: 'pending',
        channels: ['telegram'], // ✅ Только Telegram
        context: {
          stationCode,
          stationName,
          lastUpdate,
          delayMinutes,
          maxDelayMinutes
        }
      };

      const { data: notification, error } = await this.supabase
        .from('notifications')
        .insert(data)
        .select()
        .single();

      if (error) {
        console.error('❌ Ошибка создания уведомления:', error);
        return null;
      }

      await this.sendNotification(data, rule);

      return data;
    } catch (error) {
      console.error('❌ Ошибка создания уведомления о проблемах с терминалом:', error);
      return null;
    }
  }

  /**
   * Проверка незакрытых смен (заглушка)
   */
  async checkShiftNotClosed(rule) {
    return { success: true, notificationsSent: 0 };
  }

  /**
   * Проверка непробитых чеков по всем станциям сети
   * Отправляет сводку если есть хотя бы одна станция с непробитыми чеками
   */
  async checkUnpunchedReceipts(rule) {
    try {
      // Получаем тенанта
      const { data: tenant, error: tenantError } = await this.supabase
        .from('tenants')
        .select('*')
        .eq('id', rule.tenant_id)
        .single();

      if (tenantError || !tenant) {
        console.error('❌ Ошибка получения тенанта:', tenantError);
        return { success: false, error: 'Tenant not found' };
      }

      const networkId = tenant.settings?.external_id || tenant.external_id;
      const networkName = tenant.name || `Сеть ${networkId}`;
      const stations = tenant.settings?.stations || [];

      if (!stations || stations.length === 0) {
        return { success: true, notificationsSent: 0 };
      }

      const stationsWithReceipts = [];
      let totalCash = 0;
      let totalBank = 0;

      // Проверяем каждую станцию
      for (const station of stations) {
        // Пропускаем неактивные станции
        if (station.active === false) {
          continue;
        }

        const stationCode = station.code || station.external_id;
        const stationName = station.name || `АЗС ${stationCode}`;

        // Получаем данные терминала
        const terminalInfo = await this.getTerminalInfo(networkId, stationCode);

        if (!terminalInfo || !terminalInfo.pos || !terminalInfo.pos[0]) {
          continue;
        }

        const posData = terminalInfo.pos[0];
        const cashSum = parseFloat(posData.cash_sum || '0') || 0;
        const bankSum = parseFloat(posData.bank_sum || '0') || 0;

        if (cashSum > 0 || bankSum > 0) {
          stationsWithReceipts.push({
            stationCode,
            stationName,
            cashSum,
            bankSum
          });
          totalCash += cashSum;
          totalBank += bankSum;
        }
      }

      // Если нет непробитых чеков - ничего не делаем
      if (stationsWithReceipts.length === 0) {
        return { success: true, notificationsSent: 0 };
      }

      // Проверяем дедупликацию (не отправлять слишком часто)
      const shouldSend = await this.shouldSendNotification(rule, 'unpunched_receipts', {
        networkId: networkId
      });

      if (!shouldSend) {
        return { success: true, notificationsSent: 0 };
      }

      // Создаем уведомление
      const notification = await this.createUnpunchedReceiptsNotification(
        rule,
        tenant,
        networkName,
        totalCash,
        totalBank,
        stationsWithReceipts
      );

      if (notification) {
        return { success: true, notificationsSent: 1 };
      }

      return { success: true, notificationsSent: 0 };

    } catch (error) {
      console.error('❌ Ошибка проверки непробитых чеков:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Создать уведомление о непробитых чеках
   */
  async createUnpunchedReceiptsNotification(rule, tenant, networkName, totalCash, totalBank, stations) {
    try {
      const data = {
        tenant_id: tenant.id,
        rule_id: rule.id,
        type: 'unpunched_receipts',
        title: `Непробитые чеки: ${networkName}`,
        message: `Требуется пробить чеки. Наличные: ${totalCash.toLocaleString('ru-RU')} ₽, Безнал: ${totalBank.toLocaleString('ru-RU')} ₽`,
        priority: 'medium',
        status: 'pending',
        channels: ['telegram'],
        context: {
          networkId: tenant.settings?.external_id || tenant.external_id,
          networkName,
          totalCash,
          totalBank,
          stations,
          stationCount: stations.length
        }
      };

      const { data: notification, error } = await this.supabase
        .from('notifications')
        .insert(data)
        .select()
        .single();

      if (error) {
        console.error('❌ Ошибка создания уведомления:', error);
        return null;
      }

      await this.sendNotification(notification, rule);

      // Обновляем статистику правила
      await this.supabase
        .from('notification_rules')
        .update({
          last_notification_at: new Date().toISOString(),
          total_notifications_sent: (rule.total_notifications_sent || 0) + 1
        })
        .eq('id', rule.id);

      return notification;
    } catch (error) {
      console.error('❌ Ошибка создания уведомления о непробитых чеках:', error);
      return null;
    }
  }
}

const notificationEngine = new NotificationEngine();

module.exports = notificationEngine;
