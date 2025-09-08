import https from 'https';
import url from 'url';

// Конфигурация нашей базы данных
const SUPABASE_URL = 'https://cqwzqkrfyjdcwpovzyrw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxd3pxa3JmeWpkY3dwb3Z6eXJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTU0NTQ5MSwiZXhwIjoyMDQxMTIxNDkxfQ.3-RZIAQe5JaLZgBD4lKoqGG9U3YkQHt9xQT3yzL4WNE';

/**
 * Выполнить HTTP запрос к Supabase
 */
async function makeRequest(endpoint, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const requestUrl = `${SUPABASE_URL}/rest/v1/${endpoint}`;
        const parsedUrl = url.parse(requestUrl);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.path + (parsedUrl.search || ''),
            method: method,
            headers: {
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        };

        if (data && method !== 'GET') {
            const postData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(result);
                    } else {
                        reject(result);
                    }
                } catch (e) {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(responseData);
                    } else {
                        reject({ error: responseData, status: res.statusCode });
                    }
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data && method !== 'GET') {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

async function updateTanks() {
    console.log('🔧 Обновление резервуаров для демонстрации различных сценариев...');

    try {
        // 1. АЗС №001 - Центральная: Резервуар АИ-92 - КРИТИЧЕСКИЙ УРОВЕНЬ + неисправный датчик температуры
        console.log('📊 Обновляем Резервуар АИ-92 - АЗС №001 - Центральная...');
        
        const tanks1 = await makeRequest('equipment?display_name=eq.' + encodeURIComponent('Резервуар АИ-92 - АЗС №001 - Центральная') + '&select=*');
        
        if (tanks1.length > 0) {
            const tank1 = tanks1[0];
            const updatedParams1 = {
                ...tank1.params,
                'Текущий уровень (л)': 2500,
                'Книжный остаток': 2400,
                'Подтоварная вода': 8,
                'Температура': 16,
                'Датчики': [
                    {"название": "Уровень", "статус": "ok"}, 
                    {"название": "Температура", "статус": "error"}
                ]
            };

            await makeRequest(`equipment?id=eq.${tank1.id}`, 'PATCH', { params: updatedParams1 });
            console.log('✅ АИ-92 - АЗС №001 обновлен (Критический уровень: 5%)');
        }

        // 2. АЗС №001 - Центральная: Резервуар АИ-95 - НОРМАЛЬНЫЙ УРОВЕНЬ + высокая температура  
        console.log('📊 Обновляем Резервуар АИ-95 - АЗС №001 - Центральная...');
        
        const tanks2 = await makeRequest('equipment?display_name=eq.' + encodeURIComponent('Резервуар АИ-95 - АЗС №001 - Центральная') + '&select=*');
        
        if (tanks2.length > 0) {
            const tank2 = tanks2[0];
            const updatedParams2 = {
                ...tank2.params,
                'Текущий уровень (л)': 32500,
                'Книжный остаток': 32200,
                'Подтоварная вода': 2,
                'Температура': 42
            };

            await makeRequest(`equipment?id=eq.${tank2.id}`, 'PATCH', { params: updatedParams2 });
            console.log('✅ АИ-95 - АЗС №001 обновлен (Нормальный уровень: 65%, высокая температура)');
        }

        // 3. АЗС №002 - Северная: Резервуар АИ-92 - МИНИМАЛЬНЫЙ УРОВЕНЬ + высокий уровень воды
        console.log('📊 Обновляем Резервуар АИ-92 - АЗС №002 - Северная...');
        
        const tanks3 = await makeRequest('equipment?display_name=eq.' + encodeURIComponent('Резервуар АИ-92 - АЗС №002 - Северная') + '&select=*');
        
        if (tanks3.length > 0) {
            const tank3 = tanks3[0];
            const updatedParams3 = {
                ...tank3.params,
                'Текущий уровень (л)': 7200,
                'Книжный остаток': 7100,
                'Подтоварная вода': 12,
                'Температура': 15
            };

            await makeRequest(`equipment?id=eq.${tank3.id}`, 'PATCH', { params: updatedParams3 });
            console.log('✅ АИ-92 - АЗС №002 обновлен (Минимальный уровень: 18%, высокий уровень воды)');
        }

        // 4. АЗС №002 - Северная: Резервуар АИ-95 - ПОЛНЫЙ резервуар
        console.log('📊 Обновляем Резервуар АИ-95 - АЗС №002 - Северная...');
        
        const tanks4 = await makeRequest('equipment?display_name=eq.' + encodeURIComponent('Резервуар АИ-95 - АЗС №002 - Северная') + '&select=*');
        
        if (tanks4.length > 0) {
            const tank4 = tanks4[0];
            const updatedParams4 = {
                ...tank4.params,
                'Текущий уровень (л)': 38000,
                'Книжный остаток': 37800,
                'Подтоварная вода': 0
            };

            await makeRequest(`equipment?id=eq.${tank4.id}`, 'PATCH', { params: updatedParams4 });
            console.log('✅ АИ-95 - АЗС №002 обновлен (Полный резервуар: 95%)');
        }

        // 5. АЗС №002 - Северная: Резервуар Дизель - СРЕДНИЙ УРОВЕНЬ + отключенные уведомления
        console.log('📊 Обновляем Резервуар Дизель - АЗС №002 - Северная...');
        
        const tanks5 = await makeRequest('equipment?display_name=eq.' + encodeURIComponent('Резервуар Дизель - АЗС №002 - Северная') + '&select=*');
        
        if (tanks5.length > 0) {
            const tank5 = tanks5[0];
            const updatedParams5 = {
                ...tank5.params,
                'Текущий уровень (л)': 20250,
                'Книжный остаток': 20100,
                'Настройки уведомлений': {
                    "включены": false,
                    "уведомления о сливе": false,
                    "уведомления об уровне": false
                }
            };

            await makeRequest(`equipment?id=eq.${tank5.id}`, 'PATCH', { params: updatedParams5 });
            console.log('✅ Дизель - АЗС №002 обновлен (Средний уровень: 45%, уведомления отключены)');
        }

        console.log('🎉 Обновление резервуаров завершено!');

    } catch (error) {
        console.error('💥 Ошибка:', error);
    }
}

updateTanks();