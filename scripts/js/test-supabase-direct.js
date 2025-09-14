#!/usr/bin/env node

/**
 * Direct Supabase connection test using Node.js
 * This will help us verify if the issue is browser-specific or configuration-wide
 */

import https from 'https';

const SUPABASE_URL = 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

console.log('🔧 Supabase Direct Connection Test');
console.log('📍 URL:', SUPABASE_URL);
console.log('🔑 Key:', SERVICE_KEY.substring(0, 50) + '...');
console.log('');

async function makeRequest(path, description) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    
    console.log(`🧪 Testing: ${description}`);
    console.log(`📤 URL: ${url.toString()}`);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Node.js Test Client'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const result = {
          status: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          body: data,
          url: url.toString()
        };
        
        console.log(`📥 Response: ${res.statusCode} ${res.statusMessage}`);
        console.log(`📋 Headers:`, res.headers);
        console.log(`📄 Body (first 200 chars):`, data.substring(0, 200));
        console.log('');
        
        resolve(result);
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Request failed: ${error.message}`);
      console.log('');
      reject(error);
    });

    req.setTimeout(10000, () => {
      console.error('❌ Request timeout');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testConnections() {
  try {
    // Test 1: Basic API endpoint
    await makeRequest('/rest/v1/', 'Basic REST API endpoint');
    
    // Test 2: Networks table
    await makeRequest('/rest/v1/networks?select=id,name,code&limit=3', 'Networks table access');
    
    // Test 3: Users table  
    await makeRequest('/rest/v1/users?select=id,email,username&limit=3', 'Users table access');
    
    // Test 4: Information schema
    await makeRequest('/rest/v1/information_schema.tables?select=table_name&table_schema=eq.public&limit=10', 'Information schema tables');
    
    console.log('✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the tests
testConnections();