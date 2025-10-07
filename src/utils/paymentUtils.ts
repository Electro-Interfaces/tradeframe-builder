/**
 * Утилиты для работы со способами оплаты
 */

/**
 * Нормализует способ оплаты к единообразному виду
 *
 * @param paymentMethod - Исходный способ оплаты
 * @returns Нормализованный способ оплаты
 */
export function normalizePaymentMethod(paymentMethod: string): string {
  if (!paymentMethod) return '-';

  const method = paymentMethod.toLowerCase();

  // Наличные
  if (['cash', 'наличные'].includes(method)) {
    return 'Наличные';
  }

  // Банковские карты
  if (['bank_card', 'карта', 'сбербанк', 'card', 'credit_card', 'debit_card'].includes(method)) {
    return 'Банк. карты';
  }

  // Топливные карты
  if (['fuel_card', 'топливная_карта', 'fleet_card', 'нкт'].includes(method)) {
    return 'Топл. карты';
  }

  // Онлайн заказы и мобильные платежи
  if (['online_order', 'мобил.п', 'мобильная', 'мобильная оплата', 'mobile', 'qr'].includes(method)) {
    return 'Онлайн';
  }

  // Если не найдено соответствие, возвращаем исходное значение
  return paymentMethod;
}

/**
 * Получает короткое название способа оплаты для отображения
 *
 * @param paymentMethod - Способ оплаты
 * @returns Короткое название
 */
export function getShortPaymentName(paymentMethod: string): string {
  const normalized = normalizePaymentMethod(paymentMethod);

  switch (normalized) {
    case 'Банк. карты':
      return 'Карта';
    case 'Топл. карты':
      return 'Топл.';
    case 'Наличные':
      return 'Нал.';
    case 'Онлайн':
      return 'Online';
    default:
      return normalized;
  }
}
