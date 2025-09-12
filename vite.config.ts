import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// Temporarily disable lovable-tagger to fix ESM import issue
// import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: process.env.GITHUB_PAGES ? '/tradeframe-builder/' : '/',
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: [".e2b.dev"],
  },
  plugins: [
    react(),
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
    },
  },
}));
