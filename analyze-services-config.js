/**
 * Анализ использования конфигурации сервисами
 * Проверяем какие сервисы используют старую (localStorage) vs новую (database) архитектуру
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Пути к файлам сервисов
const SERVICES_DIR = './src/services';
const PAGES_DIR = './src/pages';

// Паттерны для поиска использования конфигурации
const OLD_CONFIG_PATTERNS = [
    'apiConfigService',
    'localStorage.getItem',
    'sessionStorage.getItem',
    'apiConfigService.getCurrentConfig',
    'apiConfigService.switchConnection'
];

const NEW_CONFIG_PATTERNS = [
    'apiConfigServiceDB',
    'systemConfigService',
    'supabaseConfigManager',
    'apiConfigServiceDB.getCurrentConfig',
    'systemConfigService.getDatabaseConfig'
];

function searchInFile(filePath, patterns) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const matches = [];
        
        patterns.forEach(pattern => {
            const regex = new RegExp(pattern, 'g');
            const found = content.match(regex);
            if (found) {
                matches.push({ pattern, count: found.length });
            }
        });
        
        return matches;
    } catch (error) {
        return [];
    }
}

function analyzeDirectory(dirPath, type = 'service') {
    const results = [];
    
    try {
        const files = fs.readdirSync(dirPath);
        
        files.forEach(file => {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                const filePath = path.join(dirPath, file);
                const oldMatches = searchInFile(filePath, OLD_CONFIG_PATTERNS);
                const newMatches = searchInFile(filePath, NEW_CONFIG_PATTERNS);
                
                if (oldMatches.length > 0 || newMatches.length > 0) {
                    results.push({
                        file,
                        path: filePath,
                        type,
                        oldConfig: oldMatches,
                        newConfig: newMatches,
                        usesOld: oldMatches.length > 0,
                        usesNew: newMatches.length > 0
                    });
                }
            }
        });
    } catch (error) {
        console.error(`Ошибка чтения директории ${dirPath}:`, error.message);
    }
    
    return results;
}

function printAnalysisResults() {
    console.log('🔍 АНАЛИЗ ИСПОЛЬЗОВАНИЯ КОНФИГУРАЦИИ СЕРВИСАМИ');
    console.log('='.repeat(60));
    
    // Анализируем сервисы
    console.log('\n📁 АНАЛИЗ ДИРЕКТОРИИ /src/services:');
    const servicesResults = analyzeDirectory(SERVICES_DIR, 'service');
    
    // Анализируем страницы
    console.log('\n📄 АНАЛИЗ ДИРЕКТОРИИ /src/pages:');
    const pagesResults = analyzeDirectory(PAGES_DIR, 'page');
    
    const allResults = [...servicesResults, ...pagesResults];
    
    if (allResults.length === 0) {
        console.log('❌ Файлы с использованием конфигурации не найдены');
        return;
    }
    
    // Группируем результаты
    const usingOldOnly = allResults.filter(r => r.usesOld && !r.usesNew);
    const usingNewOnly = allResults.filter(r => r.usesNew && !r.usesOld);
    const usingBoth = allResults.filter(r => r.usesOld && r.usesNew);
    const usingNeither = allResults.filter(r => !r.usesOld && !r.usesNew);
    
    console.log('\n📊 СВОДКА ПО ИСПОЛЬЗОВАНИЮ КОНФИГУРАЦИИ:');
    console.log('-'.repeat(40));
    console.log(`Всего файлов с конфигурацией: ${allResults.length}`);
    console.log(`Используют только СТАРУЮ конфигурацию: ${usingOldOnly.length}`);
    console.log(`Используют только НОВУЮ конфигурацию: ${usingNewOnly.length}`);
    console.log(`Используют ОБЕИ конфигурации: ${usingBoth.length}`);
    console.log('');
    
    // Детализируем файлы со старой конфигурацией
    if (usingOldOnly.length > 0) {
        console.log('🔴 ФАЙЛЫ, ИСПОЛЬЗУЮЩИЕ СТАРУЮ КОНФИГУРАЦИЮ (localStorage):');
        usingOldOnly.forEach(result => {
            console.log(`\n   📄 ${result.file} (${result.type})`);
            console.log(`      Путь: ${result.path}`);
            result.oldConfig.forEach(match => {
                console.log(`      ⚠️  ${match.pattern} (${match.count} раз)`);
            });
        });
        console.log('');
    }
    
    // Детализируем файлы с новой конфигурацией
    if (usingNewOnly.length > 0) {
        console.log('🟢 ФАЙЛЫ, ИСПОЛЬЗУЮЩИЕ НОВУЮ КОНФИГУРАЦИЮ (database):');
        usingNewOnly.forEach(result => {
            console.log(`\n   📄 ${result.file} (${result.type})`);
            console.log(`      Путь: ${result.path}`);
            result.newConfig.forEach(match => {
                console.log(`      ✅ ${match.pattern} (${match.count} раз)`);
            });
        });
        console.log('');
    }
    
    // Детализируем смешанные файлы
    if (usingBoth.length > 0) {
        console.log('🟡 ФАЙЛЫ, ИСПОЛЬЗУЮЩИЕ ОБЕИ КОНФИГУРАЦИИ (требуют рефакторинга):');
        usingBoth.forEach(result => {
            console.log(`\n   📄 ${result.file} (${result.type})`);
            console.log(`      Путь: ${result.path}`);
            console.log('      Старая конфигурация:');
            result.oldConfig.forEach(match => {
                console.log(`        ⚠️  ${match.pattern} (${match.count} раз)`);
            });
            console.log('      Новая конфигурация:');
            result.newConfig.forEach(match => {
                console.log(`        ✅ ${match.pattern} (${match.count} раз)`);
            });
        });
        console.log('');
    }
    
    // АНАЛИЗ ГОТОВНОСТИ МИГРАЦИИ
    console.log('🎯 АНАЛИЗ ГОТОВНОСТИ МИГРАЦИИ:');
    console.log('-'.repeat(40));
    
    const migrationReadiness = (usingNewOnly.length + usingBoth.length) / allResults.length * 100;
    const oldConfigFiles = usingOldOnly.length + usingBoth.length;
    
    console.log(`📈 Прогресс миграции: ${migrationReadiness.toFixed(1)}%`);
    console.log(`🔄 Файлов, требующих обновления: ${oldConfigFiles}`);
    
    if (usingOldOnly.length === 0) {
        console.log('✅ ВСЕ ФАЙЛЫ ИСПОЛЬЗУЮТ НОВУЮ КОНФИГУРАЦИЮ!');
        console.log('🎉 Миграция на централизованную архитектуру ЗАВЕРШЕНА');
    } else {
        console.log('⚠️ МИГРАЦИЯ НЕ ЗАВЕРШЕНА');
        console.log(`🔧 Необходимо обновить ${usingOldOnly.length} файлов`);
    }
    
    console.log('');
    console.log('📋 РЕКОМЕНДАЦИИ:');
    if (usingOldOnly.length > 0) {
        console.log('1. Обновить файлы, использующие старую конфигурацию');
        console.log('2. Заменить apiConfigService на apiConfigServiceDB');
        console.log('3. Протестировать все обновленные разделы');
    }
    if (usingBoth.length > 0) {
        console.log('4. Устранить дублирование конфигураций в смешанных файлах');
        console.log('5. Оставить только новую архитектуру');
    }
    if (usingNewOnly.length === allResults.length) {
        console.log('✅ Система полностью готова к использованию новой архитектуры');
        console.log('🔄 Можно безопасно переключать подключения через "Обмен данными"');
    }
}

// Дополнительный анализ - поиск конкретных проблемных мест
function findSpecificIssues() {
    console.log('\n🔍 ПОИСК КОНКРЕТНЫХ ПРОБЛЕМ:');
    console.log('-'.repeat(40));
    
    const problematicPatterns = [
        'localStorage.getItem("database_connections")',
        'apiConfigService.getCurrentConfig()',
        'import.*apiConfigService.*from',
        'useEffect.*apiConfigService'
    ];
    
    const allFiles = [
        ...fs.readdirSync(SERVICES_DIR).map(f => path.join(SERVICES_DIR, f)),
        ...fs.readdirSync(PAGES_DIR).map(f => path.join(PAGES_DIR, f))
    ].filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
    
    let foundIssues = 0;
    
    allFiles.forEach(filePath => {
        problematicPatterns.forEach(pattern => {
            const matches = searchInFile(filePath, [pattern]);
            if (matches.length > 0) {
                console.log(`⚠️ ${path.basename(filePath)}: ${pattern}`);
                foundIssues++;
            }
        });
    });
    
    if (foundIssues === 0) {
        console.log('✅ Проблемные места не найдены');
    } else {
        console.log(`❌ Найдено проблемных мест: ${foundIssues}`);
    }
}

// Запуск анализа
try {
    printAnalysisResults();
    findSpecificIssues();
} catch (error) {
    console.error('💥 Ошибка анализа:', error.message);
}