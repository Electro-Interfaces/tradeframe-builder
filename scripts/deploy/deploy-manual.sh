#!/bin/bash

# Скрипт ручного деплоя на production сервер
# Использование: bash deploy-manual.sh

set -e  # Остановка при ошибке

echo "🚀 Начинаем деплой на production..."

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Конфигурация
PROD_SERVER="root@194.135.36.195"
PROD_DIR="/var/www/www-root/data/www/prod.dataworker.ru"
FRONTEND_PM2="tradeframe-prod-frontend"
BACKEND_PM2="tradeframe-prod-backend"

echo -e "${BLUE}📦 Шаг 1: Сборка production bundle...${NC}"
npm run build:prod

echo -e "${BLUE}📦 Шаг 2: Создание архива...${NC}"
rm -f dist.tar.gz
cd dist && tar -czf ../dist.tar.gz . && cd ..
echo -e "${GREEN}✅ Архив создан: $(ls -lh dist.tar.gz | awk '{print $5}')${NC}"

echo -e "${BLUE}📤 Шаг 3: Загрузка архива на сервер...${NC}"
scp dist.tar.gz ${PROD_SERVER}:/tmp/

echo -e "${BLUE}🔄 Шаг 4: Остановка PM2 процесса...${NC}"
ssh ${PROD_SERVER} "pm2 stop ${FRONTEND_PM2}"

echo -e "${BLUE}📂 Шаг 5: Развертывание файлов...${NC}"
ssh ${PROD_SERVER} "cd ${PROD_DIR} && rm -rf dist && mkdir dist && cd dist && tar -xzf /tmp/dist.tar.gz && rm /tmp/dist.tar.gz"

echo -e "${BLUE}🔄 Шаг 6: Копирование обновленного sts.js...${NC}"
scp server/routes/sts.js ${PROD_SERVER}:${PROD_DIR}/server/routes/

echo -e "${BLUE}🔄 Шаг 7: Перезапуск PM2 процессов...${NC}"
ssh ${PROD_SERVER} "pm2 restart ${FRONTEND_PM2} ${BACKEND_PM2}"

echo -e "${BLUE}📊 Шаг 8: Проверка статуса PM2...${NC}"
ssh ${PROD_SERVER} "pm2 list"

echo -e "${GREEN}✅ Деплой завершен успешно!${NC}"
echo -e "${GREEN}🌐 Проверьте работу: https://prod.dataworker.ru${NC}"

# Проверка версии tanksService
echo -e "${BLUE}🔍 Проверка версии tanksService на сервере...${NC}"
TANKS_FILE=$(ssh ${PROD_SERVER} "find ${PROD_DIR}/dist/assets -name '*tanksService*.js' -exec basename {} \;")
echo -e "${GREEN}📄 Установлен файл: ${TANKS_FILE}${NC}"
