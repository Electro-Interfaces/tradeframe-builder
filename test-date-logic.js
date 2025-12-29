/**
 * Тестовый скрипт для проверки логики обработки дат в купонах
 */

// Симуляция текущего времени
const now = new Date();
console.log('\n=== ТЕКУЩЕЕ ВРЕМЯ ===');
console.log('Локальное:', now.toString());
console.log('UTC:', now.toISOString());
console.log('Часовой пояс:', Intl.DateTimeFormat().resolvedOptions().timeZone);

// Логика из useCouponFilters.ts (строки 19-20)
console.log('\n=== ФОРМИРОВАНИЕ ФИЛЬТРОВ (из useCouponFilters.ts) ===');
const dateFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const dateTo = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
console.log('dateFrom (строка):', dateFrom);
console.log('dateTo (строка):', dateTo);

// Логика из couponsApiService.ts (строки 42, 49)
console.log('\n=== ПРЕОБРАЗОВАНИЕ ДЛЯ API (из couponsApiService.ts) ===');
const dt_beg = `${dateFrom} 00:00:00`;
const dt_end = `${dateTo} 23:59:59`;
console.log('dt_beg для API:', dt_beg);
console.log('dt_end для API:', dt_end);

// Симуляция даты купона (созданного СЕГОДНЯ в разное время)
console.log('\n=== ПРОВЕРКА КУПОНОВ ===');

const testCoupons = [
  { desc: 'Купон сегодня 00:01 (начало дня)', dt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 1) },
  { desc: 'Купон сегодня 12:00 (середина дня)', dt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0) },
  { desc: 'Купон сегодня 23:59 (конец дня)', dt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59) },
  { desc: 'Купон вчера 23:59', dt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59) },
  { desc: 'Купон завтра 00:01', dt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 1) }
];

testCoupons.forEach(coupon => {
  const couponDateStr = coupon.dt.toISOString();
  const couponDateOnly = couponDateStr.split('T')[0];

  // Сравнение как в фильтре (строковое сравнение дат)
  const isInRange = couponDateOnly >= dateFrom && couponDateOnly <= dateTo;

  console.log(`\n${coupon.desc}`);
  console.log('  Локальное:', coupon.dt.toString());
  console.log('  UTC ISO:', couponDateStr);
  console.log('  Дата (строка):', couponDateOnly);
  console.log('  В диапазоне?', isInRange ? '✅ ДА' : '❌ НЕТ');
  console.log('  Проверка:', `${couponDateOnly} >= ${dateFrom} && ${couponDateOnly} <= ${dateTo}`);
});

// ПРОБЛЕМА: Часовые пояса при парсинге дат в API
console.log('\n=== ПОТЕНЦИАЛЬНАЯ ПРОБЛЕМА: Часовые пояса ===');
console.log('⚠️ API может интерпретировать "2025-11-18 23:59:59" по-разному:');
console.log('  1. Как UTC: 2025-11-18 23:59:59 UTC');
console.log('  2. Как локальное: 2025-11-18 23:59:59 +03:00 (Москва)');
console.log('');
console.log('Если купон создан сегодня в 23:45 по Москве:');
const todayEvening = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 45);
console.log('  Локальное: ', todayEvening.toString());
console.log('  UTC:       ', todayEvening.toISOString());
console.log('  Разница:   ', todayEvening.getTimezoneOffset() / 60, 'часов');

console.log('\n=== РЕКОМЕНДАЦИЯ ===');
console.log('Использовать локальные даты без UTC конвертации:');
const localDateTo = new Date();
localDateTo.setDate(localDateTo.getDate() + 1); // Завтра
const year = localDateTo.getFullYear();
const month = String(localDateTo.getMonth() + 1).padStart(2, '0');
const day = String(localDateTo.getDate()).padStart(2, '0');
const localDateToStr = `${year}-${month}-${day}`;
console.log('dateTo (локальное):', localDateToStr);
console.log('dateTo (через UTC):', dateTo);
console.log('Совпадают?', localDateToStr === dateTo ? '✅ ДА' : '❌ НЕТ');
