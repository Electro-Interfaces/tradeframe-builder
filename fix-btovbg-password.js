/**
 * Скрипт для исправления пароля пользователя btovbg@mail.ru
 * Обновляет пароль на новый SHA-256 алгоритм
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Простое хеширование SHA-256 (как в новом authService)
async function createPasswordHash(password, salt) {
  const passwordWithSalt = password + salt;

  // Используем SHA-256 если доступен, иначе base64
  if (crypto && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(passwordWithSalt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return btoa(String.fromCharCode(...hashArray));
  } else {
    return btoa(passwordWithSalt);
  }
}

function generateSalt() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function fixBtovbgPassword() {
  console.log('🔧 Исправляем пароль для пользователя btovbg@mail.ru...')

  const email = 'btovbg@mail.ru'
  const password = 'nnnbbbvvv123'

  // Генерируем новую соль и хеш с новым алгоритмом
  const newSalt = generateSalt()
  const newHash = await createPasswordHash(password, newSalt)

  console.log('📝 Новые данные:')
  console.log('Email:', email)
  console.log('Password:', password)
  console.log('New Salt:', newSalt)
  console.log('New Hash:', newHash.substring(0, 20) + '...')

  // Обновляем в базе данных
  const { data, error } = await supabase
    .from('users')
    .update({
      pwd_salt: newSalt,
      pwd_hash: newHash,
      updated_at: new Date().toISOString()
    })
    .eq('email', email)
    .select()

  if (error) {
    console.error('❌ Ошибка обновления:', error)
    return
  }

  if (data && data.length > 0) {
    console.log('✅ Пользователь обновлен успешно!')
    console.log('👤 Данные пользователя:', {
      email: data[0].email,
      name: data[0].name,
      salt: data[0].pwd_salt,
      hash: data[0].pwd_hash.substring(0, 20) + '...'
    })
  } else {
    console.log('⚠️ Пользователь не найден')
  }

  // Проверяем что новый хеш работает
  console.log('\n🔍 Проверяем новый хеш...')
  const testHash = await createPasswordHash(password, newSalt)
  const isValid = testHash === newHash
  console.log('Тест-хеш:', testHash.substring(0, 20) + '...')
  console.log('Совпадение:', isValid ? '✅ ДА' : '❌ НЕТ')
}

// Запускаем скрипт
fixBtovbgPassword().catch(console.error)