#!/usr/bin/env node

import https from 'https';

const SUPABASE_URL = 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

async function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function checkSchema() {
  console.log('🔍 Checking existing Supabase schema...');
  
  try {
    // Get the OpenAPI spec to see what tables exist
    const { status, data } = await makeRequest('/rest/v1/');
    
    if (status === 200 && data.definitions) {
      console.log('📋 Found tables in schema:');
      const tableNames = Object.keys(data.definitions).filter(name => 
        !name.includes('_') || name.startsWith('public_')
      );
      
      tableNames.forEach(table => {
        console.log(`   • ${table}`);
        if (data.definitions[table].properties) {
          const columns = Object.keys(data.definitions[table].properties);
          console.log(`     Columns: ${columns.join(', ')}`);
        }
      });
      
      console.log(`\n📊 Total tables: ${tableNames.length}`);
      
      // Check if 'users' table exists and what columns it has
      if (data.definitions.users) {
        console.log('\n👤 Users table structure:');
        const userColumns = Object.keys(data.definitions.users.properties);
        userColumns.forEach(col => {
          const colDef = data.definitions.users.properties[col];
          console.log(`   • ${col}: ${colDef.type || 'unknown type'}`);
        });
      }
      
    } else {
      console.log('❌ Could not retrieve schema information');
      console.log('Status:', status);
      console.log('Response:', data);
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
  }
}

checkSchema();