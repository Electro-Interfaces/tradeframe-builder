/**
 * Система персистентного хранения данных в localStorage
 * Поддерживает auth систему и экспорт для миграции в БД
 */

interface StorageMetadata {
  version: string;
  lastModified: string;
  userId?: string;
  environment: 'development' | 'production';
}

interface StorageData<T> {
  data: T[];
  metadata: StorageMetadata;
}

class PersistentStorageClass {
  private static readonly VERSION = '2.0.0';
  private static readonly PREFIX = 'tradeframe_';

  /**
   * Сохранить данные в localStorage (новый API для совместимости с auth)
   */
  async setItem<T>(key: string, data: T[]): Promise<void> {
    const storageKey = PersistentStorageClass.PREFIX + key;
    const storageData: StorageData<T> = {
      data,
      metadata: {
        version: PersistentStorageClass.VERSION,
        lastModified: new Date().toISOString(),
        userId: localStorage.getItem('tradeframe_session') ? 'current' : undefined,
        environment: import.meta.env.MODE as 'development' | 'production'
      }
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(storageData, (key, value) => {
        // Конвертируем Date объекты в ISO строки
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }));
      console.log(`✅ Данные сохранены в localStorage: ${key}`);
    } catch (error) {
      console.error(`❌ Ошибка сохранения в localStorage: ${key}`, error);
      // Если localStorage переполнен, попробуем очистить старые данные
      if (error instanceof DOMException && error.code === 22) {
        this.cleanupOldData();
        // Повторная попытка
        try {
          localStorage.setItem(storageKey, JSON.stringify(storageData));
        } catch (retryError) {
          console.error('❌ Не удалось сохранить даже после очистки', retryError);
          throw retryError;
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Загрузить данные из localStorage (новый API для совместимости с auth)
   */
  async getItem<T>(key: string, defaultValue: T[] = []): Promise<T[]> {
    const storageKey = PersistentStorageClass.PREFIX + key;
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        console.log(`ℹ️ Нет сохраненных данных для: ${key}, используем значение по умолчанию`);
        // Сохраняем начальные данные в localStorage
        if (defaultValue.length > 0) {
          console.log(`💾 Сохраняем начальные данные в localStorage: ${key}`);
          await this.setItem(key, defaultValue);
        }
        return defaultValue;
      }

      const storageData: StorageData<T> = JSON.parse(stored, (key, value) => {
        // Конвертируем ISO строки обратно в Date объекты для определенных полей
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          if (key.includes('_at') || key.includes('At') || key === 'last_login') {
            return new Date(value);
          }
        }
        return value;
      });
      
      console.log(`✅ Данные загружены из localStorage: ${key}`);
      
      // Проверка версии для совместимости
      if (storageData.metadata.version !== PersistentStorageClass.VERSION) {
        console.warn(`⚠️ Версия данных отличается: ${storageData.metadata.version} vs ${PersistentStorageClass.VERSION}`);
        // Здесь можно добавить миграцию данных между версиями
      }

      return storageData.data;
    } catch (error) {
      console.error(`❌ Ошибка загрузки из localStorage: ${key}`, error);
      return defaultValue;
    }
  }

  /**
   * Сохранить данные в localStorage (старый API для обратной совместимости)
   */
  static save<T>(key: string, data: T[]): void {
    const instance = new PersistentStorageClass();
    instance.setItem(key, data).catch(console.error);
  }

  /**
   * Загрузить данные из localStorage (старый API для обратной совместимости)
   */
  static load<T>(key: string, defaultValue: T[] = []): T[] {
    const storageKey = this.PREFIX + key;
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        console.log(`ℹ️ Нет сохраненных данных для: ${key}, используем значение по умолчанию`);
        // Сохраняем начальные данные в localStorage
        if (defaultValue.length > 0) {
          console.log(`💾 Сохраняем начальные данные в localStorage: ${key}`);
          this.save(key, defaultValue);
        }
        return defaultValue;
      }

      const storageData: StorageData<T> = JSON.parse(stored);
      console.log(`✅ Данные загружены из localStorage: ${key}`, storageData.data);
      
      // Проверка версии для совместимости
      if (storageData.metadata.version !== this.VERSION) {
        console.warn(`⚠️ Версия данных отличается: ${storageData.metadata.version} vs ${this.VERSION}`);
      }

      return storageData.data;
    } catch (error) {
      console.error(`❌ Ошибка загрузки из localStorage: ${key}`, error);
      return defaultValue;
    }
  }

  /**
   * Удалить данные из localStorage
   */
  static remove(key: string): void {
    const storageKey = this.PREFIX + key;
    localStorage.removeItem(storageKey);
    console.log(`🗑️ Данные удалены из localStorage: ${key}`);
  }

  /**
   * Проверить наличие данных
   */
  static exists(key: string): boolean {
    const storageKey = this.PREFIX + key;
    return localStorage.getItem(storageKey) !== null;
  }

  /**
   * Экспортировать все данные для миграции
   */
  static exportAll(): Record<string, any> {
    const exportData: Record<string, any> = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: this.VERSION,
        environment: import.meta.env.MODE
      },
      data: {}
    };

    // Собираем все ключи с нашим префиксом
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.PREFIX)) {
        const dataKey = key.replace(this.PREFIX, '');
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            exportData.data[dataKey] = JSON.parse(stored);
          }
        } catch (error) {
          console.error(`Ошибка при экспорте ${key}:`, error);
        }
      }
    }

    console.log('📤 Экспортированы все данные:', exportData);
    return exportData;
  }

  /**
   * Экспортировать данные в файл JSON
   */
  static exportToFile(): void {
    const data = this.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `tradeframe_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('💾 Данные экспортированы в файл');
  }

  /**
   * Импортировать данные из объекта
   */
  static importAll(importData: Record<string, any>): void {
    if (!importData.data) {
      throw new Error('Неверный формат данных для импорта');
    }

    Object.entries(importData.data).forEach(([key, value]) => {
      const storageKey = this.PREFIX + key;
      try {
        localStorage.setItem(storageKey, JSON.stringify(value));
        console.log(`✅ Импортированы данные для: ${key}`);
      } catch (error) {
        console.error(`❌ Ошибка импорта ${key}:`, error);
      }
    });

    console.log('📥 Импорт завершен');
  }

  /**
   * Импортировать данные из файла
   */
  static importFromFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const importData = JSON.parse(event.target?.result as string);
          this.importAll(importData);
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsText(file);
    });
  }

  /**
   * Очистить старые данные для освобождения места
   */
  private static cleanupOldData(): void {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 1); // Удаляем данные старше месяца

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.PREFIX)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const data: StorageData<any> = JSON.parse(stored);
            const lastModified = new Date(data.metadata.lastModified);
            
            if (lastModified < cutoffDate) {
              localStorage.removeItem(key);
              console.log(`🧹 Удалены старые данные: ${key}`);
            }
          }
        } catch (error) {
          // Игнорируем ошибки при очистке
        }
      }
    }
  }

  /**
   * Получить размер используемого хранилища
   */
  static getStorageSize(): { used: number; percentage: number } {
    let totalSize = 0;
    
    for (const key in localStorage) {
      if (key.startsWith(this.PREFIX)) {
        totalSize += localStorage[key].length + key.length;
      }
    }

    // Примерный лимит localStorage - 5-10MB
    const limitBytes = 5 * 1024 * 1024; // 5MB
    const percentage = (totalSize / limitBytes) * 100;

    return {
      used: totalSize,
      percentage: Math.min(percentage, 100)
    };
  }

  /**
   * Очистить все данные приложения
   */
  static clearAll(): void {
    const keys: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.PREFIX)) {
        keys.push(key);
      }
    }

    keys.forEach(key => localStorage.removeItem(key));
    console.log('🗑️ Все данные приложения очищены');
  }
  /**
   * Очистить старые данные для освобождения места
   */
  private cleanupOldData(): void {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 1); // Удаляем данные старше месяца

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PersistentStorageClass.PREFIX)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const data: StorageData<any> = JSON.parse(stored);
            const lastModified = new Date(data.metadata.lastModified);
            
            if (lastModified < cutoffDate) {
              localStorage.removeItem(key);
              console.log(`🧹 Удалены старые данные: ${key}`);
            }
          }
        } catch (error) {
          // Игнорируем ошибки при очистке
        }
      }
    }
  }
}

// Экспортируем экземпляр для использования в auth системе
export const persistentStorage = new PersistentStorageClass();

// Экспортируем старый класс для обратной совместимости
export class PersistentStorage extends PersistentStorageClass {
  /**
   * Генерировать SQL для миграции данных
   */
  static generateSQL(exportData: Record<string, any>): string {
    let sql = '-- Migration SQL generated from localStorage data\n';
    sql += `-- Generated at: ${new Date().toISOString()}\n`;
    sql += '-- WARNING: Review and test before executing in production!\n\n';
    sql += 'BEGIN;\n\n';

    // Обработка каждого типа данных
    if (exportData.data.equipment) {
      sql += this.generateEquipmentSQL(exportData.data.equipment.data);
    }

    if (exportData.data.components) {
      sql += this.generateComponentsSQL(exportData.data.components.data);
    }

    if (exportData.data.equipmentTypes) {
      sql += this.generateEquipmentTypesSQL(exportData.data.equipmentTypes.data);
    }

    if (exportData.data.nomenclature) {
      sql += this.generateNomenclatureSQL(exportData.data.nomenclature.data);
    }

    if (exportData.data.tanks) {
      sql += this.generateTanksSQL(exportData.data.tanks.data);
    }

    if (exportData.data.currentPrices) {
      sql += this.generatePricesSQL(exportData.data.currentPrices.data);
    }

    if (exportData.data.networks) {
      sql += this.generateNetworksSQL(exportData.data.networks.data);
    }

    if (exportData.data.tradingPoints) {
      sql += this.generateTradingPointsSQL(exportData.data.tradingPoints.data);
    }

    if (exportData.data.pricePackages) {
      sql += this.generatePricePackagesSQL(exportData.data.pricePackages.data);
    }

    if (exportData.data.priceJournal) {
      sql += this.generatePriceJournalSQL(exportData.data.priceJournal.data);
    }

    if (exportData.data.tankEvents) {
      sql += this.generateTankEventsSQL(exportData.data.tankEvents.data);
    }

    if (exportData.data.drainOperations) {
      sql += this.generateDrainOperationsSQL(exportData.data.drainOperations.data);
    }

    if (exportData.data.operations) {
      sql += this.generateOperationsSQL(exportData.data.operations.data);
    }

    if (exportData.data.componentStatuses) {
      sql += this.generateComponentStatusesSQL(exportData.data.componentStatuses.data);
    }

    if (exportData.data.users) {
      sql += this.generateUsersSQL(exportData.data.users.data);
    }

    if (exportData.data.roles) {
      sql += this.generateRolesSQL(exportData.data.roles.data);
    }

    if (exportData.data.commands) {
      sql += this.generateCommandsSQL(exportData.data.commands.data);
    }

    if (exportData.data.workflows) {
      sql += this.generateWorkflowsSQL(exportData.data.workflows.data);
    }

    if (exportData.data.commandExecutions) {
      sql += this.generateCommandExecutionsSQL(exportData.data.commandExecutions.data);
    }

    if (exportData.data.shiftReports) {
      sql += this.generateShiftReportsSQL(exportData.data.shiftReports.data);
    }

    if (exportData.data.chatMessages) {
      sql += this.generateChatMessagesSQL(exportData.data.chatMessages.data);
    }

    if (exportData.data.supportTickets) {
      sql += this.generateSupportTicketsSQL(exportData.data.supportTickets.data);
    }

    if (exportData.data.notificationRules) {
      sql += this.generateNotificationRulesSQL(exportData.data.notificationRules.data);
    }

    if (exportData.data.notifications) {
      sql += this.generateNotificationsSQL(exportData.data.notifications.data);
    }

    sql += '\nCOMMIT;\n';
    return sql;
  }

  private static generateEquipmentSQL(equipment: any[]): string {
    let sql = '-- Equipment data\n';
    
    equipment.forEach(item => {
      sql += `INSERT INTO equipment (id, trading_point_id, template_id, display_name, serial_number, status, params, created_at, updated_at)\n`;
      sql += `VALUES (\n`;
      sql += `  '${item.id}',\n`;
      sql += `  '${item.trading_point_id}',\n`;
      sql += `  '${item.template_id}',\n`;
      sql += `  '${this.escapeString(item.display_name)}',\n`;
      sql += `  ${item.serial_number ? `'${this.escapeString(item.serial_number)}'` : 'NULL'},\n`;
      sql += `  '${item.status}',\n`;
      sql += `  '${JSON.stringify(item.params || {})}',\n`;
      sql += `  '${item.created_at}',\n`;
      sql += `  '${item.updated_at}'\n`;
      sql += `);\n\n`;
    });

    return sql;
  }

  private static generateComponentsSQL(components: any[]): string {
    let sql = '-- Components data\n';
    
    components.forEach(item => {
      sql += `INSERT INTO components (id, equipment_id, template_id, display_name, serial_number, params, status, created_at, updated_at)\n`;
      sql += `VALUES (\n`;
      sql += `  '${item.id}',\n`;
      sql += `  '${item.equipment_id}',\n`;
      sql += `  '${item.template_id}',\n`;
      sql += `  '${this.escapeString(item.display_name)}',\n`;
      sql += `  ${item.serial_number ? `'${this.escapeString(item.serial_number)}'` : 'NULL'},\n`;
      sql += `  '${JSON.stringify(item.params || {})}',\n`;
      sql += `  '${item.status}',\n`;
      sql += `  '${item.created_at}',\n`;
      sql += `  '${item.updated_at}'\n`;
      sql += `);\n\n`;
    });

    return sql;
  }

  private static generateEquipmentTypesSQL(types: any[]): string {
    let sql = '-- Equipment types data\n';
    
    types.forEach(type => {
      sql += `INSERT INTO equipment_templates (id, name, technical_code, system_type, default_params, is_active)\n`;
      sql += `VALUES (\n`;
      sql += `  '${type.id}',\n`;
      sql += `  '${this.escapeString(type.name)}',\n`;
      sql += `  '${this.escapeString(type.code)}',\n`;
      sql += `  '${type.system_type || 'generic'}',\n`;
      sql += `  '${JSON.stringify(type.default_params || {})}',\n`;
      sql += `  ${type.status !== false}\n`;
      sql += `);\n\n`;
    });

    return sql;
  }

  private static generateNomenclatureSQL(nomenclature: any[]): string {
    let sql = '-- Nomenclature data\n';
    
    nomenclature.forEach(item => {
      sql += `INSERT INTO fuel_nomenclature (id, network_id, name, internal_code, description, status, created_at, updated_at)\n`;
      sql += `VALUES (\n`;
      sql += `  '${item.id}',\n`;
      sql += `  '${item.networkId}',\n`;
      sql += `  '${this.escapeString(item.name)}',\n`;
      sql += `  '${this.escapeString(item.internalCode)}',\n`;
      sql += `  '${this.escapeString(item.description || '')}',\n`;
      sql += `  '${item.status}',\n`;
      sql += `  '${item.createdAt}',\n`;
      sql += `  '${item.updatedAt}'\n`;
      sql += `);\n\n`;
      
      // External codes
      if (item.externalCodes && item.externalCodes.length > 0) {
        item.externalCodes.forEach((extCode: any) => {
          sql += `INSERT INTO external_code_mappings (id, nomenclature_id, system_type, external_code, description, created_at, updated_at)\n`;
          sql += `VALUES (\n`;
          sql += `  '${extCode.id}',\n`;
          sql += `  '${item.id}',\n`;
          sql += `  '${extCode.systemType}',\n`;
          sql += `  '${this.escapeString(extCode.externalCode)}',\n`;
          sql += `  '${this.escapeString(extCode.description || '')}',\n`;
          sql += `  '${extCode.createdAt}',\n`;
          sql += `  '${extCode.updatedAt}'\n`;
          sql += `);\n\n`;
        });
      }
    });

    return sql;
  }

  private static generateTanksSQL(tanks: any[]): string {
    let sql = '-- Tanks data\n';
    
    tanks.forEach(tank => {
      sql += `INSERT INTO tanks (id, trading_point_id, name, fuel_type, capacity_liters, current_level_liters, min_level_percent, critical_level_percent, temperature, water_level, density, status, location, installation_date, last_calibration, supplier, thresholds, created_at, updated_at)\n`;
      sql += `VALUES (\n`;
      sql += `  ${tank.id},\n`;
      sql += `  '${tank.trading_point_id}',\n`;
      sql += `  '${this.escapeString(tank.name)}',\n`;
      sql += `  '${this.escapeString(tank.fuelType)}',\n`;
      sql += `  ${tank.capacityLiters},\n`;
      sql += `  ${tank.currentLevelLiters},\n`;
      sql += `  ${tank.minLevelPercent},\n`;
      sql += `  ${tank.criticalLevelPercent},\n`;
      sql += `  ${tank.temperature},\n`;
      sql += `  ${tank.waterLevel},\n`;
      sql += `  ${tank.density},\n`;
      sql += `  '${tank.status}',\n`;
      sql += `  '${this.escapeString(tank.location)}',\n`;
      sql += `  '${tank.installationDate}',\n`;
      sql += `  ${tank.lastCalibration ? `'${tank.lastCalibration}'` : 'NULL'},\n`;
      sql += `  ${tank.supplier ? `'${this.escapeString(tank.supplier)}'` : 'NULL'},\n`;
      sql += `  '${JSON.stringify(tank.thresholds)}',\n`;
      sql += `  '${tank.created_at}',\n`;
      sql += `  '${tank.updated_at}'\n`;
      sql += `);\n\n`;
    });

    return sql;
  }

  private static generatePricesSQL(prices: any[]): string {
    let sql = '-- Current prices data\n';
    
    prices.forEach(price => {
      sql += `INSERT INTO fuel_prices (id, trading_point_id, fuel_type, fuel_code, price_net, vat_rate, price_gross, unit, applied_from, status, package_id, created_at, updated_at)\n`;
      sql += `VALUES (\n`;
      sql += `  '${price.id}',\n`;
      sql += `  '${price.tradingPointId}',\n`;
      sql += `  '${this.escapeString(price.fuelType)}',\n`;
      sql += `  '${price.fuelCode}',\n`;
      sql += `  ${price.priceNet},\n`;
      sql += `  ${price.vatRate},\n`;
      sql += `  ${price.priceGross},\n`;
      sql += `  '${price.unit}',\n`;
      sql += `  '${price.appliedFrom}',\n`;
      sql += `  '${price.status}',\n`;
      sql += `  ${price.packageId ? `'${price.packageId}'` : 'NULL'},\n`;
      sql += `  '${price.created_at}',\n`;
      sql += `  '${price.updated_at}'\n`;
      sql += `);\n\n`;
    });

    return sql;
  }

  private static generatePricePackagesSQL(packages: any[]): string {
    let sql = '-- Price packages data\n';
    
    packages.forEach(pkg => {
      sql += `INSERT INTO price_packages (id, trading_point_id, apply_at, author_name, author_id, status, notes, created_at)\n`;
      sql += `VALUES (\n`;
      sql += `  '${pkg.id}',\n`;
      sql += `  '${pkg.tradingPointId}',\n`;
      sql += `  '${pkg.applyAt}',\n`;
      sql += `  '${this.escapeString(pkg.authorName)}',\n`;
      sql += `  '${pkg.authorId}',\n`;
      sql += `  '${pkg.status}',\n`;
      sql += `  ${pkg.notes ? `'${this.escapeString(pkg.notes)}'` : 'NULL'},\n`;
      sql += `  '${pkg.createdAt}'\n`;
      sql += `);\n\n`;
      
      // Package lines
      if (pkg.lines && pkg.lines.length > 0) {
        pkg.lines.forEach((line: any) => {
          sql += `INSERT INTO price_package_lines (id, package_id, fuel_id, fuel_type, fuel_code, price_net, vat_rate, price_gross, unit, status)\n`;
          sql += `VALUES (\n`;
          sql += `  '${line.id}',\n`;
          sql += `  '${pkg.id}',\n`;
          sql += `  '${line.fuelId}',\n`;
          sql += `  '${this.escapeString(line.fuelType)}',\n`;
          sql += `  '${line.fuelCode}',\n`;
          sql += `  ${line.priceNet},\n`;
          sql += `  ${line.vatRate},\n`;
          sql += `  ${line.priceGross},\n`;
          sql += `  '${line.unit}',\n`;
          sql += `  '${line.status}'\n`;
          sql += `);\n\n`;
        });
      }
    });

    return sql;
  }

  private static generatePriceJournalSQL(journal: any[]): string {
    let sql = '-- Price journal data\n';
    
    journal.forEach(entry => {
      sql += `INSERT INTO price_journal (id, timestamp, fuel_type, fuel_code, price_net, price_gross, vat_rate, source, package_id, status, author_name, author_id, trading_point_id, notes)\n`;
      sql += `VALUES (\n`;
      sql += `  '${entry.id}',\n`;
      sql += `  '${entry.timestamp}',\n`;
      sql += `  '${this.escapeString(entry.fuelType)}',\n`;
      sql += `  '${entry.fuelCode}',\n`;
      sql += `  ${entry.priceNet},\n`;
      sql += `  ${entry.priceGross},\n`;
      sql += `  ${entry.vatRate},\n`;
      sql += `  '${entry.source}',\n`;
      sql += `  ${entry.packageId ? `'${entry.packageId}'` : 'NULL'},\n`;
      sql += `  '${entry.status}',\n`;
      sql += `  '${this.escapeString(entry.authorName)}',\n`;
      sql += `  '${entry.authorId}',\n`;
      sql += `  '${entry.tradingPointId}',\n`;
      sql += `  ${entry.notes ? `'${this.escapeString(entry.notes)}'` : 'NULL'}\n`;
      sql += `);\n\n`;
    });

    return sql;
  }

  private static generateTankEventsSQL(events: any[]): string {
    let sql = '-- Tank events data\n';
    
    events.forEach(event => {
      sql += `INSERT INTO tank_events (id, tank_id, event_type, title, description, timestamp, operator_name, severity, metadata)\n`;
      sql += `VALUES (\n`;
      sql += `  '${event.id}',\n`;
      sql += `  ${event.tankId},\n`;
      sql += `  '${event.type}',\n`;
      sql += `  '${this.escapeString(event.title)}',\n`;
      sql += `  '${this.escapeString(event.description)}',\n`;
      sql += `  '${event.timestamp}',\n`;
      sql += `  '${this.escapeString(event.operatorName)}',\n`;
      sql += `  '${event.severity}',\n`;
      sql += `  ${event.metadata ? `'${JSON.stringify(event.metadata)}'` : 'NULL'}\n`;
      sql += `);\n\n`;
    });

    return sql;
  }

  private static generateDrainOperationsSQL(drains: any[]): string {
    let sql = '-- Drain operations data\n';
    
    drains.forEach(drain => {
      sql += `INSERT INTO drain_operations (id, tank_id, amount, unit, timestamp, operator_name, vehicle_number, driver_name, driver_phone, status, notes)\n`;
      sql += `VALUES (\n`;
      sql += `  '${drain.id}',\n`;
      sql += `  ${drain.tankId},\n`;
      sql += `  ${drain.amount},\n`;
      sql += `  '${drain.unit}',\n`;
      sql += `  '${drain.timestamp}',\n`;
      sql += `  '${this.escapeString(drain.operatorName)}',\n`;
      sql += `  ${drain.vehicleNumber ? `'${this.escapeString(drain.vehicleNumber)}'` : 'NULL'},\n`;
      sql += `  ${drain.driverName ? `'${this.escapeString(drain.driverName)}'` : 'NULL'},\n`;
      sql += `  ${drain.driverPhone ? `'${drain.driverPhone}'` : 'NULL'},\n`;
      sql += `  '${drain.status}',\n`;
      sql += `  ${drain.notes ? `'${this.escapeString(drain.notes)}'` : 'NULL'}\n`;
      sql += `);\n\n`;
    });

    return sql;
  }

  private static generateNetworksSQL(networks: any[]): string {
    let sql = '-- Networks data\n';
    
    networks.forEach(network => {
      sql += `INSERT INTO networks (id, name, description, type, points_count, created_at, updated_at)\n`;
      sql += `VALUES (\n`;
      sql += `  '${network.id}',\n`;
      sql += `  '${this.escapeString(network.name)}',\n`;
      sql += `  '${this.escapeString(network.description)}',\n`;
      sql += `  '${network.type}',\n`;
      sql += `  ${network.pointsCount || 0},\n`;
      sql += `  '${network.created_at || new Date().toISOString()}',\n`;
      sql += `  '${network.updated_at || new Date().toISOString()}'\n`;
      sql += `);\n\n`;
    });

    return sql;
  }

  private static generateTradingPointsSQL(tradingPoints: any[]): string {
    let sql = '-- Trading points data\n';
    
    tradingPoints.forEach(point => {
      sql += `INSERT INTO trading_points (id, network_id, name, description, latitude, longitude, region, city, address, phone, email, website, is_blocked, schedule, services, external_codes, created_at, updated_at)\n`;
      sql += `VALUES (\n`;
      sql += `  '${point.id}',\n`;
      sql += `  '${point.networkId}',\n`;
      sql += `  '${this.escapeString(point.name)}',\n`;
      sql += `  ${point.description ? `'${this.escapeString(point.description)}'` : 'NULL'},\n`;
      sql += `  ${point.geolocation?.latitude || 'NULL'},\n`;
      sql += `  ${point.geolocation?.longitude || 'NULL'},\n`;
      sql += `  ${point.geolocation?.region ? `'${this.escapeString(point.geolocation.region)}'` : 'NULL'},\n`;
      sql += `  ${point.geolocation?.city ? `'${this.escapeString(point.geolocation.city)}'` : 'NULL'},\n`;
      sql += `  ${point.geolocation?.address ? `'${this.escapeString(point.geolocation.address)}'` : 'NULL'},\n`;
      sql += `  ${point.phone ? `'${point.phone}'` : 'NULL'},\n`;
      sql += `  ${point.email ? `'${point.email}'` : 'NULL'},\n`;
      sql += `  ${point.website ? `'${point.website}'` : 'NULL'},\n`;
      sql += `  ${point.isBlocked || false},\n`;
      sql += `  ${point.schedule ? `'${JSON.stringify(point.schedule)}'` : 'NULL'},\n`;
      sql += `  ${point.services ? `'${JSON.stringify(point.services)}'` : 'NULL'},\n`;
      sql += `  ${point.externalCodes && point.externalCodes.length > 0 ? `'${JSON.stringify(point.externalCodes)}'` : 'NULL'},\n`;
      sql += `  '${point.createdAt || new Date().toISOString()}',\n`;
      sql += `  '${point.updatedAt || new Date().toISOString()}'\n`;
      sql += `);\n\n`;
    });

    return sql;
  }

  private static generateOperationsSQL(operations: any[]): string {
    let sql = '-- Operations data\n';
    
    operations.forEach(operation => {
      sql += `INSERT INTO operations (id, operation_type, status, start_time, end_time, duration, trading_point_id, trading_point_name, device_id, transaction_id, fuel_type, quantity, price, total_cost, payment_method, details, progress, last_updated, operator_name, customer_id, vehicle_number, metadata, created_at, updated_at)\n`;
      sql += `VALUES (\n`;
      sql += `  '${operation.id}',\n`;
      sql += `  '${operation.operationType}',\n`;
      sql += `  '${operation.status}',\n`;
      sql += `  '${operation.startTime}',\n`;
      sql += `  ${operation.endTime ? `'${operation.endTime}'` : 'NULL'},\n`;
      sql += `  ${operation.duration || 'NULL'},\n`;
      sql += `  ${operation.tradingPointId ? `'${operation.tradingPointId}'` : 'NULL'},\n`;
      sql += `  ${operation.tradingPointName ? `'${this.escapeString(operation.tradingPointName)}'` : 'NULL'},\n`;
      sql += `  ${operation.deviceId ? `'${operation.deviceId}'` : 'NULL'},\n`;
      sql += `  ${operation.transactionId ? `'${operation.transactionId}'` : 'NULL'},\n`;
      sql += `  ${operation.fuelType ? `'${operation.fuelType}'` : 'NULL'},\n`;
      sql += `  ${operation.quantity || 'NULL'},\n`;
      sql += `  ${operation.price || 'NULL'},\n`;
      sql += `  ${operation.totalCost || 'NULL'},\n`;
      sql += `  ${operation.paymentMethod ? `'${operation.paymentMethod}'` : 'NULL'},\n`;
      sql += `  '${this.escapeString(operation.details)}',\n`;
      sql += `  ${operation.progress || 'NULL'},\n`;
      sql += `  '${operation.lastUpdated}',\n`;
      sql += `  ${operation.operatorName ? `'${this.escapeString(operation.operatorName)}'` : 'NULL'},\n`;
      sql += `  ${operation.customerId ? `'${operation.customerId}'` : 'NULL'},\n`;
      sql += `  ${operation.vehicleNumber ? `'${operation.vehicleNumber}'` : 'NULL'},\n`;
      sql += `  ${operation.metadata ? `'${JSON.stringify(operation.metadata)}'` : 'NULL'},\n`;
      sql += `  '${operation.createdAt || new Date().toISOString()}',\n`;
      sql += `  '${operation.updatedAt || new Date().toISOString()}'\n`;
      sql += `);\n\n`;
    });

    return sql;
  }

  private static generateComponentStatusesSQL(statuses: any[]): string {
    let sql = '-- Component statuses data\n';
    
    statuses.forEach(status => {
      sql += `INSERT INTO component_statuses (id, component_id, equipment_id, status, status_message, last_online, last_offline, uptime, downtime, error_count, last_error, last_error_time, response_time, signal_strength, temperature, voltage, metadata, created_at, updated_at)\n`;
      sql += `VALUES (\n`;
      sql += `  '${status.id}',\n`;
      sql += `  '${status.componentId}',\n`;
      sql += `  ${status.equipmentId ? `'${status.equipmentId}'` : 'NULL'},\n`;
      sql += `  '${status.status}',\n`;
      sql += `  ${status.statusMessage ? `'${this.escapeString(status.statusMessage)}'` : 'NULL'},\n`;
      sql += `  '${status.lastOnline}',\n`;
      sql += `  ${status.lastOffline ? `'${status.lastOffline}'` : 'NULL'},\n`;
      sql += `  ${status.uptime || 0},\n`;
      sql += `  ${status.downtime || 0},\n`;
      sql += `  ${status.errorCount || 0},\n`;
      sql += `  ${status.lastError ? `'${this.escapeString(status.lastError)}'` : 'NULL'},\n`;
      sql += `  ${status.lastErrorTime ? `'${status.lastErrorTime}'` : 'NULL'},\n`;
      sql += `  ${status.responseTime || 'NULL'},\n`;
      sql += `  ${status.signalStrength || 'NULL'},\n`;
      sql += `  ${status.temperature || 'NULL'},\n`;
      sql += `  ${status.voltage || 'NULL'},\n`;
      sql += `  ${status.metadata ? `'${JSON.stringify(status.metadata)}'` : 'NULL'},\n`;
      sql += `  '${status.createdAt || new Date().toISOString()}',\n`;
      sql += `  '${status.updatedAt || new Date().toISOString()}'\n`;
      sql += `);\n\n`;
    });

    return sql;
  }

  private static generateUsersSQL(users: any[]): string {
    let sql = '-- Users data\n';
    
    users.forEach(user => {
      sql += `INSERT INTO users (id, email, first_name, last_name, phone, status, last_login, permissions, created_at, updated_at)\n`;
      sql += `VALUES (\n`;
      sql += `  ${user.id},\n`;
      sql += `  '${user.email}',\n`;
      sql += `  '${this.escapeString(user.firstName)}',\n`;
      sql += `  '${this.escapeString(user.lastName)}',\n`;
      sql += `  ${user.phone ? `'${user.phone}'` : 'NULL'},\n`;
      sql += `  '${user.status}',\n`;
      sql += `  ${user.lastLogin ? `'${user.lastLogin}'` : 'NULL'},\n`;
      sql += `  '${JSON.stringify(user.permissions)}',\n`;
      sql += `  '${user.createdAt || new Date().toISOString()}',\n`;
      sql += `  '${user.updatedAt || new Date().toISOString()}'\n`;
      sql += `);\n\n`;
    });

    // User roles
    sql += '-- User roles data\n';
    users.forEach(user => {
      if (user.roles && user.roles.length > 0) {
        user.roles.forEach(role => {
          sql += `INSERT INTO user_roles (user_id, role_id, role_name, role_code, scope, scope_value, permissions)\n`;
          sql += `VALUES (\n`;
          sql += `  ${user.id},\n`;
          sql += `  ${role.roleId},\n`;
          sql += `  '${this.escapeString(role.roleName)}',\n`;
          sql += `  '${role.roleCode}',\n`;
          sql += `  '${role.scope}',\n`;
          sql += `  ${role.scopeValue ? `'${role.scopeValue}'` : 'NULL'},\n`;
          sql += `  '${JSON.stringify(role.permissions)}'\n`;
          sql += `);\n\n`;
        });
      }
    });

    return sql;
  }

  private static generateRolesSQL(roles: any[]): string {
    let sql = '-- Roles data\n';
    
    roles.forEach(role => {
      sql += `INSERT INTO roles (id, name, code, scope, description, is_system, permissions, created_at, updated_at)\n`;
      sql += `VALUES (\n`;
      sql += `  ${role.id},\n`;
      sql += `  '${this.escapeString(role.name)}',\n`;
      sql += `  '${role.code}',\n`;
      sql += `  '${role.scope}',\n`;
      sql += `  '${this.escapeString(role.description)}',\n`;
      sql += `  ${role.isSystem},\n`;
      sql += `  '${JSON.stringify(role.permissions)}',\n`;
      sql += `  '${role.createdAt || new Date().toISOString()}',\n`;
      sql += `  '${role.updatedAt || new Date().toISOString()}'\n`;
      sql += `);\n\n`;
    });

    return sql;
  }

  private static generateCommandsSQL(commands: any[]): string {
    let sql = '-- Commands data\n';
    
    commands.forEach(command => {
      sql += `INSERT INTO commands (id, name, code, description, target_type, is_active, adapter, endpoint, http_method, http_headers, timeout, json_schema, json_template, created_at, updated_at)\n`;
      sql += `VALUES (\n`;
      sql += `  '${command.id}',\n`;
      sql += `  '${this.escapeString(command.name)}',\n`;
      sql += `  '${command.code}',\n`;
      sql += `  ${command.description ? `'${this.escapeString(command.description)}'` : 'NULL'},\n`;
      sql += `  '${command.targetType}',\n`;
      sql += `  ${command.isActive},\n`;
      sql += `  '${command.adapter}',\n`;
      sql += `  '${command.endpoint}',\n`;
      sql += `  ${command.httpMethod ? `'${command.httpMethod}'` : 'NULL'},\n`;
      sql += `  ${command.httpHeaders ? `'${this.escapeString(command.httpHeaders)}'` : 'NULL'},\n`;
      sql += `  ${command.timeout || 'NULL'},\n`;
      sql += `  ${command.jsonSchema ? `'${this.escapeString(command.jsonSchema)}'` : 'NULL'},\n`;
      sql += `  ${command.jsonTemplate ? `'${this.escapeString(command.jsonTemplate)}'` : 'NULL'},\n`;
      sql += `  '${command.createdAt || new Date().toISOString()}',\n`;
      sql += `  '${command.updatedAt || new Date().toISOString()}'\n`;
      sql += `);\n\n`;
    });

    return sql;
  }

  private static generateWorkflowsSQL(workflows: any[]): string {
    let sql = '-- Workflows data\n';
    
    workflows.forEach(workflow => {
      sql += `INSERT INTO workflows (id, name, description, is_active, trigger_type, schedule, event_trigger, last_run_date, last_run_status, last_run_message, last_run_duration, created_at, updated_at)\n`;
      sql += `VALUES (\n`;
      sql += `  '${workflow.id}',\n`;
      sql += `  '${this.escapeString(workflow.name)}',\n`;
      sql += `  ${workflow.description ? `'${this.escapeString(workflow.description)}'` : 'NULL'},\n`;
      sql += `  ${workflow.isActive},\n`;
      sql += `  '${workflow.triggerType}',\n`;
      sql += `  ${workflow.schedule ? `'${workflow.schedule}'` : 'NULL'},\n`;
      sql += `  ${workflow.eventTrigger ? `'${workflow.eventTrigger}'` : 'NULL'},\n`;
      sql += `  ${workflow.lastRun?.date ? `'${workflow.lastRun.date}'` : 'NULL'},\n`;
      sql += `  ${workflow.lastRun?.status ? `'${workflow.lastRun.status}'` : 'NULL'},\n`;
      sql += `  ${workflow.lastRun?.message ? `'${this.escapeString(workflow.lastRun.message)}'` : 'NULL'},\n`;
      sql += `  ${workflow.lastRun?.duration || 'NULL'},\n`;
      sql += `  '${workflow.createdAt || new Date().toISOString()}',\n`;
      sql += `  '${workflow.updatedAt || new Date().toISOString()}'\n`;
      sql += `);\n\n`;
    });

    // Workflow steps
    sql += '-- Workflow steps data\n';
    workflows.forEach(workflow => {
      if (workflow.steps && workflow.steps.length > 0) {
        workflow.steps.forEach(step => {
          sql += `INSERT INTO workflow_steps (id, workflow_id, type, name, command_id, condition_expression, delay_ms, notification_text, step_order)\n`;
          sql += `VALUES (\n`;
          sql += `  '${step.id}',\n`;
          sql += `  '${workflow.id}',\n`;
          sql += `  '${step.type}',\n`;
          sql += `  '${this.escapeString(step.name)}',\n`;
          sql += `  ${step.commandId ? `'${step.commandId}'` : 'NULL'},\n`;
          sql += `  ${step.condition ? `'${this.escapeString(step.condition)}'` : 'NULL'},\n`;
          sql += `  ${step.delayMs || 'NULL'},\n`;
          sql += `  ${step.notificationText ? `'${this.escapeString(step.notificationText)}'` : 'NULL'},\n`;
          sql += `  ${step.order}\n`;
          sql += `);\n\n`;
        });
      }
    });

    return sql;
  }

  private static generateCommandExecutionsSQL(executions: any[]): string {
    let sql = '-- Command executions data\n';
    
    executions.forEach(execution => {
      sql += `INSERT INTO command_executions (id, command_id, workflow_id, target_id, status, start_time, end_time, duration, request, response, error, executed_by, metadata, created_at)\n`;
      sql += `VALUES (\n`;
      sql += `  '${execution.id}',\n`;
      sql += `  '${execution.commandId}',\n`;
      sql += `  ${execution.workflowId ? `'${execution.workflowId}'` : 'NULL'},\n`;
      sql += `  ${execution.targetId ? `'${execution.targetId}'` : 'NULL'},\n`;
      sql += `  '${execution.status}',\n`;
      sql += `  '${execution.startTime}',\n`;
      sql += `  ${execution.endTime ? `'${execution.endTime}'` : 'NULL'},\n`;
      sql += `  ${execution.duration || 'NULL'},\n`;
      sql += `  ${execution.request ? `'${this.escapeString(execution.request)}'` : 'NULL'},\n`;
      sql += `  ${execution.response ? `'${this.escapeString(execution.response)}'` : 'NULL'},\n`;
      sql += `  ${execution.error ? `'${this.escapeString(execution.error)}'` : 'NULL'},\n`;
      sql += `  '${execution.executedBy}',\n`;
      sql += `  ${execution.metadata ? `'${JSON.stringify(execution.metadata)}'` : 'NULL'},\n`;
      sql += `  '${execution.createdAt || new Date().toISOString()}'\n`;
      sql += `);\n\n`;
    });

    return sql;
  }

  private static generateShiftReportsSQL(shiftReports: any[]): string {
    let sql = '-- Shift reports data\n';
    
    shiftReports.forEach(shift => {
      sql += `INSERT INTO shift_reports (id, shift_number, opened_at, closed_at, operator, operator_id, trading_point_id, trading_point_name, status, total_revenue, total_volume, receipt_count, payment_cash, payment_cards, payment_sbp, payment_fuel_cards, payment_other, metadata, created_at, updated_at)\n`;
      sql += `VALUES (\n`;
      sql += `  '${shift.id}',\n`;
      sql += `  ${shift.shiftNumber},\n`;
      sql += `  '${shift.openedAt}',\n`;
      sql += `  ${shift.closedAt ? `'${shift.closedAt}'` : 'NULL'},\n`;
      sql += `  '${this.escapeString(shift.operator)}',\n`;
      sql += `  '${shift.operatorId}',\n`;
      sql += `  '${shift.tradingPointId}',\n`;
      sql += `  '${this.escapeString(shift.tradingPointName)}',\n`;
      sql += `  '${shift.status}',\n`;
      sql += `  ${shift.totalRevenue},\n`;
      sql += `  ${shift.totalVolume},\n`;
      sql += `  ${shift.receiptCount},\n`;
      sql += `  ${shift.payments?.cash || 0},\n`;
      sql += `  ${shift.payments?.cards || 0},\n`;
      sql += `  ${shift.payments?.sbp || 0},\n`;
      sql += `  ${shift.payments?.fuelCards || 0},\n`;
      sql += `  ${shift.payments?.other || 0},\n`;
      sql += `  ${shift.metadata ? `'${JSON.stringify(shift.metadata)}'` : 'NULL'},\n`;
      sql += `  '${shift.createdAt || new Date().toISOString()}',\n`;
      sql += `  '${shift.updatedAt || new Date().toISOString()}'\n`;
      sql += `);\n\n`;
    });

    // Fuel positions
    sql += '-- Shift fuel positions data\n';
    shiftReports.forEach(shift => {
      if (shift.fuelPositions && shift.fuelPositions.length > 0) {
        shift.fuelPositions.forEach(fp => {
          sql += `INSERT INTO shift_fuel_positions (id, shift_id, fuel_type, fuel_code, tank_number, start_balance, received, dispensed, calculated_balance, actual_balance, difference, meter_start, meter_end, level_mm, water_mm, temperature, allowed_error_percent, has_excess_error, revenue, receipt_count)\n`;
          sql += `VALUES (\n`;
          sql += `  '${fp.id}',\n`;
          sql += `  '${shift.id}',\n`;
          sql += `  '${fp.fuelType}',\n`;
          sql += `  '${fp.fuelCode}',\n`;
          sql += `  '${fp.tankNumber}',\n`;
          sql += `  ${fp.startBalance},\n`;
          sql += `  ${fp.received},\n`;
          sql += `  ${fp.dispensed},\n`;
          sql += `  ${fp.calculatedBalance},\n`;
          sql += `  ${fp.actualBalance},\n`;
          sql += `  ${fp.difference},\n`;
          sql += `  ${fp.meterStart},\n`;
          sql += `  ${fp.meterEnd},\n`;
          sql += `  ${fp.levelMm},\n`;
          sql += `  ${fp.waterMm},\n`;
          sql += `  ${fp.temperature},\n`;
          sql += `  ${fp.allowedErrorPercent},\n`;
          sql += `  ${fp.hasExcessError},\n`;
          sql += `  ${fp.revenue},\n`;
          sql += `  ${fp.receiptCount}\n`;
          sql += `);\n\n`;
        });
      }
    });

    // Shift documents
    sql += '-- Shift documents data\n';
    shiftReports.forEach(shift => {
      if (shift.documents && shift.documents.length > 0) {
        shift.documents.forEach(doc => {
          sql += `INSERT INTO shift_documents (id, shift_id, type, name, created_at, file_size, status, file_path, description)\n`;
          sql += `VALUES (\n`;
          sql += `  '${doc.id}',\n`;
          sql += `  '${shift.id}',\n`;
          sql += `  '${doc.type}',\n`;
          sql += `  '${this.escapeString(doc.name)}',\n`;
          sql += `  '${doc.createdAt}',\n`;
          sql += `  ${doc.fileSize || 'NULL'},\n`;
          sql += `  '${doc.status}',\n`;
          sql += `  ${doc.filePath ? `'${doc.filePath}'` : 'NULL'},\n`;
          sql += `  ${doc.description ? `'${this.escapeString(doc.description)}'` : 'NULL'}\n`;
          sql += `);\n\n`;
        });
      }
    });

    return sql;
  }

  private static generateChatMessagesSQL(messages: any[]): string {
    let sql = '-- Chat messages data\n';
    
    messages.forEach(message => {
      sql += `INSERT INTO chat_messages (id, author_id, author_name, author_avatar, text, timestamp, is_current_user, message_type, reply_to_id, attachments, metadata, created_at, updated_at)\n`;
      sql += `VALUES (\n`;
      sql += `  '${message.id}',\n`;
      sql += `  '${message.authorId}',\n`;
      sql += `  '${this.escapeString(message.authorName)}',\n`;
      sql += `  ${message.authorAvatar ? `'${message.authorAvatar}'` : 'NULL'},\n`;
      sql += `  '${this.escapeString(message.text)}',\n`;
      sql += `  '${message.timestamp}',\n`;
      sql += `  ${message.isCurrentUser},\n`;
      sql += `  '${message.messageType}',\n`;
      sql += `  ${message.replyToId ? `'${message.replyToId}'` : 'NULL'},\n`;
      sql += `  ${message.attachments && message.attachments.length > 0 ? `'${JSON.stringify(message.attachments)}'` : 'NULL'},\n`;
      sql += `  ${message.metadata ? `'${JSON.stringify(message.metadata)}'` : 'NULL'},\n`;
      sql += `  '${message.createdAt || new Date().toISOString()}',\n`;
      sql += `  '${message.updatedAt || new Date().toISOString()}'\n`;
      sql += `);\n\n`;
    });

    return sql;
  }

  private static generateSupportTicketsSQL(tickets: any[]): string {
    let sql = '-- Support tickets data\n';
    
    tickets.forEach(ticket => {
      sql += `INSERT INTO support_tickets (id, title, description, priority, status, category, tags, created_by, created_by_name, assigned_to, assigned_to_name, created_at, updated_at, resolved_at, closed_at, response_time, resolution_time, satisfaction, metadata)\n`;
      sql += `VALUES (\n`;
      sql += `  '${ticket.id}',\n`;
      sql += `  '${this.escapeString(ticket.title)}',\n`;
      sql += `  '${this.escapeString(ticket.description)}',\n`;
      sql += `  '${ticket.priority}',\n`;
      sql += `  '${ticket.status}',\n`;
      sql += `  ${ticket.category ? `'${ticket.category}'` : 'NULL'},\n`;
      sql += `  ${ticket.tags && ticket.tags.length > 0 ? `'${JSON.stringify(ticket.tags)}'` : 'NULL'},\n`;
      sql += `  '${ticket.createdBy}',\n`;
      sql += `  '${this.escapeString(ticket.createdByName)}',\n`;
      sql += `  ${ticket.assignedTo ? `'${ticket.assignedTo}'` : 'NULL'},\n`;
      sql += `  ${ticket.assignedToName ? `'${this.escapeString(ticket.assignedToName)}'` : 'NULL'},\n`;
      sql += `  '${ticket.createdAt || new Date().toISOString()}',\n`;
      sql += `  '${ticket.updatedAt || new Date().toISOString()}',\n`;
      sql += `  ${ticket.resolvedAt ? `'${ticket.resolvedAt}'` : 'NULL'},\n`;
      sql += `  ${ticket.closedAt ? `'${ticket.closedAt}'` : 'NULL'},\n`;
      sql += `  ${ticket.responseTime || 'NULL'},\n`;
      sql += `  ${ticket.resolutionTime || 'NULL'},\n`;
      sql += `  ${ticket.satisfaction || 'NULL'},\n`;
      sql += `  ${ticket.metadata ? `'${JSON.stringify(ticket.metadata)}'` : 'NULL'}\n`;
      sql += `);\n\n`;
    });

    // Ticket messages
    sql += '-- Ticket messages data\n';
    tickets.forEach(ticket => {
      if (ticket.messages && ticket.messages.length > 0) {
        ticket.messages.forEach(message => {
          sql += `INSERT INTO ticket_messages (id, ticket_id, author_id, author_name, author_role, text, timestamp, attachments, is_internal, metadata, created_at)\n`;
          sql += `VALUES (\n`;
          sql += `  '${message.id}',\n`;
          sql += `  '${ticket.id}',\n`;
          sql += `  '${message.authorId}',\n`;
          sql += `  '${this.escapeString(message.authorName)}',\n`;
          sql += `  '${message.authorRole}',\n`;
          sql += `  '${this.escapeString(message.text)}',\n`;
          sql += `  '${message.timestamp}',\n`;
          sql += `  ${message.attachments && message.attachments.length > 0 ? `'${JSON.stringify(message.attachments)}'` : 'NULL'},\n`;
          sql += `  ${message.isInternal || false},\n`;
          sql += `  ${message.metadata ? `'${JSON.stringify(message.metadata)}'` : 'NULL'},\n`;
          sql += `  '${message.createdAt || new Date().toISOString()}'\n`;
          sql += `);\n\n`;
        });
      }
    });

    return sql;
  }

  private static generateNotificationRulesSQL(rules: any[]): string {
    let sql = '-- Notification rules data\n';
    
    rules.forEach(rule => {
      sql += `INSERT INTO notification_rules (id, name, description, is_active, priority, trigger_type, conditions, channels, recipients, message_template, cooldown_minutes, created_by, created_by_name, created_at, updated_at, last_triggered_date, last_triggered_status)\n`;
      sql += `VALUES (\n`;
      sql += `  '${rule.id}',\n`;
      sql += `  '${this.escapeString(rule.name)}',\n`;
      sql += `  ${rule.description ? `'${this.escapeString(rule.description)}'` : 'NULL'},\n`;
      sql += `  ${rule.isActive},\n`;
      sql += `  '${rule.priority}',\n`;
      sql += `  '${rule.trigger}',\n`;
      sql += `  '${JSON.stringify(rule.conditions)}',\n`;
      sql += `  '${JSON.stringify(rule.channels)}',\n`;
      sql += `  '${JSON.stringify(rule.recipients)}',\n`;
      sql += `  '${this.escapeString(rule.messageTemplate)}',\n`;
      sql += `  ${rule.cooldownMinutes || 'NULL'},\n`;
      sql += `  '${rule.createdBy}',\n`;
      sql += `  '${this.escapeString(rule.createdByName)}',\n`;
      sql += `  '${rule.createdAt || new Date().toISOString()}',\n`;
      sql += `  '${rule.updatedAt || new Date().toISOString()}',\n`;
      sql += `  ${rule.lastTriggered?.date ? `'${rule.lastTriggered.date}'` : 'NULL'},\n`;
      sql += `  ${rule.lastTriggered?.status ? `'${rule.lastTriggered.status}'` : 'NULL'}\n`;
      sql += `);\n\n`;
    });

    return sql;
  }

  private static generateNotificationsSQL(notifications: any[]): string {
    let sql = '-- Notifications data\n';
    
    notifications.forEach(notification => {
      sql += `INSERT INTO notifications (id, rule_id, title, message, type, priority, status, recipient_id, recipient_name, channel, trigger_data, sent_at, read_at, archived_at, metadata, created_at, updated_at)\n`;
      sql += `VALUES (\n`;
      sql += `  '${notification.id}',\n`;
      sql += `  ${notification.ruleId ? `'${notification.ruleId}'` : 'NULL'},\n`;
      sql += `  '${this.escapeString(notification.title)}',\n`;
      sql += `  '${this.escapeString(notification.message)}',\n`;
      sql += `  '${notification.type}',\n`;
      sql += `  '${notification.priority}',\n`;
      sql += `  '${notification.status}',\n`;
      sql += `  '${notification.recipientId}',\n`;
      sql += `  '${this.escapeString(notification.recipientName)}',\n`;
      sql += `  '${notification.channel}',\n`;
      sql += `  ${notification.triggerData ? `'${JSON.stringify(notification.triggerData)}'` : 'NULL'},\n`;
      sql += `  ${notification.sentAt ? `'${notification.sentAt}'` : 'NULL'},\n`;
      sql += `  ${notification.readAt ? `'${notification.readAt}'` : 'NULL'},\n`;
      sql += `  ${notification.archivedAt ? `'${notification.archivedAt}'` : 'NULL'},\n`;
      sql += `  ${notification.metadata ? `'${JSON.stringify(notification.metadata)}'` : 'NULL'},\n`;
      sql += `  '${notification.createdAt || new Date().toISOString()}',\n`;
      sql += `  '${notification.updatedAt || new Date().toISOString()}'\n`;
      sql += `);\n\n`;
    });

    return sql;
  }

  private static escapeString(str: string): string {
    return str.replace(/'/g, "''");
  }

  /**
   * Экспортировать SQL в файл
   */
  static exportSQLToFile(exportData: Record<string, any>): void {
    const sql = this.generateSQL(exportData);
    const blob = new Blob([sql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `tradeframe_migration_${new Date().toISOString().split('T')[0]}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('📄 SQL миграция экспортирована в файл');
  }
}