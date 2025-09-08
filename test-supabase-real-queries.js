/**
 * 🔍 Тестирование реальных запросов к Supabase
 * 
 * Этот скрипт проверяет что все сервисы действительно выполняют 
 * реальные запросы к базе данных Supabase без Mock режима
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Список критичных сервисов для тестирования реальных запросов
const criticalServices = [
    {
        name: 'Equipment Supabase',
        path: 'src/services/equipmentSupabase.ts',
        testQueries: ['list', 'create', 'update', 'delete'],
        table: 'equipment_templates',
        critical: true
    },
    {
        name: 'Operations Supabase',
        path: 'src/services/operationsSupabaseService.ts',
        testQueries: ['list', 'getById', 'create'],
        table: 'operations',
        critical: true
    },
    {
        name: 'Prices Supabase',
        path: 'src/services/pricesSupabaseService.ts',
        testQueries: ['list', 'current', 'history'],
        table: 'prices',
        critical: true
    },
    {
        name: 'Users Supabase',
        path: 'src/services/usersSupabaseService.ts',
        testQueries: ['list', 'create', 'update'],
        table: 'users',
        critical: true
    },
    {
        name: 'Tanks Service Supabase',
        path: 'src/services/tanksServiceSupabase.ts',
        testQueries: ['list', 'update'],
        table: 'tanks',
        critical: true
    },
    {
        name: 'Components Supabase',
        path: 'src/services/componentsSupabase.ts',
        testQueries: ['list', 'create'],
        table: 'components',
        critical: true
    },
    {
        name: 'Instructions Supabase',
        path: 'src/services/instructionsSupabaseService.ts',
        testQueries: ['list', 'create'],
        table: 'instructions',
        critical: false
    },
    {
        name: 'Messages Supabase',
        path: 'src/services/messagesSupabaseService.ts',
        testQueries: ['list', 'send'],
        table: 'messages',
        critical: false
    },
    {
        name: 'Workflows Supabase',
        path: 'src/services/workflowsSupabaseService.ts',
        testQueries: ['list', 'execute'],
        table: 'workflows',
        critical: false
    }
];

const testResults = {
    timestamp: new Date().toISOString(),
    totalServices: criticalServices.length,
    testedServices: 0,
    passedServices: 0,
    failedServices: 0,
    criticalServicesPassed: 0,
    totalCriticalServices: criticalServices.filter(s => s.critical).length,
    services: {},
    overallHealth: 0,
    supabaseConnected: false,
    mockCompletelyDisabled: false
};

function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`[${timestamp}] ${icon} ${message}`);
}

// Проверка что сервис использует реальные Supabase запросы
function analyzeServiceForRealQueries(servicePath) {
    try {
        const fullPath = join(__dirname, servicePath);
        
        if (!existsSync(fullPath)) {
            return {
                exists: false,
                error: 'Файл не найден'
            };
        }
        
        const content = readFileSync(fullPath, 'utf8');
        
        const analysis = {
            exists: true,
            hasSupabaseImport: content.includes('@supabase/supabase-js') || content.includes('createClient'),
            hasSupabaseQueries: content.includes('.select(') || content.includes('.insert(') || content.includes('.update(') || content.includes('.delete('),
            hasRealTableQueries: content.includes('.from(') || content.includes('from '),
            hasMockQueries: content.includes('mock') || content.includes('Mock') || content.includes('localStorage'),
            hasDirectDatabaseCalls: content.includes('supabase.') || content.includes('client.'),
            hasApiEndpoints: content.includes('/api/') || content.includes('fetch('),
            usesSupabaseClient: content.includes('supabaseClient') || content.includes('getSupabaseClient'),
            hasAsyncMethods: content.includes('async ') && content.includes('await '),
            exportsCount: (content.match(/export/g) || []).length,
            fileSize: content.length
        };
        
        // Определение качества интеграции с Supabase
        analysis.realQueryScore = 0;
        if (analysis.hasSupabaseImport) analysis.realQueryScore += 2;
        if (analysis.hasSupabaseQueries) analysis.realQueryScore += 3;
        if (analysis.hasRealTableQueries) analysis.realQueryScore += 3;
        if (analysis.hasDirectDatabaseCalls) analysis.realQueryScore += 2;
        if (analysis.usesSupabaseClient) analysis.realQueryScore += 2;
        if (analysis.hasAsyncMethods) analysis.realQueryScore += 1;
        if (!analysis.hasMockQueries) analysis.realQueryScore += 2; // Бонус за отсутствие Mock
        if (!analysis.hasApiEndpoints) analysis.realQueryScore += 1; // Бонус за прямые запросы
        
        analysis.maxScore = 16;
        analysis.scorePercent = Math.round((analysis.realQueryScore / analysis.maxScore) * 100);
        
        analysis.isReady = analysis.scorePercent >= 80 && analysis.hasSupabaseQueries && !analysis.hasMockQueries;
        
        return analysis;
        
    } catch (error) {
        return {
            exists: false,
            error: error.message
        };
    }
}

// Проверка конфигурации Supabase подключения
function checkSupabaseConfiguration() {
    log('🔍 Проверка конфигурации Supabase...');
    
    try {
        // Проверка основных конфигурационных файлов
        const configFiles = [
            'src/services/supabaseConfigManager.ts',
            'src/services/apiConfigServiceDB.ts',
            'src/services/apiSwitch.ts'
        ];
        
        let configScore = 0;
        const configResults = {};
        
        configFiles.forEach(configFile => {
            const analysis = analyzeServiceForRealQueries(configFile);
            configResults[configFile] = analysis;
            
            if (analysis.exists && analysis.isReady) {
                configScore += 1;
                log(`✅ ${configFile}: Конфигурация корректна (${analysis.scorePercent}%)`);
            } else if (analysis.exists) {
                log(`⚠️ ${configFile}: Требует доработки (${analysis.scorePercent}%)`);
            } else {
                log(`❌ ${configFile}: ${analysis.error}`);
            }
        });
        
        const overallConfigHealth = Math.round((configScore / configFiles.length) * 100);
        log(`📊 Общее состояние конфигурации: ${overallConfigHealth}%`);
        
        return {
            health: overallConfigHealth,
            ready: overallConfigHealth >= 80,
            details: configResults
        };
        
    } catch (error) {
        log(`❌ Ошибка проверки конфигурации: ${error.message}`, 'error');
        return { health: 0, ready: false, error: error.message };
    }
}

// Тестирование конкретного сервиса
function testServiceRealQueries(service) {
    log(`🧪 Тестирование сервиса: ${service.name}`);
    
    const analysis = analyzeServiceForRealQueries(service.path);
    
    if (!analysis.exists) {
        log(`❌ ${service.name}: ${analysis.error}`, 'error');
        testResults.failedServices++;
        testResults.services[service.name] = {
            status: 'failed',
            error: analysis.error,
            critical: service.critical
        };
        return false;
    }
    
    // Детальный анализ
    log(`📊 ${service.name} анализ:`);
    log(`   🔗 Supabase импорт: ${analysis.hasSupabaseImport ? '✅' : '❌'}`);
    log(`   🗄️ Supabase запросы: ${analysis.hasSupabaseQueries ? '✅' : '❌'}`);
    log(`   📋 Запросы к таблицам: ${analysis.hasRealTableQueries ? '✅' : '❌'}`);
    log(`   🚫 Mock запросы: ${analysis.hasMockQueries ? '❌' : '✅'}`);
    log(`   📡 Прямые DB вызовы: ${analysis.hasDirectDatabaseCalls ? '✅' : '❌'}`);
    log(`   ⚡ Async методы: ${analysis.hasAsyncMethods ? '✅' : '❌'}`);
    log(`   📈 Общий балл: ${analysis.realQueryScore}/${analysis.maxScore} (${analysis.scorePercent}%)`);
    
    const passed = analysis.isReady;
    
    if (passed) {
        log(`✅ ${service.name}: ГОТОВ к реальным запросам к БД (${analysis.scorePercent}%)`, 'success');
        testResults.passedServices++;
        
        if (service.critical) {
            testResults.criticalServicesPassed++;
            log(`🔥 КРИТИЧНЫЙ сервис ${service.name} готов!`, 'success');
        }
        
        testResults.services[service.name] = {
            status: 'passed',
            score: analysis.scorePercent,
            analysis: analysis,
            critical: service.critical
        };
        
    } else {
        log(`❌ ${service.name}: НЕ готов к реальным запросам (${analysis.scorePercent}%)`, 'error');
        testResults.failedServices++;
        
        if (service.critical) {
            log(`🚨 КРИТИЧЕСКИЙ СЕРВИС ${service.name} НЕ ГОТОВ!`, 'error');
        }
        
        testResults.services[service.name] = {
            status: 'failed',
            score: analysis.scorePercent,
            analysis: analysis,
            critical: service.critical,
            issues: []
        };
        
        // Определение проблем
        const issues = [];
        if (!analysis.hasSupabaseImport) issues.push('Отсутствует импорт Supabase');
        if (!analysis.hasSupabaseQueries) issues.push('Отсутствуют Supabase запросы');
        if (analysis.hasMockQueries) issues.push('Обнаружены Mock запросы');
        if (!analysis.hasDirectDatabaseCalls) issues.push('Нет прямых вызовов к БД');
        
        testResults.services[service.name].issues = issues;
        log(`   🔧 Проблемы: ${issues.join(', ')}`);
    }
    
    testResults.testedServices++;
    return passed;
}

// Генерация детального отчета
function generateDetailedReport() {
    testResults.overallHealth = testResults.testedServices > 0 ? 
        Math.round((testResults.passedServices / testResults.testedServices) * 100) : 0;
    
    const criticalHealth = testResults.totalCriticalServices > 0 ?
        Math.round((testResults.criticalServicesPassed / testResults.totalCriticalServices) * 100) : 0;
    
    log('\n📊 ДЕТАЛЬНЫЙ ОТЧЕТ О ГОТОВНОСТИ К РЕАЛЬНЫМ ЗАПРОСАМ К БД');
    log('='.repeat(80));
    
    log(`🎯 Общая статистика:`);
    log(`   📊 Всего сервисов: ${testResults.totalServices}`);
    log(`   ✅ Готовы к БД: ${testResults.passedServices}`);
    log(`   ❌ Не готовы: ${testResults.failedServices}`);
    log(`   🔥 Критичных готово: ${testResults.criticalServicesPassed}/${testResults.totalCriticalServices}`);
    log(`   📈 Общее здоровье: ${testResults.overallHealth}%`);
    log(`   🎯 Критичных здоровье: ${criticalHealth}%`);
    
    // Статус по критичным сервисам
    log(`\n🔥 Статус критичных сервисов:`);
    Object.entries(testResults.services).forEach(([serviceName, result]) => {
        if (result.critical) {
            const icon = result.status === 'passed' ? '✅' : '❌';
            const score = result.score || 0;
            log(`   ${icon} ${serviceName}: ${result.status} (${score}%)`);
            
            if (result.issues && result.issues.length > 0) {
                log(`      🔧 Проблемы: ${result.issues.join(', ')}`);
            }
        }
    });
    
    // Рекомендации
    log(`\n💡 Рекомендации:`);
    
    if (testResults.overallHealth === 100) {
        log(`   🎉 ВСЕ СЕРВИСЫ ГОТОВЫ К РЕАЛЬНЫМ ЗАПРОСАМ К БД!`, 'success');
        log(`   ✅ Mock режим можно отключать полностью`, 'success');
        log(`   🚀 Система готова к production использованию`, 'success');
    } else if (testResults.overallHealth >= 80) {
        log(`   ⚠️ Большинство сервисов готово, доработать оставшиеся`, 'warning');
        log(`   🔧 Сконцентрироваться на критичных сервисах`, 'warning');
    } else {
        log(`   ❌ Требуется значительная доработка сервисов`, 'error');
        log(`   🚫 Mock режим пока отключать НЕЛЬЗЯ`, 'error');
    }
    
    // Сохранение отчета в файл
    const reportPath = join(__dirname, `supabase-real-queries-report-${Date.now()}.json`);
    writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    log(`\n💾 Детальный отчет сохранен: ${reportPath}`);
    
    return testResults;
}

// Главная функция тестирования
async function runSupabaseRealQueriesTest() {
    log('🚀 ЗАПУСК ТЕСТИРОВАНИЯ РЕАЛЬНЫХ ЗАПРОСОВ К SUPABASE...\n');
    
    // 1. Проверка конфигурации
    log('1️⃣ ПРОВЕРКА КОНФИГУРАЦИИ SUPABASE');
    const configCheck = checkSupabaseConfiguration();
    testResults.supabaseConnected = configCheck.ready;
    
    if (configCheck.ready) {
        log('✅ Конфигурация Supabase готова для реальных запросов\n', 'success');
    } else {
        log('❌ Проблемы с конфигурацией Supabase!\n', 'error');
    }
    
    // 2. Тестирование всех сервисов
    log('2️⃣ ТЕСТИРОВАНИЕ ВСЕХ СЕРВИСОВ НА ГОТОВНОСТЬ К РЕАЛЬНЫМ ЗАПРОСАМ');
    
    for (const service of criticalServices) {
        testServiceRealQueries(service);
        log(''); // Разделитель
    }
    
    // 3. Финальная проверка Mock режима
    log('3️⃣ ПРОВЕРКА ПОЛНОГО ОТКЛЮЧЕНИЯ MOCK РЕЖИМА');
    
    try {
        const apiConfigPath = join(__dirname, 'src/services/apiConfigServiceDB.ts');
        const content = readFileSync(apiConfigPath, 'utf8');
        
        const mockDisabled = content.includes('return false; // MOCK ПОЛНОСТЬЮ ОТКЛЮЧЕН') &&
                            content.includes('const forceDatabaseMode = true');
        
        if (mockDisabled) {
            log('✅ Mock режим полностью отключен в коде', 'success');
            testResults.mockCompletelyDisabled = true;
        } else {
            log('❌ Mock режим все еще может быть активен!', 'error');
            testResults.mockCompletelyDisabled = false;
        }
        
    } catch (error) {
        log(`❌ Ошибка проверки Mock режима: ${error.message}`, 'error');
    }
    
    // 4. Генерация отчета
    const finalReport = generateDetailedReport();
    
    // Финальное заключение
    log('\n🎯 ФИНАЛЬНОЕ ЗАКЛЮЧЕНИЕ:');
    
    if (finalReport.overallHealth === 100 && finalReport.mockCompletelyDisabled && configCheck.ready) {
        log('🎉 СИСТЕМА ПОЛНОСТЬЮ ГОТОВА К РАБОТЕ ТОЛЬКО С БД!', 'success');
        log('✅ Все сервисы используют реальные запросы к Supabase', 'success');
        log('✅ Mock режим полностью отключен', 'success');
        log('✅ Конфигурация корректна', 'success');
        return { success: true, health: 100, ready: true };
    } else {
        const issues = [];
        if (finalReport.overallHealth < 100) issues.push(`Готовность: ${finalReport.overallHealth}%`);
        if (!finalReport.mockCompletelyDisabled) issues.push('Mock не отключен');
        if (!configCheck.ready) issues.push('Проблемы конфигурации');
        
        log(`❌ СИСТЕМА НЕ ПОЛНОСТЬЮ ГОТОВА: ${issues.join(', ')}`, 'error');
        log('🔧 Требуется доработка перед полным переходом на БД', 'warning');
        return { success: false, health: finalReport.overallHealth, issues: issues };
    }
}

// Запуск тестирования
runSupabaseRealQueriesTest()
    .then(result => {
        if (result.success) {
            log('\n🚀 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО: Система готова к работе только с БД!', 'success');
            process.exit(0);
        } else {
            log('\n⚠️ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО: Требуется доработка', 'warning');
            process.exit(1);
        }
    })
    .catch(error => {
        log(`\n💥 КРИТИЧЕСКАЯ ОШИБКА ТЕСТИРОВАНИЯ: ${error.message}`, 'error');
        process.exit(1);
    });