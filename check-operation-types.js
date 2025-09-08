/**
 * Check existing operation_type values in the database
 */

import https from 'https';
import url from 'url';

const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXVreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

async function getData(table, filters = '') {
    return new Promise((resolve, reject) => {
        const requestUrl = `${SUPABASE_URL}/rest/v1/${table}?select=*${filters}`;
        
        const parsedUrl = url.parse(requestUrl);
        
        const options = {
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

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        const result = JSON.parse(data);
                        resolve(result);
                    } else {
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

async function checkOperationTypes() {
    try {
        console.log('🔍 Checking existing operation types...\n');
        
        const operations = await getData('operations', '&limit=1000');
        console.log(`📊 Found ${operations.length} operations`);
        
        const operationTypes = {};
        const statuses = {};
        const paymentMethods = {};
        
        operations.forEach(op => {
            // Operation types
            const opType = op.operation_type;
            operationTypes[opType] = (operationTypes[opType] || 0) + 1;
            
            // Statuses
            const status = op.status;
            statuses[status] = (statuses[status] || 0) + 1;
            
            // Payment methods
            const payment = op.payment_method;
            paymentMethods[payment] = (paymentMethods[payment] || 0) + 1;
        });
        
        console.log('\n📋 EXISTING OPERATION TYPES:');
        console.log('='.repeat(40));
        Object.entries(operationTypes).forEach(([type, count]) => {
            console.log(`${type}: ${count} операций`);
        });
        
        console.log('\n📊 EXISTING STATUSES:');
        console.log('='.repeat(40));
        Object.entries(statuses).forEach(([status, count]) => {
            console.log(`${status}: ${count} операций`);
        });
        
        console.log('\n💳 EXISTING PAYMENT METHODS:');
        console.log('='.repeat(40));
        Object.entries(paymentMethods).forEach(([method, count]) => {
            console.log(`${method}: ${count} операций`);
        });
        
        console.log('\n✅ Check completed!');
        console.log('💡 Use "sale" as operation_type for online orders with metadata to distinguish them');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkOperationTypes();