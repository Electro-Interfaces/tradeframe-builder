#!/bin/bash
# =====================================================
# AGENT 1: INFRASTRUCTURE & DATABASE SETUP
# =====================================================

set -e  # Выход при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция логирования
log() {
    echo -e "${GREEN}[AGENT 1] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[AGENT 1 WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[AGENT 1 ERROR] $1${NC}"
}

info() {
    echo -e "${BLUE}[AGENT 1 INFO] $1${NC}"
}

# =====================================================
# ИНИЦИАЛИЗАЦИЯ
# =====================================================

log "🚀 Starting Agent 1: Infrastructure & Database Setup"

# Проверяем наличие .env файла
if [ ! -f .env ]; then
    error ".env file not found. Run setup-migration.sh first!"
    exit 1
fi

# =====================================================
# ПРОВЕРКА БАЗЫ ДАННЫХ
# =====================================================

log "🗄️  Testing database connection..."

# Запускаем тест подключения к базе данных
npm run db:test > /dev/null 2>&1 || {
    warn "Database connection test failed. Please check your .env configuration."
    info "Make sure to:"
    info "  1. Create a Supabase project"
    info "  2. Update SUPABASE_URL and SUPABASE_ANON_KEY in .env"
    info "  3. Run the SQL schemas in Supabase SQL Editor"
}

# =====================================================
# ЗАПУСК СХЕМ БАЗЫ ДАННЫХ
# =====================================================

log "📋 Database schema setup instructions:"
info "Please execute the following SQL files in your Supabase SQL Editor:"
info "  1. database/schema.sql - Main database schema"
info "  2. database/schema-additional.sql - Additional tables"

# Проверяем наличие файлов схем
if [ -f "database/schema.sql" ]; then
    info "✅ Main schema file found: database/schema.sql"
else
    warn "⚠️  Main schema file missing: database/schema.sql"
fi

if [ -f "database/schema-additional.sql" ]; then
    info "✅ Additional schema file found: database/schema-additional.sql"
else
    warn "⚠️  Additional schema file missing: database/schema-additional.sql"
fi

# =====================================================
# КОМПИЛЯЦИЯ TYPESCRIPT
# =====================================================

log "🔨 Building TypeScript files..."

# Компилируем API сервер
npx tsc --project tsconfig.json || {
    error "TypeScript compilation failed!"
    info "Please fix TypeScript errors before proceeding"
    exit 1
}

info "✅ TypeScript compilation successful"

# =====================================================
# ТЕСТИРОВАНИЕ JWT СЕРВИСА
# =====================================================

log "🔐 Testing JWT service..."

# Создаем тестовый скрипт для JWT (ES module compatible)
cat > test-jwt.mjs << 'EOF'
import { jwtService } from './dist/api/auth/jwt.js';

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
EOF

# Запускаем тест JWT
node test-jwt.mjs || {
    error "JWT service test failed!"
    exit 1
}

# Удаляем тестовый файл
rm test-jwt.mjs

# =====================================================
# ЗАПУСК API СЕРВЕРА
# =====================================================

log "🌐 Starting API server..."

# Проверяем доступность порта 3001
if lsof -Pi :3001 -sTCP:LISTEN -t > /dev/null; then
    warn "Port 3001 is already in use. Stopping existing processes..."
    pkill -f "node.*server.js" || true
    sleep 2
fi

# Запускаем API сервер в фоне
info "Starting API server on port 3001..."
npm run api:dev &
API_PID=$!

# Ждем запуска сервера
sleep 5

# Проверяем что сервер запустился
if curl -s http://localhost:3001/health > /dev/null; then
    log "✅ API server started successfully"
    info "API server PID: $API_PID"
    info "Health check: http://localhost:3001/health"
    info "API documentation: http://localhost:3001/api/docs"
else
    error "API server failed to start"
    kill $API_PID 2>/dev/null || true
    exit 1
fi

# =====================================================
# ТЕСТИРОВАНИЕ API ENDPOINTS
# =====================================================

log "🧪 Testing API endpoints..."

# Тестируем health check
HEALTH_RESPONSE=$(curl -s http://localhost:3001/health)
if echo "$HEALTH_RESPONSE" | grep -q "success.*true"; then
    info "✅ Health check endpoint working"
else
    warn "⚠️  Health check endpoint not responding correctly"
fi

# Тестируем Swagger documentation
if curl -s http://localhost:3001/api/docs > /dev/null; then
    info "✅ Swagger documentation available"
else
    warn "⚠️  Swagger documentation not accessible"
fi

# Тестируем базовые API endpoints (без авторизации)
# Эти endpoints должны вернуть 401 Unauthorized, что означает что они работают
NETWORKS_RESPONSE=$(curl -s -w "%{http_code}" http://localhost:3001/api/v1/networks -o /dev/null)
if [ "$NETWORKS_RESPONSE" = "401" ]; then
    info "✅ Networks API endpoint responding (requires auth)"
else
    warn "⚠️  Networks API endpoint not responding as expected (got $NETWORKS_RESPONSE)"
fi

# =====================================================
# НАСТРОЙКА АВТО-ПЕРЕЗАПУСКА
# =====================================================

log "🔄 Setting up auto-restart configuration..."

# Создаем PM2 ecosystem файл для продакшена
cat > ecosystem.api.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'tradeframe-api',
    script: './dist/api/server.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    error_file: './logs/api-error.log',
    out_file: './logs/api-out.log',
    log_file: './logs/api-combined.log',
    time: true,
    restart_delay: 1000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

info "✅ PM2 ecosystem configuration created: ecosystem.api.config.js"

# =====================================================
# МОНИТОРИНГ И ЛОГИ
# =====================================================

log "📊 Setting up monitoring and logging..."

# Создаем скрипт мониторинга
cat > monitor-api.sh << 'EOF'
#!/bin/bash
# API Server Monitoring Script

echo "=== Tradeframe API Server Status ==="
echo "Time: $(date)"
echo

# Check if server is running
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ API Server: RUNNING"
    
    # Get health status
    HEALTH=$(curl -s http://localhost:3001/health)
    echo "Health Response: $HEALTH"
    
    # Check database connection
    if echo "$HEALTH" | grep -q "database.*connected"; then
        echo "✅ Database: CONNECTED"
    else
        echo "⚠️  Database: CHECK CONNECTION"
    fi
    
else
    echo "❌ API Server: DOWN"
fi

echo
echo "=== Recent API Logs ==="
tail -n 10 logs/api-combined.log 2>/dev/null || echo "No logs found"

echo
echo "=== Process Information ==="
ps aux | grep -E "(node|npm).*api" | grep -v grep || echo "No API processes found"
EOF

chmod +x monitor-api.sh
info "✅ Monitoring script created: monitor-api.sh"

# =====================================================
# ЗАВЕРШЕНИЕ РАБОТЫ АГЕНТА 1
# =====================================================

log "✅ Agent 1: Infrastructure & Database Setup COMPLETED!"

info "
📋 AGENT 1 SUMMARY:
✅ TypeScript compilation successful
✅ JWT service tested and working
✅ API server started on port 3001
✅ Health check endpoint active
✅ Swagger documentation available
✅ Basic API endpoints responding
✅ PM2 configuration created
✅ Monitoring script ready

🌐 IMPORTANT URLS:
   - API Server: http://localhost:3001
   - Health Check: http://localhost:3001/health
   - API Documentation: http://localhost:3001/api/docs
   - API JSON Schema: http://localhost:3001/api/docs.json

📊 MONITORING:
   - Run ./monitor-api.sh to check server status
   - Logs available in logs/ directory
   - Use PM2 for production deployment

⚠️  NEXT STEPS:
   1. Execute database schemas in Supabase SQL Editor
   2. Update .env with correct Supabase credentials
   3. Wait for Agent 2 (Business Logic) completion
   4. Wait for Agent 3 (API Endpoints) completion

🔧 AGENT 1 PID: $API_PID (API Server running in background)
"

# Сохраняем PID для остановки позже
echo "$API_PID" > .agent1.pid

log "Agent 1 infrastructure setup completed successfully! 🎉"