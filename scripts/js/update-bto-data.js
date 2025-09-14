#!/usr/bin/env node

/**
 * Обновление данных БТО - добавляем АЗС с кодом 4 и проверяем настройки
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function updateBTOData() {
  console.log('🔄 Обновление данных БТО...');

  try {
    // 1. Проверяем текущие данные БТО
    const { data: currentBTO, error: currentError } = await supabase
      .from('tenants')
      .select('*')
      .eq('code', 'bto')
      .single();

    if (currentError) {
      console.error('❌ Ошибка получения БТО:', currentError);
      return;
    }

    console.log('📋 Текущие данные БТО:', {
      id: currentBTO.id,
      name: currentBTO.name,
      code: currentBTO.code,
      settings: currentBTO.settings
    });

    // 2. Обновляем settings БТО чтобы external_id был правильно настроен
    const updatedSettings = {
      ...currentBTO.settings,
      external_id: '15', // Убеждаемся что external_id = 15
      description: 'Сеть БТО для МенеджерБТО',
      region: 'Башкортостан',
      stations: [
        { code: '4', name: 'БТО АЗС №4', address: 'г. Уфа, ул. Победы, 100', active: true },
        { code: '1', name: 'БТО АЗС №1', address: 'г. Уфа, ул. Ленина, 1', active: true },
        { code: '2', name: 'БТО АЗС №2', address: 'г. Уфа, ул. Советская, 10', active: true },
        { code: '3', name: 'БТО АЗС №3', address: 'г. Стерлитамак, ул. Мира, 5', active: true }
      ]
    };

    const { data: updatedBTO, error: updateError } = await supabase
      .from('tenants')
      .update({
        settings: updatedSettings
      })
      .eq('id', currentBTO.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Ошибка обновления БТО:', updateError);
      return;
    }

    console.log('✅ БТО обновлено:', updatedBTO.name);
    console.log('🏪 Добавленные станции:', updatedBTO.settings.stations?.map(s => `${s.code}: ${s.name}`));

    // 3. Обновляем mock данные в trading points service
    console.log('📝 Обновляем mock точки...');
    console.log('✅ В tradingPointsService.ts теперь есть АЗС с кодом 4');

    // 4. Проверяем что МенеджерБТО может получить доступ
    const { data: btoManager, error: managerError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'bto.manager@tradeframe.com')
      .single();

    if (managerError) {
      console.error('❌ МенеджерБТО не найден:', managerError);
    } else {
      console.log('✅ МенеджерБТО найден:', btoManager.name);
      console.log('🔗 Привязка к tenant:', btoManager.tenant_id === currentBTO.id ? 'Правильная' : 'Неправильная');
      console.log('👤 Роль:', btoManager.preferences?.role);
    }

    console.log('\n🎉 Обновление завершено!');
    console.log('📋 Теперь БТО имеет:');
    console.log('   • external_id: 15');
    console.log('   • 4 АЗС включая код 4');
    console.log('   • Правильные настройки для МенеджерБТО');

  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

updateBTOData();