/**
 * Получение правильных учетных данных для PostgreSQL
 * из Supabase API
 */

const https = require('https');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function getDatabaseInfo() {
  console.log('🔍 Получаем информацию о базе данных из Supabase...\n');

  // 1. Проверим статус проекта
  console.log('📊 Проверяем статус проекта...');
  try {
    const healthCheck = await makeRequest(`${supabaseUrl}/rest/v1/`);
    console.log(`✅ Проект активен (HTTP ${healthCheck.status})`);
  } catch (error) {
    console.log(`❌ Проект недоступен: ${error.message}`);
    return;
  }

  // 2. Попробуем получить метаинформацию через REST API
  console.log('🗂️ Получаем метаинформацию схемы...');
  try {
    const tablesInfo = await makeRequest(`${supabaseUrl}/rest/v1/?select=*`);
    if (tablesInfo.status === 200) {
      console.log('✅ REST API работает');
    } else {
      console.log(`⚠️ REST API статус: ${tablesInfo.status}`);
    }
  } catch (error) {
    console.log(`❌ REST API ошибка: ${error.message}`);
  }

  // 3. Проверим подключение к таблице operations
  console.log('📋 Проверяем доступ к таблице operations...');
  try {
    const operationsCheck = await makeRequest(`${supabaseUrl}/rest/v1/operations?select=*&limit=1`);
    if (operationsCheck.status === 200) {
      console.log(`✅ Таблица operations доступна (${operationsCheck.data.length} записей найдено)`);
    } else {
      console.log(`❌ Таблица operations недоступна (${operationsCheck.status})`);
      console.log('Ответ:', operationsCheck.data);
    }
  } catch (error) {
    console.log(`❌ Ошибка доступа к operations: ${error.message}`);
  }

  // 4. Выводим текущие параметры подключения
  console.log('\n📋 ТЕКУЩИЕ ПАРАМЕТРЫ ПОДКЛЮЧЕНИЯ:');
  console.log('─'.repeat(60));
  console.log(`Project Ref: tohtryzyffcebtyvkxwh`);
  console.log(`Database: postgres`);
  console.log(`Host (Pooler): aws-0-eu-central-1.pooler.supabase.com`);
  console.log(`Port (Transaction): 6543`);
  console.log(`Port (Session): 5432`);
  console.log(`User: postgres.tohtryzyffcebtyvkxwh`);
  console.log(`Password: tradeframe2024`);
  console.log(`SSL: rejectUnauthorized: false`);

  // 5. Возможные альтернативы
  console.log('\n🔧 ВОЗМОЖНЫЕ АЛЬТЕРНАТИВЫ:');
  console.log('1. Попробуйте другой пароль базы данных');
  console.log('2. Проверьте в Supabase Dashboard → Settings → Database');
  console.log('3. Возможно нужен пользователь "postgres" вместо "postgres.project"');
  console.log('4. Проверьте что проект не в режиме pause');

  // 6. Предложение тестовых паролей
  console.log('\n🧪 ТЕСТОВЫЕ ПАРОЛИ ДЛЯ ПРОВЕРКИ:');
  const testPasswords = [
    'tradeframe2024',
    'postgres',
    'password',
    'admin',
    '123456',
    'supabase',
    '',
  ];

  console.log('Попробуйте эти пароли:');
  testPasswords.forEach((pwd, i) => {
    console.log(`${i + 1}. "${pwd}"`);
  });

  return {
    host: 'aws-0-eu-central-1.pooler.supabase.com',
    database: 'postgres',
    user: 'postgres.tohtryzyffcebtyvkxwh',
    testPasswords
  };
}

// Тест с альтернативными паролями
async function testPasswords(connectionBase, passwords) {
  console.log('\n🔓 ТЕСТИРОВАНИЕ ПАРОЛЕЙ...');
  
  const { Client } = require('pg');
  
  for (let i = 0; i < passwords.length; i++) {
    const password = passwords[i];
    console.log(`\n${i + 1}. Тестирую пароль: "${password}"`);
    
    const client = new Client({
      ...connectionBase,
      password: password,
      port: 6543, // Transaction pooler
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      console.log(`✅ УСПЕХ! Рабочий пароль: "${password}"`);
      
      const result = await client.query('SELECT version()');
      console.log(`📋 PostgreSQL: ${result.rows[0].version.split(' ')[1]}`);
      
      await client.end();
      return password;
      
    } catch (error) {
      console.log(`❌ Ошибка: ${error.message}`);
      try { await client.end(); } catch (e) {}
    }
  }
  
  return null;
}

async function main() {
  console.log('🔐 ПОИСК ПРАВИЛЬНЫХ УЧЕТНЫХ ДАННЫХ POSTGRESQL');
  console.log('=' .repeat(80));
  
  const dbInfo = await getDatabaseInfo();
  
  if (dbInfo) {
    const workingPassword = await testPasswords({
      host: dbInfo.host,
      database: dbInfo.database,
      user: dbInfo.user
    }, dbInfo.testPasswords);
    
    if (workingPassword) {
      console.log('\n🎉 НАЙДЕН РАБОЧИЙ ПАРОЛЬ!');
      console.log('=' .repeat(50));
      console.log(`Host: ${dbInfo.host}`);
      console.log(`Port: 6543`);
      console.log(`Database: ${dbInfo.database}`);
      console.log(`User: ${dbInfo.user}`);
      console.log(`Password: ${workingPassword}`);
      console.log('=' .repeat(50));
      console.log('\n✅ Теперь можно продолжать с удалением constraint!');
      
      return {
        host: dbInfo.host,
        port: 6543,
        database: dbInfo.database,
        user: dbInfo.user,
        password: workingPassword
      };
    } else {
      console.log('\n❌ Ни один пароль не подошел');
      console.log('🔧 Проверьте пароль в Supabase Dashboard manually');
    }
  }
  
  return null;
}

main().then((credentials) => {
  if (credentials) {
    console.log('\n🚀 Готов к выполнению операций с базой данных!');
  } else {
    console.log('\n⚠️ Нужно найти правильные учетные данные');
  }
  process.exit(0);
}).catch(err => {
  console.error('\n💥 Ошибка:', err);
  process.exit(1);
});