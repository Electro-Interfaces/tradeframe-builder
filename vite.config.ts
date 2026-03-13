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
  // Все VITE_* переменные подхватываются из .env автоматически Vite — define не нужен
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
        name: 'TradeControl Builder',
        short_name: 'TradeControl',
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
        // Исключаем тяжёлые vendor-чанки из precache (грузятся по требованию)
        globIgnores: ['**/node_modules/**/*', 'sw.js', 'workbox-*.js',
          '**/pdf-vendor-*.js', '**/jspdf-vendor-*.js', '**/pdfmake/*.js',
          '**/xlsx-vendor-*.js', '**/exceljs*'],
        // Критично для SPA: fallback на index.html при навигации
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [/^\/api\//, /\.[^/?]+$/],
        // Очищаем устаревшие кэши при обновлении
        cleanupOutdatedCaches: true,
        // Не ждём закрытия вкладок - активируем сразу
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // API запросы - сначала сеть, потом кэш (с таймаутом)
            urlPattern: /^https?:\/\/.*\/api\//i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5, // Быстрый fallback на кэш
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 // 1 час — динамические данные (цены, уровни, смены)
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Статические ресурсы - сначала кэш
            urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|svg|gif|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 дней
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Google Fonts
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
          },
          {
            // Google Fonts файлы шрифтов
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
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
          if (!id.includes('node_modules')) return;

          // React core
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
            return 'react-vendor';
          }

          // Recharts — самая тяжёлая библиотека графиков (~400KB)
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'recharts-vendor';
          }

          // Chart.js (если используется)
          if (id.includes('chart.js')) {
            return 'chartjs-vendor';
          }

          // PDF/Excel экспорт
          if (id.includes('jspdf')) {
            return 'pdf-vendor';
          }
          if (id.includes('xlsx')) {
            return 'xlsx-vendor';
          }

          // date-fns
          if (id.includes('date-fns')) {
            return 'date-vendor';
          }

          // Tanstack (react-query, react-table)
          if (id.includes('@tanstack')) {
            return 'tanstack-vendor';
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  };
});
