/**
 * Прямой SQL инструмент для Claude Code
 * Позволяет выполнять SQL запросы напрямую к Supabase PostgreSQL
 */

import https from 'https';
import url from 'url';

// Конфигурация Supabase
const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

/**
 * Выполнить SQL запрос через Supabase RPC
 */
async function executeSQL(sqlQuery) {
    return new Promise((resolve, reject) => {
        // Используем специальный RPC эндпоинт для выполнения произвольного SQL
        const requestUrl = `${SUPABASE_URL}/rest/v1/rpc/execute_sql`;
        
        const postData = JSON.stringify({
            sql: sqlQuery
        });

        const parsedUrl = url.parse(requestUrl);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.path,
            method: 'POST',
            headers: {
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'Prefer': 'return=representation'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        const result = data ? JSON.parse(data) : null;
                        console.log('✅ SQL выполнен успешно');
                        console.log('📊 Результат:', result);
                        resolve(result);
                    } else {
                        console.log('❌ SQL ошибка:', res.statusCode, data);
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

/**
 * Выполнить простой SELECT запрос через REST API
 */
async function executeSelect(table, options = {}) {
    return new Promise((resolve, reject) => {
        let requestUrl = `${SUPABASE_URL}/rest/v1/${table}`;
        
        // Добавляем параметры
        const params = new URLSearchParams();
        if (options.select) params.append('select', options.select);
        if (options.limit) params.append('limit', options.limit);
        if (options.offset) params.append('offset', options.offset);
        
        // Фильтры
        if (options.eq) {
            Object.entries(options.eq).forEach(([key, value]) => {
                params.append(key, `eq.${value}`);
            });
        }
        
        if (params.toString()) {
            requestUrl += '?' + params.toString();
        }

        const parsedUrl = url.parse(requestUrl);
        
        const options_req = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.path,
            method: 'GET',
            headers: {
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options_req, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        const result = JSON.parse(data);
                        console.log(`✅ SELECT из ${table} выполнен успешно`);
                        console.log(`📊 Получено записей: ${Array.isArray(result) ? result.length : 1}`);
                        resolve(result);
                    } else {
                        console.log('❌ SELECT ошибка:', res.statusCode, data);
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

/**
 * Получить структуру таблицы
 */
async function describeTable(tableName) {
    const sql = `
        SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = '${tableName}' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
    `;
    
    console.log(`🔍 Анализ структуры таблицы: ${tableName}`);
    
    try {
        // Используем прямой SELECT из information_schema
        const result = await executeSelect('information_schema.columns', {
            select: 'column_name,data_type,is_nullable,column_default',
            eq: { 
                table_name: tableName,
                table_schema: 'public'
            }
        });
        
        console.log(`📋 Структура таблицы ${tableName}:`);
        result.forEach(col => {
            console.log(`  • ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
        
        return result;
    } catch (error) {
        console.log('⚠️ Используем альтернативный метод...');
        // Альтернативный метод - получить sample данных
        try {
            const sample = await executeSelect(tableName, { limit: 1 });
            if (sample.length > 0) {
                const columns = Object.keys(sample[0]);
                console.log(`📋 Столбцы таблицы ${tableName}:`, columns);
                return columns.map(col => ({ column_name: col, data_type: 'unknown' }));
            }
        } catch (err) {
            console.log('❌ Не удалось получить структуру таблицы:', err.message);
        }
    }
}

// Основная функция для CLI использования
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('🚀 SQL Query Tool для Supabase');
        console.log('');
        console.log('Использование:');
        console.log('  node sql-query-tool.js describe <table_name>     - Структура таблицы');
        console.log('  node sql-query-tool.js select <table_name>       - Первые 10 записей');
        console.log('  node sql-query-tool.js tables                    - Список таблиц');
        console.log('');
        console.log('Примеры:');
        console.log('  node sql-query-tool.js describe equipment_templates');
        console.log('  node sql-query-tool.js select equipment_templates');
        console.log('  node sql-query-tool.js tables');
        return;
    }

    const command = args[0];
    const tableName = args[1];

    try {
        switch (command) {
            case 'describe':
                if (!tableName) {
                    console.log('❌ Укажите имя таблицы');
                    return;
                }
                await describeTable(tableName);
                break;

            case 'select':
                if (!tableName) {
                    console.log('❌ Укажите имя таблицы');
                    return;
                }
                console.log(`🔍 Выборка из таблицы: ${tableName}`);
                const data = await executeSelect(tableName, { limit: 10 });
                console.log('📊 Данные:');
                console.log(JSON.stringify(data, null, 2));
                break;

            case 'tables':
                console.log('🔍 Получение списка таблиц...');
                try {
                    // Попробуем получить через information_schema
                    const tables = await executeSelect('information_schema.tables', {
                        select: 'table_name',
                        eq: { table_schema: 'public' }
                    });
                    console.log('📋 Доступные таблицы:');
                    tables.forEach((t, i) => console.log(`  ${i + 1}. ${t.table_name}`));
                } catch (error) {
                    console.log('⚠️ Попробуем альтернативный способ...');
                    // Проверим известные таблицы
                    const knownTables = [
                        'equipment_templates', 'equipment', 'networks', 'trading_points',
                        'operations', 'nomenclature', 'users', 'fuel_types'
                    ];
                    
                    console.log('📋 Проверка известных таблиц:');
                    for (const table of knownTables) {
                        try {
                            await executeSelect(table, { limit: 1 });
                            console.log(`  ✅ ${table}`);
                        } catch {
                            console.log(`  ❌ ${table}`);
                        }
                    }
                }
                break;

            default:
                console.log(`❌ Неизвестная команда: ${command}`);
                console.log('Используйте: describe, select, tables');
        }
    } catch (error) {
        console.log('❌ Ошибка:', error.message);
    }
}

// Запуск если файл вызван напрямую
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
    main().catch(console.error);
}

export {
    executeSQL,
    executeSelect,
    describeTable
};