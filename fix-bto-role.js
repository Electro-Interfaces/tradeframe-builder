#!/usr/bin/env node

/**
 * Исправление создания роли МенеджерБТО с правильным scope
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixBTORole() {
  console.log('🔧 Исправление роли МенеджерБТО...');

  try {
    // Получаем БТО tenant
    const { data: btoTenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('code', 'bto')
      .single();

    if (tenantError || !btoTenant) {
      console.error('❌ БТО tenant не найден:', tenantError);
      return;
    }

    console.log('✅ БТО tenant найден:', btoTenant.name, `(id: ${btoTenant.id})`);

    // Посмотрим на существующие роли, чтобы понять какие scope используются
    const { data: existingRoles, error: rolesError } = await supabase
      .from('roles')
      .select('*');

    if (rolesError) {
      console.error('❌ Ошибка получения ролей:', rolesError);
      return;
    }

    console.log('📋 Существующие роли и их scope:');
    existingRoles?.forEach(role => {
      console.log(`   • ${role.name}: scope="${role.scope}", permissions=${JSON.stringify(role.permissions)}`);
    });

    // Попробуем создать роль с scope 'network' (как у network_admin)
    console.log('\n📝 Попытка создать роль МенеджерБТО со scope "network"...');
    
    const { data: btoRole, error: roleError } = await supabase
      .from('roles')
      .insert({
        code: 'bto_manager',
        name: 'Менеджер БТО', 
        description: 'Доступ только к сети БТО и разделам Торговые сети и Торговые точки',
        scope: 'network', // Используем тот же scope что и у network_admin
        permissions: ['networks.read', 'trading_points.read'],
        scope_values: [btoTenant.id],
        is_system: false,
        is_active: true
      })
      .select()
      .single();

    if (roleError) {
      console.error('❌ Ошибка создания роли (network scope):', roleError);
      
      // Попробуем с scope 'global'
      console.log('\n📝 Попытка создать роль МенеджерБТО со scope "global"...');
      
      const { data: btoRoleGlobal, error: roleErrorGlobal } = await supabase
        .from('roles')
        .insert({
          code: 'bto_manager',
          name: 'Менеджер БТО',
          description: 'Доступ только к сети БТО и разделам Торговые сети и Торговые точки', 
          scope: 'global', // Используем global scope
          permissions: ['networks.read', 'trading_points.read'],
          scope_values: [], // Пустой для global
          is_system: false,
          is_active: true
        })
        .select()
        .single();

      if (roleErrorGlobal) {
        console.error('❌ Ошибка создания роли (global scope):', roleErrorGlobal);
        
        // Попробуем копировать структуру существующей роли
        const networkAdminRole = existingRoles?.find(r => r.code === 'network_admin');
        if (networkAdminRole) {
          console.log('\n📝 Копирование структуры роли network_admin...');
          
          const { data: btoRoleCopy, error: roleErrorCopy } = await supabase
            .from('roles')
            .insert({
              code: 'bto_manager',
              name: 'Менеджер БТО',
              description: 'Доступ только к сети БТО и разделам Торговые сети и Торговые точки',
              scope: networkAdminRole.scope,
              permissions: networkAdminRole.permissions, // Копируем права network_admin
              scope_values: [btoTenant.id],
              is_system: false,
              is_active: true
            })
            .select()
            .single();

          if (roleErrorCopy) {
            console.error('❌ Ошибка создания роли (копия network_admin):', roleErrorCopy);
            return;
          } else {
            console.log('✅ Роль МенеджерБТО создана (копия network_admin):', btoRoleCopy.name);
            return btoRoleCopy;
          }
        }
        
        return;
      } else {
        console.log('✅ Роль МенеджерБТО создана (global scope):', btoRoleGlobal.name);
        return btoRoleGlobal;
      }
    } else {
      console.log('✅ Роль МенеджерБТО создана (network scope):', btoRole.name);
      return btoRole;
    }

  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

async function createBTOUser(btoRole) {
  console.log('\n👤 Создание пользователя МенеджерБТО...');

  try {
    // Получаем БТО tenant
    const { data: btoTenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('code', 'bto')
      .single();

    if (!btoTenant) {
      console.error('❌ БТО tenant не найден');
      return;
    }

    // Проверяем существует ли уже пользователь
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'bto.manager@tradeframe.com')
      .single();

    if (existingUser) {
      console.log('⚠️ Пользователь МенеджерБТО уже существует:', existingUser.name);
      return existingUser;
    }

    // Создаем пользователя
    const passwordHash = '$2a$10$rI7/WMuM5P7jjUuIIxB2KO7K6YXb3ZxF5rGvlqF7xK8N2YOo6m7K2'; // bcrypt hash для "admin123"
    
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        tenant_id: btoTenant.id,
        email: 'bto.manager@tradeframe.com',
        name: 'Андрей Башкиров (Менеджер БТО)',
        phone: '+7-917-123-45-67',
        status: 'active',
        pwd_hash: passwordHash,
        pwd_salt: 'demo_salt',
        preferences: {
          role: btoRole?.code || 'bto_manager',
          role_id: btoRole?.id || null,
          network_access: 'bto_only',
          tenant_restriction: btoTenant.id,
          menu_restrictions: {
            allowed_sections: ['networks', 'trading_points']
          }
        }
      })
      .select()
      .single();

    if (userError) {
      console.error('❌ Ошибка создания пользователя МенеджерБТО:', userError);
    } else {
      console.log('✅ Пользователь МенеджерБТО создан:', newUser.name);
      console.log('📧 Email:', newUser.email);
      console.log('🔐 Password: admin123');
      console.log('🏢 Tenant:', btoTenant.name);
      
      return newUser;
    }

  } catch (error) {
    console.error('❌ Ошибка создания пользователя:', error);
  }
}

async function main() {
  console.log('🚀 Исправление настройки МенеджерБТО...\n');
  
  const role = await fixBTORole();
  if (role) {
    const user = await createBTOUser(role);
    if (user) {
      console.log('\n🎉 МенеджерБТО настроен успешно!');
      console.log('🔑 Данные для входа:');
      console.log('   Email: bto.manager@tradeframe.com');
      console.log('   Password: admin123');
      console.log('\n🧪 Можно тестировать функционал МенеджерБТО в приложении!');
    }
  }
}

main().catch(console.error);