import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { manifestPlugin } from "./vite-plugin-manifest";
import { VitePWA } from 'vite-plugin-pwa';
// Temporarily disable lovable-tagger to fix ESM import issue
// import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // ============================================================================
  // ТРЕХУРОВНЕВАЯ СИСТЕМА ОКРУЖЕНИЙ
  // ============================================================================
  // 1. DEVELOPMENT (localhost:3000)
  //    - Service Worker: ОТКЛЮЧЕН (devOptions.enabled: false)
  //    - HMR: Активен для быстрой разработки
  //    - Backend: localhost:3001
  //    - Base path: /
  //
  // 2. TEST (electro-interfaces.github.io/tradeframe-builder)
  //    - Service Worker: ВКЛЮЧЕН
  //    - PWA: Полностью работает
  //    - Build mode: github-pages
  //    - Base path: /tradeframe-builder/
  //    - Git remote: test
  //    - Деплой: git push test main
  //
  // 3. PRODUCTION (prod.dataworker.ru)
  //    - Service Worker: ВКЛЮЧЕН
  //    - PWA: Полностью работает
  //    - Build mode: production
  //    - Base path: /
  //    - Git remote: prod
  //    - Деплой: git push prod main
  //
  // Подробнее: DEPLOYMENT_STRATEGY.md
  // ============================================================================

  const base = mode === 'github-pages' ? '/tradeframe-builder/' : '/';

  return {
  base,
  // Явное определение переменных окружения
  define: {
    'import.meta.env.VITE_STS_API_URL': JSON.stringify(process.env.VITE_STS_API_URL),
    'import.meta.env.VITE_STS_API_USERNAME': JSON.stringify(process.env.VITE_STS_API_USERNAME),
    'import.meta.env.VITE_STS_API_PASSWORD': JSON.stringify(process.env.VITE_STS_API_PASSWORD),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
    'import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY': JSON.stringify(process.env.VITE_SUPABASE_SERVICE_ROLE_KEY),
  },
  server: {
    host: "127.0.0.1",
    port: 3000,
    allowedHosts: ["prod.dataworker.ru"],
    proxy: {
      // Прокси для всех API запросов - перенаправляем на локальный backend proxy
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('🔄 [Vite Proxy] Forwarding to backend:', req.url);
          });

          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('✅ [Vite Proxy] Backend response:', req.url, '→', proxyRes.statusCode);
          });

          proxy.on('error', (err, req) => {
            console.error('❌ [Vite Proxy] Error:', req.url, err.message);
          });
        },
      },
    },
  },
  plugins: [
    react(),
    manifestPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'TradeFrame Builder',
        short_name: 'TradeFrame',
        description: 'Платформа управления торговыми сетями АЗС',
        theme_color: '#1e293b',
        background_color: '#0f172a',
        display: 'standalone',
        // ⚠️ ВАЖНО: scope и start_url используют динамический base
        // TEST: /tradeframe-builder/
        // PRODUCTION: /
        scope: base,
        start_url: base,
        orientation: 'portrait-primary',
        icons: [
          {
            src: `${base}pwa-192x192.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: `${base}pwa-512x512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: `${base}pwa-512x512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 часа
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 год
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        // ⚠️ КРИТИЧНО: Service Worker ДОЛЖЕН быть отключен в development!
        // Причина: конфликт с Vite HMR вызывает циклические перезагрузки
        // Service Worker работает ТОЛЬКО в TEST и PRODUCTION окружениях
        enabled: false,
        type: 'module'
      }
    }),
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
