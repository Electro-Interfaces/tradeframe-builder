/**
 * Массовая миграция сервисов со старой конфигурации на новую
 */

import fs from 'fs';
import path from 'path';

// Критически важные файлы для обновления
const CRITICAL_FILES = [
    'src/services/pricesService.ts',
    'src/services/equipment.ts',
    'src/services/networksService.updated.ts',
    'src/services/priceHistoryService.ts',
    'src/services/fuelStocksHistoryService.ts'
];

// Замены для миграции
const REPLACEMENTS = [
    {
        from: "import { apiConfigService } from './apiConfigService';",
        to: "import { apiConfigServiceDB } from './apiConfigServiceDB';"
    },
    {
        from: "apiConfigService.getCurrentApiUrl()",
        to: "await this.getApiUrl()"
    },
    {
        from: "apiConfigService.isMockMode()",
        to: "await apiConfigServiceDB.isMockMode()"
    },
    {
        from: "apiConfigService.getCurrentConnection()",
        to: "await apiConfigServiceDB.getCurrentConnection()"
    },
    {
        from: "apiConfigService.getApiHeaders()",
        to: "await apiConfigServiceDB.getApiHeaders()"
    }
];

// Дополнительные паттерны, которые нужно добавить
const HELPER_METHOD = `
  private async getApiUrl() {
    const connection = await apiConfigServiceDB.getCurrentConnection();
    return connection?.url || '';
  }`;

function updateFile(filePath) {
    try {
        console.log(`🔄 Обновляем ${filePath}...`);
        
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️ Файл не найден: ${filePath}`);
            return false;
        }
        
        let content = fs.readFileSync(filePath, 'utf8');
        let hasChanges = false;
        
        // Применяем замены
        REPLACEMENTS.forEach(replacement => {
            const newContent = content.replace(new RegExp(replacement.from, 'g'), replacement.to);
            if (newContent !== content) {
                console.log(`   ✅ Заменено: ${replacement.from}`);
                content = newContent;
                hasChanges = true;
            }
        });
        
        // Добавляем helper method если его нет
        if (content.includes('await this.getApiUrl()') && !content.includes('private async getApiUrl()')) {
            // Находим первый метод класса и добавляем helper перед ним
            const classMatch = content.match(/class\s+\w+[^{]*{/);
            if (classMatch) {
                const insertIndex = content.indexOf(classMatch[0]) + classMatch[0].length;
                content = content.slice(0, insertIndex) + HELPER_METHOD + content.slice(insertIndex);
                console.log('   ✅ Добавлен helper метод getApiUrl()');
                hasChanges = true;
            }
        }
        
        // Сохраняем файл если были изменения
        if (hasChanges) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Файл обновлен: ${filePath}`);
            return true;
        } else {
            console.log(`ℹ️ Изменения не требуются: ${filePath}`);
            return false;
        }
        
    } catch (error) {
        console.error(`❌ Ошибка обновления ${filePath}:`, error.message);
        return false;
    }
}

function migrateCriticalFiles() {
    console.log('🚀 МАССОВАЯ МИГРАЦИЯ КРИТИЧЕСКИХ СЕРВИСОВ');
    console.log('='.repeat(50));
    
    let updatedCount = 0;
    
    CRITICAL_FILES.forEach(filePath => {
        if (updateFile(filePath)) {
            updatedCount++;
        }
        console.log(''); // Пустая строка для разделения
    });
    
    console.log(`📊 РЕЗУЛЬТАТ МИГРАЦИИ:`);
    console.log(`   Обновлено файлов: ${updatedCount}/${CRITICAL_FILES.length}`);
    
    if (updatedCount === CRITICAL_FILES.length) {
        console.log('🎉 ВСЕ КРИТИЧЕСКИЕ ФАЙЛЫ ОБНОВЛЕНЫ!');
    } else {
        console.log('⚠️ Некоторые файлы не удалось обновить');
    }
    
    return updatedCount;
}

// Создание сводного отчета
function generateReport() {
    console.log('\n📋 ОТЧЕТ ПО МИГРАЦИИ:');
    console.log('-'.repeat(30));
    
    CRITICAL_FILES.forEach(filePath => {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            const usesOld = content.includes('apiConfigService') && !content.includes('apiConfigServiceDB');
            const usesNew = content.includes('apiConfigServiceDB');
            
            let status = '❓ Неопределено';
            if (usesNew && !usesOld) status = '✅ Новая архитектура';
            else if (usesOld && !usesNew) status = '❌ Старая архитектура';
            else if (usesOld && usesNew) status = '🟡 Смешанная архитектура';
            
            console.log(`   ${path.basename(filePath)}: ${status}`);
        } else {
            console.log(`   ${path.basename(filePath)}: ❓ Файл не найден`);
        }
    });
}

// Запуск миграции
async function main() {
    const updatedCount = migrateCriticalFiles();
    generateReport();
    
    console.log('\n🎯 СЛЕДУЮЩИЕ ШАГИ:');
    console.log('1. Протестируйте обновленные разделы приложения');
    console.log('2. Убедитесь что все данные загружаются корректно');
    console.log('3. Проверьте переключение подключений в "Обмен данными"');
    
    if (updatedCount > 0) {
        console.log('\n⚠️ ВАЖНО: Перезапустите сервер разработки для применения изменений!');
    }
}

main().catch(error => {
    console.error('💥 Ошибка миграции:', error);
});