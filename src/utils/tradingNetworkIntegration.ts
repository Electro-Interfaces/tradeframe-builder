/**
 * Интеграция шаблонов команд с API торговой сети
 * Пример использования настроек подключения в командах
 */

import { tradingNetworkConfigService } from '@/services/tradingNetworkConfigService';

// Интерфейсы для данных торговой сети
export interface TankData {
  number: number;
  fuel: number;
  fuel_name: string;
  state: number;
  volume_begin: string | null;
  volume_end: string;
  volume_max: string;
  volume_free: string;
  volume: string;
  amount_begin: string | null;
  amount_end: string;
  level: string;
  water: {
    volume: string;
    amount: string;
    level: string;
  };
  temperature: string;
  density: string;
  release: {
    volume: string;
    amount: string;
  };
  dt: string;
}

export interface TransactionData {
  id: number;
  pos: number;
  shift: number;
  number: number;
  dt: string;
  tank: number;
  nozzle: number;
  fuel: number;
  fuel_name: string;
  card: string;
  order: string;
  quantity: string;
  cost: string;
  price: string;
  pay_type: {
    id: number;
    name: string;
  };
}

// Результат выполнения команды
export interface CommandExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
  timestamp: string;
}

/**
 * Базовый класс для выполнения команд торговой сети
 */
export class TradingNetworkCommandExecutor {
  /**
   * Проверка готовности интеграции
   */
  static isIntegrationReady(): boolean {
    return tradingNetworkConfigService.isConfigurationReady();
  }

  /**
   * Получение конфигурации для отображения в UI
   */
  static getIntegrationStatus() {
    return tradingNetworkConfigService.getUsageStats();
  }

  /**
   * Выполнить команду синхронизации данных резервуаров
   */
  static async executeSyncTanksCommand(params: {
    system_id?: string;
    station_id?: string;
    update_interval?: number;
  }): Promise<CommandExecutionResult> {
    const startTime = Date.now();
    
    try {
      if (!this.isIntegrationReady()) {
        return {
          success: false,
          error: 'Интеграция с торговой сетью не настроена',
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        };
      }

      const stationId = params.station_id || tradingNetworkConfigService.getConfig().defaultStationId;
      const tanksData = await tradingNetworkConfigService.getTanksData(stationId);

      return {
        success: true,
        data: {
          tanksCount: tanksData.length,
          tanks: tanksData,
          stationId,
          syncTime: new Date().toISOString()
        },
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Неизвестная ошибка при синхронизации',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Выполнить команду генерации отчета по продажам
   */
  static async executeGenerateSalesReportCommand(params: {
    system_id?: string;
    station_id?: string;
    period_type: 'shift' | 'day' | 'week' | 'month' | 'custom';
    date_from?: string;
    date_to?: string;
    shift_number?: number;
    report_format?: 'pdf' | 'excel' | 'json';
    include_details?: boolean;
  }): Promise<CommandExecutionResult> {
    const startTime = Date.now();
    
    try {
      if (!this.isIntegrationReady()) {
        return {
          success: false,
          error: 'Интеграция с торговой сетью не настроена',
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        };
      }

      const stationId = params.station_id || tradingNetworkConfigService.getConfig().defaultStationId;
      
      // Определяем параметры запроса на основе типа периода
      let transactionParams: any = { stationId };
      
      switch (params.period_type) {
        case 'shift':
          if (params.shift_number) {
            // Для получения транзакций смены используем API параметр shift
            transactionParams = {
              ...transactionParams,
              shiftNumber: params.shift_number
            };
          }
          break;
        case 'day':
          if (params.date_from) {
            transactionParams = {
              ...transactionParams,
              dateFrom: `${params.date_from}T00:00:00`,
              dateTo: `${params.date_from}T23:59:59`
            };
          }
          break;
        case 'custom':
          if (params.date_from && params.date_to) {
            transactionParams = {
              ...transactionParams,
              dateFrom: params.date_from,
              dateTo: params.date_to
            };
          }
          break;
      }

      const transactionsData = await tradingNetworkConfigService.getTransactionsData(transactionParams);
      
      // Обработка данных для отчета
      const reportData = this.processTransactionsForReport(transactionsData, params);

      return {
        success: true,
        data: {
          reportType: params.period_type,
          format: params.report_format || 'json',
          transactionsCount: transactionsData.length,
          reportData,
          generatedAt: new Date().toISOString(),
          parameters: params
        },
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Ошибка генерации отчета',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Выполнить команду мониторинга уровня топлива
   */
  static async executeMonitorFuelLevelsCommand(params: {
    system_id?: string;
    station_id?: string;
    monitoring_interval?: number;
    alert_thresholds?: {
      low_level_percent?: number;
      high_temperature?: number;
      water_level_threshold?: number;
    };
    notification_methods?: string[];
  }): Promise<CommandExecutionResult> {
    const startTime = Date.now();
    
    try {
      if (!this.isIntegrationReady()) {
        return {
          success: false,
          error: 'Интеграция с торговой сетью не настроена',
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        };
      }

      const stationId = params.station_id || tradingNetworkConfigService.getConfig().defaultStationId;
      const tanksData = await tradingNetworkConfigService.getTanksData(stationId);
      
      // Анализ данных для алертов
      const alerts = this.analyzeTanksForAlerts(tanksData, params.alert_thresholds);

      return {
        success: true,
        data: {
          monitoringStatus: 'active',
          stationId,
          tanksMonitored: tanksData.length,
          alerts,
          monitoring: {
            interval: params.monitoring_interval || 60,
            thresholds: params.alert_thresholds,
            methods: params.notification_methods || ['dashboard']
          },
          lastCheck: new Date().toISOString()
        },
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Ошибка мониторинга',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Обработка транзакций для отчета
   */
  private static processTransactionsForReport(transactions: TransactionData[], params: any) {
    // Группировка по видам топлива
    const fuelSummary = transactions.reduce((acc, transaction) => {
      const fuelName = transaction.fuel_name;
      if (!acc[fuelName]) {
        acc[fuelName] = {
          fuel_id: transaction.fuel,
          fuel_name: fuelName,
          total_quantity: 0,
          total_cost: 0,
          transactions_count: 0,
          average_price: 0
        };
      }
      
      acc[fuelName].total_quantity += parseFloat(transaction.quantity) || 0;
      acc[fuelName].total_cost += parseFloat(transaction.cost) || 0;
      acc[fuelName].transactions_count++;
      
      return acc;
    }, {} as Record<string, any>);

    // Вычисляем средние цены
    Object.values(fuelSummary).forEach((fuel: any) => {
      fuel.average_price = fuel.total_quantity > 0 
        ? Math.round((fuel.total_cost / fuel.total_quantity) * 100) / 100
        : 0;
    });

    // Группировка по способам оплаты
    const paymentSummary = transactions.reduce((acc, transaction) => {
      const paymentName = transaction.pay_type.name;
      if (!acc[paymentName]) {
        acc[paymentName] = {
          payment_id: transaction.pay_type.id,
          payment_name: paymentName,
          total_amount: 0,
          transactions_count: 0
        };
      }
      
      acc[paymentName].total_amount += parseFloat(transaction.cost) || 0;
      acc[paymentName].transactions_count++;
      
      return acc;
    }, {} as Record<string, any>);

    // Общие итоги
    const totals = {
      total_transactions: transactions.length,
      total_revenue: transactions.reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0),
      total_quantity: transactions.reduce((sum, t) => sum + (parseFloat(t.quantity) || 0), 0),
      unique_fuel_types: Object.keys(fuelSummary).length,
      unique_payment_methods: Object.keys(paymentSummary).length
    };

    return {
      summary: totals,
      fuel_breakdown: Object.values(fuelSummary),
      payment_breakdown: Object.values(paymentSummary),
      transactions: params.include_details ? transactions : []
    };
  }

  /**
   * Анализ резервуаров для генерации алертов
   */
  private static analyzeTanksForAlerts(tanks: TankData[], thresholds: any = {}) {
    const defaultThresholds = {
      low_level_percent: 20,
      high_temperature: 30,
      water_level_threshold: 3
    };
    
    const activeThresholds = { ...defaultThresholds, ...thresholds };
    const alerts: any[] = [];

    tanks.forEach(tank => {
      const level = parseFloat(tank.level);
      const temperature = parseFloat(tank.temperature);
      const waterLevel = parseFloat(tank.water.level);

      // Проверка низкого уровня топлива
      if (level <= activeThresholds.low_level_percent) {
        alerts.push({
          type: 'low_fuel_level',
          severity: level <= 10 ? 'critical' : 'warning',
          tank_number: tank.number,
          fuel_name: tank.fuel_name,
          current_level: level,
          threshold: activeThresholds.low_level_percent,
          message: `Низкий уровень ${tank.fuel_name} в резервуаре №${tank.number}: ${level}%`
        });
      }

      // Проверка высокой температуры
      if (temperature >= activeThresholds.high_temperature) {
        alerts.push({
          type: 'high_temperature',
          severity: temperature >= 35 ? 'critical' : 'warning',
          tank_number: tank.number,
          fuel_name: tank.fuel_name,
          current_temperature: temperature,
          threshold: activeThresholds.high_temperature,
          message: `Высокая температура в резервуаре №${tank.number}: ${temperature}°C`
        });
      }

      // Проверка уровня воды
      if (waterLevel >= activeThresholds.water_level_threshold) {
        alerts.push({
          type: 'water_contamination',
          severity: 'warning',
          tank_number: tank.number,
          fuel_name: tank.fuel_name,
          water_level: waterLevel,
          threshold: activeThresholds.water_level_threshold,
          message: `Обнаружена вода в резервуаре №${tank.number}: ${waterLevel}`
        });
      }
    });

    return alerts;
  }

  /**
   * Получить пример использования команд
   */
  static getUsageExamples() {
    return {
      sync_tanks: {
        description: "Синхронизация данных резервуаров",
        example: "await TradingNetworkCommandExecutor.executeSyncTanksCommand({ station_id: '77' })"
      },
      sales_report: {
        description: "Генерация отчета по продажам",
        example: "await TradingNetworkCommandExecutor.executeGenerateSalesReportCommand({ period_type: 'day', date_from: '2025-09-03' })"
      },
      fuel_monitoring: {
        description: "Мониторинг уровня топлива",
        example: "await TradingNetworkCommandExecutor.executeMonitorFuelLevelsCommand({ station_id: '77', alert_thresholds: { low_level_percent: 15 } })"
      }
    };
  }
}

// Утилиты для работы с данными
export const TradingNetworkUtils = {
  /**
   * Форматирование объема топлива
   */
  formatVolume(volume: string): string {
    const num = parseFloat(volume);
    return `${num.toFixed(2)} л`;
  },

  /**
   * Форматирование цены
   */
  formatPrice(price: string): string {
    const num = parseFloat(price);
    return `${num.toFixed(2)} ₽`;
  },

  /**
   * Форматирование процентов
   */
  formatPercentage(percentage: string): string {
    const num = parseFloat(percentage);
    return `${num.toFixed(1)}%`;
  },

  /**
   * Определение критичности уровня топлива
   */
  getFuelLevelSeverity(level: string): 'normal' | 'warning' | 'critical' {
    const num = parseFloat(level);
    if (num <= 10) return 'critical';
    if (num <= 20) return 'warning';
    return 'normal';
  },

  /**
   * Получение цвета для уровня топлива
   */
  getFuelLevelColor(level: string): string {
    const severity = this.getFuelLevelSeverity(level);
    switch (severity) {
      case 'critical': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      default: return 'text-green-500';
    }
  }
};