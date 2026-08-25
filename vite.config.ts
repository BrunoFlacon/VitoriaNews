import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      host: true,
      port: 8081,
      strictPort: true,
      hmr: {
        overlay: false,
      },
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless',
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/supabase': {
          target: env.VITE_SUPABASE_URL || 'https://ghtkdkauseesambzqfrd.supabase.co',
          changeOrigin: true,
          secure: false,
          ws: true,
          timeout: 180000,
          proxyTimeout: 180000,
          rewrite: (path) => path.replace(/^\/supabase/, '').replace(/\/storage\/v1\//, '/storage/'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              proxyReq.setHeader('origin', env.VITE_SUPABASE_URL || 'https://ghtkdkauseesambzqfrd.supabase.co');
              proxyReq.removeHeader('referer');
            });
          },
        },
      },
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "lucide-react",
        // ALL @radix-ui packages — prevents late discovery re-optimization
        // which invalidates every dep mid-session (504 Outdated Optimize Dep)
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
        "react-avatar-editor",
        "framer-motion",
        "clsx",
        "tailwind-merge",
        "class-variance-authority",
        "date-fns",
        "date-fns/locale",
        "cmdk",
        "embla-carousel-react",
        "input-otp",
        "next-themes",
        "sonner",
        "vaul",
        "zustand",
      ],
      exclude: [
        // @imgly/background-removal uses onnxruntime-web/webgpu which Vite can't resolve
        // during pre-bundling. Dynamic import + CSP blob: allows it to work at runtime.
        "@imgly/background-removal",
      ],
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
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
      chunkSizeWarningLimit: 600,
      cssCodeSplit: true,
      sourcemap: false,
    },
  };
});
