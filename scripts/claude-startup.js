#!/usr/bin/env node
/**
 * Claude Code Auto-Startup Script
 * Автоматически запускает серверы разработки при инициализации Claude Code
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Claude Code Auto-Startup Script');
console.log('==================================');

// Проверка портов
function checkPort(port) {
  try {
    const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    return result.trim().length > 0;
  } catch (error) {
    return false;
  }
}

// Запуск сервера
function startServer(command, port, name) {
  if (checkPort(port)) {
    console.log(`✅ ${name} уже запущен на порту ${port}`);
    return null;
  }
  
  console.log(`🔄 Запуск ${name} на порту ${port}...`);
  const [cmd, ...args] = command.split(' ');
  const child = spawn(cmd, args, {
    stdio: 'inherit',
    shell: true,
    detached: true
  });
  
  child.unref();
  return child;
}

// Основная логика
async function main() {
  // Проверка существования package.json
  if (!fs.existsSync('package.json')) {
    console.log('❌ Не найден package.json. Убедитесь, что вы в корне проекта.');
    process.exit(1);
  }
  
  console.log('📋 Проверка статуса серверов...');
  
  // Запуск frontend сервера
  startServer('npm run dev', 3000, 'Frontend Server (Vite)');
  
  // Небольшая задержка перед запуском API
  setTimeout(() => {
    startServer('npm run api:dev', 3001, 'API Server');
  }, 2000);
  
  // Вывод информации
  setTimeout(() => {
    console.log('\n🎉 Серверы запущены!');
    console.log('📱 Frontend: http://localhost:3000/');
    console.log('🔧 API Health: http://localhost:3001/health');
    console.log('📖 API Docs: http://localhost:3001/api/v1');
    console.log('\n💡 Используйте Ctrl+C для остановки серверов');
  }, 3000);
}

// Запуск
main().catch(console.error);