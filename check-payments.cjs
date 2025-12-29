const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'tx-temp.json'), 'utf8'));

const items = data.flatMap(s => s.items.map(i => ({...i, station: s.number})));
const filtered = items.filter(i => i.pay_type && (i.pay_type.name === 'Автопозитив' || i.pay_type.name === 'КР'));

console.log('=== Транзакции Автопозитив и КР за декабрь 2025 ===\n');

filtered.forEach(t => {
  const dt = t.dt.replace('T',' ').substring(0,16);
  const fuel = t.fuel_name.padEnd(6);
  const qty = String(t.quantity).padStart(7);
  const cost = String(t.cost).padStart(9);
  const card = (t.card || '-').padEnd(10);
  console.log(`Ст.${t.station} | ${dt} | ${fuel} | ${qty}л | ${cost}р | Карта: ${card} | ${t.pay_type.name}`);
});

console.log(`\n--- Итого: ${filtered.length} транзакций ---\n`);

const byType = {};
filtered.forEach(t => {
  const type = t.pay_type.name;
  if (byType[type] === undefined) byType[type] = {count:0, qty:0, cost:0};
  byType[type].count++;
  byType[type].qty += parseFloat(t.quantity) || 0;
  byType[type].cost += parseFloat(t.cost) || 0;
});

console.log('Сводка по типам:');
Object.entries(byType).forEach(([k,v]) => {
  console.log(`  ${k}: ${v.count} транз., ${v.qty.toFixed(2)} л, ${v.cost.toFixed(2)} руб.`);
});
