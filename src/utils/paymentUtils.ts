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

  const method = paymentMethod.toLowerCase().trim();

  // Наличные
  if (['cash', 'наличные'].includes(method) || method.includes('наличн')) {
    return 'Наличные';
  }

  // Безнал.электрон (ПЕРЕД обычным безналом!)
  if (method.includes('безнал') && method.includes('электрон')) {
    return 'Безнал.электрон';
  }

  // Безнал (обычный)
  if (method === 'безнал' || method === 'безнал.') {
    return 'Безнал';
  }

  // Талоны
  if (method.includes('талон')) {
    return 'Талоны';
  }

  // БАЛТОП
  if (method.includes('балтоп')) {
    return 'БАЛТОП';
  }

  // Инфорком
  if (method.includes('инфорком')) {
    return 'Инфорком';
  }

  // VIAcard / ВИАкард
  if (method.includes('viacard') || method.includes('виакард')) {
    return 'VIAcard';
  }

  // МобилПр. / Мобильная оплата → Онлайн (мобильная прокачка = онлайн-заказ)
  if (method.includes('мобилпр') || method.includes('мобил.пр') || method.includes('мобил.п')) {
    return 'Онлайн';
  }

  // Банковские карты (включая "банковские" из STS v2, "Карта МПС" из STS)
  if (['bank_card', 'карта', 'сбербанк', 'card', 'credit_card', 'debit_card'].includes(method) ||
      method.includes('банковск') || method.includes('мпс')) {
    return 'Банковские';
  }

  // Топливные карты
  if (['fuel_card', 'топливная_карта', 'fleet_card', 'нкт'].includes(method) || method.includes('топливн')) {
    return 'Топл. карты';
  }

  // Онлайн заказы и мобильные платежи (общий, после МобилПр.)
  if (['online_order', 'мобильная', 'мобильная оплата', 'mobile', 'qr', 'онлайн', 'online'].includes(method)) {
    return 'Онлайн';
  }

  // Корпоративные карты (КР из STS API)
  if (['corporate_card', 'кр'].includes(method) || method.includes('корпоратив')) {
    return 'Корп. карты';
  }

  // Купоны (из STS API)
  if (['coupon', 'купон', 'купон на сдачу'].includes(method)) {
    return 'Купон';
  }

  // Ведомость (безналичная реализация по ведомости)
  if (method.includes('ведомост')) {
    return 'Ведомость';
  }

  // Тех. отпуск в мерник
  if (method.includes('тех') && method.includes('мерник')) {
    return 'Тех. отпуск';
  }

  // Прочие (явный тип из STS)
  if (method === 'прочие' || method === 'прочее') {
    return 'Прочие';
  }

  // Если не найдено соответствие, возвращаем исходное значение
  return paymentMethod;
}

/**
 * Категория способа оплаты для группировки KPI и фильтров
 */
export type PaymentCategory = 'cash' | 'card' | 'fuel_card' | 'corporate' | 'online' | 'coupon' | 'other';

/**
 * Единая классификация способа оплаты по названию.
 * Заменяет getPaymentType() из shiftDashboardService и matchPaymentCategory() из OperationsTransactionsPageSimple.
 */
export function classifyPayment(paymentMethod: string): PaymentCategory {
  const name = paymentMethod.toLowerCase().trim();
  if (!name) return 'other';

  // Наличные
  if (name.includes('наличн') || name === 'cash') return 'cash';

  // Купоны / Талоны
  if (name.includes('купон') || name.includes('талон') || name === 'coupon') return 'coupon';

  // БАЛТОП, Инфорком, VIAcard — корпоративные системы
  if (name.includes('балтоп') || name.includes('инфорком') ||
      name.includes('viacard') || name.includes('виакард')) return 'corporate';

  // МобилПр. / Мобильная оплата → онлайн (ПЕРЕД общим "мобил")
  if (name.includes('мобилпр') || name.includes('мобил.пр') || name.includes('мобил.п')) return 'online';

  // Онлайн заказы
  if (name.includes('онлайн') || name.includes('online') || name === 'online_order' || name === 'qr') return 'online';
  if (name.includes('мобил')) return 'online';

  // Безнал.электрон → банковские карты (ПЕРЕД обычным безналом!)
  if (name.includes('безнал') && name.includes('электрон')) return 'card';
  // Безнал (обычный) → банковские карты
  if (name === 'безнал' || name === 'безнал.') return 'card';

  // Топливные карты (ПЕРЕД корпоративными и обычными картами!)
  // "топливн" — полное, "топл." — сокращённое ("Топл. карты")
  if (name.includes('топливн') || name.includes('топл.') || name === 'fuel_card' ||
      name.includes('нкт') || name === 'fleet_card' || name === 'топливная_карта') return 'fuel_card';

  // Корпоративные карты / КР (паттерн "корп" + "карт" ловит "Корп. карты", "Корп.карты", "Корп карты")
  if (name === 'кр' || name.includes('корпоратив') ||
      (name.includes('корп') && name.includes('карт')) ||
      name === 'corporate_card') return 'corporate';

  // Банковские карты / Безнал с эквайрингом
  if (name.includes('карт') || name.includes('сбербанк') || name.includes('сбп') ||
      name.includes('visa') || name.includes('mastercard') || name.includes('эквайр') ||
      name.includes('банковск') ||
      name === 'bank_card' || name === 'card' || name === 'credit_card' || name === 'debit_card') return 'card';

  // Ведомость — корпоративные отпуски
  if (name.includes('ведомост')) return 'corporate';

  // Тех. отпуск в мерник
  if (name.includes('тех') && name.includes('мерник')) return 'other';

  return 'other';
}

/**
 * Проверяет, является ли способ оплаты "наличными или банковской картой" (основные типы).
 * Используется для разделения на "основную" и "безналичную" реализацию в отчётах.
 */
export function isCashOrCard(paymentName: string): boolean {
  const category = classifyPayment(paymentName);
  return category === 'cash' || category === 'card';
}

/**
 * Переводит ключ способа оплаты из API в читаемое русское название.
 * Заменяет локальные getPaymentTypeDisplayName() в usePaymentStats и NetworkOverview.
 */
export function getPaymentTypeDisplayName(paymentType: string | undefined): string {
  const translations: Record<string, string> = {
    'bank_card': 'Банковская карта',
    'card': 'Банковская карта',
    'credit_card': 'Банковская карта',
    'debit_card': 'Банковская карта',
    'cash': 'Наличные',
    'fuel_card': 'Топливная карта',
    'fleet_card': 'Корпоративная карта',
    'corporate_card': 'Корп. карты',
    'coupon': 'Купон',
    'online_order': 'Онлайн заказ',
    'mobile': 'Мобильная оплата',
    'qr': 'QR-код',
    'contactless': 'Бесконтактная оплата',
    'online': 'Онлайн платеж',
    'digital': 'Цифровая оплата',
    'transfer': 'Перевод',
    'other': 'Другое',
    'наличные': 'Наличные',
    'карта': 'Банковская карта',
    'сбербанк': 'Банковская карта',
    'топливная_карта': 'Топливная карта',
    'мобил.п': 'Онлайн заказ',
    'мобильная': 'Онлайн заказ',
    'мобильная оплата': 'Онлайн заказ',
  };
  return translations[paymentType?.toLowerCase() || ''] || paymentType || 'Неизвестно';
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
    case 'Банковские':
      return 'Банк.';
    case 'Банк. карты':
      return 'Карта';
    case 'Топл. карты':
      return 'Топл.';
    case 'Наличные':
      return 'Нал.';
    case 'Онлайн':
      return 'Online';
    case 'Корп. карты':
      return 'Корп.';
    case 'Купон':
      return 'Куп.';
    case 'Талоны':
      return 'Тал.';
    case 'БАЛТОП':
      return 'БАЛТ.';
    case 'Инфорком':
      return 'ИФК';
    case 'VIAcard':
      return 'VIA';
    case 'МобилПр.':
      return 'МобПр.';
    case 'Безнал':
      return 'Б/нал';
    case 'Безнал.электрон':
      return 'Б/нал.э';
    case 'Ведомость':
      return 'Вед.';
    case 'Тех. отпуск':
      return 'Тех.';
    case 'Прочие':
      return 'Проч.';
    default:
      return normalized.length > 8 ? normalized.slice(0, 7) + '.' : normalized;
  }
}
