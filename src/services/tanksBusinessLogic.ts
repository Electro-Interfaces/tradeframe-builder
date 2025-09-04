/**
 * Бизнес-логика для управления резервуарами
 * Для АГЕНТА 2: Бизнес-логика
 */

import { Tank, TankStatus, TankEvent } from '../types/tanks';

export interface TankValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TankCalculationResult {
  volume: number;
  percentage: number;
  height: number;
  density?: number;
  mass?: number;
}

export interface TankSafetyCheck {
  level: 'safe' | 'warning' | 'critical' | 'emergency';
  alerts: string[];
  recommendations: string[];
}

export class TanksBusinessLogic {
  
  /**
   * Рассчитывает объем по высоте для цилиндрического резервуара
   */
  static calculateVolumeFromHeight(
    height: number, 
    diameter: number, 
    tankType: 'cylindrical' | 'rectangular' = 'cylindrical'
  ): number {
    if (tankType === 'cylindrical') {
      const radius = diameter / 2;
      const area = Math.PI * radius * radius;
      return Math.round(area * height / 1000); // мм в литры
    } else {
      // Для прямоугольных резервуаров diameter = width, height = height
      // Нужна дополнительная длина, пока используем diameter как площадь основания
      return Math.round(diameter * height / 1000);
    }
  }
  
  /**
   * Рассчитывает высоту по объему
   */
  static calculateHeightFromVolume(
    volume: number, 
    diameter: number,
    tankType: 'cylindrical' | 'rectangular' = 'cylindrical'
  ): number {
    if (tankType === 'cylindrical') {
      const radius = diameter / 2;
      const area = Math.PI * radius * radius;
      return Math.round(volume * 1000 / area); // литры в мм
    } else {
      return Math.round(volume * 1000 / diameter);
    }
  }
  
  /**
   * Рассчитывает плотность топлива с учетом температуры
   */
  static calculateDensityAtTemperature(
    baseDensity: number, 
    baseTemperature: number, 
    currentTemperature: number
  ): number {
    // Коэффициент температурного расширения для нефтепродуктов (~0.0007 1/°C)
    const thermalExpansionCoeff = 0.0007;
    const temperatureDiff = currentTemperature - baseTemperature;
    const densityCorrection = 1 - (thermalExpansionCoeff * temperatureDiff);
    
    return Math.round(baseDensity * densityCorrection * 100) / 100;
  }
  
  /**
   * Рассчитывает массу топлива
   */
  static calculateMass(volume: number, density: number): number {
    return Math.round(volume * density / 1000 * 100) / 100; // кг
  }
  
  /**
   * Проверяет критические уровни в резервуаре
   */
  static checkSafetyLevels(tank: {
    currentVolume: number;
    capacity: number;
    minVolume: number;
    maxVolume?: number;
    safetyMargin?: number;
  }): TankSafetyCheck {
    const percentage = (tank.currentVolume / tank.capacity) * 100;
    const safetyMargin = tank.safetyMargin || 5; // 5% по умолчанию
    const alerts: string[] = [];
    const recommendations: string[] = [];
    
    // Критические уровни
    if (tank.currentVolume <= tank.minVolume) {
      alerts.push('КРИТИЧЕСКИЙ УРОВЕНЬ: Резервуар практически пуст');
      recommendations.push('НЕМЕДЛЕННО прекратить отпуск топлива');
      recommendations.push('Запланировать срочную поставку');
      return { level: 'emergency', alerts, recommendations };
    }
    
    // Низкий уровень
    if (percentage < 10) {
      alerts.push('Низкий уровень топлива - требуется пополнение');
      recommendations.push('Заказать поставку топлива в течение 24 часов');
      return { level: 'critical', alerts, recommendations };
    }
    
    if (percentage < 20) {
      alerts.push('Уровень топлива ниже рекомендуемого минимума');
      recommendations.push('Запланировать поставку на ближайшее время');
      return { level: 'warning', alerts, recommendations };
    }
    
    // Переполнение
    const maxSafeVolume = tank.maxVolume || (tank.capacity * (100 - safetyMargin) / 100);
    if (tank.currentVolume >= maxSafeVolume) {
      alerts.push('ОПАСНОСТЬ ПЕРЕПОЛНЕНИЯ: Превышен максимальный безопасный уровень');
      recommendations.push('НЕМЕДЛЕННО прекратить загрузку');
      recommendations.push('Проверить системы контроля уровня');
      return { level: 'emergency', alerts, recommendations };
    }
    
    if (percentage > 90) {
      alerts.push('Резервуар почти полный');
      recommendations.push('Контролировать загрузку, соблюдать осторожность');
      return { level: 'warning', alerts, recommendations };
    }
    
    return { level: 'safe', alerts, recommendations };
  }
  
  /**
   * Валидация параметров резервуара
   */
  static validateTank(tank: {
    name: string;
    capacity: number;
    currentVolume: number;
    minVolume: number;
    maxVolume?: number;
    fuelTypeId?: string;
  }): TankValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Обязательные поля
    if (!tank.name || tank.name.trim().length === 0) {
      errors.push('Название резервуара обязательно');
    }
    
    if (tank.capacity <= 0) {
      errors.push('Вместимость должна быть больше нуля');
    }
    
    if (tank.currentVolume < 0) {
      errors.push('Текущий объем не может быть отрицательным');
    }
    
    if (tank.minVolume < 0) {
      errors.push('Минимальный объем не может быть отрицательным');
    }
    
    // Логическая согласованность
    if (tank.currentVolume > tank.capacity) {
      errors.push('Текущий объем не может превышать вместимость');
    }
    
    if (tank.minVolume > tank.capacity) {
      errors.push('Минимальный объем не может превышать вместимость');
    }
    
    if (tank.maxVolume && tank.maxVolume > tank.capacity) {
      errors.push('Максимальный объем не может превышать вместимость');
    }
    
    if (tank.minVolume > tank.currentVolume) {
      warnings.push('Текущий объем ниже минимального уровня');
    }
    
    // Предупреждения о безопасности
    const fillPercentage = (tank.currentVolume / tank.capacity) * 100;
    if (fillPercentage > 95) {
      warnings.push('Уровень заполнения очень высокий (>95%)');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Валидация операции с резервуаром
   */
  static validateTankOperation(
    operation: 'loading' | 'unloading' | 'transfer_in' | 'transfer_out',
    tank: {
      currentVolume: number;
      capacity: number;
      minVolume: number;
      maxVolume?: number;
      status: TankStatus;
    },
    amount: number,
    targetTank?: { currentVolume: number; capacity: number }
  ): TankValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (amount <= 0) {
      errors.push('Количество должно быть больше нуля');
    }
    
    // Проверка статуса резервуара
    if (tank.status !== 'active' && tank.status !== 'filling') {
      errors.push(`Операции запрещены: резервуар в статусе "${tank.status}"`);
    }
    
    switch (operation) {
      case 'loading':
        if (tank.currentVolume + amount > tank.capacity) {
          errors.push('Превышение вместимости резервуара при загрузке');
        }
        
        const maxSafeForLoading = tank.maxVolume || tank.capacity * 0.95;
        if (tank.currentVolume + amount > maxSafeForLoading) {
          warnings.push('Загрузка может привести к превышению безопасного уровня');
        }
        break;
        
      case 'unloading':
        if (tank.currentVolume - amount < 0) {
          errors.push('Недостаточно топлива в резервуаре');
        }
        
        if (tank.currentVolume - amount < tank.minVolume) {
          warnings.push('Операция приведет к критически низкому уровню');
        }
        break;
        
      case 'transfer_in':
        if (tank.currentVolume + amount > tank.capacity) {
          errors.push('Превышение вместимости при переливе');
        }
        break;
        
      case 'transfer_out':
        if (tank.currentVolume - amount < tank.minVolume) {
          errors.push('Перелив приведет к критически низкому уровню');
        }
        
        if (targetTank && targetTank.currentVolume + amount > targetTank.capacity) {
          errors.push('Целевой резервуар не может вместить переливаемое количество');
        }
        break;
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Синхронизация данных резервуара с оборудованием
   */
  static syncTankWithEquipment(
    tank: {
      id: string;
      currentVolume: number;
      fuelTypeId?: string;
      lastCalibration?: Date;
    },
    equipment: {
      id: string;
      status: string;
      configuredFuelType?: string;
      lastMaintenance?: Date;
      sensorData?: {
        volume?: number;
        temperature?: number;
        level?: number;
        timestamp: Date;
      };
    }
  ): {
    syncRequired: boolean;
    conflicts: string[];
    recommendations: string[];
    suggestedUpdates: Record<string, any>;
  } {
    const conflicts: string[] = [];
    const recommendations: string[] = [];
    const suggestedUpdates: Record<string, any> = {};
    
    // Проверка соответствия типов топлива
    if (tank.fuelTypeId && equipment.configuredFuelType && 
        tank.fuelTypeId !== equipment.configuredFuelType) {
      conflicts.push('Тип топлива в резервуаре не соответствует настройкам оборудования');
      recommendations.push('Обновить конфигурацию оборудования или заменить топливо');
    }
    
    // Проверка данных датчиков
    if (equipment.sensorData?.volume && 
        Math.abs(equipment.sensorData.volume - tank.currentVolume) > 50) {
      conflicts.push(`Расхождение в показаниях объема: резервуар ${tank.currentVolume}л, датчик ${equipment.sensorData.volume}л`);
      recommendations.push('Провести калибровку датчика уровня');
      suggestedUpdates.currentVolume = equipment.sensorData.volume;
    }
    
    // Проверка калибровки
    if (tank.lastCalibration) {
      const monthsAgo = (Date.now() - tank.lastCalibration.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsAgo > 6) {
        recommendations.push('Рекомендуется провести повторную калибровку резервуара');
      }
    }
    
    // Проверка технического обслуживания оборудования
    if (equipment.lastMaintenance) {
      const monthsAgo = (Date.now() - equipment.lastMaintenance.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsAgo > 3) {
        recommendations.push('Требуется техническое обслуживание измерительного оборудования');
      }
    }
    
    // Проверка статуса оборудования
    if (equipment.status !== 'active' && equipment.status !== 'online') {
      conflicts.push(`Оборудование в неработоспособном состоянии: ${equipment.status}`);
      recommendations.push('Восстановить работоспособность оборудования перед операциями с резервуаром');
    }
    
    return {
      syncRequired: conflicts.length > 0,
      conflicts,
      recommendations,
      suggestedUpdates
    };
  }
  
  /**
   * Генерация события резервуара
   */
  static createTankEvent(
    tankId: string,
    eventType: 'volume_change' | 'status_change' | 'maintenance' | 'calibration' | 'alert',
    details: {
      description: string;
      oldValue?: any;
      newValue?: any;
      operatorId?: string;
      metadata?: Record<string, any>;
    }
  ): TankEvent {
    return {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tankId,
      eventType,
      timestamp: new Date(),
      description: details.description,
      oldValue: details.oldValue,
      newValue: details.newValue,
      operatorId: details.operatorId,
      metadata: details.metadata || {}
    };
  }
  
  /**
   * Расчет времени до критического уровня
   */
  static calculateTimeToEmpty(
    currentVolume: number,
    minVolume: number,
    averageConsumptionRate: number // литров в час
  ): {
    hours: number;
    isUrgent: boolean;
    recommendation: string;
  } {
    if (averageConsumptionRate <= 0) {
      return {
        hours: Infinity,
        isUrgent: false,
        recommendation: 'Невозможно рассчитать - нет данных о потреблении'
      };
    }
    
    const availableVolume = currentVolume - minVolume;
    const hours = availableVolume / averageConsumptionRate;
    
    let recommendation = '';
    let isUrgent = false;
    
    if (hours < 8) {
      recommendation = 'СРОЧНО: Топливо закончится в течение рабочего дня!';
      isUrgent = true;
    } else if (hours < 24) {
      recommendation = 'ВНИМАНИЕ: Топливо закончится в течение суток';
      isUrgent = true;
    } else if (hours < 72) {
      recommendation = 'Запланировать поставку в течение 3 дней';
    } else {
      recommendation = 'Уровень топлива в норме';
    }
    
    return {
      hours: Math.round(hours * 10) / 10,
      isUrgent,
      recommendation
    };
  }
  
  /**
   * Оптимизация порядка загрузки резервуаров
   */
  static optimizeLoadingSequence(
    tanks: Array<{
      id: string;
      name: string;
      currentVolume: number;
      capacity: number;
      minVolume: number;
      priority: number;
    }>,
    availableVolume: number
  ): Array<{
    tankId: string;
    recommendedVolume: number;
    priority: number;
    reason: string;
  }> {
    const recommendations = [];
    
    // Сортируем резервуары по приоритету и уровню заполнения
    const sortedTanks = tanks.sort((a, b) => {
      const aFillPercent = (a.currentVolume / a.capacity) * 100;
      const bFillPercent = (b.currentVolume / b.capacity) * 100;
      
      // Сначала по приоритету, затем по уровню заполнения
      return (b.priority - a.priority) || (aFillPercent - bFillPercent);
    });
    
    let remainingVolume = availableVolume;
    
    for (const tank of sortedTanks) {
      if (remainingVolume <= 0) break;
      
      const freeSpace = tank.capacity - tank.currentVolume;
      const recommendedVolume = Math.min(freeSpace, remainingVolume);
      const fillPercent = (tank.currentVolume / tank.capacity) * 100;
      
      let reason = '';
      if (fillPercent < 20) {
        reason = 'Критически низкий уровень';
      } else if (fillPercent < 50) {
        reason = 'Низкий уровень, требует пополнения';
      } else if (tank.priority > 5) {
        reason = 'Высокий приоритет';
      } else {
        reason = 'Плановое пополнение';
      }
      
      if (recommendedVolume > 0) {
        recommendations.push({
          tankId: tank.id,
          recommendedVolume,
          priority: tank.priority,
          reason
        });
        
        remainingVolume -= recommendedVolume;
      }
    }
    
    return recommendations;
  }
}