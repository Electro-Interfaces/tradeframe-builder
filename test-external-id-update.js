/**
 * Тест прямого обновления external_id через SQL инструмент
 */

import { executeSelect } from './tools/sql-direct.js';
import https from 'https';
import url from 'url';

// Конфигурация Supabase
const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

/**
 * Прямое обновление записи через REST API
 */
async function updateNetwork(id, data) {
    return new Promise((resolve, reject) => {
        const requestUrl = `${SUPABASE_URL}/rest/v1/networks?id=eq.${id}`;
        const postData = JSON.stringify(data);

        const parsedUrl = url.parse(requestUrl);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.path,
            method: 'PATCH',
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
                    console.log('📡 HTTP Status:', res.statusCode);
                    console.log('📝 Response:', data);
                    
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        const result = data ? JSON.parse(data) : null;
                        console.log('✅ Обновление выполнено успешно');
                        resolve(result);
                    } else {
                        console.log('❌ Ошибка обновления:', res.statusCode, data);
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

async function main() {
    try {
        console.log('🔄 Тест обновления external_id...');
        
        // Получаем текущие данные
        const networks = await executeSelect('networks', { limit: 1 });
        if (networks.length === 0) {
            console.log('❌ Нет сетей для тестирования');
            return;
        }
        
        const network = networks[0];
        console.log(`📋 Текущая сеть: ${network.name} (external_id: "${network.external_id}")`);
        
        // Обновляем external_id
        const newExternalId = 'TEST_' + Date.now();
        console.log(`🔄 Обновляем external_id на: ${newExternalId}`);
        
        const updateData = {
            external_id: newExternalId,
            updated_at: new Date().toISOString()
        };
        
        const result = await updateNetwork(network.id, updateData);
        console.log('✅ Результат обновления:', result);
        
        // Проверяем результат
        const updatedNetworks = await executeSelect('networks', { 
            eq: { id: network.id }
        });
        
        if (updatedNetworks.length > 0) {
            const updatedNetwork = updatedNetworks[0];
            console.log(`✅ Проверка: external_id = "${updatedNetwork.external_id}"`);
            
            if (updatedNetwork.external_id === newExternalId) {
                console.log('🎉 Тест ПРОШЕЛ! external_id обновился успешно');
            } else {
                console.log('❌ Тест ПРОВАЛЕН! external_id не обновился');
            }
        }
        
    } catch (error) {
        console.error('💥 Ошибка теста:', error.message);
    }
}

main();