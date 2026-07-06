/**
 * Серверная нормализация способа оплаты — точная копия логики
 * src/utils/paymentUtils.ts normalizePaymentMethod. Держим синхронно с фронтом:
 * агрегаты в PG группируются по этому же нормализованному значению.
 */
function normalizePaymentMethod(paymentMethod) {
  if (!paymentMethod) return '-';
  const method = String(paymentMethod).toLowerCase().trim();

  if (['cash', 'наличные'].includes(method) || method.includes('наличн')) return 'Наличные';
  if (method.includes('безнал') && method.includes('электрон')) return 'Безнал.электрон';
  if (method === 'безнал' || method === 'безнал.') return 'Безнал';
  if (method.includes('талон')) return 'Талоны';
  if (method.includes('балтоп')) return 'БАЛТОП';
  if (method.includes('инфорком')) return 'Инфорком';
  if (method.includes('viacard') || method.includes('виакард')) return 'VIAcard';
  if (method.includes('мобилпр') || method.includes('мобил.пр') || method.includes('мобил.п')) return 'Онлайн';
  if (['bank_card', 'карта', 'сбербанк', 'card', 'credit_card', 'debit_card'].includes(method) ||
      method.includes('банковск') || method.includes('мпс')) return 'Банковские';
  if (['fuel_card', 'топливная_карта', 'fleet_card', 'нкт'].includes(method) || method.includes('топливн')) return 'Топл. карты';
  if (['online_order', 'мобильная', 'мобильная оплата', 'mobile', 'qr', 'онлайн', 'online'].includes(method)) return 'Онлайн';
  if (['corporate_card', 'кр'].includes(method) || method.includes('корпоратив')) return 'Корп. карты';
  if (['coupon', 'купон', 'купон на сдачу'].includes(method)) return 'Купон';
  if (method.includes('ведомост')) return 'Ведомость';
  if (method.includes('тех') && method.includes('мерник')) return 'Тех. отпуск';
  if (method === 'прочие' || method === 'прочее') return 'Прочие';
  return paymentMethod;
}

module.exports = { normalizePaymentMethod };
