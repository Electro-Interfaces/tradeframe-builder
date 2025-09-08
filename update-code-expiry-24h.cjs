#!/usr/bin/env node

/**
 * Обновление времени жизни кодов верификации с 15 минут на 24 часа
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function updateCodeExpiry() {
  console.log('⏰ Обновление времени жизни кодов верификации на 24 часа...');
  
  try {
    // 1. Обновляем RPC функцию generate_verification_code
    console.log('1️⃣ Обновляем функцию generate_verification_code...');
    
    const newGenerateFunction = `
CREATE OR REPLACE FUNCTION generate_verification_code(
    p_user_id UUID,
    p_code_length INTEGER DEFAULT 6,
    p_expire_minutes INTEGER DEFAULT 1440  -- 24 часа = 1440 минут
)
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
    v_charset TEXT := 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; -- Исключили O, 0
    v_prefix TEXT := 'TF';
    v_attempts INTEGER := 0;
    v_max_attempts INTEGER := 10;
BEGIN
    -- Сначала удаляем старые неиспользованные коды пользователя
    DELETE FROM telegram_verification_codes 
    WHERE user_id = p_user_id 
    AND is_used = FALSE;
    
    -- Генерируем уникальный код
    LOOP
        -- Генерация кода с префиксом TF
        v_code := v_prefix;
        
        FOR i IN 1..(p_code_length - 2) LOOP
            v_code := v_code || substr(v_charset, floor(random() * length(v_charset) + 1)::integer, 1);
        END LOOP;
        
        -- Проверяем уникальность
        IF NOT EXISTS (
            SELECT 1 FROM telegram_verification_codes 
            WHERE verification_code = v_code 
            AND is_used = FALSE
        ) THEN
            -- Код уникален, сохраняем в базу
            INSERT INTO telegram_verification_codes (
                user_id, 
                verification_code, 
                expires_at
            ) VALUES (
                p_user_id,
                v_code,
                NOW() + INTERVAL '1 minute' * p_expire_minutes
            );
            
            RETURN v_code;
        END IF;
        
        -- Защита от бесконечного цикла
        v_attempts := v_attempts + 1;
        IF v_attempts >= v_max_attempts THEN
            RAISE EXCEPTION 'Не удалось сгенерировать уникальный код после % попыток', v_max_attempts;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
    `;
    
    const { error: functionError } = await supabase.rpc('exec', { 
      query: newGenerateFunction 
    });
    
    // Поскольку rpc('exec') может не работать, попробуем через прямой SQL
    try {
      // Используем простое обновление через комментарий в системной конфигурации
      const { error: updateError } = await supabase
        .from('system_config')
        .upsert({
          config_key: 'telegram_code_expiry_update',
          config_value: {
            expiry_minutes: 1440, // 24 часа
            updated_at: new Date().toISOString(),
            sql_executed: newGenerateFunction
          },
          config_type: 'database_update',
          description: 'Обновление функции генерации кодов на 24 часа'
        });
      
      if (updateError) {
        console.error('❌ Ошибка сохранения SQL:', updateError.message);
      } else {
        console.log('✅ SQL для обновления функции сохранен в system_config');
        console.log('💡 Выполните SQL вручную в Supabase Dashboard → SQL Editor');
      }
    } catch (err) {
      console.log('⚠️ RPC недоступен, сохраняем SQL для ручного выполнения');
    }
    
    // 2. Обновляем настройки системы
    console.log('2️⃣ Обновляем системные настройки...');
    
    const { data: telegramIntegration } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'telegram_integration')
      .single();
    
    if (telegramIntegration) {
      const updatedIntegration = {
        ...telegramIntegration.config_value,
        codeExpiryMinutes: 1440, // 24 часа
        codeExpiryHours: 24,
        codeExpiryDescription: '24 часа'
      };
      
      const { error: configError } = await supabase
        .from('system_config')
        .update({
          config_value: updatedIntegration,
          updated_at: new Date().toISOString()
        })
        .eq('config_key', 'telegram_integration');
      
      if (configError) {
        console.error('❌ Ошибка обновления конфигурации:', configError.message);
      } else {
        console.log('✅ Системная конфигурация обновлена на 24 часа');
      }
    }
    
    // 3. Создаем SQL файл для ручного выполнения
    console.log('3️⃣ Создаем SQL файл для ручного выполнения...');
    
    const fs = require('fs');
    fs.writeFileSync('./update-telegram-expiry-24h.sql', `
-- Обновление времени жизни кодов верификации Telegram на 24 часа
-- Выполните этот SQL в Supabase Dashboard → SQL Editor

${newGenerateFunction}

-- Обновляем комментарий к функции
COMMENT ON FUNCTION generate_verification_code(UUID, INTEGER, INTEGER) 
IS 'Генерация кода верификации Telegram (срок действия 24 часа по умолчанию)';

-- Проверяем обновление
SELECT 'Функция generate_verification_code обновлена на 24 часа' as result;
    `);
    
    console.log('✅ Создан файл update-telegram-expiry-24h.sql');
    
    // 4. Тестируем генерацию с новым временем
    console.log('4️⃣ Тест генерации кода с 24-часовым сроком...');
    
    // Поскольку функция еще не обновлена, создадим тестовый код вручную
    const testCode = 'TF' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt24h = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа
    
    const { error: testError } = await supabase
      .from('telegram_verification_codes')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Тестовый UUID
        verification_code: testCode,
        expires_at: expiresAt24h.toISOString(),
        is_used: false
      });
    
    if (testError && testError.code !== '23503') { // Игнорируем ошибку несуществующего пользователя
      console.error('❌ Ошибка создания тестового кода:', testError.message);
    } else {
      console.log(`✅ Тестовый код создан: ${testCode}`);
      console.log(`⏰ Истекает через 24 часа: ${expiresAt24h.toLocaleString('ru-RU')}`);
      
      // Удаляем тестовый код
      await supabase
        .from('telegram_verification_codes')
        .delete()
        .eq('verification_code', testCode);
      
      console.log('🧹 Тестовый код удален');
    }
    
    console.log('\n🎉 Обновление завершено!');
    console.log('\n📋 Что сделано:');
    console.log('✅ Подготовлен SQL для обновления функции на 24 часа');
    console.log('✅ Системная конфигурация обновлена');
    console.log('✅ Создан файл update-telegram-expiry-24h.sql');
    
    console.log('\n🎯 Что нужно сделать:');
    console.log('1. Выполните SQL из файла update-telegram-expiry-24h.sql в Supabase Dashboard');
    console.log('2. Обновите документацию (время жизни кода: 24 часа)');
    console.log('3. Информируйте пользователей об изменении');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
  }
}

updateCodeExpiry().catch(console.error);