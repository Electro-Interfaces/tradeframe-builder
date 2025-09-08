/**
 * Тестирование реальных сервисов нового механизма подключения к БД
 * Запускается через Node.js для проверки серверной части
 */

const { createClient } = require('@supabase/supabase-js');

// Тестовые данные (в реальном приложении должны браться из переменных окружения)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_SERVICE_KEY || 'your-key';

console.log('🔧 Тестирование нового механизма подключения к БД');
console.log('==================================================');

/**
 * Тест 1: Базовое подключение к Supabase
 */
async function testBasicConnection() {
    console.log('\n📡 Тест 1: Базовое подключение к Supabase');
    
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        
        // Простой запрос для проверки соединения
        const { data, error } = await supabase
            .from('networks')
            .select('id, name')
            .limit(1);
            
        if (error) {
            console.error('❌ Ошибка запроса:', error.message);
            return false;
        }
        
        console.log('✅ Базовое подключение работает');
        console.log(`   Найдено записей: ${data?.length || 0}`);
        
        if (data && data.length > 0) {
            console.log(`   Пример записи: ${JSON.stringify(data[0])}`);
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Критическая ошибка подключения:', error.message);
        return false;
    }
}

/**
 * Тест 2: Системная конфигурация
 */
async function testSystemConfig() {
    console.log('\n⚙️ Тест 2: Системная конфигурация');
    
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        
        // Проверяем таблицу system_config
        const { data: configData, error: configError } = await supabase
            .from('system_config')
            .select('config_key, config_type')
            .limit(5);
            
        if (configError) {
            console.error('❌ Ошибка системной конфигурации:', configError.message);
            
            // Возможно таблица не создана - это нормально для нового проекта
            if (configError.code === '42P01') {
                console.log('⚠️ Таблица system_config не найдена - нужно создать');
                return 'need_setup';
            }
            
            return false;
        }
        
        console.log('✅ Системная конфигурация доступна');
        console.log(`   Найдено конфигураций: ${configData?.length || 0}`);
        
        if (configData && configData.length > 0) {
            console.log('   Ключи конфигурации:');
            configData.forEach(config => {
                console.log(`   - ${config.config_key} (${config.config_type})`);
            });
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка тестирования системной конфигурации:', error.message);
        return false;
    }
}

/**
 * Тест 3: Основные таблицы данных
 */
async function testDataTables() {
    console.log('\n🗄️ Тест 3: Основные таблицы данных');
    
    const tables = [
        { name: 'networks', description: 'Торговые сети' },
        { name: 'trading_points', description: 'Торговые точки' },
        { name: 'equipment_templates', description: 'Шаблоны оборудования' },
        { name: 'user_preferences', description: 'Предпочтения пользователей' }
    ];
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const results = {};
    
    for (const table of tables) {
        try {
            console.log(`\n   Проверка таблицы: ${table.name} (${table.description})`);
            
            const { data, error, count } = await supabase
                .from(table.name)
                .select('*', { count: 'exact', head: true });
                
            if (error) {
                console.error(`   ❌ Ошибка: ${error.message}`);
                results[table.name] = { status: 'error', error: error.message };
            } else {
                console.log(`   ✅ Доступна, записей: ${count || 0}`);
                results[table.name] = { status: 'ok', count: count || 0 };
            }
            
        } catch (error) {
            console.error(`   ❌ Критическая ошибка: ${error.message}`);
            results[table.name] = { status: 'critical', error: error.message };
        }
    }
    
    console.log('\n📊 Сводка по таблицам:');
    Object.entries(results).forEach(([table, result]) => {
        const status = result.status === 'ok' ? '✅' : 
                      result.status === 'error' ? '⚠️' : '❌';
        const info = result.status === 'ok' ? `(${result.count} записей)` : 
                     `(${result.error})`;
        console.log(`   ${status} ${table} ${info}`);
    });
    
    return results;
}

/**
 * Тест 4: Проверка разрешений (RLS)
 */
async function testPermissions() {
    console.log('\n🔐 Тест 4: Проверка разрешений (RLS)');
    
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        
        // Пытаемся выполнить операцию чтения
        const { data: readData, error: readError } = await supabase
            .from('networks')
            .select('id, name')
            .limit(1);
            
        if (readError) {
            console.log('❌ Ошибка чтения:', readError.message);
            
            if (readError.code === '42501') {
                console.log('⚠️ RLS активен - нужны права доступа');
                return 'rls_active';
            }
            
            return false;
        } else {
            console.log('✅ Чтение разрешено');
        }
        
        // Пытаемся выполнить операцию записи (тест)
        const testData = {
            name: 'ТЕСТ - Удалить',
            external_id: 'test-' + Date.now(),
            description: 'Тестовая запись для проверки прав'
        };
        
        const { data: writeData, error: writeError } = await supabase
            .from('networks')
            .insert(testData)
            .select()
            .single();
            
        if (writeError) {
            console.log('❌ Ошибка записи:', writeError.message);
            
            if (writeError.code === '42501') {
                console.log('⚠️ Запись запрещена RLS - это нормально');
                return 'read_only';
            }
            
            return false;
        } else {
            console.log('✅ Запись разрешена');
            
            // Сразу удаляем тестовую запись
            if (writeData) {
                await supabase
                    .from('networks')
                    .delete()
                    .eq('id', writeData.id);
                console.log('🗑️ Тестовая запись удалена');
            }
            
            return 'full_access';
        }
        
    } catch (error) {
        console.error('❌ Ошибка тестирования разрешений:', error.message);
        return false;
    }
}

/**
 * Главная функция тестирования
 */
async function runTests() {
    console.log('🚀 Запуск комплексного тестирования...\n');
    
    const results = {
        basicConnection: await testBasicConnection(),
        systemConfig: await testSystemConfig(),
        dataTables: await testDataTables(),
        permissions: await testPermissions()
    };
    
    console.log('\n' + '='.repeat(50));
    console.log('📋 ИТОГОВЫЙ ОТЧЕТ');
    console.log('='.repeat(50));
    
    // Анализируем результаты
    let allGood = true;
    
    console.log('\n✅ УСПЕШНЫЕ ТЕСТЫ:');
    if (results.basicConnection === true) {
        console.log('  - Базовое подключение к Supabase работает');
    } else {
        console.log('  - ❌ Базовое подключение не работает');
        allGood = false;
    }
    
    if (results.systemConfig === true) {
        console.log('  - Системная конфигурация доступна');
    } else if (results.systemConfig === 'need_setup') {
        console.log('  - ⚠️ Системная конфигурация требует настройки');
    } else {
        console.log('  - ❌ Системная конфигурация недоступна');
        allGood = false;
    }
    
    if (typeof results.dataTables === 'object') {
        const tableStats = Object.values(results.dataTables);
        const okTables = tableStats.filter(t => t.status === 'ok').length;
        const totalTables = tableStats.length;
        console.log(`  - Доступные таблицы: ${okTables}/${totalTables}`);
        
        if (okTables < totalTables) {
            console.log('  - ⚠️ Некоторые таблицы недоступны');
        }
    }
    
    if (results.permissions === 'full_access') {
        console.log('  - Полные права доступа (чтение и запись)');
    } else if (results.permissions === 'read_only') {
        console.log('  - Права только на чтение (RLS активен)');
    } else if (results.permissions === 'rls_active') {
        console.log('  - RLS активен, нужна аутентификация');
    } else {
        console.log('  - ❌ Ошибка прав доступа');
        allGood = false;
    }
    
    console.log('\n🎯 РЕКОМЕНДАЦИИ:');
    
    if (!results.basicConnection) {
        console.log('  - Проверьте SUPABASE_URL и ключи в переменных окружения');
        console.log('  - Убедитесь, что проект Supabase запущен и доступен');
    }
    
    if (results.systemConfig === 'need_setup') {
        console.log('  - Создайте таблицу system_config в Supabase');
        console.log('  - Настройте начальную конфигурацию в разделе "Обмен данными"');
    }
    
    if (results.permissions === 'rls_active') {
        console.log('  - Настройте RLS политики для анонимного доступа');
        console.log('  - Или используйте service_role ключ для полного доступа');
    }
    
    console.log('\n' + (allGood ? '🎉 ВСЕ БАЗОВЫЕ ТЕСТЫ ПРОЙДЕНЫ' : '⚠️ ЕСТЬ ПРОБЛЕМЫ, ТРЕБУЮЩИЕ ВНИМАНИЯ'));
    console.log('='.repeat(50));
}

// Запускаем тесты
if (require.main === module) {
    runTests().catch(error => {
        console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА ТЕСТИРОВАНИЯ:', error);
        process.exit(1);
    });
}

module.exports = { runTests, testBasicConnection, testSystemConfig, testDataTables, testPermissions };