/**
 * Обновление шаблона резервуара в Supabase с полным набором полей
 * Синхронизировано с Tank interface
 */

import { executeSQL } from './tools/sql-direct.js';

async function updateTankTemplate() {
    console.log('🚀 Обновление шаблона резервуара с полным набором полей...');
    
    const updateSQL = `
        UPDATE equipment_templates 
        SET 
            default_params = jsonb_build_object(
                -- Обязательные поля резервуара (синхронизировано с Tank interface)
                'id', 1,
                'name', '',
                'fuelType', '',
                'currentLevelLiters', 0,
                'bookBalance', 0,
                
                -- Параметры емкости
                'capacityLiters', 50000,
                'minLevelPercent', 20,
                'criticalLevelPercent', 10,
                
                -- Физические параметры
                'temperature', 15.0,
                'waterLevelMm', 0.0,
                'density', 0.725,
                
                -- Статус и операционные данные
                'status', 'active',
                'location', 'Зона не указана',
                'installationDate', to_char(NOW(), 'YYYY-MM-DD'),
                'lastCalibration', null,
                'supplier', null,
                
                -- Датчики (полная синхронизация с Tank interface)
                'sensors', jsonb_build_array(
                    jsonb_build_object('name', 'Уровень', 'status', 'ok'),
                    jsonb_build_object('name', 'Температура', 'status', 'ok')
                ),
                'linkedPumps', jsonb_build_array(),
                
                -- Уведомления (полная синхронизация)
                'notifications', jsonb_build_object(
                    'enabled', true,
                    'drainAlerts', true,
                    'levelAlerts', true
                ),
                
                -- Пороговые значения (полная синхронизация с Tank interface)
                'thresholds', jsonb_build_object(
                    'criticalTemp', jsonb_build_object(
                        'min', -10,
                        'max', 40
                    ),
                    'maxWaterLevel', 15,
                    'notifications', jsonb_build_object(
                        'critical', true,
                        'minimum', true,
                        'temperature', true,
                        'water', true
                    )
                ),
                
                -- Системные поля (добавлены для полной синхронизации с Tank interface)
                'trading_point_id', '',
                'created_at', NOW()::text,
                'updated_at', NOW()::text
            ),
            updated_at = NOW()
        WHERE system_type = 'fuel_tank' AND name = 'Резервуар';
    `;

    try {
        console.log('📝 Выполняю SQL обновление...');
        const result = await executeSQL(updateSQL);
        console.log('✅ Обновление выполнено успешно!');
        
        // Проверяем результат
        console.log('\n🔍 Проверяем обновленный шаблон...');
        const checkSQL = `
            SELECT 
                name, 
                system_type, 
                jsonb_pretty(default_params) as formatted_params
            FROM equipment_templates 
            WHERE system_type = 'fuel_tank'
            ORDER BY name;
        `;
        
        const checkResult = await executeSQL(checkSQL);
        console.log('📊 Проверка завершена!');
        
        // Показываем количество полей
        const countSQL = `
            SELECT 
                name,
                jsonb_object_keys(default_params) as param_key
            FROM equipment_templates 
            WHERE system_type = 'fuel_tank';
        `;
        
        const countResult = await executeSQL(countSQL);
        if (countResult && countResult.length > 0) {
            console.log(`\n📈 Количество полей в шаблоне: ${countResult.length}`);
            console.log('🔑 Поля:', countResult.map(r => r.param_key).sort().join(', '));
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка при обновлении шаблона:', error);
        return false;
    }
}

// Запуск если вызван напрямую
if (process.argv[1].endsWith('execute_tank_update.js')) {
    updateTankTemplate()
        .then(success => {
            if (success) {
                console.log('\n🎉 Обновление шаблона резервуара завершено успешно!');
                console.log('🏷️  Все поля из Tank interface теперь доступны в default_params');
                process.exit(0);
            } else {
                console.log('\n💥 Обновление не выполнено из-за ошибок');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💀 Критическая ошибка:', error);
            process.exit(1);
        });
}

export { updateTankTemplate };