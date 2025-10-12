import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { manifestPlugin } from "./vite-plugin-manifest";
// Temporarily disable lovable-tagger to fix ESM import issue
// import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // GitHub Pages всегда использует /tradeframe-builder/ как base
  base: process.env.GITHUB_ACTIONS ? '/tradeframe-builder/' : '/',
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
  },
  plugins: [
    react(),
    manifestPlugin(),
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
}));
