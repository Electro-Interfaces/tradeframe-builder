#!/usr/bin/env node

/**
 * Создание учетной записи суперадминистратора
 */

import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';

const SUPABASE_URL = 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function createSuperAdmin() {
  console.log('🔄 Создание учетной записи суперадминистратора...');

  try {
    const email = 'superadmin@tradeframe.com';
    const password = 'SuperAdmin2024!';
    const name = 'Системный Администратор';
    
    // 1. Проверяем, существует ли уже такой пользователь
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser && !checkError) {
      console.log('⚠️  Суперадминистратор уже существует:', existingUser.name);
      console.log('📧 Email:', existingUser.email);
      console.log('🆔 ID:', existingUser.id);
      console.log('🏢 Tenant ID:', existingUser.tenant_id);
      return;
    }

    // 2. Создаем или находим системный тенант
    let systemTenantId;
    const { data: systemTenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('code', 'system')
      .single();

    if (systemTenant) {
      systemTenantId = systemTenant.id;
      console.log('✅ Найден системный тенант:', systemTenant.name);
    } else {
      console.log('🏢 Создаем системный тенант...');
      const { data: newTenant, error: createTenantError } = await supabase
        .from('tenants')
        .insert([{
          name: 'Система TradeControl',
          code: 'system',
          type: 'system',
          is_active: true,
          settings: {
            description: 'Системный тенант для администраторов',
            external_id: '0'
          }
        }])
        .select()
        .single();

      if (createTenantError) {
        console.error('❌ Ошибка создания системного тенанта:', createTenantError);
        return;
      }
      
      systemTenantId = newTenant.id;
      console.log('✅ Системный тенант создан:', newTenant.name);
    }

    // 3. Генерируем хэш пароля
    const saltRounds = 12;
    const salt = await bcrypt.genSalt(saltRounds);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Создаем пользователя
    const userData = {
      email: email,
      name: name,
      phone: '+7 (800) 555-35-35',
      status: 'active',
      pwd_salt: salt,
      pwd_hash: passwordHash,
      tenant_id: systemTenantId, // Привязываем к системному тенанту
      preferences: {
        role: 'system_admin',
        role_id: 1,
        description: 'Системный администратор с полными правами доступа',
        permissions: ['all'],
        settings: {
          theme: 'dark',
          language: 'ru',
          notifications: true
        }
      },
      last_login: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    };

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (createError) {
      console.error('❌ Ошибка создания пользователя:', createError);
      return;
    }

    console.log('✅ Суперадминистратор создан успешно!');
    console.log('👤 Имя:', newUser.name);
    console.log('📧 Email:', newUser.email);
    console.log('🔑 Пароль:', password);
    console.log('🆔 ID:', newUser.id);
    console.log('👑 Роль:', newUser.preferences.role);
    console.log('');
    console.log('🎉 Теперь вы можете войти в систему как суперадминистратор:');
    console.log('   Email: superadmin@tradeframe.com');
    console.log('   Пароль: SuperAdmin2024!');
    console.log('');
    console.log('🔒 Суперадминистратор имеет полный доступ ко всем разделам системы.');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

createSuperAdmin();