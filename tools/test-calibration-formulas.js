/**
 * Тестирование формул расчета объема горизонтального цилиндра
 * TradeControl Builder v1.7.14
 * 
 * Резервуар:
 * - Диаметр: 2500 мм
 * - Длина: 2100 мм
 * - Тип: горизонтальный цилиндрический
 */

// Расчет ПОЛНОГО объема
function calculateTankFullVolume(diameter_mm, length_mm) {
  const R = diameter_mm / 2;
  const volume_mm3 = Math.PI * R * R * length_mm;
  return volume_mm3 / 1000000; // мм³ → литры
}

// Расчет площади сегмента круга
function calculateCircleSegmentArea(R, h) {
  if (h <= 0) return 0;
  if (h >= 2 * R) return Math.PI * R * R;
  if (h === R) return (Math.PI * R * R) / 2;
  
  const angle = Math.acos((R - h) / R);
  const term1 = R * R * angle;
  const term2 = (R - h) * Math.sqrt(2 * R * h - h * h);
  
  return term1 - term2;
}

// Расчет объема по уровню
function calculateHorizontalCylinderVolume(level_mm, diameter_mm, length_mm) {
  const R = diameter_mm / 2;
  const h = level_mm;

  if (h < 0) return 0;
  if (h > diameter_mm) return calculateTankFullVolume(diameter_mm, length_mm);
  if (h === 0) return 0;
  if (h === diameter_mm) return calculateTankFullVolume(diameter_mm, length_mm);

  const segment_area_mm2 = calculateCircleSegmentArea(R, h);
  const volume_mm3 = segment_area_mm2 * length_mm;
  return volume_mm3 / 1000000;
}

// Параметры резервуара
const DIAMETER = 2500; // мм
const LENGTH = 2100;   // мм

console.log('='.repeat(80));
console.log('📊 ТЕСТИРОВАНИЕ ФОРМУЛ КАЛИБРОВКИ РЕЗЕРВУАРА');
console.log('='.repeat(80));
console.log(`\n📐 Параметры резервуара:`);
console.log(`   - Диаметр: ${DIAMETER} мм`);
console.log(`   - Длина: ${LENGTH} мм`);
console.log(`   - Тип: Горизонтальный цилиндрический`);

// Полный объем
const fullVolume = calculateTankFullVolume(DIAMETER, LENGTH);
console.log(`\n🔵 Полный объем: ${fullVolume.toFixed(2)} литров`);
console.log(`   Формула: V = π × (D/2)² × L`);
console.log(`   Расчет: π × (${DIAMETER}/2)² × ${LENGTH} / 1000000`);
console.log(`   = ${fullVolume.toFixed(2)} л`);

// Тестовые точки
const testPoints = [
  { level: 0, expected: 0 },
  { level: 250, expected: null }, // 10% высоты
  { level: 500, expected: null }, // 20% высоты
  { level: 1250, expected: fullVolume / 2 }, // 50% высоты (середина)
  { level: 2000, expected: null }, // 80% высоты
  { level: 2250, expected: null }, // 90% высоты
  { level: 2500, expected: fullVolume } // 100% высоты
];

console.log(`\n📊 ТАБЛИЦА КАЛИБРОВКИ (тестовые точки):`);
console.log('─'.repeat(80));
console.log('Уровень (мм) | Объем (л)   | % от полного | Ожидаемый | Разница');
console.log('─'.repeat(80));

for (const point of testPoints) {
  const calculated = calculateHorizontalCylinderVolume(point.level, DIAMETER, LENGTH);
  const percent = (calculated / fullVolume * 100).toFixed(1);
  const expected = point.expected !== null ? point.expected.toFixed(2) + ' л' : 'N/A';
  const diff = point.expected !== null ? (calculated - point.expected).toFixed(2) + ' л' : '-';
  
  console.log(
    `${point.level.toString().padStart(12)} | ` +
    `${calculated.toFixed(2).padStart(11)} | ` +
    `${percent.padStart(12)}% | ` +
    `${expected.padStart(9)} | ` +
    `${diff.padStart(7)}`
  );
}

console.log('─'.repeat(80));

// Детальная таблица по 100 мм
console.log(`\n📈 ДЕТАЛЬНАЯ КАЛИБРОВОЧНАЯ ТАБЛИЦА (шаг 100 мм):`);
console.log('─'.repeat(60));
console.log('Уровень (мм) | Объем (л)   | % от полного | Δ (л)');
console.log('─'.repeat(60));

let prevVolume = 0;
for (let level = 0; level <= DIAMETER; level += 100) {
  const volume = calculateHorizontalCylinderVolume(level, DIAMETER, LENGTH);
  const percent = (volume / fullVolume * 100).toFixed(1);
  const delta = (volume - prevVolume).toFixed(2);
  
  console.log(
    `${level.toString().padStart(12)} | ` +
    `${volume.toFixed(2).padStart(11)} | ` +
    `${percent.padStart(12)}% | ` +
    `${delta.padStart(6)}`
  );
  
  prevVolume = volume;
}

console.log('─'.repeat(60));

// Проверка симметрии (уровень h и (D-h) должны давать V и (Vполн - V))
console.log(`\n🔄 ПРОВЕРКА СИММЕТРИИ:`);
console.log('   Уровень h и (D-h) должны быть симметричны относительно половины объема');
console.log('─'.repeat(70));
console.log('Уровень h (мм) | V(h) (л) | Уровень D-h (мм) | V(D-h) (л) | Сумма');
console.log('─'.repeat(70));

for (let h = 0; h <= DIAMETER / 2; h += 250) {
  const v1 = calculateHorizontalCylinderVolume(h, DIAMETER, LENGTH);
  const v2 = calculateHorizontalCylinderVolume(DIAMETER - h, DIAMETER, LENGTH);
  const sum = (v1 + v2).toFixed(2);
  const expected = fullVolume.toFixed(2);
  const match = Math.abs(parseFloat(sum) - fullVolume) < 0.01 ? '✅' : '❌';
  
  console.log(
    `${h.toString().padStart(14)} | ` +
    `${v1.toFixed(2).padStart(8)} | ` +
    `${(DIAMETER - h).toString().padStart(16)} | ` +
    `${v2.toFixed(2).padStart(10)} | ` +
    `${sum} ${match}`
  );
}

console.log('─'.repeat(70));
console.log(`   Ожидаемая сумма: ${fullVolume.toFixed(2)} л`);

console.log('\n' + '='.repeat(80));
console.log('✅ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
console.log('='.repeat(80));
