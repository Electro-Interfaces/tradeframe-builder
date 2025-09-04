/**
 * Тест интеграции всего проекта с базой данных
 * Проверяем ключевые сервисы и их совместимость
 */

import { executeSelect, describeTable } from './tools/sql-direct.js';

async function testProjectIntegration() {
    console.log('🧪 ТЕСТ ИНТЕГРАЦИИ ПРОЕКТА С БАЗОЙ ДАННЫХ');
    console.log('='.repeat(60));
    
    const results = {
        database: { status: 'unknown', tables: 0, issues: [] },
        services: { equipment: 'untested', networks: 'untested', operations: 'untested' },
        schema: { compatibility: 0, issues: [] },
        integration: { score: 0, ready: false }
    };
    
    // 1. Проверка базовой доступности
    console.log('\n🔌 1. ТЕСТ ПОДКЛЮЧЕНИЯ К БАЗЕ ДАННЫХ');
    console.log('-'.repeat(40));
    
    try {
        const tables = await testDatabaseAccess();
        results.database.status = 'connected';
        results.database.tables = tables.length;
        console.log(`✅ База данных доступна: ${tables.length} таблиц`);
    } catch (error) {
        results.database.status = 'failed';
        results.database.issues.push(error.message);
        console.log(`❌ Проблема с подключением: ${error.message}`);
        return results;
    }
    
    // 2. Проверка критических таблиц и схемы
    console.log('\n📋 2. ПРОВЕРКА СХЕМЫ КРИТИЧЕСКИХ ТАБЛИЦ');
    console.log('-'.repeat(40));
    
    const criticalTables = ['equipment_templates', 'equipment', 'networks', 'trading_points'];
    let schemaIssues = 0;
    
    for (const table of criticalTables) {
        try {
            const data = await executeSelect(table, { limit: 1 });
            const structure = await analyzeTableSchema(table, data);
            
            console.log(`📊 ${table}:`);
            console.log(`   📈 Записей: ${data.length}`);
            console.log(`   🔧 Схема: ${structure.isCorrect ? '✅ Корректная' : '❌ Требует обновления'}`);
            
            if (!structure.isCorrect) {
                schemaIssues++;
                results.schema.issues.push({
                    table,
                    issues: structure.issues
                });
                structure.issues.forEach(issue => console.log(`      • ${issue}`));
            }
            
        } catch (error) {
            console.log(`❌ ${table}: ${error.message}`);
            schemaIssues++;
        }
    }
    
    results.schema.compatibility = Math.max(0, ((4 - schemaIssues) / 4) * 100);
    
    // 3. Тест сервисов оборудования (ключевой функционал)
    console.log('\n⚙️ 3. ТЕСТ СЕРВИСОВ ОБОРУДОВАНИЯ');
    console.log('-'.repeat(40));
    
    try {
        // Тестируем шаблоны оборудования
        console.log('🔍 Тест шаблонов оборудования...');
        const templates = await executeSelect('equipment_templates', { limit: 3 });
        
        if (templates.length > 0) {
            console.log(`✅ Найдено ${templates.length} шаблонов оборудования`);
            results.services.equipment = 'working';
            
            // Проверяем структуру первого шаблона
            const template = templates[0];
            const hasCorrectSchema = template.is_active !== undefined && 
                                   template.id && template.id.includes('-') &&
                                   typeof template.default_params === 'object';
            
            if (hasCorrectSchema) {
                console.log('✅ Схема шаблонов корректная');
            } else {
                console.log('⚠️ Схема шаблонов требует внимания');
                results.services.equipment = 'needs_update';
            }
            
            // Показываем примеры данных
            console.log('📋 Примеры шаблонов:');
            templates.forEach((t, i) => {
                console.log(`   ${i + 1}. ${t.name} (${t.system_type}) - ${t.is_active ? 'Активен' : 'Неактивен'}`);
            });
        } else {
            console.log('⚠️ Шаблоны оборудования отсутствуют');
            results.services.equipment = 'empty';
        }
        
    } catch (error) {
        console.log(`❌ Ошибка в сервисах оборудования: ${error.message}`);
        results.services.equipment = 'failed';
    }
    
    // 4. Тест интеграции торговых сетей
    console.log('\n🏪 4. ТЕСТ ТОРГОВЫХ СЕТЕЙ И ТОЧЕК');
    console.log('-'.repeat(40));
    
    try {
        const networks = await executeSelect('networks', { limit: 3 });
        const points = await executeSelect('trading_points', { limit: 3 });
        
        console.log(`✅ Торговые сети: ${networks.length} записей`);
        console.log(`✅ Торговые точки: ${points.length} записей`);
        
        if (networks.length > 0 && points.length > 0) {
            results.services.networks = 'working';
            console.log('✅ Базовая инфраструктура торговых сетей настроена');
        } else {
            results.services.networks = 'empty';
            console.log('⚠️ Торговая инфраструктура требует инициализации');
        }
        
    } catch (error) {
        console.log(`❌ Проблема с торговыми сетями: ${error.message}`);
        results.services.networks = 'failed';
    }
    
    // 5. Тест операций и номенклатуры
    console.log('\n💰 5. ТЕСТ ОПЕРАЦИЙ И НОМЕНКЛАТУРЫ');
    console.log('-'.repeat(40));
    
    try {
        const operations = await executeSelect('operations', { limit: 2 });
        const nomenclature = await executeSelect('nomenclature', { limit: 2 });
        const fuelTypes = await executeSelect('fuel_types', { limit: 5 });
        
        console.log(`✅ Операции: ${operations.length} записей`);
        console.log(`✅ Номенклатура: ${nomenclature.length} записей`);
        console.log(`✅ Типы топлива: ${fuelTypes.length} записей`);
        
        if (operations.length > 0 && nomenclature.length > 0 && fuelTypes.length > 0) {
            results.services.operations = 'working';
            console.log('✅ Операционная часть готова к работе');
        } else {
            results.services.operations = 'partial';
            console.log('⚠️ Операционные данные частично настроены');
        }
        
    } catch (error) {
        console.log(`❌ Проблема с операциями: ${error.message}`);
        results.services.operations = 'failed';
    }
    
    // 6. Итоговая оценка готовности
    console.log('\n🎯 6. ИТОГОВАЯ ОЦЕНКА ГОТОВНОСТИ ПРОЕКТА');
    console.log('='.repeat(40));
    
    const integrationScore = calculateIntegrationScore(results);
    results.integration.score = integrationScore;
    results.integration.ready = integrationScore >= 70;
    
    console.log(`📊 База данных: ${results.database.status === 'connected' ? '✅' : '❌'} (${results.database.tables} таблиц)`);
    console.log(`🔧 Совместимость схемы: ${results.schema.compatibility.toFixed(0)}%`);
    console.log(`⚙️ Сервис оборудования: ${getServiceStatus(results.services.equipment)}`);
    console.log(`🏪 Торговые сети: ${getServiceStatus(results.services.networks)}`);
    console.log(`💰 Операции: ${getServiceStatus(results.services.operations)}`);
    
    console.log(`\n🎯 ОБЩИЙ БАЛЛ ИНТЕГРАЦИИ: ${integrationScore}%`);
    
    if (integrationScore >= 85) {
        console.log('🎉 ОТЛИЧНО! Проект полностью готов к продакшену');
    } else if (integrationScore >= 70) {
        console.log('✅ ХОРОШО! Проект готов для разработки, нужны мелкие доработки');
    } else if (integrationScore >= 50) {
        console.log('⚠️ УДОВЛЕТВОРИТЕЛЬНО. Основные функции работают, есть что улучшить');
    } else {
        console.log('❌ ТРЕБУЕТСЯ РАБОТА. Критические проблемы с интеграцией');
    }
    
    // 7. Конкретные рекомендации
    console.log('\n💡 РЕКОМЕНДАЦИИ ПО УЛУЧШЕНИЮ:');
    console.log('-'.repeat(40));
    
    if (results.schema.issues.length > 0) {
        console.log('🔧 Схема базы данных:');
        results.schema.issues.forEach(issue => {
            console.log(`   • ${issue.table}: ${issue.issues.join(', ')}`);
        });
    }
    
    if (results.services.equipment !== 'working') {
        console.log('⚙️ Оборудование: Обновить сервисы для использования Supabase API');
    }
    
    if (results.services.networks !== 'working') {
        console.log('🏪 Торговые сети: Добавить базовые данные сетей и точек');
    }
    
    if (results.services.operations !== 'working') {
        console.log('💰 Операции: Настроить операционные справочники');
    }
    
    console.log('\n📈 Следующие шаги:');
    if (integrationScore >= 70) {
        console.log('✅ 1. Запустить приложение: npm run dev');
        console.log('✅ 2. Протестировать основные функции в браузере');
        console.log('✅ 3. Заполнить тестовыми данными если нужно');
    } else {
        console.log('🔧 1. Исправить критические проблемы схемы');
        console.log('🔧 2. Обновить сервисы для использования Supabase');
        console.log('🔧 3. Повторить тест интеграции');
    }
    
    return results;
}

async function testDatabaseAccess() {
    const tables = ['equipment_templates', 'equipment', 'networks', 'trading_points', 
                   'operations', 'nomenclature', 'users', 'fuel_types'];
    
    const accessibleTables = [];
    for (const table of tables) {
        try {
            await executeSelect(table, { limit: 1 });
            accessibleTables.push(table);
        } catch (error) {
            // Таблица недоступна
        }
    }
    
    if (accessibleTables.length === 0) {
        throw new Error('Нет доступных таблиц');
    }
    
    return accessibleTables;
}

async function analyzeTableSchema(tableName, sampleData) {
    const issues = [];
    let isCorrect = true;
    
    if (sampleData.length === 0) {
        return { isCorrect: true, issues: ['Таблица пустая'] };
    }
    
    const record = sampleData[0];
    
    // Проверяем поля статуса
    if (record.hasOwnProperty('status') && !record.hasOwnProperty('is_active')) {
        issues.push('Использует status вместо is_active');
        isCorrect = false;
    }
    
    // Проверяем UUID формат для id
    if (record.id && (typeof record.id !== 'string' || !record.id.includes('-'))) {
        issues.push('ID не в формате UUID');
        isCorrect = false;
    }
    
    return { isCorrect, issues };
}

function calculateIntegrationScore(results) {
    let score = 0;
    
    // База данных (30 баллов)
    if (results.database.status === 'connected') {
        score += 30;
    }
    
    // Совместимость схемы (25 баллов)
    score += (results.schema.compatibility * 0.25);
    
    // Сервисы (45 баллов общего - по 15 каждый)
    const services = [results.services.equipment, results.services.networks, results.services.operations];
    services.forEach(status => {
        if (status === 'working') score += 15;
        else if (status === 'partial' || status === 'needs_update') score += 10;
        else if (status === 'empty') score += 5;
    });
    
    return Math.round(score);
}

function getServiceStatus(status) {
    const statusMap = {
        'working': '✅ Работает',
        'needs_update': '🔄 Требует обновления',
        'partial': '⚠️ Частично',
        'empty': '📝 Пустые данные',
        'failed': '❌ Ошибка',
        'untested': '❓ Не протестирован'
    };
    return statusMap[status] || status;
}

// Запуск тестирования
testProjectIntegration().catch(console.error);