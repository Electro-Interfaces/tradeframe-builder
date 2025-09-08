/**
 * Apply prices schema migration to Supabase
 * Executes migration 008_prices_schema.sql
 */

import fs from 'fs';
import https from 'https';
import url from 'url';

// Supabase configuration
const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

/**
 * Execute SQL through Supabase Edge Functions
 */
async function executeSQL(sqlQuery) {
    return new Promise((resolve, reject) => {
        const requestUrl = `${SUPABASE_URL}/functions/v1/execute-sql`;
        
        const postData = JSON.stringify({
            query: sqlQuery
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
                'Content-Length': Buffer.byteLength(postData)
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
                        console.log('✅ SQL executed successfully');
                        console.log('📊 Result:', result);
                        resolve(result);
                    } else {
                        console.log('❌ SQL error:', res.statusCode, data);
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                } catch (error) {
                    console.log('❌ Parse error:', error.message);
                    console.log('Raw response:', data);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.log('❌ Request error:', error.message);
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

/**
 * Try alternative SQL execution via direct PostgreSQL REST API
 */
async function executeSQLDirect(sqlQuery) {
    return new Promise((resolve, reject) => {
        // Split SQL into individual statements
        const statements = sqlQuery
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'))
            .filter(s => !s.match(/^\s*$/));

        console.log(`📝 Found ${statements.length} SQL statements to execute`);

        // Execute statements sequentially
        let currentStatement = 0;
        
        async function executeNext() {
            if (currentStatement >= statements.length) {
                console.log('✅ All statements executed successfully');
                resolve(true);
                return;
            }

            const statement = statements[currentStatement];
            console.log(`\n🔄 Executing statement ${currentStatement + 1}/${statements.length}:`);
            console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));

            try {
                await executeSingleStatement(statement);
                currentStatement++;
                setTimeout(executeNext, 100); // Small delay between statements
            } catch (error) {
                console.log(`❌ Error in statement ${currentStatement + 1}:`, error.message);
                // Continue with next statement for non-critical errors
                if (error.message.includes('already exists') || 
                    error.message.includes('IF NOT EXISTS') ||
                    error.message.includes('IF EXISTS')) {
                    console.log('⚠️ Non-critical error, continuing...');
                    currentStatement++;
                    setTimeout(executeNext, 100);
                } else {
                    reject(error);
                }
            }
        }

        executeNext();
    });
}

/**
 * Execute a single SQL statement
 */
async function executeSingleStatement(statement) {
    return new Promise((resolve, reject) => {
        const requestUrl = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;
        
        const postData = JSON.stringify({
            sql_query: statement
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
                'Content-Length': Buffer.byteLength(postData)
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
                        resolve(true);
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

        req.write(postData);
        req.end();
    });
}

async function main() {
    try {
        console.log('🚀 Starting prices schema migration...');
        
        // Read the migration file
        const migrationPath = 'migrations/008_prices_schema.sql';
        
        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found: ${migrationPath}`);
        }
        
        const sqlContent = fs.readFileSync(migrationPath, 'utf8');
        console.log(`📖 Read migration file: ${migrationPath}`);
        console.log(`📄 File size: ${sqlContent.length} characters`);
        
        // Try to execute the SQL
        console.log('\n🔄 Attempting to execute migration...');
        
        try {
            await executeSQL(sqlContent);
        } catch (error) {
            console.log('⚠️ Primary method failed, trying alternative approach...');
            await executeSQLDirect(sqlContent);
        }
        
        console.log('\n🎉 Migration completed successfully!');
        console.log('✅ Tables created: price_packages, prices');
        console.log('✅ Updated nomenclature table with fuel_type_id');
        console.log('✅ Created indexes, triggers, and functions');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}