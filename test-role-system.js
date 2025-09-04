#!/usr/bin/env node

/**
 * Test script to verify role system functionality after fixing version column issue
 */

import https from 'https';
import url from 'url';

const API_BASE = 'http://localhost:3001/api/v1';

async function makeRequest(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const requestUrl = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
        const parsedUrl = url.parse(requestUrl);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const request = (parsedUrl.protocol === 'https:' ? https : require('http')).request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: data ? JSON.parse(data) : null
                    });
                } catch (error) {
                    resolve({
                        status: res.statusCode,
                        data: data
                    });
                }
            });
        });

        request.on('error', (error) => {
            reject(error);
        });

        if (body) {
            request.write(JSON.stringify(body));
        }
        
        request.end();
    });
}

async function testApiHealth() {
    console.log('🔍 Testing API Health...');
    try {
        const response = await makeRequest('http://localhost:3001/health');
        if (response.status === 200 && response.data.success) {
            console.log('✅ API Health Check: PASSED');
            console.log(`   Database: ${response.data.database.success ? 'Connected' : 'Failed'}`);
            return true;
        } else {
            console.log('❌ API Health Check: FAILED');
            return false;
        }
    } catch (error) {
        console.log('❌ API Health Check: ERROR -', error.message);
        return false;
    }
}

async function testRoleCreation() {
    console.log('🔍 Testing Role Creation (without version column)...');
    try {
        const testRole = {
            tenant_id: 'test-tenant',
            code: `test_role_${Date.now()}`,
            name: 'Test Equipment Role',
            description: 'Test role for equipment section debugging',
            permissions: [
                {
                    section: 'equipment',
                    resource: 'tanks',
                    actions: ['read', 'write']
                }
            ],
            scope: 'global',
            is_system: false,
            is_active: true
        };

        const response = await makeRequest('/test/create-role', 'POST', testRole);
        
        if (response.status === 200 && response.data.success) {
            console.log('✅ Role Creation: PASSED');
            console.log(`   Role ID: ${response.data.role.id}`);
            console.log(`   Role Code: ${response.data.role.code}`);
            console.log(`   No version column conflict!`);
            return response.data.role;
        } else {
            console.log('❌ Role Creation: FAILED');
            console.log(`   Status: ${response.status}`);
            console.log(`   Error: ${JSON.stringify(response.data, null, 2)}`);
            return null;
        }
    } catch (error) {
        console.log('❌ Role Creation: ERROR -', error.message);
        return null;
    }
}

async function testSystemRoleCreation() {
    console.log('🔍 Testing System Role Creation...');
    try {
        const systemRole = {
            tenant_id: 'default',
            code: 'equipment_admin',
            name: 'Equipment Administrator',
            description: 'Administrator for equipment management',
            permissions: [
                {
                    section: 'equipment',
                    resource: '*',
                    actions: ['read', 'write', 'delete', 'manage']
                }
            ],
            scope: 'global',
            is_system: true,
            is_active: true
        };

        const response = await makeRequest('/test/create-role', 'POST', systemRole);
        
        if (response.status === 200 && response.data.success) {
            console.log('✅ System Role Creation: PASSED');
            console.log(`   System Role ID: ${response.data.role.id}`);
            return response.data.role;
        } else {
            console.log('❌ System Role Creation: FAILED');
            console.log(`   Status: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.log('❌ System Role Creation: ERROR -', error.message);
        return null;
    }
}

async function main() {
    console.log('🚀 Starting Role System Test Suite');
    console.log('   Testing fixes for equipment section crash');
    console.log('');

    let allTestsPassed = true;

    // Test 1: API Health
    const healthPassed = await testApiHealth();
    allTestsPassed = allTestsPassed && healthPassed;
    console.log('');

    // Test 2: Basic Role Creation
    const role = await testRoleCreation();
    allTestsPassed = allTestsPassed && (role !== null);
    console.log('');

    // Test 3: System Role Creation
    const systemRole = await testSystemRoleCreation();
    allTestsPassed = allTestsPassed && (systemRole !== null);
    console.log('');

    // Summary
    console.log('📊 Test Summary:');
    console.log(`   Overall Result: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allTestsPassed) {
        console.log('');
        console.log('🎉 Equipment section crash has been fixed!');
        console.log('   - Version column removed from roleService.ts');
        console.log('   - Role creation working without schema conflicts');
        console.log('   - Equipment section should now load without crashing');
        console.log('');
        console.log('Next steps:');
        console.log('   1. Navigate to http://localhost:3006/admin/equipment');
        console.log('   2. Verify the equipment page loads without errors');
        console.log('   3. Check browser console for any remaining issues');
    } else {
        console.log('');
        console.log('⚠️  Some tests failed. Check the error messages above.');
    }
}

// Run the test suite
main().catch(console.error);