/**
 * Скрипт для удаления console.log с эмодзи из кодовой базы
 */

const fs = require('fs');
const path = require('path');

// Паттерн для поиска console.log с эмодзи
const emojiLogPattern = /^\s*console\.log\([^)]*[🔍🛡️🗂️🚀🔄✅🎯👤🔑🧹📋⏰💾🌐📡🔌⚙️📊🔧🎨📝✨🎉⚡🔒🆕📢][^)]*\);?\s*$/gm;

// Директории для обработки
const srcDir = path.join(__dirname, '..', 'src');

let filesProcessed = 0;
let linesRemoved = 0;

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const originalLineCount = lines.length;

    // Удаляем строки с console.log содержащими эмодзи
    const filteredLines = lines.filter(line => {
      const hasEmojiLog = /console\.log\([^)]*[🔍🛡️🗂️🚀🔄✅🎯👤🔑🧹📋⏰💾🌐📡🔌⚙️📊🔧🎨📝✨🎉⚡🔒🆕📢][^)]*\)/.test(line);
      if (hasEmojiLog) {
        linesRemoved++;
        console.log(`  Удалено: ${line.trim()}`);
      }
      return !hasEmojiLog;
    });

    if (filteredLines.length !== originalLineCount) {
      fs.writeFileSync(filePath, filteredLines.join('\n'), 'utf8');
      filesProcessed++;
      console.log(`✅ Обработан: ${path.relative(srcDir, filePath)}`);
    }
  } catch (error) {
    console.error(`❌ Ошибка обработки ${filePath}:`, error.message);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      processFile(filePath);
    }
  }
}

console.log('🚀 Начинаем удаление console.log с эмодзи...\n');
walkDir(srcDir);
console.log(`\n✅ Готово!`);
console.log(`📊 Обработано файлов: ${filesProcessed}`);
console.log(`📊 Удалено строк: ${linesRemoved}`);
