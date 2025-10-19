#!/usr/bin/env node

/**
 * Автоматический деплой с SSH
 * Использование: node deploy-auto.js
 */

const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

// Конфигурация
const config = {
  host: '194.135.36.195',
  username: 'root',
  password: 'n3cBMDPU2@N*C',
  port: 22
};

const PROD_DIR = '/var/www/www-root/data/www/prod.dataworker.ru';
const LOCAL_ARCHIVE = path.join(__dirname, 'dist.tar.gz');

console.log('🚀 Начинаем автоматический деплой на production...\n');

async function deploy() {
  try {
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
    const stopResult = await ssh.execCommand('pm2 stop tradeframe-prod');
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
    const localStsPath = path.join(__dirname, 'server', 'routes', 'sts.js');
    const remoteStsPath = `${PROD_DIR}/server/routes/sts.js`;
    await ssh.putFile(localStsPath, remoteStsPath);
    console.log('✅ sts.js обновлен');

    // Шаг 5: Перезапуск PM2 процессов
    console.log('\n🔄 Шаг 5: Перезапуск PM2 процессов...');
    const restartResult = await ssh.execCommand('pm2 restart tradeframe-prod tradeframe-backend-proxy');
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
