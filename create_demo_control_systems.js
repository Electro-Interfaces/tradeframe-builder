/**
 * Создание демо систем управления для всех торговых точек сети АЗС
 * Каждая АЗС получает свою систему управления с уникальными характеристиками
 */

import { executeSQL } from './tools/sql-direct.js';

// Данные торговых точек демо сети
const demoTradingPoints = [
    {
        id: "9baf5375-9929-4774-8366-c0609b9f2a51",
        code: "point1", 
        name: "АЗС №001 - Центральная",
        location: "Центральный район"
    },
    {
        id: "9be94f90-84d1-4557-b746-460e13485b65", 
        code: "point2",
        name: "АЗС №002 - Северная", 
        location: "Северный район"
    },
    {
        id: "f2566905-c748-4240-ac31-47b626ab625d",
        code: "point3", 
        name: "АЗС №003 - Южная",
        location: "Южный район"
    },
    {
        id: "f7963207-2732-4fae-988e-c73eef7645ca",
        code: "point5", 
        name: "АЗС №005 - Промзона",
        location: "Промышленная зона"
    },
    {
        id: "e8f4a629-1234-5678-9abc-def123456789",
        code: "point6", 
        name: "АЗС №006 - Окружная", 
        location: "Окружное шоссе"
    }
];

// Функция генерации уникальных данных для каждой системы управления
function generateControlSystemData(tradingPoint, index) {
    const configs = [
        // АЗС №001 - Центральная (флагманская АЗС с максимальной конфигурацией)
        {
            osType: "Windows",
            osVersion: "Windows Server 2022 Datacenter",
            serverType: "Сервер",
            cpuCores: 8,
            ramGb: 32,
            storageGb: 2000,
            role: "НефтоСервер",
            services: ["Топливо", "Магазин", "Кафе", "Мойка", "Электрозарядка"],
            protocols: ["TCP/IP", "Modbus RTU", "Modbus TCP", "OCPP 1.6", "HTTP/HTTPS", "FTP/SFTP", "SNMP"],
            ipBase: "192.168.1.",
            manufacturer: "Dell",
            model: "PowerEdge R750",
            location: "Серверная комната"
        },
        // АЗС №002 - Северная (стандартная конфигурация)  
        {
            osType: "Windows",
            osVersion: "Windows Server 2019 Standard", 
            serverType: "Сервер",
            cpuCores: 6,
            ramGb: 16,
            storageGb: 1000,
            role: "НефтоСервер",
            services: ["Топливо", "Магазин", "Мойка"],
            protocols: ["TCP/IP", "Modbus RTU", "Modbus TCP", "HTTP/HTTPS", "FTP/SFTP"],
            ipBase: "192.168.2.",
            manufacturer: "HP", 
            model: "ProLiant DL380 Gen10",
            location: "Техническое помещение"
        },
        // АЗС №003 - Южная (расширенная конфигурация)
        {
            osType: "Linux",
            osVersion: "Ubuntu Server 22.04 LTS",
            serverType: "Сервер", 
            cpuCores: 6,
            ramGb: 24,
            storageGb: 1500,
            role: "НефтоСервер",
            services: ["Топливо", "Магазин", "Кафе", "Мойка"],
            protocols: ["TCP/IP", "Modbus RTU", "Modbus TCP", "HTTP/HTTPS", "SSH/SFTP"],
            ipBase: "192.168.3.",
            manufacturer: "Supermicro",
            model: "SuperServer 5019S-M",
            location: "Серверный шкаф"
        },
        // АЗС №005 - Промзона (промышленная конфигурация)
        {
            osType: "RTOS",
            osVersion: "QNX Neutrino 7.1", 
            serverType: "Промышленный ПК",
            cpuCores: 4,
            ramGb: 16,
            storageGb: 500,
            role: "НефтоСервер",
            services: ["Топливо", "Электрозарядка"],
            protocols: ["TCP/IP", "Modbus RTU", "CAN Bus", "Profibus"],
            ipBase: "10.0.5.",
            manufacturer: "Siemens",
            model: "SIMATIC IPC547G",
            location: "Промышленный щит"
        },
        // АЗС №006 - Окружная (компактная конфигурация)
        {
            osType: "Windows", 
            osVersion: "Windows 11 IoT Enterprise",
            serverType: "Комп",
            cpuCores: 4,
            ramGb: 8,
            storageGb: 512,
            role: "Терминал",
            services: ["Топливо", "Магазин"],
            protocols: ["TCP/IP", "Modbus RTU", "HTTP/HTTPS"],
            ipBase: "192.168.6.",
            manufacturer: "ASUS",
            model: "PN50 Mini PC",
            location: "Касса оператора"
        }
    ];

    const config = configs[index] || configs[0];
    const pointNumber = tradingPoint.name.match(/№(\d+)/)?.[1] || (index + 1);
    
    return {
        // Основная информация
        "ID": 100 + index,
        "Название": `Система управления ${tradingPoint.name}`,
        "Роль системы": config.role,
        "Тип объекта": "АЗС",
        "Наличие резервирования": index < 3, // Первые 3 АЗС с резервированием
        "Статус": "active",
        
        // Архитектура и ПО
        "Тип ОС": config.osType,
        "Версия ОС": config.osVersion,
        "Тип сервера": config.serverType,
        "Количество ядер CPU": config.cpuCores,
        "Объем RAM (ГБ)": config.ramGb,
        "Объем хранилища (ГБ)": config.storageGb,
        
        // Функциональные возможности
        "Управляемые сервисы": config.services,
        "Встроенный мониторинг": true,
        
        // Сетевые возможности
        "IP-адрес": `${config.ipBase}100`,
        "Количество сетевых интерфейсов": index < 2 ? 3 : 2, // Первые 2 АЗС с 3 интерфейсами
        "Поддерживаемые протоколы": config.protocols,
        "Удаленное администрирование": true,
        
        // Надежность и обслуживание
        "Резервное копирование": true,
        "Политика обновлений": index < 3 ? "автоматическая" : "ручная",
        "Договор техобслуживания": true,
        
        // Дополнительные поля
        "Производитель": config.manufacturer,
        "Модель": config.model,
        "Серийный номер": `SCS${pointNumber}${String(Date.now()).slice(-6)}`,
        "Местоположение": config.location,
        "Дата установки": getRandomInstallDate(index),
        "Последнее обновление ПО": getRandomUpdateDate(),
        
        // Настройки мониторинга
        "Настройки мониторинга": {
            "включен": true,
            "интервал опроса (сек)": 30 + (index * 10), // Разные интервалы для разных АЗС
            "логирование событий": true,
            "уведомления": {
                "критические ошибки": true,
                "предупреждения": true,
                "обновления ПО": index < 3, // Только первые 3 АЗС с авто-уведомлениями
                "резервное копирование": true
            }
        },
        
        // Связанное оборудование (будет заполнено позже)
        "Связанные терминалы": [],
        "Связанные ТРК": [],
        "Связанные резервуары": [],
        
        // Системные поля
        "Торговая точка": tradingPoint.code,
        "Дата создания": new Date().toISOString(),
        "Дата обновления": new Date().toISOString()
    };
}

// Генерация случайных дат установки
function getRandomInstallDate(index) {
    const dates = [
        "2024-01-15", "2024-03-22", "2024-02-10", 
        "2024-04-05", "2024-05-18"
    ];
    return dates[index] || "2024-06-01";
}

// Генерация случайных дат обновления ПО
function getRandomUpdateDate() {
    const updates = [
        "2024-11-15", "2024-10-28", "2024-11-03",
        "2024-09-20", "2024-11-01"
    ];
    return updates[Math.floor(Math.random() * updates.length)];
}

async function createDemoControlSystems() {
    console.log('🚀 Создание демо систем управления для всех торговых точек...');
    
    // Получаем ID шаблона системы управления
    const templateQuery = `
        SELECT id FROM equipment_templates 
        WHERE system_type = 'control_system' 
        AND name = 'Система управления'
        LIMIT 1;
    `;
    
    try {
        const templateResult = await executeSQL(templateQuery);
        if (!templateResult || templateResult.length === 0) {
            throw new Error('Шаблон "Система управления" не найден');
        }
        
        const templateId = templateResult[0].id;
        console.log('✅ Найден шаблон системы управления:', templateId);
        
        let createdCount = 0;
        
        for (let i = 0; i < demoTradingPoints.length; i++) {
            const tradingPoint = demoTradingPoints[i];
            const systemData = generateControlSystemData(tradingPoint, i);
            
            console.log(`\n📦 Создание системы управления для ${tradingPoint.name}...`);
            
            // Проверяем, не существует ли уже система управления для этой торговой точки
            const existingCheck = `
                SELECT id FROM equipment 
                WHERE trading_point_id = '${tradingPoint.id}' 
                AND system_type = 'control_system'
                LIMIT 1;
            `;
            
            const existing = await executeSQL(existingCheck);
            if (existing && existing.length > 0) {
                console.log(`⚠️  Система управления для ${tradingPoint.name} уже существует, пропускаем`);
                continue;
            }
            
            // Создаем систему управления
            const insertQuery = `
                INSERT INTO equipment (
                    id,
                    trading_point_id,
                    template_id,
                    name,
                    system_type,
                    display_name,
                    serial_number,
                    external_id,
                    status,
                    installation_date,
                    params,
                    bindings,
                    created_at,
                    updated_at
                ) VALUES (
                    gen_random_uuid(),
                    '${tradingPoint.id}',
                    '${templateId}',
                    'Система управления',
                    'control_system',
                    '${systemData["Название"]}',
                    '${systemData["Серийный номер"]}',
                    'ctrl_${tradingPoint.code}',
                    '${systemData["Статус"]}',
                    '${systemData["Дата установки"]}',
                    '${JSON.stringify(systemData).replace(/'/g, "''")}',
                    '{}',
                    NOW(),
                    NOW()
                );
            `;
            
            await executeSQL(insertQuery);
            createdCount++;
            
            console.log(`✅ Создана система управления: ${systemData["Название"]}`);
            console.log(`   📋 Модель: ${systemData["Производитель"]} ${systemData["Модель"]}`);
            console.log(`   💻 ОС: ${systemData["Тип ОС"]} (${systemData["Версия ОС"]})`);
            console.log(`   🔧 Конфигурация: ${systemData["Количество ядер CPU"]} cores, ${systemData["Объем RAM (ГБ)"]} GB RAM`);
            console.log(`   🌐 Сервисы: ${systemData["Управляемые сервисы"].join(', ')}`);
            console.log(`   🔗 Протоколы: ${systemData["Поддерживаемые протоколы"].length} протоколов`);
        }
        
        console.log(`\n🎉 Создание систем управления завершено!`);
        console.log(`📊 Всего создано: ${createdCount} систем управления`);
        console.log(`🏢 Охвачены все торговые точки демо сети АЗС`);
        
        // Проверяем результат
        const verifyQuery = `
            SELECT 
                e.display_name,
                e.system_type,
                e.status,
                e.params->>'Производитель' as manufacturer,
                e.params->>'Модель' as model,
                e.params->>'Тип ОС' as os_type,
                tp.name as trading_point_name
            FROM equipment e
            LEFT JOIN trading_points tp ON tp.id = e.trading_point_id
            WHERE e.system_type = 'control_system'
            ORDER BY e.display_name;
        `;
        
        const verification = await executeSQL(verifyQuery);
        console.log(`\n📋 Проверка созданных систем управления:`);
        verification.forEach(system => {
            console.log(`   ✅ ${system.display_name}`);
            console.log(`      🏢 Торговая точка: ${system.trading_point_name}`);
            console.log(`      💻 Конфигурация: ${system.manufacturer} ${system.model} (${system.os_type})`);
            console.log(`      📊 Статус: ${system.status}`);
        });
        
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка при создании систем управления:', error);
        return false;
    }
}

// Запуск если вызван напрямую
if (process.argv[1].endsWith('create_demo_control_systems.js')) {
    createDemoControlSystems()
        .then(success => {
            if (success) {
                console.log('\n🎯 Все системы управления успешно созданы и готовы к использованию!');
                console.log('🔧 Теперь в разделе "Оборудование" для каждой АЗС доступна своя система управления');
                console.log('📋 Каждая система имеет уникальную конфигурацию в зависимости от типа и назначения АЗС');
                process.exit(0);
            } else {
                console.log('\n💥 Создание систем управления завершилось с ошибками');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💀 Критическая ошибка:', error);
            process.exit(1);
        });
}

export { createDemoControlSystems };