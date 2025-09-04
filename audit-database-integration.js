/**
 * Аудит интеграции проекта с базой данных
 * Анализирует все сервисы на совместимость с Supabase
 */

import fs from 'fs';
import path from 'path';
import { executeSelect } from './tools/sql-direct.js';

const SERVICES_DIR = './src/services';
const COMPONENTS_DIR = './src/components';

async function auditDatabaseIntegration() {
    console.log('🔍 АУДИТ ИНТЕГРАЦИИ С БАЗОЙ ДАННЫХ');
    console.log('='.repeat(60));
    
    const results = {
        services: {
            total: 0,
            withDatabase: 0,
            mockOnly: 0,
            needsUpdate: 0,
            files: []
        },
        database: {
            tables: [],
            accessible: 0,
            issues: []
        },
        compatibility: {
            statusField: { correct: 0, incorrect: 0, files: [] },
            uuidFormat: { correct: 0, incorrect: 0, files: [] },
            supabaseIntegration: { present: 0, missing: 0, files: [] }
        }
    };
    
    // 1. Проверяем доступность базы данных
    console.log('\n📊 1. ПРОВЕРКА ДОСТУПНОСТИ БАЗЫ ДАННЫХ');
    console.log('-'.repeat(40));
    
    const knownTables = [
        'equipment_templates', 'equipment', 'networks', 'trading_points',
        'operations', 'nomenclature', 'users', 'fuel_types'
    ];
    
    for (const table of knownTables) {
        try {
            const data = await executeSelect(table, { limit: 1 });
            results.database.accessible++;
            results.database.tables.push({
                name: table,
                status: 'accessible',
                records: data.length
            });
            console.log(`✅ ${table}: ${data.length} записей`);
        } catch (error) {
            results.database.issues.push({ table, error: error.message });
            console.log(`❌ ${table}: ${error.message}`);
        }
    }
    
    // 2. Анализируем сервисы
    console.log('\n🛠️ 2. АНАЛИЗ ФАЙЛОВ СЕРВИСОВ');
    console.log('-'.repeat(40));
    
    const serviceFiles = fs.readdirSync(SERVICES_DIR)
        .filter(file => file.endsWith('.ts'))
        .map(file => path.join(SERVICES_DIR, file));
    
    results.services.total = serviceFiles.length;
    
    for (const filePath of serviceFiles) {
        const fileName = path.basename(filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        
        const analysis = analyzeServiceFile(fileName, content);
        results.services.files.push(analysis);
        
        if (analysis.hasDatabase) results.services.withDatabase++;
        if (analysis.mockOnly) results.services.mockOnly++;
        if (analysis.needsUpdate) results.services.needsUpdate++;
        
        // Анализ полей статуса
        if (analysis.usesStatus) {
            results.compatibility.statusField.incorrect++;
            results.compatibility.statusField.files.push(fileName);
        }
        if (analysis.usesIsActive) {
            results.compatibility.statusField.correct++;
        }
        
        // Анализ UUID
        if (analysis.hasUuidIssues) {
            results.compatibility.uuidFormat.incorrect++;
            results.compatibility.uuidFormat.files.push(fileName);
        }
        
        // Анализ Supabase интеграции
        if (analysis.hasSupabaseIntegration) {
            results.compatibility.supabaseIntegration.present++;
        } else {
            results.compatibility.supabaseIntegration.missing++;
            results.compatibility.supabaseIntegration.files.push(fileName);
        }
        
        const status = analysis.needsUpdate ? '⚠️' : 
                      analysis.hasSupabaseIntegration ? '✅' : 
                      analysis.hasDatabase ? '🔄' : '📝';
        
        console.log(`${status} ${fileName}: ${analysis.description}`);
    }
    
    // 3. Проверяем ключевые компоненты
    console.log('\n🎨 3. ПРОВЕРКА КЛЮЧЕВЫХ КОМПОНЕНТОВ');
    console.log('-'.repeat(40));
    
    const keyComponents = [
        'equipment/Equipment.tsx',
        'equipment/EquipmentWizard.tsx', 
        'equipment/ComponentWizard.tsx',
        'connections/ConnectionsList.tsx',
        'admin/users/UserFormDialog.tsx'
    ];
    
    for (const comp of keyComponents) {
        const compPath = path.join(COMPONENTS_DIR, comp);
        if (fs.existsSync(compPath)) {
            const content = fs.readFileSync(compPath, 'utf8');
            const hasApiCalls = content.includes('API') || content.includes('fetch');
            const usesServices = /from ['"]\@\/services/.test(content);
            console.log(`${hasApiCalls || usesServices ? '✅' : '⚠️'} ${comp}: ${hasApiCalls ? 'API вызовы' : ''} ${usesServices ? 'Сервисы' : ''}`);
        } else {
            console.log(`❌ ${comp}: Файл не найден`);
        }
    }
    
    // 4. Генерируем отчет
    console.log('\n📋 4. ИТОГОВЫЙ ОТЧЕТ');
    console.log('='.repeat(40));
    
    console.log(`📊 База данных:`);
    console.log(`   ✅ Доступных таблиц: ${results.database.accessible}/${knownTables.length}`);
    console.log(`   ❌ Проблем: ${results.database.issues.length}`);
    
    console.log(`🛠️ Сервисы:`);
    console.log(`   📁 Всего файлов: ${results.services.total}`);
    console.log(`   🗄️ С БД интеграцией: ${results.services.withDatabase}`);
    console.log(`   🎭 Только mock: ${results.services.mockOnly}`);
    console.log(`   ⚠️ Требуют обновления: ${results.services.needsUpdate}`);
    
    console.log(`🔧 Совместимость схемы:`);
    console.log(`   ✅ Правильные поля статуса (is_active): ${results.compatibility.statusField.correct}`);
    console.log(`   ❌ Неправильные поля статуса (status): ${results.compatibility.statusField.incorrect}`);
    console.log(`   ❌ Проблемы с UUID: ${results.compatibility.uuidFormat.incorrect}`);
    console.log(`   ✅ С Supabase интеграцией: ${results.compatibility.supabaseIntegration.present}`);
    console.log(`   ❌ Без Supabase интеграции: ${results.compatibility.supabaseIntegration.missing}`);
    
    // 5. Рекомендации
    console.log('\n💡 5. РЕКОМЕНДАЦИИ');
    console.log('-'.repeat(40));
    
    if (results.compatibility.statusField.incorrect > 0) {
        console.log(`⚠️ Обновить поля статуса в файлах:`);
        results.compatibility.statusField.files.forEach(f => console.log(`   • ${f}`));
    }
    
    if (results.compatibility.supabaseIntegration.missing > 0) {
        console.log(`🔄 Добавить Supabase интеграцию в:`);
        results.compatibility.supabaseIntegration.files.slice(0, 10).forEach(f => 
            console.log(`   • ${f}`)
        );
        if (results.compatibility.supabaseIntegration.files.length > 10) {
            console.log(`   ... и еще ${results.compatibility.supabaseIntegration.files.length - 10} файлов`);
        }
    }
    
    const score = calculateCompatibilityScore(results);
    console.log(`\n🎯 ОБЩАЯ ОЦЕНКА СОВМЕСТИМОСТИ: ${score}%`);
    
    if (score >= 80) {
        console.log('🎉 ОТЛИЧНО! Проект хорошо интегрирован с базой данных');
    } else if (score >= 60) {
        console.log('⚠️ ХОРОШО, но есть области для улучшения');
    } else {
        console.log('❌ ТРЕБУЕТСЯ ЗНАЧИТЕЛЬНАЯ РАБОТА по интеграции');
    }
    
    return results;
}

function analyzeServiceFile(fileName, content) {
    const analysis = {
        hasDatabase: false,
        hasSupabaseIntegration: false,
        mockOnly: false,
        usesStatus: false,
        usesIsActive: false,
        hasUuidIssues: false,
        needsUpdate: false,
        description: ''
    };
    
    // Проверяем типы интеграции
    const hasSupabase = content.includes('supabase') || content.includes('Supabase');
    const hasFetch = content.includes('fetch(') || content.includes('http');
    const hasMockAPI = content.includes('mockAPI') || content.includes('Mock');
    const hasRealAPI = content.includes('realAPI') || content.includes('Real');
    
    analysis.hasSupabaseIntegration = hasSupabase;
    analysis.hasDatabase = hasFetch || hasSupabase || hasRealAPI;
    analysis.mockOnly = hasMockAPI && !hasRealAPI && !hasSupabase;
    
    // Проверяем поля статуса
    analysis.usesStatus = content.includes("'status'") || content.includes('"status"') || content.includes('status:');
    analysis.usesIsActive = content.includes('is_active') || content.includes('isActive');
    
    // Проверяем UUID проблемы
    const hasStringIds = /id:\s*['"]\w+-\d+/.test(content);
    const hasTestIds = /id:\s*['"]test-/.test(content);
    analysis.hasUuidIssues = hasStringIds || hasTestIds;
    
    // Определяем нужность обновления
    analysis.needsUpdate = analysis.usesStatus || analysis.hasUuidIssues || 
                          (analysis.hasDatabase && !analysis.hasSupabaseIntegration);
    
    // Описание
    if (analysis.hasSupabaseIntegration) {
        analysis.description = 'Интеграция с Supabase';
    } else if (analysis.hasDatabase) {
        analysis.description = 'HTTP API интеграция';
    } else if (analysis.mockOnly) {
        analysis.description = 'Только mock данные';
    } else {
        analysis.description = 'Утилитный сервис';
    }
    
    return analysis;
}

function calculateCompatibilityScore(results) {
    const weights = {
        databaseAccess: 30,      // Доступ к базе
        schemaCompatibility: 25, // Совместимость схемы  
        serviceIntegration: 25,  // Интеграция сервисов
        overallHealth: 20        // Общее здоровье
    };
    
    const scores = {
        databaseAccess: (results.database.accessible / 8) * 100,
        schemaCompatibility: Math.max(0, 100 - (results.compatibility.statusField.incorrect * 10)),
        serviceIntegration: Math.min(100, (results.compatibility.supabaseIntegration.present / results.services.total) * 200),
        overallHealth: Math.max(0, 100 - (results.services.needsUpdate * 2))
    };
    
    const weightedScore = Object.entries(weights).reduce((total, [key, weight]) => {
        return total + (scores[key] * weight / 100);
    }, 0);
    
    return Math.round(weightedScore);
}

// Запуск аудита
auditDatabaseIntegration().catch(console.error);