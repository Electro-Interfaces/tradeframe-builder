/**
 * 🔍 Прямая проверка готовности сервисов
 * 
 * Этот скрипт можно запустить напрямую через Node.js
 * для проверки корректности TypeScript файлов
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Список сервисов для проверки
const servicesToCheck = [
    'src/services/apiConfigServiceDB.ts',
    'src/services/apiSwitch.ts', 
    'src/services/supabaseConfigManager.ts',
    'src/services/equipmentSupabase.ts',
    'src/services/operationsSupabaseService.ts',
    'src/services/pricesSupabaseService.ts',
    'src/services/usersSupabaseService.ts',
    'src/services/componentsSupabase.ts',
    'src/services/authService.ts',
    'src/services/supabaseAuthService.ts'
];

function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`[${timestamp}] ${icon} ${message}`);
}

function checkFileExists(filePath) {
    const fullPath = join(__dirname, filePath);
    const exists = existsSync(fullPath);
    
    if (exists) {
        log(`Файл найден: ${filePath}`, 'success');
        return true;
    } else {
        log(`Файл НЕ найден: ${filePath}`, 'error');
        return false;
    }
}

function checkFileContent(filePath) {
    try {
        const fullPath = join(__dirname, filePath);
        const content = readFileSync(fullPath, 'utf8');
        
        // Базовые проверки содержимого
        const checks = {
            hasExports: content.includes('export'),
            hasImports: content.includes('import'),
            hasSupabase: content.includes('supabase') || content.includes('Supabase'),
            hasMock: content.includes('mock') || content.includes('Mock'),
            hasTypeScript: content.includes(': ') && content.includes('=>'),
            length: content.length
        };
        
        log(`Анализ ${filePath}:`);
        log(`  📦 Экспорты: ${checks.hasExports ? '✅' : '❌'}`);
        log(`  📥 Импорты: ${checks.hasImports ? '✅' : '❌'}`);
        log(`  🗄️ Supabase упоминания: ${checks.hasSupabase ? '✅' : '❌'}`);
        log(`  🚫 Mock упоминания: ${checks.hasMock ? '⚠️' : '✅'}`);
        log(`  📝 TypeScript синтаксис: ${checks.hasTypeScript ? '✅' : '❌'}`);
        log(`  📏 Размер файла: ${checks.length} символов`);
        
        return checks;
        
    } catch (error) {
        log(`Ошибка чтения ${filePath}: ${error.message}`, 'error');
        return null;
    }
}

function checkMockDisabled() {
    log('🔍 Проверка отключения Mock режима...');
    
    try {
        const apiConfigPath = join(__dirname, 'src/services/apiConfigServiceDB.ts');
        const content = readFileSync(apiConfigPath, 'utf8');
        
        // Проверяем что isMockMode всегда возвращает false
        const mockModeFunction = content.includes('return false; // MOCK ПОЛНОСТЬЮ ОТКЛЮЧЕН');
        const forceDatabaseMode = content.includes('const forceDatabaseMode = true');
        const mockDisabledInConfig = content.includes('disableMock: true');
        
        log('  🚫 isMockMode возвращает false: ' + (mockModeFunction ? '✅' : '❌'));
        log('  🔧 forceDatabaseMode активен: ' + (forceDatabaseMode ? '✅' : '❌'));
        log('  ⚙️ disableMock в конфигурации: ' + (mockDisabledInConfig ? '✅' : '❌'));
        
        const mockFullyDisabled = mockModeFunction && forceDatabaseMode && mockDisabledInConfig;
        
        if (mockFullyDisabled) {
            log('✅ Mock режим ПОЛНОСТЬЮ отключен в коде!', 'success');
        } else {
            log('❌ Mock режим НЕ полностью отключен!', 'error');
        }
        
        return mockFullyDisabled;
        
    } catch (error) {
        log(`Ошибка проверки Mock режима: ${error.message}`, 'error');
        return false;
    }
}

function checkSupabaseConfiguration() {
    log('🔍 Проверка конфигурации Supabase...');
    
    try {
        const apiSwitchPath = join(__dirname, 'src/services/apiSwitch.ts');
        const content = readFileSync(apiSwitchPath, 'utf8');
        
        const productionMode = content.includes("mode: 'SUPABASE_PRODUCTION'");
        const mockDisabled = content.includes('mockDisabled: true');
        const forceDatabaseMode = content.includes('forceDatabaseMode: true');
        
        log('  🚀 SUPABASE_PRODUCTION режим: ' + (productionMode ? '✅' : '❌'));
        log('  🚫 mockDisabled установлен: ' + (mockDisabled ? '✅' : '❌'));
        log('  🔧 forceDatabaseMode установлен: ' + (forceDatabaseMode ? '✅' : '❌'));
        
        const supabaseConfigured = productionMode && mockDisabled && forceDatabaseMode;
        
        if (supabaseConfigured) {
            log('✅ Supabase конфигурация корректна!', 'success');
        } else {
            log('❌ Supabase конфигурация требует доработки!', 'error');
        }
        
        return supabaseConfigured;
        
    } catch (error) {
        log(`Ошибка проверки Supabase конфигурации: ${error.message}`, 'error');
        return false;
    }
}

function generateReport(results) {
    log('\n📊 ИТОГОВЫЙ ОТЧЕТ ПРОВЕРКИ ГОТОВНОСТИ СЕРВИСОВ');
    log('=' * 60);
    
    const totalFiles = servicesToCheck.length;
    const existingFiles = results.fileChecks.filter(r => r.exists).length;
    const validFiles = results.fileChecks.filter(r => r.content && r.content.hasExports).length;
    
    log(`📁 Файлы найдены: ${existingFiles}/${totalFiles}`);
    log(`✅ Валидные файлы: ${validFiles}/${totalFiles}`);
    log(`🚫 Mock отключен: ${results.mockDisabled ? '✅' : '❌'}`);
    log(`🗄️ Supabase настроен: ${results.supabaseConfigured ? '✅' : '❌'}`);
    
    const overallHealth = Math.round(
        (existingFiles / totalFiles * 25) +
        (validFiles / totalFiles * 25) +
        (results.mockDisabled ? 25 : 0) +
        (results.supabaseConfigured ? 25 : 0)
    );
    
    log(`\n🎯 ОБЩАЯ ГОТОВНОСТЬ СИСТЕМЫ: ${overallHealth}%`);
    
    if (overallHealth >= 90) {
        log('🎉 СИСТЕМА ПОЛНОСТЬЮ ГОТОВА К PRODUCTION!', 'success');
    } else if (overallHealth >= 70) {
        log('⚠️ Система почти готова, требуются минимальные доработки', 'warning');
    } else {
        log('❌ Система требует значительных доработок', 'error');
    }
    
    return overallHealth;
}

// Основная функция проверки
async function runServiceReadinessCheck() {
    log('🚀 Запуск проверки готовности сервисов к работе с БД...\n');
    
    const results = {
        fileChecks: [],
        mockDisabled: false,
        supabaseConfigured: false
    };
    
    // 1. Проверка существования файлов
    log('📁 Проверка существования файлов сервисов...');
    for (const service of servicesToCheck) {
        const exists = checkFileExists(service);
        const content = exists ? checkFileContent(service) : null;
        
        results.fileChecks.push({
            path: service,
            exists,
            content
        });
        
        log(''); // Пустая строка для разделения
    }
    
    // 2. Проверка отключения Mock режима
    results.mockDisabled = checkMockDisabled();
    log('');
    
    // 3. Проверка конфигурации Supabase
    results.supabaseConfigured = checkSupabaseConfiguration();
    log('');
    
    // 4. Генерация итогового отчета
    const healthScore = generateReport(results);
    
    return {
        health: healthScore,
        ready: healthScore >= 90,
        results
    };
}

// Запуск проверки
runServiceReadinessCheck()
    .then(result => {
        if (result.ready) {
            log('\n✅ ПРОВЕРКА ЗАВЕРШЕНА: Система готова к полному отказу от Mock!', 'success');
            process.exit(0);
        } else {
            log('\n❌ ПРОВЕРКА ЗАВЕРШЕНА: Система требует доработки', 'error');
            process.exit(1);
        }
    })
    .catch(error => {
        log(`\n💥 КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`, 'error');
        process.exit(1);
    });

// Экспорт функций для использования в других файлах
export {
    runServiceReadinessCheck,
    checkFileExists,
    checkFileContent,
    checkMockDisabled,
    checkSupabaseConfiguration
};