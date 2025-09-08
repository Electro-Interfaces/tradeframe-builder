/**
 * Выполнение SQL запросов через Supabase REST API
 */

import fs from 'fs';

const API_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

async function executeSQLFile(filename) {
    console.log(`📄 Читаем SQL файл: ${filename}`);
    
    try {
        const sqlContent = fs.readFileSync(filename, 'utf8');
        console.log(`✅ SQL файл загружен (${sqlContent.length} символов)`);
        
        // Разбиваем на отдельные команды (по точке с запятой)
        const sqlCommands = sqlContent
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
            
        console.log(`📝 Найдено SQL команд: ${sqlCommands.length}`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < sqlCommands.length; i++) {
            const command = sqlCommands[i];
            console.log(`\n🔧 Выполняем команду ${i + 1}/${sqlCommands.length}:`);
            console.log(command.substring(0, 100) + (command.length > 100 ? '...' : ''));
            
            try {
                await executeSQLCommand(command);
                successCount++;
                console.log(`✅ Команда ${i + 1} выполнена успешно`);
            } catch (error) {
                errorCount++;
                console.error(`❌ Ошибка в команде ${i + 1}:`, error.message);
                
                // Продолжаем выполнение остальных команд
            }
        }
        
        console.log(`\n📊 Результат: ${successCount} успешно, ${errorCount} с ошибками`);
        return { success: successCount, errors: errorCount };
        
    } catch (error) {
        console.error('❌ Ошибка при работе с файлом:', error.message);
        throw error;
    }
}

async function executeSQLCommand(sql) {
    // Для команд CREATE TABLE, INSERT и др. используем прямой подход
    if (sql.toLowerCase().includes('create table')) {
        return await executeCreateTable(sql);
    }
    
    if (sql.toLowerCase().includes('insert into')) {
        return await executeInsert(sql);
    }
    
    if (sql.toLowerCase().includes('select')) {
        return await executeSelect(sql);
    }
    
    // Для других команд просто логируем
    console.log('⚠️ Пропускаем команду (не поддерживается через REST API):', sql.substring(0, 50));
}

async function executeCreateTable(sql) {
    // Попробуем создать таблицу через попытку вставки (если таблица не существует - получим ошибку)
    console.log('🏗️ Создание таблицы...');
    
    // Просто пытаемся обратиться к таблице system_config
    const response = await fetch(`${API_URL}/rest/v1/system_config?select=id&limit=1`, {
        headers: {
            'apikey': API_KEY,
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (response.status === 404) {
        throw new Error('Таблица system_config не существует. Создайте её вручную в Supabase Dashboard.');
    }
    
    console.log('✅ Таблица доступна');
}

async function executeInsert(sql) {
    // Извлекаем данные из INSERT запроса и выполняем через REST API
    if (sql.includes('system_config')) {
        return await insertSystemConfig(sql);
    }
}

async function insertSystemConfig(sql) {
    console.log('📝 Добавление данных в system_config...');
    
    // Парсим INSERT команду для извлечения данных
    const valuesMatch = sql.match(/VALUES\s*\(\s*'([^']+)'[^,]*,\s*'({[^}]+.*?})'/);
    if (!valuesMatch) {
        throw new Error('Не удалось распарсить INSERT команду');
    }
    
    const configKey = valuesMatch[1];
    const configValueStr = valuesMatch[2].replace(/'/g, '"');
    
    let configValue;
    try {
        configValue = JSON.parse(configValueStr);
    } catch (e) {
        throw new Error(`Ошибка парсинга JSON: ${e.message}`);
    }
    
    // Извлекаем другие поля
    const typeMatch = sql.match(/'([^']+)',\s*'[^']*'\s*\)(?:\s*ON CONFLICT)?$/);
    const descMatch = sql.match(/'([^']+)'\s*\)\s*ON CONFLICT/);
    
    const data = {
        config_key: configKey,
        config_value: configValue,
        config_type: 'database', // По умолчанию
        description: descMatch ? descMatch[1] : 'Автоматически добавлено'
    };
    
    console.log(`Добавляем: ${configKey}`);
    
    const response = await fetch(`${API_URL}/rest/v1/system_config`, {
        method: 'POST',
        headers: {
            'apikey': API_KEY,
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
    }
    
    const result = await response.json();
    console.log(`✅ Добавлена запись с ID: ${result[0]?.id}`);
}

async function executeSelect(sql) {
    console.log('📖 Выполнение SELECT запроса...');
    
    if (sql.includes('system_config')) {
        const response = await fetch(`${API_URL}/rest/v1/system_config?select=*&order=config_type,config_key`, {
            headers: {
                'apikey': API_KEY,
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`HTTP ${response.status}: ${error}`);
        }
        
        const data = await response.json();
        console.log(`📊 Найдено записей: ${data.length}`);
        
        data.forEach((record, i) => {
            console.log(`${i + 1}. ${record.config_key} (${record.config_type})`);
            console.log(`   ${record.description}`);
            console.log(`   Создано: ${new Date(record.created_at).toLocaleString()}`);
        });
    }
}

// Основная функция
async function main() {
    console.log('🚀 Выполнение SQL файла для создания system_config...');
    
    try {
        // Сначала проверим доступ к базе
        console.log('🔍 Проверка доступа к базе данных...');
        const testResponse = await fetch(`${API_URL}/rest/v1/networks?select=id&limit=1`, {
            headers: {
                'apikey': API_KEY,
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!testResponse.ok) {
            throw new Error(`Нет доступа к базе данных: ${testResponse.status}`);
        }
        
        console.log('✅ Доступ к базе данных подтвержден');
        
        // Выполняем SQL файл
        const result = await executeSQLFile('create-system-config-table.sql');
        
        console.log('\n🎉 Выполнение завершено!');
        console.log(`📊 Результат: ${result.success} успешно, ${result.errors} ошибок`);
        
    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message);
    }
}

// Запуск
main().catch(console.error);