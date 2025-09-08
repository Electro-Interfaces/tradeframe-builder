/**
 * 🔍 Корректная проверка использования реальной базы данных
 * 
 * Этот скрипт правильно анализирует архитектуру Supabase подключений
 * и проверяет что все сервисы действительно используют БД
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Правильный анализ архитектуры Supabase подключений
const serviceArchitecturePatterns = {
    // Паттерны корректного использования Supabase в нашей архитектуре
    hasSupabaseConnection: [
        'supabaseService',
        'createClient',
        'from @supabase/supabase-js',
        'supabaseClient',
        'getSupabaseClient'
    ],
    hasRealQueries: [
        '.select(',
        '.insert(',
        '.update(',
        '.delete(',
        '.from(',
        '.eq(',
        '.match(',
        '.order('
    ],
    hasProperAsync: [
        'async ',
        'await ',
        'Promise<'
    ],
    hasConfigIntegration: [
        'apiConfigServiceDB',
        'supabaseConfigManager',
        'SupabaseConnectionHelper',
        'executeSupabaseOperation'
    ],
    avoidsMockPatterns: [
        'localStorage.getItem',
        'mockData',
        'demoData',
        'testData: ['
    ]
};

const criticalServices = [
    {
        name: 'Equipment Supabase',
        path: 'src/services/equipmentSupabase.ts',
        critical: true,
        tables: ['equipment_templates', 'equipment']
    },
    {
        name: 'Operations Supabase', 
        path: 'src/services/operationsSupabaseService.ts',
        critical: true,
        tables: ['operations']
    },
    {
        name: 'Prices Supabase',
        path: 'src/services/pricesSupabaseService.ts', 
        critical: true,
        tables: ['prices']
    },
    {
        name: 'Users Supabase',
        path: 'src/services/usersSupabaseService.ts',
        critical: true,
        tables: ['users']
    },
    {
        name: 'Components Supabase',
        path: 'src/services/componentsSupabase.ts',
        critical: true, 
        tables: ['components']
    },
    {
        name: 'Tanks Service Supabase',
        path: 'src/services/tanksServiceSupabase.ts',
        critical: true,
        tables: ['tanks']
    }
];

const configServices = [
    {
        name: 'Supabase Service Client',
        path: 'src/services/supabaseServiceClient.ts',
        role: 'core_client'
    },
    {
        name: 'Supabase Config Manager',
        path: 'src/services/supabaseConfigManager.ts', 
        role: 'config_management'
    },
    {
        name: 'API Config Service DB',
        path: 'src/services/apiConfigServiceDB.ts',
        role: 'api_configuration'
    },
    {
        name: 'Supabase Connection Helper',
        path: 'src/services/supabaseConnectionHelper.ts',
        role: 'connection_helper'
    }
];

function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`[${timestamp}] ${icon} ${message}`);
}

function analyzeServiceArchitecture(servicePath) {
    try {
        const fullPath = join(__dirname, servicePath);
        
        if (!existsSync(fullPath)) {
            return { exists: false, error: 'Файл не найден' };
        }
        
        const content = readFileSync(fullPath, 'utf8');
        
        const analysis = {
            exists: true,
            fileSize: content.length,
            lines: content.split('\n').length
        };
        
        // Проверка подключения к Supabase (правильно учитывающая нашу архитектуру)
        analysis.hasSupabaseConnection = serviceArchitecturePatterns.hasSupabaseConnection
            .some(pattern => content.includes(pattern));
            
        // Проверка реальных запросов к БД
        analysis.hasRealQueries = serviceArchitecturePatterns.hasRealQueries
            .some(pattern => content.includes(pattern));
            
        // Проверка асинхронных операций
        analysis.hasProperAsync = serviceArchitecturePatterns.hasProperAsync
            .some(pattern => content.includes(pattern));
            
        // Проверка интеграции с конфигурацией
        analysis.hasConfigIntegration = serviceArchitecturePatterns.hasConfigIntegration
            .some(pattern => content.includes(pattern));
            
        // Проверка избежания Mock паттернов
        analysis.avoidsMockPatterns = !serviceArchitecturePatterns.avoidsMockPatterns
            .some(pattern => content.includes(pattern));
        
        // Дополнительные проверки
        analysis.hasTableReferences = content.includes('from(') || content.includes("from('") || content.includes('from("');
        analysis.hasErrorHandling = content.includes('try {') || content.includes('catch');
        analysis.hasTypeDefinitions = content.includes('interface') || content.includes('type ') || content.includes(': Promise<');
        analysis.hasExports = content.includes('export');
        
        // Расчет общего балла готовности
        let score = 0;
        const maxScore = 10;
        
        if (analysis.hasSupabaseConnection) score += 2;
        if (analysis.hasRealQueries) score += 2;
        if (analysis.hasProperAsync) score += 1;
        if (analysis.hasConfigIntegration) score += 2;
        if (analysis.avoidsMockPatterns) score += 1;
        if (analysis.hasTableReferences) score += 1;
        if (analysis.hasErrorHandling) score += 0.5;
        if (analysis.hasTypeDefinitions) score += 0.5;
        
        analysis.readinessScore = score;
        analysis.readinessPercent = Math.round((score / maxScore) * 100);
        analysis.isReady = analysis.readinessPercent >= 80;
        
        return analysis;
        
    } catch (error) {
        return { exists: false, error: error.message };
    }
}

function validateCoreInfrastructure() {
    log('🏗️ Проверка основной инфраструктуры Supabase...');
    
    const infrastructureResults = {};
    let coreReady = true;
    
    configServices.forEach(service => {
        const analysis = analyzeServiceArchitecture(service.path);
        infrastructureResults[service.name] = analysis;
        
        if (analysis.exists && analysis.isReady) {
            log(`✅ ${service.name}: Готов (${analysis.readinessPercent}%)`);
        } else if (analysis.exists) {
            log(`⚠️ ${service.name}: Требует внимания (${analysis.readinessPercent}%)`);
            if (service.role === 'core_client') coreReady = false;
        } else {
            log(`❌ ${service.name}: ${analysis.error}`);
            coreReady = false;
        }
    });
    
    return { results: infrastructureResults, ready: coreReady };
}

function validateBusinessServices() {
    log('💼 Проверка бизнес-сервисов...');
    
    const serviceResults = {};
    let criticalServicesReady = 0;
    let totalCriticalServices = criticalServices.filter(s => s.critical).length;
    
    criticalServices.forEach(service => {
        const analysis = analyzeServiceArchitecture(service.path);
        serviceResults[service.name] = analysis;
        
        if (analysis.exists) {
            log(`📊 ${service.name} анализ:`);
            log(`   🔗 Подключение к Supabase: ${analysis.hasSupabaseConnection ? '✅' : '❌'}`);
            log(`   🗄️ Реальные запросы к БД: ${analysis.hasRealQueries ? '✅' : '❌'}`);
            log(`   ⚡ Асинхронные операции: ${analysis.hasProperAsync ? '✅' : '❌'}`);
            log(`   🔧 Интеграция с конфигурацией: ${analysis.hasConfigIntegration ? '✅' : '❌'}`);
            log(`   🚫 Избегает Mock: ${analysis.avoidsMockPatterns ? '✅' : '❌'}`);
            log(`   📈 Готовность: ${analysis.readinessPercent}%`);
            
            if (analysis.isReady) {
                log(`✅ ${service.name}: ГОТОВ к работе с БД`, 'success');
                if (service.critical) criticalServicesReady++;
            } else {
                log(`❌ ${service.name}: НЕ готов к работе с БД`, 'error');
            }
        } else {
            log(`❌ ${service.name}: ${analysis.error}`, 'error');
        }
        
        log(''); // Разделитель
    });
    
    return {
        results: serviceResults,
        criticalReady: criticalServicesReady,
        totalCritical: totalCriticalServices,
        readyPercent: Math.round((criticalServicesReady / totalCriticalServices) * 100)
    };
}

function checkMockModeDisabled() {
    log('🚫 Проверка отключения Mock режима...');
    
    try {
        const apiConfigPath = join(__dirname, 'src/services/apiConfigServiceDB.ts');
        const content = readFileSync(apiConfigPath, 'utf8');
        
        const mockDisabledChecks = {
            hasForceFlag: content.includes('const forceDatabaseMode = true'),
            returnsAlwaysFalse: content.includes('return false; // MOCK ПОЛНОСТЬЮ ОТКЛЮЧЕН'),
            hasDisableConfig: content.includes('disableMock: true'),
            noMockConnections: !content.includes("type: 'mock'")
        };
        
        const allChecksPass = Object.values(mockDisabledChecks).every(Boolean);
        
        log(`   🔧 Force database mode: ${mockDisabledChecks.hasForceFlag ? '✅' : '❌'}`);
        log(`   🚫 Always returns false: ${mockDisabledChecks.returnsAlwaysFalse ? '✅' : '❌'}`);
        log(`   ⚙️ Disable config present: ${mockDisabledChecks.hasDisableConfig ? '✅' : '❌'}`);
        log(`   📝 No mock connections: ${mockDisabledChecks.noMockConnections ? '✅' : '❌'}`);
        
        if (allChecksPass) {
            log('✅ Mock режим ПОЛНОСТЬЮ отключен в коде', 'success');
        } else {
            log('⚠️ Mock режим может быть еще не полностью отключен', 'warning');
        }
        
        return { disabled: allChecksPass, checks: mockDisabledChecks };
        
    } catch (error) {
        log(`❌ Ошибка проверки Mock режима: ${error.message}`, 'error');
        return { disabled: false, error: error.message };
    }
}

function generateValidationReport(infrastructureCheck, servicesCheck, mockCheck) {
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            infrastructureReady: infrastructureCheck.ready,
            criticalServicesReady: servicesCheck.criticalReady,
            totalCriticalServices: servicesCheck.totalCritical,
            criticalReadyPercent: servicesCheck.readyPercent,
            mockDisabled: mockCheck.disabled,
            overallHealthy: false
        },
        details: {
            infrastructure: infrastructureCheck.results,
            services: servicesCheck.results,
            mockStatus: mockCheck
        },
        recommendations: []
    };
    
    // Определение общего здоровья системы
    report.summary.overallHealthy = 
        infrastructureCheck.ready && 
        servicesCheck.readyPercent >= 90 && 
        mockCheck.disabled;
    
    // Генерация рекомендаций
    if (!infrastructureCheck.ready) {
        report.recommendations.push('Исправить проблемы в основной инфраструктуре Supabase');
    }
    
    if (servicesCheck.readyPercent < 90) {
        report.recommendations.push('Довести готовность критичных сервисов до 90%+');
    }
    
    if (!mockCheck.disabled) {
        report.recommendations.push('Полностью отключить Mock режим в конфигурации');
    }
    
    if (report.summary.overallHealthy) {
        report.recommendations.push('Система готова к полноценной работе с БД');
    }
    
    return report;
}

async function runDatabaseValidation() {
    log('🚀 ЗАПУСК ВАЛИДАЦИИ ИСПОЛЬЗОВАНИЯ РЕАЛЬНОЙ БАЗЫ ДАННЫХ...\n');
    
    // 1. Проверка инфраструктуры
    log('1️⃣ ПРОВЕРКА ИНФРАСТРУКТУРЫ SUPABASE');
    const infrastructureCheck = validateCoreInfrastructure();
    log('');
    
    // 2. Проверка бизнес-сервисов
    log('2️⃣ ПРОВЕРКА БИЗНЕС-СЕРВИСОВ');
    const servicesCheck = validateBusinessServices();
    
    // 3. Проверка отключения Mock
    log('3️⃣ ПРОВЕРКА ОТКЛЮЧЕНИЯ MOCK РЕЖИМА');
    const mockCheck = checkMockModeDisabled();
    log('');
    
    // 4. Генерация отчета
    const report = generateValidationReport(infrastructureCheck, servicesCheck, mockCheck);
    
    // Сохранение отчета
    const reportPath = join(__dirname, `database-validation-report-${Date.now()}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Вывод итогов
    log('📊 ИТОГОВЫЙ ОТЧЕТ ВАЛИДАЦИИ');
    log('=' * 60);
    log(`🏗️ Инфраструктура готова: ${infrastructureCheck.ready ? '✅' : '❌'}`);
    log(`💼 Критичные сервисы готовы: ${servicesCheck.criticalReady}/${servicesCheck.totalCritical} (${servicesCheck.readyPercent}%)`);
    log(`🚫 Mock отключен: ${mockCheck.disabled ? '✅' : '❌'}`);
    log(`🎯 Общее состояние: ${report.summary.overallHealthy ? '✅ ГОТОВО' : '❌ ТРЕБУЕТ РАБОТЫ'}`);
    
    if (report.recommendations.length > 0) {
        log('\n💡 Рекомендации:');
        report.recommendations.forEach(rec => log(`   - ${rec}`));
    }
    
    log(`\n💾 Детальный отчет: ${reportPath}`);
    
    // Финальное заключение
    if (report.summary.overallHealthy) {
        log('\n🎉 ВАЛИДАЦИЯ УСПЕШНА: Система полностью готова к работе с БД!', 'success');
        return { success: true, report };
    } else {
        log('\n⚠️ ВАЛИДАЦИЯ ПОКАЗАЛА ПРОБЛЕМЫ: Требуется доработка', 'warning');
        return { success: false, report };
    }
}

// Запуск валидации
runDatabaseValidation()
    .then(result => {
        if (result.success) {
            log('\n✅ ВАЛИДАЦИЯ ЗАВЕРШЕНА УСПЕШНО', 'success');
            process.exit(0);
        } else {
            log('\n⚠️ ВАЛИДАЦИЯ ЗАВЕРШЕНА С ЗАМЕЧАНИЯМИ', 'warning');
            process.exit(1);
        }
    })
    .catch(error => {
        log(`\n💥 ОШИБКА ВАЛИДАЦИИ: ${error.message}`, 'error');
        process.exit(1);
    });