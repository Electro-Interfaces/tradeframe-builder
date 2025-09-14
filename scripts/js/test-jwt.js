const { jwtService } = require('./dist/api/auth/jwt');

async function testJWT() {
    try {
        console.log('Testing JWT service...');
        
        // Тестируем создание токена
        const user = {
            id: 'test-user-id',
            email: 'test@example.com',
            roles: ['user']
        };
        
        const tokens = jwtService.generateTokens(user);
        console.log('✅ JWT tokens generated successfully');
        
        // Тестируем верификацию
        const verified = jwtService.verifyAccessToken(tokens.accessToken);
        console.log('✅ JWT verification successful');
        console.log('User data:', verified);
        
        // Тестируем хеширование пароля
        const password = 'test123';
        const hashedPassword = await jwtService.hashPassword(password);
        console.log('✅ Password hashing successful');
        
        // Тестируем проверку пароля
        const isValid = await jwtService.verifyPassword(password, hashedPassword);
        console.log('✅ Password verification:', isValid ? 'PASSED' : 'FAILED');
        
    } catch (error) {
        console.error('❌ JWT test failed:', error.message);
        process.exit(1);
    }
}

testJWT();
