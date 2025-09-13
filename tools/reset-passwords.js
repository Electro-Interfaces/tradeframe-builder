/**
 * Утилита для сброса паролей пользователей
 * Устанавливает временные пароли для пользователей в базе данных
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Настройки Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Хеширование пароля с PBKDF2 (совместимо с CryptoUtils)
 */
async function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, Buffer.from(salt, 'base64'), 100000, 32, 'sha256', (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString('base64'));
    });
  });
}

/**
 * Генерация соли
 */
function generateSalt() {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Генерация временного пароля
 */
function generateTempPassword(name) {
  const words = name.split(' ');
  const firstName = words[0] || 'User';
  const randomNum = Math.floor(Math.random() * 99) + 1;
  return `${firstName}${randomNum}!`;
}

/**
 * Сброс паролей для всех активных пользователей
 */
async function resetAllPasswords() {
  try {
    console.log('🔄 Получаем список активных пользователей...');

    // Получаем всех активных пользователей
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('status', 'active')
      .is('deleted_at', null);

    if (error) {
      console.error('❌ Ошибка получения пользователей:', error);
      return;
    }

    if (!users || users.length === 0) {
      console.log('⚠️ Пользователи не найдены');
      return;
    }

    console.log(`📋 Найдено пользователей: ${users.length}`);
    console.log('\n🔐 Генерируем новые пароли:\n');

    const userCredentials = [];

    for (const user of users) {
      // Генерируем временный пароль
      const tempPassword = generateTempPassword(user.name);

      // Генерируем соль и хеш
      const salt = generateSalt();
      const hash = await hashPassword(tempPassword, salt);

      // Обновляем пароль в базе
      const { error: updateError } = await supabase
        .from('users')
        .update({
          pwd_salt: salt,
          pwd_hash: hash,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error(`❌ Ошибка обновления пароля для ${user.email}:`, updateError);
      } else {
        console.log(`✅ ${user.email} -> ${tempPassword}`);
        userCredentials.push({
          email: user.email,
          name: user.name,
          password: tempPassword
        });
      }
    }

    // Сохраняем данные в файл
    const fs = await import('fs');
    const credentialsData = {
      generated_at: new Date().toISOString(),
      note: 'Временные пароли сгенерированы автоматически. После входа пользователи должны сменить пароли.',
      users: userCredentials
    };

    await fs.promises.writeFile(
      'temp-passwords.json',
      JSON.stringify(credentialsData, null, 2)
    );

    console.log('\n📄 Данные сохранены в файл temp-passwords.json');
    console.log('\n⚠️ ВАЖНО:');
    console.log('1. Передайте пользователям их временные пароли');
    console.log('2. Попросите их сменить пароли при первом входе');
    console.log('3. Удалите файл temp-passwords.json после передачи паролей');

  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

// Запуск утилиты
if (process.argv.includes('--reset')) {
  resetAllPasswords();
} else {
  console.log('🔧 Утилита сброса паролей пользователей');
  console.log('\nИспользование:');
  console.log('node tools/reset-passwords.js --reset');
  console.log('\n⚠️ ВНИМАНИЕ: Эта команда изменит пароли всех активных пользователей!');
}