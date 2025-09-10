#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkUsers() {
  console.log('🔍 Проверяем пользователей в базе данных...');
  
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, name, status, preferences')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('❌ Ошибка:', error);
    return;
  }
  
  console.log('📋 Найденные пользователи:');
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.name}`);
    console.log(`   📧 Email: ${user.email}`);
    console.log(`   👑 Роль: ${user.preferences?.role || 'не указана'}`);
    console.log(`   🔒 Статус: ${user.status}`);
    console.log('');
  });
  
  console.log(`📊 Всего пользователей в базе: ${users.length}`);
}

checkUsers();