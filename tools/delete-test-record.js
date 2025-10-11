/**
 * Удаление тестовой записи из журнала аудита
 */

const SUPABASE_URL = 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

async function deleteTestRecord() {
  console.log('🗑️  Удаляю тестовую запись...\n');

  try {
    // Удаляем записи с email test@example.com
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/audit_log?user_email=eq.test@example.com`,
      {
        method: 'DELETE',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ошибка: ${response.status} - ${error}`);
    }

    console.log('✅ Тестовая запись удалена!\n');

    // Проверяем, что запись действительно удалена
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/audit_log?select=*&order=created_at.desc&limit=10`,
      {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`
        }
      }
    );

    if (checkResponse.ok) {
      const logs = await checkResponse.json();
      console.log(`📊 Осталось записей в журнале: ${logs.length}\n`);

      logs.forEach((log, index) => {
        console.log(`${index + 1}. ${log.user_name} (${log.user_email}) - ${log.action}`);
      });
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

deleteTestRecord();
