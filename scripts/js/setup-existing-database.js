#!/usr/bin/env node

/**
 * Работа с существующей схемой Supabase
 * Создание МенеджерБТО пользователя с учетом реальной структуры БД
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

console.log('🔍 Проверка существующих данных в базе...');

async function checkExistingData() {
  try {
    // Проверяем tenants (networks)
    console.log('\n📋 Checking tenants...');
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*');
      
    if (tenantsError) {
      console.error('❌ Tenants error:', tenantsError);
    } else {
      console.log(`✅ Found ${tenants?.length || 0} tenants:`);
      tenants?.forEach(t => {
        console.log(`   • ${t.name} (code: ${t.code}, id: ${t.id})`);
      });
    }

    // Проверяем roles
    console.log('\n👥 Checking roles...');
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*');
      
    if (rolesError) {
      console.error('❌ Roles error:', rolesError);
    } else {
      console.log(`✅ Found ${roles?.length || 0} roles:`);
      roles?.forEach(r => {
        console.log(`   • ${r.name} (code: ${r.code}, scope: ${r.scope})`);
      });
    }

    // Проверяем users
    console.log('\n👤 Checking users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
      
    if (usersError) {
      console.error('❌ Users error:', usersError);
    } else {
      console.log(`✅ Found ${users?.length || 0} users:`);
      users?.forEach(u => {
        console.log(`   • ${u.name} (${u.email}, tenant_id: ${u.tenant_id})`);
      });
    }

    return { tenants, roles, users };
  } catch (error) {
    console.error('❌ Error checking data:', error);
    return null;
  }
}

async function createBTOInfrastructure() {
  console.log('\n🏗️ Создание инфраструктуры БТО...');

  try {
    // 1. Создать tenant БТО (если не существует)
    let btoTenant = null;
    const { data: existingBTO } = await supabase
      .from('tenants')
      .select('*')
      .eq('code', 'bto')
      .single();

    if (existingBTO) {
      console.log('✅ БТО tenant уже существует:', existingBTO.name);
      btoTenant = existingBTO;
    } else {
      console.log('📝 Создание БТО tenant...');
      const { data: newBTO, error: btoError } = await supabase
        .from('tenants')
        .insert({
          name: 'БТО (Башкирские торговые операции)', 
          code: 'bto',
          type: 'network',
          is_active: true,
          settings: {
            external_id: '15',
            region: 'Башкортостан',
            description: 'Сеть БТО для МенеджерБТО'
          }
        })
        .select()
        .single();

      if (btoError) {
        console.error('❌ Ошибка создания БТО tenant:', btoError);
        return null;
      } else {
        console.log('✅ БТО tenant создан:', newBTO.name);
        btoTenant = newBTO;
      }
    }

    // 2. Создать роль МенеджерБТО (если не существует)
    let btoRole = null;
    const { data: existingRole } = await supabase
      .from('roles')
      .select('*')
      .eq('code', 'bto_manager')
      .single();

    if (existingRole) {
      console.log('✅ Роль МенеджерБТО уже существует:', existingRole.name);
      btoRole = existingRole;
    } else {
      console.log('📝 Создание роли МенеджерБТО...');
      const { data: newRole, error: roleError } = await supabase
        .from('roles')
        .insert({
          code: 'bto_manager',
          name: 'Менеджер БТО',
          description: 'Доступ только к сети БТО и разделам Торговые сети и Торговые точки',
          scope: 'tenant',
          permissions: ['networks.read', 'trading_points.read', 'networks.view_bto', 'points.view_bto'],
          scope_values: [btoTenant.id],
          is_system: false,
          is_active: true
        })
        .select()
        .single();

      if (roleError) {
        console.error('❌ Ошибка создания роли МенеджерБТО:', roleError);
        return null;
      } else {
        console.log('✅ Роль МенеджерБТО создана:', newRole.name);
        btoRole = newRole;
      }
    }

    // 3. Создать пользователя МенеджерБТО (если не существует)
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'bto.manager@tradeframe.com')
      .single();

    if (existingUser) {
      console.log('✅ Пользователь МенеджерБТО уже существует:', existingUser.name);
      
      // Обновляем tenant_id если нужно
      if (existingUser.tenant_id !== btoTenant.id) {
        console.log('🔄 Обновление tenant_id для МенеджерБТО...');
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            tenant_id: btoTenant.id,
            preferences: {
              role: btoRole.code,
              role_id: btoRole.id,
              network_access: 'bto_only'
            }
          })
          .eq('id', existingUser.id);

        if (updateError) {
          console.error('❌ Ошибка обновления пользователя:', updateError);
        } else {
          console.log('✅ Пользователь МенеджерБТО обновлен');
        }
      }
    } else {
      console.log('📝 Создание пользователя МенеджерБТО...');
      
      // Генерируем хэш пароля для admin123
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
            role: btoRole.code,
            role_id: btoRole.id,
            network_access: 'bto_only',
            menu_restrictions: {
              allowed_sections: ['networks', 'trading_points']
            }
          }
        })
        .select()
        .single();

      if (userError) {
        console.error('❌ Ошибка создания пользователя МенеджерБТО:', userError);
        return null;
      } else {
        console.log('✅ Пользователь МенеджерБТО создан:', newUser.name);
      }
    }

    console.log('\n🎉 Инфраструктура БТО создана успешно!');
    console.log('📋 Что создано:');
    console.log(`   • Tenant: ${btoTenant.name} (id: ${btoTenant.id})`);
    console.log(`   • Role: ${btoRole.name} (id: ${btoRole.id})`);
    console.log('   • User: bto.manager@tradeframe.com (password: admin123)');
    console.log('\n🔐 Данные для входа:');
    console.log('   Email: bto.manager@tradeframe.com');
    console.log('   Password: admin123');
    console.log('\n🚀 Готово к тестированию функционала МенеджерБТО!');

    return { btoTenant, btoRole };

  } catch (error) {
    console.error('❌ Ошибка создания инфраструктуры БТО:', error);
    return null;
  }
}

async function main() {
  console.log('🚀 Настройка базы данных для МенеджерБТО...\n');

  // Проверяем существующие данные
  const existingData = await checkExistingData();
  
  if (!existingData) {
    console.error('❌ Не удалось получить данные из базы');
    process.exit(1);
  }

  // Создаем инфраструктуру БТО
  const result = await createBTOInfrastructure();
  
  if (result) {
    console.log('\n✅ Настройка завершена успешно!');
    console.log('Теперь можно тестировать вход в систему через МенеджерБТО');
  } else {
    console.error('\n❌ Настройка не завершена');
    process.exit(1);
  }
}

main().catch(console.error);