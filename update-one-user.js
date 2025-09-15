import { createHash } from 'crypto';

const SUPABASE_URL = 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

function generateSalt() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function createPasswordHash(password, salt) {
    const passwordWithSalt = password + salt;
    const hash = createHash('sha256').update(passwordWithSalt).digest();
    return Buffer.from(hash).toString('base64');
}

async function updateOneUser(email, password) {
    console.log(`=== Обновление пользователя ${email} ===`);

    const salt = generateSalt();
    const hash = createPasswordHash(password, salt);

    console.log('Email:', email);
    console.log('Пароль:', password);
    console.log('Соль:', salt);
    console.log('Хеш:', hash);

    const updateData = {
        pwd_salt: salt,
        pwd_hash: hash,
        updated_at: new Date().toISOString()
    };

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}`, {
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
        console.log('✅ Пользователь обновлен успешно!');
        console.log('📊 Результат:', JSON.stringify(result[0], null, 2));

    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    }
}

// Получаем email и пароль из аргументов командной строки
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
    console.log('Использование: node update-one-user.js <email> <password>');
    console.log('Примеры:');
    console.log('  node update-one-user.js u@me.com 123456');
    console.log('  node update-one-user.js gavrilov@elsyplus.ru qwerty');
    process.exit(1);
}

updateOneUser(email, password);