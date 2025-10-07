import { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

/**
 * Vite plugin для динамической генерации manifest.json в зависимости от режима сборки
 */
export function manifestPlugin(): Plugin {
  return {
    name: 'vite-plugin-manifest',
    apply: 'build', // Применяется только при сборке
    closeBundle() {
      const mode = process.env.NODE_ENV || 'production';
      const basePath = mode === 'production' ? '/tradeframe-builder/' : '/';

      const manifestPath = path.resolve(__dirname, 'dist/manifest.json');

      if (!fs.existsSync(manifestPath)) {
        return;
      }

      let manifest = fs.readFileSync(manifestPath, 'utf-8');
      const manifestObj = JSON.parse(manifest);

      // Обновляем пути в зависимости от режима
      if (mode === 'production') {
        manifestObj.scope = '/tradeframe-builder/';
        manifestObj.start_url = '/tradeframe-builder/?utm_source=pwa&utm_medium=app';
        manifestObj.id = '/tradeframe-builder/';

        // Обновляем пути к иконкам
        manifestObj.icons = manifestObj.icons.map((icon: any) => ({
          ...icon,
          src: icon.src.startsWith('/') && !icon.src.startsWith('/tradeframe-builder/')
            ? `/tradeframe-builder${icon.src}`
            : icon.src
        }));

        // Обновляем shortcuts
        if (manifestObj.shortcuts) {
          manifestObj.shortcuts = manifestObj.shortcuts.map((shortcut: any) => ({
            ...shortcut,
            url: shortcut.url.startsWith('/') && !shortcut.url.startsWith('/tradeframe-builder/')
              ? `/tradeframe-builder${shortcut.url}`
              : shortcut.url,
            icons: shortcut.icons?.map((icon: any) => ({
              ...icon,
              src: icon.src.startsWith('/') && !icon.src.startsWith('/tradeframe-builder/')
                ? `/tradeframe-builder${icon.src}`
                : icon.src
            }))
          }));
        }
      }

      fs.writeFileSync(manifestPath, JSON.stringify(manifestObj, null, 2));
      console.log(`✅ Manifest generated for ${mode} mode with base path: ${basePath}`);
    }
  };
}
