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
        const shouldNotify = this.shouldSendBillAcceptorNotification(
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
    const recipients = await this.getRecipients(rule, notification.tenant_id);
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
   */
  async getRecipients(rule, tenantId) {
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
              station_number: stationConfig.code
            }
          });

          const tanks = response.data || [];

          // Для каждого резервуара проверяем пороги
          for (const tank of tanks) {
            const fuelType = tank.fuel_name;
            const currentVolume = parseFloat(tank.volume || tank.volume_end || 0);
            const maxVolume = parseFloat(tank.volume_max || 1);
            const currentPercent = maxVolume > 0 ? (currentVolume / maxVolume) * 100 : 0;

            // Пропускаем резервуары с некорректными данными
            // (если объем = 0 и емкость > 0, скорее всего это ошибка API или неактивный резервуар)
            if (currentVolume === 0 && maxVolume > 0) {
              console.warn(`⚠️ Пропущен резервуар ${tank.number} (${fuelType}) на станции ${stationConfig.code}: нулевой объем при ненулевой емкости (возможно, некорректные данные API)`);
              continue;
            }

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

      // Определяем какие уровни проверять
      const levelsToCheck = warningLevel === 'both' ? ['warning', 'critical'] : [warningLevel];

      for (const level of levelsToCheck) {
        const shouldNotify = this.shouldSendFuelLevelNotification(
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
   */
  shouldSendFuelLevelNotification(station, warningLevel) {
    const currentPercent = station.current_percent || 0;

    if (warningLevel === 'warning') {
      return currentPercent <= station.thresholds.levelWarning && currentPercent > station.thresholds.levelCritical;
    } else if (warningLevel === 'critical') {
      return currentPercent <= station.thresholds.levelCritical;
    }

    return false;
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
   * Проверка работы терминала (задержка передачи данных)
   */
  async checkTerminalOffline(rule) {
    try {
      console.log('🔍 Проверка работы терминала...');

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
        console.log('⚠️ Нет станций для проверки');
        return { success: true, notificationsSent: 0 };
      }

      // Проверяем каждую станцию
      for (const station of stations) {
        const stationCode = station.code || station.external_id;
        const stationName = station.name || `АЗС ${stationCode}`;

        console.log(`📍 Проверка станции: ${stationName} (${stationCode})`);

        // Получаем данные терминала
        const terminalInfo = await this.getTerminalInfo(networkId, stationCode);

        if (!terminalInfo || !terminalInfo.pos || !terminalInfo.pos[0]) {
          console.log(`⚠️ Не удалось получить данные терминала для станции ${stationCode}`);
          continue;
        }

        const posData = terminalInfo.pos[0];
        const lastUpdate = posData.dt_info;

        if (!lastUpdate) {
          console.log(`⚠️ Нет данных о времени последнего обновления для станции ${stationCode}`);
          continue;
        }

        // Вычисляем задержку
        const now = new Date();
        const lastUpdateDate = new Date(lastUpdate);
        const delayMs = now - lastUpdateDate;
        const delayMinutes = Math.floor(delayMs / 60000);

        console.log(`   ⏰ Последнее обновление: ${lastUpdateDate.toLocaleString('ru-RU')}`);
        console.log(`   ⏱️  Задержка: ${delayMinutes} мин`);

        // Проверяем превышение порога
        if (delayMinutes > maxDelayMinutes) {
          console.log(`   ⚠️ Задержка превышает порог (${maxDelayMinutes} мин)!`);

          // Проверяем, не отправляли ли мы недавно уведомление об этой проблеме
          const shouldSend = await this.shouldSendTerminalOfflineNotification(
            tenant.id,
            stationCode,
            delayMinutes
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
          } else {
            console.log(`   ℹ️ Уведомление уже было отправлено недавно`);
          }
        } else {
          console.log(`   ✅ Задержка в пределах нормы`);
        }
      }

      console.log(`✅ Проверка завершена. Отправлено уведомлений: ${notificationsSent}`);
      return { success: true, notificationsSent };

    } catch (error) {
      console.error('❌ Ошибка проверки работы терминала:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Проверить, нужно ли отправлять уведомление о проблемах с терминалом
   */
  async shouldSendTerminalOfflineNotification(tenantId, stationCode, delayMinutes) {
    try {
      // Проверяем последнее уведомление
      const { data: lastNotification } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('type', 'terminal_offline')
        .eq('context->>stationCode', stationCode)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!lastNotification) {
        return true; // Уведомлений еще не было
      }

      // Если последнее уведомление было отправлено менее часа назад, не отправляем повторно
      const lastSentTime = new Date(lastNotification.created_at);
      const now = new Date();
      const timeSinceLastNotification = now - lastSentTime;
      const hoursSinceLastNotification = timeSinceLastNotification / (1000 * 60 * 60);

      return hoursSinceLastNotification >= 1; // Отправляем не чаще раза в час

    } catch (error) {
      console.error('❌ Ошибка проверки необходимости отправки уведомления:', error);
      return true; // В случае ошибки отправляем
    }
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
}

const notificationEngine = new NotificationEngine();

module.exports = notificationEngine;
