// Простой скрипт для генерации PNG из SVG
const fs = require('fs');

// Базовый SVG TradeControl (упрощенная версия)
function createSVG(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#1e293b" rx="${size * 0.125}"/>
  <rect x="${size * 0.125}" y="${size * 0.125}" width="${size * 0.75}" height="${size * 0.75}" fill="#3b82f6" rx="${size * 0.083}"/>
  <text x="${size / 2}" y="${size / 2 + size * 0.08}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${size * 0.25}" font-weight="bold">TC</text>
  <rect x="${size * 0.25}" y="${size * 0.66}" width="${size * 0.5}" height="${size * 0.015}" fill="white" rx="${size * 0.0075}"/>
</svg>`;
}

// Список размеров для создания
const sizes = [72, 96, 128, 144, 152, 167, 180, 192, 384, 512];

console.log('🎨 Создание PNG иконок для PWA...');

sizes.forEach(size => {
    const svg = createSVG(size);
    const filename = `public/icon-${size}x${size}.svg`;
    
    try {
        fs.writeFileSync(filename, svg);
        console.log(`✅ Создан SVG: icon-${size}x${size}.svg`);
    } catch (error) {
        console.log(`❌ Ошибка создания ${filename}:`, error.message);
    }
});

// Создаем также maskable версии (с дополнительным padding)
function createMaskableSVG(size) {
    const padding = size * 0.1; // 10% padding для safe area
    const innerSize = size - (padding * 2);
    
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#1e293b"/>
  <rect x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}" fill="#1e293b" rx="${innerSize * 0.125}"/>
  <rect x="${padding + innerSize * 0.125}" y="${padding + innerSize * 0.125}" width="${innerSize * 0.75}" height="${innerSize * 0.75}" fill="#3b82f6" rx="${innerSize * 0.083}"/>
  <text x="${size / 2}" y="${size / 2 + innerSize * 0.08}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${innerSize * 0.25}" font-weight="bold">TC</text>
  <rect x="${size / 2 - innerSize * 0.25}" y="${padding + innerSize * 0.66}" width="${innerSize * 0.5}" height="${innerSize * 0.015}" fill="white" rx="${innerSize * 0.0075}"/>
</svg>`;
}

// Создаем maskable иконки
[192, 512].forEach(size => {
    const svg = createMaskableSVG(size);
    const filename = `public/icon-${size}x${size}-maskable.svg`;
    
    try {
        fs.writeFileSync(filename, svg);
        console.log(`✅ Создан Maskable SVG: icon-${size}x${size}-maskable.svg`);
    } catch (error) {
        console.log(`❌ Ошибка создания ${filename}:`, error.message);
    }
});

console.log('🚀 SVG иконки созданы! Теперь нужно конвертировать их в PNG.');
console.log('💡 Откройте create-png-icons.html в браузере и скачайте PNG файлы.');