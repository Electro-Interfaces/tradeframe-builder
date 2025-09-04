/**
 * Пример интеграции SQL Direct Tool в код агента
 * Показывает как любой агент может работать с базой данных
 */

import { executeSelect, describeTable } from '../tools/sql-direct.js';

async function demonstrateAgentIntegration() {
    console.log('🤖 Демонстрация интеграции SQL Tool для агентов');
    console.log('=' .repeat(50));
    
    try {
        // 1. Анализ структуры таблицы
        console.log('\n📋 1. Анализ структуры таблицы equipment_templates:');
        const structure = await describeTable('equipment_templates');
        console.log('Найденные колонки:', structure?.map(s => s.column_name) || 'Используется fallback метод');
        
        // 2. Получение данных
        console.log('\n📊 2. Получение шаблонов оборудования:');
        const templates = await executeSelect('equipment_templates', { limit: 3 });
        
        console.log(`Получено ${templates.length} шаблонов:`);
        templates.forEach((template, i) => {
            console.log(`  ${i + 1}. ${template.name} (${template.system_type})`);
            console.log(`     Активен: ${template.is_active}`);
            console.log(`     Создан: ${new Date(template.created_at).toLocaleDateString()}`);
        });
        
        // 3. Анализ схемы
        console.log('\n🔍 3. Проверка схемы:');
        const firstTemplate = templates[0];
        const hasCorrectFields = {
            'UUID ID': typeof firstTemplate.id === 'string' && firstTemplate.id.includes('-'),
            'is_active поле': firstTemplate.hasOwnProperty('is_active'),
            'НЕТ status поля': !firstTemplate.hasOwnProperty('status'),
            'JSON параметры': typeof firstTemplate.default_params === 'object'
        };
        
        Object.entries(hasCorrectFields).forEach(([check, passed]) => {
            console.log(`  ${passed ? '✅' : '❌'} ${check}`);
        });
        
        // 4. Пример создания нового объекта с правильной схемой
        console.log('\n🔧 4. Пример правильного объекта для создания:');
        const exampleObject = {
            id: generateUUID(),
            name: 'Пример шаблона',
            system_type: 'example',
            technical_code: 'EX_' + Date.now(),
            is_active: true, // ✅ НЕ status!
            default_params: {
                example: true,
                created_by_agent: true
            },
            description: 'Создан агентом для демонстрации'
        };
        
        console.log(JSON.stringify(exampleObject, null, 2));
        
        // 5. Проверка других таблиц
        console.log('\n🏪 5. Проверка доступности других таблиц:');
        const otherTables = ['networks', 'trading_points', 'operations', 'nomenclature'];
        
        for (const table of otherTables) {
            try {
                const data = await executeSelect(table, { limit: 1 });
                console.log(`  ✅ ${table}: ${data.length} записей доступно`);
            } catch (error) {
                console.log(`  ❌ ${table}: ${error.message}`);
            }
        }
        
        console.log('\n🎉 Интеграция агента с SQL Tool успешно продемонстрирована!');
        console.log('💡 Теперь любой агент может легко работать с базой данных.');
        
    } catch (error) {
        console.error('❌ Ошибка в демонстрации:', error.message);
    }
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Запуск демонстрации
demonstrateAgentIntegration().catch(console.error);