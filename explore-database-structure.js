/**
 * 🔍 Исследование реальной структуры базы данных
 * Определяем какие таблицы есть и их структуру
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

async function exploreTable(tableName, description = '') {
    log(`🔍 Исследование таблицы: ${tableName} ${description}...`);
    
    try {
        // Пробуем получить первые 5 записей для анализа структуры
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(5);

        if (error) {
            log(`   ❌ ${tableName}: ${error.message}`, 'error');
            return null;
        }

        log(`   ✅ ${tableName}: ${data.length} записей`, 'success');
        
        if (data.length > 0) {
            const columns = Object.keys(data[0]);
            log(`   📊 Колонки: ${columns.join(', ')}`);
            
            // Показываем пример данных
            log(`   📝 Пример записи:`);
            const example = data[0];
            Object.keys(example).forEach(key => {
                const value = example[key];
                const displayValue = value === null ? 'null' : 
                                  typeof value === 'string' ? `"${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"` :
                                  value;
                log(`      ${key}: ${displayValue}`);
            });
        } else {
            log(`   📝 Таблица пустая`, 'warning');
        }

        return { tableName, data, columns: data.length > 0 ? Object.keys(data[0]) : [] };
    } catch (error) {
        log(`   ❌ ${tableName}: Исключение - ${error.message}`, 'error');
        return null;
    }
}

async function exploreDatabaseStructure() {
    log('🚀 ИССЛЕДОВАНИЕ СТРУКТУРЫ БАЗЫ ДАННЫХ ДЛЯ ЦЕПОЧКИ ТОПЛИВА...\n');

    const tables = [
        { name: 'nomenclature', desc: '(справочник видов топлива)' },
        { name: 'fuel_types', desc: '(возможный справочник топлива)' },
        { name: 'equipment_templates', desc: '(шаблоны оборудования)' },
        { name: 'equipment', desc: '(реальное оборудование)' },
        { name: 'tanks', desc: '(резервуары)' },
        { name: 'prices', desc: '(цены на топливо)' },
        { name: 'fuel_prices', desc: '(возможная таблица цен)' },
        { name: 'operations', desc: '(операции - могут содержать виды топлива)' }
    ];

    const results = {};

    for (const table of tables) {
        const result = await exploreTable(table.name, table.desc);
        if (result) {
            results[table.name] = result;
        }
        log(''); // Пустая строка для разделения
    }

    // Анализ найденных данных
    log('📊 АНАЛИЗ СТРУКТУРЫ ДЛЯ ЦЕПОЧКИ ТОПЛИВА:');
    log('=' * 60);

    // Ищем поля связанные с видами топлива
    const fuelFields = ['fuel_type', 'fuel_name', 'fuel_id', 'type', 'name', 'product_type'];
    
    Object.entries(results).forEach(([tableName, tableData]) => {
        const relevantFields = tableData.columns.filter(col => 
            fuelFields.some(fuelField => col.toLowerCase().includes(fuelField.toLowerCase()))
        );
        
        if (relevantFields.length > 0) {
            log(`🔥 ${tableName}: Поля топлива - ${relevantFields.join(', ')}`, 'success');
        }
    });

    // Проверяем конкретные связи
    log('\n🔗 АНАЛИЗ ВОЗМОЖНЫХ СВЯЗЕЙ:');
    
    if (results.equipment_templates) {
        log('📋 Шаблоны оборудования найдены - проверяем поля для типа топлива');
    }
    
    if (results.tanks) {
        log('🛢️ Резервуары найдены - анализируем связь с топливом');
        if (results.tanks.data.length > 0) {
            const tankExample = results.tanks.data[0];
            const fuelRelatedFields = Object.keys(tankExample).filter(key => 
                key.toLowerCase().includes('fuel') || key.toLowerCase().includes('type') || key.toLowerCase().includes('product')
            );
            log(`   🔍 Поля связанные с топливом: ${fuelRelatedFields.join(', ')}`);
        }
    }

    return results;
}

// Запуск исследования
exploreDatabaseStructure()
    .then(results => {
        log('\n✅ ИССЛЕДОВАНИЕ ЗАВЕРШЕНО', 'success');
        log(`📊 Найдено таблиц: ${Object.keys(results).length}`);
    })
    .catch(error => {
        log(`\n💥 ОШИБКА ИССЛЕДОВАНИЯ: ${error.message}`, 'error');
        process.exit(1);
    });