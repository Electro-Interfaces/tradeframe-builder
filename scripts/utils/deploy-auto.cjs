#!/usr/bin/env node

/**
 * Автоматический деплой с SSH
 * Использование: node deploy-auto.js
 */

const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const FRONTEND_PM2 = 'tradeframe-prod-frontend';
const BACKEND_PM2 = 'tradeframe-prod-backend';

// Конфигурация
const config = {
  host: process.env.TRADEFRAME_DEPLOY_SSH_HOST || '194.135.36.195',
  username: process.env.TRADEFRAME_DEPLOY_SSH_USER || 'root',
  password: process.env.TRADEFRAME_DEPLOY_SSH_PASSWORD || '',
  port: Number(process.env.TRADEFRAME_DEPLOY_SSH_PORT || 22)
};

const PROD_DIR = '/var/www/www-root/data/www/prod.dataworker.ru';
const LOCAL_ARCHIVE = path.join(PROJECT_ROOT, 'dist.tar.gz');
const LOCAL_STS_PATH = path.join(PROJECT_ROOT, 'server', 'routes', 'sts.js');

console.log('🚀 Начинаем автоматический деплой на production...\n');

async function deploy() {
  try {
    if (!config.password) {
      console.error('❌ Не задан TRADEFRAME_DEPLOY_SSH_PASSWORD');
      process.exit(1);
    }

    // Проверка наличия архива
    if (!fs.existsSync(LOCAL_ARCHIVE)) {
      console.error('❌ Архив dist.tar.gz не найден! Запустите npm run build:prod');
      process.exit(1);
    }

    const archiveSize = (fs.statSync(LOCAL_ARCHIVE).size / 1024 / 1024).toFixed(1);
    console.log(`📦 Архив готов: ${archiveSize} MB`);

    // Подключение к серверу
    console.log('\n🔐 Подключение к серверу...');
    await ssh.connect(config);
    console.log('✅ Подключено к серверу');

    // Шаг 1: Остановка PM2 процесса
    console.log('\n🔄 Шаг 1: Остановка PM2 процесса...');
    const stopResult = await ssh.execCommand(`pm2 stop ${FRONTEND_PM2}`);
    console.log(stopResult.stdout);

    // Шаг 2: Загрузка архива
    console.log('\n📤 Шаг 2: Загрузка архива на сервер...');
    await ssh.putFile(LOCAL_ARCHIVE, '/tmp/dist.tar.gz');
    console.log('✅ Архив загружен');

    // Шаг 3: Развертывание файлов
    console.log('\n📂 Шаг 3: Развертывание файлов...');
    const deployCmd = `cd ${PROD_DIR} && rm -rf dist && mkdir dist && cd dist && tar -xzf /tmp/dist.tar.gz && rm /tmp/dist.tar.gz`;
    const deployResult = await ssh.execCommand(deployCmd);
    if (deployResult.code !== 0) {
      console.error('❌ Ошибка развертывания:', deployResult.stderr);
      process.exit(1);
    }
    console.log('✅ Файлы развернуты');

    // Шаг 4: Копирование sts.js
    console.log('\n🔄 Шаг 4: Копирование обновленного sts.js...');
    const remoteStsPath = `${PROD_DIR}/server/routes/sts.js`;
    await ssh.putFile(LOCAL_STS_PATH, remoteStsPath);
    console.log('✅ sts.js обновлен');

    // Шаг 5: Перезапуск PM2 процессов
    console.log('\n🔄 Шаг 5: Перезапуск PM2 процессов...');
    const restartResult = await ssh.execCommand(`pm2 restart ${FRONTEND_PM2} ${BACKEND_PM2}`);
    console.log(restartResult.stdout);

    // Шаг 6: Проверка статуса
    console.log('\n📊 Шаг 6: Проверка статуса PM2...');
    const statusResult = await ssh.execCommand('pm2 list');
    console.log(statusResult.stdout);

    // Проверка версии
    console.log('\n🔍 Проверка версии приложения на сервере...');
    const versionCmd = `grep -r "APP_VERSION = " ${PROD_DIR}/dist/assets/*.js | head -1`;
    const versionResult = await ssh.execCommand(versionCmd);
    if (versionResult.stdout) {
      console.log('📄 Версия:', versionResult.stdout.match(/['"]v[\d.]+['"]/)?.[0] || 'не определена');
    }

    console.log('\n✅ Деплой завершен успешно!');
    console.log('🌐 Проверьте работу: https://prod.dataworker.ru\n');

    ssh.dispose();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Ошибка деплоя:', error.message);
    ssh.dispose();
    process.exit(1);
  }
}

deploy();
