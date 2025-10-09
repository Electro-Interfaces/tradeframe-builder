import { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

/**
 * Vite plugin для динамической генерации manifest.json в зависимости от режима сборки
 */
export function manifestPlugin(): Plugin {
  let viteBase = '/';

  return {
    name: 'vite-plugin-manifest',
    apply: 'build', // Применяется только при сборке
    configResolved(config) {
      // Получаем base из конфига Vite
      viteBase = config.base || '/';
    },
    closeBundle() {
      const basePath = viteBase;

      const manifestPath = path.resolve(__dirname, 'dist/manifest.json');

      if (!fs.existsSync(manifestPath)) {
        return;
      }

      let manifest = fs.readFileSync(manifestPath, 'utf-8');
      const manifestObj = JSON.parse(manifest);

      // Нормализуем basePath (убираем слэш в конце для проверок)
      const normalizedBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
      const baseWithSlash = basePath.endsWith('/') ? basePath : basePath + '/';

      // Обновляем scope, start_url и id
      manifestObj.scope = baseWithSlash;
      manifestObj.start_url = `${baseWithSlash}?utm_source=pwa&utm_medium=app`;
      manifestObj.id = baseWithSlash;

      // Обновляем пути к иконкам (делаем относительными)
      manifestObj.icons = manifestObj.icons.map((icon: any) => ({
        ...icon,
        src: icon.src.startsWith('/') ? `.${icon.src}` : icon.src
      }));

      // Обновляем shortcuts
      if (manifestObj.shortcuts) {
        manifestObj.shortcuts = manifestObj.shortcuts.map((shortcut: any) => ({
          ...shortcut,
          url: shortcut.url.startsWith('/') ? `${normalizedBase}${shortcut.url}` : shortcut.url,
          icons: shortcut.icons?.map((icon: any) => ({
            ...icon,
            src: icon.src.startsWith('/') ? `.${icon.src}` : icon.src
          }))
        }));
      }

      fs.writeFileSync(manifestPath, JSON.stringify(manifestObj, null, 2));
      console.log(`✅ Manifest generated with base path: ${basePath}`);
    }
  };
}
