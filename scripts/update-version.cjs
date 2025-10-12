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

// Обновляем index.html
function updateIndexHtml(version) {
  try {
    const indexPath = path.join(__dirname, '../index.html');
    let content = fs.readFileSync(indexPath, 'utf8');

    // Генерируем cache-buster с датой
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');

    // Список замен
    const replacements = [
      {
        pattern: /<title>TradeFrame - Управление торговыми сетями v[\d.]+<\/title>/,
        replacement: `<title>TradeFrame - Управление торговыми сетями v${version}</title>`
      },
      {
        pattern: /<meta name="cache-buster" content="v[\d.]+-\d+" \/>/,
        replacement: `<meta name="cache-buster" content="v${version}-${today}" />`
      },
      {
        pattern: /const APP_VERSION = 'v[\d.]+';/,
        replacement: `const APP_VERSION = 'v${version}';`
      },
      {
        pattern: /<link rel="manifest" href="\/manifest\.json\?v=[\d.]+" \/>/,
        replacement: `<link rel="manifest" href="/manifest.json?v=${version}" />`
      },
      {
        pattern: />v[\d.]+<\/p>/,
        replacement: `>v${version}</p>`
      }
    ];

    // Применяем все замены
    replacements.forEach(({ pattern, replacement }) => {
      content = content.replace(pattern, replacement);
    });

    fs.writeFileSync(indexPath, content, 'utf8');
    console.log(`✅ index.html обновлен до версии ${version}`);
  } catch (error) {
    console.error('❌ Ошибка обновления index.html:', error.message);
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
  updateIndexHtml(version);

  console.log('✅ Синхронизация версии завершена!');
}

main();