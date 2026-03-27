#!/bin/bash

# ========================================
# 🚀 Быстрый деплой TradeFrame на production
# ========================================
# Версия: 1.5.30
# Сервер: prod.dataworker.ru (194.135.36.195)
# ========================================

set -e  # Остановка при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Конфигурация
PROD_SERVER="root@194.135.36.195"
PROD_DIR="/var/www/www-root/data/www/prod.dataworker.ru"
FRONTEND_PM2="tradeframe-prod-frontend"
BACKEND_PM2="tradeframe-prod-backend"
SSH_PASSWORD="${TRADEFRAME_DEPLOY_SSH_PASSWORD:-}"

if [ -z "$SSH_PASSWORD" ]; then
    echo -e "${YELLOW}🔐 Переменная TRADEFRAME_DEPLOY_SSH_PASSWORD не задана, запрашиваю пароль...${NC}"
    read -rsp "Введите SSH пароль: " SSH_PASSWORD
    echo
fi

if [ -z "$SSH_PASSWORD" ]; then
    echo -e "${RED}❌ SSH пароль не задан. Установите TRADEFRAME_DEPLOY_SSH_PASSWORD или введите пароль при запуске.${NC}"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 Быстрый деплой TradeFrame v1.5.30${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Шаг 1: Сборка production bundle
echo -e "${YELLOW}📦 Шаг 1/7: Сборка production bundle...${NC}"
npm run build:prod

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Ошибка: папка dist не создана!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Сборка завершена${NC}\n"

# Шаг 2: Создание архива
echo -e "${YELLOW}📦 Шаг 2/7: Создание архива...${NC}"
if [ -f "dist.tar.gz" ]; then
    rm dist.tar.gz
fi

cd dist
tar -czf ../dist.tar.gz .
cd ..

ARCHIVE_SIZE=$(du -h dist.tar.gz | cut -f1)
echo -e "${GREEN}✅ Архив создан: ${ARCHIVE_SIZE}${NC}\n"

# Шаг 3: Загрузка архива на сервер
echo -e "${YELLOW}📤 Шаг 3/7: Загрузка архива на сервер...${NC}"
scp dist.tar.gz ${PROD_SERVER}:/tmp/
echo -e "${GREEN}✅ Архив загружен${NC}\n"

# Шаг 4: Остановка PM2 процесса
echo -e "${YELLOW}🔄 Шаг 4/7: Остановка PM2 процесса...${NC}"
ssh ${PROD_SERVER} "pm2 stop ${FRONTEND_PM2}"
echo -e "${GREEN}✅ Процесс остановлен${NC}\n"

# Шаг 5: Развертывание файлов
echo -e "${YELLOW}📂 Шаг 5/7: Развертывание файлов...${NC}"
ssh ${PROD_SERVER} "cd ${PROD_DIR} && rm -rf dist && mkdir dist && cd dist && tar -xzf /tmp/dist.tar.gz && rm /tmp/dist.tar.gz"
echo -e "${GREEN}✅ Файлы развернуты${NC}\n"

# Шаг 6: Копирование обновленного server/routes/sts.js (если есть)
if [ -f "server/routes/sts.js" ]; then
    echo -e "${YELLOW}🔄 Шаг 6/7: Копирование обновленного sts.js...${NC}"
    scp server/routes/sts.js ${PROD_SERVER}:${PROD_DIR}/server/routes/
    echo -e "${GREEN}✅ sts.js обновлен${NC}\n"
else
    echo -e "${YELLOW}⚠️  Шаг 6/7: server/routes/sts.js не найден, пропуск...${NC}\n"
fi

# Шаг 7: Перезапуск PM2 процессов
echo -e "${YELLOW}🔄 Шаг 7/7: Перезапуск PM2 процессов...${NC}"
ssh ${PROD_SERVER} "pm2 restart ${FRONTEND_PM2} ${BACKEND_PM2}"
echo -e "${GREEN}✅ Процессы перезапущены${NC}\n"

# Проверка статуса
echo -e "${BLUE}📊 Проверка статуса PM2...${NC}"
ssh ${PROD_SERVER} "pm2 list"

# Проверка версии на сервере
echo -e "\n${BLUE}🔍 Проверка версии приложения на сервере...${NC}"
VERSION_CHECK=$(ssh ${PROD_SERVER} "grep -r 'APP_VERSION = ' ${PROD_DIR}/dist/assets/*.js | head -1" 2>/dev/null || echo "")
if [ -n "$VERSION_CHECK" ]; then
    VERSION=$(echo "$VERSION_CHECK" | grep -oP "v[\d.]+" || echo "не определена")
    echo -e "${GREEN}📄 Версия: ${VERSION}${NC}"
else
    echo -e "${YELLOW}⚠️  Не удалось определить версию${NC}"
fi

# Итог
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Деплой завершен успешно!${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🌐 Проверьте работу: https://prod.dataworker.ru${NC}\n"

# Очистка локального архива (опционально)
read -p "Удалить локальный архив dist.tar.gz? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm dist.tar.gz
    echo -e "${GREEN}✅ Архив удален${NC}"
fi

echo -e "\n${GREEN}Готово! 🎉${NC}\n"
