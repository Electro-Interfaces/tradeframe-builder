import { createHash } from 'crypto';

// Простое хеширование как в authService
function generateSalt() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function createPasswordHash(password, salt) {
    const passwordWithSalt = password + salt;

    // Используем Node.js crypto для SHA-256
    const hash = createHash('sha256').update(passwordWithSalt).digest();
    return Buffer.from(hash).toString('base64');
}

// Генерируем новые данные для L@me.com
const password = 'qwerty';
const salt = generateSalt();
const hash = createPasswordHash(password, salt);

console.log('=== Обновление пользователя L@me.com ===');
console.log('Email:', 'L@me.com');
console.log('Пароль:', password);
console.log('Соль:', salt);
console.log('Хеш:', hash);
console.log('');
console.log('SQL для обновления:');
console.log(`UPDATE users SET pwd_salt = '${salt}', pwd_hash = '${hash}', updated_at = NOW() WHERE email ILIKE 'L@me.com';`);