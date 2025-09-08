import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// Temporarily disable lovable-tagger to fix ESM import issue
// import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: [".e2b.dev"],
    proxy: {
      '/api/trading-network': {
        target: 'https://pos.autooplata.ru/tms',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/trading-network/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('🌐 Proxying request:', req.method, req.url);
          });
        }
      },
      '/supabase-proxy': {
        target: 'https://tohtryzyffcebtyvkxwh.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/supabase-proxy/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('🔗 Proxying Supabase request:', req.method, req.url);
          });
        }
      }
    }
  },
  plugins: [
    react(),
    // Temporarily disabled: mode === 'development' && componentTagger(),
  ].filter(Boolean),
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core и router
          react: ["react", "react-dom", "react-router-dom"],
          
          // UI библиотеки - разделение на группы
          radix: [
            "@radix-ui/react-accordion",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-aspect-ratio",
            "@radix-ui/react-avatar",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-collapsible",
            "@radix-ui/react-context-menu",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-hover-card",
            "@radix-ui/react-label",
            "@radix-ui/react-menubar",
            "@radix-ui/react-navigation-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-progress",
            "@radix-ui/react-radio-group",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-select",
            "@radix-ui/react-separator",
            "@radix-ui/react-slider",
            "@radix-ui/react-slot",
            "@radix-ui/react-switch",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
            "@radix-ui/react-toggle",
            "@radix-ui/react-toggle-group",
            "@radix-ui/react-tooltip",
          ],
          
          // Формы и валидация
          forms: ["react-hook-form", "@hookform/resolvers", "zod"],
          
          // Data fetching
          query: ["@tanstack/react-query"],
          supabase: ["@supabase/supabase-js"],
          
          // Графики и визуализация
          charts: ["recharts"],
          
          // Иконки и утилиты
          icons: ["lucide-react"],
          utils: ["clsx", "tailwind-merge", "class-variance-authority", "date-fns"],
          
          // Drag and drop
          dnd: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
          
          // Таблицы и офисные файлы
          office: ["xlsx"],
          
          // Node.js модули (если используются в клиенте)
          node: ["node-fetch"],
        },
        // Оптимизация именования чанков
        chunkFileNames: (chunkInfo) => {
          if (chunkInfo.name) {
            return `[name]-[hash].js`;
          }
          return '[name]-[hash].js';
        },
        // Оптимизация entry chunks
        entryFileNames: 'index-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          let extType = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            extType = 'img';
          } else if (/woff|woff2/.test(extType)) {
            extType = 'fonts';
          }
          return `${extType}/[name]-[hash][extname]`;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
