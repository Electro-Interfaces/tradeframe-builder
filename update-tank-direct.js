import { createClient } from '@supabase/supabase-js';

// Конфигурация Supabase
const supabaseUrl = 'https://cqwzqkrfyjdcwpovzyrw.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxd3pxa3JmeWpkY3dwb3Z6eXJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTU0NTQ5MSwiZXhwIjoyMDQxMTIxNDkxfQ.3-RZIAQe5JaLZgBD4lKoqGG9U3YkQHt9xQT3yzL4WNE';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function updateTanks() {
  console.log('🔧 Обновление резервуаров для демонстрации различных сценариев...');

  try {
    // 1. АЗС №001 - Центральная: Резервуар АИ-92 - КРИТИЧЕСКИЙ УРОВЕНЬ + неисправный датчик температуры
    console.log('📊 Обновляем Резервуар АИ-92 - АЗС №001 - Центральная...');
    const { data: tank1, error: error1 } = await supabase
      .from('equipment')
      .select('*')
      .eq('display_name', 'Резервуар АИ-92 - АЗС №001 - Центральная')
      .single();

    if (error1) {
      console.error('❌ Ошибка получения резервуара АИ-92 - АЗС №001:', error1);
    } else {
      const updatedParams1 = {
        ...tank1.params,
        'Текущий уровень (л)': 2500,
        'Книжный остаток': 2400,
        'Подтоварная вода': 8,
        'Температура': 16,
        'Датчики': [
          {"название": "Уровень", "статус": "ok"}, 
          {"название": "Температура", "статус": "error"}
        ]
      };

      const { error: updateError1 } = await supabase
        .from('equipment')
        .update({ params: updatedParams1 })
        .eq('id', tank1.id);

      if (updateError1) {
        console.error('❌ Ошибка обновления:', updateError1);
      } else {
        console.log('✅ АИ-92 - АЗС №001 обновлен (Критический уровень: 5%)');
      }
    }

    // 2. АЗС №001 - Центральная: Резервуар АИ-95 - НОРМАЛЬНЫЙ УРОВЕНЬ + высокая температура  
    console.log('📊 Обновляем Резервуар АИ-95 - АЗС №001 - Центральная...');
    const { data: tank2, error: error2 } = await supabase
      .from('equipment')
      .select('*')
      .eq('display_name', 'Резервуар АИ-95 - АЗС №001 - Центральная')
      .single();

    if (error2) {
      console.error('❌ Ошибка получения резервуара АИ-95 - АЗС №001:', error2);
    } else {
      const updatedParams2 = {
        ...tank2.params,
        'Текущий уровень (л)': 32500,
        'Книжный остаток': 32200,
        'Подтоварная вода': 2,
        'Температура': 42
      };

      const { error: updateError2 } = await supabase
        .from('equipment')
        .update({ params: updatedParams2 })
        .eq('id', tank2.id);

      if (updateError2) {
        console.error('❌ Ошибка обновления:', updateError2);
      } else {
        console.log('✅ АИ-95 - АЗС №001 обновлен (Нормальный уровень: 65%, высокая температура)');
      }
    }

    // 3. АЗС №002 - Северная: Резервуар АИ-92 - МИНИМАЛЬНЫЙ УРОВЕНЬ + высокий уровень воды
    console.log('📊 Обновляем Резервуар АИ-92 - АЗС №002 - Северная...');
    const { data: tank3, error: error3 } = await supabase
      .from('equipment')
      .select('*')
      .eq('display_name', 'Резервуар АИ-92 - АЗС №002 - Северная')
      .single();

    if (error3) {
      console.error('❌ Ошибка получения резервуара АИ-92 - АЗС №002:', error3);
    } else {
      const updatedParams3 = {
        ...tank3.params,
        'Текущий уровень (л)': 7200,
        'Книжный остаток': 7100,
        'Подтоварная вода': 12,
        'Температура': 15
      };

      const { error: updateError3 } = await supabase
        .from('equipment')
        .update({ params: updatedParams3 })
        .eq('id', tank3.id);

      if (updateError3) {
        console.error('❌ Ошибка обновления:', updateError3);
      } else {
        console.log('✅ АИ-92 - АЗС №002 обновлен (Минимальный уровень: 18%, высокий уровень воды)');
      }
    }

    // 4. АЗС №002 - Северная: Резервуар АИ-95 - ПОЛНЫЙ резервуар
    console.log('📊 Обновляем Резервуар АИ-95 - АЗС №002 - Северная...');
    const { data: tank4, error: error4 } = await supabase
      .from('equipment')
      .select('*')
      .eq('display_name', 'Резервуар АИ-95 - АЗС №002 - Северная')
      .single();

    if (error4) {
      console.error('❌ Ошибка получения резервуара АИ-95 - АЗС №002:', error4);
    } else {
      const updatedParams4 = {
        ...tank4.params,
        'Текущий уровень (л)': 38000,
        'Книжный остаток': 37800,
        'Подтоварная вода': 0
      };

      const { error: updateError4 } = await supabase
        .from('equipment')
        .update({ params: updatedParams4 })
        .eq('id', tank4.id);

      if (updateError4) {
        console.error('❌ Ошибка обновления:', updateError4);
      } else {
        console.log('✅ АИ-95 - АЗС №002 обновлен (Полный резервуар: 95%)');
      }
    }

    // 5. АЗС №002 - Северная: Резервуар Дизель - СРЕДНИЙ УРОВЕНЬ + отключенные уведомления
    console.log('📊 Обновляем Резервуар Дизель - АЗС №002 - Северная...');
    const { data: tank5, error: error5 } = await supabase
      .from('equipment')
      .select('*')
      .eq('display_name', 'Резервуар Дизель - АЗС №002 - Северная')
      .single();

    if (error5) {
      console.error('❌ Ошибка получения резервуара Дизель - АЗС №002:', error5);
    } else {
      const updatedParams5 = {
        ...tank5.params,
        'Текущий уровень (л)': 20250,
        'Книжный остаток': 20100,
        'Настройки уведомлений': {
          "включены": false,
          "уведомления о сливе": false,
          "уведомления об уровне": false
        }
      };

      const { error: updateError5 } = await supabase
        .from('equipment')
        .update({ params: updatedParams5 })
        .eq('id', tank5.id);

      if (updateError5) {
        console.error('❌ Ошибка обновления:', updateError5);
      } else {
        console.log('✅ Дизель - АЗС №002 обновлен (Средний уровень: 45%, уведомления отключены)');
      }
    }

    console.log('🎉 Обновление резервуаров завершено!');

  } catch (error) {
    console.error('💥 Общая ошибка:', error);
  }
}

updateTanks();