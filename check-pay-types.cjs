const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/sts/v2/transactions?system=15&dt_beg=2025-12-01T00:00:00&dt_end=2025-12-17T23:59:59',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const items = json.flatMap(s => s.items || []);
    
    const payTypes = new Map();
    items.forEach(t => {
      if (t.pay_type) {
        const key = t.pay_type.id + '|' + t.pay_type.name;
        if (!payTypes.has(key)) {
          payTypes.set(key, { id: t.pay_type.id, name: t.pay_type.name, count: 0, cost: 0 });
        }
        payTypes.get(key).count++;
        payTypes.get(key).cost += parseFloat(t.cost) || 0;
      }
    });
    
    console.log('=== Все типы оплаты за декабрь 2025 ===');
    Array.from(payTypes.values())
      .sort((a,b) => b.count - a.count)
      .forEach(p => {
        console.log('ID:', p.id, '|', p.name.padEnd(15), '| транз:', String(p.count).padStart(5), '| сумма:', p.cost.toFixed(2));
      });
    
    const coupon = Array.from(payTypes.values()).find(p => p.name.toLowerCase().includes('купон'));
    console.log('\n--- Купон найден:', coupon ? 'ДА' : 'НЕТ', '---');
    if (coupon) {
      console.log('    Транзакций:', coupon.count, '| Сумма:', coupon.cost.toFixed(2));
    }
  });
});
req.on('error', (e) => console.error('Error:', e.message));
req.end();
