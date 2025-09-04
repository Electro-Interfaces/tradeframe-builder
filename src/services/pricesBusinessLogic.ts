/**
 * Бизнес-логика ценообразования и расчетов
 * Извлечена из pricesService.ts для упрощения миграции на реальную БД
 */

export interface PriceCalculation {
  priceNet: number;  // Цена без НДС в копейках
  vatRate: number;   // Процент НДС
  priceGross: number; // Цена с НДС в копейках
}

export interface PriceValidation {
  isValid: boolean;
  errors: string[];
}

/**
 * Класс с бизнес-логикой ценообразования
 */
export class PricesBusinessLogic {
  
  /**
   * Рассчитывает цену с НДС
   * @param priceNet - Цена без НДС в копейках
   * @param vatRate - Процент НДС (по умолчанию 20%)
   * @returns Цена с НДС в копейках
   */
  static calculateGrossPrice(priceNet: number, vatRate: number = 20): number {
    return Math.round(priceNet * (1 + vatRate / 100));
  }

  /**
   * Рассчитывает цену без НДС из цены с НДС
   * @param priceGross - Цена с НДС в копейках
   * @param vatRate - Процент НДС (по умолчанию 20%)
   * @returns Цена без НДС в копейках
   */
  static calculateNetPrice(priceGross: number, vatRate: number = 20): number {
    return Math.round(priceGross / (1 + vatRate / 100));
  }

  /**
   * Рассчитывает сумму НДС
   * @param priceNet - Цена без НДС в копейках
   * @param vatRate - Процент НДС
   * @returns Сумма НДС в копейках
   */
  static calculateVatAmount(priceNet: number, vatRate: number = 20): number {
    return Math.round(priceNet * (vatRate / 100));
  }

  /**
   * Конвертирует цену из рублей в копейки
   * @param priceInRubles - Цена в рублях
   * @returns Цена в копейках
   */
  static rublestoKopecks(priceInRubles: number): number {
    return Math.round(priceInRubles * 100);
  }

  /**
   * Конвертирует цену из копеек в рубли
   * @param priceInKopecks - Цена в копейках
   * @returns Цена в рублях
   */
  static kopecksToRubles(priceInKopecks: number): number {
    return priceInKopecks / 100;
  }

  /**
   * Форматирует цену для отображения
   * @param priceInKopecks - Цена в копейках
   * @param includeVat - Включить ли информацию о НДС
   * @returns Отформатированная строка
   */
  static formatPrice(priceInKopecks: number, includeVat: boolean = false): string {
    const rubles = this.kopecksToRubles(priceInKopecks);
    const formatted = `${rubles.toFixed(2)} ₽`;
    return includeVat ? `${formatted} (вкл. НДС)` : formatted;
  }

  /**
   * Валидирует данные цены
   */
  static validatePrice(price: {
    priceNet?: number;
    priceGross?: number;
    vatRate?: number;
  }): PriceValidation {
    const errors: string[] = [];

    // Проверка обязательных полей
    if (price.priceNet === undefined && price.priceGross === undefined) {
      errors.push('Необходимо указать либо цену без НДС, либо цену с НДС');
    }

    // Проверка на отрицательные значения
    if (price.priceNet !== undefined && price.priceNet < 0) {
      errors.push('Цена без НДС не может быть отрицательной');
    }

    if (price.priceGross !== undefined && price.priceGross < 0) {
      errors.push('Цена с НДС не может быть отрицательной');
    }

    // Проверка НДС
    if (price.vatRate !== undefined) {
      if (price.vatRate < 0) {
        errors.push('Ставка НДС не может быть отрицательной');
      }
      if (price.vatRate > 100) {
        errors.push('Ставка НДС не может быть больше 100%');
      }
    }

    // Проверка согласованности цен с НДС
    if (price.priceNet !== undefined && price.priceGross !== undefined && price.vatRate !== undefined) {
      const calculatedGross = this.calculateGrossPrice(price.priceNet, price.vatRate);
      const tolerance = 1; // 1 копейка погрешность из-за округления
      
      if (Math.abs(calculatedGross - price.priceGross) > tolerance) {
        errors.push('Цены с НДС и без НДС не согласованы с указанной ставкой НДС');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Применяет скидку к цене
   * @param priceInKopecks - Исходная цена в копейках
   * @param discountPercent - Процент скидки
   * @returns Цена со скидкой в копейках
   */
  static applyDiscount(priceInKopecks: number, discountPercent: number): number {
    if (discountPercent < 0 || discountPercent > 100) {
      throw new Error('Процент скидки должен быть от 0 до 100');
    }
    return Math.round(priceInKopecks * (1 - discountPercent / 100));
  }

  /**
   * Рассчитывает маржу
   * @param costPrice - Себестоимость в копейках
   * @param sellingPrice - Цена продажи в копейках
   * @returns Маржа в процентах
   */
  static calculateMargin(costPrice: number, sellingPrice: number): number {
    if (sellingPrice === 0) return 0;
    const margin = ((sellingPrice - costPrice) / sellingPrice) * 100;
    return Math.round(margin * 100) / 100; // Округление до 2 знаков
  }

  /**
   * Рассчитывает наценку
   * @param costPrice - Себестоимость в копейках
   * @param sellingPrice - Цена продажи в копейках  
   * @returns Наценка в процентах
   */
  static calculateMarkup(costPrice: number, sellingPrice: number): number {
    if (costPrice === 0) return 0;
    const markup = ((sellingPrice - costPrice) / costPrice) * 100;
    return Math.round(markup * 100) / 100; // Округление до 2 знаков
  }

  /**
   * Проверяет, действительна ли цена в указанную дату
   */
  static isPriceValidAt(
    price: {
      validFrom: Date | string;
      validTo?: Date | string | null;
    },
    date: Date = new Date()
  ): boolean {
    const validFrom = typeof price.validFrom === 'string' 
      ? new Date(price.validFrom) 
      : price.validFrom;
    
    const validTo = price.validTo 
      ? (typeof price.validTo === 'string' ? new Date(price.validTo) : price.validTo)
      : null;

    return date >= validFrom && (!validTo || date <= validTo);
  }

  /**
   * Сравнивает две цены и возвращает процент изменения
   */
  static calculatePriceChange(oldPrice: number, newPrice: number): {
    changeAmount: number;
    changePercent: number;
    direction: 'up' | 'down' | 'same';
  } {
    const changeAmount = newPrice - oldPrice;
    const changePercent = oldPrice !== 0 
      ? Math.round((changeAmount / oldPrice) * 100 * 100) / 100 
      : 0;

    return {
      changeAmount,
      changePercent,
      direction: changeAmount > 0 ? 'up' : changeAmount < 0 ? 'down' : 'same'
    };
  }

  /**
   * Группирует цены по типу топлива
   */
  static groupPricesByFuelType<T extends { fuelType: string | { code: string } }>(
    prices: T[]
  ): Record<string, T[]> {
    const grouped: Record<string, T[]> = {};

    prices.forEach(price => {
      const fuelCode = typeof price.fuelType === 'string' 
        ? price.fuelType 
        : price.fuelType.code;
      
      if (!grouped[fuelCode]) {
        grouped[fuelCode] = [];
      }
      grouped[fuelCode].push(price);
    });

    return grouped;
  }

  /**
   * Находит актуальную цену из списка на указанную дату
   */
  static findActivePrice<T extends {
    validFrom: Date | string;
    validTo?: Date | string | null;
  }>(prices: T[], date: Date = new Date()): T | null {
    const validPrices = prices.filter(price => 
      this.isPriceValidAt(price, date)
    );

    if (validPrices.length === 0) return null;

    // Возвращаем самую последнюю по дате начала действия
    return validPrices.reduce((latest, current) => {
      const latestFrom = typeof latest.validFrom === 'string' 
        ? new Date(latest.validFrom) 
        : latest.validFrom;
      const currentFrom = typeof current.validFrom === 'string' 
        ? new Date(current.validFrom) 
        : current.validFrom;
      
      return currentFrom > latestFrom ? current : latest;
    });
  }

  /**
   * Проверяет конфликты в периодах действия цен
   */
  static checkPriceConflicts(prices: Array<{
    validFrom: Date | string;
    validTo?: Date | string | null;
    fuelType: string;
    tradingPointId: string;
  }>): Array<{ index1: number; index2: number; reason: string }> {
    const conflicts: Array<{ index1: number; index2: number; reason: string }> = [];

    for (let i = 0; i < prices.length - 1; i++) {
      for (let j = i + 1; j < prices.length; j++) {
        const price1 = prices[i];
        const price2 = prices[j];

        // Проверяем только цены для одного топлива и торговой точки
        if (price1.fuelType !== price2.fuelType || 
            price1.tradingPointId !== price2.tradingPointId) {
          continue;
        }

        const start1 = new Date(price1.validFrom);
        const end1 = price1.validTo ? new Date(price1.validTo) : null;
        const start2 = new Date(price2.validFrom);
        const end2 = price2.validTo ? new Date(price2.validTo) : null;

        // Проверяем пересечение периодов
        const overlaps = (
          (start1 <= start2 && (!end1 || end1 >= start2)) ||
          (start2 <= start1 && (!end2 || end2 >= start1))
        );

        if (overlaps) {
          conflicts.push({
            index1: i,
            index2: j,
            reason: `Пересечение периодов действия цен для топлива ${price1.fuelType}`
          });
        }
      }
    }

    return conflicts;
  }
}