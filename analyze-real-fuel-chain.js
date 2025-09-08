/**
 * 🔗 Анализ реальной цепочки связей топлива
 * 
 * РЕАЛЬНАЯ ЦЕПОЧКА:
 * fuel_types → tanks.fuel_type_id → operations.fuel_type
 * nomenclature (параллельный справочник)
 * equipment (резервуары fuel_tank без прямой связи с видом топлива в шаблонах)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`[${timestamp}] ${icon} ${message}`);
}

async function analyzeRealFuelChain() {
    log('🔗 АНАЛИЗ РЕАЛЬНОЙ ЦЕПОЧКИ СВЯЗЕЙ ТОПЛИВА В ДЕМО СЕТИ АЗС...\n');
    
    const chainData = {
        fuelTypes: [],
        nomenclature: [],
        tanks: [],
        equipment: [],
        operations: []
    };
    
    try {
        // 1. СПРАВОЧНИК ВИДОВ ТОПЛИВА (fuel_types)
        log('🔥 1. ЗАГРУЗКА СПРАВОЧНИКА fuel_types...');
        const { data: fuelTypes } = await supabase
            .from('fuel_types')
            .select('*');
        chainData.fuelTypes = fuelTypes || [];
        
        log(`   ✅ Видов топлива в fuel_types: ${chainData.fuelTypes.length}`, 'success');
        chainData.fuelTypes.forEach(fuel => {
            log(`      • ${fuel.name} (${fuel.code}) - ${fuel.category}`);
        });

        // 2. СПРАВОЧНИК НОМЕНКЛАТУРЫ (nomenclature)
        log('\n📚 2. ЗАГРУЗКА СПРАВОЧНИКА nomenclature...');
        const { data: nomenclature } = await supabase
            .from('nomenclature')
            .select('*');
        chainData.nomenclature = nomenclature || [];
        
        log(`   ✅ Видов топлива в nomenclature: ${chainData.nomenclature.length}`, 'success');
        chainData.nomenclature.forEach(fuel => {
            log(`      • ${fuel.name} (${fuel.internal_code})`);
        });

        // 3. РЕЗЕРВУАРЫ (tanks) - основная связь через fuel_type_id
        log('\n🛢️ 3. ЗАГРУЗКА РЕЗЕРВУАРОВ tanks...');
        const { data: tanks } = await supabase
            .from('tanks')
            .select('*');
        chainData.tanks = tanks || [];
        
        log(`   ✅ Резервуаров: ${chainData.tanks.length}`, 'success');
        chainData.tanks.forEach(tank => {
            log(`      • ${tank.name}: fuel_type_id=${tank.fuel_type_id || 'НЕ УКАЗАН'}`);
        });

        // 4. ОБОРУДОВАНИЕ (equipment) - резервуары как оборудование
        log('\n🏭 4. ЗАГРУЗКА ОБОРУДОВАНИЯ equipment (тип fuel_tank)...');
        const { data: equipment } = await supabase
            .from('equipment')
            .select('*')
            .eq('system_type', 'fuel_tank');
        chainData.equipment = equipment || [];
        
        log(`   ✅ Оборудование типа резервуар: ${chainData.equipment.length}`, 'success');
        chainData.equipment.forEach(equip => {
            log(`      • ${equip.display_name}`);
        });

        // 5. ОПЕРАЦИИ (operations) - фактическое использование топлива
        log('\n💰 5. ЗАГРУЗКА ОПЕРАЦИЙ operations (пример)...');
        const { data: operations } = await supabase
            .from('operations')
            .select('fuel_type')
            .limit(20);
        chainData.operations = operations || [];
        
        const operationsFuels = [...new Set(chainData.operations.map(op => op.fuel_type).filter(Boolean))];
        log(`   ✅ Уникальных видов топлива в операциях: ${operationsFuels.length}`, 'success');
        operationsFuels.forEach(fuel => {
            log(`      • ${fuel}`);
        });

        // 6. АНАЛИЗ СВЯЗЕЙ
        log('\n🔍 АНАЛИЗ ЦЕЛОСТНОСТИ СВЯЗЕЙ:');
        log('=' * 50);
        
        const issues = [];
        
        // Собираем все виды топлива из разных источников
        const fuelTypeNames = new Set(chainData.fuelTypes.map(f => f.name));
        const fuelTypeCodes = new Set(chainData.fuelTypes.map(f => f.code));
        const fuelTypeIds = new Set(chainData.fuelTypes.map(f => f.id));
        const nomenclatureNames = new Set(chainData.nomenclature.map(n => n.name));
        const tankFuelTypeIds = new Set(chainData.tanks.map(t => t.fuel_type_id).filter(Boolean));
        const operationFuels = new Set(operationsFuels);

        log('\n📊 СТАТИСТИКА ПО ИСТОЧНИКАМ:');
        log(`🔹 fuel_types: ${fuelTypeNames.size} видов (${Array.from(fuelTypeNames).join(', ')})`);
        log(`🔹 nomenclature: ${nomenclatureNames.size} видов (${Array.from(nomenclatureNames).join(', ')})`);
        log(`🔹 tanks с fuel_type_id: ${tankFuelTypeIds.size} связей`);
        log(`🔹 operations: ${operationFuels.size} видов (${Array.from(operationFuels).join(', ')})`);

        // Проверка 1: Резервуары должны ссылаться на существующие fuel_types
        log('\n🔍 ПРОВЕРКА 1: Связь tanks.fuel_type_id → fuel_types.id');
        let tanksFuelMismatches = 0;
        chainData.tanks.forEach(tank => {
            if (tank.fuel_type_id) {
                if (!fuelTypeIds.has(tank.fuel_type_id)) {
                    issues.push(`❌ Резервуар "${tank.name}" ссылается на несуществующий fuel_type_id: ${tank.fuel_type_id}`);
                    tanksFuelMismatches++;
                } else {
                    const fuelType = chainData.fuelTypes.find(f => f.id === tank.fuel_type_id);
                    log(`   ✅ ${tank.name} → ${fuelType ? fuelType.name : 'неизвестно'}`);
                }
            } else {
                issues.push(`⚠️ Резервуар "${tank.name}" не имеет fuel_type_id`);
            }
        });

        // Проверка 2: Соответствие nomenclature и fuel_types
        log('\n🔍 ПРОВЕРКА 2: Соответствие nomenclature ↔ fuel_types');
        const nomenclatureNotInFuelTypes = [...nomenclatureNames].filter(name => !fuelTypeNames.has(name));
        const fuelTypesNotInNomenclature = [...fuelTypeNames].filter(name => !nomenclatureNames.has(name));
        
        if (nomenclatureNotInFuelTypes.length > 0) {
            issues.push(`⚠️ В nomenclature есть топливо, которого нет в fuel_types: ${nomenclatureNotInFuelTypes.join(', ')}`);
        }
        if (fuelTypesNotInNomenclature.length > 0) {
            issues.push(`⚠️ В fuel_types есть топливо, которого нет в nomenclature: ${fuelTypesNotInNomenclature.join(', ')}`);
        }

        // Проверка 3: Операции используют существующие виды топлива
        log('\n🔍 ПРОВЕРКА 3: Виды топлива в операциях');
        const operationsUnknownFuels = [...operationFuels].filter(fuel => !fuelTypeNames.has(fuel));
        if (operationsUnknownFuels.length > 0) {
            issues.push(`❌ Операции используют неизвестные виды топлива: ${operationsUnknownFuels.join(', ')}`);
        }

        // 7. РЕЗУЛЬТАТЫ
        log('\n📋 ИТОГОВЫЕ РЕЗУЛЬТАТЫ:');
        log('=' * 50);
        
        if (issues.length === 0) {
            log('🎉 ВСЕ СВЯЗИ В ЦЕПОЧКЕ КОРРЕКТНЫ!', 'success');
            log('✅ Целостность данных топлива подтверждена', 'success');
        } else {
            log(`⚠️ Найдено проблем: ${issues.length}`, 'warning');
            issues.forEach(issue => log(issue, 'warning'));
        }

        // 8. РЕКОМЕНДАЦИИ ПО АРХИТЕКТУРЕ
        log('\n💡 АРХИТЕКТУРНЫЕ РЕКОМЕНДАЦИИ:');
        log('1. 📝 Основной справочник: fuel_types (с ID для связей)');
        log('2. 🔗 Резервуары должны ссылаться на fuel_types через fuel_type_id');
        log('3. 💰 Цены следует привязывать к fuel_type_id из резервуаров');
        log('4. ⚖️ nomenclature можно использовать как дополнительный справочник для API');

        return {
            success: issues.length === 0,
            data: chainData,
            issues: issues,
            statistics: {
                fuelTypes: fuelTypeNames.size,
                nomenclature: nomenclatureNames.size,
                tanksWithFuelType: chainData.tanks.filter(t => t.fuel_type_id).length,
                operationFuels: operationFuels.size
            }
        };

    } catch (error) {
        log(`💥 Ошибка анализа: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
}

// Запуск анализа
analyzeRealFuelChain()
    .then(result => {
        if (result.success) {
            log('\n✅ АНАЛИЗ ЦЕПОЧКИ ЗАВЕРШЕН УСПЕШНО', 'success');
        } else {
            log('\n⚠️ АНАЛИЗ ЗАВЕРШЕН С ЗАМЕЧАНИЯМИ', 'warning');
        }
        
        if (result.statistics) {
            log(`\n📊 Итоговая статистика: fuel_types=${result.statistics.fuelTypes}, tanks_linked=${result.statistics.tanksWithFuelType}, operations=${result.statistics.operationFuels}`);
        }
    })
    .catch(error => {
        log(`\n💥 КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`, 'error');
        process.exit(1);
    });