import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 8081,
    strictPort: true,
    hmr: {
      overlay: false,
    },
    proxy: {
      '/supabase': {
        target: 'https://ghtkdkauseesambzqfrd.supabase.co',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/supabase/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            proxyReq.setHeader('origin', 'https://ghtkdkauseesambzqfrd.supabase.co');
          });
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      "lucide-react",
      "@radix-ui/react-progress",
      "@radix-ui/react-dialog",
      "@radix-ui/react-popover",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-separator",
      "@radix-ui/react-label",
      "@radix-ui/react-select",
      "@radix-ui/react-slider",
      "@radix-ui/react-switch",
      "@radix-ui/react-toast",
      "@radix-ui/react-tabs",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "framer-motion",
      "clsx",
      "tailwind-merge"
    ],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Improve chunk splitting for faster loads
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router')) return 'vendor-react';
          if (id.includes('node_modules/@radix-ui/')) return 'vendor-ui';
          if (id.includes('node_modules/framer-motion')) return 'vendor-motion';
          if (id.includes('node_modules/@supabase/')) return 'vendor-supabase';
          if (id.includes('node_modules/recharts')) return 'vendor-charts';
        },
      },
    },
    // Reduce bundle sizes
    chunkSizeWarningLimit: 600,
    cssCodeSplit: true,
    sourcemap: false,
  },
}));

