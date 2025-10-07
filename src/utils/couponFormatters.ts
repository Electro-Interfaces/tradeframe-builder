/**
 * Утилиты для форматирования данных купонов
 */

/**
 * Безопасное форматирование даты
 * @param dateStr - строка даты
 * @param formatFunc - функция форматирования
 * @param fallback - значение по умолчанию при ошибке
 */
export const safeDateFormat = (
  dateStr: string,
  formatFunc: (date: Date) => string,
  fallback: string = '-'
): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return fallback;
    }
    return formatFunc(date);
  } catch (error) {
    return fallback;
  }
};

/**
 * Форматирование даты в локальный формат
 */
export const formatCouponDate = (dateStr: string): string => {
  return safeDateFormat(
    dateStr,
    (date) => date.toLocaleDateString('ru-RU')
  );
};

/**
 * Форматирование даты и времени
 */
export const formatCouponDateTime = (dateStr: string): string => {
  return safeDateFormat(
    dateStr,
    (date) => date.toLocaleDateString('ru-RU') + ' ' +
             date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  );
};

/**
 * Форматирование времени
 */
export const formatCouponTime = (dateStr: string): string => {
  return safeDateFormat(
    dateStr,
    (date) => date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  );
};

/**
 * Форматирование полной даты и времени
 */
export const formatCouponFullDateTime = (dateStr: string): string => {
  return safeDateFormat(
    dateStr,
    (date) => date.toLocaleString('ru-RU')
  );
};

/**
 * Форматирование суммы в рубли
 */
export const formatAmount = (amount: number, decimals: number = 2): string => {
  return `${amount.toFixed(decimals)} ₽`;
};

/**
 * Форматирование количества литров
 */
export const formatLiters = (liters: number, decimals: number = 1): string => {
  return `${liters.toFixed(decimals)} л`;
};

/**
 * Форматирование цены за литр
 */
export const formatPricePerLiter = (price: number): string => {
  return `${price.toFixed(2)} ₽/л`;
};

/**
 * Форматирование процента
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};
