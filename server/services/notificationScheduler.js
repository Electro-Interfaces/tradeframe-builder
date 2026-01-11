/**
 * Notification Scheduler - планировщик проверки правил уведомлений
 * Использует node-cron для периодического запуска проверок
 */

const cron = require('node-cron');
const notificationEngine = require('./notificationEngine');

class NotificationScheduler {
  constructor() {
    this.tasks = new Map();
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
      try {
        await callback();
      } catch (error) {
        console.error(`❌ Ошибка выполнения задачи ${name}:`, error);
      }
    });

    this.tasks.set(name, task);
  }

  /**
   * Выполнить проверку порогов купюроприемника
   * Вызывает ТОЛЬКО правила типа bill_acceptor_threshold
   */
  async runBillAcceptorChecks() {
    console.log('🔍 [Scheduler] Запуск проверки порогов купюроприемника...');
    const result = await notificationEngine.processRulesByType('bill_acceptor_threshold');
    console.log(`✅ [Scheduler] Проверка купюроприемника завершена. Обработано правил: ${result.processedRules}, отправлено уведомлений: ${result.notificationsSent || 0}`);
    return result;
  }

  /**
   * Выполнить проверку оборудования offline
   * Вызывает ТОЛЬКО правила типа equipment_offline
   */
  async runEquipmentOfflineChecks() {
    console.log('🔍 [Scheduler] Запуск проверки оборудования offline...');
    const result = await notificationEngine.processRulesByType('equipment_offline');
    console.log(`✅ [Scheduler] Проверка оборудования offline завершена. Обработано правил: ${result.processedRules}, отправлено уведомлений: ${result.notificationsSent || 0}`);
    return result;
  }

  /**
   * Выполнить проверку низкого уровня топлива
   * Вызывает ТОЛЬКО правила типа low_fuel_level
   */
  async runLowFuelLevelChecks() {
    console.log('🔍 [Scheduler] Запуск проверки низкого уровня топлива...');
    const result = await notificationEngine.processRulesByType('low_fuel_level');
    console.log(`✅ [Scheduler] Проверка низкого уровня топлива завершена. Обработано правил: ${result.processedRules}, отправлено уведомлений: ${result.notificationsSent || 0}`);
    return result;
  }

  /**
   * Выполнить проверку работы терминала
   * Вызывает ТОЛЬКО правила типа terminal_offline
   */
  async runTerminalOfflineChecks() {
    console.log('🔍 [Scheduler] Запуск проверки работы терминала...');
    const result = await notificationEngine.processRulesByType('terminal_offline');
    console.log(`✅ [Scheduler] Проверка работы терминала завершена. Обработано правил: ${result.processedRules}, отправлено уведомлений: ${result.notificationsSent || 0}`);
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
      default:
        throw new Error(`Unknown task: ${taskName}`);
    }
  }
}

const scheduler = new NotificationScheduler();

module.exports = scheduler;
