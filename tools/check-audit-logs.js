/**
 * Проверка записей в журнале аудита
 */

const SUPABASE_URL = 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

async function checkLogs() {
  console.log('🔍 Проверяю журнал аудита...\n');

  try {
    // Получаем все записи
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/audit_log?select=*&order=created_at.desc&limit=10`,
      {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Prefer': 'return=representation'
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ошибка: ${response.status} - ${error}`);
    }

    const logs = await response.json();

    if (logs.length === 0) {
      console.log('❌ Журнал пуст! Записей нет.\n');
      console.log('🔍 Проверяю, где проблема...\n');

      // Проверяем sessionStorage
      console.log('📋 Проверка sessionStorage (используется в NewAuthContext):');
      console.log('   - current_user_email: должен быть установлен при входе');
      console.log('   - auth_timestamp: должен быть установлен при входе\n');

      // Проверяем localStorage
      console.log('📋 Проверка localStorage (используется в auditLogService):');
      console.log('   - tradeframe_user: старый формат (может быть)');
      console.log('   - tradeframe_user_v2: новый формат (может быть)\n');

      console.log('💡 Возможные причины:');
      console.log('   1. auditLogService.getCurrentUser() не находит пользователя');
      console.log('   2. Ошибка при записи в БД (проверьте консоль браузера)');
      console.log('   3. RLS политики блокируют запись\n');

    } else {
      console.log(`✅ Найдено записей: ${logs.length}\n`);

      logs.forEach((log, index) => {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`Запись #${index + 1}:`);
        console.log(`  📅 Время: ${new Date(log.timestamp).toLocaleString('ru-RU')}`);
        console.log(`  👤 Пользователь: ${log.user_name || 'Неизвестно'} (${log.user_email})`);
        console.log(`  🎯 Действие: ${log.action}`);
        console.log(`  📂 Тип: ${log.action_type}`);
        console.log(`  🔧 Объект: ${log.object || '-'}`);
        console.log(`  🌐 IP: ${log.ip_address || '-'}`);
        if (log.details) {
          console.log(`  📝 Детали:`, JSON.stringify(log.details, null, 2));
        }
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

checkLogs();
