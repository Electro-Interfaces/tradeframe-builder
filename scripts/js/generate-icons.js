// Генератор иконок для PWA
const fs = require('fs');
const { createCanvas } = require('canvas');

function createIcon(size, type = 'regular') {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Настройки дизайна TradeControl
    const colors = {
        background: '#1e293b',
        primary: '#3b82f6', 
        accent: '#ffffff'
    };

    // Очистка и фон
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, size, size);

    // Скругленные углы для фона
    const cornerRadius = size * 0.125;
    
    // Основной прямоугольник
    const padding = size * 0.125;
    const innerSize = size - (padding * 2);
    const innerCorner = innerSize * 0.083;
    
    ctx.fillStyle = colors.primary;
    ctx.fillRect(padding, padding, innerSize, innerSize);

    // Текст "TC"
    const fontSize = size * 0.25;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = colors.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TC', size / 2, size / 2 - fontSize * 0.05);

    // Подчеркивание
    const lineWidth = size * 0.5;
    const lineHeight = size * 0.008;
    const lineY = size / 2 + fontSize * 0.4;
    
    ctx.fillStyle = colors.accent;
    ctx.fillRect((size - lineWidth) / 2, lineY, lineWidth, lineHeight);

    return canvas;
}

// Создаем иконки разных размеров
const iconSizes = [
    { size: 72, name: 'icon-72x72.png' },
    { size: 96, name: 'icon-96x96.png' },
    { size: 128, name: 'icon-128x128.png' },
    { size: 144, name: 'icon-144x144.png' },
    { size: 152, name: 'icon-152x152.png' },
    { size: 192, name: 'icon-192x192.png' },
    { size: 384, name: 'icon-384x384.png' },
    { size: 512, name: 'icon-512x512.png' }
];

console.log('🎨 Создание PWA иконок для TradeControl...');

iconSizes.forEach(icon => {
    try {
        const canvas = createIcon(icon.size);
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(`public/${icon.name}`, buffer);
        console.log(`✅ Создана иконка: ${icon.name} (${icon.size}x${icon.size})`);
    } catch (error) {
        console.log(`❌ Ошибка создания ${icon.name}:`, error.message);
    }
});

console.log('🚀 Все иконки созданы!');