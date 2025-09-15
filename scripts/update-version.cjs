#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Читаем версию из конфигурации TypeScript
function getVersionFromConfig() {
  try {
    const versionPath = path.join(__dirname, '../src/config/version.ts');
    const content = fs.readFileSync(versionPath, 'utf8');
    const match = content.match(/APP_VERSION = '([^']+)'/);
    if (match) {
      return match[1];
    }
  } catch (error) {
    console.error('❌ Ошибка чтения версии из конфигурации:', error.message);
  }
  return null;
}

// Обновляем package.json
function updatePackageJson(version) {
  try {
    const packagePath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    packageJson.version = version;
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ package.json обновлен до версии ${version}`);
  } catch (error) {
    console.error('❌ Ошибка обновления package.json:', error.message);
  }
}

// Обновляем manifest.json
function updateManifestJson(version) {
  try {
    const manifestPath = path.join(__dirname, '../public/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.version = version;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`✅ manifest.json обновлен до версии ${version}`);
  } catch (error) {
    console.error('❌ Ошибка обновления manifest.json:', error.message);
  }
}

// Основная функция
function main() {
  console.log('🔄 Синхронизация версии из конфигурации...');

  const version = getVersionFromConfig();
  if (!version) {
    console.error('❌ Не удалось получить версию из конфигурации');
    process.exit(1);
  }

  console.log(`📦 Найдена версия: ${version}`);

  updatePackageJson(version);
  updateManifestJson(version);

  console.log('✅ Синхронизация версии завершена!');
}

main();