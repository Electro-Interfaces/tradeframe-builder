/**
 * Генерация Apple splash screen изображений для PWA
 * Запуск: node scripts/generateSplashScreens.mjs
 */
import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const outputDir = join(rootDir, 'public', 'splash');

// Apple splash screen sizes (portrait only — landscape auto-rotated)
const splashSizes = [
  // iPhone
  { w: 1290, h: 2796, name: 'iPhone_15_Pro_Max__iPhone_15_Plus__iPhone_14_Pro_Max' },
  { w: 1179, h: 2556, name: 'iPhone_15_Pro__iPhone_15__iPhone_14_Pro' },
  { w: 1170, h: 2532, name: 'iPhone_14__iPhone_13_Pro__iPhone_13__iPhone_12_Pro__iPhone_12' },
  { w: 1125, h: 2436, name: 'iPhone_X__iPhone_XS__iPhone_11_Pro' },
  { w: 1242, h: 2688, name: 'iPhone_XS_Max__iPhone_11_Pro_Max' },
  { w: 828, h: 1792, name: 'iPhone_XR__iPhone_11' },
  { w: 750, h: 1334, name: 'iPhone_8__iPhone_7__iPhone_6s__iPhone_6' },
  { w: 1242, h: 2208, name: 'iPhone_8_Plus__iPhone_7_Plus__iPhone_6s_Plus__iPhone_6_Plus' },
  { w: 640, h: 1136, name: 'iPhone_SE' },
  // iPad
  { w: 2048, h: 2732, name: 'iPad_Pro_12.9' },
  { w: 1668, h: 2388, name: 'iPad_Pro_11' },
  { w: 1640, h: 2360, name: 'iPad_Air_10.9' },
  { w: 1620, h: 2160, name: 'iPad_10.2' },
  { w: 1536, h: 2048, name: 'iPad_Mini__iPad_Air_9.7' },
];

// Цвета (совпадают с --background в темной теме)
const BG_COLOR = '#0f172a'; // slate-900
const LOGO_BG = '#3b82f6';  // blue-500
const LOGO_RADIUS = 40;
const ICON_SIZE = 160;

async function generateSplash(size) {
  const { w, h, name } = size;
  const iconOffset = Math.round(h * 0.38); // Иконка чуть выше центра

  // Создаём SVG с логотипом TC
  const svgIcon = `
    <svg width="${ICON_SIZE}" height="${ICON_SIZE}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${ICON_SIZE}" height="${ICON_SIZE}" rx="${LOGO_RADIUS}" fill="${LOGO_BG}" />
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
            font-family="-apple-system, BlinkMacSystemFont, sans-serif"
            font-size="64" font-weight="700" fill="white">TC</text>
    </svg>
  `;

  const iconBuffer = await sharp(Buffer.from(svgIcon))
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: BG_COLOR,
    },
  })
    .composite([
      {
        input: iconBuffer,
        left: Math.round((w - ICON_SIZE) / 2),
        top: iconOffset,
      },
    ])
    .png({ quality: 80, compressionLevel: 9 })
    .toFile(join(outputDir, `splash-${name}.png`));

  console.log(`  ${name} (${w}x${h})`);
}

async function main() {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Генерация ${splashSizes.length} splash screens...`);

  for (const size of splashSizes) {
    await generateSplash(size);
  }

  console.log('\nГотово! Файлы в public/splash/');
  console.log('\nДобавьте в index.html:');
  for (const { w, h, name } of splashSizes) {
    const ratio = w > 1000 ? 3 : w > 800 ? 2 : 1;
    const dw = Math.round(w / ratio);
    const dh = Math.round(h / ratio);
    console.log(`<link rel="apple-touch-startup-image" href="/splash/splash-${name}.png" media="(device-width: ${dw}px) and (device-height: ${dh}px) and (-webkit-device-pixel-ratio: ${ratio})" />`);
  }
}

main().catch(console.error);
