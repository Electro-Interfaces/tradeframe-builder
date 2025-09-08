/**
 * Прямое тестирование API торговой сети
 * Использует параметры подключения из конфигурации
 */

const API_CONFIG = {
    baseUrl: 'https://pos.autooplata.ru/tms',
    systemId: 15,
    username: 'UserApi', 
    password: 'lHQfLZHzB3tn',
    timeout: 30000
};

class TradingNetworkAPITester {
    constructor() {
        this.token = null;
    }

    async testServerAvailability() {
        console.log('\n🌐 === ТЕСТ ДОСТУПНОСТИ СЕРВЕРА ===');
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${API_CONFIG.baseUrl}/docs`, {
                method: 'HEAD',
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            
            if (response.ok) {
                console.log('✅ Сервер доступен');
                console.log(`📊 Статус: ${response.status} ${response.statusText}`);
                console.log(`🕒 Время ответа: быстро`);
                return true;
            } else {
                console.log(`⚠️  Сервер отвечает, но статус: ${response.status} ${response.statusText}`);
                return false;
            }
        } catch (error) {
            console.log(`❌ Сервер недоступен: ${error.message}`);
            return false;
        }
    }

    async testAuthentication() {
        console.log('\n🔐 === ТЕСТ АВТОРИЗАЦИИ ===');
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), API_CONFIG.timeout);

            const response = await fetch(`${API_CONFIG.baseUrl}/v1/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/plain, application/json'
                },
                body: JSON.stringify({
                    username: API_CONFIG.username,
                    password: API_CONFIG.password
                }),
                signal: controller.signal
            });

            clearTimeout(timeout);

            console.log(`📊 Статус ответа: ${response.status} ${response.statusText}`);
            console.log(`📋 Заголовки:`, Object.fromEntries(response.headers));

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Не удалось получить текст ошибки');
                console.log(`❌ Ошибка авторизации: ${errorText}`);
                return false;
            }

            const token = await response.text();
            this.token = token.replace(/^["']|["']$/g, '');
            console.log(`✅ Авторизация успешна!`);
            console.log(`🔑 Токен получен: ${this.token.substring(0, 20)}...`);
            console.log(`📏 Длина токена: ${this.token.length} символов`);
            return true;
        } catch (error) {
            console.log(`❌ Критическая ошибка авторизации: ${error.message}`);
            this.token = null;
            return false;
        }
    }

    async testServices() {
        console.log('\n📋 === ТЕСТ СПРАВОЧНИКА УСЛУГ ===');
        
        if (!this.token) {
            console.log('❌ Токен авторизации отсутствует');
            return false;
        }

        try {
            const url = `${API_CONFIG.baseUrl}/v1/services?system=${API_CONFIG.systemId}`;
            console.log(`🔗 URL запроса: ${url}`);

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), API_CONFIG.timeout);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeout);

            console.log(`📊 Статус ответа: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Не удалось получить текст ошибки');
                console.log(`❌ Ошибка получения справочника услуг: ${errorText}`);
                return false;
            }

            const services = await response.json();
            console.log(`✅ Справочник услуг получен успешно`);
            console.log(`📊 Количество услуг: ${Array.isArray(services) ? services.length : 'Не массив'}`);
            console.log(`📋 Данные:`, JSON.stringify(services, null, 2));
            return true;
        } catch (error) {
            console.log(`❌ Ошибка при получении справочника услуг: ${error.message}`);
            return false;
        }
    }

    async testPrices() {
        console.log('\n💰 === ТЕСТ ПОЛУЧЕНИЯ ЦЕН ===');
        
        if (!this.token) {
            console.log('❌ Токен авторизации отсутствует');
            return false;
        }

        const stationNumber = 4; // Станция по умолчанию из конфигурации
        
        try {
            const dateParam = new Date().toISOString();
            const url = `${API_CONFIG.baseUrl}/v1/pos/prices/${stationNumber}?system=${API_CONFIG.systemId}&date=${encodeURIComponent(dateParam)}`;
            console.log(`🔗 URL запроса: ${url}`);

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), API_CONFIG.timeout);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeout);

            console.log(`📊 Статус ответа: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Не удалось получить текст ошибки');
                console.log(`❌ Ошибка получения цен: ${errorText}`);
                return false;
            }

            const pricesData = await response.json();
            console.log(`✅ Цены получены успешно для станции ${stationNumber}`);
            console.log(`📋 Данные:`, JSON.stringify(pricesData, null, 2));
            return true;
        } catch (error) {
            console.log(`❌ Ошибка при получении цен: ${error.message}`);
            return false;
        }
    }

    async testMonitoringInfo() {
        console.log('\n🔧 === ТЕСТ МОНИТОРИНГА ОБОРУДОВАНИЯ ===');
        
        if (!this.token) {
            console.log('❌ Токен авторизации отсутствует');
            return false;
        }

        const stationNumber = 4;
        
        try {
            const url = `${API_CONFIG.baseUrl}/v1/info?system=${API_CONFIG.systemId}&station=${stationNumber}`;
            console.log(`🔗 URL запроса: ${url}`);

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), API_CONFIG.timeout);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeout);

            console.log(`📊 Статус ответа: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Не удалось получить текст ошибки');
                console.log(`❌ Ошибка получения информации о мониторинге: ${errorText}`);
                return false;
            }

            const monitoringData = await response.json();
            console.log(`✅ Данные мониторинга получены успешно для станции ${stationNumber}`);
            console.log(`📋 Данные:`, JSON.stringify(monitoringData, null, 2));
            return true;
        } catch (error) {
            console.log(`❌ Ошибка при получении данных мониторинга: ${error.message}`);
            return false;
        }
    }

    async runAllTests() {
        console.log('🚀 ЗАПУСК ПОЛНОГО ТЕСТИРОВАНИЯ API ТОРГОВОЙ СЕТИ');
        console.log('=' .repeat(60));
        console.log(`📋 Конфигурация:`);
        console.log(`   URL: ${API_CONFIG.baseUrl}`);
        console.log(`   System ID: ${API_CONFIG.systemId}`);
        console.log(`   Username: ${API_CONFIG.username}`);
        console.log(`   Timeout: ${API_CONFIG.timeout}ms`);
        console.log('=' .repeat(60));

        const results = {
            serverAvailable: false,
            authenticationSucceeded: false,
            servicesWork: false,
            pricesWork: false,
            monitoringWork: false
        };

        // Тест доступности сервера
        results.serverAvailable = await this.testServerAvailability();
        
        if (!results.serverAvailable) {
            console.log('\n❌ Сервер недоступен - остальные тесты пропущены');
            return results;
        }

        // Тест авторизации
        results.authenticationSucceeded = await this.testAuthentication();
        
        if (!results.authenticationSucceeded) {
            console.log('\n❌ Авторизация не удалась - остальные тесты пропущены');
            return results;
        }

        // Тест справочника услуг
        results.servicesWork = await this.testServices();

        // Тест получения цен
        results.pricesWork = await this.testPrices();

        // Тест мониторинга оборудования
        results.monitoringWork = await this.testMonitoringInfo();

        // Итоговый отчет
        console.log('\n' + '=' .repeat(60));
        console.log('📊 ИТОГОВЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ');
        console.log('=' .repeat(60));
        console.log(`🌐 Доступность сервера:      ${results.serverAvailable ? '✅ ДА' : '❌ НЕТ'}`);
        console.log(`🔐 Авторизация:              ${results.authenticationSucceeded ? '✅ ДА' : '❌ НЕТ'}`);
        console.log(`📋 Справочник услуг:         ${results.servicesWork ? '✅ ДА' : '❌ НЕТ'}`);
        console.log(`💰 Получение цен:            ${results.pricesWork ? '✅ ДА' : '❌ НЕТ'}`);
        console.log(`🔧 Мониторинг оборудования:  ${results.monitoringWork ? '✅ ДА' : '❌ НЕТ'}`);

        const successfulTests = Object.values(results).filter(Boolean).length;
        const totalTests = Object.keys(results).length;
        
        console.log(`\n🎯 Результат: ${successfulTests}/${totalTests} тестов прошли успешно`);
        
        if (successfulTests === totalTests) {
            console.log('🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО! API торговой сети полностью функционирует.');
        } else if (results.serverAvailable && results.authenticationSucceeded) {
            console.log('⚠️  API частично работает. Есть проблемы с отдельными функциями.');
        } else {
            console.log('❌ API торговой сети НЕ РАБОТАЕТ. Требуется устранение проблем.');
        }

        return results;
    }
}

// Запуск тестирования
if (require.main === module) {
    const tester = new TradingNetworkAPITester();
    tester.runAllTests().catch(error => {
        console.error('💥 Критическая ошибка при выполнении тестирования:', error);
        process.exit(1);
    });
}

module.exports = TradingNetworkAPITester;