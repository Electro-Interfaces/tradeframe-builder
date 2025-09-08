const https = require('https');

async function directDeleteStation4() {
  const station4Id = '6969b08d-1cbe-45c2-ae9c-8002c7022b59';
  const supabaseUrl = 'https://vxlswbjgsjdvsgwojlka.supabase.co';
  const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4bHN3Ympnc2pkdnNnd29qbGthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzczMjcxNiwiZXhwIjoyMDQ5MzA4NzE2fQ.VQVyr-k4wbTkxaYMJpzPOdvMIq5hf8t1R2B6XTKS1So';

  console.log('🗑️ ПРЯМОЕ УДАЛЕНИЕ ВСЕХ ОПЕРАЦИЙ АЗС 4...');
  console.log(`Station ID: ${station4Id}`);

  try {
    // 1. Сначала проверим сколько операций есть
    console.log('\n🔍 Проверяем количество операций...');
    const checkResult = await makeRequest('GET', `/rest/v1/operations?trading_point_id=eq.${station4Id}&select=id,start_time,operation_type`);
    
    const operations = JSON.parse(checkResult);
    console.log(`📊 Найдено операций АЗС 4: ${operations.length}`);
    
    if (operations.length === 0) {
      console.log('✅ Операций не найдено - база уже чистая');
      return;
    }

    // Показываем первые 5 операций
    console.log('\n📋 Примеры операций:');
    operations.slice(0, 5).forEach((op, i) => {
      console.log(`   ${i + 1}. ${op.start_time} - ${op.operation_type}`);
    });
    if (operations.length > 5) {
      console.log(`   ... и ещё ${operations.length - 5} операций`);
    }

    // 2. Удаляем все операции
    console.log(`\n🗑️ Удаляем ${operations.length} операций...`);
    const deleteResult = await makeRequest('DELETE', `/rest/v1/operations?trading_point_id=eq.${station4Id}`);
    
    console.log('✅ Операции удалены');

    // 3. Проверяем результат
    console.log('\n🔍 Проверяем результат удаления...');
    const verifyResult = await makeRequest('GET', `/rest/v1/operations?trading_point_id=eq.${station4Id}&select=id`);
    
    const remainingOps = JSON.parse(verifyResult);
    console.log(`📊 Осталось операций: ${remainingOps.length}`);

    if (remainingOps.length === 0) {
      console.log('\n🎉 УСПЕШНО! ВСЕ ОПЕРАЦИИ АЗС 4 УДАЛЕНЫ');
      console.log('✅ АЗС 4 полностью очищена от транзакций');
      console.log('🏪 Станция готова к работе с чистой историей');
    } else {
      console.log(`\n⚠️ Внимание: осталось ${remainingOps.length} операций`);
    }

  } catch (error) {
    console.error('\n💥 ОШИБКА:', error.message);
    process.exit(1);
  }

  function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'vxlswbjgsjdvsgwojlka.supabase.co',
        port: 443,
        path: path,
        method: method,
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      };

      if (body) {
        const bodyStr = JSON.stringify(body);
        options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
      }

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }
}

directDeleteStation4();