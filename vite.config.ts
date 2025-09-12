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
          // Core React libraries
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
            return 'react-core';
          }
          
          // UI component libraries
          if (id.includes('@radix-ui')) {
            return 'radix-ui';
          }
          
          // Data fetching and state management
          if (id.includes('@tanstack/react-query')) {
            return 'react-query';
          }
          
          // Chart libraries - don't split to avoid initialization issues
          // if (id.includes('recharts')) {
          //   return 'recharts';
          // }
          if (id.includes('chart.js') || id.includes('chartjs-adapter-date-fns')) {
            return 'chartjs';
          }
          
          // Export utilities (loaded on demand)
          if (id.includes('html2canvas') || id.includes('jspdf')) {
            return 'export-utils';
          }
          
          // Form handling
          if (id.includes('react-hook-form') || id.includes('@hookform/resolvers') || id.includes('zod')) {
            return 'forms';
          }
          
          // Date utilities
          if (id.includes('date-fns')) {
            return 'date-utils';
          }
          
          // File handling
          if (id.includes('xlsx')) {
            return 'file-utils';
          }
          
          // DnD functionality
          if (id.includes('@dnd-kit')) {
            return 'dnd';
          }
          
          // Database clients - don't split to avoid initialization issues
          // if (id.includes('@supabase/supabase-js') || id.includes('pg')) {
          //   return 'database';
          // }
          
          // API utilities
          if (id.includes('cors') || id.includes('express') || id.includes('helmet') || 
              id.includes('jsonwebtoken') || id.includes('bcryptjs')) {
            return 'api-utils';
          }
          
          // Admin pages chunk
          if (id.includes('/pages/admin/') || id.includes('/pages/Admin')) {
            return 'pages-admin';
          }
          
          // Network pages chunk
          if (id.includes('/pages/Network')) {
            return 'pages-network';
          }
          
          // Settings pages chunk
          if (id.includes('Settings') || id.includes('Database')) {
            return 'pages-settings';
          }
          
          // Critical pages - no splitting for Prices to avoid chart issues
          if (id.includes('/pages/Prices')) {
            return undefined; // Don't split Prices page
          }
          
          // Heavy pages chunk (other critical pages)
          if (id.includes('/pages/STSApiSettings') || 
              id.includes('/pages/Tanks') || id.includes('/pages/OperationsTransactionsPageSimple')) {
            return 'pages-heavy';
          }
          
          // Services chunk
          if (id.includes('/services/')) {
            return 'services';
          }
          
          // Components chunk
          if (id.includes('/components/') && !id.includes('/components/ui/')) {
            return 'components';
          }
          
          // UI components (shadcn)
          if (id.includes('/components/ui/')) {
            return 'ui-components';
          }
          
          // Utils and hooks
          if (id.includes('/utils/') || id.includes('/hooks/') || id.includes('/lib/')) {
            return 'utils';
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
}));
