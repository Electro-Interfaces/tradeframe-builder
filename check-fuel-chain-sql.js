/**
 * 🔗 Проверка целостности цепочки данных топлива через SQL запросы
 * Номенклатура → Оборудование → Резервуары → Цены
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

async function checkFuelChainIntegrity() {
    log('🚀 Запуск проверки целостности цепочки данных топлива...\n');
    
    const chainData = {
        nomenclature: [],
        equipment: [],
        tanks: [],
        prices: []
    };
    
    const issues = [];
    
    try {
        // 1. НОМЕНКЛАТУРА (справочник видов топлива)
        log('📚 1. ПРОВЕРКА СПРАВОЧНИКА НОМЕНКЛАТУРЫ...');
        
        // Проверим есть ли таблица номенклатуры
        const { data: nomenclatureData, error: nomenclatureError } = await supabase
            .from('nomenclature')
            .select('*');
            
        if (nomenclatureError && nomenclatureError.code === 'PGRST116') {
            log('⚠️ Таблица nomenclature не найдена, используем демо-данные номенклатуры', 'warning');
            chainData.nomenclature = [
                { name: 'АИ-92', code: '92', type: 'gasoline' },
                { name: 'АИ-95', code: '95', type: 'gasoline' },
                { name: 'АИ-98', code: '98', type: 'gasoline' },
                { name: 'ДТ', code: 'DT', type: 'diesel' },
                { name: 'ДТ Арктика', code: 'DT-A', type: 'diesel' }
            ];
        } else {
            chainData.nomenclature = nomenclatureData || [];
        }
        
        log(`   ✅ Видов топлива в справочнике: ${chainData.nomenclature.length}`, 'success');
        chainData.nomenclature.forEach(fuel => {
            log(`      • ${fuel.name} (${fuel.code})`);
        });

        // 2. ОБОРУДОВАНИЕ (резервуары)
        log('\n🛢️ 2. ПРОВЕРКА ОБОРУДОВАНИЯ (резервуары)...');
        
        const { data: equipmentData, error: equipmentError } = await supabase
            .from('equipment_templates')
            .select('*')
            .eq('type', 'tank');
            
        if (equipmentError) {
            log(`❌ Ошибка загрузки оборудования: ${equipmentError.message}`, 'error');
        } else {
            chainData.equipment = equipmentData || [];
            log(`   ✅ Резервуаров в оборудовании: ${chainData.equipment.length}`, 'success');
            
            const equipmentFuels = new Set();
            chainData.equipment.forEach(equip => {
                if (equip.fuel_type) {
                    equipmentFuels.add(equip.fuel_type);
                    log(`      • ${equip.name}: ${equip.fuel_type}`);
                }
            });
            
            log(`   📊 Уникальных видов топлива в оборудовании: ${equipmentFuels.size}`);
        }

        // 3. РЕЗЕРВУАРЫ (раздел резервуаров)
        log('\n🏭 3. ПРОВЕРКА РАЗДЕЛА РЕЗЕРВУАРЫ...');
        
        const { data: tanksData, error: tanksError } = await supabase
            .from('tanks')
            .select('*');
            
        if (tanksError) {
            log(`❌ Ошибка загрузки резервуаров: ${tanksError.message}`, 'error');
        } else {
            chainData.tanks = tanksData || [];
            log(`   ✅ Резервуаров в разделе: ${chainData.tanks.length}`, 'success');
            
            const tankFuels = new Set();
            chainData.tanks.forEach(tank => {
                if (tank.fuel_type) {
                    tankFuels.add(tank.fuel_type);
                    log(`      • ${tank.name || tank.tank_number}: ${tank.fuel_type}`);
                }
            });
            
            log(`   📊 Уникальных видов топлива в резервуарах: ${tankFuels.size}`);
        }

        // 4. ЦЕНЫ
        log('\n💰 4. ПРОВЕРКА ЦЕНЫ...');
        
        const { data: pricesData, error: pricesError } = await supabase
            .from('prices')
            .select('*');
            
        if (pricesError) {
            log(`❌ Ошибка загрузки цен: ${pricesError.message}`, 'error');
        } else {
            chainData.prices = pricesData || [];
            log(`   ✅ Записей цен: ${chainData.prices.length}`, 'success');
            
            const priceFuels = new Set();
            chainData.prices.forEach(price => {
                if (price.fuel_type) {
                    priceFuels.add(price.fuel_type);
                    log(`      • ${price.fuel_type}: ${price.price || price.current_price || 'цена не указана'}`);
                }
            });
            
            log(`   📊 Уникальных видов топлива с ценами: ${priceFuels.size}`);
        }

        // 5. ВАЛИДАЦИЯ ЦЕЛОСТНОСТИ
        log('\n🔍 5. ВАЛИДАЦИЯ ЦЕЛОСТНОСТИ ЦЕПОЧКИ...');
        
        // Проверка 1: Виды топлива в оборудовании должны быть из номенклатуры
        const nomenclatureFuels = new Set(chainData.nomenclature.map(n => n.name));
        const equipmentFuels = new Set();
        
        chainData.equipment.forEach(equip => {
            if (equip.fuel_type) {
                equipmentFuels.add(equip.fuel_type);
                if (!nomenclatureFuels.has(equip.fuel_type)) {
                    issues.push(`❌ Топливо "${equip.fuel_type}" в оборудовании отсутствует в номенклатуре`);
                }
            }
        });

        // Проверка 2: Резервуары должны соответствовать оборудованию
        const tankFuels = new Set();
        chainData.tanks.forEach(tank => {
            if (tank.fuel_type) {
                tankFuels.add(tank.fuel_type);
                if (!equipmentFuels.has(tank.fuel_type)) {
                    issues.push(`⚠️ Резервуар с топливом "${tank.fuel_type}" не имеет соответствующего оборудования`);
                }
            }
        });

        // Проверка 3: Цены только для существующих резервуаров  
        chainData.prices.forEach(price => {
            if (price.fuel_type && !tankFuels.has(price.fuel_type)) {
                issues.push(`❌ Цена для топлива "${price.fuel_type}" установлена, но нет соответствующих резервуаров`);
            }
        });

        // 6. РЕЗУЛЬТАТЫ
        log('\n📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ ЦЕЛОСТНОСТИ:');
        log('=' * 60);
        
        log(`📚 Номенклатура: ${chainData.nomenclature.length} видов топлива`);
        log(`🛢️ Оборудование: ${chainData.equipment.length} резервуаров (${equipmentFuels.size} видов топлива)`);
        log(`🏭 Резервуары: ${chainData.tanks.length} резервуаров (${tankFuels.size} видов топлива)`);
        log(`💰 Цены: ${chainData.prices.length} записей цен`);
        
        if (issues.length === 0) {
            log('\n🎉 ЦЕПОЧКА ПОЛНОСТЬЮ ЦЕЛОСТНА!', 'success');
            log('✅ Все виды топлива корректно связаны от номенклатуры до цен', 'success');
        } else {
            log(`\n⚠️ Обнаружено проблем: ${issues.length}`, 'warning');
            issues.forEach(issue => log(issue, 'warning'));
        }

        // 7. РЕКОМЕНДАЦИИ
        log('\n💡 РЕКОМЕНДАЦИИ:');
        if (nomenclatureFuels.size > 0 && equipmentFuels.size > 0) {
            const unusedNomenclature = [...nomenclatureFuels].filter(fuel => !equipmentFuels.has(fuel));
            if (unusedNomenclature.length > 0) {
                log(`📝 Неиспользуемые виды топлива из номенклатуры: ${unusedNomenclature.join(', ')}`);
            }
        }
        
        if (equipmentFuels.size > 0 && tankFuels.size > 0) {
            const unusedEquipment = [...equipmentFuels].filter(fuel => !tankFuels.has(fuel));
            if (unusedEquipment.length > 0) {
                log(`📝 Виды топлива из оборудования без резервуаров: ${unusedEquipment.join(', ')}`);
            }
        }

        return {
            success: issues.length === 0,
            data: chainData,
            issues: issues
        };

    } catch (error) {
        log(`💥 Критическая ошибка: ${error.message}`, 'error');
        return {
            success: false,
            error: error.message
        };
    }
}

// Запуск проверки
checkFuelChainIntegrity()
    .then(result => {
        if (result.success) {
            log('\n✅ ПРОВЕРКА ЗАВЕРШЕНА УСПЕШНО', 'success');
            process.exit(0);
        } else {
            log('\n⚠️ ПРОВЕРКА ЗАВЕРШЕНА С ЗАМЕЧАНИЯМИ', 'warning');
            process.exit(1);
        }
    })
    .catch(error => {
        log(`\n💥 ФАТАЛЬНАЯ ОШИБКА: ${error.message}`, 'error');
        process.exit(1);
    });