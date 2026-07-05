/**
 * Notification Scheduler - планировщик проверки правил уведомлений
 * Использует node-cron для периодического запуска проверок
 */

const cron = require('node-cron');
const notificationEngine = require('./notificationEngine');

class NotificationScheduler {
  constructor() {
    this.tasks = new Map();
    this.runningTasks = new Set();
    this.isRunning = false;
  }

  /**
   * Запустить планировщик
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.scheduleTask(
      'checkBillAcceptors',
      '0 */6 * * *',
      () => this.runBillAcceptorChecks()
    );

    this.scheduleTask(
      'checkEquipmentOffline',
      '*/30 * * * *',
      () => this.runEquipmentOfflineChecks()
    );

    this.scheduleTask(
      'checkLowFuelLevel',
      '0 */4 * * *', // Каждые 4 часа
      () => this.runLowFuelLevelChecks()
    );

    this.scheduleTask(
      'checkTerminalOffline',
      '*/15 * * * *', // Каждые 15 минут
      () => this.runTerminalOfflineChecks()
    );

    this.scheduleTask(
      'checkUnpunchedReceipts',
      '0 */2 * * *', // Каждые 2 часа
      () => this.runUnpunchedReceiptsChecks()
    );

    this.scheduleTask(
      'cleanupOldNotifications',
      '30 4 * * *', // Ежедневно в 4:30 — retention таблицы notifications
      () => notificationEngine.cleanupOldNotifications()
    );

    this.isRunning = true;
  }

  /**
   * Остановить планировщик
   */
  stop() {
    this.tasks.forEach(task => task.stop());
    this.tasks.clear();
    this.isRunning = false;
  }

  /**
   * Запланировать задачу
   */
  scheduleTask(name, cronExpression, callback) {
    if (this.tasks.has(name)) {
      this.tasks.get(name).stop();
    }

    const task = cron.schedule(cronExpression, async () => {
      // Предыдущий тик ещё не завершился (например, STS отвечает медленно) —
      // пропускаем, иначе зависшие проверки накапливаются друг на друге.
      if (this.runningTasks.has(name)) {
        console.error(`⚠️ Задача ${name} ещё выполняется — тик пропущен`);
        return;
      }
      this.runningTasks.add(name);
      try {
        await callback();
      } catch (error) {
        console.error(`❌ Ошибка выполнения задачи ${name}:`, error);
      } finally {
        this.runningTasks.delete(name);
      }
    });

    this.tasks.set(name, task);
  }

  /**
   * Выполнить проверку порогов купюроприемника
   * Вызывает ТОЛЬКО правила типа bill_acceptor_threshold
   */
  async runBillAcceptorChecks() {
    const result = await notificationEngine.processRulesByType('bill_acceptor_threshold');
    return result;
  }

  /**
   * Выполнить проверку оборудования offline
   * Вызывает ТОЛЬКО правила типа equipment_offline
   */
  async runEquipmentOfflineChecks() {
    const result = await notificationEngine.processRulesByType('equipment_offline');
    return result;
  }

  /**
   * Выполнить проверку низкого уровня топлива
   * Вызывает ТОЛЬКО правила типа low_fuel_level
   */
  async runLowFuelLevelChecks() {
    const result = await notificationEngine.processRulesByType('low_fuel_level');
    return result;
  }

  /**
   * Выполнить проверку работы терминала
   * Вызывает ТОЛЬКО правила типа terminal_offline
   */
  async runTerminalOfflineChecks() {
    const result = await notificationEngine.processRulesByType('terminal_offline');
    return result;
  }

  /**
   * Выполнить проверку непробитых чеков
   * Вызывает ТОЛЬКО правила типа unpunched_receipts
   */
  async runUnpunchedReceiptsChecks() {
    const result = await notificationEngine.processRulesByType('unpunched_receipts');
    return result;
  }

  /**
   * Запустить проверку вручную
   */
  async runManualCheck(taskName) {
    switch (taskName) {
      case 'checkBillAcceptors':
        return await this.runBillAcceptorChecks();
      case 'checkEquipmentOffline':
        return await this.runEquipmentOfflineChecks();
      case 'checkLowFuelLevel':
        return await this.runLowFuelLevelChecks();
      case 'checkTerminalOffline':
        return await this.runTerminalOfflineChecks();
      case 'checkUnpunchedReceipts':
        return await this.runUnpunchedReceiptsChecks();
      default:
        throw new Error(`Unknown task: ${taskName}`);
    }
  }
}

const scheduler = new NotificationScheduler();

module.exports = scheduler;
