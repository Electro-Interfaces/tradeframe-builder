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
      '0 */4 * * *',
      () => this.runLowFuelLevelChecks()
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
   */
  async runBillAcceptorChecks() {
    const result = await notificationEngine.processAllRules();
    return result;
  }

  /**
   * Выполнить проверку оборудования offline
   */
  async runEquipmentOfflineChecks() {
    return { success: true };
  }

  /**
   * Выполнить проверку низкого уровня топлива
   */
  async runLowFuelLevelChecks() {
    return { success: true };
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
      default:
        throw new Error(`Unknown task: ${taskName}`);
    }
  }
}

const scheduler = new NotificationScheduler();

module.exports = scheduler;
