/**
 * 🧹 Прямая очистка таблицы equipment от fuel_tank записей
 */

import { supabaseService } from './src/services/supabaseServiceClient.js';

async function cleanupEquipmentTanks() {
    console.log('🧹 НАЧИНАЕМ ОЧИСТКУ ТАБЛИЦЫ EQUIPMENT ОТ FUEL_TANK ЗАПИСЕЙ...');
    
    try {
        // 1. Сначала проверим что у нас есть
        console.log('🔍 Шаг 1: Проверяем существующие fuel_tank записи...');
        const { data: existingRecords, error: selectError } = await supabaseService
            .from('equipment')
            .select('*')
            .eq('system_type', 'fuel_tank');

        if (selectError) {
            console.error('❌ Ошибка при проверке записей:', selectError);
            return;
        }

        console.log(`📊 Найдено ${existingRecords.length} записей fuel_tank для удаления`);
        
        if (existingRecords.length === 0) {
            console.log('✅ Записи fuel_tank не найдены - очистка не требуется');
            return;
        }

        // Показываем что именно будем удалять
        existingRecords.forEach((record, index) => {
            console.log(`   ${index + 1}. ${record.display_name || record.name} (ID: ${record.id})`);
        });

        // 2. Удаляем все fuel_tank записи
        console.log('\n🗑️ Шаг 2: Удаляем все fuel_tank записи...');
        const { error: deleteError } = await supabaseService
            .from('equipment')
            .delete()
            .eq('system_type', 'fuel_tank');

        if (deleteError) {
            console.error('❌ Ошибка при удалении записей:', deleteError);
            return;
        }

        console.log(`✅ УСПЕШНО УДАЛЕНО ${existingRecords.length} записей fuel_tank из таблицы equipment`);

        // 3. Проверяем результат
        console.log('\n✅ Шаг 3: Проверяем результат очистки...');
        const { data: remainingRecords, error: checkError } = await supabaseService
            .from('equipment')
            .select('count')
            .eq('system_type', 'fuel_tank');

        if (checkError) {
            console.error('❌ Ошибка при проверке результата:', checkError);
            return;
        }

        console.log('✅ ОЧИСТКА ЗАВЕРШЕНА УСПЕШНО!');
        console.log('🎉 Теперь система должна обращаться к внешнему API для получения данных резервуаров');
        console.log('🔄 Обновите страницу резервуаров для проверки: http://localhost:3005/point/tanks');

    } catch (error) {
        console.error('❌ КРИТИЧЕСКАЯ ОШИБКА при очистке:', error);
    }
}

// Запускаем очистку
cleanupEquipmentTanks();