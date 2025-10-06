import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// Temporarily disable lovable-tagger to fix ESM import issue
// import { componentTagger } from "lovable-tagger";

// Плагин для замены __BASE_PATH__ в manifest.json
function replaceManifestBasePath(basePath: string) {
  return {
    name: 'replace-manifest-base-path',
    enforce: 'post' as const,
    apply: 'build' as const,
    async closeBundle() {
      const fs = await import('fs/promises');
      const manifestPath = 'dist/manifest.json';
      try {
        let content = await fs.readFile(manifestPath, 'utf-8');
        content = content.replace(/__BASE_PATH__/g, basePath);
        await fs.writeFile(manifestPath, content, 'utf-8');
        console.log(`✅ Manifest.json: replaced __BASE_PATH__ with "${basePath}"`);
      } catch (error) {
        console.warn('⚠️  Could not process manifest.json:', error);
      }
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const basePath = mode === 'production' ? '/tradeframe-builder/' : '/';

  return {
    base: basePath,
    server: {
      host: "127.0.0.1",
      port: 3000,
      allowedHosts: ["prod.dataworker.ru"],
    },
    plugins: [
      react(),
      replaceManifestBasePath(basePath),
      // Temporarily disabled: mode === 'development' && componentTagger(),
    ].filter(Boolean),
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // ТОЛЬКО критичные external библиотеки, ВСЕ остальное в main bundle

            // Large external libraries that are worth splitting
            if (id.includes('react') && id.includes('node_modules')) {
              return 'react-vendor';
            }

            if (id.includes('chart.js') && id.includes('node_modules')) {
              return 'charts-vendor';
            }

            // Large utility libraries
            if (id.includes('date-fns') && id.includes('node_modules')) {
              return 'date-vendor';
            }

            if (id.includes('xlsx') && id.includes('node_modules')) {
              return 'xlsx-vendor';
            }

            // Всё остальное (включая наш код) остаётся в main bundle
            // Это исключает все проблемы с React contexts и forwardRef
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "pdfmake/build/pdfmake": "pdfmake/build/pdfmake.js",
        "pdfmake/build/vfs_fonts": "pdfmake/build/vfs_fonts.js",
      },
    },
  };
});
