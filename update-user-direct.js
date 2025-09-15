// Прямое обновление пользователя через Supabase API
const SUPABASE_URL = 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

async function updateUser() {
    const updateData = {
        pwd_salt: 'ky8uxsktzy9e1etiin25a5',
        pwd_hash: '6Zn5XLjiisfyWpjw+gqPe0rdrzv41L+d6PaXSoWw8D0=',
        updated_at: new Date().toISOString()
    };

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.L@me.com`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('❌ Ошибка обновления:', response.status, error);
            return;
        }

        const result = await response.json();
        console.log('✅ Пользователь L@me.com обновлен успешно!');
        console.log('📊 Результат:', JSON.stringify(result, null, 2));
        console.log('');
        console.log('🔑 Новые данные для входа:');
        console.log('   Email: l@me.com (или L@me.com)');
        console.log('   Пароль: qwerty');
        console.log('');
        console.log('🚀 Теперь можно войти в систему!');

    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    }
}

updateUser();