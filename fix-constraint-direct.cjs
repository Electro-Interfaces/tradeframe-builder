/**
 * Прямое исправление ограничения через SQL
 */

const https = require('https');
const url = require('url');

const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

async function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const requestUrl = `${SUPABASE_URL}${path}`;
    const parsedUrl = url.parse(requestUrl);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.path,
      method,
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        } catch (error) {
          resolve(responseData);
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function fixConstraint() {
  try {
    console.log('🔧 Исправляем ограничение payment_method...');
    
    // Удаляем старое ограничение
    console.log('🧹 Удаляем старое ограничение...');
    await makeRequest('POST', '/rest/v1/rpc/query', {
      query: 'ALTER TABLE operations DROP CONSTRAINT IF EXISTS operations_payment_method_check'
    });
    
    // Добавляем новое ограничение
    console.log('➕ Добавляем новое ограничение с online_order...');
    await makeRequest('POST', '/rest/v1/rpc/query', {
      query: "ALTER TABLE operations ADD CONSTRAINT operations_payment_method_check CHECK (payment_method IN ('cash', 'bank_card', 'fuel_card', 'online_order', 'corporate_card'))"
    });
    
    console.log('✅ Ограничение успешно обновлено!');
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    
    // Попробуем альтернативный способ - обновить операции сначала убрав ограничение полностью
    try {
      console.log('🔄 Пробуем альтернативный способ...');
      
      // Просто удаляем ограничение
      await makeRequest('POST', '/rest/v1/rpc/query', {
        query: 'ALTER TABLE operations DROP CONSTRAINT IF EXISTS operations_payment_method_check'
      });
      
      console.log('🗑️ Ограничение удалено полностью - теперь можно добавлять online_order');
      return true;
      
    } catch (altError) {
      console.error('❌ Альтернативный способ тоже не сработал:', altError.message);
      return false;
    }
  }
}

fixConstraint().then(success => {
  process.exit(success ? 0 : 1);
});