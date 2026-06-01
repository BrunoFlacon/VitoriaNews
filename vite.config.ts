import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import basicSsl from "@vitejs/plugin-basic-ssl";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 8081,
    strictPort: true,
    hmr: {
      overlay: false,
    }
  },
  plugins: [
    mode === "development" ? basicSsl() : null,
    react(),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 500,
    sourcemap: false, // Hide original source code
    rollupOptions: {
      output: {
        // Use non-descriptive names for build files
        entryFileNames: `assets/v-[hash].js`,
        chunkFileNames: `assets/c-[hash].js`,
        assetFileNames: `assets/a-[hash].[ext]`,
        manualChunks: {
          "react-core": ["react", "react-dom", "react-router-dom"],
          "vendor-libs": ["framer-motion", "lucide-react", "@tanstack/react-query", "@supabase/supabase-js", "zustand"]
        }
      }
    }
  }
}));
