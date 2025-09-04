#!/bin/bash
# =====================================================
# SETUP MIGRATION - Настройка всех агентов миграции
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
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# =====================================================
# ПРОВЕРКА ОКРУЖЕНИЯ
# =====================================================

log "🚀 Starting Tradeframe Migration Setup..."

# Проверка Node.js
if ! command -v node &> /dev/null; then
    error "Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//')
info "Node.js version: $NODE_VERSION"

# Проверка npm
if ! command -v npm &> /dev/null; then
    error "npm not found. Please install npm first."
    exit 1
fi

# Проверка TypeScript
if ! command -v tsc &> /dev/null; then
    warn "TypeScript not found globally. Installing..."
    npm install -g typescript
fi

# =====================================================
# УСТАНОВКА ЗАВИСИМОСТЕЙ
# =====================================================

log "📦 Installing dependencies..."

# Основные зависимости API сервера
npm install --save \
    express \
    cors \
    helmet \
    express-rate-limit \
    jsonwebtoken \
    bcryptjs \
    @supabase/supabase-js \
    swagger-jsdoc \
    swagger-ui-express \
    dotenv

# TypeScript типы для разработки
npm install --save-dev \
    @types/express \
    @types/cors \
    @types/jsonwebtoken \
    @types/bcryptjs \
    @types/swagger-jsdoc \
    @types/swagger-ui-express \
    @types/node \
    nodemon \
    ts-node \
    concurrently

log "✅ Dependencies installed successfully"

# =====================================================
# СОЗДАНИЕ .ENV ФАЙЛА
# =====================================================

log "⚙️  Creating environment configuration..."

if [ ! -f .env ]; then
    cat > .env << 'EOF'
# =====================================================
# TRADEFRAME MIGRATION ENVIRONMENT
# =====================================================

# Node Environment
NODE_ENV=development
PORT=3001

# API Configuration
API_VERSION=1.0.0
API_BASE_URL=http://localhost:3001/api/v1
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# JWT Configuration
JWT_SECRET=tradeframe-dev-secret-change-in-production-please
JWT_REFRESH_SECRET=tradeframe-refresh-secret-change-me-too
JWT_EXPIRES_IN=1h

# Supabase Configuration (Replace with your values)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tradeframe
DB_USER=postgres
DB_PASSWORD=password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/api.log

# File Upload
UPLOAD_MAX_SIZE=10485760
UPLOAD_PATH=uploads/

# Cache Configuration
REDIS_URL=redis://localhost:6379

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

EOF

    info "✅ .env file created. Please update with your actual configuration!"
    warn "🔐 IMPORTANT: Update JWT secrets and Supabase credentials before running in production"
else
    info "✅ .env file already exists"
fi

# =====================================================
# ОБНОВЛЕНИЕ PACKAGE.JSON
# =====================================================

log "📄 Updating package.json scripts..."

# Создаем backup package.json
cp package.json package.json.backup

# Добавляем скрипты миграции
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg.scripts = {
  ...pkg.scripts,
  // API Server
  'api:dev': 'nodemon --exec ts-node src/api/server.ts',
  'api:build': 'tsc --project tsconfig.json',
  'api:start': 'node dist/api/server.js',
  'api:docs': 'open http://localhost:3001/api/docs',
  
  // Database Migration
  'migrate:export': 'ts-node migrations/001_export_mock_data.ts',
  'migrate:import': 'ts-node migrations/002_import_to_supabase.ts',
  'migrate:full': 'npm run migrate:export && npm run migrate:import',
  
  // Testing
  'test:api': 'jest tests/api/',
  'test:integration': 'jest tests/integration/',
  'test:migration': 'npm run migrate:export && echo Migration export test passed',
  
  // Development
  'dev:api': 'concurrently \"npm run dev\" \"npm run api:dev\"',
  'dev:docs': 'concurrently \"npm run api:dev\" \"npm run api:docs\"',
  
  // Database
  'db:setup': 'echo \"Please run schema.sql and schema-additional.sql in your Supabase SQL Editor\"',
  'db:test': 'ts-node -e \"import { testDatabaseConnection } from \\\"./src/api/database/supabase\\\"; testDatabaseConnection().then(console.log);\"',
  
  // Agents (for parallel development)
  'agent1:setup': 'bash scripts/agent1-infrastructure.sh',
  'agent2:migrate': 'bash scripts/agent2-business-logic.sh',  
  'agent3:api': 'bash scripts/agent3-api-endpoints.sh',
  
  // All agents in parallel
  'agents:run': 'concurrently \"npm run agent1:setup\" \"npm run agent2:migrate\" \"npm run agent3:api\"'
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('✅ Package.json updated with migration scripts');
"

# =====================================================
# СОЗДАНИЕ TSCONFIG.JSON
# =====================================================

log "📝 Creating TypeScript configuration..."

if [ ! -f tsconfig.json ]; then
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "commonjs",
    "moduleResolution": "node",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./",
    "strict": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "src/**/*",
    "migrations/**/*",
    "tests/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "data"
  ]
}
EOF
    info "✅ TypeScript configuration created"
else
    info "✅ TypeScript configuration already exists"
fi

# =====================================================
# СОЗДАНИЕ ДИРЕКТОРИЙ
# =====================================================

log "📁 Creating project directories..."

mkdir -p logs
mkdir -p uploads
mkdir -p data
mkdir -p tests/api
mkdir -p tests/integration
mkdir -p tests/business-logic

info "✅ Project directories created"

# =====================================================
# СОЗДАНИЕ GITIGNORE
# =====================================================

log "🔒 Updating .gitignore..."

cat >> .gitignore << 'EOF'

# =====================================================
# MIGRATION FILES
# =====================================================

# Environment variables
.env
.env.local
.env.production

# Database exports
data/*.json
!data/.gitkeep

# Logs
logs/
*.log

# Uploads
uploads/
!uploads/.gitkeep

# API Build
dist/
build/

# Backup files
*.backup
*.old

# Cache
.cache/
redis-dump.rdb

EOF

# Создаем .gitkeep файлы
touch data/.gitkeep
touch logs/.gitkeep  
touch uploads/.gitkeep

info "✅ .gitignore updated"

# =====================================================
# ПРОВЕРКА ГОТОВНОСТИ
# =====================================================

log "🔍 Running readiness checks..."

# Проверка структуры файлов
check_file() {
    if [ -f "$1" ]; then
        info "✅ $1 exists"
    else
        warn "⚠️  $1 missing"
    fi
}

check_file "src/api/server.ts"
check_file "src/api/auth/jwt.ts"
check_file "src/api/database/supabase.ts"
check_file "src/api/routes/networks.ts"
check_file "src/services/tanksBusinessLogic.ts"
check_file "src/services/rolesBusinessLogic.ts"
check_file "migrations/001_export_mock_data.ts"
check_file "migrations/002_import_to_supabase.ts"
check_file "database/schema.sql"
check_file "database/schema-additional.sql"

# =====================================================
# ФИНАЛЬНЫЕ ИНСТРУКЦИИ
# =====================================================

log "🎉 Migration setup completed!"

info "
📋 NEXT STEPS:

1. 🔧 Configure Supabase:
   - Create a new project at https://supabase.com
   - Update .env with your Supabase URL and keys
   - Run schema.sql and schema-additional.sql in SQL Editor

2. 🗄️  Set up database:
   npm run db:setup
   npm run db:test

3. 📤 Export mock data:
   npm run migrate:export

4. 📥 Import to Supabase:
   npm run migrate:import

5. 🚀 Start API server:
   npm run api:dev

6. 📖 View API documentation:
   npm run api:docs

7. 🧪 Run tests:
   npm run test:migration

8. 👥 Run all agents in parallel:
   npm run agents:run

📍 IMPORTANT URLS:
   - API Server: http://localhost:3001
   - API Docs: http://localhost:3001/api/docs
   - Health Check: http://localhost:3001/health

🔐 SECURITY REMINDERS:
   - Update JWT secrets in .env
   - Configure Supabase RLS policies
   - Set up proper CORS origins for production
   - Never commit .env files to git

Happy migrating! 🚀
"

log "Setup completed successfully! Check the instructions above."