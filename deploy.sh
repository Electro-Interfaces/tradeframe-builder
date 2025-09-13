#!/bin/bash

# TradeFrame Remote Deployment Script
# Скрипт для автоматического деплоя на удаленный сервер

set -e

echo "🚀 Начинаем деплой TradeFrame на удаленный сервер..."

# Конфигурация
REMOTE_USER="${REMOTE_USER:-user}"
REMOTE_HOST="${REMOTE_HOST:-your-server.com}"
REMOTE_PATH="${REMOTE_PATH:-/home/user/webapp}"
APP_NAME="tradeframe-builder"
GIT_REPO="${GIT_REPO:-https://github.com/your-username/tradeframe-builder.git}"

echo "📋 Конфигурация деплоя:"
echo "   Пользователь: $REMOTE_USER"
echo "   Сервер: $REMOTE_HOST"
echo "   Путь: $REMOTE_PATH"
echo "   Репозиторий: $GIT_REPO"

# Проверяем что все переменные установлены
if [ -z "$REMOTE_HOST" ] || [ "$REMOTE_HOST" = "your-server.com" ]; then
    echo "❌ Ошибка: Установите переменную REMOTE_HOST"
    echo "   export REMOTE_HOST=your-actual-server.com"
    exit 1
fi

# Функция для выполнения команд на удаленном сервере
ssh_exec() {
    ssh "$REMOTE_USER@$REMOTE_HOST" "$1"
}

# Функция для копирования файлов
scp_copy() {
    scp -r "$1" "$REMOTE_USER@$REMOTE_HOST:$2"
}

echo "🔧 Подготовка локального билда..."
npm run build:prod

echo "📡 Подключение к серверу $REMOTE_HOST..."

# Проверяем подключение
if ! ssh_exec "echo 'Подключение успешно'"; then
    echo "❌ Не удалось подключиться к серверу"
    exit 1
fi

echo "📂 Создание директории проекта..."
ssh_exec "mkdir -p $REMOTE_PATH && cd $REMOTE_PATH"

echo "🔄 Клонирование/обновление репозитория..."
if ssh_exec "[ -d '$REMOTE_PATH/.git' ]"; then
    echo "   Обновляем существующий репозиторий..."
    ssh_exec "cd $REMOTE_PATH && git fetch origin && git reset --hard origin/main"
else
    echo "   Клонируем новый репозиторий..."
    ssh_exec "cd $(dirname $REMOTE_PATH) && git clone $GIT_REPO $(basename $REMOTE_PATH)"
fi

echo "📦 Установка зависимостей на сервере..."
ssh_exec "cd $REMOTE_PATH && npm install --production"

echo "🏗️ Копирование локального билда..."
scp_copy "./dist" "$REMOTE_PATH/"

echo "📋 Копирование конфигурации..."
scp_copy "./server.js" "$REMOTE_PATH/"
scp_copy "./ecosystem.config.js" "$REMOTE_PATH/"
scp_copy "./package.json" "$REMOTE_PATH/"

echo "🔧 Настройка окружения на сервере..."
ssh_exec "cd $REMOTE_PATH && cp ecosystem.config.js ecosystem.config.js.backup"

# Обновляем конфигурацию PM2 для удаленного сервера
cat > /tmp/ecosystem.remote.config.js << 'EOL'
export default {
  apps: [{
    name: 'tradeframe-prod',
    script: 'server.js',
    cwd: '/home/user/webapp',
    env: {
      PORT: 8080,
      HOST: '0.0.0.0',
      NODE_ENV: 'production'
    },
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    instances: 1,
    exec_mode: 'cluster'
  }]
}
EOL

scp_copy "/tmp/ecosystem.remote.config.js" "$REMOTE_PATH/ecosystem.config.js"

echo "🚦 Запуск приложения через PM2..."
ssh_exec "cd $REMOTE_PATH && npx pm2 delete tradeframe-prod 2>/dev/null || true"
ssh_exec "cd $REMOTE_PATH && npx pm2 start ecosystem.config.js"
ssh_exec "cd $REMOTE_PATH && npx pm2 save"
ssh_exec "cd $REMOTE_PATH && npx pm2 startup"

echo "📊 Статус приложения:"
ssh_exec "cd $REMOTE_PATH && npx pm2 status"

echo "✅ Деплой завершен успешно!"
echo "🌐 Приложение доступно по адресу: http://$REMOTE_HOST:8080"
echo ""
echo "📋 Полезные команды для управления:"
echo "   ssh $REMOTE_USER@$REMOTE_HOST 'cd $REMOTE_PATH && npx pm2 status'"
echo "   ssh $REMOTE_USER@$REMOTE_HOST 'cd $REMOTE_PATH && npx pm2 logs tradeframe-prod'"
echo "   ssh $REMOTE_USER@$REMOTE_HOST 'cd $REMOTE_PATH && npx pm2 restart tradeframe-prod'"
echo "   ssh $REMOTE_USER@$REMOTE_HOST 'cd $REMOTE_PATH && npx pm2 stop tradeframe-prod'"

# Очистка временных файлов
rm -f /tmp/ecosystem.remote.config.js

echo "🎉 Деплой TradeFrame завершен!"