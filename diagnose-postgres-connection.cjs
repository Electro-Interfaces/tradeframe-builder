/**
 * Полная диагностика подключения к PostgreSQL Supabase
 * Проверяем ВСЕ возможные параметры подключения
 */

const { Client } = require('pg');
const https = require('https');
const dns = require('dns');

// Извлекаем данные из Supabase URL
const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const projectRef = 'tohtryzyffcebtyvkxwh';

// Все возможные конфигурации подключения
const connectionConfigs = [
  {
    name: 'Transaction Pooler (Port 6543)',
    config: {
      host: `aws-0-eu-central-1.pooler.supabase.com`,
      port: 6543,
      database: 'postgres',
      user: `postgres.${projectRef}`,
      password: 'tradeframe2024',
      ssl: { rejectUnauthorized: false }
    }
  },
  {
    name: 'Session Pooler (Port 5432)',
    config: {
      host: `aws-0-eu-central-1.pooler.supabase.com`,
      port: 5432,
      database: 'postgres',
      user: `postgres.${projectRef}`,
      password: 'tradeframe2024',
      ssl: { rejectUnauthorized: false }
    }
  },
  {
    name: 'Direct Connection (supabase.co)',
    config: {
      host: `${projectRef}.supabase.co`,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: 'tradeframe2024',
      ssl: { rejectUnauthorized: false }
    }
  },
  {
    name: 'Direct Connection (supabase.co) with project user',
    config: {
      host: `${projectRef}.supabase.co`,
      port: 5432,
      database: 'postgres',
      user: `postgres.${projectRef}`,
      password: 'tradeframe2024',
      ssl: { rejectUnauthorized: false }
    }
  },
  {
    name: 'IPv6 Direct',
    config: {
      host: `db.${projectRef}.supabase.co`,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: 'tradeframe2024',
      ssl: { rejectUnauthorized: false }
    }
  }
];

async function checkDNS(hostname) {
  return new Promise((resolve) => {
    dns.lookup(hostname, (err, address) => {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true, address });
      }
    });
  });
}

async function checkPort(host, port) {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    
    socket.setTimeout(5000);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve({ success: true });
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ success: false, error: 'timeout' });
    });
    
    socket.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
    
    socket.connect(port, host);
  });
}

async function testPostgresConnection(configName, config) {
  console.log(`\n🔄 === Тестируем ${configName} ===`);
  console.log(`   Host: ${config.host}:${config.port}`);
  console.log(`   User: ${config.user}`);
  console.log(`   DB: ${config.database}`);
  
  // 1. DNS Resolution
  console.log('🌐 Проверяем DNS резолвинг...');
  const dnsResult = await checkDNS(config.host);
  if (dnsResult.success) {
    console.log(`✅ DNS: ${config.host} → ${dnsResult.address}`);
  } else {
    console.log(`❌ DNS ошибка: ${dnsResult.error}`);
    return { success: false, stage: 'DNS' };
  }
  
  // 2. Port Check
  console.log(`🔌 Проверяем доступность порта ${config.port}...`);
  const portResult = await checkPort(config.host, config.port);
  if (portResult.success) {
    console.log(`✅ Порт ${config.port} открыт`);
  } else {
    console.log(`❌ Порт недоступен: ${portResult.error}`);
    return { success: false, stage: 'PORT' };
  }
  
  // 3. PostgreSQL Connection
  console.log('🔓 Попытка подключения к PostgreSQL...');
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('✅ PostgreSQL подключение установлено');
    
    // 4. Basic Query
    console.log('📋 Проверяем версию PostgreSQL...');
    const versionResult = await client.query('SELECT version()');
    const version = versionResult.rows[0].version;
    console.log(`✅ PostgreSQL: ${version.split(' ')[0]} ${version.split(' ')[1]}`);
    
    // 5. Check Schema Access
    console.log('🗂️ Проверяем доступ к схеме...');
    const schemaResult = await client.query('SELECT schema_name FROM information_schema.schemata');
    console.log(`✅ Доступно схем: ${schemaResult.rows.length}`);
    
    // 6. Check Operations Table
    console.log('📊 Проверяем таблицу operations...');
    const tableResult = await client.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'operations'
    `);
    
    if (tableResult.rows.length > 0) {
      console.log('✅ Таблица operations найдена');
      
      // 7. Check Constraints
      console.log('🔒 Проверяем constraints...');
      const constraintResult = await client.query(`
        SELECT conname, consrc 
        FROM pg_constraint 
        WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'operations') 
        AND conname LIKE '%payment%'
      `);
      
      if (constraintResult.rows.length > 0) {
        console.log('📋 Найдены constraints:');
        constraintResult.rows.forEach(row => {
          console.log(`   ${row.conname}: ${row.consrc}`);
        });
      } else {
        console.log('⚠️ Payment constraints не найдены');
      }
      
      // 8. Check Permissions
      console.log('🔐 Проверяем права доступа...');
      try {
        await client.query(`SELECT COUNT(*) FROM operations LIMIT 1`);
        console.log('✅ SELECT права есть');
        
        await client.query(`
          INSERT INTO operations (id, operation_type, status, start_time, payment_method, details, created_at, updated_at) 
          VALUES ('TEST-PERM-${Date.now()}', 'sale', 'completed', NOW(), 'cash', 'Permission test', NOW(), NOW())
        `);
        console.log('✅ INSERT права есть');
        
        await client.query(`DELETE FROM operations WHERE id LIKE 'TEST-PERM-%'`);
        console.log('✅ DELETE права есть');
        
      } catch (permErr) {
        console.log(`❌ Ошибка прав доступа: ${permErr.message}`);
      }
      
      await client.end();
      return { 
        success: true, 
        config,
        hasOperationsTable: true,
        hasConstraints: constraintResult.rows.length > 0,
        constraints: constraintResult.rows
      };
      
    } else {
      console.log('❌ Таблица operations не найдена');
      await client.end();
      return { success: false, stage: 'TABLE_ACCESS' };
    }
    
  } catch (error) {
    console.log(`❌ PostgreSQL ошибка: ${error.message}`);
    console.log(`🔧 Код ошибки: ${error.code || 'UNKNOWN'}`);
    try {
      await client.end();
    } catch (e) {}
    return { success: false, stage: 'POSTGRES', error: error.message, code: error.code };
  }
}

async function main() {
  console.log('🚀 ПОЛНАЯ ДИАГНОСТИКА ПОДКЛЮЧЕНИЯ К SUPABASE POSTGRESQL');
  console.log('=' .repeat(80));
  console.log(`📊 Проект: ${projectRef}`);
  console.log(`🔗 Supabase URL: ${supabaseUrl}`);
  console.log(`🗝️ Service Key: ${supabaseKey.substring(0, 20)}...`);
  
  let workingConnection = null;
  
  for (const { name, config } of connectionConfigs) {
    const result = await testPostgresConnection(name, config);
    
    if (result.success) {
      console.log(`\n🎯 УСПЕШНОЕ ПОДКЛЮЧЕНИЕ НАЙДЕНО: ${name}`);
      workingConnection = result;
      break;
    }
  }
  
  if (workingConnection) {
    console.log('\n🎉 РЕЗУЛЬТАТ ДИАГНОСТИКИ:');
    console.log('✅ Прямое подключение к PostgreSQL работает!');
    console.log(`📡 Хост: ${workingConnection.config.host}:${workingConnection.config.port}`);
    console.log(`👤 Пользователь: ${workingConnection.config.user}`);
    console.log(`🗂️ База: ${workingConnection.config.database}`);
    
    if (workingConnection.hasConstraints) {
      console.log('\n🔒 НАЙДЕННЫЕ CONSTRAINTS:');
      workingConnection.constraints.forEach(constraint => {
        console.log(`   ${constraint.conname}: ${constraint.consrc}`);
      });
      console.log('\n✅ Можно продолжать с удалением constraint!');
    } else {
      console.log('\n⚠️ Payment constraints не найдены - возможно уже удалены');
    }
    
    return workingConnection;
    
  } else {
    console.log('\n❌ НЕ УДАЛОСЬ НАЙТИ РАБОЧЕЕ ПОДКЛЮЧЕНИЕ');
    console.log('\n🔧 Возможные причины:');
    console.log('   1. Неправильный пароль базы данных');
    console.log('   2. Firewall блокирует PostgreSQL порты');
    console.log('   3. Supabase изменил параметры подключения');
    console.log('   4. Нужны другие права доступа');
    console.log('   5. Проект заблокирован/неактивен');
    
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    console.log('   1. Проверьте пароль в Supabase Dashboard → Settings → Database');
    console.log('   2. Убедитесь что Database URL корректен');
    console.log('   3. Проверьте статус проекта в Dashboard');
    
    return null;
  }
}

main().then((result) => {
  if (result) {
    console.log('\n🎯 Подключение готово для выполнения операций!');
  } else {
    console.log('\n⚠️ Нужно сначала решить проблемы с подключением');
  }
  process.exit(0);
}).catch(err => {
  console.error('\n💥 Критическая ошибка диагностики:', err);
  process.exit(1);
});